'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { ChartBg, LogbookPlate } from '@/components/art/Art';

interface Item { id: string; title: string; subtitle: string; subjectKey?: string; example: boolean; degraded: boolean; counters: { framesVerified: number; framesTotal: number; secondsUsed: number } }

export default function LogbookPage() {
  const router = useRouter();
  const [data, setData] = useState<{ yours: Item[]; examples: Item[]; stats: { kept: number; sourcesCited: number; framesVerified: number } } | null>(null);
  useEffect(() => { fetch('/api/logbook').then((r) => r.json()).then(setData).catch(() => {}); }, []);

  const meta = (i: Item) => `${i.subtitle} · ${Math.round(i.counters.secondsUsed)}s · ${i.counters.framesVerified}/${i.counters.framesTotal} verified`;

  const Row = ({ items }: { items: Item[] }) => (
    <div className="shelfrow">
      {items.map((i) => (
        <div key={i.id} className="lb-plate" onClick={() => router.push(`/voyage/${i.id}`)}>
          {i.example && <Link href="/" className="marker chip brass" style={{ fontSize: 11 }} onClick={(e) => e.stopPropagation()}>example · ask your own →</Link>}
          <div className="lp"><LogbookPlate spec={{ w: 360, h: 236, subject: i.subjectKey || 'headphone', title: i.title, meta: meta(i), verified: i.counters.framesTotal > 0 && i.counters.framesVerified >= i.counters.framesTotal }} /></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="app">
      <ChartBg w={1600} h={1000} seed={12} />
      <div className="z">
        <TopBar active="logbook" readout={data ? <><span>sounded</span> <b>{data.stats.kept} voyage{data.stats.kept === 1 ? '' : 's'}</b> <span className="sep" /> <span className="brass">{data.stats.sourcesCited} sources cited · {data.stats.framesVerified} frames verified</span></> : <span>loading…</span>} />
        <div className="lb-wrap">
          <div className="lb-head">
            <div><h1>The Logbook</h1><div className="lb-sub">Every voyage sounded on this deployment, pressed onto a plate. Re-watch, send, or go deeper.</div></div>
            <Link href="/" className="btn primary sm">＋ ask a new one</Link>
          </div>
          <div className="shelf">
            {data && data.yours.length > 0 && <><div className="rowlab-mono">Sounded on this ship — one shared shelf, every visitor’s voyages</div><Row items={data.yours} /></>}
            <div className="rowlab-mono">Example voyages — one tap runs the identical real pipeline on your own question</div>
            {data ? <Row items={data.examples} /> : <div className="cap">loading the shelf…</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
