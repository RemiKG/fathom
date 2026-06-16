import { NextResponse } from 'next/server';
import { createVoyage } from '@/lib/pipeline/service';
import type { VoyageOptions } from '@/lib/pipeline/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const question = String(body?.question || '').trim();
  if (!question || question.length < 3) {
    return NextResponse.json({ error: 'Ask a real question — e.g. "how does noise-cancelling work?"' }, { status: 400 });
  }
  const options = (body?.options || {}) as Partial<VoyageOptions>;
  const v = await createVoyage(question, options);
  // The Sounding stream drives the run (works on persistent-node and serverless).
  return NextResponse.json({ id: v.id, status: v.status });
}
