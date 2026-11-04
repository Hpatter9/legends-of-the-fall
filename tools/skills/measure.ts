// The skills overhaul's yardstick (docs/notes/skills-overhaul-design.md section 8, docs/notes/skills-1.md): the hero sweep's own seeded fights
// (`tools/heroSweep.ts`, random five-hero teams on the field bands), played at a level and stage, measuring what the sweep's win table does not:
// the pool's income (each hero's mana or stamina gained a second while it stands, from the refill, the blows and the gifts), how often each skill
// is cast (a minute of standing), the mean fight length, and the sim's time per fight.
//
//   node tools/skills/measure.mjs <level>:<stage> [<level>:<stage> ...]     GAMES fights a cell (default 2000)
//   PER=1 adds each hero's income and casts a minute. --skill-level <1-5> fights every skill at that level (`tools/heroSweep.ts`).
//
// Income is the sum of each tick's rise in a hero's pool (a cast's tick, where the pool falls, is left out: one tick of refill lost a cast).

import { fight, place, startBattle, stepBattle } from '../../src/sim/battle';
import { FIELD_BANDS } from '../../src/sim/foes';
import { mixSeed, Rng } from '../../src/sim/rng';
import { ALL_HEROES, UNITS } from '../../src/sim/units';
import { keyOf } from '../../src/sim/abilities';
import { HERO_KITS, resMax } from '../../src/sim/heroKits';
import { deploySpots, fieldBoost, pickTeam, sweepBoost } from '../heroSweep';

const GAMES = Number(process.env.GAMES ?? 2000);

interface Tally { gain: number; alive: number; casts: number[] }

function cell(level: number, stage: number) {
  const per = new Map<string, Tally>(ALL_HEROES.map((h) => [h, { gain: 0, alive: 0, casts: [0, 0, 0] }]));
  let won = 0;
  let length = 0;
  const t0 = performance.now();
  for (let g = 0; g < GAMES; g++) {
    const seed = g + 1;
    const team = pickTeam(new Rng(mixSeed(seed, 0x7ea4)));
    const b = startBattle(seed, FIELD_BANDS[g % FIELD_BANDS.length], fieldBoost(stage));
    const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a)));
    team.forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, sweepBoost(1, level)));
    fight(b);
    const heroes = b.units.filter((u) => u.side === 'hero' && HERO_KITS()[u.def]);
    while (b.phase === 'fight') {
      const before = heroes.map((u) => u.charge);
      const events = stepBattle(b);
      heroes.forEach((u, i) => {
        if (!u.alive) return;
        const t = per.get(u.def)!;
        const hk = HERO_KITS()[u.def];
        t.alive += 100;
        const rise = u.charge - before[i];
        if (rise > 0) t.gain += (rise / 100) * resMax(hk.pool);
      });
      for (const e of events) {
        if (e.kind !== 'skill') continue;
        const u = heroes.find((x) => x.id === e.by);
        if (!u) continue;
        const hk = HERO_KITS()[u.def];
        const slots = hk.slots ?? [hk.s1, hk.s2];
        const n = slots.findIndex((s) => keyOf(s.skill) === e.name || (s === hk.s2 && hk.s2.revive && keyOf(hk.s2.revive.skill) === e.name));
        if (n >= 0) per.get(u.def)!.casts[n]++;
      }
    }
    if (b.phase === 'won') won++;
    length += b.t;
  }
  const ms = (performance.now() - t0) / GAMES;
  const rows = ALL_HEROES.map((h) => {
    const t = per.get(h)!;
    const mins = t.alive / 60000;
    return { h, pool: HERO_KITS()[h].pool, income: t.gain / Math.max(1e-9, t.alive / 1000), c: t.casts.map((c) => c / Math.max(1e-9, mins)) };
  });
  const mean = (pool: string, f: (r: (typeof rows)[number]) => number) => {
    const rs = rows.filter((r) => r.pool === pool);
    return rs.reduce((a, r) => a + f(r), 0) / rs.length;
  };
  console.log(
    `level ${level} stage ${stage}, ${GAMES} fights: won ${((100 * won) / GAMES).toFixed(1)}%, fight ${(length / GAMES / 1000).toFixed(1)} s, ${ms.toFixed(1)} ms a fight;` +
      ` income stamina ${mean('stamina', (r) => r.income).toFixed(2)} SP/s, mana ${mean('mana', (r) => r.income).toFixed(2)} MP/s;` +
      ` casts a minute s1/s2: stamina ${mean('stamina', (r) => r.c[0]).toFixed(1)}/${mean('stamina', (r) => r.c[1]).toFixed(1)}, mana ${mean('mana', (r) => r.c[0]).toFixed(1)}/${mean('mana', (r) => r.c[1]).toFixed(1)}`,
  );
  if (process.env.PER) for (const r of rows) console.log(`  ${UNITS[r.h].name}: ${r.income.toFixed(2)} ${r.pool === 'mana' ? 'MP' : 'SP'}/s, casts a minute ${r.c.map((c) => c.toFixed(1)).join('/')}`);
}

for (const a of process.argv.slice(2).filter((x) => x.includes(':'))) {
  const [level, stage] = a.split(':').map(Number);
  cell(level, stage);
}
