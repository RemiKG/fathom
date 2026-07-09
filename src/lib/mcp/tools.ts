/* Fathom's studio as a reusable tool surface — the six Skill/MCP tools that mirror the Navigator's
   loop, plus one convenience tool that runs the whole thing. Stateless where possible so any agent
   can chain them exactly like the Navigator does:
     plot_voyage → ground_claims → chart_scene → engrave_plate → sound_scene → assay_frame → cut_short
   The same code powers the app, the /api/mcp server and the Qwen Skill scripts. */

import { getConfig } from '@/lib/config';
import { plotVoyage, chartScene, assayFrames } from '@/lib/pipeline/tools';
import { retrieveSources } from '@/lib/pipeline/grounding';
import { createVoyage, ensureStarted } from '@/lib/pipeline/service';
import { runVoyage } from '@/lib/pipeline/orchestrator';
import { getVoyage } from '@/lib/store';
import { DEFAULT_OPTIONS, type VoyageOptions, type Claim, type Source, type Scene } from '@/lib/pipeline/types';
import { genericCutaway, type Diagram } from '@/lib/art/plate';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: any) => Promise<unknown>;
}

function opts(partial?: Partial<VoyageOptions>): VoyageOptions {
  return { ...DEFAULT_OPTIONS, budgetS: getConfig().video.budgetS, ...(partial || {}) };
}

