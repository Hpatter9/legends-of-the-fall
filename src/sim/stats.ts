// The six ability scores, D&D style (STATS batch 1, docs/notes/stats-1.md; the design is docs/notes/rpg-stats-design.md). Every hero has the
// six scores (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma): the standard array (15, 14, 13, 12, 10, 8) plus +2 on its
// primary and +1 on its second from its calling, so every hero's six add up to 75 and no hero is richer than another, only shaped
// differently. From the scores come a modifier each, a proficiency bonus by level, Armour Class, the to-hit, the skill DC, saves, crit,
// initiative, pools and the rest (the design's section 3.4).
//
// Batch 1 made the scores data; batch 2 (docs/notes/stats-2.md, `statPower.ts`) reads them in `addUnit` for health, blows and skills. Later
// batches hook these pure functions into `swing` and the ailments.
//
// Growth is fixed by calling, never rolled (the owner's answer): an ability score improvement (+2) at levels 4, 8, 12, 16 and 20 and an
// epic boon (+1) at 30 and every ten levels to 100, poured into the scores in the calling's order; the two lowest never grow from levels.
// Ranks and grades give +1 to the two best scores each step; an awakening step gives +2 to the primary. 30 is the most any score can be.
//
// Randomness: none, except the d20 helpers at the end, which are hashes of the fight's seed and the moment (as tall grass's cover is), so
// they never draw from the fight's streams. Pure rules: no Pixi, no DOM.

import { mixSeed } from './rng';
import { isBoss } from './foes';
import type { UnitDef } from './units';

export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
/** The six, in D&D's order (the order of a `Scores` tuple and of the hero sheet). */
export const ABILITIES: readonly Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ABILITY_SHORT: Readonly<Record<Ability, string>> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
export const ABILITY_NAME: Readonly<Record<Ability, string>> = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };

export type Scores = Record<Ability, number>;

/** What a calling wears, which sets its Armour Class (the design's section 3.2). */
export type Armour = 'heavy' | 'medium' | 'light' | 'robes' | 'monk' | 'brute';

export interface StatProfile {
  /** The six scores at level 1, rank 1. */
  base: Scores;
  /** The ability its ordinary blows use (STR for heavy weapons, DEX for bows, guns and light blades, the casting ability for spell blows). */
  blow: Ability;
  /** The ability its spells, heals, summons and songs use. */
  cast: Ability;
  armour: Armour;
  /** The two saves its calling is trained in (proficiency is added to them). */
  saves: readonly [Ability, Ability];
  /** The nearest D&D class, for the sheet. */
  calling: string;
}

/** The array every hero's scores are (the standard array with the calling's +2 and +1). */
export const HERO_ARRAY: readonly number[] = [17, 15, 13, 12, 10, 8];
/** What every hero's six add up to. */
export const SCORE_TOTAL = 75;
/** The most any score can be. */
export const SCORE_CAP = 30;

/** One row of the profile table: the six scores (STR DEX CON INT WIS CHA), blows / casting, armour, trained saves and the calling. */
type Row = [number, number, number, number, number, number, Ability, Ability, Armour, Ability, Ability, string];

