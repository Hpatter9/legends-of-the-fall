// Where the king's spells come from, now that crowns no longer buy them: the everyday ones are taught by the Mage Tower as
// it rises, the grand ones are earned by a milestone of the game (an army cleared, a wave of the Last Stand), and any spell
// not yet known can turn up as a scroll in a gold or Mythic chest, so an unlucky or slow player still has a way in.
// `grantSpells` is called when a save loads, after a fight settles and when a build stands, and teaches every spell whose
// source is met (a save that already owns one keeps it). Pure rules: no Pixi, no DOM.

import { armyCleared } from './armies';
import type { Meta } from './meta';
import { mixSeed, Rng } from './rng';
import { SPELL_IDS, SPELLS, STARTER_SPELLS, type SpellId } from './spells';

/** The Mage Tower level that teaches each everyday spell (three a level, the tower's four levels). */
export const TOWER_SPELLS: Readonly<Partial<Record<SpellId, number>>> = {
  shield: 1, cleanse: 1, smite: 1,
  hex: 2, chain: 2, blink: 2,
  poison: 3, frost: 3, lance: 3,
  rally: 4, renewal: 4, warcry: 4,
};

export interface SpellMilestone {
  /** The end of the line "Earned when you …". */
  line: string;
  met(m: Meta): boolean;
  /** How far on it is, for the ones that count up. */
  meter?(m: Meta): { now: number; need: number };
}

// (the names are written out: this module is read while `meta.ts` loads, before the armies are)
const clearOf = (army: string, name: string): SpellMilestone => ({ line: `clear the ${name}`, met: (m) => armyCleared(m, army) });
// (the Last Stand's best wave counts, and floors an old save climbed in the endless tower still do, as for the heroes)
const standOrFloors = (m: Meta): number => Math.max(m.tower, m.stand ?? 0);
const wave = (n: number): SpellMilestone => ({
  line: `reach wave ${n} of the Last Stand`,
  met: (m) => standOrFloors(m) >= n,
  meter: (m) => ({ now: Math.min(n, standOrFloors(m)), need: n }),
});

/** The grand spells, each earned by the thing it suits. */
export const MILESTONE_SPELLS: Readonly<Partial<Record<SpellId, SpellMilestone>>> = {
  resurrect: clearOf('undead', 'Undead Legion'),
  wolves: clearOf('beasts', 'Beast Packs'),
  deepfreeze: clearOf('ogres', 'Ogre Clans'),
  starfall: clearOf('infernal', 'Infernal Host'),
  quake: clearOf('golems', 'Golem Forge'),
  bulwark: wave(15),
};

/** The chance a chest holds a spell scroll (one spell not yet known, picked from its own side stream); other chests hold none. */
export const SCROLL_CHANCE: Readonly<Record<string, number>> = { gold: 0.3, mythic: 0.6 };
/** The salt of a chest's scroll stream (mixed with the chest's own seed). */
export const SCROLL_SALT = 0x5c2011;

/** Whether the spell's own source (the tower or a milestone) has been met. Scrolls aside. */
export function sourceMet(m: Meta, id: SpellId): boolean {
  if (STARTER_SPELLS.includes(id)) return true;
  const lvl = TOWER_SPELLS[id];
  if (lvl !== undefined) return m.castle.mageTower >= lvl;
  return MILESTONE_SPELLS[id]?.met(m) ?? false;
}

/** Teach every spell whose source is met and that is not owned yet. Returns the spells learnt (in book order). */
export function grantSpells(m: Meta): SpellId[] {
  const learnt: SpellId[] = [];
  for (const id of SPELL_IDS) {
    if (m.spellbook.owned.includes(id) || !sourceMet(m, id)) continue;
    m.spellbook.owned.push(id);
    learnt.push(id);
  }
  return learnt;
}

/** The spell scroll a chest holds, or null: drawn from a side stream of its seed, among the spells this save does not know yet. */
export function rollScroll(m: Meta, seed: number, kind: string): SpellId | null {
  const chance = SCROLL_CHANCE[kind] ?? 0;
  if (!chance) return null;
  const rng = new Rng(mixSeed(seed, SCROLL_SALT));
  if (!rng.chance(chance)) return null;
  const unknown = SPELL_IDS.filter((id) => !m.spellbook.owned.includes(id));
  return unknown.length ? rng.pick(unknown) : null;
}

/** What the spellbook shows on a spell not yet known: where it comes from, a bar for one that counts up, and an order for the book (the tower's first, by level, then the milestones). */
export interface SpellLock {
  line: string;
  now: number;
  need: number;
  rank: number;
}
export function spellLock(m: Meta, id: SpellId): SpellLock | null {
  if (m.spellbook.owned.includes(id)) return null;
  const lvl = TOWER_SPELLS[id];
  if (lvl !== undefined) return { line: `Taught by the Mage Tower at level ${lvl}`, now: Math.min(lvl, m.castle.mageTower), need: lvl, rank: lvl };
  const ms = MILESTONE_SPELLS[id];
  if (ms) {
    const meter = ms.meter?.(m);
    return { line: `Earned when you ${ms.line}`, now: meter?.now ?? 0, need: meter?.need ?? 0, rank: 10 + SPELL_IDS.indexOf(id) };
  }
  return { line: 'Found as a scroll in gold chests', now: 0, need: 0, rank: 99 };
}

/** The words of a scroll's reveal line. */
export const scrollWords = (id: SpellId): string => `Spell scroll: ${SPELLS[id].name}`;

// every spell beyond the starting three has a source
for (const id of SPELL_IDS)
  if (!STARTER_SPELLS.includes(id) && TOWER_SPELLS[id] === undefined && !MILESTONE_SPELLS[id]) throw new Error(`The spell ${id} has no source`);
