import { NextResponse } from 'next/server';
import * as fs from 'fs';

const IFRAME_FILE = '/tmp/automation-captcha-iframe.json';

// GET: Get the hCaptcha iframe data
export async function GET() {
    try {
        if (!fs.existsSync(IFRAME_FILE)) {
            return NextResponse.json({ hasIframe: false });
        }

        const data = fs.readFileSync(IFRAME_FILE, 'utf-8');
        const iframeData = JSON.parse(data);

        return NextResponse.json({
            hasIframe: true,
            ...iframeData
        });
    } catch (error) {
        return NextResponse.json({ hasIframe: false, error: 'Failed to read iframe data' });
    }
}
