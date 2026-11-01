// A run's gear. RUN-GEAR (the books-shop-gear design's batch 4, docs/notes/run-gear.md; the owner's rule: "runs drop and use real
// pieces"): everything a run started since then finds is a real piece of equipment (a base of `equipBases.ts`, a grade, an item level,
// durability), worn for real and kept. A run saved before (no `run.real`) finishes on the old rules with its simple gear (`gear.ts`),
// which comes home once as real pieces when it ends.
//
// - **Finding.** Every source that handed out simple gear hands out a real piece instead (`findGear`, `findSlotGear`): it draws from its
//   own stream exactly what it drew before (the slot), and the base, grade and level from a side stream (`FIELD_SALT`), so the rest of
//   every run (its events, relics and foes) draws as before. The piece rides the event's `Gear` (`Gear.piece`) and lands in the run's
//   pack (`run.pack`).
// - **Wearing.** A found piece is worn by a hero kind for the run (`run.worn`: kind, slot, piece id), so merges and partings leave it
//   where it is. In a run that brings the lasting kit (armies, the daily, quest battles) it takes the place of that kind's lasting piece in
//   its slot, and when the run ends it stays worn for real (the old piece goes to the stash). In a run whose heroes start bare (the spire,
//   the Calamity: `run.local`) it is worn for the run only, and every piece goes to the stash at the end.
// - **Fresh from the field.** A piece found in this run gives its main stats times `FIELD_BOOST` while the run lasts; at home it is a plain
//   piece. Abilities are not boosted.
// - **Upgrades** (the road's smiths, the mystery forges) only ever touch a piece found in this run, never the lasting kit.
// - **The run's end** (`settleFinds`): everything found is kept; a full stash sends the overflow to the camp's cart, and past the cart the
//   lowest are sold for their price.
//
// Pure rules: no Pixi, no DOM; every roll comes from a stream of the run's seed.

import { MAX_TIER, SLOTS, makeGear, dropGear, gearText, pieceGear, type Gear, type Slot } from './gear';
import { heroOf, type Owned, type Run } from './run';
import {
  ABILITY_WORTH,
  EQUIP_BASES,
  EQUIP_LIST,
  EQUIP_SLOTS,
  MAX_ITEM_LEVEL,
  addStats,
  bringHome,
  capStats,
  emptyStats,
  equipStats,
  grantEquipment,
  equipItem,
  itemScore,
  itemStats,
  setScore,
  STAT_KEYS,
  wornIn,
  addSetBonus,
  type EquipSlot,
  type EquipStats,
  type Equipment,
  type Rarity,
} from './equipment';
import type { Meta } from './meta';
import { mixSeed, Rng } from './rng';
import { armyIndex } from './armies';
import { AUTO_WEAR, wearState, type Fought, type WearNote } from './wear';
import { maxDurability, itemName } from './equipment';

/** The side stream a find's base, grade and level come from: `mixSeed(run.seed, FIELD_SALT, stage, source, id)`. */
export const FIELD_SALT = 0xf1e1d;
/** An auto-replay run's half rate: `mixSeed(run.seed, AUTO_FIND_SALT, id)` (a boss's find always comes home). */
export const AUTO_FIND_SALT = 0xa0f1d;
/** An old run's simple gear coming home: `mixSeed(run.seed, CARRY_SALT, gear.id)`. */
export const CARRY_SALT = 0xca77e;
/** A piece found in this run gives its main stats times this while the run lasts: in a run that brings the lasting kit, and in one whose
 *  heroes start bare (the spire, the Calamity). Tuned by the balance tools (docs/notes/run-gear.md). */
export const FIELD_BOOST = { army: 2, bare: 3 };
/** An auto-replay run brings each find home this share of the time (a boss's always). */
export const AUTO_FIND_SHARE = 0.5;
/** Item levels a run's upgrade (a smith's temper, a forge) gives a found piece; the lesser upgrades give `SMALL_UPGRADE`. */
export const UPGRADE_LEVELS = 3;
export const SMALL_UPGRADE = 2;
/** A found piece's price in run gold (the merchant, the cart, the road's and mystery rooms' smiths), by grade, plus 2 a stage. */
export const FIELD_PRICE: readonly number[] = [0, 40, 90, 200, 450, 900];

