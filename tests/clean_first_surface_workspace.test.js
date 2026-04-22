import { describe, expect, it, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

import {
  adaptIntentRequest,
  adaptIntentResponse,
  createApp,
  resolveCompatibilityEndpoints,
} from '../clean-first-surface.js';

const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
const stubManifestation = () => ({
  manifestText: vi.fn(),
  resize: vi.fn(),
  render: vi.fn(),
  setReducedMotion: vi.fn(),
});

describe('blank entry surface', () => {
  it('keeps homepage main surface to a single settings trigger', () => {
    const dom = new JSDOM(html);
    const { document } = dom.window;

    const main = document.querySelector('main.first-surface');
    const mainButtons = Array.from(main.querySelectorAll('button'));
    expect(mainButtons).toHaveLength(1);
    expect(mainButtons[0].id).toBe('settings-toggle');
  });
});

describe('settings focus management', () => {
  it('focuses workspace control on open and returns focus to trigger on close', () => {
    const dom = new JSDOM(html, { url: 'http://localhost:4173' });
    global.window = dom.window;
    global.document = dom.window.document;
    Object.defineProperty(globalThis, 'localStorage', { value: dom.window.localStorage, configurable: true });
    Object.defineProperty(globalThis, 'matchMedia', {
      value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
      configurable: true,
    });
    Object.defineProperty(globalThis, 'requestAnimationFrame', { value: vi.fn(), configurable: true });
    Object.defineProperty(globalThis, 'WebSocket', { value: class {
      constructor() {}
      close() {}
    }, configurable: true });

    const app = createApp(dom.window.document, { manifestationFactory: stubManifestation });
    app.bootstrap();

    app.openSettingsPanel();
    expect(dom.window.document.activeElement.id).toBe('init-runtime');

    app.closeSettingsPanel();
    expect(dom.window.document.activeElement.id).toBe('settings-toggle');
  });
});

describe('deferred runtime', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not initialize websocket or animation until runtime starts', async () => {
    const dom = new JSDOM(html, { url: 'http://localhost:4173' });
    global.window = dom.window;
    global.document = dom.window.document;
    Object.defineProperty(globalThis, 'localStorage', { value: dom.window.localStorage, configurable: true });
    Object.defineProperty(globalThis, 'matchMedia', {
      value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
      configurable: true,
    });

    const raf = vi.fn();
    Object.defineProperty(globalThis, 'requestAnimationFrame', { value: raf, configurable: true });

    const wsCtor = vi.fn(() => ({ close: vi.fn() }));
    Object.defineProperty(globalThis, 'WebSocket', { value: wsCtor, configurable: true });

    const app = createApp(dom.window.document, {
      manifestationFactory: stubManifestation,
      socketFactory: wsCtor,
      raf,
    });
    app.bootstrap();

    expect(wsCtor).not.toHaveBeenCalled();
    expect(raf).not.toHaveBeenCalled();
    expect(app.getRuntimeSnapshot().started).toBe(false);

    await app.startRuntime();

    expect(wsCtor).toHaveBeenCalledTimes(1);
    expect(raf).toHaveBeenCalledTimes(1);
    expect(app.getRuntimeSnapshot().started).toBe(true);
  });
});

describe('compatibility adapter', () => {
  it('maps frontend intent payload and resolves compatibility endpoint', () => {
    const request = adaptIntentRequest('hello world', 's1');
    expect(request.prompt).toBe('hello world');
    expect(request.session_id).toBe('s1');

    const endpoints = resolveCompatibilityEndpoints({ apiBase: '/api', wsBase: '/ws/cognitive-stream' });
    expect(endpoints.intentUrl).toBe('/api/intent');
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
  });
});
