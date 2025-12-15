// Shared session store for live Telegram messages
export interface SessionData {
    messageId: number;
    data: Record<string, string>;
}

// Store message IDs for each user session (per chat)
// Key: `${userId}_${chatId}`, Value: { messageId, data }
export const liveMessages = new Map<string, SessionData>();

// Clear session for a specific user across all chats
export function clearUserSession(userId: string) {
    const keysToDelete: string[] = [];
    
    liveMessages.forEach((_, key) => {
        if (key.startsWith(`${userId}_`)) {
            keysToDelete.push(key);
        }
    });
    
    keysToDelete.forEach(key => liveMessages.delete(key));
    
    return keysToDelete.length;
}

// Get all active sessions (for debugging)
export function getActiveSessions() {
    return Array.from(liveMessages.keys());
}

