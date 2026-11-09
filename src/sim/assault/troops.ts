// The Assault's troops (phase 1, `docs/notes/assault-1.md`; the design's section 3): each of the party's five heroes leads a platoon of up
// to ten soldiers who match it. Archers lead archers and mages lead mages, as the owner asked. There are nine kinds; which one a hero
// leads follows its class and its shot (`troopOf`), and how its soldiers look follows its origin (the Machine heroes lead robots, the
// Undead skeletons). Every kind is drawn from a sheet already in `src/art/units/`: the plainer PixelLab class sheets the Resonance repaint
// left unused, so they read at once as rank-and-file.
//
// A soldier is about a third of a hero, with no skills, only its kind's one trick. Its health and attack are its kind's base times its
// hero's lasting level factor (the curve the hero's own base stats follow, `lastingBoost`), times its rank (veterancy, 6.3). Nothing else
// carries: no gear, talents, runes, relics or skills. So a platoon keeps pace with its hero without an upgrade grind of its own, and the
// main game's balance is untouched: troops exist only in the Assault.
//
// The troops are fighters of the battle like any other, so they are entries of `UNITS` (`troop_<kind>`, and `troop_<kind>_<look>` for
// the robots and skeletons), each marked `summon` so that nothing counts them as heroes: not the end of a fight, the XP, the revives or
// the hero lists. They are added to `UNITS` when this module is first imported, and never by an existing fight.
//
// Chronos Settlement's conquest (`hpatter9/little-town`, `src/shared/data/troops.ts`) was read for this: its soldiers are abstract squads
// of a different game, so only its habit of one plain line of flavour a kind and its siege crews' extra blows at walls were borrowed.

import { UNITS, type Shot, type UnitDef } from '../units';
import { traitsOf } from '../traits';
import { roleOf } from '../suggest';
import { lastingBoost } from '../levels';

/** The nine kinds, in the design's order. */
export const TROOP_KINDS = ['shieldguard', 'blades', 'lancers', 'skirmishers', 'archers', 'gunners', 'battlemages', 'acolytes', 'beasts'] as const;
export type TroopKind = (typeof TROOP_KINDS)[number];
/** The looks a kind may wear: its own, the Machine origin's robots, the Undead origin's skeletons. */
export type TroopLook = 'plain' | 'machine' | 'undead';

/** A platoon's formation (the owner's four: line, wedge, shield wall, loose). */
export type PlatoonFormation = 'line' | 'wedge' | 'wall' | 'loose';

export interface TroopKindDef {
  kind: TroopKind;
  name: string;
  /** One soldier of it, in words. */
  one: string;
  /** Its sheet, and the robots' and skeletons' where the kind has one. */
  sheet: string;
  looks?: Partial<Record<Exclude<TroopLook, 'plain'>, string>>;
  hp: number;
  atk: number;
  def: number;
  range: number;
  moveMs: number;
  atkMs: number;
  jump: number;
  shot?: Shot;
  splash?: boolean;
  /** Its trick, in a line (the platoon card's sub). */
  trick: string;
  /** The formation it takes unless the player picks another. */
  formation: PlatoonFormation;
  /** One plain line about it. */
  text: string;
}