// The design's section 4, "The scores at level 1" (owner-approved, 31 October 2026). The primary is the 17, the weakness the 8.
const ROWS: Readonly<Record<string, Row>> = {
  knight: [15, 8, 17, 10, 13, 12, 'str', 'str', 'heavy', 'str', 'con', 'Fighter (defender)'],
  samurai: [15, 17, 13, 10, 12, 8, 'dex', 'dex', 'medium', 'dex', 'wis', 'Fighter (kensei)'],
  kunoichi: [8, 17, 12, 13, 10, 15, 'dex', 'dex', 'light', 'dex', 'int', 'Rogue (shadow)'],
  archer: [12, 17, 13, 10, 15, 8, 'dex', 'dex', 'light', 'str', 'dex', 'Fighter (archer)'],
  wizard: [8, 15, 12, 17, 13, 10, 'int', 'int', 'robes', 'int', 'wis', 'Wizard (evoker)'],
  peasant: [15, 12, 17, 8, 13, 10, 'str', 'str', 'medium', 'str', 'con', 'Fighter (militia)'],
  ninjaMonk: [12, 17, 13, 10, 15, 8, 'dex', 'wis', 'monk', 'str', 'dex', 'Monk'],
  wanderer: [8, 15, 13, 17, 12, 10, 'int', 'int', 'light', 'con', 'int', 'Artificer (alchemist)'],
  lightningMage: [8, 13, 12, 10, 15, 17, 'cha', 'cha', 'robes', 'con', 'cha', 'Sorcerer (storm)'],
  kitsune: [8, 15, 10, 12, 13, 17, 'cha', 'cha', 'light', 'dex', 'cha', 'Sorcerer (fey)'],
  karasu: [12, 17, 13, 15, 10, 8, 'dex', 'dex', 'light', 'dex', 'int', 'Rogue (thief)'],
  yamabushi: [13, 12, 15, 10, 17, 8, 'str', 'wis', 'monk', 'str', 'wis', 'Monk (mountain)'],
  werewolf: [17, 13, 15, 8, 12, 10, 'str', 'str', 'brute', 'str', 'con', 'Barbarian (beast)'],
  minotaur: [17, 10, 15, 8, 12, 13, 'str', 'str', 'heavy', 'str', 'con', 'Barbarian (bull)'],
  satyr: [12, 15, 13, 10, 8, 17, 'dex', 'cha', 'light', 'dex', 'cha', 'Bard (pipes)'],
  gorgon: [8, 15, 13, 10, 12, 17, 'dex', 'cha', 'light', 'con', 'cha', 'Sorcerer (gaze)'],
  samuraiCommander: [15, 10, 13, 8, 12, 17, 'str', 'cha', 'heavy', 'str', 'cha', 'Fighter (banneret)'],
  paladin: [15, 8, 13, 10, 12, 17, 'str', 'cha', 'heavy', 'wis', 'cha', 'Paladin'],
  cleric: [13, 10, 15, 8, 17, 12, 'str', 'wis', 'medium', 'wis', 'cha', 'Cleric (war)'],
  druid: [8, 13, 15, 12, 17, 10, 'wis', 'wis', 'light', 'int', 'wis', 'Druid'],
  barbarian: [17, 13, 15, 8, 12, 10, 'str', 'str', 'brute', 'str', 'con', 'Barbarian (berserker)'],
  ranger: [10, 17, 13, 12, 15, 8, 'dex', 'wis', 'light', 'str', 'dex', 'Ranger (trapper)'],
  warlock: [8, 13, 15, 12, 10, 17, 'cha', 'cha', 'robes', 'wis', 'cha', 'Warlock'],
  illusionist: [8, 15, 12, 17, 10, 13, 'dex', 'int', 'robes', 'int', 'wis', 'Wizard (illusionist)'],
  gunslinger: [8, 17, 12, 10, 15, 13, 'dex', 'dex', 'light', 'dex', 'wis', 'Fighter (gunslinger)'],
  shambler: [15, 10, 17, 8, 13, 12, 'str', 'con', 'brute', 'con', 'wis', 'Ghoul (corpse-eater)'],
  rifleBot: [10, 17, 15, 13, 12, 8, 'dex', 'dex', 'medium', 'dex', 'con', 'Construct (gunner)'],
  mercenary: [12, 17, 13, 10, 15, 8, 'dex', 'dex', 'light', 'dex', 'wis', 'Rogue (bounty hunter)'],
  mummy: [13, 8, 15, 10, 17, 12, 'str', 'wis', 'medium', 'con', 'wis', 'Mummy lord (cleric)'],
  buccaneer: [12, 17, 13, 8, 10, 15, 'dex', 'dex', 'light', 'dex', 'cha', 'Rogue (swashbuckler)'],
  wolfBard: [8, 13, 15, 10, 12, 17, 'cha', 'cha', 'light', 'dex', 'cha', 'Bard (lore)'],
  beastmaster: [10, 13, 12, 8, 15, 17, 'str', 'cha', 'light', 'str', 'wis', 'Ranger (beast master)'],
  kraken: [15, 10, 17, 8, 13, 12, 'str', 'wis', 'medium', 'str', 'con', 'Druid (tide), bulwark'],
  lancer: [17, 15, 13, 8, 10, 12, 'str', 'str', 'heavy', 'str', 'con', 'Fighter (cavalier)'],
  reaper: [8, 17, 12, 10, 13, 15, 'dex', 'cha', 'light', 'dex', 'cha', 'Warlock (reaper)'],
  timeWitch: [8, 13, 12, 17, 15, 10, 'int', 'int', 'robes', 'int', 'wis', 'Wizard (chronurgist)'],
  arcBlade: [12, 17, 15, 13, 10, 8, 'dex', 'dex', 'medium', 'dex', 'con', 'Construct (blade)'],
  dreadPirate: [15, 13, 17, 10, 8, 12, 'str', 'dex', 'medium', 'str', 'con', 'Fighter (bombardier)'],
  siegeBot: [13, 15, 17, 12, 10, 8, 'dex', 'dex', 'heavy', 'str', 'con', 'Construct (siege)'],
  priestess: [8, 10, 13, 12, 17, 15, 'wis', 'wis', 'medium', 'wis', 'cha', 'Cleric (life)'],
  dragoon: [17, 13, 15, 8, 10, 12, 'str', 'con', 'heavy', 'dex', 'con', 'Dragoon (dragon knight)'],
  juggernaut: [15, 8, 17, 12, 13, 10, 'str', 'str', 'heavy', 'str', 'con', 'Construct (bulwark)'],
  sage: [8, 10, 12, 17, 15, 13, 'int', 'int', 'robes', 'int', 'wis', 'Wizard (sage)'],
  demonSwordsman: [13, 12, 15, 8, 10, 17, 'cha', 'cha', 'medium', 'wis', 'cha', 'Warlock (hexblade)'],
  tyrant: [13, 8, 15, 12, 10, 17, 'str', 'cha', 'heavy', 'wis', 'cha', 'Warlock (tyrant)'],
};

