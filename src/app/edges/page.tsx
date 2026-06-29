'use client';
import { TopBar } from '@/components/TopBar';
import { ChartBg, Stamp } from '@/components/art/Art';
import type { StampKind } from '@/lib/art/chart';

const EDGES: Array<{ i: StampKind; t: string; d: React.ReactNode }> = [
  { i: 'sounding', t: 'The voyage takes a beat.', d: <>Video is an async job (~1–2 min). We show the <b>title, sources and the plate instantly</b>, play a still first-breath preview, and stream scenes as they finish. Latency is visible and owned, never hidden.</> },
  { i: 'withheld', t: 'The critic is bounded, not omniscient.', d: <>It grounds the <b>script’s claims</b> and catches <b>gross visual contradictions</b> — not frame-perfect science. When in doubt it <b>withholds and says so</b>. We’d rather under-claim than teach you something beautiful and wrong.</> },
  { i: 'verified', t: 'Grounding needs a retrievable source.', d: <>For well-documented mechanisms it’s strong. For obscure or contested questions it says what it can and <b>flags the rest</b> on screen. Disclosed, every time.</> },
  { i: 'verified', t: 'Labels & citations are edited, not generated.', d: <>Lettering a diagram and stamping a source are done in <b>deterministic post</b> — more reliable and more trustworthy than asking a video model to spell. Disclosed; it’s also the budget win.</> },
  { i: 'sounding', t: 'Short by design.', d: <>Free-tier video seconds are finite (Wan 50s, HappyHorse 10s per model), so voyages are short. Framed as the <b>budget-as-design</b> win — one plate → a multi-shot — not a limitation to hide.</> },
  { i: 'withheld', t: 'Small-N numbers.', d: <>The verify / consistency / efficiency figures are <b>labelled demonstrations</b>, not a benchmark suite. Every counter on screen is real and live — but it’s a demo, and we say so.</> },
];

export default function EdgesPage() {
  return (
    <div className="app">
      <ChartBg w={1600} h={1000} seed={15} />
      <div className="z">
        <TopBar readout={<span className="brass">truth as a feature, not a decoration</span>} />
        <div className="edges-wrap">
          <div className="edges-head">
            <div><div className="seclab"><span className="t">The reality bar</span></div><h1>What Fathom won’t fake.</h1>
              <div className="edges-sub">Anything not listed as real ships faked — so we listed everything, including the edges.</div></div>
          </div>
          <div className="edge-grid">
            {EDGES.map((e, i) => (
              <div key={i} className="edge">
                <div className="ei"><Stamp kind={e.i} size={40} /></div>
                <div className="et">{e.t}</div>
                <div className="ed">{e.d}</div>
              </div>
            ))}
          </div>
          <div className="edges-foot">
            <div className="ei" style={{ width: 40, height: 40 }}><Stamp kind="withheld" size={40} /></div>
            <div className="l">“I don’t know” is a real answer here — and it’s the one nobody else will give you.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
