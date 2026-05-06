import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

import { createApp } from '../clean-first-surface.js';
import { createSettingsStore } from '../first_use_surface/settings-store.js';

const html = fs.readFileSync(path.resolve('index.html'), 'utf8');

const stubManifestation = () => ({
  manifestText: vi.fn(),
  resize: vi.fn(),
  render: vi.fn(),
  setReducedMotion: vi.fn(),
});

function setupDom() {
  const dom = new JSDOM(html, { url: 'http://localhost:4173' });
  global.window = dom.window;
  global.document = dom.window.document;
  Object.defineProperty(globalThis, 'localStorage', { value: dom.window.localStorage, configurable: true });
  Object.defineProperty(globalThis, 'matchMedia', {
    value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
    configurable: true,
  });
  Object.defineProperty(globalThis, 'requestAnimationFrame', { value: vi.fn(), configurable: true });
  return dom;
}

describe('settings security/runtime controls', () => {
  it('does not persist raw token or API key-like fields in localStorage', () => {
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

    store.save({
      activePane: 'security',
      token: 'raw-secret-token',
      api_key: 'raw-api-key',
      session_ticket: 'signed-session-ticket',
      wsBase: '/ws/cognitive-stream',
    });

    const persisted = JSON.parse(storage.getItem(store.key));
    expect(persisted.activePane).toBe('security');
    expect(persisted.wsBase).toBe('/ws/cognitive-stream');
    expect(persisted.token).toBeUndefined();
    expect(persisted.api_key).toBeUndefined();
    expect(persisted.session_ticket).toBeUndefined();
  });

  it('requires explicit confirm step before dangerous reset audit event is emitted', () => {
    const dom = setupDom();
    const app = createApp(dom.window.document, { manifestationFactory: stubManifestation, windowRef: dom.window });
    app.bootstrap();
    app.openSettingsWorkspace('security');

    const armDangerReset = dom.window.document.getElementById('danger-reset');
    const confirmDangerReset = dom.window.document.getElementById('danger-reset-confirm');
    const role = dom.window.document.getElementById('session-role');
    role.value = 'operator';
    role.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    confirmDangerReset.click();
    expect(app.getSessionAudit().filter((entry) => entry.control === 'dangerousReset')).toHaveLength(0);

    armDangerReset.click();
    confirmDangerReset.click();
    expect(app.getSessionAudit().filter((entry) => entry.control === 'dangerousReset')).toHaveLength(1);
  });

  it('creates runtime audit event when runtime mode override is changed', () => {
    const dom = setupDom();
    const app = createApp(dom.window.document, { manifestationFactory: stubManifestation, windowRef: dom.window });
    app.bootstrap();
    app.openSettingsWorkspace('runtime');

    const runtimeMode = dom.window.document.getElementById('runtime-mode');
    runtimeMode.value = 'adaptive';
    runtimeMode.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const events = app.getSessionAudit().filter((entry) => entry.control === 'runtimeMode');
    expect(events).toHaveLength(1);
    expect(events[0].old_value).toBe('calm');
    expect(events[0].new_value).toBe('adaptive');
  });
});
