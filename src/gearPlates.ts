// GEAR-POPUP (docs/notes/gear-popup.md): the small plate over a hero whose gear changed, in the HERO-RISE plates' dress (`risePlates.ts`):
// the hero's name, each number that changed old → new with ▲ (green) or ▼ (red, so a worse piece says so), and its Power with the change.
// It comes in near the hero or the slot, holds about 1.8 s and fades (with reduced motion it only fades); any tap anywhere takes every
// plate away at once, and never stops the tap doing what it does, so a quick run of swaps never queues: each tap's change replaces the last
// plate with its own. Several heroes at once (Equip all heroes) are laid with
// `layPlates`; those with no room left are named on one last line instead of queueing.
//
// Reading only: the caller takes the heroes' shots before a change (`watchGear`) and shows the plates after it (`show`).

import { heroName } from './sim/heroNames';
import { layPlates } from './riseRules';
import { gearDiff, type GearShot } from './gearRules';

/** Where a plate goes: the anchor's centre across, the top it sits above, where it may hang under instead, and the band it keeps to. */
export type GearAnchor = { x: number; y: number; under?: number; lo?: number; hi?: number } | null;

/** How long a plate stays in all (ms): in, held about 1.8 s, out. */
export const GEAR_MS = 2300;

let layer: HTMLElement | null = null;
/** The plates up now, by hero kind. */
const open = new Map<string, { el: HTMLElement; timer: number }>();

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function layerOf(): HTMLElement {
  if (layer?.isConnected) return layer;
  layer = document.createElement('div');
  layer.className = 'rsLayer gpLayer';
  layer.setAttribute('aria-live', 'polite');
  document.body.append(layer);
  // (any tap, anywhere, takes the plates away; it is heard on the way down and never stopped, so the tap still does its own work)
  document.addEventListener('pointerdown', () => clearGear(), true);
  return layer;
}

/** Take every gear plate away now. */
export function clearGear(): void {
  for (const [, p] of open) {
    clearTimeout(p.timer);
    p.el.remove();
  }
  open.clear();
}

/** The heroes' shots before a change; `show` after it puts up a plate for each hero whose numbers moved. `shot` reads a hero (by kind). */
export function watchGear(kinds: readonly string[], shot: (kind: string) => GearShot): { show: (at: (kind: string) => GearAnchor) => void } {
  const before = new Map(kinds.map((k) => [k, shot(k)]));
  return {
    show: (at) => {
      const items = [...before].map(([kind, was]) => ({ kind, was, now: shot(kind) }));
      // (two frames on, so the screen the change redrew is in place to stand the plates by)
      requestAnimationFrame(() => requestAnimationFrame(() => showGear(items, at)));
    },
  };
}

function showGear(items: { kind: string; was: GearShot; now: GearShot }[], at: (kind: string) => GearAnchor): void {
  const root = layerOf();
  const plates: { kind: string; el: HTMLElement; at: NonNullable<GearAnchor> }[] = [];
  // (several heroes at once are kept short: the stats' changes on one line, then the Power; one hero gets every line, old → new)
  const changed = items.map((it) => ({ ...it, diff: gearDiff(it.was, it.now) })).filter((it) => it.diff.stats.length || it.diff.power);
  const compact = changed.length > 1;
  for (const it of items) {
    // (a plate already up for this hero gives way to the new one)
    const old = open.get(it.kind);
    if (old) {
      clearTimeout(old.timer);
      old.el.remove();
      open.delete(it.kind);
    }
  }
  for (const it of changed) {
    const diff = it.diff;
    const where = at(it.kind);
    if (!where) continue;
    const el = document.createElement('div');
    el.className = `rsPlate gpPlate${compact ? ' compact' : ''}`;
    const full = (l: { label: string; from: string; to: string; delta: string; up: boolean }, cls = '') =>
      `<span class="gpLine ${cls}${l.up ? 'up' : 'down'}">${esc(l.label)} ${esc(l.from)} → <em>${esc(l.to)}</em> <i>${esc(l.delta)}</i></span>`;
    const short = diff.stats.length
      ? `<span class="gpLine gpShort">${diff.stats.map((l) => `<span class="${l.up ? 'up' : 'down'}">${esc(l.label)} ${esc(l.delta)}</span>`).join(', ')}</span>`
      : '';
    el.innerHTML = `<b class="rsName">${esc(heroName(it.kind))}</b>` + (compact ? short : diff.stats.map((l) => full(l)).join('')) + (diff.power ? full(diff.power, 'gpPower ') : '');
    el.style.visibility = 'hidden';
    root.append(el);
    plates.push({ kind: it.kind, el, at: where });
  }
  if (!plates.length) return;
  const spots = layPlates(plates.map((p) => ({ ...p.at, w: p.el.offsetWidth, h: p.el.offsetHeight })), innerWidth, 4, 4, innerHeight - 4);
  // (no queue: a plate with no room in the first round is dropped, and the last shown names how many more heroes changed)
  const kept = plates.filter((_, i) => spots[i].round === 0);
  const dropped = plates.length - kept.length;
  plates.forEach((p, i) => {
    if (spots[i].round !== 0) return void p.el.remove();
    p.el.classList.toggle('under', spots[i].under);
    p.el.style.left = `${spots[i].left}px`;
    p.el.style.top = `${spots[i].top}px`;
    p.el.style.visibility = '';
    const timer = window.setTimeout(() => {
      p.el.remove();
      if (open.get(p.kind)?.el === p.el) open.delete(p.kind);
    }, GEAR_MS + 100);
    open.set(p.kind, { el: p.el, timer });
  });
  if (dropped) kept[kept.length - 1].el.insertAdjacentHTML('beforeend', `<span class="gpMore">and ${dropped} more ${dropped === 1 ? 'hero' : 'heroes'} changed</span>`);
}
