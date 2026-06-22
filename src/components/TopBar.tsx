'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Wordmark } from '@/components/art/Wordmark';

export function TopBar({ deep = false, readout, active }: { deep?: boolean; readout?: React.ReactNode; active?: 'ask' | 'chart' | 'logbook' }) {
  const pathname = usePathname();
  const router = useRouter();
  const cur = active || (pathname === '/' || pathname.startsWith('/sounding') || pathname.startsWith('/voyage') ? 'ask'
    : pathname.startsWith('/chart-room') ? 'chart'
    : pathname.startsWith('/logbook') || pathname.startsWith('/send') ? 'logbook' : 'ask');
  return (
    <div className={`topbar ${deep ? 'on-deep' : ''}`}>
      <Wordmark drop="none" rev={deep} onClick={() => router.push('/')} />
      <span className="sp" />
      <Link href="/" className={`tab ${cur === 'ask' ? 'on' : ''}`}>Ask</Link>
      <Link href="/chart-room" className={`tab ${cur === 'chart' ? 'on' : ''}`}>Chart Room</Link>
      <Link href="/logbook" className={`tab ${cur === 'logbook' ? 'on' : ''}`}>Logbook</Link>
      {readout ? <span className="soundingline hide-narrow" style={{ marginLeft: 6 }}>{readout}</span> : null}
    </div>
  );
}
