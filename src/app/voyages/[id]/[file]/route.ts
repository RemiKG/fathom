/* Serve voyage media from disk at request time. `next start` snapshots the public/ folder at boot,
   so scene clips engraved AFTER startup would 404 forever if left to the static server — this route
   answers /voyages/<id>/<file> straight from the filesystem, with Range support so the player can
   seek. Files that existed at boot are still served statically; everything newer lands here. */

import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

const SAFE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export async function GET(req: Request, { params }: { params: Promise<{ id: string; file: string }> }) {
  const { id, file } = await params;
  if (!SAFE.test(id) || !SAFE.test(file) || id.includes('..') || file.includes('..')) {
    return new Response('not found', { status: 404 });
  }
  const root = path.join(process.cwd(), 'public', 'voyages');
  const fp = path.join(root, id, file);
  if (!fp.startsWith(root + path.sep)) return new Response('not found', { status: 404 });

  let stat;
  try { stat = await fs.stat(fp); } catch { return new Response('not found', { status: 404 }); }
  if (!stat.isFile()) return new Response('not found', { status: 404 });

  const size = stat.size;
  const headers: Record<string, string> = {
    'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=300',
  };

  const m = (req.headers.get('range') || '').match(/bytes=(\d*)-(\d*)/);
  if (m && (m[1] || m[2])) {
    const start = m[1] ? parseInt(m[1], 10) : Math.max(0, size - parseInt(m[2], 10));
    const end = m[1] && m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
    if (!Number.isFinite(start) || start >= size || start > end) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    const len = end - start + 1;
    const fh = await fs.open(fp, 'r');
    try {
      const buf = Buffer.alloc(len);
      await fh.read(buf, 0, len, start);
      headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
      headers['Content-Length'] = String(len);
      return new Response(new Uint8Array(buf), { status: 206, headers });
    } finally {
      await fh.close();
    }
  }

  const bytes = await fs.readFile(fp);
  headers['Content-Length'] = String(size);
  return new Response(new Uint8Array(bytes), { status: 200, headers });
}
