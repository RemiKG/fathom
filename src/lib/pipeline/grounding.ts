/* Grounding — REAL, keyless retrieval. Before a single frame is drawn, Fathom pulls the real facts
   and the source URLs each claim must respect. Uses Wikipedia's open REST + action APIs (no key,
   works cold for a stranger). When a Qwen key is present, Qwen web_search can be layered on top,
   but the base path here is genuinely real on its own. */

import { getConfig } from '@/lib/config';
import { newId, type Source } from './types';

const UA = 'FathomVoyage/1.0 (https://github.com/; educational explainer app)';

async function wikiSearch(query: string, limit: number): Promise<string[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&format=json&srprop=`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.query?.search || []).map((s: any) => s.title).filter(Boolean);
  } catch {
    return [];
  }
}

async function wikiSummary(title: string): Promise<Source | null> {
  // action API: a richer plain-text extract (~1200 chars) + the canonical URL in one call, so the
  // Assayer has real content to verify each claim against (thin summaries cause over-withholding).
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts%7Cinfo&inprop=url&explaintext=1&exchars=1200&redirects=1&format=json&titles=${encodeURIComponent(title)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages || {};
    const page: any = Object.values(pages)[0];
    if (!page || page.missing !== undefined || !page.extract) return null;
    const extract = String(page.extract).replace(/\s+/g, ' ').trim();
    if (!extract || (/\bmay refer to\b/i.test(extract) && extract.length < 240)) return null; // skip disambiguation
    const pageUrl = page.canonicalurl || page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
    return { id: newId('src'), domain: 'en.wikipedia.org', url: pageUrl, title: page.title || title, extract: extract.slice(0, 900) };
  } catch {
    return null;
  }
}

/** Retrieve a real source pool for the topic + the model's suggested search queries. */
export async function retrieveSources(queries: string[], depth: number): Promise<Source[]> {
  const perQuery = Math.max(1, Math.min(4, depth));
  const seenTitles = new Set<string>();
  const titleQueue: string[] = [];
  // gather candidate titles across all queries
  const searches = await Promise.all(queries.slice(0, 6).map((q) => wikiSearch(q, perQuery)));
  for (const titles of searches) {
    for (const t of titles) {
      if (!seenTitles.has(t)) { seenTitles.add(t); titleQueue.push(t); }
    }
  }
  const cap = Math.max(3, Math.min(8, queries.length * perQuery));
  const picked = titleQueue.slice(0, cap);
  const summaries = await Promise.all(picked.map(wikiSummary));
  const sources: Source[] = [];
  const seenUrls = new Set<string>();
  for (const s of summaries) {
    if (s && !seenUrls.has(s.url)) { seenUrls.add(s.url); sources.push(s); }
  }
  return sources;
}

export function groundingMode(): string {
  const c = getConfig();
  return c.provider === 'qwen' ? 'wikipedia + qwen web_search' : 'wikipedia REST';
}
