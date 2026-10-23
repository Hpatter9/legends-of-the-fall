// The weather of a fight: for looks, as data. Each land has weathers that fit it and the fight rolls one from a side stream of
// its board's seed (often clear). Nothing in the simulation reads it today; it is here, as a pure function of the board, for a rule
// that wants it (for fog to shorten a bow's reach, say) and for the renderer to draw (`src/render/weatherView.ts`). Pure: no Pixi,
// no DOM, no clock; it draws nothing from the fight's own stream, so no fight plays out differently.

import { AREAS, type Area, type Board } from './board';
import { mixSeed, Rng } from './rng';

export const WEATHERS = ['clear', 'rain', 'snow', 'fog', 'leaves', 'embers', 'ash', 'night'] as const;
export type Weather = (typeof WEATHERS)[number];

/** The weathers each land can have, with their odds (a share of the land's total). */
export const LAND_WEATHER: Record<Area, Partial<Record<Weather, number>>> = {
  highlands: { clear: 5, rain: 2, fog: 2, night: 1 },
  forest: { clear: 4, rain: 2, fog: 2, leaves: 1, night: 1 },
  snow: { clear: 3, snow: 4, fog: 1 },
  desert: { clear: 8, night: 1 },
  volcano: { clear: 2, embers: 4, ash: 3 },
  dungeon: { clear: 6, fog: 2 },
  plains: { clear: 6, rain: 2, fog: 1, night: 1 },
  autumn: { clear: 3, leaves: 5, rain: 2, fog: 1 },
  swamp: { clear: 2, fog: 4, rain: 3, night: 1 },
  graveyard: { clear: 2, fog: 4, rain: 2, night: 3 },
  ruins: { clear: 4, ash: 2, fog: 2, rain: 1, night: 1 },
  temple: { clear: 4, rain: 2, fog: 2, leaves: 1 },
  crystal: { clear: 6, fog: 2 },
  forge: { clear: 2, embers: 5, ash: 1 },
  // (the Moonlit Shrine is always at night: the owner's call)
  shrine: { night: 1 },
  warcamp: { clear: 3, ash: 2, rain: 2, night: 3, fog: 1 },
  oasis: { clear: 8, night: 1 },
};

/** Roll a land's weather for a board seed (the same seed always has the same weather). */
export function weatherFor(seed: number, area: Area): Weather {
  const table = LAND_WEATHER[area];
  const keys = WEATHERS.filter((w) => (table[w] ?? 0) > 0);
  return new Rng(mixSeed(seed, 0x3ea7, AREAS.indexOf(area))).weighted(Object.fromEntries(keys.map((w) => [w, table[w]!])) as Record<Weather, number>);
}

/** The weather a board has: the one rule code should read (`weatherOf(b.board)`). */
export const weatherOf = (b: Pick<Board, 'seed' | 'area'>): Weather => weatherFor(b.seed, b.area);
