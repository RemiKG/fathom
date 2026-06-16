import { NextResponse } from 'next/server';
import { describeEnv } from '@/lib/config';
import { storeInfo } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, app: 'fathom', env: describeEnv(), store: storeInfo(), time: new Date().toISOString() });
}
