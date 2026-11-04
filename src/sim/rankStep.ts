// What a rank or an awakening step does to a hero, for the Rank up card (docs/notes/rankup-scores.md). Health and attack are the fight's own
// (`addUnit`: the level and rank boost, then the scores' shares from `statMults`); the scores, modifiers and what they mean come from
// `derivedOf` and `statLines.ts`, the same the hero sheet's Stats panel reads. Nothing here copies a formula.
// Pure rules: no Pixi, no DOM, no randomness.

import { gradeBoost } from './run';
import { statMults } from './statPower';
import { ABILITIES, ABILITY_SHORT, derivedOf, profileOf, type Ability, type Scores } from './stats';
import { scoreEffects, signed, type HeroAt } from './statLines';
import { UNITS } from './units';

/** A hero's health and attack as a fight gives them at a level and whole rank (as `heroRank` counts it), grade 1: the level's and rank's
 *  boost, with the six scores' shares on top, and the score points its talents and gear add (`extra`). The hero sheet shows the same. */
export function fightFigures(kind: string, level: number, rank: number, extra?: Partial<Scores>): { hp: number; atk: number } {
  const def = UNITS[kind];
  const boost = { ...gradeBoost(1, rank, level), ...(extra ? { equip: { scores: extra } } : {}) };
  const st = statMults(kind, boost);
  return { hp: Math.round(def.hp * boost.hp! * st.hp), atk: Math.round(def.atk * boost.atk! * st.blow) };
}

/** One score a step raises. */
export interface ScoreStep {
  ability: Ability;
  short: string;
  from: number;
  to: number;
  /** The modifier before and after, written "+3 → +4", when it moved; else undefined. */
  mod?: string;
  /** What the new modifier does ("blows +5%", "health +5%"). */
  effects: string[];
}

export interface StepPlan {
  hp: [number, number];
  atk: [number, number];
  scores: ScoreStep[];
  /** AC, to hit, skill DC and saves, only those the step changes: "AC 15 → 16". */
  figures: string[];
}

/** The numbers for a hero going from whole rank `from` to rank `to` (the next rank, or the next awakened step) at `level`. */
export function stepPlan(kind: string, level: number, from: number, to: number, extra?: Partial<Scores>): StepPlan | undefined {
  const p = profileOf(kind);
  if (!p) return undefined;
  const at = (rank: number): HeroAt => ({ level, rank, grade: 1, extra });
  const a = derivedOf(p, at(from));
  const b = derivedOf(p, at(to));
  const scores: ScoreStep[] = [];
  for (const k of ABILITIES) {
    if (a.scores[k] === b.scores[k]) continue;
    const moved = a.mods[k] !== b.mods[k];
    scores.push({
      ability: k, short: ABILITY_SHORT[k], from: a.scores[k], to: b.scores[k],
      ...(moved ? { mod: `${signed(a.mods[k])} → ${signed(b.mods[k])}` } : {}),
      effects: moved ? scoreEffects(p, a, b, k, false) : [],
    });
  }
  const figures: string[] = [];
  const diff = (label: string, x: number, y: number, sign = false) => { if (x !== y) figures.push(`${label} ${sign ? signed(x) : x} → ${sign ? signed(y) : y}`); };
  diff('AC', a.ac, b.ac);
  diff('To hit', a.toHit, b.toHit, true);
  diff('Skill DC', a.dc, b.dc);
  for (const k of ABILITIES) diff(`${ABILITY_SHORT[k]} save`, a.saves[k], b.saves[k], true);
  const x = fightFigures(kind, level, from, extra);
  const y = fightFigures(kind, level, to, extra);
  return { hp: [x.hp, y.hp], atk: [x.atk, y.atk], scores, figures };
}
