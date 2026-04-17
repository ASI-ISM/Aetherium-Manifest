import { describe, expect, it } from 'vitest';

import { markCompositionEnd, shouldSubmitOnEnter } from '../first_use_surface/input-event-policy.js';
import { routeLightResponse } from '../first_use_surface/response-orchestrator.js';

describe('input IME enter policy', () => {
  it('does not submit while composition is active', () => {
    const runtime = { isComposing: true, lastCompositionEndAt: -Infinity };
    const event = { key: 'Enter', isComposing: true, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, repeat: false, timeStamp: 150 };

    expect(shouldSubmitOnEnter(event, runtime)).toBe(false);
  });

  it('waits briefly after compositionend before allowing Enter submit', () => {
    const runtime = { isComposing: true, lastCompositionEndAt: -Infinity };
    markCompositionEnd(runtime, 100);

    const immediateEnter = { key: 'Enter', isComposing: false, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, repeat: false, timeStamp: 110 };
    const delayedEnter = { ...immediateEnter, timeStamp: 140 };

    expect(shouldSubmitOnEnter(immediateEnter, runtime)).toBe(false);
    expect(shouldSubmitOnEnter(delayedEnter, runtime)).toBe(true);
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
