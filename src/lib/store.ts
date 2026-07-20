/* The Logbook store. Fathom OWNS its record: question, shot list, claims, source URLs, verdicts,
   counters + the downloaded media — so voyages survive a closed tab and a cold session (Qwen video
   URLs expire ~24h and Qwen server memory expires in 7 days; Fathom does the keeping).
   Default backend: local filesystem (JSON records + media served from /public/voyages).
   Object storage seam: when ALIBABA_OSS_* is configured, media is meant to persist to OSS. */

import { promises as fs } from 'fs';
import path from 'path';
import { getConfig } from '@/lib/config';
import type { Voyage } from '@/lib/pipeline/types';

function storeRoot(): string {
  const c = getConfig();
  return path.isAbsolute(c.storeDir) ? c.storeDir : path.join(process.cwd(), c.storeDir);
}
function voyDir(): string { return path.join(storeRoot(), 'voyages'); }
function mediaPublicDir(id: string): string { return path.join(process.cwd(), 'public', 'voyages', id); }

async function ensure(dir: string) { await fs.mkdir(dir, { recursive: true }); }

export async function saveVoyage(v: Voyage): Promise<void> {
  await ensure(voyDir());
  v.updatedAt = Date.now();
  await fs.writeFile(path.join(voyDir(), `${v.id}.json`), JSON.stringify(v, null, 2), 'utf8');
}

export async function getVoyage(id: string): Promise<Voyage | null> {
  try {
    const raw = await fs.readFile(path.join(voyDir(), `${id}.json`), 'utf8');
    return await pruneDeadMedia(JSON.parse(raw) as Voyage);
  } catch {
    return null;
  }
}

export async function listVoyages(): Promise<Voyage[]> {
  try {
    const files = await fs.readdir(voyDir());
    const out: Voyage[] = [];
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

/** Persist a downloaded media file. Returns a URL the app can serve.
    Local: written under /public/voyages/<id>/ and served by the /voyages/[id]/[file] route
    (`next start` snapshots public/ at boot, so runtime files need the route). OSS seam: upload when configured.
    On a read-only serverless disk the local write fails — fall back to the source URL so the
    freshly generated take still plays (Qwen URLs live ~24h; the persistent deploy keeps bytes). */
export async function saveMedia(id: string, name: string, bytes: Buffer, sourceUrl?: string): Promise<string> {
  const c = getConfig();
  if (c.oss.enabled) {
    // Object-storage seam: upload to OSS and return the object URL.
    // Activates when ALIBABA_OSS_* is set; falls through to local otherwise.
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
  return { backend: c.oss.enabled ? 'alibaba_oss' : 'filesystem', dir: c.storeDir };
}
