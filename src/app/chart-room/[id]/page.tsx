'use client';
import { useParams } from 'next/navigation';
import { ChartRoom } from '@/components/ChartRoom';
import { useVoyage } from '@/lib/useVoyage';

export default function ChartRoomVoyage() {
  const { id } = useParams<{ id: string }>();
  const { voyage } = useVoyage(id);
  return <ChartRoom voyage={voyage} />;
}
