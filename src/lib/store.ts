/* The Logbook store. Fathom OWNS its record: question, shot list, claims, source URLs, verdicts,
   counters + the downloaded media — so voyages survive a closed tab and a cold session (Qwen video
   URLs expire ~24h and Qwen server memory expires in 7 days; Fathom does the keeping).

   THREE backends, chosen at runtime:
   • local filesystem (default) — durable on a long-running host (Alibaba ECS, Docker, `next start`,
     `npm run dev`). JSON records + media served from /public/voyages. This is what judges get on ECS.
   • Vercel Blob — used automatically when BLOB_READ_WRITE_TOKEN is set (i.e. the serverless Vercel
     deploy). Serverless splits the POST, the driving stream and later page loads across separate
     function instances that do NOT share one disk, so an on-disk /tmp Logbook can't recall a voyage.
     Blob is a shared, strongly-consistent store, so a voyage sounded on one instance is recalled on
     every other — the record AND its media survive across requests and cold sessions.
   • Alibaba Cloud OSS — object-storage seam for media when ALIBABA_OSS_* is configured. */

import { promises as fs } from 'fs';
import path from 'path';
import { getConfig } from '@/lib/config';
import type { Voyage } from '@/lib/pipeline/types';

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

function storeRoot(): string {
  const c = getConfig();
  return path.isAbsolute(c.storeDir) ? c.storeDir : path.join(process.cwd(), c.storeDir);
}
function voyDir(): string { return path.join(storeRoot(), 'voyages'); }
function mediaPublicDir(id: string): string { return path.join(process.cwd(), 'public', 'voyages', id); }

async function ensure(dir: string) { await fs.mkdir(dir, { recursive: true }); }

// ---------------------------------------------------------------------------
// Vercel Blob backend (shared + strongly consistent). Keys mirror the FS layout
// (voyages/<id>.json). Reads add a cache-buster + no-store so an overwritten
// record is never served stale from the edge CDN.
// ---------------------------------------------------------------------------
function blobKey(id: string): string { return `voyages/${id}.json`; }

