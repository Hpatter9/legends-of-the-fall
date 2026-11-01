// What the six ability scores do to a hero's power in a fight (STATS batch 2, docs/notes/stats-2.md; the design is
// docs/notes/rpg-stats-design.md, sections 3.4, 5, 6 and 7). Health grows with CON, blows with the hero's blow ability, and each skill with
// its own ability: a weapon skill with the blow ability, a spell, heal, summon or song with the casting ability, a breath or bile with CON.
// Each point of modifier is +5% (`PER_POINT.POWER`), counted from the hero's level-1 scores, so a hero at level 1, rank 1 (or rank 0) is
// exactly as it was.
//
// The level curve gives back what the scores add on average (the design's section 5): every share is divided by the roster's mean share
// at the same level (`trimOf`), so the mean hero's health and attack at every level are what the curve alone gave, and what moves is only
// how the 45 heroes differ (a hero whose improvements go into its blows hits a little harder than one whose go into its second score).
// Ranks, grades and awakening are not trimmed: their score steps come on top of their hp and attack multipliers (`RANK_MULT`,
// `GRADE_BOOST`, `AWAKEN_MULT`, unchanged), as the owner's answer 4 has it.
//
// Scores from elsewhere (talents' stat nodes and gear's scores, `EquipStats.scores`) are never trimmed: they are what the hero has earned.
// Pure rules: no Pixi, no DOM, no randomness.

import { modsOf, PER_POINT, profileOf, scoresOf, STAT_PROFILES, type Ability, type Scores, type StatInput, type StatProfile } from './stats';

/** Which of a hero's abilities a skill takes (the design's section 7): its blow ability, its casting ability or CON. */
export type SkillStat = 'blow' | 'cast' | 'con';

/** What the scores multiply, as shares of the hero's level-1 numbers (each 1 at level 1, rank 1, with nothing extra). */
export interface StatMults {
  /** Health (CON). */
  hp: number;
  /** Ordinary blows and weapon skills (the blow ability). */
  blow: number;
  /** Spells, heals, summons, songs and the ultimate (the casting ability). */
  cast: number;
  /** Body skills: a breath, bile, a blood price (CON). */
  con: number;
}

const ONE: StatMults = { hp: 1, blow: 1, cast: 1, con: 1 };
const power = (mod: number) => 1 + PER_POINT.POWER * mod;

/** A profile's shares at a level, rank, grade and extra, against its level-1 scores (untrimmed). */
export function ownMults(p: StatProfile, at: StatInput = {}): StatMults {
  const one = modsOf(p.base);
  const now = modsOf(scoresOf(p, at));
  const share = (a: Ability) => power(now[a]) / power(one[a]);
  return { hp: share('con'), blow: share(p.blow), cast: share(p.cast), con: share('con') };
}

const trims = new Map<number, StatMults>();
/** The roster's mean shares at a level (rank 1, grade 1, nothing extra): what the curve gives back. 1 at level 1. */
export function trimOf(level = 1): StatMults {
  let t = trims.get(level);
  if (!t) {
    const all = Object.values(STAT_PROFILES).map((p) => ownMults(p, { level }));
    const mean = (k: keyof StatMults) => all.reduce((n, m) => n + m[k], 0) / all.length;
    t = { hp: mean('hp'), blow: mean('blow'), cast: mean('cast'), con: mean('con') };
    trims.set(level, t);
  }
  return t;
}

/** What a hero fights with: its level (lasting, or a run's own), whole rank (0 to 4, and 5 and 6 for awakening, as `heroRank`), grade in a
 *  run, and the score points its talents and gear give. */
export interface StatBoost {
  level?: number;
  rank?: number;
  grade?: number;
  equip?: { scores?: Partial<Scores> };
}

/** The scores' shares for a hero kind fighting with `boost`, after the curve's trim; all 1 for a kind with no profile (a foe, a summon,
 *  Duchess, the King). */
export function statMults(kind: string, boost: StatBoost = {}): StatMults {
  const p = profileOf(kind);
  if (!p) return ONE;
  const level = boost.level ?? 1;
  const grade = boost.grade ?? 1;
  const own = ownMults(p, { level, rank: boost.rank ?? 0, grade, extra: boost.equip?.scores });
  const t = trimOf(level);
  return { hp: own.hp / t.hp, blow: own.blow / t.blow, cast: own.cast / t.cast, con: own.con / t.con };
}

/** The weapon skills: a cut, a thrust, a shot, a charge, a jump, a blow. They take the caster's blow ability wherever they are cast from
 *  (a book can teach one to a wizard, who swings it with STR or DEX). The skills of a hero who both strikes and casts with STR or DEX are
 *  all weapon skills; this list is the weapon skills of the others. */
export const WEAPON_SKILLS: ReadonlySet<string> = new Set([
  // (the Ninja Monk's strikes, the Yamabushi's staff, the Satyr's horns, the Gorgon's serpent bite, the Commander's strike, the Paladin's
  // smite, the Ranger's arrow, the Reaper's scythe and hook, the Dread Pirate's grapeshot, the Dragoon's dive, the
  // Tyrant's chain, the Demon Swordsman's cuts)
  'Flurry of Blows', 'Quivering Palm', 'Step of the Wind', 'Ringing Staff', 'Butting Horns', 'Serpent Bite', 'Command Strike', 'Divine Smite',
  'Barbed Arrow', 'Reap', 'Grapeshot', 'Dragon Dive', 'Scourge', 'Hellblade Sweep', 'Blood Price',
]);
/** The body skills: a breath, bile, rot and scales. They take CON. */
export const BODY_SKILLS: ReadonlySet<string> = new Set(['Dragon Breath', 'Scale Ward', 'Inferno Breath', 'Contagion', 'Devour', 'Bile Spit', 'Plague Tide']);

/** Which ability a skill takes, by its key and the profile of the hero it belongs to (its home kit): a body skill CON, a listed weapon
 *  skill or any skill of a hero who strikes and casts with the same STR or DEX the blow ability, and the rest (spells, heals, summons, songs, ultimates) the
 *  casting ability. A skill with no home (a foe's) takes the casting ability. */
export function skillStatOf(key: string, home?: StatProfile): SkillStat {
  if (BODY_SKILLS.has(key)) return 'con';
  if (WEAPON_SKILLS.has(key)) return 'blow';
  if (home && home.cast === home.blow && (home.cast === 'str' || home.cast === 'dex')) return 'blow';
  return 'cast';
}

/** A hero's skill's strength from its ability, as a share of what its blows carry (its attack already holds the blow ability's share):
 *  1 for a weapon skill, the casting share over the blow share for a spell, and so on. `m` is the fighter's `StatMults`. */
export const skillShare = (m: StatMults | undefined, stat: SkillStat): number => (!m || stat === 'blow' ? 1 : m[stat] / m.blow);

/** The six scores a hero kind fights with (for the tools and the tests). */
export function fightScores(kind: string, boost: StatBoost = {}): Scores | undefined {
  const p = profileOf(kind);
  return p ? scoresOf(p, { level: boost.level ?? 1, rank: boost.rank ?? 0, grade: boost.grade ?? 1, extra: boost.equip?.scores }) : undefined;
}
