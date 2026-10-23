// The look of the page, for the mockups: `?style=a|b|c|d` (or `__game.style('b')`) puts `data-style` on the body, which the
// overrides in src/styles/ are scoped under. `?style=off` (or `style('')`) goes back to today's look. With nothing set the page is
// unchanged. The pick is kept in this browser so a phone stays on the style it was shown.
export const STYLES = ['a', 'b', 'c', 'd'];
const KEY = 'lotf-style';

/** Set (or, with '' or an unknown name, clear) the page's style; returns the one now showing. */
export function setStyle(name: string): string {
  const s = STYLES.includes(name) ? name : '';
  if (s) document.body.dataset.style = s;
  else delete document.body.dataset.style;
  try {
    if (s) localStorage.setItem(KEY, s);
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode: the pick just lasts the visit */
  }
  return s;
}

/** Start-up: the address's pick wins, then the one kept. */
export function initStyle(): void {
  const asked = new URLSearchParams(location.search).get('style');
  if (asked !== null) {
    setStyle(asked);
    return;
  }
  try {
    const kept = localStorage.getItem(KEY);
    if (kept) setStyle(kept);
  } catch {
    /* no storage: today's look */
  }
}