/** The sources of run gear (each its own side stream, so two finds at one stage differ). */
export const SOURCE = { boss: 1, curse: 2, merchant: 3, chest: 4, cart: 5, road: 6, heir: 7, mystery: 8, shop: 9, floorChest: 10, floor: 11, elite: 12 } as const;

/** Whether a run finds real pieces (every run started since RUN-GEAR); an older run finishes on its simple gear. */
export const isReal = (run: Run): boolean => !!run.real;
/** The tag a run's finds carry (`Equipment.found`): its seed. */
export const runTag = (run: Run): number => run.seed >>> 0 || 1;

/** A run's difficulty column for the grade table: 0 Normal, 1 Hard, 2 Elite and above. */
const tierColumn = (run: Run): number => {
  const t = run.mode?.kind === 'army' ? run.mode.tier ?? 0 : 0;
  return Math.min(2, Math.max(0, t));
};

/** The grade table: for each step (1 to 4), on Normal, Hard and Elite and above, the grade and the chance of the next grade up. */
export const GRADE_TABLE: Record<number, [number, number][]> = {
  1: [[1, 0], [1, 0.25], [2, 0]],
  2: [[1, 1 / 3], [2, 0], [2, 0.25]],
  3: [[2, 0], [2, 0.25], [3, 0]],
  4: [[2, 0.25], [3, 0], [3, 1 / 6]],
};

/** A find's grade from its step (1 + a tier every 8 gear stages, plus the source's bonus) and the run's difficulty (the design's table);
 *  never Mythic, which stays the chests' and combining's prize. */
export function fieldGrade(rng: Rng, step: number, column: number): Rarity {
  const s = Math.max(1, Math.min(4, Math.floor(step)));
  const [g, up] = GRADE_TABLE[s][Math.max(0, Math.min(2, column))];
  return (up > 0 && rng.chance(up) ? g + 1 : g) as Rarity;
}

/** A find's item level: 1 + 3 for each army on (the run's army, else the furthest cleared, `run.findAt`), and 1 for every 4 waves the run
 *  has reached, at most 20. */
export function fieldLevel(run: Run): number {
  const army = run.mode?.kind === 'army' ? Math.max(0, armyIndex(run.mode.army)) : Math.max(0, run.findAt ?? 0);
  return Math.max(1, Math.min(MAX_ITEM_LEVEL, 1 + 3 * army + Math.floor(Math.max(0, run.stage) / 4)));
}

const BASES_OF: Record<EquipSlot, readonly string[]> = { weapon: [], armour: [], trinket: [] };
for (const b of EQUIP_LIST) (BASES_OF[b.slot] as string[]).push(b.id);
/** The equipment slot of a run gear slot (a charm is a trinket). */
export const equipSlotOf = (slot: Slot): EquipSlot => (slot === 'charm' ? 'trinket' : slot);

/** A real piece for a real-gear run in `slot` at `step`, from its side stream. Carried as run gear (`Gear.piece`). */
export function fieldPiece(run: Run, id: number, slot: Slot, step: number, stage: number, source: number): Gear {
  const rng = new Rng(mixSeed(run.seed, FIELD_SALT, stage, source, id));
  const base = rng.pick(BASES_OF[equipSlotOf(slot)]);
  const rarity = fieldGrade(rng, step, tierColumn(run));
  const piece: Equipment = { id, base, rarity, level: fieldLevel(run), found: runTag(run) };
  return pieceGear(piece);
}

/** A random find for a stage (in place of `dropGear`): the slot from the source's stream as before (one draw), and in a real-gear run the
 *  piece from its side stream. A run on the old rules gets its simple gear. */
