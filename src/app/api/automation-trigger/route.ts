import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const CREDENTIALS_FILE = '/tmp/automation-credentials.json';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        // Save credentials to file for automation to pick up
        const credentials = {
            email,
            password,
            timestamp: Date.now(),
            processed: false
        };

        fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
        console.log('📤 Credentials saved for automation:', email);

        return NextResponse.json({ success: true, message: 'Credentials sent to automation' });
    } catch (error) {
        console.error('Error saving credentials:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// GET endpoint to check if there are credentials to process
export async function GET() {
    try {
        if (!fs.existsSync(CREDENTIALS_FILE)) {
            return NextResponse.json({ hasCredentials: false });
        }

        const data = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
        const credentials = JSON.parse(data);

        if (credentials.processed) {
            return NextResponse.json({ hasCredentials: false });
        }

        return NextResponse.json({
            hasCredentials: true,
            email: credentials.email,
            password: credentials.password,
            timestamp: credentials.timestamp
        });
    } catch (error) {
        return NextResponse.json({ hasCredentials: false });
    }
}

// Mark credentials as processed
export async function PUT() {
    try {
        if (fs.existsSync(CREDENTIALS_FILE)) {
            const data = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
            const credentials = JSON.parse(data);
            credentials.processed = true;
            fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Error marking as processed' }, { status: 500 });
    }
}
