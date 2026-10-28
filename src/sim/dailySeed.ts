// The daily challenge's date, seed and land: kept apart so the run's rules (`run.ts`) and the daily's shape (`daily.ts`) can read them
// without reading the modes. Pure: no Pixi, no DOM; the date is yyyymmdd.

import { AREAS, type Area } from './board';
import { Rng, mixSeed } from './rng';
import { dailyTheme } from './dailyThemes';

/** yyyymmdd for a calendar date (the page passes today's). */
export const dateKey = (year: number, month: number, day: number): number => year * 10000 + month * 100 + day;

/** The seed of a date's daily challenge. */
export const dailySeed = (date: number): number => mixSeed(date, 0xda11);

/** The land a date's daily challenge is fought in (the same all day). */
export const dailyArea = (date: number): Area => dailyTheme(date)?.area ?? AREAS[new Rng(mixSeed(date, 0xa4ea)).int(0, AREAS.length - 1)];
