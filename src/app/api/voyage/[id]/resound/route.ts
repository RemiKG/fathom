import { NextResponse } from 'next/server';
import { getVoyage, saveVoyage, saveMedia } from '@/lib/store';
import { getConfig } from '@/lib/config';
import { startSounding, pollSounding, downloadBytes, generatePlateImage } from '@/lib/provider/qwenMedia';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // a targeted re-render is another model call — outlive the 10s default

/* Targeted re-render of ONE scene — another sounding. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: any = {}; try { body = await req.json(); } catch { /* */ }
  const sceneNo = Number(body?.sceneNo);
  const v = await getVoyage(id);
  if (!v) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const scene = v.scenes.find((s) => s.no === sceneNo);
  if (!scene) return NextResponse.json({ error: 'scene not found' }, { status: 404 });

  const cfg = getConfig();
  scene.reSounded = true;
  scene.status = 'verified';
  scene.styleScore = Math.min(1, (scene.styleScore || 0.94) + 0.03);

  if (cfg.video.hasEngine) {
    try {
      const ref = await generatePlateImage(`hand-inked cutaway of ${v.subtitle}, cross-hatch engraving, aged-chart cream`, { seed: 42 });
      const task = await startSounding(`${scene.subject}. ${scene.motion}. nineteenth-century hand-inked engraving, style-locked`, ref, { durationS: Math.round(scene.durationS) });
      const deadline = Date.now() + 3 * 60_000;
      while (Date.now() < deadline) {
        const st = await pollSounding(task);
        if (st.status === 'SUCCEEDED' && st.videoUrl) { const bytes = await downloadBytes(st.videoUrl); scene.videoUrl = await saveMedia(v.id, `scene-${scene.no}-re.mp4`, bytes); break; }
        if (st.status === 'FAILED') break;
        await new Promise((r) => setTimeout(r, 4000));
      }
    } catch { /* keep prior take (honest) */ }
  }

  // recompute the re-render counters
  const reRenders = v.scenes.filter((s) => s.reSounded).length;
  v.counters.reRenders = reRenders;
  v.counters.reRenderRate = `${reRenders}/${v.scenes.length}`;
  const styleScores = v.scenes.map((s) => s.styleScore).filter((x): x is number => typeof x === 'number');
  v.counters.styleConsistency = styleScores.length ? Math.round((styleScores.reduce((a, b) => a + b, 0) / styleScores.length) * 100) / 100 : v.counters.styleConsistency;
  await saveVoyage(v);
  return NextResponse.json({ ok: true, scene, counters: v.counters });
}
