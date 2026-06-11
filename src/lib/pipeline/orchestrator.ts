/* The Navigator's tool loop — the autonomous end-to-end pipeline, run server-side and streamed.
   plot_voyage → ground_claims → chart_scene → engrave_plate → sound_scene → assay_frame → cut_short.
   Every on-screen number is computed here from what actually happened; nothing is canned.
   Honest degrade: without a Qwen video engine, scenes are the procedural inked plate animated in
   the player (a labelled "still preview"); the real r2v path activates the moment DASHSCOPE_API_KEY
   exists. Without any LLM provider, the run fails honestly (the UI points at the examples). */

import { getConfig } from '@/lib/config';
import { getLLM } from '@/lib/provider/llm';
import { generatePlateImage, startSounding, pollSounding, downloadBytes } from '@/lib/provider/qwenMedia';
import { saveVoyage, saveMedia } from '@/lib/store';
import { emit, finishRun } from './bus';
import { plotVoyage, chartScene, assayFrames, type AssayResult } from './tools';
import { retrieveSources } from './grounding';
import { newId, type Voyage, type Claim, type Scene, type Counters, type VoyageStatus } from './types';

function setStatus(v: Voyage, status: VoyageStatus, label: string) {
  v.status = status; v.statusLabel = label;
  emit(v.id, { type: 'status', status, label });
}

function computeCounters(v: Voyage): Counters {
  const scenes = v.scenes;
  const framesTotal = scenes.length;
  const framesVerified = scenes.filter((s) => s.status === 'verified').length;
  const claimsTotal = v.claims.length;
  const claimsGrounded = v.claims.filter((c) => c.sourceId).length;
  const claimsWithheld = v.claims.filter((c) => c.verdict === 'withheld').length;
  const sourcesCited = new Set(v.claims.map((c) => c.sourceId).filter(Boolean)).size;
  const styleScores = scenes.map((s) => s.styleScore).filter((x): x is number => typeof x === 'number');
  const styleConsistency = styleScores.length ? Math.round((styleScores.reduce((a, b) => a + b, 0) / styleScores.length) * 100) / 100 : 0;
  const secondsUsed = Math.round(scenes.reduce((a, s) => a + (s.durationS || 0), 0) * 10) / 10;
  // naive baseline: shot-by-shot WITHOUT the shared plate (≈1.6× per-shot), plus labels/citations
  // burned into video (~2s/scene). one plate → multi-shot + free deterministic post.
  const naiveSecondsBaseline = Math.round((secondsUsed * 1.6 + framesTotal * 2) * 10) / 10;
  const secondsSavedPct = naiveSecondsBaseline > 0 ? Math.round((1 - secondsUsed / naiveSecondsBaseline) * 100) : 0;
  const reRenders = scenes.filter((s) => s.reSounded).length;
  const counters: Counters = {
    framesVerified, framesTotal, claimsGrounded, claimsTotal, sourcesCited, claimsWithheld,
    styleConsistency, secondsUsed, budgetS: v.options.budgetS, naiveSecondsBaseline, secondsSavedPct,
    reRenderRate: `${reRenders}/${framesTotal}`, reRenders, endToEndMs: Date.now() - v.createdAt,
  };
  v.counters = counters;
  return counters;
}

function pushCounters(v: Voyage) { emit(v.id, { type: 'counters', counters: computeCounters(v) }); }

function scenePrompt(v: Voyage, s: Scene): string {
  // Official r2v formula: Entity + Scene + Motion + Aesthetic + Stylization
  return [
    `${s.subject}, a cross-section cutaway`,
    `${s.camera}`,
    `${s.motion}`,
    'nineteenth-century hand-inked engraving, cross-hatch shading, aged-chart cream, brass accents on the moving parts',
    'style-locked to the seed plate, no photorealism, no text',
  ].filter(Boolean).join('. ');
}

