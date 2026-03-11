interface FormationRuntimeBias {
  forceBias: number;
  flowBias: number;
  noiseBias: number;
  coherenceStart: number;
  archetypePhrase: string;
}

interface FormationRecord {
  id: string;
  archetype: string;
  phrase: string;
  forceBias: number;
  coherenceStart: number;
  coherenceTarget: number;
  flowBias: number;
  noiseBias: number;
  rhythm: number;
}

interface BookOfFormationData {
  formations: FormationRecord[];
  annotations: Record<string, Record<string, unknown>>;
  videos: Record<string, Record<string, unknown>>;
}

const DEFAULT_FORMATIONS: FormationRecord[] = [
  { id: 'reasoning/spiral_convergence', archetype: 'reasoning', phrase: 'spiral inward then ascend', forceBias: 0.88, coherenceStart: 0.16, coherenceTarget: 0.86, flowBias: 0.75, noiseBias: 0.42, rhythm: 0.14 },
  { id: 'stabilization/sphere_equilibrium', archetype: 'stabilization', phrase: 'settle into equilibrium', forceBias: 0.75, coherenceStart: 0.22, coherenceTarget: 0.9, flowBias: 0.3, noiseBias: 0.32, rhythm: 0.08 },
  { id: 'fracture/fracture_shell', archetype: 'fracture', phrase: 'hold tension then split', forceBias: 0.62, coherenceStart: 0.52, coherenceTarget: 0.33, flowBias: 0.95, noiseBias: 1.15, rhythm: 0.4 },
  { id: 'bloom/flower_shell', archetype: 'bloom', phrase: 'expand radially with grace', forceBias: 0.8, coherenceStart: 0.12, coherenceTarget: 0.78, flowBias: 0.68, noiseBias: 0.55, rhythm: 0.2 },
  { id: 'emergence/nebula_birth', archetype: 'emergence', phrase: 'born from diffuse light', forceBias: 0.95, coherenceStart: 0.08, coherenceTarget: 0.82, flowBias: 0.85, noiseBias: 0.9, rhythm: 0.22 },
];

let cachedBookPromise: Promise<BookOfFormationData> | null = null;

export async function FormationRetriever(lcl: any): Promise<any> {
  const book = await loadBookOfFormation();
  const key = lcl.motion?.archetype || 'emergence';
  const found = book.formations.find((item) => item.archetype === key) ?? book.formations[0];
  return {
    ...found,
    annotation: book.annotations[found.id] ?? null,
    video: book.videos[found.id] ?? null,
  };
}

export function mergeFormationWithLCL(lcl: any, formation: any): any {
  const merged = structuredClone(lcl);
  merged.retrieved_formation = formation;
  merged.motion.coherence_target = lcl.motion.coherence_target ?? formation.coherenceTarget;
  merged.motion.rhythm_hz = lcl.motion.rhythm_hz ?? formation.rhythm;
  const runtimeBias: FormationRuntimeBias = {
    forceBias: formation.forceBias,
    flowBias: formation.flowBias,
    noiseBias: formation.noiseBias,
    coherenceStart: formation.coherenceStart,
    archetypePhrase: formation.phrase,
  };
  merged.runtime_bias = runtimeBias;
  merged.content = {
    ...(merged.content ?? {}),
    formation_annotation: formation.annotation ?? null,
    formation_video: formation.video ?? null,
  };
  return merged;
}

async function loadBookOfFormation(): Promise<BookOfFormationData> {
  if (!cachedBookPromise) {
    cachedBookPromise = fetchBookOfFormation().catch((error) => {
      console.warn('Book of Formation fetch failed; falling back to embedded defaults', error);
      return {
        formations: DEFAULT_FORMATIONS,
        annotations: {},
        videos: {},
      };
    });
  }

  return cachedBookPromise;
}

async function fetchBookOfFormation(): Promise<BookOfFormationData> {
  const [manifestText, annotationJson, videoJson] = await Promise.all([
    fetch('/data/book_of_formation/manifest.yaml').then((r) => r.text()),
    fetch('/data/book_of_formation/annotations.json').then((r) => r.json()),
    fetch('/data/book_of_formation/videos.json').then((r) => r.json()),
  ]);

  return {
    formations: parseManifestYaml(manifestText),
    annotations: annotationJson,
    videos: videoJson,
  };
}

function parseManifestYaml(text: string): FormationRecord[] {
  const lines = text.split('\n');
  const records: FormationRecord[] = [];
  let current: Partial<FormationRecord> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('- id:')) {
      if (current?.id) {
        records.push(normalizeRecord(current));
      }
      current = { id: trimmed.replace('- id:', '').trim() };
      continue;
    }

    if (!current) continue;
    const [rawKey, ...rest] = trimmed.split(':');
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim();
    const value = rest.join(':').trim();
    (current as Record<string, unknown>)[key] = castScalar(value);
  }

  if (current?.id) {
    records.push(normalizeRecord(current));
  }

  return records.length > 0 ? records : DEFAULT_FORMATIONS;
}

function normalizeRecord(record: Partial<FormationRecord>): FormationRecord {
  return {
    id: record.id ?? 'emergence/nebula_birth',
    archetype: record.archetype ?? 'emergence',
    phrase: record.phrase ?? 'born from diffuse light',
    forceBias: Number(record.forceBias ?? 0.9),
    coherenceStart: Number(record.coherenceStart ?? 0.1),
    coherenceTarget: Number(record.coherenceTarget ?? 0.82),
    flowBias: Number(record.flowBias ?? 0.7),
    noiseBias: Number(record.noiseBias ?? 0.5),
    rhythm: Number(record.rhythm ?? 0.2),
  };
}

function castScalar(value: string): string | number {
  const normalized = value.replace(/^['"]|['"]$/g, '');
  const asNumber = Number(normalized);
  return Number.isFinite(asNumber) ? asNumber : normalized;
}
