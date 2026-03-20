import type {
  FormationReference,
  LightControlLanguage,
  MotionArchetype,
} from './light-control-language.ts';

export interface FormationManifestEntry {
  id: string;
  title: string;
  archetype: MotionArchetype;
  keywords: string[];
  manifestPath?: string;
  annotationPath?: string;
  previewVideoPath?: string;
}

export interface FormationManifest {
  formations: FormationManifestEntry[];
}

export interface FormationAnnotation {
  id: string;
  semanticTags?: string[];
  preferredFamilies?: string[];
  forceBias?: number;
  flowBias?: number;
  noiseBias?: number;
  coherenceStart?: number;
  notes?: string;
}

export interface FormationBundle {
  manifest: FormationManifest;
  annotations: Record<string, FormationAnnotation>;
}

export interface RetrievedFormation {
  reference: FormationReference;
  annotation?: FormationAnnotation;
}

export async function loadFormationBundle(baseUrl: string): Promise<FormationBundle> {
  const manifestUrl = `${baseUrl}/manifest.yaml`;
  // Assuming the .yaml file is served as JSON-compatible text.
  const manifest = await fetchAndParseJson<FormationManifest>(manifestUrl);

  const annotations: Record<string, FormationAnnotation> = {};
  for (const formation of manifest.formations) {
    if (!formation.annotationPath) continue;
    try {
      const annotation = await fetchAndParseJson<FormationAnnotation>(resolveAssetUrl(baseUrl, formation.annotationPath));
      annotations[formation.id] = annotation;
    } catch {
      // tolerate missing annotations and continue
    }
  }

  return { manifest, annotations };
}

export function retrieveFormation(
  bundle: FormationBundle,
  lcl: LightControlLanguage,
): RetrievedFormation | null {
  const tags = new Set([
    ...(lcl.content.semantic_tags ?? []),
    lcl.motion.archetype,
    lcl.morphology.family,
    ...(lcl.source_text.toLowerCase().match(/[a-zA-Zก-๙_]+/g) ?? []),
  ]);

  let best: RetrievedFormation | null = null;

  for (const entry of bundle.manifest.formations) {
    const annotation = bundle.annotations[entry.id];
    const score = scoreFormation(entry, annotation, tags, lcl);

    if (!best || (best.reference.score ?? -Infinity) < score) {
      best = {
        reference: {
          id: entry.id,
          title: entry.title,
          archetype: entry.archetype,
          keywords: entry.keywords,
          manifestPath: entry.manifestPath,
          annotationPath: entry.annotationPath,
          previewVideoPath: entry.previewVideoPath,
          score,
        },
        annotation,
      };
    }
  }

  return best;
}

function scoreFormation(
  entry: FormationManifestEntry,
  annotation: FormationAnnotation | undefined,
  tags: Set<string>,
  lcl: LightControlLanguage,
): number {
  let score = 0;

  if (entry.archetype === lcl.motion.archetype) score += 4;
  if (annotation?.preferredFamilies?.includes(lcl.morphology.family)) score += 3;

  for (const keyword of entry.keywords) {
    if (tags.has(keyword.toLowerCase())) score += 1.5;
  }

  for (const semanticTag of annotation?.semanticTags ?? []) {
    if (tags.has(semanticTag.toLowerCase())) score += 1.0;
  }

  return score;
}

export function mergeRetrievedFormation(
  lcl: LightControlLanguage,
  retrieved: RetrievedFormation | null,
): LightControlLanguage {
  if (!retrieved) return lcl;

  const annotation = retrieved.annotation;
  return {
    ...lcl,
    retrieved_formation: retrieved.reference,
    runtime_bias: {
      forceBias: annotation?.forceBias ?? 0.8,
      flowBias: annotation?.flowBias ?? 0.7,
      noiseBias: annotation?.noiseBias ?? 0.6,
      coherenceStart: annotation?.coherenceStart ?? 0.12,
      archetypePhrase: annotation?.notes ?? retrieved.reference.title,
    },
  };
}

async function fetchAndParseJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch content from ${url}: ${res.statusText}`);
  const text = await res.text();
  
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Failed to parse content from ${url} as JSON.`);
  }
}

function resolveAssetUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
