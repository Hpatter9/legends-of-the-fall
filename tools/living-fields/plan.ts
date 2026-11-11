// LIVING-FIELDS: the audit's numbers and its shots' plan, headless.
//   node tools/living-fields/plan.mjs            prints, per land, how often each kind of ground and prop is laid (over 200 seeds)
//   node tools/living-fields/plan.mjs --shots    prints the plan for shots.mjs: three run seeds a land, each a different layout
import { AREAS, makeBoard } from '../../src/sim/board';
import { boardSeedOf, type Run } from '../../src/sim/run';
import { weatherFor, LAND_WEATHER } from '../../src/sim/weather';

const STAGE = 3;
const seedOf = (runSeed: number) => boardSeedOf({ seed: runSeed } as Run, STAGE);

if (process.argv.includes('--shots')) {
  const plan: Record<string, { seed: number; layout: string }[]> = {};
  for (const area of AREAS) {
    const seen = new Map<string, number>();
    const count = new Map<string, number>();
    for (let s = 1; s <= 400; s++) {
      const b = makeBoard(seedOf(s), area);
      const l = b.layout!;
      count.set(l, (count.get(l) ?? 0) + 1);
      // (a clear day, so the ground is what the shot shows)
      if (!seen.has(l) && weatherFor(seedOf(s), area) === (LAND_WEATHER[area].clear ? 'clear' : 'night')) seen.set(l, s);
    }
    // the land's three commonest shapes
    const top = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l).filter((l) => seen.has(l)).slice(0, 3);
    plan[area] = top.map((l) => ({ seed: seen.get(l)!, layout: l }));
  }
  console.log(JSON.stringify(plan));
} else {
  const N = 200;
  for (const area of AREAS) {
    const n: Record<string, number> = {};
    const boards: Record<string, number> = {};
    const lay: Record<string, number> = {};
    const add = (o: Record<string, number>, k: string, by = 1) => (o[k] = (o[k] ?? 0) + by);
    for (let s = 1; s <= N; s++) {
      const b = makeBoard(seedOf(s), area);
      add(lay, b.layout!);
      const has = new Set<string>();
      for (const t of b.tiles) {
        for (const k of [t.ground, t.rock && 'rock', t.wall && 'wall', t.barrel && 'barrel', t.bridge && 'bridge', t.bush && 'bush', t.h >= 3 && 'high'] as (string | false | undefined)[])
          if (k) {
            add(n, k);
            has.add(k);
          }
      }
      for (const k of has) add(boards, k);
      for (const h of b.hazards ?? []) add(n, `hazard:${h.kind}`);
    }
    const line = Object.keys(n).sort().map((k) => `${k} ${(n[k] / N).toFixed(1)}/board (${Math.round((100 * (boards[k] ?? 0)) / N)}% of boards)`).join('; ');
    const shapes = Object.entries(lay).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round((100 * v) / N)}%`).join(', ');
    console.log(`${area}\n  shapes: ${shapes}\n  ${line}`);
  }
}