/** The kinds (the design's 3.2 table: base numbers at hero level 1). */
export const TROOPS: Readonly<Record<TroopKind, TroopKindDef>> = {
  shieldguard: { kind: 'shieldguard', name: 'Shieldguard', one: 'shieldguard', sheet: 'cls_paladin_1', looks: { machine: 'robot_swordsman', undead: 'skeleton_warrior' }, hp: 120, atk: 5, def: 8, range: 1, moveMs: 800, atkMs: 1200, jump: 2, trick: 'Locked shields: harder to hurt beside a platoon-mate; strike gates and walls harder', formation: 'wall', text: 'A line of shields that does not step back.' },
  blades: { kind: 'blades', name: 'Blades', one: 'blade', sheet: 'cls_barbarian_1', hp: 95, atk: 10, def: 4, range: 1, moveMs: 650, atkMs: 1000, jump: 2, trick: 'Cleave: every third blow lands on the foes beside the target too', formation: 'wedge', text: 'Swords and nerve, at the front of every push.' },
  lancers: { kind: 'lancers', name: 'Lancers', one: 'lancer', sheet: 'hero_lancer', looks: { undead: 'skeleton_spearman' }, hp: 105, atk: 9, def: 5, range: 2, moveMs: 700, atkMs: 1200, jump: 2, trick: 'Brace: the first blow on a foe coming at them strikes half as hard again; they reach two tiles', formation: 'wedge', text: 'Long spears in close order. A rush comes apart on them.' },
  skirmishers: { kind: 'skirmishers', name: 'Skirmishers', one: 'skirmisher', sheet: 'cls_illusionist_1', looks: { machine: 'robot_swordsman', undead: 'skeleton_warrior' }, hp: 80, atk: 8, def: 3, range: 1, moveMs: 450, atkMs: 700, jump: 3, trick: 'Flank: they go round to a foe’s side or back, and climb well', formation: 'loose', text: 'Light and quick: round the line and at whoever stands behind it.' },
  archers: { kind: 'archers', name: 'Archers', one: 'archer', sheet: 'samurai_archer', looks: { undead: 'skeleton_archer' }, hp: 70, atk: 9, def: 2, range: 4, moveMs: 700, atkMs: 1400, jump: 2, shot: 'arrow', trick: 'Volley: when four or more of the platoon loose together, their arrows strike harder', formation: 'loose', text: 'Bows from behind the line. They thin a rush before it lands.' },
  gunners: { kind: 'gunners', name: 'Gunners', one: 'gunner', sheet: 'cls_gunslinger_1', looks: { machine: 'robot_infantry' }, hp: 70, atk: 13, def: 2, range: 5, moveMs: 750, atkMs: 2000, jump: 2, shot: 'bullet', trick: 'Pierce: their shot goes through armour, and hits gates and walls harder', formation: 'loose', text: 'Slow between shots, and a shot that goes through plate.' },
  battlemages: { kind: 'battlemages', name: 'Battlemages', one: 'battlemage', sheet: 'cls_warlock_1', hp: 60, atk: 11, def: 1, range: 3, moveMs: 750, atkMs: 1700, jump: 2, shot: 'fire', splash: true, trick: 'Splash: their fire lands on the foes beside the target too', formation: 'loose', text: 'Fire from the back. Frail: keep shields before them.' },
  acolytes: { kind: 'acolytes', name: 'Acolytes', one: 'acolyte', sheet: 'cls_cleric_1', hp: 75, atk: 4, def: 3, range: 2, moveMs: 700, atkMs: 1300, jump: 2, trick: 'Mend: each heals the most hurt friend near it, soldiers first', formation: 'line', text: 'They mend the platoon between blows. A platoon with acolytes outlasts one without.' },
  beasts: { kind: 'beasts', name: 'Beasts', one: 'wolf', sheet: 'wolf_grey', hp: 85, atk: 9, def: 3, range: 1, moveMs: 380, atkMs: 700, jump: 3, trick: 'Pack: they bite harder for each other wolf on the same foe', formation: 'wedge', text: 'A pack bred for war, at the heels of a master who understands beasts.' },
};

/** The few heroes the rule misplaces (the design's 3.2): the Beastmaster calls wolves, so he leads Beasts, not Acolytes. */
export const TROOP_OVERRIDES: Readonly<Record<string, TroopKind>> = { beastmaster: 'beasts' };

/** The kind a hero leads (the design's rule, in order): an override; a support that is not a guardian or vanguard leads Acolytes; a
 *  guardian, a bulwark or a melee warden Shieldguard; a vanguard Lancers; a gunner or a bullet shot Gunners; an arrow Archers; any other
 *  shot Battlemages; a beast Beasts; a trickster or assassin Skirmishers; anyone else Blades. */
