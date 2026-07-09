/* Qwen Cloud media — the REAL image / reference-to-video / narration calls (DashScope, intl).
   Only reachable when DASHSCOPE_API_KEY is set; otherwise the pipeline degrades honestly.
   Endpoints follow the DashScope video-synthesis async pattern (X-DashScope-Async: enable →
   poll /api/v1/tasks/{id}); the reference image is the seed-locked plate so the inked style is
   preserved while the mechanism moves (r2v). Field names are centralised here so they can be
   confirmed against the live docs without touching the orchestrator. */

import { getConfig } from '@/lib/config';

function headers(async = false): Record<string, string> {
  const c = getConfig();
  const h: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${c.dashscopeKey}` };
  if (async) h['X-DashScope-Async'] = 'enable';
  return h;
}

async function post(url: string, body: unknown, async = false): Promise<any> {
  const res = await fetch(url, { method: 'POST', headers: headers(async), body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`DashScope ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

/* ---- the seed-locked cutaway plate (wan2.6-t2i / qwen-image-2.0-pro) ----
   Returns a real image URL. Used both as the style anchor and as the r2v reference.
   Native DashScope async image-generation endpoint (the compatible-mode images route
   does not exist on dashscope-intl): submit with X-DashScope-Async, poll the task. */
export async function generatePlateImage(prompt: string, opts: { seed?: number; size?: string } = {}): Promise<string> {
  const c = getConfig();
  const data = await post(`${c.dashscopeBase}/api/v1/services/aigc/image-generation/generation`, {
    model: c.models.image,
    input: { messages: [{ role: 'user', content: [{ text: prompt }] }] },
    parameters: {
      size: opts.size || '1024*1024',
      n: 1,
      ...(opts.seed != null ? { seed: opts.seed } : {}),
    },
  }, true);
  const taskId = data?.output?.task_id;
  if (!taskId) throw new Error('no task_id returned from image-generation');
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const st = await pollTask(taskId);
    const status = st?.output?.task_status || 'UNKNOWN';
    if (status === 'SUCCEEDED') {
      const content = st?.output?.choices?.[0]?.message?.content;
      const fromChoices = Array.isArray(content) ? content.find((x: any) => x?.image)?.image : null;
      const url = fromChoices || st?.output?.results?.[0]?.url;
      if (!url) throw new Error('no image url returned');
      return url;
    }
    if (status === 'FAILED') throw new Error(`image task failed: ${JSON.stringify(st?.output || {}).slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('image task timed out');
}

/* ---- reference-to-video: the load-bearing engine (wan2.7-r2v / happyhorse-1.1-r2v) ----
   Starts an async job; returns a task id to poll. */
export async function startSounding(prompt: string, referenceImageUrl: string, opts: { resolution?: string; durationS?: number } = {}): Promise<string> {
  const c = getConfig();
  const data = await post(`${c.dashscopeBase}/api/v1/services/aigc/video-generation/video-synthesis`, {
    model: c.models.video,
    // r2v takes the reference plate(s) as input.media (not img_url/ref_images)
    input: { prompt, media: [referenceImageUrl] },
    parameters: {
      resolution: opts.resolution || '720P',
      watermark: false,
      duration: opts.durationS || 3,
      prompt_extend: true,
    },
  }, true);
  const taskId = data?.output?.task_id;
  if (!taskId) throw new Error('no task_id returned from video-synthesis');
  return taskId;
}

/* shared async-task poll (image + video jobs both land on /api/v1/tasks/{id}) */
async function pollTask(taskId: string): Promise<any> {
  const c = getConfig();
  const res = await fetch(`${c.dashscopeBase}/api/v1/tasks/${taskId}`, { headers: headers() });
  const text = await res.text();
  if (!res.ok) throw new Error(`DashScope poll ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

export interface SoundingStatus { status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | string; videoUrl?: string; raw?: unknown }
export async function pollSounding(taskId: string): Promise<SoundingStatus> {
  const data = await pollTask(taskId);
  const status = data?.output?.task_status || 'UNKNOWN';
  const videoUrl = data?.output?.video_url || data?.output?.results?.[0]?.url;
  return { status, videoUrl, raw: data };
}

/* ---- narration (cosyvoice-v3-plus / qwen3-tts-flash) ----
   Returns an audio URL or base64. Synced to reveals in the deterministic edit. */
export async function narrate(text: string, opts: { voice?: string } = {}): Promise<string> {
  const c = getConfig();
  const data = await post(`${c.dashscopeBase}/api/v1/services/aigc/multimodal-generation/generation`, {
    model: c.models.tts,
    input: { text, voice: opts.voice || 'longxiaochun' },
    parameters: { format: 'mp3' },
  });
  const url = data?.output?.audio?.url || data?.output?.audio_url;
  if (!url) throw new Error('no audio url returned');
  return url;
}

/* Qwen video URLs expire ~24h — download immediately into the Logbook store. */
export async function downloadBytes(url: string): Promise<Buffer> {
  if (url.startsWith('data:')) {
    const b64 = url.split(',')[1] || '';
    return Buffer.from(b64, 'base64');
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
