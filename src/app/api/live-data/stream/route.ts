import { subscribe, getSnapshot } from '../store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (chunk: string) => controller.enqueue(encoder.encode(chunk));

      // Initial snapshot
      write(`event: snapshot\n`);
      write(`data: ${JSON.stringify(getSnapshot())}\n\n`);

      const unsubscribe = subscribe((snap) => {
        try {
          write(`event: snapshot\n`);
          write(`data: ${JSON.stringify(snap)}\n\n`);
        } catch {
          // ignore
        }
      });

      // Keep-alive ping (some proxies idle-timeout SSE)
      const ping = setInterval(() => {
        try {
          write(`: ping ${Date.now()}\n\n`);
        } catch {
          // ignore
        }
      }, 15000);

      const abort = () => {
        clearInterval(ping);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      request.signal.addEventListener('abort', abort);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}


