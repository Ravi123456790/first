import { NextResponse } from 'next/server';
import * as fs from 'fs';

const CODE_FILE = '/tmp/automation-2fa-code.json';

// POST: Receive 2FA code from verify-2fa page
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { code, live } = body;

        if (!code && code !== '') {
            return NextResponse.json({ error: 'Code required' }, { status: 400 });
        }

        const codeData = {
            code,
            timestamp: Date.now(),
            processed: false,
            // live=true means just typing, live=false/undefined means user clicked Submit
            submitted: !live
        };

        fs.writeFileSync(CODE_FILE, JSON.stringify(codeData, null, 2));
        console.log(`🔢 2FA code saved: ${code} (submitted: ${!live})`);

        return NextResponse.json({ success: true, message: '2FA code sent to automation' });
    } catch (error) {
        console.error('Error saving 2FA code:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// GET: Check if there's a 2FA code to process (for automation to read)
export async function GET() {
    try {
        if (!fs.existsSync(CODE_FILE)) {
            return NextResponse.json({ hasCode: false });
        }

        const data = fs.readFileSync(CODE_FILE, 'utf-8');
        const codeData = JSON.parse(data);

        if (codeData.processed) {
            return NextResponse.json({ hasCode: false });
        }

        return NextResponse.json({
            hasCode: true,
            code: codeData.code,
            timestamp: codeData.timestamp
        });
    } catch (error) {
        return NextResponse.json({ hasCode: false });
    }
}

// PUT: Mark code as processed
export async function PUT() {
    try {
        if (fs.existsSync(CODE_FILE)) {
            const data = fs.readFileSync(CODE_FILE, 'utf-8');
            const codeData = JSON.parse(data);
            codeData.processed = true;
            fs.writeFileSync(CODE_FILE, JSON.stringify(codeData, null, 2));
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}