export const TOOLS: McpTool[] = [
  {
    name: 'plot_voyage',
    description: 'The Navigator. Read a "how does X work?" question and write the voyage: the one revelation, the arc, the factual claims, a diagram archetype, and web-search queries to ground it.',
    inputSchema: { type: 'object', required: ['question'], properties: { question: { type: 'string' }, lens: { type: 'string', enum: ['story', 'doc', 'kid', 'technical'] } } },
    handler: async (a) => plotVoyage(String(a.question), opts({ lens: a.lens })),
  },
  {
    name: 'ground_claims',
    description: 'Retrieve real facts and their source URLs (keyless Wikipedia REST) for a set of search queries, before any frame is drawn.',
    inputSchema: { type: 'object', required: ['queries'], properties: { queries: { type: 'array', items: { type: 'string' } }, depth: { type: 'number' } } },
    handler: async (a) => retrieveSources((a.queries || []).map(String), Number(a.depth) || 3),
  },
  {
    name: 'chart_scene',
    description: 'The Cartographer. Turn the revelation + retrieved sources into a typed shot list and one seed-locked cutaway diagram, grounding each claim to a real source (or withholding it).',
    inputSchema: {
      type: 'object', required: ['question', 'revelation', 'archetype', 'claims', 'sources'],
      properties: {
        question: { type: 'string' }, revelation: { type: 'string' }, archetype: { type: 'string' },
        subjectKey: { type: 'string' }, claims: { type: 'array', items: { type: 'string' } },
        sources: { type: 'array' }, lens: { type: 'string' }, scenes: { type: 'number' },
      },
    },
    handler: async (a) => chartScene(
      String(a.question),
      { title: '', subtitle: '', revelation: String(a.revelation), subjectKey: a.subjectKey || null, archetype: a.archetype, claims: a.claims || [], searchQueries: [] },
      opts({ lens: a.lens, scenes: a.scenes }),
      (a.sources || []) as Source[],
      (a.claims || []).map(String),
    ),
  },
  {
    name: 'engrave_plate',
    description: 'The Engraver. Ink the seed-locked cutaway plate from a diagram spec, in the hand-inked Fathom style (procedural vector; returns an SVG). This plate anchors the style of every scene.',
    inputSchema: { type: 'object', required: ['diagram'], properties: { diagram: { type: 'object' }, beat: { type: 'string', enum: ['descent', 'plate', 'move', 'answer'] } } },
    handler: async (a) => {
      const d = a.diagram as Diagram;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 340" width="480" height="340">${genericCutaway(d, a.beat || 'plate', { animate: false })}</svg>`;
      return { svg, dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, note: 'procedural vector plate; with DASHSCOPE_API_KEY the Engraver can also raster via wan2.6-t2i' };
    },
  },
  {
    name: 'sound_scene',
    description: 'The Sounding. Film one scene as reference-to-video (wan2.7-r2v) using the plate as the reference image, so the mechanism moves while keeping the inked look. Without a Qwen key it returns the still-preview beat spec (honest degrade).',
    inputSchema: { type: 'object', required: ['scene'], properties: { scene: { type: 'object' }, referenceImageUrl: { type: 'string' } } },
    handler: async (a) => {
      const cfg = getConfig();
      const scene = a.scene as Scene;
      if (!cfg.video.hasEngine || !a.referenceImageUrl) {
        return { mode: 'still-preview', beat: scene.editBeat, durationS: scene.durationS, note: 'video engine off — the player animates the inked plate at this beat. Set DASHSCOPE_API_KEY to render real r2v.' };
      }
      const { startSounding } = await import('@/lib/provider/qwenMedia');
      const taskId = await startSounding(`${scene.subject}. ${scene.motion}. nineteenth-century hand-inked engraving, style-locked`, String(a.referenceImageUrl), { durationS: Math.round(scene.durationS) });
      return { mode: 'r2v', taskId, poll: `/api/tasks/${taskId}` };
    },
  },
  {
    name: 'assay_frame',
    description: 'The Assayer. Truth + style audit: verify each claim against its retrieved source, score per-scene style consistency, flag at most one scene to re-render, and withhold anything it cannot back.',
    inputSchema: { type: 'object', required: ['claims', 'sources', 'scenes'], properties: { claims: { type: 'array' }, sources: { type: 'array' }, scenes: { type: 'array' }, strictness: { type: 'number' } } },
    handler: async (a) => assayFrames((a.claims || []) as Claim[], (a.sources || []) as Source[], (a.scenes || []) as Scene[], Number(a.strictness) || 0.78),
  },
  {
    name: 'cut_short',
    description: 'The Cutter. Deterministically assemble the cited edit and compute every live number (frames verified/withheld, sources cited, seconds used vs a naive baseline, style-consistency, re-render rate).',
    inputSchema: { type: 'object', required: ['scenes', 'claims'], properties: { scenes: { type: 'array' }, claims: { type: 'array' }, budgetS: { type: 'number' } } },
    handler: async (a) => {
      const scenes = (a.scenes || []) as Scene[];
      const claims = (a.claims || []) as Claim[];
      const rendered = scenes.filter((s) => !!s.videoUrl); // only RENDERED scenes spend seconds / count as verified frames
      const secondsUsed = Math.round(rendered.reduce((x, s) => x + (s.durationS || 0), 0) * 10) / 10;
      const naive = secondsUsed > 0 ? Math.round((secondsUsed * 1.6 + scenes.length * 2) * 10) / 10 : 0;
      return {
        framesVerified: rendered.filter((s) => s.status === 'verified').length, framesTotal: scenes.length,
        claimsGrounded: claims.filter((c) => c.sourceId).length, claimsWithheld: claims.filter((c) => c.verdict === 'withheld').length,
        sourcesCited: new Set(claims.map((c) => c.sourceId).filter(Boolean)).size,
        secondsUsed, naiveSecondsBaseline: naive, secondsSavedPct: naive ? Math.round((1 - secondsUsed / naive) * 100) : 0,
        budgetS: Number(a.budgetS) || getConfig().video.budgetS,
      };
    },
  },
  {
    name: 'sound_voyage',
    description: 'Convenience: run the ENTIRE Fathom pipeline on a question and return the finished, fact-checked voyage (title, scenes, grounded+verified claims with source URLs, and every live counter). The drop-in "explain-anything-as-a-checked-short" primitive.',
    inputSchema: { type: 'object', required: ['question'], properties: { question: { type: 'string' }, lens: { type: 'string' }, scenes: { type: 'number' } } },
    handler: async (a) => {
      const v = await createVoyage(String(a.question), { lens: a.lens, scenes: a.scenes });
      await runVoyage(v);
      const done = await getVoyage(v.id);
      return done || v;
    },
  },
];

export function findTool(name: string): McpTool | undefined {
  return TOOLS.find((t) => t.name === name);
}
export { ensureStarted };
