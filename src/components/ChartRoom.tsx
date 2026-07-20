'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { VoyageNav } from '@/components/VoyageNav';
import { ChartBg, Stamp } from '@/components/art/Art';
import type { Voyage, Lens } from '@/lib/pipeline/types';

const TOOLS: Array<[string, string]> = [
  ['plot_voyage', 'the revelation + arc'], ['chart_scene', 'typed shot list'], ['engrave_plate', 'seed-locked cutaway'],
  ['sound_scene', 'reference-to-video'], ['assay_frame', 'truth + style audit'], ['cut_short', 'cited edit + export'],
];
const LENSES: Array<[Lens, string]> = [['story', 'As a story'], ['doc', 'Straight (doc)'], ['kid', 'For a ten-year-old'], ['technical', 'Technical']];

export function ChartRoom({ voyage }: { voyage: Voyage | null }) {
  const router = useRouter();
  const o = voyage?.options;
  const c = voyage?.counters;
  const [lens, setLens] = useState<Lens>(o?.lens || 'story');
  const [scenes, setScenes] = useState(o?.scenes ?? 4);
  const [budget, setBudget] = useState(o?.budgetS ?? 50);
  const [grounding, setGrounding] = useState(o?.groundingDepth ?? 3);
  const [strict, setStrict] = useState(o?.strictness ?? 0.78);
  const [withhold, setWithhold] = useState(o?.withhold ?? true);
  const [verify, setVerify] = useState(o?.verify ?? true);
  const [narration, setNarration] = useState(o?.narration ?? true);
  const [aspect, setAspect] = useState(o?.aspect ?? '16:9');
  const [selScene, setSelScene] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const totalSeconds = Math.round(scenes * 14.5);

  async function reSound(no: number) {
    if (!voyage || busy) return; setBusy(true); setSelScene(no);
    try { await fetch(`/api/voyage/${voyage.id}/resound`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sceneNo: no }) }); }
    finally { setBusy(false); }
  }
  async function reRunWithSettings() {
    if (!voyage || busy) return; setBusy(true);
    try {
      const res = await fetch('/api/voyage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: voyage.question, options: { lens, scenes, budgetS: budget, groundingDepth: grounding, strictness: strict, withhold, verify, narration, aspect } }) });
      const d = await res.json(); if (d.id) router.push(`/sounding/${d.id}`);
    } finally { setBusy(false); }
  }

  return (
    <div className="app">
      <ChartBg w={1600} h={1000} seed={8} />
      <div className="z">
        <TopBar active="chart" readout={voyage ? <><span>directing</span> <b>{voyage.title}</b></> : <><span className="brass">the control room</span></>} />
        {voyage && <VoyageNav id={voyage.id} />}
        <div className="body-split">
          <div className="cr-main">
            <div><h1>The Chart Room</h1><div className="cr-sub">Direct the expedition — nothing hidden behind magic. Watch it plot, ground, film, verify, cut.</div></div>

            <div className="ctlcard">
              <div className="rowlab">The lens — how it explains <span className="v">{LENSES.find((l) => l[0] === lens)?.[1].toLowerCase()}</span></div>
              <div className="segment">{LENSES.map(([k, label]) => <span key={k} className={`seg ${lens === k ? 'on' : ''}`} onClick={() => setLens(k)}>{label}</span>)}</div>
            </div>

            <div className="ctlcard">
              <Slider label="Depth · length" value={(scenes - 3) / 3} onChange={(f) => setScenes(3 + Math.round(f * 3))} val={`${scenes} scenes · ${totalSeconds}s`} />
              <Slider label="Video-second budget" value={Math.min(1, budget / 100)} onChange={(f) => setBudget(Math.round(f * 100))} val={`cap ${budget}s · used ${c?.secondsUsed?.toFixed(1) ?? '0.0'}s`} />
              <Slider label="Grounding depth" value={(grounding - 1) / 3} onChange={(f) => setGrounding(1 + Math.round(f * 3))} val={`${grounding} sources / claim`} />
              <Slider label="Assayer strictness" value={strict} onChange={setStrict} val={strict > 0.66 ? 'strict' : strict > 0.33 ? 'balanced' : 'lenient'} />
            </div>

            <div className="ctlcard">
              <div className="togs">
                <Toggle on={withhold} onClick={() => setWithhold((x) => !x)} label="withhold when unsure" />
                <Toggle on={verify} onClick={() => setVerify((x) => !x)} label="verify on" />
                <Toggle on={narration} onClick={() => setNarration((x) => !x)} label="narration on" />
                <span className="toggle"><span className="toglab">aspect</span>
                  <span className="segment" style={{ padding: 3 }}>
                    <span className={`seg ${aspect === '9:16' ? 'on' : ''}`} style={{ padding: '6px 11px' }} onClick={() => setAspect('9:16')}>9:16</span>
                    <span className={`seg ${aspect === '16:9' ? 'on' : ''}`} style={{ padding: '6px 11px' }} onClick={() => setAspect('16:9')}>16:9</span>
                  </span>
                </span>
              </div>
            </div>

            <div className="ctlcard">
              <div className="rowlab">Re-sound a scene <span className="v">targeted re-render · cheap</span></div>
              <div className="scenechips">
                {(voyage?.scenes || [1, 2, 3, 4].map((n) => ({ no: n, editBeat: ['descent', 'plate', 'move', 'answer'][n - 1] }))).map((s: any) => (
                  <span key={s.no} className={`schip ${selScene === s.no ? 'sel' : ''}`} onClick={() => reSound(s.no)}>{String(s.no).padStart(2, '0')} · {s.editBeat}{selScene === s.no ? ' ↺' : ''}</span>
                ))}
              </div>
              {voyage && <button className="btn ghost sm" style={{ marginTop: 12 }} onClick={reRunWithSettings} disabled={busy}>{busy ? 'sounding…' : 'Re-sound with these settings →'}</button>}
            </div>
          </div>

          <div className="rail" style={{ width: 'auto', flex: 1 }}>
            <div className="seclab"><span className="t">The tool surface · custom Skill + MCP</span><span className="r" /></div>
            <div className="ctlcard" style={{ padding: '12px 15px' }}>
              {TOOLS.map(([fn, d]) => (
                <div key={fn} className="mcp"><span className="fn">{fn}</span><span className="d">— {d}</span><span style={{ marginLeft: 'auto' }}><Stamp kind="verified" size={15} /></span></div>
              ))}
            </div>
            <div className="cr-sub" style={{ fontSize: 12.5 }}>Any agent can mount Fathom’s studio over SSE / Streamable-HTTP at <b>/api/mcp</b> — a drop-in “explain-anything-as-a-checked-short” primitive.</div>
            <div className="seclab" style={{ marginTop: 4 }}><span className="t">The ledger</span><span className="r" /></div>
            <div className="statgrid">
              <St n={`${c?.framesVerified ?? 0}/${c?.framesTotal ?? 0}`} k="frames verified" brass />
              <St n={`${c?.claimsWithheld ?? 0}`} k="claim withheld" uns />
              <St n={`${c?.secondsSavedPct ?? 0}%`} k="seconds saved vs naive" brass />
              <St n={c?.reRenderRate ?? '0/0'} k="re-render rate" />
              <St n={`${c?.styleConsistency ?? 0}`} k="style-consistency" />
              <St n={c ? fmtDur(c.endToEndMs) : '—'} k="end-to-end" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtDur(ms: number): string {
  const t = Math.round(ms / 1000); // round the total first so 59.96s never reads "60s"
  return `${Math.floor(t / 60)}m ${t % 60}s`;
}

function Slider({ label, value, onChange, val }: { label: string; value: number; onChange: (f: number) => void; val: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="ctl">
      <span className="clab">{label}</span>
      <div className="slider">
        <div className="fill" style={{ width: `${pct}%` }} /><i style={{ left: `${pct}%` }} />
        <input type="range" min={0} max={100} value={pct} onChange={(e) => onChange(Number(e.target.value) / 100)} />
      </div>
      <span className="cval">{val}</span>
    </div>
  );
}
function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return <span className="toggle" onClick={onClick}><span className={`switch ${on ? '' : 'off'}`}><span className="knob" /></span><span className="toglab">{label}</span></span>;
}
function St({ n, k, brass, uns }: { n: string; k: string; brass?: boolean; uns?: boolean }) {
  return <div className="stat"><div className={`n ${brass ? 'brass' : ''} ${uns ? 'uns' : ''}`}>{n}</div><div className="k">{k}</div></div>;
}
