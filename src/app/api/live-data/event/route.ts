import { NextResponse } from 'next/server';
import { appendEvent, getSnapshot } from '../store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const type = String(body?.type || '').trim();
    const data = body?.data;

    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }

    appendEvent(type, data);
    return NextResponse.json({ success: true, ...getSnapshot() });
  } catch (e) {
    console.error('[LiveData event] POST error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


