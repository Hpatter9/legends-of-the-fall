// The Schools of the Crown (KING-SPELLS batch 2, the owner-approved revamp: docs/notes/king-spells-design.md, docs/notes/king-spells-b2.md).
// Each of the eight rulers leads a school of the king's spells and one Decree. The loadout is three slots from the ruler's school and one
// open slot for any spell the save knows; the power budget is gone. Every save always knows its ruler's school's first two spells; the rest
// come from the Mage Tower, the milestones and the chests' scrolls as before. Changing ruler (free, in Settings) re-fits the loadout to the
// new school. The ruler is a page setting, so the page passes its id in; these rules are pure and know nothing of the page.
//
// Batch 2 built the schools from the first 21 spells; batch 4 added fourteen new ones, so every school has five or six.
//
// Pure rules: no Pixi, no DOM, no randomness.

import { FIRST_SPELL, SPELLS, type Loadout, type SpellId } from './spells';
import type { DecreeId } from './decrees';

/** The rulers' ids, as the page's ruler picker names them (`src/rulerRules.ts`; `test/king-spells-b2.test.ts` checks the two match). */
export type SchoolId = 'iron_stag' | 'sun_viper' | 'frost_witch' | 'ash_empress' | 'rose_duchess' | 'moon_oracle' | 'storm_corsair' | 'gilded_necromancer';

export interface School {
  id: SchoolId;
  /** What the school is called in the spellbook ("Steel"). */
  name: string;
  /** Its spells, the two every save knows first. */
  spells: readonly SpellId[];
  decree: DecreeId;
}

const school = (id: SchoolId, name: string, spells: SpellId[], decree: DecreeId): School => ({ id, name, spells, decree });

export const SCHOOLS: Record<SchoolId, School> = {
  iron_stag: school('iron_stag', 'Steel', ['rally', 'shield', 'bulwark', 'lance', 'smite', 'quake'], 'standFast'),
  ash_empress: school('ash_empress', 'Fire', ['meteor', 'warcry', 'starfall', 'smite', 'firewall'], 'redSky'),
  frost_witch: school('frost_witch', 'Ice', ['frost', 'shield', 'deepfreeze', 'icewall', 'shatter'], 'longWinter'),
  storm_corsair: school('storm_corsair', 'Storm', ['chain', 'haste', 'blink', 'gale', 'thunderclap'], 'tempest'),
  rose_duchess: school('rose_duchess', 'Thorns', ['hex', 'poison', 'cleanse', 'snare', 'charm'], 'rosePrice'),
  moon_oracle: school('moon_oracle', 'Stars', ['haste', 'renewal', 'blink', 'starfall', 'foresight'], 'stopClock'),
  sun_viper: school('sun_viper', 'Sun', ['heal', 'lance', 'cleanse', 'sunbeam', 'venom', 'mirage'], 'highNoon'),
  gilded_necromancer: school('gilded_necromancer', 'Death', ['hex', 'wolves', 'resurrect', 'drain', 'bonewall', 'raisedead'], 'gildedToll'),
};
export const SCHOOL_IDS = Object.keys(SCHOOLS) as SchoolId[];
/** The default ruler's school, and where an unknown id falls back. */
export const DEFAULT_SCHOOL: SchoolId = 'iron_stag';

/** The school slots hold three spells; one more, the open slot, takes any spell the save knows. */
export const SCHOOL_SLOTS = 3;
/** The spell a save's open slot starts with (the owner's call: Heal stays in reach of every ruler). */
export const OPEN_START: SpellId = FIRST_SPELL;
/** The loadout's slots, all told: the three school slots and the open slot. How many a save may fill is `spellSlots` (SPELL-SLOTS). */
export const LOADOUT_SLOTS = SCHOOL_SLOTS + 1;

export const schoolOf = (id: string | undefined): School => SCHOOLS[(id && id in SCHOOLS ? id : DEFAULT_SCHOOL) as SchoolId];
/** The two spells of a school every save knows. */
export const firstSpells = (s: School): SpellId[] => s.spells.slice(0, 2);
/** Which schools a spell belongs to. */
export const schoolsOfSpell = (id: SpellId): School[] => SCHOOL_IDS.map((k) => SCHOOLS[k]).filter((s) => s.spells.includes(id));

/** What the fight casts: the school slots, then the open slot. */
export const castList = (l: Loadout): SpellId[] => [...l.equipped, ...(l.open && !l.equipped.includes(l.open) ? [l.open] : [])];