export function troopOf(heroKind: string): TroopKind {
  const over = TROOP_OVERRIDES[heroKind];
  if (over) return over;
  const def = UNITS[heroKind];
  const ts = traitsOf(heroKind);
  const has = (t: string) => ts.includes(t);
  if (def && roleOf(heroKind) === 'support' && !has('guardian') && !has('vanguard')) return 'acolytes';
  if (has('guardian') || has('bulwark') || (has('warden') && !def?.shot)) return 'shieldguard';
  if (has('vanguard')) return 'lancers';
  if (has('gunner') || def?.shot === 'bullet') return 'gunners';
  if (def?.shot === 'arrow') return 'archers';
  if (def?.shot) return 'battlemages';
  if (has('beast')) return 'beasts';
  if (has('trickster') || has('assassin')) return 'skirmishers';
  return 'blades';
}

/** How a hero's soldiers look: robots for a Machine hero, skeletons for an Undead one, where the kind has that look. */
export function lookOf(heroKind: string): TroopLook {
  const ts = traitsOf(heroKind);
  const kind = TROOPS[troopOf(heroKind)];
  if (ts.includes('machine') && kind.looks?.machine) return 'machine';
  if (ts.includes('undead') && kind.looks?.undead) return 'undead';
  return 'plain';
}

/** The `UNITS` id of a kind in a look. */
export const troopUnitId = (kind: TroopKind, look: TroopLook = 'plain'): string => (look === 'plain' ? `troop_${kind}` : `troop_${kind}_${look}`);
/** The unit id a hero's soldiers fight as. */
export const troopUnitOf = (heroKind: string): string => troopUnitId(troopOf(heroKind), lookOf(heroKind));

/** The troop kind of a unit id (`troop_archers_undead` is Archers), or undefined for any other fighter. */
export function kindOfUnit(defId: string): TroopKind | undefined {
  if (!defId.startsWith('troop_')) return undefined;
  const k = defId.slice(6).split('_')[0] as TroopKind;
  return TROOPS[k] ? k : undefined;
}

const unitDef = (k: TroopKindDef, look: TroopLook): UnitDef => ({
  id: troopUnitId(k.kind, look),
  name: k.name,
  side: 'hero',
  sheet: look === 'plain' ? k.sheet : k.looks![look]!,
  scale: 0.5,
  hp: k.hp,
  atk: k.atk,
  def: k.def,
  range: k.range,
  moveMs: k.moveMs,
  atkMs: k.atkMs,
  jump: k.jump,
  ...(k.shot ? { shot: k.shot } : {}),
  ...(k.splash ? { splash: true } : {}),
  role: k.trick,
  summon: true,
});

/** Every troop's `UNITS` entry: each kind in each look it has. */
export const TROOP_UNITS: Readonly<Record<string, UnitDef>> = Object.fromEntries(
  TROOP_KINDS.flatMap((kind) => {
    const k = TROOPS[kind];
    const looks: TroopLook[] = ['plain', ...(Object.keys(k.looks ?? {}) as TroopLook[])];
    return looks.map((look) => [troopUnitId(kind, look), unitDef(k, look)] as const);
  }),
);

/** A war-wolf of the garrison (the design's 4.1): the Beastmaster's black wolf's sheet on a wolf's numbers. A foe that is not one of an
 *  army's bands, so it is marked `summon` too: nothing births a nemesis from it, and the foes' kit rules do not ask it for a kit. */
export const WAR_WOLF: UnitDef = { id: 'warWolf', name: 'War-wolf', side: 'foe', sheet: 'wolf_black', scale: 0.6, hp: 180, atk: 20, def: 3, range: 1, moveMs: 380, atkMs: 800, jump: 3, role: 'Loosed from the pens on the alarm', summon: true };

