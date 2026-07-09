/* Create + drive voyages. POST creates the record; the Sounding stream drives the run (so it works
   on a persistent node server AND on serverless, where the function lives as long as the stream). */

import { getConfig } from '@/lib/config';
import { saveVoyage, getVoyage } from '@/lib/store';
import { createRun } from './bus';
import { runVoyage } from './orchestrator';
import { newId, DEFAULT_OPTIONS, type Voyage, type VoyageOptions } from './types';

const g = globalThis as unknown as { __fathomStarted?: Set<string> };
if (!g.__fathomStarted) g.__fathomStarted = new Set();
const started = g.__fathomStarted;

export function makeOptions(partial?: Partial<VoyageOptions>): VoyageOptions {
  const c = getConfig();
  return { ...DEFAULT_OPTIONS, budgetS: c.video.budgetS, ...(partial || {}) };
}

export async function createVoyage(question: string, partial?: Partial<VoyageOptions>): Promise<Voyage> {
  return createVoyageWithId(newId('v'), question, partial);
}

/** Create (or recreate) a voyage under a known id — lets the Sounding stream rebuild the record
    when it lands on a serverless instance that never saw the original POST. */
export async function createVoyageWithId(id: string, question: string, partial?: Partial<VoyageOptions>): Promise<Voyage> {
  const options = makeOptions(partial);
  const now = Date.now();
  const v: Voyage = {
    id,
    question: question.trim().slice(0, 240),
    title: '', subtitle: '', revelation: '',
    options,
    status: 'plotting', statusLabel: 'preparing the expedition…',
    diagram: null, scenes: [], claims: [], sources: [],
    counters: {
      framesVerified: 0, framesTotal: 0, claimsGrounded: 0, claimsTotal: 0, sourcesCited: 0, claimsWithheld: 0,
      styleConsistency: 0, secondsUsed: 0, budgetS: options.budgetS, naiveSecondsBaseline: 0, secondsSavedPct: 0,
      reRenderRate: '0/0', reRenders: 0, endToEndMs: 0,
    },
    provider: getConfig().provider, degraded: !getConfig().video.hasEngine,
    createdAt: now, updatedAt: now,
  };
  createRun(v.id);
  await saveVoyage(v);
  return v;
}

/** Start the orchestration exactly once for a voyage id. */
export function ensureStarted(v: Voyage): void {
  if (started.has(v.id)) return;
  started.add(v.id);
  // detached: on a persistent server this keeps running even if the viewer disconnects.
  runVoyage(v).catch(() => {}).finally(() => { /* keep in set to prevent restart */ });
}

export async function ensureStartedById(id: string): Promise<boolean> {
  if (started.has(id)) return true;
  const v = await getVoyage(id);
  if (!v) return false;
  if (v.status === 'done' || v.status === 'error') { started.add(id); return true; }
  ensureStarted(v);
  return true;
}
