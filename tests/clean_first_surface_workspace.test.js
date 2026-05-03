import { describe, expect, it } from 'vitest';

import {
  adaptIntentRequest,
  adaptIntentResponse,
  createDefaultHomeShellState,
  resolveCompatibilityEndpoints,
} from '../clean-first-surface.js';
import { createSettingsStore } from '../first_use_surface/settings-store.js';

describe('compatibility adapter', () => {
  it('maps intent payload to cognitive emit endpoint', () => {
    const request = adaptIntentRequest('hello world', 's1');
    expect(request.prompt).toBe('hello world');
    expect(request.session_id).toBe('s1');

    const endpoints = resolveCompatibilityEndpoints({ apiBase: '/api/v1/cognitive', wsBase: '/ws/cognitive-stream' });
    expect(endpoints.emitUrl).toBe('/api/v1/cognitive/generate');
    expect(endpoints.validateUrl).toBe('/api/v1/cognitive/validate');
    expect(endpoints.wsUrl).toBe('/ws/cognitive-stream');
  });

  it('normalizes backend response to frontend stream contract shape', () => {
    const adapted = adaptIntentResponse({
      text: 'ready',
      intent_vector: { category: 'guide', energy_level: 0.8, emotional_valence: 0.2 },
      visual_manifestation: {
        base_shape: 'ring',
        color_palette: { primary: '#111111', secondary: '#222222' },
        particle_physics: { turbulence: 0.6, flow_direction: 'flow' },
      },
    });

    expect(adapted.state).toBe('guide');
    expect(adapted.visual.energy).toBe(0.8);
    expect(adapted.visual.color_palette.primary).toBe('#111111');
    expect(adapted.visual.flow).toBe(1);
    expect(adapted.visual.flowDirection).toBe('outward');
  });
});

describe('home shell state', () => {
  it('creates the canonical blank-entry state model', () => {
    const state = createDefaultHomeShellState('interaction', true);

    expect(state.settingsOpen).toBe(false);
    expect(state.runtimeHydrated).toBe(false);
    expect(state.gatewayConnected).toBe(false);
    expect(state.voiceReady).toBe(false);
    expect(state.manifestationReady).toBe(false);
    expect(state.activePane).toBe('interaction');
    expect(state.reducedMotion).toBe(true);
  });
});

describe('settings store safety', () => {
  it('stores workspace preferences without persisting raw token fields', () => {
    const storage = {
      data: new Map(),
      getItem(key) {
        return this.data.has(key) ? this.data.get(key) : null;
      },
      setItem(key, value) {
        this.data.set(key, value);
      },
    };

    const store = createSettingsStore(storage);
    store.save({ activePane: 'security', voiceEnabled: false, token: 'raw-secret', session_ticket: 'signed-blob' });

    const persisted = JSON.parse(storage.getItem(store.key));
    expect(persisted.activePane).toBe('security');
    expect(persisted.voiceEnabled).toBe(false);
    expect(persisted.token).toBeUndefined();
    expect(persisted.session_ticket).toBeUndefined();
  });
});
