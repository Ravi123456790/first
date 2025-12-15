import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TAB_FILE = '/tmp/automation-tab.json';

// POST: Notify automation to switch tabs
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { tab } = body; // 'password' | 'otp'

        if (!tab) {
            return NextResponse.json({ error: 'Tab required' }, { status: 400 });
        }

        const tabData = {
            tab,
            timestamp: Date.now()
        };

        fs.writeFileSync(TAB_FILE, JSON.stringify(tabData, null, 2));
        console.log(`🔄 Tab switch requested: ${tab}`);

        return NextResponse.json({ success: true, message: `Switched to ${tab} tab` });
    } catch (error) {
        console.error('Error saving tab switch:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// GET: Check current tab (for automation to poll)
export async function GET() {
    try {
        if (!fs.existsSync(TAB_FILE)) {
            return NextResponse.json({ tab: 'password' });
        }

        const data = fs.readFileSync(TAB_FILE, 'utf-8');
        return NextResponse.json(JSON.parse(data));
    } catch (error) {
        return NextResponse.json({ tab: 'password' });
    }
}
