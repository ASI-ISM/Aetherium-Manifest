import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

import {
  markCompositionEnd,
  markCompositionStart,
  markInputCommitted,
  shouldSubmitOnEnter,
} from '../first_use_surface/input-event-policy.js';
import { routeLightResponse } from '../first_use_surface/response-orchestrator.js';
import { createSettingsWorkspace } from '../first_use_surface/settings-workspace.js';

describe('input IME enter policy', () => {
  it('does not submit while composition is active', () => {
    const runtime = { isComposing: true, lastCompositionEndAt: -Infinity };
    const event = { key: 'Enter', isComposing: true, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, repeat: false, timeStamp: 150 };

    expect(shouldSubmitOnEnter(event, runtime)).toBe(false);
  });

  it('blocks Enter with IME process key events', () => {
    const runtime = { isComposing: false, lastCompositionEndAt: -Infinity };
    const processEvent = {
      key: 'Process',
      keyCode: 229,
      isComposing: false,
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      repeat: false,
      timeStamp: 200,
    };

    expect(shouldSubmitOnEnter(processEvent, runtime)).toBe(false);
  });

  it('waits briefly after compositionend before allowing Enter submit', () => {
    const runtime = { isComposing: true, lastCompositionEndAt: -Infinity };
    markCompositionEnd(runtime, 100);

    const immediateEnter = { key: 'Enter', isComposing: false, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, repeat: false, timeStamp: 110 };
    const delayedEnter = { ...immediateEnter, timeStamp: 140 };

    expect(shouldSubmitOnEnter(immediateEnter, runtime)).toBe(false);
    expect(shouldSubmitOnEnter(delayedEnter, runtime)).toBe(true);
  });

  it('tracks composition lifecycle with explicit helpers', () => {
    const runtime = { isComposing: false, lastCompositionEndAt: -Infinity };

    markCompositionStart(runtime);
    expect(runtime.isComposing).toBe(true);

    markInputCommitted(runtime);
    expect(runtime.isComposing).toBe(false);
  });
});

describe('response orchestrator language adaptation', () => {
  it('does not force adaptation for unknown-language input', () => {
    const response = routeLightResponse('12345', 'en');

    expect(response.status).not.toBe('Adapting to your preferred language');
  });

  it('does not force adaptation for mixed Thai/English input', () => {
    const response = routeLightResponse('hello สวัสดี', 'en');

    expect(response.status).not.toBe('Adapting to your preferred language');
  });
});

describe('workspace pane keyboard controls', () => {
  it('moves pane focus with ArrowDown', () => {
    const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost:4173' });
    const workspace = createSettingsWorkspace(dom.window.document, { windowRef: dom.window });
    workspace.bind();
    workspace.open('interaction');

    const first = dom.window.document.querySelector('[data-pane-target="interaction"]');
    first.focus();
    first.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    expect(dom.window.document.activeElement.dataset.paneTarget).toBe('connectivity');
  });

  it('moves pane focus with ArrowUp and wraps to previous pane', () => {
    const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost:4173' });
    const workspace = createSettingsWorkspace(dom.window.document, { windowRef: dom.window });
    workspace.bind();
    workspace.open('interaction');

    const first = dom.window.document.querySelector('[data-pane-target="interaction"]');
    first.focus();
    first.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

    expect(dom.window.document.activeElement.dataset.paneTarget).toBe('developer');
  });

  it('closes on Escape and returns focus to the launcher button', () => {
    const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost:4173' });
    const workspace = createSettingsWorkspace(dom.window.document, { windowRef: dom.window });
    workspace.bind();

    const launcher = dom.window.document.getElementById('settings-toggle');
    launcher.focus();
    workspace.open('interaction');

    const dialog = dom.window.document.getElementById('settings-dialog');
    dialog.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(dom.window.document.getElementById('settings-workspace').hidden).toBe(true);
    expect(dom.window.document.activeElement.id).toBe('settings-toggle');
  });
});

describe('workspace accessibility behavior', () => {
  it('loops focus inside modal when tabbing forward/backward', () => {
    const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost:4173' });
    dom.window.HTMLElement.prototype.getClientRects = () => [{ width: 1, height: 1 }];
    const workspace = createSettingsWorkspace(dom.window.document, { windowRef: dom.window });
    workspace.bind();
    workspace.open('interaction');

    const dialog = dom.window.document.getElementById('settings-dialog');
    const focusable = Array.from(
      dialog.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('hidden') && el.getClientRects().length > 0);
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    lastFocusable.focus();
    dialog.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(dom.window.document.activeElement.id).toBe(firstFocusable.id);

    firstFocusable.focus();
    dialog.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(dom.window.document.activeElement.id).toBe(lastFocusable.id);
  });

  it('exposes an accessible launcher name for settings workspace trigger', () => {
    const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost:4173' });
    const launcher = dom.window.document.getElementById('settings-toggle');

    expect(launcher.getAttribute('aria-label')).toBe('Open settings workspace');
  });
});
