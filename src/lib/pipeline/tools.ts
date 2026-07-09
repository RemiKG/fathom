/* The crew, as callable tools. Each maps to one of the six Skill/MCP tools.
   plot_voyage (Navigator) · chart_scene (Cartographer) · assay_frame (Assayer).
   engrave_plate / sound_scene / cut_short are largely deterministic and live in orchestrator.ts. */

import { z } from 'zod';
import { getLLM, type VisionImage } from '@/lib/provider/llm';
import type { VoyageOptions, Source, Claim, Scene } from './types';
import { newId } from './types';
import type { Diagram, DiagramArchetype, PlayBeat } from '@/lib/art/plate';

const LENS_VOICE: Record<string, string> = {
  story: 'Tell it as a STORY — a POV, a small arc, stakes and a reveal (the "Once Upon a Time… Life" move). Warm, vivid, a little wonder.',
  doc: 'Tell it STRAIGHT, like a calm documentary narrator. Precise, unhurried, no hype.',
  kid: 'Explain it FOR A TEN-YEAR-OLD. Short sentences, concrete images, no jargon, genuinely delightful.',
  technical: 'Explain it TECHNICALLY, for a curious engineer. Name the mechanism precisely; still legible.',
};

const SUBJECTS = ['headphone', 'sky', 'bread', 'blackhole', 'sleep', 'onion'] as const;
const ARCHETYPES: DiagramArchetype[] = ['cross-section', 'layers', 'field', 'wave', 'cycle', 'flow'];

/* A truncating string field. LLMs occasionally overrun a field's budget (a slightly long scene
   subject, a verbose note); a few extra characters should never crash an entire voyage. So we CLAMP
   the ceiling instead of rejecting, while still enforcing a floor for genuinely-empty fields. */
const tstr = (max: number, min = 0) =>
  z.preprocess((v) => (typeof v === 'string' ? v.trim().slice(0, max) : v),
    min > 0 ? z.string().min(min) : z.string());

/* ───────────────────────── plot_voyage (Navigator) ───────────────────────── */
const PlotSchema = z.object({
  title: tstr(120, 2),
  subtitle: tstr(200, 2),
  revelation: tstr(400, 4),
  subjectKey: z.string().nullish(),
  archetype: z.string(),
  claims: z.array(tstr(400, 4)).min(2).max(8),
  searchQueries: z.array(tstr(120, 2)).min(1).max(8),
});
export interface PlotResult {
  title: string; subtitle: string; revelation: string;
  subjectKey: string | null; archetype: DiagramArchetype;
  claims: string[]; searchQueries: string[];
}

export async function plotVoyage(question: string, opts: VoyageOptions): Promise<PlotResult> {
  const llm = getLLM();
  const system = `You are the Navigator of Fathom — an autonomous showrunner that turns "how does X work?" into a ~60-second hand-inked cutaway voyage. ${LENS_VOICE[opts.lens]}
You decide the ONE revelation the voyage must deliver and the arc that earns it (question → descent → the moment it moves → the answer).
Rules:
- Every factual claim must be checkable against a real, retrievable source. Prefer well-documented mechanisms.
- Title: short, evocative, ALL-CAPS-worthy (e.g. "INTO SILENCE"). Subtitle: "how a headphone erases a sound" style.
- Choose a diagram archetype from: ${ARCHETYPES.join(', ')}.
  cross-section = a thing shown in section (cell, engine, ear); layers = strata a ray/particle crosses (sky, skin, atmosphere); field = a mass bending a ray (gravity, light, magnetism); wave = two waveforms interacting (sound, interference); cycle = a process loop (water cycle, sleep stages); flow = a left→right pipeline of stages (signal, digestion, data).
- If the subject is clearly one of these, set subjectKey to it, else null: ${SUBJECTS.join(', ')}.
- claims: 3–7 crisp factual statements the voyage will show, in order.
- searchQueries: 2–6 web-search queries to ground those claims (topic + key mechanisms).`;
  const user = `The stranger asks: "${question}"

Return JSON:
{
  "title": "...", "subtitle": "...", "revelation": "the one thing they'll finally see",
  "subjectKey": null | "headphone|sky|bread|blackhole|sleep|onion",
  "archetype": "cross-section|layers|field|wave|cycle|flow",
  "claims": ["...", "..."],
  "searchQueries": ["...", "..."]
}`;
  const raw = await llm.json<any>({ system, user, maxTokens: 1400, temperature: 0.7 });
  const p = PlotSchema.parse(raw);
  const archetype = (ARCHETYPES.includes(p.archetype as DiagramArchetype) ? p.archetype : 'cross-section') as DiagramArchetype;
  const subjectKey = p.subjectKey && SUBJECTS.includes(p.subjectKey as any) ? p.subjectKey : null;
  return {
    title: p.title.toUpperCase().slice(0, 46),
    subtitle: p.subtitle,
    revelation: p.revelation,
    subjectKey,
    archetype,
    claims: p.claims,
    searchQueries: p.searchQueries,
  };
}

