/* The shape of a voyage — the structured record Fathom keeps in its Logbook. */
import type { Diagram, PlayBeat } from '@/lib/art/plate';

export type Lens = 'story' | 'doc' | 'kid' | 'technical';
export type Aspect = '9:16' | '16:9';

export interface VoyageOptions {
  lens: Lens;
  scenes: number;          // 3–6
  totalSeconds: number;    // target voyage length (45–90)
  budgetS: number;         // video-second cap (the track constraint)
  groundingDepth: number;  // sources retrieved per claim (1–4)
  strictness: number;      // 0..1 Assayer threshold
  withhold: boolean;       // withhold-when-unsure
  verify: boolean;         // the airplane-mode flip
  narration: boolean;
  aspect: Aspect;
}

export const DEFAULT_OPTIONS: VoyageOptions = {
  lens: 'story', scenes: 4, totalSeconds: 58, budgetS: 50, groundingDepth: 3,
  strictness: 0.78, withhold: true, verify: true, narration: true, aspect: '16:9',
};

export type Verdict = 'verified' | 'withheld' | 'pending';

export interface Source { id: string; domain: string; url: string; title: string; extract: string }

export interface Claim {
  id: string;
  text: string;
  sourceId?: string | null;   // → Source.id (real retrieved URL) or null if withheld
  verdict: Verdict;
  note?: string;              // e.g. "shown as 'fast' — no citable figure"
}

export type SceneStatus = 'queued' | 'sounding' | 'verified' | 'withheld';

export interface Scene {
  no: number;
  subject: string;
  camera: string;
  motion: string;
  labelCallouts: string[];
  durationS: number;
  editBeat: PlayBeat;         // descent | plate | move | answer
  claimIds: string[];
  status: SceneStatus;
  videoUrl?: string | null;   // real r2v output (persisted) when the engine is connected
  posterUrl?: string | null;
  styleScore?: number;
  reSounded?: boolean;
  narration?: string;         // the narrated line for this beat
}

export interface Counters {
  framesVerified: number;
  framesTotal: number;
  claimsGrounded: number;
  claimsTotal: number;
  sourcesCited: number;
  claimsWithheld: number;
  styleConsistency: number;   // 0..1
  secondsUsed: number;
  budgetS: number;
  naiveSecondsBaseline: number;
  secondsSavedPct: number;
  reRenderRate: string;       // "1/4"
  reRenders: number;
  endToEndMs: number;
}

export type VoyageStatus = 'plotting' | 'grounding' | 'charting' | 'engraving' | 'sounding' | 'assaying' | 'cutting' | 'done' | 'error';

export interface Voyage {
  id: string;
  question: string;
  title: string;
  subtitle: string;
  revelation: string;
  options: VoyageOptions;
  status: VoyageStatus;
  statusLabel: string;
  diagram: Diagram | null;
  scenes: Scene[];
  claims: Claim[];
  sources: Source[];
  counters: Counters;
  provider: string;           // which engine produced it
  degraded: boolean;          // honest: video-engine off?
  example?: boolean;          // pre-seeded demo voyage
  subjectKey?: string;        // one of the six bespoke subjects, if recognised
  error?: string;
  createdAt: number;
  updatedAt: number;
  endToEndMs?: number;
}

/* streamed pipeline events (SSE) — the pipeline IS the interface */
export type PipelineEvent =
  | { type: 'status'; status: VoyageStatus; label: string }
  | { type: 'title'; title: string; subtitle: string; revelation: string; subjectKey?: string }
  | { type: 'tool'; tool: string; detail: string; state: 'running' | 'ok' }
  | { type: 'shotlist'; scenes: Scene[]; diagram: Diagram }
  | { type: 'source'; source: Source }
  | { type: 'claim'; claim: Claim }
  | { type: 'scene'; scene: Scene }
  | { type: 'counters'; counters: Counters }
  | { type: 'done'; voyage: Voyage }
  | { type: 'error'; message: string };

export function newId(prefix = 'v'): string {
  const a = Math.random().toString(36).slice(2, 8);
  const b = Date.now().toString(36).slice(-4);
  return `${prefix}_${b}${a}`;
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'voyage';
}