/**
 * Fit a loadout to a school: its first two spells become known; the school slots keep the spells of this school (in their order), and only when
 * the school is new to the loadout (a ruler changed, or a save from before the schools) are empty slots filled from the known spells of the
 * school, and a spell that no longer fits moves to the open slot (if it is free; else Heal goes there when known). A loadout already fitted to
 * this school keeps the player's choices, empty slots included. Changes `l` and returns it.
 *
 * SPELL-SLOTS: `slots` is how many slots the save has open (`spellSlots`; all four when not said). A loadout holding more than that keeps
 * Heal first, then its spells in the order the fight casts them.
 */
export function fitSchool(l: Loadout, id: string | undefined, slots = LOADOUT_SLOTS): Loadout {
  const s = schoolOf(id);
  for (const f of firstSpells(s)) if (!l.owned.includes(f)) l.owned.push(f);
  const fresh = l.school !== s.id;
  const was = [...l.equipped];
  l.equipped = was.filter((x) => s.spells.includes(x)).slice(0, SCHOOL_SLOTS);
  if (l.open && (!l.owned.includes(l.open) || l.equipped.includes(l.open))) delete l.open;
  if (fresh) {
    for (const x of s.spells) if (l.equipped.length < SCHOOL_SLOTS && l.owned.includes(x) && !l.equipped.includes(x) && x !== l.open) l.equipped.push(x);
    const left = was.find((x) => !l.equipped.includes(x));
    if (!l.open) l.open = left ?? (l.owned.includes(OPEN_START) && !l.equipped.includes(OPEN_START) ? OPEN_START : undefined);
    if (!l.open) delete l.open;
    l.school = s.id;
  }
  const all = castList(l);
  if (all.length > slots) {
    const keep = [...all.filter((x) => x === OPEN_START), ...all.filter((x) => x !== OPEN_START)].slice(0, Math.max(0, slots));
    l.equipped = l.equipped.filter((x) => keep.includes(x));
    if (l.open && !keep.includes(l.open)) delete l.open;
  }
  return l;
}

/**
 * SPELL-SLOTS: fill a loadout's empty slots, up to `slots` spells in all, with the spells a save carries by default: Heal in the open slot
 * (if it is free and Heal is not a school spell already in), then the school's known spells in the school's order. Changes `l` and returns
 * the spells it added. Used when a slot opens while the spellbook is still shut, and by the balance tools' player.
 */
export function fillSlots(l: Loadout, id: string | undefined, slots = LOADOUT_SLOTS): SpellId[] {
  const s = schoolOf(id);
  const added: SpellId[] = [];
  while (castList(l).length < slots) {
    const on = castList(l);
    const next = !l.open && l.owned.includes(OPEN_START) && !on.includes(OPEN_START) && !s.spells.includes(OPEN_START) ? OPEN_START : l.equipped.length < SCHOOL_SLOTS ? s.spells.find((x) => l.owned.includes(x) && !on.includes(x)) : undefined;
    if (!next || !equipSpell(l, next, id, slots)) break;
    added.push(next);
  }
  return added;
}

/** Why a spell can't be equipped under this school now, or null when it can. A school spell takes a school slot, or the open slot once those
 *  are full; any other spell takes the open slot. SPELL-SLOTS: no more spells than the save has slots open (`slots`; all four when not said). */
export function equipBlock(l: Loadout, id: SpellId, schoolId: string | undefined, slots = LOADOUT_SLOTS): string | null {
  const s = schoolOf(schoolId);
  if (!SPELLS[id]) return 'No such spell';
  if (!l.owned.includes(id)) return 'Not learnt yet';
  if (castList(l).includes(id)) return 'Already equipped';
  if (slots < LOADOUT_SLOTS && castList(l).length >= slots) return `Your ${slots === 1 ? 'one open slot is' : `${slots} open slots are`} full: unequip a spell first, or win army stars to open another`;
  const own = s.spells.includes(id);
  if (own && l.equipped.length < SCHOOL_SLOTS) return null;
  if (!l.open) return null;
  return own ? 'The school slots and the open slot are full: unequip one first' : `The open slot holds ${SPELLS[l.open].name}: unequip it first`;
}

/** Equip a spell under this school. False (and nothing changed) when `equipBlock` says no. */
export function equipSpell(l: Loadout, id: SpellId, schoolId: string | undefined, slots = LOADOUT_SLOTS): boolean {
  if (equipBlock(l, id, schoolId, slots)) return false;
  if (schoolOf(schoolId).spells.includes(id) && l.equipped.length < SCHOOL_SLOTS) l.equipped.push(id);
  else l.open = id;
  return true;
}

/** Take a spell out of the loadout (a school slot or the open slot). False when it was in neither. */
export function unequipSpell(l: Loadout, id: SpellId): boolean {
  if (l.open === id) {
    delete l.open;
    return true;
  }
  const i = l.equipped.indexOf(id);
  if (i < 0) return false;
  l.equipped.splice(i, 1);
  return true;
}