export function findGear(run: Run, rng: Rng, id: number, stage: number, bonusTier = 0, source: number = SOURCE.chest): Gear {
  if (!isReal(run)) return dropGear(rng, id, stage, bonusTier);
  const slot = SLOTS[rng.int(0, SLOTS.length - 1)];
  return fieldPiece(run, id, slot, 1 + Math.floor((stage - 1) / 8) + bonusTier, stage, source);
}

/** A find of a given slot and tier (in place of `makeGear` for a fresh piece): nothing is drawn from the source's stream. */
export function findSlotGear(run: Run, id: number, slot: Slot, tier: number, stage: number, source: number): Gear {
  return isReal(run) ? fieldPiece(run, id, slot, tier, stage, source) : makeGear(id, slot, tier);
}

/** What a piece sells for in run gold: a simple piece by its tier (the old merchant's 28 a tier), a real one by its grade; plus 2 a stage. */
export const findPrice = (g: Gear, stage: number, perTier = 28): number => (g.piece ? FIELD_PRICE[g.piece.rarity] : perTier * g.tier) + 2 * stage;

/** The line a find gets on the result screen ("Frostbrand (weapon, Rare Lv 7: +6% attack)"). */
export const foundLine = (g: Gear): string => `${g.name} (${g.slot}, ${gearText(g)})`;

/** Put a find in the run's pack: a real piece in `run.pack`, simple gear in `run.items`. */
export function stow(run: Run, g: Gear, source?: number): void {
  if (g.piece) {
    (run.pack ??= []).push({ ...g.piece, found: runTag(run) });
    if (source === SOURCE.boss) (run.bossFinds ??= []).push(g.piece.id);
  } else (run.items ??= []).push(g);
}

// ---- the pack and what the kinds wear -----------------------------------------------------------------------------------

/** A found piece of the run, by id. */
export const packPiece = (run: Run, id: number): Equipment | undefined => run.pack?.find((x) => x.id === id);
/** The found piece a kind wears in a slot this run, if any. */
export function foundIn(run: Run, kind: string, slot: EquipSlot): Equipment | undefined {
  const id = run.worn?.[kind]?.[slot];
  return id === undefined ? undefined : packPiece(run, id);
}
/** Which kind wears a found piece this run. */
export function finderOf(run: Run, id: number): string | undefined {
  for (const [kind, slots] of Object.entries(run.worn ?? {})) if (Object.values(slots).includes(id)) return kind;
  return undefined;
}
/** The found pieces no kind wears, optionally of one slot. */
export function spareFinds(run: Run, slot?: EquipSlot): Equipment[] {
  return (run.pack ?? []).filter((x) => finderOf(run, x.id) === undefined && (!slot || EQUIP_BASES[x.base]?.slot === slot));
}
/** Every found piece of the run as run gear (the road's smiths and the mystery forges work on these). */
export const findsAsGear = (run: Run): Gear[] => (run.pack ?? []).map(pieceGear);

/** Put a found piece on a kind for the run (a kind wearing it already gives it up; the piece in that slot goes back to the pack). */
export function wearFound(run: Run, kind: string, id: number): boolean {
  const it = packPiece(run, id);
  const slot = it && EQUIP_BASES[it.base]?.slot;
  if (!it || !slot || run.over) return false;
  const was = finderOf(run, id);
  if (was) takeOffFound(run, was, slot);
  ((run.worn ??= {})[kind] ??= {})[slot] = id;
  return true;
}
/** Take a kind's found piece in a slot back to the pack (its lasting piece counts again). */
export function takeOffFound(run: Run, kind: string, slot: EquipSlot): boolean {
  const slots = run.worn?.[kind];
  if (!slots || slots[slot] === undefined) return false;
  delete slots[slot];
  if (!Object.keys(slots).length) delete run.worn![kind];
  return true;
}

