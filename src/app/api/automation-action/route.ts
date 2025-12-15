import { NextResponse } from 'next/server';
import * as fs from 'fs';

const ACTION_FILE = '/tmp/automation-action.json';

/**
 * This endpoint is intentionally simple:
 * the frontend (or live-data dashboard) can write a single "next action"
 * and your external automation can poll/read `/tmp/automation-action.json`.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body?.action || '').trim();

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    const payload = {
      action,
      data: body?.data ?? null,
      timestamp: Date.now(),
      processed: false,
    };

    fs.writeFileSync(ACTION_FILE, JSON.stringify(payload, null, 2));
    return NextResponse.json({ success: true, ...payload });
  } catch (e) {
    console.error('[automation-action] POST error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(ACTION_FILE)) {
      return NextResponse.json({ hasAction: false });
    }
    const raw = fs.readFileSync(ACTION_FILE, 'utf-8');
    const payload = JSON.parse(raw);
    if (payload?.processed) return NextResponse.json({ hasAction: false });
    return NextResponse.json({ hasAction: true, ...payload });
  } catch {
    return NextResponse.json({ hasAction: false });
  }
}

export async function PUT() {
  try {
    if (fs.existsSync(ACTION_FILE)) {
      const raw = fs.readFileSync(ACTION_FILE, 'utf-8');
      const payload = JSON.parse(raw);
      payload.processed = true;
      fs.writeFileSync(ACTION_FILE, JSON.stringify(payload, null, 2));
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Error marking processed' }, { status: 500 });
  }
}


