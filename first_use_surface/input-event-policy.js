const COMPOSITION_END_GUARD_MS = 24;

function eventTimestamp(event) {
  return typeof event?.timeStamp === 'number' ? event.timeStamp : Date.now();
}

export function markCompositionStart(runtime = {}) {
  runtime.isComposing = true;
}

export function markCompositionEnd(runtime = {}, at = Date.now()) {
  runtime.isComposing = false;
  runtime.lastCompositionEndAt = at;
}

export function markInputCommitted(runtime = {}) {
  runtime.isComposing = false;
}

export function shouldSubmitOnEnter(event, runtime = {}) {
  if (event.key !== 'Enter') return false;
  if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return false;
  if (event.repeat) return false;

  // Some browsers (notably WebKit paths during IME) emit keyCode=229/"Process"
  // while composition is still active, even when isComposing is false.
  if (event.isComposing || runtime.isComposing || event.keyCode === 229 || event.key === 'Process') {
    return false;
  }

  const now = eventTimestamp(event);
  const lastCompositionEndAt = runtime.lastCompositionEndAt ?? -Infinity;
  if (now - lastCompositionEndAt < COMPOSITION_END_GUARD_MS) {
    return false;
  }

  return true;
}