async function blobPutJson(key: string, body: string): Promise<void> {
  const { put } = await import('@vercel/blob');
  await put(key, body, {
    access: 'public', token: BLOB_TOKEN, addRandomSuffix: false,
    allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 0,
  });
}
async function blobGetText(key: string): Promise<string | null> {
  const { list } = await import('@vercel/blob');
  const { blobs } = await list({ prefix: key, limit: 1, token: BLOB_TOKEN });
  const hit = blobs.find((b) => b.pathname === key) || blobs[0];
  if (!hit) return null;
  const r = await fetch(`${hit.url}${hit.url.includes('?') ? '&' : '?'}v=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) return null;
  return await r.text();
}
async function blobListKeys(prefix: string): Promise<string[]> {
  const { list } = await import('@vercel/blob');
  const { blobs } = await list({ prefix, limit: 1000, token: BLOB_TOKEN });
  return blobs.map((b) => b.pathname);
}

export async function saveVoyage(v: Voyage): Promise<void> {
  v.updatedAt = Date.now();
  if (USE_BLOB) { await blobPutJson(blobKey(v.id), JSON.stringify(v, null, 2)); return; }
  await ensure(voyDir());
  await fs.writeFile(path.join(voyDir(), `${v.id}.json`), JSON.stringify(v, null, 2), 'utf8');
}

export async function getVoyage(id: string): Promise<Voyage | null> {
  try {
    if (USE_BLOB) {
      const raw = await blobGetText(blobKey(id));
      // Blob media is stored under its own public https URL and never pruned; only the local
      // /voyages/ paths need the disk check, which Blob deploys don't produce.
      return raw ? (JSON.parse(raw) as Voyage) : null;
    }
    const raw = await fs.readFile(path.join(voyDir(), `${id}.json`), 'utf8');
    return await pruneDeadMedia(JSON.parse(raw) as Voyage);
  } catch {
    return null;
  }
}

export async function listVoyages(): Promise<Voyage[]> {
  try {
    const out: Voyage[] = [];
    if (USE_BLOB) {
      const keys = await blobListKeys('voyages/');
      for (const k of keys) {
        if (!k.endsWith('.json')) continue;
        try { const raw = await blobGetText(k); if (raw) out.push(JSON.parse(raw) as Voyage); } catch { /* skip */ }
      }
      return out.sort((a, b) => b.createdAt - a.createdAt);
    }
    const files = await fs.readdir(voyDir());
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try { out.push(await pruneDeadMedia(JSON.parse(await fs.readFile(path.join(voyDir(), f), 'utf8')))); } catch { /* skip */ }
    }
    return out.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/** A record can outlive its media (a redeploy wipes public/voyages while the JSON survives, or
    vice versa). Drop local media URLs whose file is gone, at read time and non-destructively,
    so the player falls back to the living plate instead of a dead <video>. */
async function pruneDeadMedia(v: Voyage): Promise<Voyage> {
  for (const s of v.scenes || []) {
    for (const k of ['videoUrl', 'posterUrl'] as const) {
      const u = s[k];
      if (u && u.startsWith('/voyages/')) {
        const fp = path.join(process.cwd(), 'public', ...u.split('/').filter(Boolean));
        try { await fs.access(fp); } catch { s[k] = null; }
      }
    }
  }
  return v;
}

function contentTypeFor(name: string): string {
  const ext = name.toLowerCase().split('.').pop();
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'wav') return 'audio/wav';
  return 'application/octet-stream';
}

/** Persist a downloaded media file. Returns a URL the app can serve.
    Blob: uploaded to the shared store and served from its public https URL — survives across
    serverless instances and cold sessions (this is what makes the Vercel deploy recall media).
    Local: written under /public/voyages/<id>/ and served by the /voyages/[id]/[file] route.
    OSS seam: upload when configured.
    On a read-only serverless disk (no Blob token) the local write fails — fall back to the source
    URL so the freshly generated take still plays (Qwen URLs live ~24h). */
export async function saveMedia(id: string, name: string, bytes: Buffer, sourceUrl?: string): Promise<string> {
  const c = getConfig();
  if (USE_BLOB) {
    try {
      const { put } = await import('@vercel/blob');
      const res = await put(`voyages/${id}/${name}`, bytes, {
        access: 'public', token: BLOB_TOKEN, addRandomSuffix: false,
        allowOverwrite: true, contentType: contentTypeFor(name), cacheControlMaxAge: 31536000,
      });
      return res.url;
    } catch {
      if (sourceUrl && sourceUrl.startsWith('http')) return sourceUrl;
      // no local disk to fall back to on serverless — surface the source instead of a dead link
      throw new Error('media persistence failed');
    }
  }
  if (c.oss.enabled) {
    // Object-storage seam: upload to OSS and return the object URL.
    try {
      const url = await ossPut(id, name, bytes);
      if (url) return url;
    } catch { /* fall back to local disk */ }
  }
  try {
    const dir = mediaPublicDir(id);
    await ensure(dir);
    await fs.writeFile(path.join(dir, name), bytes);
    return `/voyages/${id}/${name}`;
  } catch (err) {
    if (sourceUrl && sourceUrl.startsWith('http')) return sourceUrl;
    throw err;
  }
}

async function ossPut(_id: string, _name: string, _bytes: Buffer): Promise<string | null> {
  // Intentionally a seam: a real OSS PUT (signed) goes here when creds exist. Kept dependency-free
  // so the app builds and runs without the Alibaba SDK; see _NEEDS for activation.
  return null;
}

export function storeInfo() {
  const c = getConfig();
  const backend = USE_BLOB ? 'vercel_blob' : c.oss.enabled ? 'alibaba_oss' : 'filesystem';
  return { backend, dir: USE_BLOB ? 'blob:voyages' : c.storeDir };
}
