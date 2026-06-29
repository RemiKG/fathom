'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { VoyageNav } from '@/components/VoyageNav';
import { ChartBg, Cutaway } from '@/components/art/Art';
import { useVoyage } from '@/lib/useVoyage';

export default function SendPage() {
  const { id } = useParams<{ id: string }>();
  const { voyage } = useVoyage(id);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const c = voyage?.counters;
  const shareUrl = `${origin}/voyage/${id}`;
  const slug = (voyage?.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20) || id;
  const shareHost = origin ? `${origin.replace(/^https?:\/\//, '')}/voyage/${slug}` : '';
  const seconds = c ? Math.round(c.secondsUsed) : 0;

  function copy() { navigator.clipboard?.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {}); }
  function send() {
    const text = `you HAVE to see how this actually works — it finally made it click for me.`;
    if (navigator.share) navigator.share({ title: `${voyage?.title} — a voyage from Fathom`, text, url: shareUrl }).catch(() => {});
    else copy();
  }
  const mp4 = voyage?.scenes.find((s) => s.videoUrl)?.videoUrl;

  return (
    <div className="app">
      <ChartBg w={1600} h={1000} seed={14} />
      <div className="surface-glow" />
      <div className="z">
        <TopBar active="logbook" readout={<><span>ready to send</span> <b>{voyage?.title || '…'}</b></>} />
        {voyage && <VoyageNav id={voyage.id} />}
        <div className="send-wrap">
          <div className="card-preview">
            <div className="cp-art">
              <ChartBg w={430} h={300} seed={9} />
              {voyage?.diagram && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, padding: 10 }}><Cutaway diagram={voyage.diagram} beat="answer" animate={false} /></div>}
            </div>
            <div className="cp-meta"><div className="k">a voyage from Fathom · {seconds}s</div><div className="t">{voyage?.title || '…'}</div><div className="d">{voyage?.subtitle} — shown, and checked to be true.</div></div>
            <div className="cp-foot"><span className="chip"><span className="lampdot" /> {c?.framesVerified ?? 0}/{c?.framesTotal ?? 0} verified</span><span className="chip">{c?.sourcesCited ?? 0} sources</span><span className="tagcaps" style={{ marginLeft: 'auto' }}>{shareHost}</span></div>
          </div>
          <div className="send-panel">
            <div className="kick">The hero move</div>
            <h1>Send it to the one person<br />who’d lose their mind over it.</h1>
            <div className="msg">“you <span className="g">HAVE</span> to see how this actually works — it finally made it click for me.”</div>
            <div className="who">
              <span className="avatar">R</span>
              <div><div style={{ fontFamily: 'var(--ui)', fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>to Rae — the one who always asks “but why?”</div>
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13.5, color: 'var(--ink-60)' }}>this is so her.</div></div>
            </div>
            <div className="sendrow">
              <button className="btn brass" onClick={send}>↗ Send to Rae</button>
              <button className="btn ghost" onClick={copy}>⧉ {copied ? 'copied!' : 'copy link'}</button>
              {mp4 ? <a className="btn ghost" href={mp4} download>⤓ save .mp4</a> : <button className="btn ghost" disabled title="renders when the video engine is connected">⤓ save .mp4</button>}
            </div>
            <div className="note">Flick and Soap make a video about <i>you</i>. Fathom makes one you send <i>to</i> someone — “this is so you.” The highest-intent share there is.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