const toScores = (r: readonly number[]): Scores => ({ str: r[0], dex: r[1], con: r[2], int: r[3], wis: r[4], cha: r[5] });

/** Every hero's profile, by kind. */
export const STAT_PROFILES: Readonly<Record<string, StatProfile>> = Object.fromEntries(
  Object.entries(ROWS).map(([kind, r]) => [kind, { base: toScores(r.slice(0, 6) as number[]), blow: r[6], cast: r[7], armour: r[8], saves: [r[9], r[10]], calling: r[11] }]),
);

/** A hero kind's profile (undefined for a foe or a summon: they take a family block, `foeBlockOf`). */
export const profileOf = (kind: string): StatProfile | undefined => STAT_PROFILES[kind];

// ---- The modifier and proficiency (the design's section 2) ----

/** D&D's modifier: (score − 10) ÷ 2, rounded down (8 is −1, 17 is +3, 20 is +5). */
export const modOf = (score: number): number => Math.floor((score - 10) / 2);

/** The proficiency bonus by level (1–9 +2, 10–19 +3, 20–29 +4, 30–49 +5, 50–79 +6, 80–100 +7): the steps sit on skill 2, skill 3,
 *  the ultimate and the deep milestones. A run's own levels use the same table. */
export const PROFICIENCY: readonly { from: number; bonus: number }[] = [
  { from: 80, bonus: 7 },
  { from: 50, bonus: 6 },
  { from: 30, bonus: 5 },
  { from: 20, bonus: 4 },
  { from: 10, bonus: 3 },
  { from: 1, bonus: 2 },
];
export const proficiencyOf = (level: number): number => (PROFICIENCY.find((p) => level >= p.from) ?? PROFICIENCY[PROFICIENCY.length - 1]).bonus;

// ---- Growth (the design's sections 5 and 6) ----

/** The levels that give an ability score improvement (+2 each), and how far each place in the calling's order may be raised by them
 *  (the primary to 20, then the second to 18, the third to 16, the fourth to 14). */
export const ASI_LEVELS: readonly number[] = [4, 8, 12, 16, 20];
export const ASI_POINTS = 2;
export const ASI_CAPS: readonly number[] = [20, 18, 16, 14];
/** The levels that give an epic boon (+1 each, past 20), and its caps (the primary to 24, then the second to 20, the third to 18). */
export const BOON_LEVELS: readonly number[] = [30, 40, 50, 60, 70, 80, 90, 100];
export const BOON_POINTS = 1;
export const BOON_CAPS: readonly number[] = [24, 20, 18];
/** The highest rank that gives score steps (ranks 1 to 4; the ranks past it are awakening steps). */
export const STAT_MAX_RANK = 4;
/** An awakening step's epic boon: this much on the primary. */
export const AWAKEN_SCORE = 2;

