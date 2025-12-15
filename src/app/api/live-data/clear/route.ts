import { NextResponse } from 'next/server';
import { clearAll, getSnapshot } from '../store';

export async function POST() {
  clearAll();
  return NextResponse.json({ success: true, ...getSnapshot() });
}