/* ───────────────────────── chart_scene (Cartographer) ───────────────────────── */
const SceneSchema = z.object({
  subject: tstr(160, 1),
  camera: z.preprocess((v) => (typeof v === 'string' ? v.trim().slice(0, 160) : v), z.string()).optional().default('slow push in'),
  motion: tstr(240, 1),
  labelCallouts: z.array(tstr(60)).max(8).optional().default([]),
  durationS: z.coerce.number().min(1).max(10).optional().default(3),
  editBeat: z.enum(['descent', 'plate', 'move', 'answer']),
  narration: z.preprocess((v) => (typeof v === 'string' ? v.trim().slice(0, 600) : v), z.string()).optional().default(''),
  claimIndexes: z.array(z.coerce.number().int()).max(8).optional().default([]),
});
const ChartSchema = z.object({
  scenes: z.array(SceneSchema).min(2).max(8),
  diagram: z.object({
    archetype: z.string(),
    labels: z.array(z.object({ text: tstr(60, 1), brass: z.boolean().nullish() })).max(8).optional().default([]),
    layers: z.coerce.number().int().min(0).max(6).nullish(),
    flowLabel: tstr(60).nullish(),
    answerLabel: tstr(60).nullish(),
  }),
  claimSources: z.array(z.object({ claimIndex: z.coerce.number().int(), sourceIndex: z.coerce.number().int().nullish(), withholdReason: tstr(240).nullish() })).optional().default([]),
});

export interface ChartResult {
  scenes: Scene[];
  sceneClaimIndexes: number[][];   // per-scene → claim indexes (into the ordered claims list)
  diagram: Diagram;
  claimAssignments: Array<{ claimIndex: number; sourceIndex: number | null; withholdReason?: string }>;
}

export async function chartScene(
  question: string, plot: PlotResult, opts: VoyageOptions, sources: Source[], claims: string[]
): Promise<ChartResult> {
  const llm = getLLM();
  const srcList = sources.map((s, i) => `[${i}] ${s.domain} — ${s.title}: ${s.extract.slice(0, 180)}`).join('\n') || '(no sources retrieved)';
  const claimList = claims.map((c, i) => `(${i}) ${c}`).join('\n');
  const system = `You are the Cartographer of Fathom. You turn the Navigator's revelation into a typed shot list AND a single seed-locked cutaway diagram AND you ground each claim to a REAL retrieved source.
${LENS_VOICE[opts.lens]}
Constraints:
- Exactly ${opts.scenes} scenes. The arc: scene 1 editBeat="descent", an early scene "plate" (the labelled still that takes its "first breath"), the money scene "move" (the mechanism moves), a final "answer".
- Total duration ≈ ${opts.totalSeconds}s across scenes; each scene 2–4s of video (durationS).
- labelCallouts: the hand-lettered labels inked on that scene (parts of the mechanism). Keep them short.
- narration: ONE short spoken line per scene (about 8–16 words, one sentence), synced to the reveal. Keep it tight.
- diagram: the ONE cutaway. archetype="${plot.archetype}". labels = 2–6 anatomical callouts (mark the moving/active one brass:true). flowLabel = the label on the moving element at the money beat. answerLabel = the short resolved-state label (e.g. "= silence").
- Grounding: for EACH claim, pick the sourceIndex that best supports it from the list, or null + a withholdReason if no retrieved source supports it. NEVER invent a source. It is better to withhold than to bluff.`;
  const user = `Question: "${question}"
Revelation: ${plot.revelation}

Claims:
${claimList}

Retrieved sources:
${srcList}

Return JSON:
{
  "scenes": [{ "subject": "...", "camera": "...", "motion": "...", "labelCallouts": ["..."], "durationS": 3, "editBeat": "descent|plate|move|answer", "narration": "...", "claimIndexes": [0,1] }],
  "diagram": { "archetype": "${plot.archetype}", "labels": [{"text":"...","brass":true}], "layers": 3, "flowLabel": "...", "answerLabel": "..." },
  "claimSources": [{ "claimIndex": 0, "sourceIndex": 1 }, { "claimIndex": 4, "sourceIndex": null, "withholdReason": "no citable figure" }]
}`;
  const raw = await llm.json<any>({ system, user, maxTokens: 2600, temperature: 0.55 });
  const parsed = ChartSchema.parse(raw);

  const scenes: Scene[] = parsed.scenes.map((s, i) => ({
    no: i + 1,
    subject: s.subject,
    camera: s.camera,
    motion: s.motion,
    labelCallouts: s.labelCallouts,
    durationS: Math.round(s.durationS * 10) / 10,
    editBeat: s.editBeat as PlayBeat,
    claimIds: [],
    status: 'queued',
    narration: s.narration,
  }));

  const archetype = (ARCHETYPES.includes(parsed.diagram.archetype as DiagramArchetype) ? parsed.diagram.archetype : plot.archetype) as DiagramArchetype;
  const diagram: Diagram = {
    archetype,
    subject: plot.subjectKey || undefined,
    labels: (parsed.diagram.labels || []).map((l) => ({ text: l.text, brass: l.brass ?? undefined })),
    layers: parsed.diagram.layers ?? undefined,
    flowLabel: parsed.diagram.flowLabel ?? undefined,
    answerLabel: parsed.diagram.answerLabel ?? undefined,
  };

  return {
    scenes,
    sceneClaimIndexes: parsed.scenes.map((s) => s.claimIndexes || []),
    diagram,
    claimAssignments: parsed.claimSources.map((cs) => ({ claimIndex: cs.claimIndex, sourceIndex: cs.sourceIndex ?? null, withholdReason: cs.withholdReason ?? undefined })),
  };
}

