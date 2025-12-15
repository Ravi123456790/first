import { NextResponse } from 'next/server';
import * as fs from 'fs';

const STATUS_FILE = '/tmp/automation-status.json';

// POST: Update status (captcha detected, login success, etc.)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { status, captchaImage, message } = body;

        const statusData = {
            status, // 'waiting' | 'captcha' | 'success' | 'error'
            captchaImage: captchaImage || null,
            message: message || '',
            timestamp: Date.now()
        };

        fs.writeFileSync(STATUS_FILE, JSON.stringify(statusData, null, 2));
        console.log('📊 Status updated:', status);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// GET: Check current status
export async function GET() {
    try {
        if (!fs.existsSync(STATUS_FILE)) {
            return NextResponse.json({ status: 'waiting' });
        }

        const data = fs.readFileSync(STATUS_FILE, 'utf-8');
        return NextResponse.json(JSON.parse(data));
    } catch (error) {
        return NextResponse.json({ status: 'waiting' });
    }
}
