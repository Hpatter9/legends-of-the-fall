// An opt-in expedition prototype. Plan all sections before play; the renderer still only receives revealed sections.
import { boardOk, DEPLOY_ROWS, type Area, type Board, type Tile } from './board';
import { type Section } from './chain';
import { mixSeed, Rng } from './rng';

export const SCENARIOS = ['mountain', 'temple', 'necropolis'] as const;
export type ScenarioId = (typeof SCENARIOS)[number];
export const SCENARIO_SIZE = { w: 12, d: 16 } as const;
export const isScenario = (id: unknown): id is ScenarioId => SCENARIOS.includes(id as ScenarioId);

export interface ScenarioPlan {
  theme: ScenarioId;
  seed: number;
  sections: Section[];
  /** First wave whose dropped terrain may display the destination. */
  revealWave: number;
  destination: { wave: number; u: number; v: number; kind: 'fortress' | 'temple' | 'mausoleum' };
  waterLevel: number | null;
}

/** One field in world coordinates, sampled by every section. Heights do not restart at section boundaries. */
export function scenarioHeight(theme: ScenarioId, U: number, V: number, waves: number, seed = 0): number {
  const progress = Math.max(0, SCENARIO_SIZE.d - 1 - V);
  const localU = U - routeU(seed, V);
  if (theme === 'temple') return localU < 4 ? 1 : Math.min(4, 2 + Math.floor((localU - 4) / 3));
  const rise = progress * (theme === 'mountain' ? 9 : 5) / (Math.max(2, waves) * SCENARIO_SIZE.d);
  // Broad stepped ridges, with each shoulder rising by a legal walking step.
  return Math.min(12, Math.floor(rise + Math.abs(localU - 5) / (theme === 'mountain' ? 2 : 3)));
}

/** A seeded shoreline/switchback spine; adjacent rows move at most one tile. */
export function routeU(seed: number, V: number): number {
  const phase = (mixSeed(seed, 0x7017) % 1000) / 1000 * Math.PI * 2;
  return Math.round(Math.sin(V / 30 + phase) * 3);
}

/** A complete seeded route through one landscape. This first slice follows a continuous valley/shoreline spine. */
export function planScenario(seed: number, theme: ScenarioId, waves: number, boss: (wave: number) => boolean): ScenarioPlan {
  if (!Number.isInteger(waves) || waves < 1) throw new Error('a scenario needs at least one wave');
  const { w, d } = SCENARIO_SIZE;
  const sections: Section[] = [];
  const revealWave = Math.max(1, waves - 1);
  const destinationV = -(waves - 1) * d - 2;
  const destinationU = routeU(seed, -(waves - 1) * d + Math.floor(d / 2)) + 5.5;
  for (let n = 1; n <= waves; n++) {
    const origin = { u: routeU(seed, -(n - 1) * d + Math.floor(d / 2)), v: -(n - 1) * d };
    const rng = new Rng(mixSeed(seed, 0x5ce1, n));
    const phase = n / waves;
    const area: Area = theme === 'mountain' ? (phase < 0.3 ? 'forest' : phase > 0.75 ? 'snow' : 'highlands') : theme === 'temple' ? (phase < 0.3 ? 'forest' : phase < 0.6 ? 'swamp' : phase < 0.85 ? 'ruins' : 'temple') : phase < 0.2 ? 'plains' : 'graveyard';
    const tiles: Tile[] = [];
    for (let v = 0; v < d; v++) for (let u = 0; u < w; u++) {
      const V = origin.v + v;
      const U = origin.u + u;
      const shore = routeU(seed, V);
      const t: Tile = { h: scenarioHeight(theme, U, V, waves, seed), deco: rng.int(0, 255) };
      if (theme === 'temple' && U < shore + 3) t.ground = 'deep';
      else if (theme === 'temple' && U === shore + 3) t.ground = 'water';
      else if (u !== 5 && u !== 6 && v >= DEPLOY_ROWS && v < d - DEPLOY_ROWS && rng.chance(theme === 'necropolis' ? 0.06 + phase * 0.15 : 0.13)) {
        if (theme === 'necropolis') t.wall = true;
        else t.rock = true;
      } else if (rng.chance(0.12)) t.bush = true;
      // Causeways span the same lake, at its fixed water height, without dividing the shore route.
      if (theme === 'temple' && v === Math.floor(d / 2) && u <= 4) {
        delete t.ground;
        t.h = 1;
        t.bridge = true;
      }
      tiles.push(t);
    }
    const board: Board = { ...(n >= revealWave ? { landmark: theme === 'mountain' ? 'fortress' as const : theme === 'temple' ? 'temple' as const : 'mausoleum' as const, landmarkAt: { u: destinationU - origin.u, v: destinationV - origin.v, h: scenarioHeight(theme, destinationU, destinationV, waves, seed) } } : {}), seed: mixSeed(seed, 0x57a6e, n), area, w, d, tiles };
    // Keep props only when every walkable tile remains reachable by the least mobile ground unit.
    if (!boardOk(board)) for (const t of tiles) { delete t.rock; delete t.wall; }
    if (!boardOk(board)) throw new Error(`disconnected ${theme} section ${n} for seed ${seed}`);
    sections.push({ wave: n, board, rot: 0, origin, join: n === 1 ? null : 'ne', boss: boss(n) });
  }
  return {
    theme, seed, sections, revealWave,
    destination: { wave: waves, u: destinationU, v: destinationV, kind: theme === 'mountain' ? 'fortress' : theme === 'temple' ? 'temple' : 'mausoleum' },
    waterLevel: theme === 'temple' ? 1 : null,
  };
}
