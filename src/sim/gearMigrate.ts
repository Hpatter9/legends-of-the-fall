// SEVEN-SLOT GEAR's save migration (docs/notes/gear-runes-design.md, section 10): a save from before seven slots is moved over once, as it
// loads, and marked (`Meta.gearV`). Nothing a player owns is lost:
//
// 1. Every owned piece keeps its id, base, grade, level and wear; its slot is its base's new one (the catalogue does that).
// 2. What is worn moves too: a weapon to the right hand (the Grimoire to the left), armour to the torso, a trinket to its base's new slot.
//    Where two land in one slot (the Grimoire with the Scrying Orb), the trinket stays worn and the other goes to the stash, never sold,
//    and the hero sheet says so (`Meta.gearNote`).
// 3. A hero wearing all three pieces of an old set is given a Common piece of the set in a free slot, so it keeps the set's ability
//    (now its four-piece tier).
// 4. Hester's welcome: every owned piece is mended, once.
//
// A run saved before finishes as it is: what its heroes wear of its finds moves to the new slots the same way (`migrateRunWorn`).
// Pure rules: no Pixi, no DOM, no randomness.

import { EQUIP_BASES, OLD_BASES } from './equipBases';
import { EQUIP_SLOTS, grantEquipment, type EquipSlot, type Equipment } from './equipment';
import { setCounts } from './gearSets';
import type { Meta } from './meta';
import type { Run } from './run';

/** The gear version a save is on once moved over. */
export const GEAR_V = 2;

/** What the move did, for the hero sheet (each line shown once): pieces moved to the stash, and the set pieces given, by hero kind. */
export interface GearNote {
  moved?: Record<string, number[]>;
  gifted?: Record<string, number[]>;
  /** Hester's welcome: everything was mended. */
  mended?: boolean;
}

type Slots = Partial<Record<EquipSlot, number>>;
const OLD_KEYS = ['trinket', 'weapon', 'armour'] as const;

/** One kind's worn slots in the new shape: the old three (a trinket first, so it keeps its place) to their bases' slots, and any slot
 *  already new kept. `pieceOf` finds a piece by id; the ids that found no room come back in `moved`. */
export function moveSlots(raw: unknown, pieceOf: (id: number) => Equipment | undefined): { slots: Slots; moved: number[] } {
  const slots: Slots = {};
  const moved: number[] = [];
  if (!raw || typeof raw !== 'object') return { slots, moved };
  const r = raw as Record<string, unknown>;
  for (const s of EQUIP_SLOTS) {
    const id = r[s];
    const it = typeof id === 'number' ? pieceOf(id) : undefined;
    if (it && EQUIP_BASES[it.base]?.slot === s) slots[s] = it.id;
  }
  for (const old of OLD_KEYS) {
    const id = r[old];
    const it = typeof id === 'number' ? pieceOf(id) : undefined;
    const slot = it && EQUIP_BASES[it.base]?.slot;
    if (!it || !slot) continue;
    if (slots[slot] === undefined) slots[slot] = it.id;
    else moved.push(it.id);
  }
  return { slots, moved };
}

/** Move a save from before seven slots over, once (it does nothing on a save already moved). Run on the raw save as it loads, after its
 *  pieces are read and before what is worn is checked. Returns whether it ran. */
export function migrateGear(m: Meta): boolean {
  if (m.gearV === GEAR_V) return false;
  const items = m.equipment ?? [];
  const byId = new Map(items.map((x) => [x.id, x]));
  const note: GearNote = {};
  const equipped: Record<string, Slots> = {};
  const used = new Set<number>();
  for (const [kind, raw] of Object.entries((m.equipped ?? {}) as Record<string, unknown>)) {
    const { slots, moved } = moveSlots(raw, (id) => (used.has(id) ? undefined : byId.get(id)));
    for (const id of Object.values(slots)) used.add(id!);
    if (Object.keys(slots).length) equipped[kind] = slots;
    if (moved.length) (note.moved ??= {})[kind] = moved;
  }
  m.equipped = equipped;
  // (a full old set: a Common piece of it in a free slot keeps its ability, now the four-piece tier)
  for (const [kind, slots] of Object.entries(equipped)) {
    const bases = Object.values(slots).map((id) => byId.get(id!)?.base).filter((b): b is string => !!b);
    for (const [set, count] of setCounts(bases)) {
      const old = set.pieces.filter((p) => OLD_BASES.has(p));
      if (old.length < 3 || !old.every((p) => bases.includes(p)) || count >= 4) continue;
      const free = set.pieces.find((p) => !bases.includes(p) && slots[EQUIP_BASES[p].slot] === undefined);
      if (!free) continue;
      const made = grantEquipment(m, { base: free, rarity: 1, level: 1 });
      slots[EQUIP_BASES[free].slot] = made.id;
      ((note.gifted ??= {})[kind] ??= []).push(made.id);
    }
  }
  // (Hester's welcome: everything mended, once)
  if (items.some((x) => (x.wear ?? 0) > 0)) note.mended = true;
  for (const it of m.equipment ?? []) delete it.wear;
  for (const it of m.cart ?? []) delete it.wear;
  m.gearV = GEAR_V;
  if (note.moved || note.gifted || note.mended) m.gearNote = note;
  return true;
}

/** A run saved before seven slots: what its heroes wear of its finds (`run.worn`) moves to the new slots (where two land in one, the
 *  weapon goes back to the pack). A run already in the new shape is left as it is. */
export function migrateRunWorn(run: Run): void {
  if (!run.worn) return;
  const byId = new Map((run.pack ?? []).map((x) => [x.id, x]));
  for (const [kind, raw] of Object.entries(run.worn)) {
    const { slots } = moveSlots(raw, (id) => byId.get(id));
    if (Object.keys(slots).length) run.worn[kind] = slots;
    else delete run.worn[kind];
  }
}

/** The hero sheet's lines for a kind from the move (and clears them, so each shows once): "Moved to your stash: Grimoire". */
export function takeGearNote(m: Meta, kind: string, nameOf: (id: number) => string): string[] {
  const n = m.gearNote;
  if (!n) return [];
  const out: string[] = [];
  const moved = n.moved?.[kind];
  if (moved?.length) out.push(`Moved to your stash: ${moved.map(nameOf).join(', ')}`);
  const gifted = n.gifted?.[kind];
  if (gifted?.length) out.push(`A gift to keep your set whole: ${gifted.map(nameOf).join(', ')}`);
  if (n.mended) out.push('Hester’s welcome: everything mended');
  delete n.moved?.[kind];
  delete n.gifted?.[kind];
  delete n.mended;
  if (n.moved && !Object.keys(n.moved).length) delete n.moved;
  if (n.gifted && !Object.keys(n.gifted).length) delete n.gifted;
  if (!n.moved && !n.gifted && !n.mended) delete m.gearNote;
  return out;
}