/** Raise a found piece of this run by item levels (at most 20), or by a grade (`grade`, at most Epic). False when it is not this run's. */
export function upgradeFound(run: Run, id: number, levels: number, grade = false): boolean {
  const it = packPiece(run, id);
  if (!it || it.found !== runTag(run)) return false;
  if (grade && it.rarity < 3) it.rarity = (it.rarity + 1) as Rarity;
  else it.level = Math.min(MAX_ITEM_LEVEL, it.level + levels);
  return true;
}
/** Lose a found piece (a wager lost, a piece melted). */
export function loseFound(run: Run, id: number): boolean {
  const i = run.pack?.findIndex((x) => x.id === id) ?? -1;
  if (i < 0) return false;
  const kind = finderOf(run, id);
  if (kind) takeOffFound(run, kind, EQUIP_BASES[run.pack![i].base].slot);
  run.pack!.splice(i, 1);
  return true;
}
/** Whether a piece of run gear can be raised (simple gear below the top tier; a found piece below level 20). */
export const canTemper = (g: Gear): boolean => (g.piece ? g.piece.level < MAX_ITEM_LEVEL : g.tier < MAX_TIER);
/** What a temper makes of a piece (a preview): a simple piece a tier up, a found piece `UPGRADE_LEVELS` higher. */
export const tempered = (g: Gear): Gear => (g.piece ? pieceGear({ ...g.piece, level: Math.min(MAX_ITEM_LEVEL, g.piece.level + UPGRADE_LEVELS) }) : makeGear(g.id, g.slot, g.tier + 1));

// ---- strength in a fight --------------------------------------------------------------------------------------------------

/** The share of a found piece's main stats added on top of its own while fresh (range is never boosted, nor an ability). */
function freshExtra(it: Equipment, kind: string, boost: number): EquipStats {
  const s = itemStats(it, kind);
  const out = emptyStats();
  for (const k of STAT_KEYS) if (k !== 'range') out[k] = s[k] * (boost - 1);
  return out;
}
const boostOfRun = (run: Run): number => (run.local ? FIELD_BOOST.bare : FIELD_BOOST.army);

/** The save as a kind fights this run: its lasting kit with the found pieces it wears in their slots (the pieces given ids below nothing,
 *  so they never meet a saved id). The same meta when the kind wears no find. */
export function asWorn(meta: Meta, run: Run, kind: string): Meta {
  const over = run.worn?.[kind];
  if (!over || !Object.keys(over).length) return meta;
  const pieces = Object.values(over)
    .map((id) => packPiece(run, id!))
    .filter((x): x is Equipment => !!x)
    .map((x) => ({ ...x, id: -x.id }));
  const slots: Partial<Record<EquipSlot, number>> = { ...meta.equipped?.[kind] };
  for (const [s, id] of Object.entries(over) as [EquipSlot, number][]) slots[s] = -id;
  return { ...meta, equipment: [...(meta.equipment ?? []), ...pieces], equipped: { ...meta.equipped, [kind]: slots } };
}

/** The fresh share of the found pieces a kind wears this run (none broken), to add over its kit's stats. */
function freshOf(run: Run, kind: string): EquipStats | undefined {
  let out: EquipStats | undefined;
  for (const slot of EQUIP_SLOTS) {
    const it = foundIn(run, kind, slot);
    if (!it || wearState(it) === 'broken' || it.found !== runTag(run)) continue;
    addStats((out ??= emptyStats()), freshExtra(it, kind, boostOfRun(run)));
  }
  return out;
}

/** A kind's stats for a fight of a real-gear run that brings the lasting kit: `base` (the page's `heroStats`, the bot's `equipStats`) read
 *  over the kit with its found pieces in their slots, and their fresh share on top, capped. A run on the old rules gets `base` as it is. */
export function runKitStats(meta: Meta, run: Run, kind: string, base: (m: Meta, kind: string) => EquipStats | undefined): EquipStats | undefined {
  if (!isReal(run) || run.local) return base(meta, kind);
  const total = base(asWorn(meta, run, kind), kind);
  const fresh = freshOf(run, kind);
  if (!fresh) return total;
  return capStats(total ? addStats(total, fresh) : fresh);
}

