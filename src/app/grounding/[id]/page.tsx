'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import { VoyageNav } from '@/components/VoyageNav';
import { ChartBg, Anglerfish, Stamp } from '@/components/art/Art';
import { useVoyage } from '@/lib/useVoyage';

export default function GroundingPage() {
  const { id } = useParams<{ id: string }>();
  const { voyage } = useVoyage(id);
  const c = voyage?.counters;
  const srcById = new Map((voyage?.sources || []).map((s) => [s.id, s]));

  return (
    <div className="app">
      <ChartBg w={1600} h={1000} seed={6} />
      <div className="z">
        <TopBar active="logbook" readout={<><span>voyage</span> <b>{voyage?.title || '…'}</b> <span className="sep" /> <span className="brass">the Assayer · {voyage?.provider === 'qwen' ? 'qwen3-vl' : 'vision critic'}</span></>} />
        {voyage && <VoyageNav id={voyage.id} />}
        <div className="body-split">
          <div className="gr-main">
            <div className="seclab"><span className="t">The grounding</span><span className="r" /></div>
            <h1>Every claim, its source, the verdict.</h1>
            <div className="ethos">“It would rather say ‘I don’t know’ than draw you a lie.”</div>
            <div className="vlist">
              {(voyage?.claims || []).map((cl, i) => {
                const src = cl.sourceId ? srcById.get(cl.sourceId) : null;
                const withheld = cl.verdict === 'withheld';
                return (
                  <div key={cl.id} className={`verdict ${withheld ? 'withheld' : ''}`}>
                    <div style={{ flex: 1 }}>
                      <div className="vc-lead">claim {String(i + 1).padStart(2, '0')}</div>
                      <div className="vclaim">{cl.text}</div>
                      {cl.note && <div className="withheld-note">↳ {cl.note}</div>}
                    </div>
                    <div className="vsrc">
                      <span className={withheld ? 'unsdot' : 'lampdot'} />
                      {src ? <a href={src.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{src.domain}</a> : 'no citable source'}
                    </div>
                    <div className="vseal"><Stamp kind={withheld ? 'withheld' : 'verified'} size={30} /></div>
                  </div>
                );
              })}
              {!voyage && <div className="cap">loading the grounding…</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 34, opacity: .95 }}>
              <Anglerfish pose="hold" size={96} />
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>The LLM proposes.</div>
                <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--brass-ink)' }}>The Assayer disposes.</div>
              </div>
            </div>
          </div>
          <div className="rail" style={{ width: 'auto', flex: 1 }}>
            <div className="seclab"><span className="t">The Assayer’s ledger</span><span className="r" /></div>
            <div className="statgrid">
              <Stat n={`${c?.framesVerified ?? 0}/${c?.framesTotal ?? 0}`} k="frames verified (truth + style)" brass />
              <Stat n={`${c?.claimsGrounded ?? 0}/${c?.claimsTotal ?? 0}`} k="claims grounded to a source" />
              <Stat n={`${c?.sourcesCited ?? 0}`} k="sources cited on-screen" />
              <Stat n={`${c?.claimsWithheld ?? 0}`} k="claim withheld, said so" uns />
              <Stat n={`${c?.styleConsistency ?? 0}`} k="style-consistency vs plate" />
              <Stat n={`${c?.reRenders ?? 0}`} k="scene re-sounded (auto-fix)" brass />
            </div>
            <div className="relief">
              <div className="hd" style={{ marginBottom: 6 }}>How it checks</div>
              <div className="prose" style={{ fontSize: 14.5, lineHeight: 1.5 }}>The Assayer reads each rendered frame and asks two questions: <b>is it the same inked world?</b> (style) and <b>does it match the grounded claim?</b> (truth — is the light bending <i>toward</i> the mass, the anti-wave truly inverted). On a contradiction it re-sounds <i>only that shot</i>. On an unverifiable claim, it withholds.</div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
              <Link href={voyage ? `/chart-room/${voyage.id}` : '/chart-room'} className="btn ghost sm">↺ re-sound a scene</Link>
              <span className="toggle" style={{ marginLeft: 'auto' }}><span className={`switch ${voyage?.options.verify === false ? 'off' : ''}`}><span className="knob" /></span><span className="toglab">verify {voyage?.options.verify === false ? 'off' : 'on'}</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ n, k, brass, uns }: { n: string; k: string; brass?: boolean; uns?: boolean }) {
  return <div className="stat"><div className={`n ${brass ? 'brass' : ''} ${uns ? 'uns' : ''}`}>{n}</div><div className="k">{k}</div></div>;
}
