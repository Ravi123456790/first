import { NextResponse } from 'next/server';
import type { DataType } from '../../lib/capturedData';
import { getSnapshot, setField } from './store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dataType, value } = body as { dataType: DataType; value: string };

    if (!dataType) {
      return NextResponse.json({ error: 'dataType is required' }, { status: 400 });
    }

    setField(dataType, value ?? '');
    return NextResponse.json({ success: true, ...getSnapshot() });
  } catch (e) {
    console.error('[LiveData API] Error in POST:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(getSnapshot());
}


