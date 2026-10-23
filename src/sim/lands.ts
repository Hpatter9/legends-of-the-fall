// Which land a fight is on, beyond the climb's own six: the spire draws a land for each five floors from all of them, and an
// army's waves alternate between its own one or two (`landOf` in armies.ts). Pure: no Pixi, no DOM, no clock; every draw is a
// side stream of the run's seed, so nothing else in a fight moves.

import { AREAS, type Area } from './board';
import { mixSeed, Rng } from './rng';

/** The land of a block of five spire floors: drawn from every land by the run's seed, never the same land twice running. */
export function spireArea(seed: number, floor: number): Area {
  const block = Math.floor((floor - 1) / 5);
  let at = -1;
  for (let b = 0; b <= block; b++) {
    const drawn = new Rng(mixSeed(seed, 0x5a1e, b)).int(0, AREAS.length - 1);
    at = drawn === at ? (drawn + 1) % AREAS.length : drawn;
  }
  return AREAS[at];
}
