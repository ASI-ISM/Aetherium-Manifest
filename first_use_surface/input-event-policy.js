const COMPOSITION_END_GUARD_MS = 24;

export function shouldSubmitOnEnter(event, runtime = {}) {
  if (event.key !== 'Enter') return false;
  if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return false;
  if (event.repeat) return false;

  if (event.isComposing || runtime.isComposing) return false;

  const now = typeof event.timeStamp === 'number' ? event.timeStamp : Date.now();
  const lastCompositionEndAt = runtime.lastCompositionEndAt ?? -Infinity;
  if (now - lastCompositionEndAt < COMPOSITION_END_GUARD_MS) {
    return false;
  }

  return true;
}

export function markCompositionEnd(runtime = {}, at = Date.now()) {
  runtime.isComposing = false;
  runtime.lastCompositionEndAt = at;
}
