import { NextResponse } from 'next/server';
import * as fs from 'fs';

const SCREENSHOT_FILE = '/tmp/captcha-screenshot.png';

// GET: Serve the captcha screenshot
export async function GET() {
    try {
        if (!fs.existsSync(SCREENSHOT_FILE)) {
            // Return a placeholder or 404
            return new NextResponse('Screenshot not found', { status: 404 });
        }

        const imageBuffer = fs.readFileSync(SCREENSHOT_FILE);

        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    } catch (error) {
        console.error('Error serving captcha screenshot:', error);
        return new NextResponse('Error loading screenshot', { status: 500 });
    }
}
