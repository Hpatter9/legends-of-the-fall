// A colour token (`--s4`) read from the page's CSS, for the few things drawn on a canvas that belong to the interface (the speech bubbles over
// the camp and the tavern), so they match the stone-and-iron plates. Read once and kept; the fallback is used where there is no page (tests).
const seen = new Map<string, string>();

export function tok(name: string, fallback: string): string {
  let v = seen.get(name);
  if (v === undefined) {
    v = (typeof document !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : '') || fallback;
    seen.set(name, v);
  }
  return v;
}
