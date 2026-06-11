/* A tiny in-process event bus so the Sounding view can watch the pipeline work in real time.
   The orchestrator runs server-side after POST /api/voyage; the SSE endpoint subscribes here.
   Events are buffered so a late subscriber (or a reconnect) replays the whole run. Kept on
   globalThis to survive Next.js dev HMR. Single-node deploy (Alibaba ECS) — exactly the target. */

import type { PipelineEvent } from './types';

interface Run {
  buffer: PipelineEvent[];
  listeners: Set<(e: PipelineEvent) => void>;
  done: boolean;
}

const g = globalThis as unknown as { __fathomRuns?: Map<string, Run> };
if (!g.__fathomRuns) g.__fathomRuns = new Map();
const runs = g.__fathomRuns;

export function createRun(id: string): void {
  if (!runs.has(id)) runs.set(id, { buffer: [], listeners: new Set(), done: false });
}

export function emit(id: string, event: PipelineEvent): void {
  const r = runs.get(id);
  if (!r) return;
  r.buffer.push(event);
  if (event.type === 'done' || event.type === 'error') r.done = true;
  for (const cb of r.listeners) { try { cb(event); } catch { /* ignore */ } }
}

export function subscribe(id: string, cb: (e: PipelineEvent) => void): () => void {
  createRun(id);
  const r = runs.get(id)!;
  // replay what already happened
  for (const e of r.buffer) { try { cb(e); } catch { /* ignore */ } }
  if (r.done) return () => {};
  r.listeners.add(cb);
  return () => { r.listeners.delete(cb); };
}

export function isDone(id: string): boolean {
  return runs.get(id)?.done ?? false;
}

export function finishRun(id: string): void {
  const r = runs.get(id);
  if (r) r.done = true;
  // keep the buffer around briefly for reconnects; drop after 5 min
  setTimeout(() => runs.delete(id), 5 * 60_000);
}
