import { NextResponse } from 'next/server';
import { getVoyage } from '@/lib/store';
import { seedExamples } from '@/lib/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await seedExamples();
  const v = await getVoyage(id);
  if (!v) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(v);
}
