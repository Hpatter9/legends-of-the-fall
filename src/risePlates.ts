// HERO-RISE (docs/notes/hero-rise.md): the small plates over the heroes who rose. Each says what went up ("Level 32", the stars, "+12 HP,
// +3 ATK") and what was earned, each earned skill with its painted icon ("New: Shield Rush", "Shield Wall Lv 3", "New: Iron Resolve"). A
// plate rises in over its hero, stays about two seconds and fades. When several heroes rise at once their plates are laid so none covers
// another (`layPlates`) and come in a little apart. A brass-rimmed plate of dark wood, as the fight's rows are. Reading only: the caller
// hands it the lines (`riseOf`) and where each hero stands on the screen.

import { combatSkillSource } from './combatSkillArt';
import { COMBAT_ART } from './combatArtAssets';
import { heroName } from './sim/heroNames';
import { layPlates, plateLines, type RiseLine } from './riseRules';

/** One hero's rise: its lines, its kind (for its name), and where it stands on the screen now (its centre across, and the top the plate sits
 *  above), or null when it is not on show. */
export interface RiseShow {
  kind: string;
  lines: RiseLine[];
  at: () => { x: number; y: number } | null;
}

/** How long a plate stays (ms), and how far apart a crowd's plates come in. */
export const RISE_MS = 2600;
const STAGGER_MS = 160;

let layer: HTMLElement | null = null;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** The icon an earned line shows: its skill's painted motif, else a star. */
function iconOf(l: RiseLine): string {
  const src = l.skill ? combatSkillSource(l.skill) : COMBAT_ART.star;
  return src ? `<img src="${src}" width="16" height="16" alt="">` : '';
}

/** Show the plates (a hero with nothing risen gets none). */
export function showRises(items: readonly RiseShow[]): void {
  const shown = items.filter((i) => i.lines.length);
  if (!shown.length) return;
  if (!layer || !layer.isConnected) {
    layer = document.createElement('div');
    layer.className = 'rsLayer';
    layer.setAttribute('aria-live', 'polite');
    document.body.append(layer);
  }
  const plates: { el: HTMLElement; at: { x: number; y: number } }[] = [];
  for (const it of shown) {
    const at = it.at();
    if (!at) continue;
    const p = plateLines(it.lines);
    const el = document.createElement('div');
    el.className = 'rsPlate';
    el.innerHTML =
      `<b class="rsName">${esc(heroName(it.kind))}${p.head.length ? ` <em>${esc(p.head.join(' · '))}</em>` : ''}</b>` +
      (p.stats ? `<span class="rsStats">${esc(p.stats)}</span>` : '') +
      p.earned.map((l) => `<span class="rsEarned ${l.kind}">${iconOf(l)}${esc(l.text)}</span>`).join('');
    el.style.visibility = 'hidden';
    layer.append(el);
    plates.push({ el, at });
  }
  // (measured, then laid so none covers another, and each brought in a little after the last. The plate's pixel font loads on its first use
  // and widens it, so it is asked for first; a frame later the plates are measured again and moved, if every one keeps its round)
  let rounds: number[] = [];
  const lay = (first: boolean) => {
    if (!plates.every((p) => p.el.isConnected)) return;
    const boxes = plates.map((p) => ({ x: p.at.x, y: p.at.y, w: p.el.offsetWidth, h: p.el.offsetHeight }));
    const spots = layPlates(boxes, innerWidth, 4, 4, innerHeight - 4);
    if (!first && spots.some((s, i) => s.round !== rounds[i])) return;
    rounds = spots.map((s) => s.round);
    // (a plate with no room in the first round waits for the next: a round is shown, fades, and the next comes in where it was)
    const inRound = new Map<number, number>();
    plates.forEach((p, i) => {
      p.el.style.left = `${spots[i].left}px`;
      p.el.style.top = `${spots[i].top}px`;
      if (!first) return;
      const k = inRound.get(spots[i].round) ?? 0;
      inRound.set(spots[i].round, k + 1);
      const delay = spots[i].round * RISE_MS + k * STAGGER_MS;
      p.el.style.animationDelay = `${delay}ms`;
      p.el.style.visibility = '';
      setTimeout(() => p.el.remove(), RISE_MS + delay + 100);
    });
  };
  const start = () => {
    lay(true);
    requestAnimationFrame(() => lay(false));
  };
  const fonts = document.fonts;
  if (fonts?.load) fonts.load("12px 'Pixelify Sans'").then(start, start);
  else start();
}

/** Take every plate away at once (the screen they stood over has gone). */
export function clearRises(): void {
  layer?.replaceChildren();
}
