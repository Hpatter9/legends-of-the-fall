// Finds the openers (docs/notes/tactics.md; `node tools/tactics/run.mjs --openers`): the hero skills that move their caster toward the foe, read from seeded fights (a move of its
// own in the same tick as the skill, ending nearer the nearest foe than it began). Read-only.
import { fight, place, startBattle, stepBattle } from '../../src/sim/battle';
import { FIELD_BANDS } from '../../src/sim/foes';
import { mixSeed, Rng } from '../../src/sim/rng';
import { ALL_HEROES } from '../../src/sim/units';
import { deploySpots, fieldBoost, sweepBoost } from '../heroSweep';

const GAMES = process.argv.includes('--games') ? Number(process.argv[process.argv.indexOf('--games') + 1]) : 400;
const tally = new Map<string, { casts: number; closer: number; farther: number }>();
for (let g = 0; g < GAMES; g++) {
  const seed = g + 1;
  const rng = new Rng(mixSeed(seed, 0x7ea4));
  const pool = [...ALL_HEROES];
  const team: string[] = [];
  for (let i = 0; i < 5; i++) team.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  const b = startBattle(seed, FIELD_BANDS[g % FIELD_BANDS.length], fieldBoost(27));
  const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a)));
  team.forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, sweepBoost(1, 30)));
  fight(b);
  while (b.phase === 'fight') {
    const before = new Map(b.units.map((u) => [u.id, { u: u.u, v: u.v }]));
    const near = (_id: number, at: { u: number; v: number }) => Math.min(...b.units.filter((f) => f.alive && f.side === 'foe').map((f) => Math.abs(f.u - at.u) + Math.abs(f.v - at.v)));
    const dist0 = new Map(b.units.filter((u) => u.side === 'hero').map((u) => [u.id, near(u.id, u)]));
    const ev = stepBattle(b);
    for (const e of ev) {
      if (e.kind !== 'skill') continue;
      const me = b.units.find((u) => u.id === e.by);
      if (!me || me.side !== 'hero') continue;
      const k = `${me.def}:${e.name}`;
      const t = tally.get(k) ?? { casts: 0, closer: 0, farther: 0 };
      t.casts++;
      const from = before.get(me.id)!;
      if (from.u !== me.u || from.v !== me.v) {
        const d1 = near(me.id, me);
        if (d1 < dist0.get(me.id)! - 1) t.closer++;
        else if (d1 > dist0.get(me.id)!) t.farther++;
      }
      tally.set(k, t);
    }
  }
}
for (const [k, t] of [...tally].filter(([, t]) => t.closer / t.casts >= 0.08).sort((a, c) => a[0].localeCompare(c[0]))) console.log(`${k.padEnd(40)} ${t.casts}  closer ${((100 * t.closer) / t.casts).toFixed(0)}%  farther ${((100 * t.farther) / t.casts).toFixed(0)}%`);
