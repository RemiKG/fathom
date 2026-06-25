'use client';
import { useEffect, useState } from 'react';
import { ChartRoom } from '@/components/ChartRoom';
import type { Voyage } from '@/lib/pipeline/types';

export default function ChartRoomGeneric() {
  const [voyage, setVoyage] = useState<Voyage | null>(null);
  useEffect(() => {
    fetch('/api/logbook').then((r) => r.json()).then((d) => {
      const pick = d.yours?.[0]?.id || d.examples?.[0]?.id;
      if (pick) fetch(`/api/voyage/${pick}`).then((r) => r.json()).then(setVoyage).catch(() => {});
    }).catch(() => {});
  }, []);
  return <ChartRoom voyage={voyage} />;
}
