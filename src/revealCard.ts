// The end card after a film that reveals something (REVEAL, docs/notes/cinematic-reveal-vault.md): "Unlocked" on the ribbon (the army
// banner's own, `.unlock` in pixel.css), the thing's art, its name, a line on what it is and one on where to find it, then a button that
// goes there (where the page can leave safely) and Continue. What it says comes from `sim/sceneReveal.ts`; this only draws it. It waits
// for a tap (Escape and Enter too), so a film skipped still shows what it revealed. Reduced motion: it comes up without moving.

import type { EndCard } from './sim/sceneReveal';
import { UNITS } from './sim/units';
import { portrait } from './render/sheets';
import { heroArtUrl } from './ultMoment';
import { CHAMBERS } from './castle';
import portalUrl from './art/calmap/portal.png';
import { openScreen } from './screens';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** The card's picture. */
function artOf(card: EndCard): HTMLElement {
  const a = card.art;
  const frame = el('div', `rvArt rv-${a.kind}`);
  if (a.kind === 'portal') {
    // (the Calamity map's portal: a strip of 16 frames, turned slowly; still with reduced motion)
    const p = el('div', 'rvPortal');
    p.style.backgroundImage = `url(${portalUrl})`;
    frame.append(p);
  } else if (a.kind === 'unit') {
    const def = UNITS[a.unit];
    if (def) frame.append(portrait(def.sheet, 144));
  } else {
    const img = el('img');
    img.alt = '';
    img.draggable = false;
    img.src = a.kind === 'hero' ? heroArtUrl(a.hero, a.step) : a.kind === 'eidolon' ? `eidolons/${a.id}-card.webp` : a.kind === 'horn' ? 'eidolons/horn-ready.webp' : CHAMBERS.find((c) => c.id === a.site)?.edificeUrl ?? '';
    frame.append(img);
  }
  return frame;
}

let open: { root: HTMLElement; finish: (went: boolean) => void } | null = null;

/** Show the card and wait for it to be dismissed. `go`: what the card's own button does (left out: Continue only). Resolves `true` when
 *  the player took the button that goes there. */
export function showEndCard(card: EndCard, go?: () => void): Promise<boolean> {
  // (CLOSE-SCREENS: a card already up is finished, not just taken away: its key listener goes and its wait ends)
  open?.finish(false);
  return new Promise((done) => {
    const root = el('div', 'unlock rvCard');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', `${card.label}: ${card.name}`);
    const rib = el('div', 'unlockRib');
    rib.append(el('b', '', card.label));
    const name = el('div', 'unlockName', card.name);
    const line = el('div', 'unlockLine', card.line);
    const where = el('div', 'rvWhere');
    where.append(el('i', '', 'Where: '), card.where);
    const row = el('div', 'rvRow');
    const finish = (went: boolean): void => {
      window.removeEventListener('keydown', keys, true);
      root.remove();
      leave();
      if (open?.root === root) open = null;
      done(went);
      if (went) go?.();
    };
    const keys = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      e.stopPropagation();
      finish(e.key !== 'Escape' && !!go && document.activeElement === goBtn);
    };
    let goBtn: HTMLButtonElement | null = null;
    if (go && card.go) {
      goBtn = el('button', 'primary', card.go.label);
      goBtn.type = 'button';
      goBtn.addEventListener('click', () => finish(true));
      row.append(goBtn);
    }
    const cont = el('button', go && card.go ? '' : 'primary', 'Continue');
    cont.type = 'button';
    cont.addEventListener('click', () => finish(false));
    row.append(cont);
    root.append(rib, artOf(card), name, line, where, row);
    const leave = openScreen('endCard', () => undefined, { kind: 'moment' });
    document.body.append(root);
    open = { root, finish };
    window.addEventListener('keydown', keys, true);
    (goBtn ?? cont).focus({ preventScroll: true });
  });
}
