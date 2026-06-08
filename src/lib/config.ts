/* Central env seam. NOTHING is hardcoded: keys, base URLs, model ids, budgets and the store
   location all come from the environment. With no keys set, Fathom runs in honest-degrade mode. */

export type ProviderName = 'qwen' | 'anthropic' | 'none';

export interface FathomConfig {
  provider: ProviderName;         // the LLM provider actually in use
  dashscopeKey: string | null;
  dashscopeBase: string;
  anthropicKey: string | null;
  anthropicBase: string;
  models: {
    navigator: string;
    cartographer: string;
    assayer: string;
    image: string;
    video: string;
    tts: string;
    anthropic: string;
  };
  video: { enabled: boolean; budgetS: number; hasEngine: boolean };
  storeDir: string;
  oss: { region: string | null; bucket: string | null; keyId: string | null; keySecret: string | null; enabled: boolean };
  databaseUrl: string | null;
}

function env(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() !== '' ? v.trim() : null;
}

let cached: FathomConfig | null = null;

export function getConfig(): FathomConfig {
  if (cached) return cached;
  const dashscopeKey = env('DASHSCOPE_API_KEY');
  const anthropicKey = env('ANTHROPIC_API_KEY');
  const forced = (env('FATHOM_PROVIDER') || 'auto').toLowerCase();

  let provider: ProviderName = 'none';
  if (forced === 'qwen') provider = dashscopeKey ? 'qwen' : 'none';
  else if (forced === 'anthropic') provider = anthropicKey ? 'anthropic' : 'none';
  else provider = dashscopeKey ? 'qwen' : anthropicKey ? 'anthropic' : 'none';

  const videoEnabled = (env('FATHOM_VIDEO_ENABLED') ?? '1') !== '0';
  const hasEngine = !!dashscopeKey && videoEnabled; // real moving-video only via Qwen

  cached = {
    provider,
    dashscopeKey,
    dashscopeBase: env('DASHSCOPE_BASE_URL') || 'https://dashscope-intl.aliyuncs.com',
    anthropicKey,
    anthropicBase: env('ANTHROPIC_BASE_URL') || 'https://api.anthropic.com',
    models: {
      navigator: env('FATHOM_MODEL_NAVIGATOR') || 'qwen3.7-max',
      cartographer: env('FATHOM_MODEL_CARTOGRAPHER') || 'qwen3.7-plus',
      assayer: env('FATHOM_MODEL_ASSAYER') || 'qwen3-vl-plus',
      image: env('FATHOM_MODEL_IMAGE') || 'wan2.6-t2i',
      video: env('FATHOM_MODEL_VIDEO') || 'wan2.7-r2v',
      tts: env('FATHOM_MODEL_TTS') || 'cosyvoice-v3-plus',
      anthropic: env('FATHOM_ANTHROPIC_MODEL') || 'claude-haiku-4-5-20251001',
    },
    video: { enabled: videoEnabled, budgetS: Number(env('FATHOM_VIDEO_BUDGET_S') || '50'), hasEngine },
    storeDir: env('FATHOM_STORE_DIR') || '.fathom-store',
    oss: (() => {
      const region = env('ALIBABA_OSS_REGION'), bucket = env('ALIBABA_OSS_BUCKET');
      const keyId = env('ALIBABA_OSS_ACCESS_KEY_ID'), keySecret = env('ALIBABA_OSS_ACCESS_KEY_SECRET');
      return { region, bucket, keyId, keySecret, enabled: !!(region && bucket && keyId && keySecret) };
    })(),
    databaseUrl: env('DATABASE_URL'),
  };
  return cached;
}

/** Human-readable capability report — drives the honest status pill + /api/health. */
export function describeEnv() {
  const c = getConfig();
  return {
    provider: c.provider,
    textModel: c.provider === 'qwen' ? c.models.navigator : c.provider === 'anthropic' ? c.models.anthropic : null,
    grounding: 'wikipedia' + (c.provider === 'qwen' ? '+qwen_web_search' : ''),
    videoEngine: c.video.hasEngine ? c.models.video : null,
    ttsEngine: c.dashscopeKey ? c.models.tts : 'browser_speech',
    imageEngine: c.dashscopeKey ? c.models.image : 'procedural_vector',
    assayer: c.provider === 'qwen' ? c.models.assayer : c.provider === 'anthropic' ? c.models.anthropic + ' (vision)' : 'unavailable',
    persistence: c.oss.enabled ? 'alibaba_oss' : 'filesystem',
    database: c.databaseUrl ? 'external' : 'json_files',
    budgetS: c.video.budgetS,
    degraded: c.provider === 'none' || !c.video.hasEngine,
  };
}
