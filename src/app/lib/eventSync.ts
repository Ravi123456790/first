'use client';

export async function postLiveEvent(type: string, data?: any) {
  try {
    await fetch('/api/live-data/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data }),
      keepalive: true,
    });
  } catch {
    // ignore
  }
}


