import { NextResponse } from 'next/server';
import { listVoyages } from '@/lib/store';
import { seedExamples } from '@/lib/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  await seedExamples();
  const all = await listVoyages();
  // lightweight list payload (drop heavy per-scene detail)
  const items = all.map((v) => ({
    id: v.id, question: v.question, title: v.title, subtitle: v.subtitle, subjectKey: v.subjectKey,
    example: !!v.example, status: v.status, counters: v.counters, createdAt: v.createdAt, degraded: v.degraded,
  }));
  const yours = items.filter((i) => !i.example);
  const examples = items.filter((i) => i.example);
  const totalSources = all.reduce((a, v) => a + v.counters.sourcesCited, 0);
  const totalFrames = all.reduce((a, v) => a + v.counters.framesVerified, 0);
  return NextResponse.json({ yours, examples, stats: { kept: items.length, sourcesCited: totalSources, framesVerified: totalFrames } });
}