/** A kind's stats in a run whose heroes start bare: only the found pieces it wears (and their sets), fresh. Undefined when it wears none. */
export function bareKitStats(run: Run, kind: string): EquipStats | undefined {
  if (!isReal(run)) return undefined;
  const worn = EQUIP_SLOTS.map((slot) => foundIn(run, kind, slot)).filter((x): x is Equipment => !!x && wearState(x) !== 'broken');
  if (!worn.length) return undefined;
  const total = emptyStats();
  for (const it of worn) addStats(total, itemStats(it, kind));
  addSetBonus(total, worn.map((x) => x.base));
  const fresh = freshOf(run, kind);
  return capStats(fresh ? addStats(total, fresh) : total);
}

// ---- Equip best -----------------------------------------------------------------------------------------------------------

/** A found piece's worth to a kind while fresh: its main stats' score times the boost, its ability's as it is. */
export function freshScore(it: Equipment, kind: string, boost: number): number {
  const s = itemStats(it, kind);
  const ability = s.abilities.reduce((n, a) => n + a.s * ABILITY_WORTH, 0);
  return (itemScore(it, kind) - ability) * boost + ability;
}

/** Dress the kinds (in the order given, the strongest first) from the run's pack: each kind's whole kit is chosen together, its found
 *  pieces (fresh) against its lasting piece in each slot (none in a run whose heroes start bare), counting sets; a slot changes only when
 *  the whole beats what it wears. A piece goes to one kind. Returns how many slots changed. */
export function equipBestReal(run: Run, meta: Meta | undefined, kinds: readonly string[]): number {
  if (run.over || !isReal(run)) return 0;
  const boost = boostOfRun(run);
  const bare = !!run.local || !meta;
  const list = [...new Set(kinds)];
  // (what the kinds named wear goes back to the pool; a kind not named keeps its finds)
  const before = new Map(list.map((k) => [k, { ...(run.worn?.[k] ?? {}) }]));
  for (const k of list) delete run.worn?.[k];
  const taken = new Set<number>(Object.values(run.worn ?? {}).flatMap((s) => Object.values(s) as number[]));
  let changed = 0;
  for (const kind of list) {
    const options = EQUIP_SLOTS.map((slot) => {
      const home = !bare ? wornIn(meta!, kind, slot) : undefined;
      const opts: { it?: Equipment; found: boolean; score: number }[] = [{ it: home, found: false, score: home && wearState(home) !== 'broken' ? itemScore(home, kind) : 0 }];
      const bestOfBase = new Map<string, { it: Equipment; found: boolean; score: number }>();
      for (const it of run.pack ?? []) {
        if (EQUIP_BASES[it.base]?.slot !== slot || taken.has(it.id) || wearState(it) === 'broken') continue;
        const score = it.found === runTag(run) ? freshScore(it, kind, boost) : itemScore(it, kind);
        const held = bestOfBase.get(it.base);
        if (!held || score > held.score + 1e-9) bestOfBase.set(it.base, { it, found: true, score });
      }
      opts.push(...bestOfBase.values());
      return opts;
    });
    const was = before.get(kind) ?? {};
    // (what the kind wore is the bar: it changes only for a better whole)
    const scoreOf = (pick: { it?: Equipment; score: number }[]) => pick.reduce((n, o) => n + o.score, 0) + setScore(pick.filter((o) => o.it).map((o) => o.it!.base), kind);
    const current = EQUIP_SLOTS.map((slot, i) => options[i].find((o) => o.found && o.it?.id === was[slot]) ?? options[i][0]);
    let top = scoreOf(current);
    let pick = current;
    for (const w of options[0])
      for (const a of options[1])
        for (const t of options[2]) {
          const total = scoreOf([w, a, t]);
          if (total > top + 1e-9) (top = total), (pick = [w, a, t]);
        }
    EQUIP_SLOTS.forEach((slot, i) => {
      const o = pick[i];
      if (o.found && o.it) {
        ((run.worn ??= {})[kind] ??= {})[slot] = o.it.id;
        taken.add(o.it.id);
      }
      if ((o.found ? o.it?.id : undefined) !== was[slot]) changed++;
    });
  }
  return changed;
}