/** A profile's abilities from best to worst (the calling's order: the primary first, the weakness last). The six are always different
 *  numbers, so the order is plain; a tie would keep D&D's order. */
export function orderOf(p: StatProfile): Ability[] {
  return [...ABILITIES].sort((a, b) => p.base[b] - p.base[a] || ABILITIES.indexOf(a) - ABILITIES.indexOf(b));
}

/** Pour `points` one at a time into the order's places, each up to its cap. */
function pour(s: Scores, order: readonly Ability[], caps: readonly number[], points: number): void {
  for (let i = 0; i < caps.length && points > 0; i++) {
    const a = order[i];
    const room = Math.max(0, caps[i] - s[a]);
    const add = Math.min(room, points);
    s[a] += add;
    points -= add;
  }
}

/** The scores a hero's levels give it (before ranks, grades, awakening, talents and gear). */
export function scoresAtLevel(p: StatProfile, level: number): Scores {
  const s = { ...p.base };
  const order = orderOf(p);
  pour(s, order, ASI_CAPS, ASI_POINTS * ASI_LEVELS.filter((l) => level >= l).length);
  pour(s, order, BOON_CAPS, BOON_POINTS * BOON_LEVELS.filter((l) => level >= l).length);
  return s;
}

/** What a hero is, for its scores: its level, its whole rank (0 to 4, and 5 and 6 for awakening steps, as `heroRank`), its grade in a run
 *  (1 to 4), and any score points from elsewhere (talents and gear, from a later batch). */
export interface StatInput {
  level?: number;
  rank?: number;
  grade?: number;
  extra?: Partial<Scores>;
}

/** The score points a rank, a grade and awakening give, by ability. */
export function stepBonus(p: StatProfile, rank = 1, grade = 1): Scores {
  const [first, second] = orderOf(p);
  const out = toScores([0, 0, 0, 0, 0, 0]);
  const steps = Math.max(0, Math.min(rank, STAT_MAX_RANK) - 1) + Math.max(0, grade - 1);
  out[first] += steps;
  out[second] += steps;
  out[first] += AWAKEN_SCORE * Math.max(0, rank - STAT_MAX_RANK);
  return out;
}

/** A hero's six scores now: its level's growth, its rank, grade and awakening steps, and anything extra, each at most `SCORE_CAP`. */
export function scoresOf(p: StatProfile, at: StatInput = {}): Scores {
  const s = scoresAtLevel(p, at.level ?? 1);
  const step = stepBonus(p, at.rank ?? 1, at.grade ?? 1);
  const out = toScores([0, 0, 0, 0, 0, 0]);
  for (const a of ABILITIES) out[a] = Math.min(SCORE_CAP, s[a] + step[a] + (at.extra?.[a] ?? 0));
  return out;
}

export const modsOf = (s: Scores): Scores => toScores(ABILITIES.map((a) => modOf(s[a])));

// ---- The derived numbers (the design's sections 3.2 to 3.4) ----

/** Armour Class by armour: heavy 16 with no DEX; medium 13 + DEX (at most +2); light 11 + DEX; robes 10 + DEX; an unarmoured monk
 *  10 + DEX + WIS; an unarmoured brute 10 + DEX + CON. */
export const MEDIUM_DEX_CAP = 2;
export function acOf(armour: Armour, m: Scores): number {
  switch (armour) {
    case 'heavy': return 16;
    case 'medium': return 13 + Math.min(m.dex, MEDIUM_DEX_CAP);
    case 'light': return 11 + m.dex;
    case 'robes': return 10 + m.dex;
    case 'monk': return 10 + m.dex + m.wis;
    case 'brute': return 10 + m.dex + m.con;
  }
}

