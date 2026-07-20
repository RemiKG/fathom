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

function num(x: unknown, lo: number, hi: number, dflt: number, round = true): number {
  const n = Number(x);
  if (!Number.isFinite(n)) return dflt;
  const clamped = Math.min(hi, Math.max(lo, n));
  return round ? Math.round(clamped) : clamped;
}

/** Options arrive from the UI *and* from raw API callers — clamp everything to the ranges the
    pipeline actually supports, so a wild payload degrades to sane values instead of crashing
    the run halfway through. */
export function makeOptions(partial?: Partial<VoyageOptions>): VoyageOptions {
  const c = getConfig();
  const base: VoyageOptions = { ...DEFAULT_OPTIONS, budgetS: c.video.budgetS };
  const p = partial || {};
  return {
    lens: p.lens === 'story' || p.lens === 'doc' || p.lens === 'kid' || p.lens === 'technical' ? p.lens : base.lens,
    scenes: num(p.scenes, 3, 6, base.scenes),
    totalSeconds: num(p.totalSeconds, 20, 120, base.totalSeconds),
    budgetS: num(p.budgetS, 5, 100, base.budgetS),
    groundingDepth: num(p.groundingDepth, 1, 4, base.groundingDepth),
    strictness: num(p.strictness, 0, 1, base.strictness, false),
    withhold: typeof p.withhold === 'boolean' ? p.withhold : base.withhold,
    verify: typeof p.verify === 'boolean' ? p.verify : base.verify,
    narration: typeof p.narration === 'boolean' ? p.narration : base.narration,
    aspect: p.aspect === '9:16' || p.aspect === '16:9' ? p.aspect : base.aspect,
  };
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