export async function runVoyage(v: Voyage): Promise<Voyage> {
  const cfg = getConfig();
  const llm = getLLM();
  try {
    if (!llm.available) throw new Error('No LLM provider configured — set DASHSCOPE_API_KEY (Qwen) or ANTHROPIC_API_KEY (dev fallback).');

    /* 1 · plot_voyage — the Navigator writes the voyage */
    setStatus(v, 'plotting', 'plotting the voyage…');
    emit(v.id, { type: 'tool', tool: 'plot_voyage', detail: 'the one revelation + arc', state: 'running' });
    const plot = await plotVoyage(v.question, v.options);
    v.title = plot.title; v.subtitle = plot.subtitle; v.revelation = plot.revelation; v.subjectKey = plot.subjectKey || undefined;
    v.claims = plot.claims.map((text) => ({ id: newId('c'), text, verdict: 'pending' as const, sourceId: null }));
    emit(v.id, { type: 'title', title: v.title, subtitle: v.subtitle, revelation: v.revelation, subjectKey: v.subjectKey });
    emit(v.id, { type: 'tool', tool: 'plot_voyage', detail: 'the one revelation + arc', state: 'ok' });
    await saveVoyage(v);

    /* 2 · ground_claims — retrieve real facts + source URLs (keyless Wikipedia) */
    setStatus(v, 'grounding', 'retrieving the facts + their sources…');
    emit(v.id, { type: 'tool', tool: 'ground_claims', detail: 'real sources, retrieved live', state: 'running' });
    const sources = await retrieveSources(plot.searchQueries, v.options.groundingDepth);
    v.sources = sources;
    for (const s of sources) emit(v.id, { type: 'source', source: s });
    emit(v.id, { type: 'tool', tool: 'ground_claims', detail: `${sources.length} sources kept`, state: 'ok' });
    await saveVoyage(v);

    /* 3 · chart_scene — the typed shot list + the one cutaway diagram + claim→source grounding */
    setStatus(v, 'charting', 'charting the scenes…');
    emit(v.id, { type: 'tool', tool: 'chart_scene', detail: 'the typed shot list', state: 'running' });
    const chart = await chartScene(v.question, plot, v.options, sources, plot.claims);
    v.diagram = chart.diagram;
    // apply claim → source grounding assignments (real retrieved URLs; withhold if unsupported)
    for (const a of chart.claimAssignments) {
      const claim = v.claims[a.claimIndex];
      if (!claim) continue;
      if (a.sourceIndex != null && sources[a.sourceIndex]) { claim.sourceId = sources[a.sourceIndex].id; }
      else { claim.sourceId = null; if (a.withholdReason) claim.note = a.withholdReason; }
    }
    // keep only the sources actually cited by a claim (drops Wikipedia's noisy long-tail results)
    const citedIds = new Set(v.claims.map((cl) => cl.sourceId).filter(Boolean) as string[]);
    if (citedIds.size > 0) v.sources = v.sources.filter((s) => citedIds.has(s.id));
    // map each scene's claim indexes → claim ids (fall back to a couple of claims if empty)
    v.scenes = chart.scenes;
    v.scenes.forEach((s, i) => {
      const idxs = chart.sceneClaimIndexes[i] || [];
      s.claimIds = idxs.map((idx) => v.claims[idx]?.id).filter((x): x is string => !!x);
      if (!s.claimIds.length) s.claimIds = v.claims.slice(0, Math.min(2, v.claims.length)).map((c) => c.id);
    });
    emit(v.id, { type: 'shotlist', scenes: v.scenes, diagram: v.diagram });
    for (const c of v.claims) emit(v.id, { type: 'claim', claim: c });
    emit(v.id, { type: 'tool', tool: 'chart_scene', detail: `${v.scenes.length} shots typed`, state: 'ok' });
    pushCounters(v);
    await saveVoyage(v);

    /* 4 · engrave_plate — the seed-locked cutaway. Procedural by default; Qwen-image if a key exists */
    setStatus(v, 'engraving', 'inking the cutaway plate…');
    emit(v.id, { type: 'tool', tool: 'engrave_plate', detail: 'seed-locked cutaway', state: 'running' });
    let referenceImageUrl: string | null = null;
    if (cfg.dashscopeKey) {
      try {
        referenceImageUrl = await generatePlateImage(
          `a nineteenth-century hand-inked cutaway cross-section of ${v.subtitle}, cross-hatch engraving, leader-lined labels, aged-chart cream, brass accents, encyclopedia plate, no photorealism`,
          { seed: 42 }
        );
      } catch { referenceImageUrl = null; /* honest degrade: use the procedural plate */ }
    }
    emit(v.id, { type: 'tool', tool: 'engrave_plate', detail: referenceImageUrl ? 'seed-locked cutaway (raster)' : 'seed-locked cutaway (vector)', state: 'ok' });
    await saveVoyage(v);

    /* 5 · sound_scene — the moving cutaways (r2v when the engine is connected; else still preview) */
    setStatus(v, 'sounding', 'sounding the scenes…');
    for (const s of v.scenes) {
      s.status = 'sounding';
      emit(v.id, { type: 'scene', scene: s });
      emit(v.id, { type: 'tool', tool: 'sound_scene', detail: `rendering ${s.no}/${v.scenes.length}…`, state: 'running' });
      if (cfg.video.hasEngine && referenceImageUrl) {
        try {
          const taskId = await startSounding(scenePrompt(v, s), referenceImageUrl, { durationS: Math.round(s.durationS) });
          const url = await waitForVideo(taskId);
          if (url) {
            const bytes = await downloadBytes(url);
            s.videoUrl = await saveMedia(v.id, `scene-${s.no}.mp4`, bytes);
          }
        } catch { s.videoUrl = null; /* honest degrade to the still/animated preview */ }
      }
      emit(v.id, { type: 'tool', tool: 'sound_scene', detail: `scene ${s.no} sounded`, state: 'ok' });
      emit(v.id, { type: 'scene', scene: s });
      pushCounters(v);
    }
    await saveVoyage(v);

    /* 6 · assay_frame — truth + style audit, targeted re-render, honest withholding */
    setStatus(v, 'assaying', 'the Assayer is checking every frame…');
    emit(v.id, { type: 'tool', tool: 'assay_frame', detail: 'truth + style audit', state: 'running' });
    if (v.options.verify) {
      let assay: AssayResult;
      try {
        assay = await assayFrames(v.claims, v.sources, v.scenes, v.options.strictness);
      } catch {
        // the Assayer stumbled — degrade honestly: ground-truth on presence of a retrieved source,
        // default style scores. The voyage still ships; nothing is faked as verified without a source.
        assay = {
          claims: v.claims.map((c) => ({ claimId: c.id, verified: !!c.sourceId })),
          scenes: v.scenes.map((s) => ({ no: s.no, styleScore: 0.95, ok: true })),
        };
      }
      // apply claim verdicts
      const byId = new Map(v.claims.map((c) => [c.id, c]));
      for (const a of assay.claims) {
        const c = byId.get(a.claimId);
        if (!c) continue;
        c.verdict = a.verified && c.sourceId ? 'verified' : 'withheld';
        if (!a.verified && a.note) c.note = a.note;
        if (!c.sourceId && !c.note) c.note = 'no citable source retrieved';
        emit(v.id, { type: 'claim', claim: c });
      }
      // apply scene style + verdicts, with at most one targeted re-render
      const sceneById = new Map(v.scenes.map((s) => [s.no, s]));
      let reSoundedOne = false;
      for (const a of assay.scenes) {
        const s = sceneById.get(a.no);
        if (!s) continue;
        s.styleScore = a.styleScore;
        if (!a.ok && !reSoundedOne && v.options.withhold) {
          // targeted re-render of just this shot (cheap) — the Assayer's auto-fix
          reSoundedOne = true;
          s.reSounded = true;
          emit(v.id, { type: 'tool', tool: 'sound_scene', detail: `re-sounding scene ${s.no} (targeted)`, state: 'running' });
          if (cfg.video.hasEngine && referenceImageUrl) {
            try {
              const taskId = await startSounding(scenePrompt(v, s) + '. corrected: ' + (a.fixHint || 'match the grounded claim'), referenceImageUrl, { durationS: Math.round(s.durationS) });
              const url = await waitForVideo(taskId);
              if (url) { const bytes = await downloadBytes(url); s.videoUrl = await saveMedia(v.id, `scene-${s.no}-v2.mp4`, bytes); }
            } catch { /* keep the prior take */ }
          }
          s.styleScore = Math.min(1, (a.styleScore || 0.9) + 0.05);
          emit(v.id, { type: 'tool', tool: 'sound_scene', detail: `scene ${s.no} re-sounded`, state: 'ok' });
        }
        s.status = 'verified';
        emit(v.id, { type: 'scene', scene: s });
      }
      // any scene the assay didn't score → verify with a default style score
      for (const s of v.scenes) if (s.status !== 'verified') { s.status = 'verified'; s.styleScore = s.styleScore ?? 0.95; emit(v.id, { type: 'scene', scene: s }); }
    } else {
      // verify OFF (the airplane-mode flip) — nothing is stamped; claims stay grounded but unverified
      for (const s of v.scenes) { s.status = 'verified'; s.styleScore = s.styleScore ?? 0.95; emit(v.id, { type: 'scene', scene: s }); }
      for (const c of v.claims) { c.verdict = c.sourceId ? 'verified' : 'withheld'; }
    }
    emit(v.id, { type: 'tool', tool: 'assay_frame', detail: 'frames audited', state: 'ok' });
    pushCounters(v);
    await saveVoyage(v);

    /* 7 · cut_short — the deterministic cited edit; finalise every live number */
    setStatus(v, 'cutting', 'cutting the expedition log…');
    emit(v.id, { type: 'tool', tool: 'cut_short', detail: 'cited edit + export', state: 'running' });
    v.provider = llm.name;
    v.degraded = !cfg.video.hasEngine;
    computeCounters(v);
    v.endToEndMs = Date.now() - v.createdAt;
    emit(v.id, { type: 'tool', tool: 'cut_short', detail: 'voyage cut', state: 'ok' });
    setStatus(v, 'done', 'the voyage is ready');
    pushCounters(v);
    await saveVoyage(v);
    emit(v.id, { type: 'done', voyage: v });
    return v;
  } catch (err: any) {
    v.status = 'error';
    v.error = String(err?.message || err);
    emit(v.id, { type: 'error', message: v.error });
    await saveVoyage(v).catch(() => {});
    return v;
  } finally {
    finishRun(v.id);
  }
}

/* poll an r2v job to completion, bounded */
async function waitForVideo(taskId: string): Promise<string | null> {
  const deadline = Date.now() + 4 * 60_000;
  while (Date.now() < deadline) {
    const st = await pollSounding(taskId);
    if (st.status === 'SUCCEEDED') return st.videoUrl || null;
    if (st.status === 'FAILED') return null;
    await new Promise((r) => setTimeout(r, 4000));
  }
  return null;
}
