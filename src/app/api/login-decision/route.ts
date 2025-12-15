import { NextResponse } from 'next/server';

type LoginTarget = 'password' | 'otp';
type DecisionStatus = 'idle' | 'pending' | 'approved' | 'rejected';

type DecisionState = {
  status: DecisionStatus;
  target?: LoginTarget;
  message?: string;
  targetPage?: string;
  updatedAt: number;
};

let decisionState: DecisionState = {
  status: 'idle',
  updatedAt: Date.now(),
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, target, message, targetPage } = body as {
      action: 'start' | 'approve' | 'reject';
      target?: LoginTarget;
      message?: string;
      targetPage?: string;
    };

    const now = Date.now();

    if (action === 'start') {
      if (!target) {
        return NextResponse.json({ error: 'target is required for start' }, { status: 400 });
      }
      decisionState = {
        status: 'pending',
        target,
        message: undefined,
        targetPage: undefined,
        updatedAt: now,
      };
    } else if (action === 'approve') {
      // Allow admin override at any time (not just pending)
      decisionState = {
        ...decisionState,
        status: 'approved',
        targetPage: targetPage || decisionState.targetPage || '/verify-2fa', // default page
        message: undefined,
        updatedAt: now,
      };
    } else if (action === 'reject') {
      // Allow admin override at any time (not just pending)
      decisionState = {
        ...decisionState,
        status: 'rejected',
        message: message || 'Your request was rejected.',
        updatedAt: now,
      };
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(decisionState);
  } catch (e) {
    console.error('[LoginDecision API] Error in POST:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(decisionState);
}


