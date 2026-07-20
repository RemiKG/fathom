import { NextResponse } from 'next/server';
import { listVoyages } from '@/lib/store';
import { seedExamples } from '@/lib/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await seedExamples();
  // errored voyages have no artifact to open — they don't belong on the shelf
  const all = (await listVoyages()).filter((v) => v.status !== 'error');
  // lightweight list payload (drop heavy per-scene detail)
  const items = all.map((v) => ({
    id: v.id, question: v.question, title: v.title, subtitle: v.subtitle, subjectKey: v.subjectKey,
    example: !!v.example, status: v.status, counters: v.counters, createdAt: v.createdAt, degraded: v.degraded,
  }));
  const yours = items.filter((i) => !i.example);
  const examples = items.filter((i) => i.example);
  const totalSources = all.reduce((a, v) => a + v.counters.sourcesCited, 0);
  const totalFrames = all.reduce((a, v) => a + v.counters.framesVerified, 0);
  // "kept" counts real soundings only — the pre-seeded examples are labelled, not claimed
  return NextResponse.json({ yours, examples, stats: { kept: yours.length, sourcesCited: totalSources, framesVerified: totalFrames } });
}
