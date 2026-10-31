import { config } from '../config';
import { interpretLabels } from '../lib/ai-map';
import type { Label } from '../lib/ai-map';

export interface AiResult {
  status: 'ok' | 'demo' | 'unconfigured' | 'error';
  provider: string | null;
  demo: boolean;
  labels: Label[];
  wasteRelated: boolean | null;
  wasteScore: number | null;
  suggestedCategory: string | null;
  message: string;
  checkedAt: string;
}

export const aiCapability = () => ({
  configured: !!config.ai.visionKey,
  demoMode: !config.ai.visionKey && config.ai.demo,
  provider: config.ai.visionKey ? 'Google Cloud Vision (label detection)' : null,
});

const base = (): Omit<AiResult, 'status' | 'message'> => ({
  provider: null, demo: false, labels: [], wasteRelated: null, wasteScore: null, suggestedCategory: null, checkedAt: new Date().toISOString(),
});

export async function analyzeImage(buf: Buffer): Promise<AiResult> {
  if (!config.ai.visionKey) {
    if (config.ai.demo) return { ...base(), status: 'demo', demo: true, message: 'DEMO MODE — this image was NOT analysed. No prediction was made.' };
    return { ...base(), status: 'unconfigured', message: 'AI detection is not configured on this server.' };
  }
  try {
    const res = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': config.ai.visionKey },
      body: JSON.stringify({ requests: [{ image: { content: buf.toString('base64') }, features: [{ type: 'LABEL_DETECTION', maxResults: 15 }] }] }),
      signal: AbortSignal.timeout(15000),
    });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok || body?.responses?.[0]?.error) {
      const msg = body?.error?.message || body?.responses?.[0]?.error?.message || `HTTP ${res.status}`;
      return { ...base(), status: 'error', provider: 'Google Cloud Vision', message: `AI provider error: ${msg}` };
    }
    const labels: Label[] = (body.responses?.[0]?.labelAnnotations ?? []).map((l: any) => ({ description: String(l.description), score: Number(l.score) }));
    const interp = interpretLabels(labels);
    return {
      ...base(), status: 'ok', provider: 'Google Cloud Vision', labels,
      wasteRelated: interp.wasteRelated, wasteScore: interp.wasteScore, suggestedCategory: interp.suggestedCategory,
      message: interp.wasteRelated
        ? 'Labels returned by the provider match waste-related terms. Category is a suggestion from those labels.'
        : 'No waste-related labels were returned for this image.',
    };
  } catch (e: any) {
    return { ...base(), status: 'error', provider: 'Google Cloud Vision', message: `AI request failed: ${e?.name === 'TimeoutError' ? 'timed out' : 'network error'}` };
  }
}
