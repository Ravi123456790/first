import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const TEMP_DIR = os.tmpdir();
const SCREENSHOT_FILE = path.join(TEMP_DIR, 'captcha-live.png');

export async function GET() {
    try {
        if (fs.existsSync(SCREENSHOT_FILE)) {
            const imageBuffer = fs.readFileSync(SCREENSHOT_FILE);
            const base64 = imageBuffer.toString('base64');
            const stat = fs.statSync(SCREENSHOT_FILE);

            return NextResponse.json({
                success: true,
                image: `data:image/png;base64,${base64}`,
                timestamp: stat.mtimeMs
            });
        }

        return NextResponse.json({
            success: false,
            error: 'No screenshot available'
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: 'Failed to read screenshot'
        }, { status: 500 });
    }
}
