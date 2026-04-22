import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

import { createApp, resolveCompatibilityEndpoints } from '../clean-first-surface.js';

const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
const stubManifestation = () => ({
  manifestText: vi.fn(),
  resize: vi.fn(),
  render: vi.fn(),
  setReducedMotion: vi.fn(),
});

function setupDom({ width = 1280 } = {}) {
  const dom = new JSDOM(html, { url: 'http://localhost:4173' });

  global.window = dom.window;
  global.document = dom.window.document;
  Object.defineProperty(dom.window, 'innerWidth', { value: width, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', { value: dom.window.localStorage, configurable: true });
  Object.defineProperty(globalThis, 'matchMedia', {
    value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
    configurable: true,
  });
  Object.defineProperty(globalThis, 'requestAnimationFrame', { value: vi.fn(), configurable: true });

  return dom;
}

describe('blank home semantics', () => {
  it('keeps first view free of greeting/composer/runtime text and exposes only settings trigger', () => {
    const dom = setupDom();
    const main = dom.window.document.querySelector('main.first-surface');

    expect(main.querySelectorAll('button')).toHaveLength(1);
    expect(main.querySelector('#settings-toggle')).toBeTruthy();
    expect(main.textContent.trim()).toBe('⚙');
  });
});

describe('settings workspace behavior', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('traps focus, supports escape close, and returns focus to launcher', () => {
    const dom = setupDom();
    const app = createApp(dom.window.document, { manifestationFactory: stubManifestation, windowRef: dom.window });
    app.bootstrap();

    const openButton = dom.window.document.getElementById('settings-toggle');
    openButton.focus();
    app.openSettingsWorkspace();

    const dialog = dom.window.document.getElementById('settings-dialog');
    expect(dialog.contains(dom.window.document.activeElement)).toBe(true);

    dialog.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dom.window.document.getElementById('settings-workspace').hidden).toBe(true);
    expect(dom.window.document.activeElement.id).toBe('settings-toggle');
  });

  it('uses fullscreen workspace layout on mobile viewport', () => {
    const dom = setupDom({ width: 480 });
    const app = createApp(dom.window.document, { manifestationFactory: stubManifestation, windowRef: dom.window });
    app.bootstrap();
    app.openSettingsWorkspace();

    expect(app.getWorkspaceLayoutMode()).toBe('fullscreen');
  });
});

describe('deferred runtime policy', () => {
  it('keeps websocket and voice initialization deferred before workspace interaction', async () => {
    const dom = setupDom();
    const wsCtor = vi.fn(() => ({ close: vi.fn() }));
    Object.defineProperty(globalThis, 'WebSocket', { value: wsCtor, configurable: true });

    const app = createApp(dom.window.document, {
      manifestationFactory: stubManifestation,
      socketFactory: wsCtor,
      windowRef: dom.window,
    });
    app.bootstrap();

    expect(app.getRuntimeSnapshot().started).toBe(false);
    expect(app.getRuntimeSnapshot().voiceInitialized).toBe(false);
    expect(wsCtor).not.toHaveBeenCalled();

    app.openSettingsWorkspace('connectivity');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(app.getRuntimeSnapshot().started).toBe(false);
    expect(app.getRuntimeSnapshot().voiceInitialized).toBe(false);
    expect(wsCtor).not.toHaveBeenCalled();

    app.openSettingsWorkspace('interaction');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(app.getRuntimeSnapshot().started).toBe(true);
    expect(app.getRuntimeSnapshot().voiceInitialized).toBe(true);
    expect(wsCtor).toHaveBeenCalledTimes(1);
  });
});

describe('compatibility adapter behavior', () => {
  it('maps to canonical cognitive routes and ws endpoint', () => {
    const endpoints = resolveCompatibilityEndpoints({
      apiBase: '/api/v1/cognitive/',
      wsBase: '/ws/cognitive-stream',
    });
    expect(endpoints.emitUrl).toBe('/api/v1/cognitive/generate');
    expect(endpoints.validateUrl).toBe('/api/v1/cognitive/validate');
    expect(endpoints.wsUrl).toBe('/ws/cognitive-stream');
  });

  it('falls back to legacy intent endpoint when canonical route rejects unsigned request', async () => {
    const dom = setupDom();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ text: 'compatibility response', intent_vector: {}, visual_manifestation: {} }),
      });

    const app = createApp(dom.window.document, {
      manifestationFactory: stubManifestation,
      fetchImpl,
      socketFactory: () => ({ close: vi.fn() }),
      windowRef: dom.window,
    });
    app.bootstrap();
    app.openSettingsWorkspace('interaction');
    await new Promise((resolve) => setTimeout(resolve, 0));

    const input = dom.window.document.getElementById('intent-input');
    const form = dom.window.document.getElementById('composer');
    input.value = 'hello adapter';
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchImpl.mock.calls[0][0]).toBe('/api/v1/cognitive/generate');
    expect(fetchImpl.mock.calls[1][0]).toBe('http://localhost/api/intent');
  });
});

describe('runtime audit and role guard', () => {
  it('creates audit entries for runtime-critical toggles and reconnect action', async () => {
    const dom = setupDom();
    const wsCtor = vi.fn(() => ({ close: vi.fn() }));
    Object.defineProperty(globalThis, 'WebSocket', { value: wsCtor, configurable: true });

    const app = createApp(dom.window.document, {
      manifestationFactory: stubManifestation,
      socketFactory: wsCtor,
      windowRef: dom.window,
    });
    app.bootstrap();
    app.openSettingsWorkspace('security');

    const role = dom.window.document.getElementById('session-role');
    role.value = 'operator';
    role.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const runtimeMode = dom.window.document.getElementById('runtime-mode');
    runtimeMode.value = 'adaptive';
    runtimeMode.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const telemetry = dom.window.document.getElementById('telemetry-toggle');
    telemetry.checked = false;
    telemetry.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const governor = dom.window.document.getElementById('governor-toggle');
    governor.checked = true;
    governor.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const manifestation = dom.window.document.getElementById('manifestation-toggle');
    manifestation.checked = false;
    manifestation.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    const envTarget = dom.window.document.getElementById('environment-target');
    envTarget.value = 'staging';
    envTarget.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    dom.window.document.getElementById('btn-connect').click();
    dom.window.document.getElementById('btn-connect-confirm').click();

    const controls = app
      .getSessionAudit()
      .filter((entry) => entry.event_type === 'runtime_change')
      .map((entry) => entry.control);

    expect(controls).toContain('runtimeMode');
    expect(controls).toContain('telemetryToggle');
    expect(controls).toContain('governorToggle');
    expect(controls).toContain('manifestationToggle');
    expect(controls).toContain('environmentTarget');
    expect(controls).toContain('reconnectAction');
  });

  it('blocks viewer role from dangerous actions', () => {
    const dom = setupDom();
    const app = createApp(dom.window.document, { manifestationFactory: stubManifestation, windowRef: dom.window });
    app.bootstrap();
    app.openSettingsWorkspace('security');

    const armDangerReset = dom.window.document.getElementById('danger-reset');
    const confirmDangerReset = dom.window.document.getElementById('danger-reset-confirm');

    expect(armDangerReset.disabled).toBe(true);
    expect(confirmDangerReset.disabled).toBe(true);

    armDangerReset.click();
    confirmDangerReset.click();

    const resetEvents = app.getSessionAudit().filter((entry) => entry.control === 'dangerousReset');
    expect(resetEvents).toHaveLength(0);
  });
});
