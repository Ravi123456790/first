import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const TEMP_DIR = os.tmpdir();
const CLICK_FILE = path.join(TEMP_DIR, 'captcha-click.json');

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { x, y, type = 'click' } = body;

        if (typeof x !== 'number' || typeof y !== 'number') {
            return NextResponse.json({
                success: false,
                error: 'Invalid coordinates'
            }, { status: 400 });
        }

        // Queue the click action
        const clickData = {
            x,
            y,
            type, // 'click', 'move', 'drag'
            timestamp: Date.now(),
            processed: false
        };

        fs.writeFileSync(CLICK_FILE, JSON.stringify(clickData, null, 2));
        console.log(`📍 Click queued: (${x}, ${y})`);

        return NextResponse.json({
            success: true,
            message: 'Click queued'
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: 'Failed to queue click'
        }, { status: 500 });
    }
}

export async function GET() {
    try {
        if (fs.existsSync(CLICK_FILE)) {
            const data = JSON.parse(fs.readFileSync(CLICK_FILE, 'utf-8'));
            return NextResponse.json({ success: true, ...data });
        }
        return NextResponse.json({ success: false, error: 'No click data' });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to read click' });
    }
}

export async function DELETE() {
    try {
        if (fs.existsSync(CLICK_FILE)) {
            fs.unlinkSync(CLICK_FILE);
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false });
    }
}
