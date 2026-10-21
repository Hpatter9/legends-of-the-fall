// Achievements: things a player can do, each with crowns for the first time it is earned. A check reads what the game
// has just settled (a finished fight, the run, the meta), so it is pure: no Pixi, no DOM. The unlocked ids are kept in
// `Meta.achievements`; `checkAchievements` pays the crowns and returns what was new, for the toast.

import type { Battle } from './battle';
import { BOSS_BANDS } from './foes';
import type { Meta } from './meta';
import { levelOfKind } from './levels';
import type { Run } from './run';
import { ALL_HEROES, UNITS } from './units';
import { traitsOf } from './traits';

export interface AchievementCtx {
  /** The finished fight, when the check follows one (absent for a check on the run alone). */
  battle?: Battle;
  /** Whether that fight was won, and the stage it was. */
  won: boolean;
  stage: number;
  /** The stars the fight earned. */
  stars: number;
  run: Run;
  meta: Meta;
}

export interface Achievement {
  id: string;
  name: string;
  /** What to do, in plain words. */
  text: string;
  /** Crowns paid the first time it is earned. */
  crowns: number;
  earned(c: AchievementCtx): boolean;
  /** How far on it is, for the page (only for ones that count up). */
  meter?(m: Meta): { now: number; need: number };
}

/** The heroes that fought in a finished fight: every hero placed (alive or fallen). */
const heroesIn = (b: Battle | undefined) => (b?.units ?? []).filter((u) => u.side === 'hero' && !UNITS[u.def].summon);
const sumStars = (m: Meta) => Object.values(m.stars).reduce((n, s) => n + s, 0);
const bestDaily = (m: Meta) => Math.max(0, ...Object.values(m.daily).map((e) => e.best));

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'firstWin', name: 'First Blood', text: 'Win a stage.', crowns: 5, earned: (c) => c.won },
  {
    id: 'flawless',
    name: 'Not a Scratch',
    text: 'Win a stage with no hero lost.',
    crowns: 10,
    earned: (c) => c.won && heroesIn(c.battle).length > 0 && heroesIn(c.battle).every((u) => u.alive),
  },
  { id: 'perfect', name: 'Three Stars', text: 'Win a stage with three stars.', crowns: 15, earned: (c) => c.won && c.stars === 3 },
  { id: 'stage10', name: 'Tenth Stage', text: 'Win stage 10.', crowns: 10, earned: (c) => c.won && c.stage >= 10 },
  { id: 'stage20', name: 'Twentieth Stage', text: 'Win stage 20.', crowns: 20, earned: (c) => c.won && c.stage >= 20 },
  { id: 'stage30', name: 'Thirtieth Stage', text: 'Win stage 30.', crowns: 40, earned: (c) => c.won && c.stage >= 30 },
  {
    id: 'yokaiOnly',
    name: 'Yokai Only',
    text: 'Win a stage with only Yokai heroes.',
    crowns: 20,
    earned: (c) => {
      const heroes = heroesIn(c.battle);
      return c.won && heroes.length > 0 && heroes.every((u) => traitsOf(u.def).includes('yokai'));
    },
  },
  { id: 'threeStar', name: 'Three-Star Hero', text: 'Merge a hero to three stars.', crowns: 15, earned: (c) => c.run.roster.some((h) => h.grade >= 3) },
  { id: 'relics5', name: 'Relic Hoarder', text: 'Collect five relics in one run.', crowns: 15, earned: (c) => (c.run.relics?.length ?? 0) >= 5 },
  { id: 'level10', name: 'Veteran', text: 'Bring a hero to level 10.', crowns: 20, earned: (c) => ALL_HEROES.some((k) => levelOfKind(c.meta, k) >= 10) },
  {
    id: 'allHeroes',
    name: 'Full Roster',
    text: 'Unlock every hero.',
    crowns: 30,
    earned: (c) => ALL_HEROES.every((k) => c.meta.unlocked.includes(k)),
    meter: (m) => ({ now: ALL_HEROES.filter((k) => m.unlocked.includes(k)).length, need: ALL_HEROES.length }),
  },
  {
    id: 'bosses',
    name: 'Boss Slayer',
    text: 'Beat every boss.',
    crowns: 50,
    earned: (c) => BOSS_BANDS.every((b) => c.meta.bosses.includes(b)),
    meter: (m) => ({ now: BOSS_BANDS.filter((b) => m.bosses.includes(b)).length, need: BOSS_BANDS.length }),
  },
  {
    id: 'stars50',
    name: 'Star Collector',
    text: 'Earn 50 stars in all.',
    crowns: 25,
    earned: (c) => sumStars(c.meta) >= 50,
    meter: (m) => ({ now: Math.min(50, sumStars(m)), need: 50 }),
  },
  {
    id: 'daily1000',
    name: 'Daily Champion',
    text: 'Score 1000 in a daily challenge.',
    crowns: 25,
    earned: (c) => bestDaily(c.meta) >= 1000,
    meter: (m) => ({ now: Math.min(1000, bestDaily(m)), need: 1000 }),
  },
  {
    id: 'daily',
    name: 'Daily Devotee',
    text: 'Finish a daily challenge.',
    crowns: 10,
    earned: (c) => c.run.mode?.kind === 'daily' && c.run.over,
  },
  { id: 'tower1', name: 'Up the Tower', text: 'Clear a floor of the endless tower.', crowns: 10, earned: (c) => c.meta.tower >= 1 },
  {
    id: 'tower20',
    name: 'Tower Climber',
    text: 'Clear 20 floors of the endless tower.',
    crowns: 40,
    earned: (c) => c.meta.tower >= 20,
    meter: (m) => ({ now: Math.min(20, m.tower), need: 20 }),
  },
  {
    id: 'recruiter',
    name: 'Recruiter',
    text: 'Make 10 pulls at the recruiting.',
    crowns: 10,
    earned: (c) => c.meta.pulls >= 10,
    meter: (m) => ({ now: Math.min(10, m.pulls), need: 10 }),
  },
];

export const achievementById = (id: string): Achievement | undefined => ACHIEVEMENTS.find((a) => a.id === id);

/** Check every achievement not yet unlocked. Each one earned is kept in the meta and pays its crowns; returns those, for the toast. */
export function checkAchievements(c: AchievementCtx): Achievement[] {
  const got: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (c.meta.achievements.includes(a.id) || !a.earned(c)) continue;
    c.meta.achievements.push(a.id);
    c.meta.crowns += a.crowns;
    got.push(a);
  }
  return got;
}
