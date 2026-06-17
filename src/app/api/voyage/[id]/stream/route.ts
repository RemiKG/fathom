import { getVoyage } from '@/lib/store';
import { seedExamples } from '@/lib/seed';
import { subscribe } from '@/lib/pipeline/bus';
import { ensureStartedById } from '@/lib/pipeline/service';
import type { PipelineEvent } from '@/lib/pipeline/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await seedExamples();
  const existing = await getVoyage(id);

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (e: PipelineEvent) => { try { controller.enqueue(enc.encode(sse(e))); } catch { /* closed */ } };

      if (!existing) {
        send({ type: 'error', message: 'voyage not found' });
        controller.close();
        return;
      }
      // Already finished (e.g. an example, or completed before a cold reload): replay + close.
      if (existing.status === 'done') {
        send({ type: 'done', voyage: existing });
        controller.close();
        return;
      }
      if (existing.status === 'error') {
        send({ type: 'error', message: existing.error || 'the voyage failed' });
        controller.close();
        return;
      }

      // Live run: drive it (once) and stream every stage as it lands.
      await ensureStartedById(id);
      let closed = false;
      const unsub = subscribe(id, (e) => {
        send(e);
        if (e.type === 'done' || e.type === 'error') {
          closed = true;
          try { controller.close(); } catch { /* already closed */ }
        }
      });
      const keepalive = setInterval(() => { if (!closed) { try { controller.enqueue(enc.encode(': keepalive\n\n')); } catch { /* closed */ } } }, 15000);
      // clean up when the stream is cancelled
      (controller as any)._cleanup = () => { clearInterval(keepalive); unsub(); };
    },
    cancel(reason) {
      // best-effort cleanup; the detached run continues server-side
      void reason;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