/* ───────────────────────── assay_frame (Assayer) ─────────────────────────
   Truth + style audit. Verifies each claim against its assigned source's real extract,
   scores per-scene style consistency, and flags at most one scene to re-sound. When an actual
   rendered frame image is supplied, the vision model reads the pixels too. */
const AssaySchema = z.object({
  claims: z.array(z.object({ claimId: z.string(), verified: z.coerce.boolean(), note: tstr(600).nullish() })).optional().default([]),
  scenes: z.array(z.object({ no: z.coerce.number().int(), styleScore: z.coerce.number().min(0).max(1), ok: z.coerce.boolean(), fixHint: tstr(600).nullish() })).optional().default([]),
});
export interface AssayResult {
  claims: Array<{ claimId: string; verified: boolean; note?: string }>;
  scenes: Array<{ no: number; styleScore: number; ok: boolean; fixHint?: string }>;
}

export async function assayFrames(
  claims: Claim[], sources: Source[], scenes: Scene[], strictness: number, image?: VisionImage
): Promise<AssayResult> {
  const llm = getLLM();
  const srcById = new Map(sources.map((s) => [s.id, s]));
  const claimBlock = claims.map((c) => {
    const src = c.sourceId ? srcById.get(c.sourceId) : null;
    return `- id=${c.id} claim="${c.text}" ${src ? `source=${src.domain}: ${src.extract.slice(0, 700)}` : 'source=NONE'}`;
  }).join('\n');
  const sceneBlock = scenes.map((s) => `- no=${s.no} beat=${s.editBeat} motion="${s.motion}" labels=[${s.labelCallouts.join(', ')}]`).join('\n');
  const system = `You are the Assayer of Fathom — the truth + style critic. "The LLM proposes; the Assayer disposes." You would rather say "I don't know" than pass a lie.
Judge on TWO axes:
1) TRUTH — for each claim, is it supported by (or clearly consistent with) its retrieved source extract? Be fair, not pedantic: if the source describes the same mechanism the claim states → verified:true, even if the wording differs. Withhold (verified:false) ONLY when the source is absent/off-topic, the source contradicts the claim, or the claim asserts a SPECIFIC number/figure the source doesn't contain — then add a short note (what to show instead, e.g. 'show as "fast" — no citable figure'). Most well-grounded claims should verify.
2) STYLE — for each scene, a 0..1 style-consistency score vs a hand-inked cutaway plate, and ok:false + a fixHint for at most ONE scene if the described motion would contradict the claim (e.g. an arrow pointing the wrong way). Be sparing: flag 0 or 1 scene.
Strictness = ${strictness.toFixed(2)} (higher = more willing to withhold).${image ? ' An actual rendered frame is attached — also check that the pixels match the claims and the inked style.' : ''}`;
  const user = `Claims:
${claimBlock}

Scenes:
${sceneBlock}

Return JSON:
{ "claims": [{"claimId":"...","verified":true}], "scenes": [{"no":1,"styleScore":0.97,"ok":true}] }`;
  const raw = await llm.json<any>({ system, user, images: image ? [image] : undefined, maxTokens: 1600, temperature: 0.2 });
  const parsed = AssaySchema.parse(raw);
  return {
    claims: parsed.claims.map((cl) => ({ claimId: cl.claimId, verified: cl.verified, note: cl.note ?? undefined })),
    scenes: parsed.scenes.map((s) => ({ no: s.no, styleScore: s.styleScore, ok: s.ok, fixHint: s.fixHint ?? undefined })),
  };
}

export { newId };
