// The rift ores on the page (AWAKEN-MATS, `sim/awakenMats.ts`): their icons (Free Mining Pixel Icons, tinted to each class's
// aura by `tools/awaken/ore-icons.py`), a chip for a drop, the pouch of every class's ores held, what an army drops, and the
// ores a fight paid on the result screen. Only reads the meta and the drops; nothing here changes the game.

import { ORES, ORE_TRAITS, ARMY_ORES, cachesOf, oresOf, sumOres, type ArmyOres, type OreDrop } from './sim/awakenMats';
import type { Meta } from './sim/meta';
import { TRAITS } from './sim/traits';
import { warmIcon } from './menuArt';
import chestPic from './art/ui/chest-bronze.png';
import oreGuardian from './art/ui/ore/ore-guardian.png';
import oreBulwark from './art/ui/ore/ore-bulwark.png';
import oreBlade from './art/ui/ore/ore-blade.png';
import oreMarksman from './art/ui/ore/ore-marksman.png';
import oreGunner from './art/ui/ore/ore-gunner.png';
import oreCaster from './art/ui/ore/ore-caster.png';
import oreArcanist from './art/ui/ore/ore-arcanist.png';
import oreSupport from './art/ui/ore/ore-support.png';
import oreBeast from './art/ui/ore/ore-beast.png';
import oreAssassin from './art/ui/ore/ore-assassin.png';
import oreTrickster from './art/ui/ore/ore-trickster.png';
import oreWarden from './art/ui/ore/ore-warden.png';
import oreVanguard from './art/ui/ore/ore-vanguard.png';

export const ORE_ICON: Readonly<Record<string, string>> = { guardian: oreGuardian, bulwark: oreBulwark, blade: oreBlade, marksman: oreMarksman, gunner: oreGunner, caster: oreCaster, arcanist: oreArcanist, support: oreSupport, beast: oreBeast, assassin: oreAssassin, trickster: oreTrickster, warden: oreWarden, vanguard: oreVanguard };
for (const u of Object.values(ORE_ICON)) warmIcon(u);

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** An ore's colour as CSS. */
export const oreHex = (trait: string): string => `#${(ORES[trait]?.colour ?? 0xffffff).toString(16).padStart(6, '0')}`;

/** A class trait's name, as the traits show it ("Blade"). */
export const classWord = (trait: string): string => (TRAITS as Record<string, { name: string }>)[trait]?.name ?? trait;

/** An ore's icon. */
export function oreIcon(trait: string, cls = 'oreIco'): HTMLImageElement {
  const img = el('img', cls);
  img.src = ORE_ICON[trait] ?? '';
  img.alt = ORES[trait]?.name ?? '';
  img.draggable = false;
  return img;
}

/** The Rift Cache's picture (the game's own bronze chest, its closed frame). */
export function cacheIcon(cls = 'oreCacheIco'): HTMLImageElement {
  const img = el('img', cls);
  img.src = chestPic;
  img.alt = 'Rift Cache';
  img.draggable = false;
  return img;
}

/** A chip for a drop: the icon, "+3 Whetblood Ore" in its colour, and a small line under it (where it came from). */
export function oreChip(d: OreDrop, why = ''): HTMLElement {
  const c = el('span', 'oreChip');
  c.style.setProperty('--ore', oreHex(d.trait));
  const words = el('small');
  words.append(el('b', '', `+${d.n} ${ORES[d.trait]?.name ?? d.trait}`));
  if (why) words.append(el('br'), document.createTextNode(why));
  c.append(oreIcon(d.trait), words);
  return c;
}

/** A chip for Rift Caches won. */
export function cacheChip(n: number, why = 'Open it on any hero\'s awakening panel: 8 ores of that hero\'s class'): HTMLElement {
  const c = el('span', 'oreChip cache');
  const words = el('small');
  words.append(el('b', '', `Rift Cache${n > 1 ? ` ×${n}` : ''}`), el('br'), document.createTextNode(why));
  c.append(cacheIcon('oreIco'), words);
  return c;
}

/** The pouch: every class's ores held (the empty ones dimmed), and the Rift Caches waiting. */
export function orePouch(m: Meta): HTMLElement {
  const root = el('div', 'orePouch');
  const head = el('div', 'orePouchHead');
  head.append(el('b', '', 'Rift ores'), el('small', '', 'for awakening'));
  if (cachesOf(m)) {
    const cache = el('span', 'orePouchCache');
    cache.append(cacheIcon('oreCacheIco'), document.createTextNode(`Rift Cache ×${cachesOf(m)}`));
    head.append(cache);
  }
  const grid = el('div', 'orePouchGrid');
  for (const t of ORE_TRAITS) {
    const n = oresOf(m, t);
    const cell = el('span', n ? '' : 'none');
    cell.title = `${ORES[t].name}: ${n}`;
    cell.append(oreIcon(t), el('b', '', String(n)));
    grid.append(cell);
  }
  root.append(head, grid);
  return root;
}

/** What an army drops: its kinds' icons and names, for its card. */
export function armyOreRow(army: string): HTMLElement | null {
  const kinds = ARMY_ORES[army];
  if (!kinds?.length) return null;
  const row = el('div', 'asOres');
  row.append(el('small', '', 'Rift ores'));
  for (const t of kinds) {
    const k = el('span');
    k.style.setProperty('--ore', oreHex(t));
    k.append(oreIcon(t), document.createTextNode(ORES[t].name));
    row.append(k);
  }
  row.title = 'Dropped now and then by its boss waves (more on a harder tier), and always on a tier\'s first clear';
  return row;
}

/** The ores an army fight paid, on the result screen (hidden when none). */
export function drawOreGain(root: HTMLElement, gain: ArmyOres | null): void {
  root.replaceChildren();
  const drops = sumOres(gain?.drops ?? []);
  root.hidden = !drops.length && !gain?.cache;
  if (root.hidden) return;
  root.append(el('h4', '', 'Rift ores'));
  const list = el('div', 'oreList');
  list.append(...drops.map((d) => oreChip(d, `for the ${classWord(d.trait)} heroes`)));
  if (gain?.cache) list.append(cacheChip(gain.cache, 'A first Mythic clear: open it on any hero\'s awakening panel'));
  root.append(list);
}
