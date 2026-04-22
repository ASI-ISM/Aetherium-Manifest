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

  it('keeps browser adapter on canonical cognitive routes when request rejects unsigned session', async () => {
    const dom = setupDom();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401 });

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
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls.every(([url]) => String(url).startsWith('/api/v1/cognitive/'))).toBe(true);
    expect(dom.window.document.getElementById('token-state').textContent).toBe('Session ticket required');
  });
});