/** The per-point shares of the scores' effects (the design's section 3.1), each a knob for the later batches' tuning. */
export const PER_POINT = {
  /** Blow, skill and health power: +5% a point of the ability's modifier. */
  POWER: 0.05,
  /** Quick hands: blows 2% faster a point of DEX. */
  BLOW_SPEED: 0.02,
  /** Keen: +1% crit a point of DEX, from +1 up. */
  CRIT: 0.01,
  /** Quick wits: every skill's cooldown 2% shorter a point of INT, at most `COOLDOWN_CAP` either way. */
  COOLDOWN: 0.02,
  COOLDOWN_CAP: 0.1,
  /** Inspiration: the ultimate's meter 3% faster a point of CHA. */
  ULT_FILL: 0.03,
  /** Pools: stamina +3 SP a point of CON, mana +5 MP a point of the casting ability, and 4% faster refill a point. */
  STAM_TOP: 3,
  MANA_TOP: 5,
  REFILL: 0.04,
  /** Perception: misses from cover, smoke, ink and sand 10% less likely a point of WIS. */
  PERCEPTION: 0.1,
} as const;
/** The crit a natural 20 gives every blow (5%). */
export const BASE_CRIT = 0.05;
/** The pools' tops before the scores (the same as `RES.STAM_MAX` and `RES.MANA_MAX`). */
export const STAM_BASE = 60;
export const MANA_BASE = 100;

export interface Derived {
  scores: Scores;
  mods: Scores;
  proficiency: number;
  ac: number;
  toHit: number;
  dc: number;
  /** The crit chance from the d20 and DEX (a share; kit, trait and gear crit add to it). */
  crit: number;
  initiative: number;
  /** Each save's bonus: the modifier, plus proficiency in the calling's two. */
  saves: Scores;
  /** The multiplier on body health from CON, on blows from the blow ability, and on skills from the casting ability (1 + 5% a point). */
  hpMult: number;
  atkMult: number;
  castMult: number;
  /** The multiplier on blow speed from DEX (a time between blows is divided by it). */
  blowSpeed: number;
  /** A skill's cooldown is multiplied by this (from INT, capped). */
  cooldown: number;
  /** The ultimate's meter fills this much faster (from CHA). */
  ultFill: number;
  /** The pool's top and its refill multiplier, for a stamina and a mana hero. */
  stamTop: number;
  stamRefill: number;
  manaTop: number;
  manaRefill: number;
}

/** Every derived number a profile has at a level, rank and grade. */
export function derivedOf(p: StatProfile, at: StatInput = {}): Derived {
  const scores = scoresOf(p, at);
  const mods = modsOf(scores);
  const proficiency = proficiencyOf(at.level ?? 1);
  const saves = toScores(ABILITIES.map((a) => mods[a] + (p.saves.includes(a) ? proficiency : 0)));
  const power = (m: number) => 1 + PER_POINT.POWER * m;
  const cdShift = Math.max(-PER_POINT.COOLDOWN_CAP, Math.min(PER_POINT.COOLDOWN_CAP, PER_POINT.COOLDOWN * mods.int));
  return {
    scores,
    mods,
    proficiency,
    ac: acOf(p.armour, mods),
    toHit: proficiency + mods[p.blow],
    dc: 8 + proficiency + mods[p.cast],
    crit: BASE_CRIT + PER_POINT.CRIT * Math.max(0, mods.dex),
    initiative: mods.dex,
    saves,
    hpMult: power(mods.con),
    atkMult: power(mods[p.blow]),
    castMult: power(mods[p.cast]),
    blowSpeed: 1 + PER_POINT.BLOW_SPEED * mods.dex,
    cooldown: 1 - cdShift,
    ultFill: 1 + PER_POINT.ULT_FILL * mods.cha,
    stamTop: STAM_BASE + PER_POINT.STAM_TOP * mods.con,
    stamRefill: 1 + PER_POINT.REFILL * mods.con,
    manaTop: MANA_BASE + PER_POINT.MANA_TOP * mods[p.cast],
    manaRefill: 1 + PER_POINT.REFILL * mods[p.cast],
  };
}

/** A hero's body numbers fitted to its scores (the design's "Today's numbers are each hero's level 1"): its health, attack and blow
 *  time with its level-1 scores' share taken out, so that putting the scores' share back in at level 1, rank 1 gives today's numbers. */
export interface Body {
  hp: number;
  atk: number;
  atkMs: number;
}
export function bodyOf(def: Pick<UnitDef, 'hp' | 'atk' | 'atkMs'>, p: StatProfile): Body {
  const d = derivedOf(p);
  return { hp: def.hp / d.hpMult, atk: def.atk / d.atkMult, atkMs: def.atkMs * d.blowSpeed };
}

/** What the scores make of a hero's health, attack and blow time (before the level curve, rank and grade multipliers and gear). At level 1,
 *  rank 1 this is the kind's own numbers exactly: the scores' share comes in as a ratio to its level-1 share. */
