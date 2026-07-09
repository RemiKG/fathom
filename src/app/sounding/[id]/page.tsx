'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { ChartBg, DeepBg, Cutaway, Anglerfish, Stamp } from '@/components/art/Art';
import type { PipelineEvent, Scene, Source, Counters, VoyageStatus } from '@/lib/pipeline/types';
import type { Diagram } from '@/lib/art/plate';

const TOOL_ORDER = ['plot_voyage', 'chart_scene', 'ground_claims', 'engrave_plate', 'sound_scene', 'assay_frame', 'cut_short'];

export default function SoundingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [statusLabel, setStatusLabel] = useState('preparing the expedition…');
  const [status, setStatus] = useState<VoyageStatus>('plotting');
  const [tools, setTools] = useState<Record<string, { detail: string; state: string }>>({});
  const [sources, setSources] = useState<Source[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [diagram, setDiagram] = useState<Diagram | null>(null);
  const [counters, setCounters] = useState<Counters | null>(null);
  const [question, setQuestion] = useState('');
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const seen = new Set<string>(); // effect-local dedup (survives StrictMode re-mount correctly)
    const qParam = (new URLSearchParams(window.location.search).get('q') || '').trim();
    if (qParam) setQuestion(qParam);
    fetch(`/api/voyage/${id}`).then((r) => r.json()).then((v) => { if (v?.question) setQuestion(v.question); }).catch(() => {});
    // the question rides along so a serverless stream instance can rebuild + drive the voyage itself
    const es = new EventSource(`/api/voyage/${id}/stream${qParam ? `?q=${encodeURIComponent(qParam)}` : ''}`);
    es.onmessage = (m) => {
      let e: PipelineEvent; try { e = JSON.parse(m.data); } catch { return; }
      switch (e.type) {
        case 'status': setStatus(e.status); setStatusLabel(e.label); break;
        case 'title': setTitle(e.title); setSubtitle(e.subtitle); break;
        case 'tool': setTools((t) => ({ ...t, [e.tool]: { detail: e.detail, state: e.state } })); break;
        case 'shotlist': setScenes(e.scenes); setDiagram(e.diagram); break;
        case 'source': if (!seen.has(e.source.id)) { seen.add(e.source.id); setSources((s) => [...s, e.source]); } break;
        case 'scene': setScenes((sc) => { const i = sc.findIndex((x) => x.no === e.scene.no); if (i < 0) return [...sc, e.scene]; const c = sc.slice(); c[i] = e.scene; return c; }); break;
        case 'counters': setCounters(e.counters); break;
        case 'done':
          setDone(true);
          // keep the finished record client-side too, so the player/grounding screens can render
          // even when a later request lands on a serverless instance that never saw this run
          try { sessionStorage.setItem(`fathom-voyage-${id}`, JSON.stringify(e.voyage)); } catch { /* full/blocked */ }
          es.close(); setTimeout(() => router.push(`/voyage/${id}`), 1400); break;
        case 'error': setStatusLabel('the voyage failed: ' + e.message); setFailed(true); es.close(); break;
      }
    };
    es.onerror = () => { /* keep the last state; the run continues server-side */ };
    return () => es.close();
  }, [id, router]);

  const budgetPct = counters ? Math.min(100, (counters.secondsUsed / (counters.budgetS || 50)) * 100) : 0;
  const activeScene = scenes.find((s) => s.status === 'sounding') || scenes[scenes.length - 1];
  const beat = activeScene?.editBeat === 'move' ? 'move' : activeScene?.editBeat || 'plate';

  return (
    <div className="app">
      <ChartBg w={1600} h={1000} seed={4} />
      <div className="z">
        <TopBar active="ask" readout={<><span>question</span> <b>“{question || '…'}”</b></>} />
        <div className="body-split">
          {/* the deep stage */}
          <div className="stage" style={{ flex: 1.4 }}>
            <DeepBg w={900} h={760} glow={{ x: 440, y: 340, r: 320 }} />
            <div className="z2">
              <div className="titlebar">
                <div className="vtitle">{title || 'SOUNDING…'}<div className="sub">{subtitle || statusLabel}{scenes.length ? ` · a voyage in ${scenes.length} scenes` : ''}</div></div>
                <span className="status"><span className={done ? 'lampdot' : 'lampdot fx-lamp'} /> {done ? 'the voyage is ready' : statusLabel}</span>
              </div>
              <div className="platewrap">
                <ChartBg w={660} h={404} seed={9} radius={14} />
                {diagram ? (
                  <div className="plate-svg" style={{ position: 'relative', zIndex: 2 }}>
                    <Cutaway diagram={diagram} beat={beat as any} animate />
                  </div>
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, color: 'var(--ink-45)', fontFamily: 'var(--serif)', fontStyle: 'italic' }}>inking the plate…</div>
                )}
              </div>
              <div className="stage-angler"><Anglerfish pose="lamp" rev size={120} className="fx-lamp" /></div>
              {counters && (
                <div className="budget-ov">
                  <div className="gauge on-deep">
                    <div className="gtop"><span>video-seconds used</span> <b>{counters.secondsUsed.toFixed(1)}s&nbsp;/&nbsp;{counters.budgetS.toFixed(1)}s</b></div>
                    <div className="gbar"><i style={{ width: `${budgetPct}%` }} /><span className="tick" style={{ left: '80%' }} /></div>
                    <div className="gtop" style={{ marginTop: 3 }}><span className="brass" style={{ fontSize: 11 }}>one plate → {scenes.length} shots · <b className="brass">{counters.secondsSavedPct}% under</b> a naive cut</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* the expedition rail */}
          <div className="rail" style={{ width: 'auto', flex: 1 }}>
            <div className="seclab"><span className="t">The expedition · the tool loop</span><span className="r" /></div>
            <div>
              {TOOL_ORDER.map((name) => {
                const t = tools[name];
                const st = t?.state === 'ok' ? 'verified' : t?.state === 'running' ? 'sounding' : null;
                return (
                  <div key={name} className="toolline" style={{ opacity: t ? 1 : 0.4 }}>
                    <span className="fn">{name}</span> <span className="ar">→</span>
                    <span className="ok" style={t?.state === 'running' ? { color: 'var(--brass-ink)' } : undefined}>{t?.detail || 'queued'}</span>
                    {st && <span style={{ marginLeft: 'auto' }}><Stamp kind={st} size={16} /></span>}
                  </div>
                );
              })}
            </div>
            <div className="seclab" style={{ marginTop: 4 }}><span className="t">Grounding · retrieved live</span><span className="r" /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {sources.length === 0 && <div className="cap" style={{ fontSize: 13 }}>retrieving sources…</div>}
              {sources.map((s) => (
                <div key={s.id} className="sourcecard fx-fade-up">
                  <div className="stick"><Stamp kind="verified" size={22} /></div>
                  <div className="sbody"><div className="sd">{s.domain}</div><div className="st">{s.title}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* the shot strip */}
        <div className="strip">
          <div className="seclab" style={{ marginBottom: 10 }}><span className="t">The shot list · sounded one at a time</span><span className="r" /><span className="tagcaps">720P · watermark off · silent (narration in the cut)</span></div>
          <div className="scenes">
            {scenes.length === 0 && <div className="cap" style={{ fontSize: 13 }}>charting the scenes…</div>}
            {scenes.map((sc) => (
              <div key={sc.no} className={`scenecard ${sc.status === 'queued' ? 'uns' : ''}`}>
                <div className="sc-art">
                  {diagram && <Cutaway diagram={diagram} beat={sc.editBeat} animate={false} width="100%" style={{ position: 'absolute', inset: 0, height: '100%' }} preserve="xMidYMid slice" />}
                  <div className="sc-cap">{sc.motion?.slice(0, 40)}</div>
                </div>
                <div className="sc-ft"><span className="sc-n">{String(sc.no).padStart(2, '0')} · {sc.editBeat}</span>
                  <span className="sc-seal"><Stamp kind={sc.status === 'verified' ? 'verified' : sc.status === 'sounding' ? 'sounding' : 'withheld'} size={20} /></span></div>
              </div>
            ))}
          </div>
        </div>
        {done && (
          <div style={{ position: 'fixed', inset: 'auto 0 24px 0', display: 'flex', justifyContent: 'center', zIndex: 30 }}>
            <button className="btn brass" onClick={() => router.push(`/voyage/${id}`)}>watch the voyage →</button>
          </div>
        )}
        {failed && (
          <div style={{ position: 'fixed', inset: 'auto 0 24px 0', display: 'flex', justifyContent: 'center', zIndex: 30 }}>
            <button className="btn brass" onClick={() => router.push('/')}>← ask again</button>
          </div>
        )}
      </div>
    </div>
  );
}
