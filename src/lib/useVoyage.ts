'use client';
import { useEffect, useState } from 'react';
import type { Voyage } from '@/lib/pipeline/types';

export function useVoyage(id: string | undefined): { voyage: Voyage | null; loading: boolean; error: string | null } {
  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    // the sounding screen keeps the finished record client-side — on serverless hosts a later
    // request can land on an instance that never saw the run, so fall back to that copy
    const stashed = (): Voyage | null => {
      try { const raw = sessionStorage.getItem(`fathom-voyage-${id}`); return raw ? (JSON.parse(raw) as Voyage) : null; } catch { return null; }
    };
    const tick = async () => {
      try {
        const res = await fetch(`/api/voyage/${id}`, { cache: 'no-store' });
        if (!res.ok) {
          if (!alive) return;
          const s = stashed();
          if (s) { setVoyage(s); setLoading(false); } else { setError('not found'); setLoading(false); }
          return;
        }
        const v: Voyage = await res.json();
        if (!alive) return;
        setVoyage(v); setLoading(false);
        if (v.status !== 'done' && v.status !== 'error') timer = setTimeout(tick, 1500);
      } catch {
        if (alive) timer = setTimeout(tick, 2000);
      }
    };
    tick();
    return () => { alive = false; clearTimeout(timer); };
  }, [id]);

  return { voyage, loading, error };
}