export function scaledBody(def: Pick<UnitDef, 'hp' | 'atk' | 'atkMs'>, p: StatProfile, at: StatInput = {}): Body {
  const one = derivedOf(p);
  const now = derivedOf(p, at);
  return { hp: def.hp * (now.hpMult / one.hpMult), atk: def.atk * (now.atkMult / one.atkMult), atkMs: def.atkMs * (one.blowSpeed / now.blowSpeed) };
}

// ---- Foes: stat blocks by family (the design's section 9) ----

export type FoeFamily = 'brute' | 'skirmisher' | 'shooter' | 'caster' | 'armoured' | 'flyer';

export interface FoeBlock {
  scores: Scores;
  ac: number;
  saves: readonly Ability[];
}

export const FOE_BLOCKS: Readonly<Record<FoeFamily, FoeBlock>> = {
  brute: { scores: toScores([16, 10, 16, 7, 10, 8]), ac: 12, saves: ['str', 'con'] },
  skirmisher: { scores: toScores([12, 16, 12, 6, 12, 8]), ac: 14, saves: ['dex'] },
  shooter: { scores: toScores([10, 16, 12, 10, 13, 8]), ac: 13, saves: ['dex', 'wis'] },
  caster: { scores: toScores([8, 12, 12, 16, 13, 14]), ac: 12, saves: ['int', 'wis'] },
  armoured: { scores: toScores([15, 10, 16, 6, 8, 5]), ac: 15, saves: ['str', 'con'] },
  flyer: { scores: toScores([16, 14, 14, 10, 10, 14]), ac: 14, saves: ['dex', 'cha'] },
};

/** A foe's family, from how it fights and its look: spell-throwers are casters, other shooters shooters, the quick beasts skirmishers,
 *  the demons flyers, the bones and the golems armoured, and the rest brutes. */
export function foeFamilyOf(def: Pick<UnitDef, 'sheet' | 'shot' | 'flies'>): FoeFamily {
  const s = def.sheet;
  if (/shaman|lich|devil|witch|mage|sorcer|priest/.test(s) || def.shot === 'fire' || def.shot === 'curse' || def.shot === 'holy') return 'caster';
  if (def.shot) return 'shooter';
  if (/wolf|imp|kitsune|karasu|boar/.test(s)) return 'skirmisher';
  if (def.flies || /demon/.test(s)) return 'flyer';
  if (/skeleton|golem|ghost/.test(s)) return 'armoured';
  return 'brute';
}

/** The foes' proficiency by the army's tier (Normal +2 to Mythic +6); a boss has `BOSS_PROF` more. */
export const TIER_PROFICIENCY: readonly number[] = [2, 3, 4, 5, 6];
/** The foes' proficiency in a mode with no tier, by its depth (the design's section 9: the spire and the Calamity +2 to +8): +2, and +1 for
 *  each `per` acts, maps or waves past the first, to `DEPTH_PROF_MAX`. */
export const DEPTH_PROF_MAX = 8;
export const depthProficiency = (depth: number, per = 1): number => Math.min(DEPTH_PROF_MAX, 2 + Math.floor(Math.max(0, depth - 1) / per));
/** How many of each depth one more point of the foes' proficiency takes: the spire's acts, the Calamity's maps, the Last Stand's waves. */
export const SPIRE_PROF_PER = 1;
export const CAL_PROF_PER = 1;
export const STAND_PROF_PER = 5;

/**
 * The joint rebalance (docs/notes/joint-rebalance.md; the D&D stats design's batch 7 with the skills overhaul's batch 8): what batches 4 to
 * 6 held back so that no mode moved before the modes were retuned once, now switched on (the owner's decisions of 1 November 2026). Each is
 * a switch for measuring one at a time; off, it plays batch 6's rule exactly.
 *
 * - `tierProf`: a foe's to hit, AC, DC and saves come from its family's block and the army's tier (Normal +2 to Mythic +6; the spire, the
 *   Calamity and the Last Stand by their depth), in place of being matched to the heroes' growth.
 * - `bossBlock`: a boss's block has its +2 proficiency, +2 to its two best scores and +2 AC in the blow and the saves.
 * - `bossSaves`: a boss makes saving throws, every save trained, and its Legendary Resistance (the old ladder) still follows.
 * - `families`: a foe's family shows in how much it deals and takes (no `blowFit`).
 * - `saves`: a save's halving is felt (no `saveFit`).
 * - `pools`, `cooldown`, `ultFill`: a hero's pool, cooldowns and ultimate fill are counted from a modifier of +0, not the roster's mean.
 */
