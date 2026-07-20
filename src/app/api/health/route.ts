import { NextResponse } from 'next/server';
import { describeEnv } from '@/lib/config';
import { storeInfo } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  // When this deploy is a hosted preview (ephemeral serverless disk), point visitors at the
  // long-running primary host where voyages persist. Unset on the primary itself → no banner.
  const primaryUrl = process.env.FATHOM_PRIMARY_URL?.trim() || null;
  return NextResponse.json({ ok: true, app: 'fathom', env: describeEnv(), store: storeInfo(), primaryUrl, time: new Date().toISOString() });
}
