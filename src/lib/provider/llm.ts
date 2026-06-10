/* The LLM provider seam. One interface, two real backends:
   • Qwen Cloud (OpenAI-compatible, dashscope-intl) — the production engine.
   • Anthropic (Messages API) — a dev fallback so the whole orchestration runs without a Qwen key.
   Text, structured JSON and vision all go through here. Media (image/video/tts) is Qwen-only and
   lives in ./qwenMedia. Hand-rolled fetch — no heavy SDKs (disk-conscious). */

import { getConfig, type ProviderName } from '@/lib/config';

export interface VisionImage { base64: string; mediaType: string } // mediaType e.g. "image/png"
export interface CompleteOpts {
  system?: string;
  user: string;
  images?: VisionImage[];
  maxTokens?: number;
  temperature?: number;
  model?: string;          // override the default text/vision model
  preserveThinking?: boolean;
}

export interface LLM {
  name: ProviderName;
  available: boolean;
  caps: { vision: boolean };
  complete(o: CompleteOpts): Promise<string>;
  json<T = unknown>(o: CompleteOpts, opts?: { retries?: number }): Promise<T>;
}

const TIMEOUT_MS = 90_000;

async function fetchJSON(url: string, init: RequestInit): Promise<any> {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    const text = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 400)}`);
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(to);
  }
}

/* ---- extract the first balanced JSON object/array from a model response ---- */
export function extractJSON(text: string): any {
  let t = text.trim();
  // strip code fences
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = Math.min(...['{', '['].map((c) => { const i = t.indexOf(c); return i < 0 ? Infinity : i; }));
  if (!isFinite(start)) throw new Error('no JSON found in response');
  // find the matching close by bracket balance (string-aware)
  const open = t[start], close = open === '{' ? '}' : ']';
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = start; i < t.length; i++) {
    const ch = t[i];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) throw new Error('unbalanced JSON in response');
  return JSON.parse(t.slice(start, end + 1));
}

/* ─────────────────────────── Qwen (OpenAI-compatible) ─────────────────────────── */
function qwenLLM(): LLM {
  const c = getConfig();
  const base = `${c.dashscopeBase}/compatible-mode/v1`;
  const textModel = c.models.navigator;
  const build = (o: CompleteOpts, jsonMode: boolean) => {
    const content: any[] = [{ type: 'text', text: o.user }];
    for (const img of o.images || []) content.push({ type: 'image_url', image_url: { url: `data:${img.mediaType};base64,${img.base64}` } });
    const messages: any[] = [];
    if (o.system) messages.push({ role: 'system', content: o.system });
    messages.push({ role: 'user', content: o.images?.length ? content : o.user });
    const body: any = {
      model: o.model || (o.images?.length ? c.models.assayer : textModel),
      messages,
      max_tokens: o.maxTokens ?? 2200,
      temperature: o.temperature ?? 0.6,
    };
    if (jsonMode) body.response_format = { type: 'json_object' };
    return body;
  };
  const call = async (o: CompleteOpts, jsonMode: boolean) => {
    const data = await fetchJSON(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.dashscopeKey}` },
      body: JSON.stringify(build(o, jsonMode)),
    });
    return String(data?.choices?.[0]?.message?.content ?? '');
  };
  return {
    name: 'qwen',
    available: true,
    caps: { vision: true },
    complete: (o) => call(o, false),
    json: async <T,>(o: CompleteOpts, opts?: { retries?: number }) => runJSON((oo, jm) => call(oo, jm), o, opts?.retries ?? 1) as Promise<T>,
  };
}

/* ─────────────────────────── Anthropic (Messages API) ─────────────────────────── */
function anthropicLLM(): LLM {
  const c = getConfig();
  const model = c.models.anthropic;
  const build = (o: CompleteOpts) => {
    const content: any[] = [];
    for (const img of o.images || []) content.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.base64 } });
    content.push({ type: 'text', text: o.user });
    return {
      model: o.model || model,
      max_tokens: o.maxTokens ?? 2200,
      temperature: o.temperature ?? 0.6,
      system: o.system,
      messages: [{ role: 'user', content }],
    };
  };
  const call = async (o: CompleteOpts) => {
    const data = await fetchJSON(`${c.anthropicBase}/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': c.anthropicKey!, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(build(o)),
    });
    return (data?.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  };
  return {
    name: 'anthropic',
    available: true,
    caps: { vision: true },
    complete: (o) => call(o),
    json: async <T,>(o: CompleteOpts, opts?: { retries?: number }) => runJSON((oo) => call(oo), o, opts?.retries ?? 1) as Promise<T>,
  };
}

/* shared JSON runner: nudge toward JSON, parse leniently, one repair retry */
async function runJSON(call: (o: CompleteOpts, jsonMode: boolean) => Promise<string>, o: CompleteOpts, retries: number): Promise<any> {
  const sys = (o.system ? o.system + '\n\n' : '') +
    'Respond with ONLY a single valid JSON value — no prose, no markdown fences, no commentary.';
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const text = await call({ ...o, system: sys, temperature: attempt === 0 ? (o.temperature ?? 0.5) : 0.2 }, true);
    try {
      return extractJSON(text);
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error('LLM did not return parseable JSON: ' + String(lastErr));
}

/* ─────────────────────────── selection ─────────────────────────── */
export function getLLM(): LLM {
  const c = getConfig();
  if (c.provider === 'qwen') return qwenLLM();
  if (c.provider === 'anthropic') return anthropicLLM();
  return {
    name: 'none',
    available: false,
    caps: { vision: false },
    complete: async () => { throw new Error('No LLM provider configured. Set DASHSCOPE_API_KEY (or ANTHROPIC_API_KEY for the dev fallback).'); },
    json: async () => { throw new Error('No LLM provider configured.'); },
  };
}