export const JOINT = { tierProf: true, bossBlock: true, bossSaves: true, families: true, saves: true, pools: true, cooldown: true, ultFill: true };
export const BOSS_PROF = 2;
/** A boss's block: +2 to its two best scores, +2 AC, and every save trained (and its Legendary Resistance, the existing ladder). */
export const BOSS_SCORE = 2;
export const BOSS_AC = 2;

export interface FoeStats {
  family: FoeFamily;
  boss: boolean;
  scores: Scores;
  mods: Scores;
  proficiency: number;
  ac: number;
  toHit: number;
  dc: number;
  crit: number;
  initiative: number;
  saves: Scores;
}

/** A foe's numbers from its family's block, the army's tier (0 Normal to 4 Mythic) and whether it is a boss. A foe's health and attack stay
 *  its own (as a D&D monster's hit points are written, not worked out); no foe levels. `boss` overrides whether it takes a boss's block. */
export function foeStatsOf(def: Pick<UnitDef, 'id' | 'sheet' | 'shot' | 'flies'>, tier = 0, boss = isBoss(def.id), prof?: number): FoeStats {
  const family = foeFamilyOf(def);
  const block = FOE_BLOCKS[family];
  const scores = { ...block.scores };
  if (boss) {
    const best = [...ABILITIES].sort((a, b) => scores[b] - scores[a] || ABILITIES.indexOf(a) - ABILITIES.indexOf(b)).slice(0, 2);
    for (const a of best) scores[a] = Math.min(SCORE_CAP, scores[a] + BOSS_SCORE);
  }
  const mods = modsOf(scores);
  // (`prof`, when given, is the fight's own: a tier's or a depth's, `Boost.prof`)
  const proficiency = (prof ?? TIER_PROFICIENCY[Math.max(0, Math.min(TIER_PROFICIENCY.length - 1, tier | 0))]) + (boss ? BOSS_PROF : 0);
  // (a foe's blows use STR or DEX, whichever is better, and its skills its best mental score)
  const blow = mods.dex > mods.str ? mods.dex : mods.str;
  const cast = Math.max(mods.int, mods.wis, mods.cha);
  return {
    family,
    boss,
    scores,
    mods,
    proficiency,
    ac: block.ac + (boss ? BOSS_AC : 0),
    toHit: proficiency + blow,
    dc: 8 + proficiency + cast,
    crit: BASE_CRIT + PER_POINT.CRIT * Math.max(0, mods.dex),
    initiative: mods.dex,
    saves: toScores(ABILITIES.map((a) => mods[a] + (boss || block.saves.includes(a) ? proficiency : 0))),
  };
}

// ---- The d20s (the design's section 12) ----

/** The salts of the scores' own hashes, so the d20s never draw from the fight's streams (`b.rng`, `b.skillRng`). */
export const STATS_SALT = 0x57a7;
export const INIT_SALT = 0x1a17;

/** A d20 (1 to 20) as a hash of the fight's seed and the moment: the same inputs always give the same roll. */
export const d20At = (seed: number, ...salts: number[]): number => (mixSeed(seed, STATS_SALT, ...salts) % 20) + 1;

/** A fighter's initiative roll at the fight's start: d20 + its DEX modifier, a hash of the seed and the fighter. */
export const initiativeRoll = (seed: number, id: number, dexMod: number): number => (mixSeed(seed, INIT_SALT, id) % 20) + 1 + dexMod;

/** What a d20 + to hit does against an AC (the design's section 3.2): a natural 20 crits, meeting the AC hits, missing by 1 to 5 glances
 *  (half damage), and missing by more or a natural 1 misses. */
export type BlowResult = 'crit' | 'hit' | 'glance' | 'miss';
export const GLANCE_BAND = 5;
export function blowResult(roll: number, toHit: number, ac: number): BlowResult {
  if (roll >= 20) return 'crit';
  if (roll <= 1) return 'miss';
  const total = roll + toHit;
  if (total >= ac) return 'hit';
  return ac - total <= GLANCE_BAND ? 'glance' : 'miss';
}
