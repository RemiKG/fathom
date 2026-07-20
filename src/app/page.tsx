'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import { Wordmark } from '@/components/art/Wordmark';
import { Anglerfish, ChartBg, SubjectIcon } from '@/components/art/Art';

const EXAMPLES = [
  'why is the sky blue but sunsets red?',
  'how does a black hole bend light?',
  'why does bread rise?',
  'what happens the second I fall asleep?',
  'why do onions make me cry?',
];

interface Health { env: { videoEngine: string | null; budgetS: number; provider: string; degraded: boolean }; primaryUrl?: string | null; }
interface LogItem { id: string; title: string; subtitle: string; subjectKey?: string; counters: { framesVerified: number; framesTotal: number; secondsUsed: number }; example: boolean }

export default function Surface() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [log, setLog] = useState<{ yours: LogItem[]; stats: { kept: number } } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/health').then((r) => r.json()).then(setHealth).catch(() => {});
    fetch('/api/logbook').then((r) => r.json()).then((d) => setLog({ yours: d.yours || [], stats: d.stats })).catch(() => {});
  }, []);

  async function sound() {
    const question = q.trim();
    if (question.length < 3 || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/voyage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) });
      const data = await res.json();
      if (data.id) router.push(`/sounding/${data.id}?q=${encodeURIComponent(question)}`);
      else { setBusy(false); alert(data.error || 'Something went wrong.'); }
    } catch { setBusy(false); }
  }

  const engine = health?.env.videoEngine || 'still-preview';
  const budget = health?.env.budgetS ?? 50;
  const last = log?.yours?.[0];

  return (
    <div className="app">
      <ChartBg w={1600} h={1000} seed={3} />
      <div className="surface-glow" />
      <div className="z">
        <TopBar
          active="ask"
          readout={<><span>free budget</span> <b>{budget.toFixed(1)}s</b> <span className="sep" /> <span className="brass">{engine === 'still-preview' ? 'still-preview' : engine}</span></>}
        />
        {health?.primaryUrl && (
          <a className="preview-banner" href={health.primaryUrl}>
            You&apos;re on a hosted preview. Voyages run and persist on the{' '}
            <b>primary deployment</b> — open it to sound one end to end&nbsp;➜
          </a>
        )}
        <div className="surface-wrap">
          <Wordmark className="hero-wm" drop="short" />
          <div className="htag">see how anything works.</div>
          <div className="hook">Ask the thing you were always too embarrassed to ask. <span className="g">It&apos;ll show you.</span></div>
          <div className="composer surface-prompt">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sound(); }}
              placeholder="How does noise-cancelling actually work?"
              aria-label="Ask how anything works"
            />
            <button className="send" onClick={sound} disabled={busy || q.trim().length < 3}>
              {busy ? <>Sounding <span className="spin">◐</span></> : <>Sound it <span style={{ fontSize: 17 }}>➜</span></>}
            </button>
          </div>
          <div className="sparks">
            {EXAMPLES.map((e) => (
              <button key={e} className="spark-chip" onClick={() => { setQ(e); inputRef.current?.focus(); }}>{e}</button>
            ))}
          </div>
          {log && log.yours.length > 0 && last && (
            <Link href="/logbook" className="resume card" style={{ textDecoration: 'none' }}>
              <div className="mini"><SubjectIcon kind={last.subjectKey || 'headphone'} size={70} /></div>
              <div className="rt">
                <div className="n">The logbook · <b>{log.yours.length} voyage{log.yours.length === 1 ? '' : 's'} sounded</b></div>
                <div className="s">{`last: ${last.title} — ${last.subtitle} · ${Math.round(last.counters.secondsUsed)}s · ${last.counters.framesVerified}/${last.counters.framesTotal} verified`}</div>
              </div>
              <span className="btn ghost sm">Open logbook →</span>
            </Link>
          )}
        </div>
        <div className="surface-angler">
          <Anglerfish pose="lamp" size={118} className="fx-lamp" />
          <div className="cap">the lantern-bearer</div>
        </div>
        <div className="surface-footer">
          <span className="chip"><span className="lampdot" /> running on {health?.env.provider === 'qwen' ? 'Qwen Cloud' : 'Alibaba Cloud'}</span>
          <span className="chip"><span className="tagcaps">Qwen Cloud · Wan / HappyHorse</span></span>
          <span className="chip"><span className="tagcaps">MIT · open source</span></span>
          <Link href="/edges" className="chip"><span className="tagcaps">what we won&apos;t fake →</span></Link>
        </div>
      </div>
    </div>
  );
}
