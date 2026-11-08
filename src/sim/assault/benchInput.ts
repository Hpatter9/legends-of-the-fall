// The benches' assault (phase 1, `docs/notes/assault-1.md`): the five starting heroes at level 55 (the Orcs' Legendary level), at their third
// grade, each with a full platoon of recruits, on the default plan, the bot playing (Auto). `?bench=assault` and `npm run assault-bench` play
// it; neither touches a save.

import { gradeBoost } from '../run';
import type { AssaultInput } from './holdTypes';

export const BENCH_PARTY = ['knight', 'samurai', 'archer', 'wizard', 'kunoichi'] as const;

export function benchInput(seed: number, level = 55): AssaultInput {
  return {
    seed,
    army: 'orcs',
    heroes: BENCH_PARTY.map((k) => ({ kind: k, boost: gradeBoost(3, 0, level), level })),
    troops: Object.fromEntries(BENCH_PARTY.map((k) => [k, Array(10).fill(0)])),
    approaches: { knight: 'bridge', samurai: 'bridge', archer: 'west', wizard: 'east', kunoichi: 'bridge' },
    auto: true,
  };
}
