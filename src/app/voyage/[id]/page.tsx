'use client';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import { VoyageNav } from '@/components/VoyageNav';
import { VoyagePlayer } from '@/components/VoyagePlayer';
import { DeepBg } from '@/components/art/Art';
import { useVoyage } from '@/lib/useVoyage';
import type { PlayBeat } from '@/lib/art/plate';

export default function VoyagePage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const beat = (search.get('beat') || undefined) as PlayBeat | undefined;
  const { voyage, loading, error } = useVoyage(params.id);

  const readout = voyage ? (
    <><span>voyage</span> <b>{voyage.title || '…'}</b> <span className="sep" /> <span className="brass">{voyage.counters.framesVerified}/{voyage.counters.framesTotal} verified · {voyage.counters.sourcesCited} sources cited</span></>
  ) : <span>loading voyage…</span>;

  return (
    <div className="app deep">
      <div className="bg"><DeepBg w={1600} h={1000} glow={{ x: 800, y: 420, r: 460 }} motes={44} /></div>
      <div className="z">
        <TopBar deep active="logbook" readout={readout} />
        {voyage && <VoyageNav id={voyage.id} deep />}
        {loading && !voyage && <Center>sounding the depths…</Center>}
        {error && <Center>Voyage not found. <Link href="/" className="brass" style={{ marginLeft: 8 }}>ask a new one →</Link></Center>}
        {voyage && voyage.status === 'error' && <Center>The voyage failed: {voyage.error} <Link href="/" style={{ marginLeft: 8 }} className="brass">try again →</Link></Center>}
        {voyage && voyage.status !== 'done' && voyage.status !== 'error' && voyage.scenes.length === 0 && (
          <Center>still sounding — <Link href={`/sounding/${voyage.id}`} className="brass" style={{ marginLeft: 6 }}>watch it work →</Link></Center>
        )}
        {voyage && (voyage.status === 'done' || voyage.scenes.length > 0) && (
          <VoyagePlayer voyage={voyage} startBeat={beat} />
        )}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--onchart)', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 20 }}>{children}</div>;
}
