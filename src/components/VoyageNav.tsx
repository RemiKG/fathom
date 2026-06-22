'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/* A compact voyage-scoped sub-nav (Voyage · Grounding · Chart Room · Send). */
export function VoyageNav({ id, deep = false }: { id: string; deep?: boolean }) {
  const p = usePathname();
  const items = [
    { href: `/voyage/${id}`, label: 'The Voyage' },
    { href: `/grounding/${id}`, label: 'The Grounding' },
    { href: `/chart-room/${id}`, label: 'The Chart Room' },
    { href: `/send/${id}`, label: 'Send' },
  ];
  return (
    <div className={`segment ${deep ? 'on-deep' : ''}`} style={{ margin: '10px 24px 0' }}>
      {items.map((it) => (
        <Link key={it.href} href={it.href} className={`seg ${p === it.href ? 'on' : ''}`}>{it.label}</Link>
      ))}
    </div>
  );
}
