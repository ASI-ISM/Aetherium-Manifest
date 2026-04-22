const SETTINGS_STORAGE_KEY = 'aetherium:settings-workspace:v1';

export const SETTINGS_PANES = Object.freeze([
  'interaction',
  'connectivity',
  'accessibility',
  'runtime',
  'output',
  'security',
  'developer',
]);

const DEFAULT_PREFERENCES = Object.freeze({
  activePane: 'interaction',
  language: 'auto',
  fontScale: 'md',
  reducedMotion: false,
  apiBase: '/api/v1/cognitive',
  wsBase: '/ws/cognitive-stream',
  environmentTarget: 'default',
  runtimeMode: 'calm',
  telemetryVisible: true,
  governorVisible: false,
  manifestationEnabled: true,
  voiceEnabled: true,
  developerEnabled: false,
});

const SAFE_PREFERENCE_KEYS = Object.freeze([
  'activePane',
  'language',
  'fontScale',
  'reducedMotion',
  'apiBase',
  'wsBase',
  'environmentTarget',
  'runtimeMode',
  'telemetryVisible',
  'governorVisible',
  'manifestationEnabled',
  'voiceEnabled',
  'developerEnabled',
]);

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizePane(value) {
  return SETTINGS_PANES.includes(value) ? value : DEFAULT_PREFERENCES.activePane;
}

function normalizePreferences(input = {}) {
  return {
    activePane: normalizePane(input.activePane),
    language: input.language ?? DEFAULT_PREFERENCES.language,
    fontScale: input.fontScale ?? DEFAULT_PREFERENCES.fontScale,
    reducedMotion: Boolean(input.reducedMotion ?? DEFAULT_PREFERENCES.reducedMotion),
    apiBase: input.apiBase ?? DEFAULT_PREFERENCES.apiBase,
    wsBase: input.wsBase ?? DEFAULT_PREFERENCES.wsBase,
    environmentTarget: input.environmentTarget ?? DEFAULT_PREFERENCES.environmentTarget,
    runtimeMode: input.runtimeMode ?? DEFAULT_PREFERENCES.runtimeMode,
    telemetryVisible: Boolean(input.telemetryVisible ?? DEFAULT_PREFERENCES.telemetryVisible),
    governorVisible: Boolean(input.governorVisible ?? DEFAULT_PREFERENCES.governorVisible),
    manifestationEnabled: Boolean(input.manifestationEnabled ?? DEFAULT_PREFERENCES.manifestationEnabled),
    voiceEnabled: Boolean(input.voiceEnabled ?? DEFAULT_PREFERENCES.voiceEnabled),
    developerEnabled: Boolean(input.developerEnabled ?? DEFAULT_PREFERENCES.developerEnabled),
  };
}

function pickSafePreferences(input = {}) {
  return SAFE_PREFERENCE_KEYS.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      acc[key] = input[key];
    }
    return acc;
  }, {});
}

export function createSettingsStore(storage = globalThis.localStorage) {
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const seed = normalizePreferences({ reducedMotion });

  const read = () => {
    const raw = storage?.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return seed;
    const parsed = safeJsonParse(raw);
    if (!parsed) return seed;
    return normalizePreferences({ ...seed, ...pickSafePreferences(parsed) });
  };

  const write = (next) => {
    const normalized = normalizePreferences(pickSafePreferences(next));
    storage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  };

  return {
    key: SETTINGS_STORAGE_KEY,
    defaults: seed,
    load: read,
    save: write,
    merge: (patch) => write({ ...read(), ...patch }),
  };
}
