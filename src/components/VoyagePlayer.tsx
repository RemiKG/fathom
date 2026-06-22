'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Cutaway, ChartBg, Stamp } from '@/components/art/Art';
import type { Voyage, Scene } from '@/lib/pipeline/types';
import type { PlayBeat } from '@/lib/art/plate';

const BEAT_CHIP: Record<PlayBeat, string> = {
  descent: 'the descent', plate: 'the diagram, about to move', move: 'the mechanism moves', answer: 'the answer',
};

export function VoyagePlayer({ voyage, startBeat }: { voyage: Voyage; startBeat?: PlayBeat }) {
  const scenes = voyage.scenes;
  const timeline = useMemo(() => {
    let acc = 0;
    const marks = scenes.map((s) => { const start = acc; acc += s.durationS || 3; return { start, end: acc, scene: s }; });
    return { marks, total: acc || 1 };
  }, [scenes]);

  const startT = useMemo(() => {
    if (startBeat) { const m = timeline.marks.find((mm) => mm.scene.editBeat === startBeat); if (m) return m.start + 0.01; }
    return 0;
  }, [startBeat, timeline]);

  const [t, setT] = useState(startT);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const raf = useRef<number | null>(null);
  const lastTick = useRef<number>(0);

  useEffect(() => { setT(startT); }, [startT]);

  useEffect(() => {
    if (!playing) { if (raf.current) cancelAnimationFrame(raf.current); return; }
    lastTick.current = performance.now();
    const loop = (now: number) => {
      const dt = (now - lastTick.current) / 1000; lastTick.current = now;
      setT((prev) => {
        const next = prev + dt;
        if (next >= timeline.total) { setPlaying(false); return timeline.total; }
        return next;
      });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [playing, timeline.total]);

  const curMark = timeline.marks.find((m) => t >= m.start && t < m.end) || timeline.marks[timeline.marks.length - 1];
  const scene: Scene | undefined = curMark?.scene;
  const beat: PlayBeat = scene?.editBeat || 'plate';
  const sceneIndex = curMark ? timeline.marks.indexOf(curMark) : 0;

  // narration (Web Speech) — spoken on scene change while playing + unmuted (a real audio path)
  const spokenFor = useRef<number>(-1);
  useEffect(() => {
    if (!playing || muted || !voyage.options.narration) return;
    if (!scene || spokenFor.current === scene.no) return;
    spokenFor.current = scene.no;
    try {
      const synth = window.speechSynthesis;
      if (synth && scene.narration) { synth.cancel(); const u = new SpeechSynthesisUtterance(scene.narration); u.rate = 0.98; u.pitch = 1.0; synth.speak(u); }
    } catch { /* no audio (e.g. headless) */ }
  }, [scene, playing, muted, voyage.options.narration]);

  const claimForScene = scene ? voyage.claims.find((c) => scene.claimIds.includes(c.id) && c.verdict === 'verified') : undefined;
  const source = claimForScene?.sourceId ? voyage.sources.find((s) => s.id === claimForScene.sourceId) : undefined;

  // the on-frame narration is a single beat line — show the first sentence, capped
  const narrLine = (() => {
    const n = (scene?.narration || '').trim();
    if (!n) return '';
    const first = n.split(/(?<=[.!?])\s/)[0] || n;
    return first.length > 130 ? first.slice(0, 127).trimEnd() + '…' : first;
  })();

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const pct = (t / timeline.total) * 100;

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setT(f * timeline.total);
  }

  const beatSeq = timeline.marks.map((m) => m.scene.editBeat);
  const download = voyage.scenes.find((s) => s.videoUrl)?.videoUrl;

  return (
    <div className="player-wrap">
      <div className="player">
        <div className="screen">
          <ChartBg w={1180} h={580} seed={9} radius={16} />
          {scene?.videoUrl ? (
            <video src={scene.videoUrl} autoPlay={playing} loop muted playsInline
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 2 }} />
          ) : voyage.diagram ? (
            <div className="cut">
              <Cutaway diagram={voyage.diagram} beat={beat} animate={playing || beat === 'move' || beat === 'answer'} width="100%" height="auto" />
            </div>
          ) : null}

          <div className="ov-title">
            <div className="t">{voyage.title}</div>
            <div className="s">scene {String(sceneIndex + 1).padStart(2, '0')} · {beat}{beat === 'move' ? ' · the money beat' : ''}</div>
          </div>
          <span className="beatchip"><span className="lampdot" /> {BEAT_CHIP[beat]}</span>

          {beat === 'plate' && (
            <div className="breath">the still plate holds — then it takes its first breath, and the abstract becomes legible.</div>
          )}
          {(beat === 'move' || beat === 'answer') && narrLine && (
            <div className="narr">“{narrLine.replace(/"/g, '')}”</div>
          )}
          {(beat === 'move' || beat === 'answer') && source && (
            <div className="lowerthird">
              <div className="lt-seal"><Stamp kind="verified" size={30} /></div>
              <div>
                <div className="sd">source · {source.domain}</div>
                <div className="st">{claimForScene?.text}</div>
              </div>
            </div>
          )}
        </div>

        <div className="scrub">
          <button className="btn brass sm" onClick={() => setPlaying((p) => !p)}>{playing ? '❚❚ pause' : '► play'}</button>
          <span className="tc">{fmt(t)}</span>
          <div className="bar" onClick={seek}>
            <i style={{ width: `${pct}%` }} />
            {timeline.marks.map((m, i) => <span key={i} className="m" style={{ left: `${(m.start / timeline.total) * 100}%` }} />)}
            <span className="h" style={{ left: `${pct}%` }} />
          </div>
          <span className="tc">{fmt(timeline.total)}</span>
          <span className="chip on-deep" style={{ marginLeft: 4 }}>
            {beatSeq.map((b, i) => (
              <span key={i}>{i > 0 ? ' · ' : ''}<b style={{ color: b === beat ? 'var(--brass-hi)' : undefined }}>{b}</b></span>
            ))}
          </span>
          <button className="btn ghost sm" onClick={() => setMuted((m) => !m)} title="narration">{muted ? '🔇' : '🔊'}</button>
          {download ? <a className="btn ghost sm" href={download} download>⤓ download</a> : <span className="btn ghost sm" style={{ opacity: .5 }}>⤓ download</span>}
          <a className="btn brass sm" href={`/send/${voyage.id}`}>↗ send</a>
        </div>
      </div>
    </div>
  );
}