// ---- wear in the run ------------------------------------------------------------------------------------------------------

/** A wave settled in a real-gear run: every found piece a placed kind wears loses a point (half under auto-replay), its armour one more
 *  for a fall, as the lasting kit does (`settleWear`). Returns the pieces that turned worn or broken. */
export function settleRunWear(run: Run, fought: readonly Fought[], auto = false): WearNote[] {
  const out: WearNote[] = [];
  if (!isReal(run)) return out;
  const share = auto ? AUTO_WEAR : 1;
  const seen = new Set<string>();
  for (const f of fought) {
    if (seen.has(f.kind)) continue;
    seen.add(f.kind);
    for (const slot of EQUIP_SLOTS) {
      const it = foundIn(run, f.kind, slot);
      if (!it) continue;
      const was = wearState(it);
      if (was === 'broken') continue;
      it.wear = Math.min(maxDurability(it), Math.round(((it.wear ?? 0) + share * (1 + (f.fell && slot === 'armour' ? 1 : 0))) * 2) / 2);
      const now = wearState(it);
      if (now !== was && now !== 'good') out.push({ kind: f.kind, id: it.id, name: itemName(it), state: now });
    }
  }
  return out;
}
/** Whether a kind's lasting piece in a slot sits out this run (a found piece is worn there): it does not wear. */
export const slotTaken = (run: Run, kind: string, slot: EquipSlot): boolean => isReal(run) && !run.local && run.worn?.[kind]?.[slot] !== undefined;

// ---- the run's end ----------------------------------------------------------------------------------------------------------

/** What a run brought home, for its result card's Found row. */
export interface FoundHome {
  /** Every piece kept (its saved id), the best first. */
  pieces: Equipment[];
  /** Of those, the kinds that wear one for real now (piece id -> kind). */
  worn: Record<number, string>;
  /** Pieces gone to the cart (the stash was full), and those sold for crowns past the cart. */
  cart: number;
  sold: number;
  soldFor: number;
  /** An auto-replay run's finds that did not come home (the half rate). */
  missed: number;
}

/** The best first: grade, then item level, then the older id. */
const bestFirst = (a: { rarity: number; level: number; id?: number }, b: { rarity: number; level: number; id?: number }) => b.rarity - a.rarity || b.level - a.level || (a.id ?? 0) - (b.id ?? 0);

/** The pieces an old run's simple gear becomes: each gear piece one of its slot's bases (drawn from its id), tier 1 Common, 2 and 3 Rare. */
export function carriedHome(run: Run): Equipment[] {
  const gear: Gear[] = [...(run.items ?? []), ...run.roster.flatMap((h: Owned) => SLOTS.flatMap((s) => (h.gear?.[s] ? [h.gear[s]!] : [])))];
  return gear.map((g) => {
    const rng = new Rng(mixSeed(run.seed, CARRY_SALT, g.id));
    return { id: g.id, base: rng.pick(BASES_OF[equipSlotOf(g.slot)]), rarity: (g.tier >= 2 ? 2 : 1) as Rarity, level: fieldLevel(run) };
  });
}

/** Bring a finished run's finds home, once (won, lost or given up). A real-gear run: the found pieces a kind wears stay worn for real in a
 *  run that brought the lasting kit (the piece they replace goes to the stash); everything else goes to the stash, through the cart when it
 *  is full, and past the cart the lowest are sold. An auto-replay run (`auto`) brings each find home half the time, a boss's always. A run
 *  on the old rules brings its simple gear home as real pieces (`carriedHome`). Returns what came home, or null when it already had. */