// (added to `UNITS` once, as this module is first imported: an existing fight never meets them)
for (const [id, def] of Object.entries(TROOP_UNITS)) if (!UNITS[id]) UNITS[id] = def;
if (!UNITS[WAR_WOLF.id]) UNITS[WAR_WOLF.id] = WAR_WOLF;

// ---- veterancy (the design's 6.3) -----------------------------------------------------------------------------------------------

export type TroopRank = 'recruit' | 'blooded' | 'veteran' | 'elite';
/** The ranks: the marks each needs, its hp and attack, and its name. */
export const RANKS: readonly { rank: TroopRank; marks: number; mult: number; name: string; pips: number }[] = [
  { rank: 'recruit', marks: 0, mult: 1, name: 'Recruit', pips: 0 },
  { rank: 'blooded', marks: 1, mult: 1.08, name: 'Blooded', pips: 1 },
  { rank: 'veteran', marks: 3, mult: 1.16, name: 'Veteran', pips: 2 },
  { rank: 'elite', marks: 6, mult: 1.25, name: 'Elite', pips: 3 },
];
/** An Elite's trick is this much stronger (half again its number). */
export const ELITE_TRICK = 1.5;

/** A soldier's rank by its marks. */
export function rankOf(marks: number): (typeof RANKS)[number] {
  let r = RANKS[0];
  for (const x of RANKS) if (marks >= x.marks) r = x;
  return r;
}

/** The balance tool's dial on every soldier's numbers (the design's table is its first guess, section 3.2: "the balance tool sets them"). */
export const TROOP_TUNE = { hp: 1.5, atk: 1 };

/** A soldier's hp and attack multipliers: its hero's lasting level factor, times its rank, times the balance's dial. */
export function troopBoost(heroLevel: number, marks: number): { hp: number; atk: number } {
  const lv = lastingBoost(Math.max(1, heroLevel));
  const r = rankOf(marks).mult;
  return { hp: lv.hp * r * TROOP_TUNE.hp, atk: lv.atk * r * TROOP_TUNE.atk };
}

/** A kind's numbers at a hero's level, for the platoon card (whole hp and attack; reach, and steps a second). */
export function troopStats(kind: TroopKind, heroLevel: number, marks = 0): { hp: number; atk: number; reach: number; speed: number } {
  const k = TROOPS[kind];
  const m = troopBoost(heroLevel, marks);
  return { hp: Math.round(k.hp * m.hp), atk: Math.round(k.atk * m.atk), reach: k.range, speed: Math.round((10000 / k.moveMs)) / 10 };
}

// ---- the tricks' numbers ----------------------------------------------------------------------------------------------------------

export const TRICKS = {
  /** Shieldguard: a blow on one with a platoon-mate beside it lands for this share (about two more points of AC). */
  locked: 0.85,
  /** Shieldguard and Gunners strike a structure this much harder (5.1). */
  siege: 1.25,
  /** Blades: every this many blows lands on the target's neighbours too. */
  cleaveEvery: 3,
  /** Lancers: the first blow on a foe that stepped at them this recently strikes this much harder. */
  braceMs: 800,
  brace: 1.5,
  /** Archers: four or more of a platoon loosing within this window strike this much harder. */
  volleyMs: 600,
  volleyNeed: 4,
  volley: 1.15,
  /** Gunners: their shot ignores this much armour. */
  pierce: 3,
  /** Acolytes: each heals the most hurt friend within this reach, by this share of its health a second. */
  mendReach: 2,
  mend: 0.04,
  /** Skirmishers: a blow from a foe's side or back lands this much harder (the Elite's sharpened flank; a Recruit's flank is the step
   *  round alone, so only an Elite's blow takes it, at `ELITE_TRICK` times the step's worth). */
  flank: 1.2,
  /** Beasts: this much more for each other wolf beside the same foe, up to `packMost`. */
  pack: 0.1,
  packMost: 0.3,
} as const;
