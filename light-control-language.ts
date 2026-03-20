export type MotionArchetype = string;

export interface FormationReference {
  id: string;
  title: string;
  archetype: MotionArchetype;
  keywords: string[];
  manifestPath?: string;
  annotationPath?: string;
  previewVideoPath?: string;
  score?: number;
}

export interface LightControlLanguage {
  version: string;
  intent: 'create_light_form' | 'create_glyph' | 'create_scene';
  morphology: {
    family: string;
    symmetry: number;
    density: number;
    scale: number;
    edge_softness: number;
  };
  motion: {
    archetype: string;
    flow_mode: string;
    coherence_target: number;
    turbulence: number;
    rhythm_hz: number;
    attack_ms: number;
    settle_ms: number;
  };
  optics: {
    palette: string[];
    luminance_boost: number;
    glow_alpha: number;
    trail_alpha: number;
    color_mode: 'monochrome' | 'palette' | 'source_radiance';
  };
  content: {
    text: string | null;
    scene_recipe: Record<string, unknown> | null;
    semantic_tags?: string[];
  };
  constraints: {
    max_targets: number;
    max_photons: number;
    max_energy: number;
  };
  source_text: string;
  retrieved_formation?: FormationReference;
  runtime_bias?: {
    forceBias?: number;
    flowBias?: number;
    noiseBias?: number;
    coherenceStart?: number;
    archetypePhrase?: string;
  };
}

const DEFAULT_TIMEOUT_MS = 6_000;

export async function generateLightControlLanguage(text: string): Promise<LightControlLanguage> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch('/api/lcl/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: text,
        schema: 'lcl.v3',
        temperature: 0.15,
      }),
      signal: controller.signal,
    });

    if (response.ok) {
      const payload = await response.json();
      const lcl = payload?.lcl ?? payload;
      if (isLclPayload(lcl)) {
        return lcl;
      }
      console.warn('LCL backend returned invalid payload, using deterministic fallback');
    } else {
      console.warn('LCL backend request failed', response.status);
    }
  } catch (error) {
    console.warn('LCL backend unavailable, using deterministic fallback', error);
  } finally {
    clearTimeout(timeout);
  }

  return fallbackHeuristicLcl(text);
}

// backward-compat alias for older kernel imports
export const mockLocalLightModel = generateLightControlLanguage;

export async function interpretWithBackendLLM(
  apiBaseUrl: string,
  payload: {
    userText: string;
    viewport?: { width: number; height: number };
    limits?: Record<string, number>;
  },
): Promise<LightControlLanguage> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/light/interpret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Interpretation request failed with status ${response.status}`);
    }

    const result = await response.json();
    const lcl = result?.lcl ?? result;
    return normalizeLCL(isLclPayload(lcl) ? lcl : fallbackHeuristicLcl(payload.userText));
  } catch (error) {
    console.warn('Interpretation backend unavailable, using deterministic fallback', error);
    return fallbackHeuristicLcl(payload.userText);
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeLCL(lcl: Partial<LightControlLanguage>): LightControlLanguage {
  const fallback = fallbackHeuristicLcl(lcl.source_text ?? '');
  return {
    ...fallback,
    ...lcl,
    morphology: {
      ...fallback.morphology,
      ...lcl.morphology,
    },
    motion: {
      ...fallback.motion,
      ...lcl.motion,
    },
    optics: {
      ...fallback.optics,
      ...lcl.optics,
    },
    content: {
      ...fallback.content,
      ...lcl.content,
    },
    constraints: {
      ...fallback.constraints,
      ...lcl.constraints,
    },
  };
}

function isLclPayload(value: unknown): value is LightControlLanguage {
  const candidate = value as Partial<LightControlLanguage>;
  return Boolean(
    candidate &&
      candidate.version &&
      candidate.morphology?.family &&
      candidate.motion?.archetype &&
      candidate.optics?.palette &&
      candidate.constraints?.max_targets,
  );
}

function fallbackHeuristicLcl(text: string): LightControlLanguage {
  let family = 'sphere';
  let archetype = 'stabilization';
  let flow_mode = 'calm_drift';
  let palette = ['#8B5CF6', '#FFFFFF'];
  let color_mode: LightControlLanguage['optics']['color_mode'] = 'palette';
  let render_mode: LightControlLanguage['intent'] = 'create_light_form';
  let coherence_target = 0.82;
  let turbulence = 0.22;
  let symmetry = 1;
  let density = 0.76;
  let scale = 0.35;
  let textContent = null;

  if (/เกลียว|vortex|spiral|หมุน|คิด/.test(text)) {
    family = 'spiral_vortex';
    archetype = 'reasoning';
    flow_mode = 'upward_spiral';
    palette = ['#FFD166', '#7C3AED'];
    coherence_target = 0.86;
    turbulence = 0.18;
    scale = 0.42;
  }

  if (/ตัวอักษร|ข้อความ|glyph|text/.test(text)) {
    family = 'glyph';
    archetype = 'stabilization';
    flow_mode = 'calm_drift';
    palette = ['#00E5FF', '#FFFFFF'];
    color_mode = 'monochrome';
    render_mode = 'create_glyph';
    textContent = extractQuotedText(text) || 'AETHERIUM';
    coherence_target = 0.92;
    turbulence = 0.08;
  }

  if (/ฉาก|sunset|ภูเขา|ท้องฟ้า|scene|landscape/.test(text)) {
    family = 'radiance_scene';
    archetype = 'emergence';
    flow_mode = 'calm_drift';
    palette = ['#9D174D', '#F59E0B'];
    color_mode = 'source_radiance';
    render_mode = 'create_scene';
    coherence_target = 0.76;
    turbulence = 0.2;
  }

  return {
    version: '3.0',
    intent: render_mode,
    morphology: {
      family,
      symmetry,
      density,
      scale,
      edge_softness: /คม|sharp/.test(text) ? 0.18 : 0.45,
    },
    motion: {
      archetype,
      flow_mode,
      coherence_target,
      turbulence,
      rhythm_hz: /ช้า|สงบ|gentle/.test(text) ? 0.08 : 0.2,
      attack_ms: /เร็ว|ทันที|fast/.test(text) ? 250 : 700,
      settle_ms: /เร็ว|ทันที|fast/.test(text) ? 400 : 1200,
    },
    optics: {
      palette,
      luminance_boost: /เรือง|สว่าง|glow/.test(text) ? 1.65 : 1.25,
      glow_alpha: /บาง|ละเอียด/.test(text) ? 0.42 : 0.62,
      trail_alpha: /ฟุ้ง|เบลอ|dream/.test(text) ? 0.14 : 0.26,
      color_mode,
    },
    content: {
      text: textContent,
      scene_recipe: render_mode === 'create_scene' ? { type: 'sunset_mountain' } : null,
    },
    constraints: {
      max_targets: 14000,
      max_photons: 7000,
      max_energy: 1.6,
    },
    source_text: text,
  };
}

function extractQuotedText(text: string): string | null {
  const m = text.match(/["“”']([^"“”']+)["“”']/);
  return m ? m[1] : null;
}