export function settleFinds(meta: Meta, run: Run, auto = false): FoundHome | null {
  if (run.findsHome) return null;
  run.findsHome = true;
  const out: FoundHome = { pieces: [], worn: {}, cart: 0, sold: 0, soldFor: 0, missed: 0 };
  const real = isReal(run);
  const pieces = real ? [...(run.pack ?? [])] : carriedHome(run);
  const wornBy = new Map<number, string>();
  if (real && !run.local) for (const [kind, slots] of Object.entries(run.worn ?? {})) for (const id of Object.values(slots)) wornBy.set(id!, kind);
  const keep = pieces.filter((p) => {
    if (!auto || run.bossFinds?.includes(p.id)) return true;
    const ok = new Rng(mixSeed(run.seed, AUTO_FIND_SALT, p.id)).chance(AUTO_FIND_SHARE);
    if (!ok) out.missed++;
    return ok;
  });
  keep.sort(bestFirst);
  // (the pieces a kind wears first: they never count against the stash)
  for (const p of keep.filter((x) => wornBy.has(x.id))) {
    const kind = wornBy.get(p.id)!;
    const made = grantEquipment(meta, { base: p.base, rarity: p.rarity, level: p.level });
    if (p.wear) made.wear = p.wear;
    if (meta.unlocked.includes(kind) && equipItem(meta, kind, made.id)) out.worn[made.id] = kind;
    out.pieces.push(made);
  }
  for (const p of keep.filter((x) => !wornBy.has(x.id))) {
    const r = bringHome(meta, { base: p.base, rarity: p.rarity, level: p.level, ...(p.wear ? { wear: p.wear } : {}) });
    if (r.kind === 'stash') out.pieces.push(r.item);
    else if (r.kind === 'cart') out.cart++;
    else (out.sold++, (out.soldFor += r.crowns));
  }
  out.pieces.sort(bestFirst);
  run.foundHome = out;
  return out;
}

/** Old runs: put the best simple gear in the pack and on the given heroes (the fielded ones) onto those heroes; what is left over goes
 *  back to the pack. Heroes not named keep what they wear. A real-gear run dresses their kinds from its pack (`equipBestReal`).
 *  Returns how many slots changed hands. */
export function equipBestRun(run: Run, heroIds: readonly number[], meta?: Meta): number {
  if (run.over) return 0;
  const heroes = heroIds
    .map((id) => heroOf(run, id))
    .filter((h): h is Owned => !!h)
    .sort((a, b) => b.grade - a.grade || run.roster.indexOf(a) - run.roster.indexOf(b));
  if (isReal(run)) return equipBestReal(run, meta, heroes.filter((h) => !h.guest).map((h) => h.kind));
  let changed = 0;
  const worth = (g: Gear) => g.hp + g.atk;
  for (const slot of SLOTS) {
    const pool: Gear[] = (run.items ?? []).filter((g) => g.slot === slot);
    for (const h of heroes) if (h.gear?.[slot]) pool.push(h.gear[slot]!);
    pool.sort((a, b) => worth(b) - worth(a) || a.id - b.id);
    const before = heroes.map((h) => h.gear?.[slot]?.id);
    const taken = new Set(pool.map((g) => g.id));
    run.items = (run.items ?? []).filter((g) => !taken.has(g.id));
    heroes.forEach((h, i) => {
      const g = pool[i];
      if (g) h.gear = { ...h.gear, [slot]: g };
      else if (h.gear) delete h.gear[slot];
    });
    for (const g of pool.slice(heroes.length)) run.items.push(g);
    heroes.forEach((h, i) => {
      if (h.gear?.[slot]?.id !== before[i]) changed++;
    });
  }
  return changed;
}

/** The bot's stats for a kind in a real-gear run (the balance tools and Auto): the kit's equipment (its lasting pieces with its finds) and
 *  `extra` (the awakening the bot already counts) together. */
export function botKitStats(meta: Meta, run: Run, kind: string, extra?: EquipStats): EquipStats | undefined {
  const kit = run.local ? bareKitStats(run, kind) : runKitStats(meta, run, kind, equipStats);
  if (!kit) return extra;
  if (!extra) return kit;
  const total = addStats({ ...kit, abilities: [...kit.abilities] }, { ...extra, abilities: extra.abilities.filter((a) => !kit.abilities.some((x) => x.id === a.id)) });
  return capStats(total);
}
