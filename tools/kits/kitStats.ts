// How the hero kits play out (COMBAT-002): random five-hero teams on the field bands (as the hero sweep plays them), counting each hero's casts a
// fight-minute by skill, its ultimates and how long the first one took, and the team's win rate and fight length. For tuning the pools and the meter.
//   node tools/kits/run.mjs [games] [stage] [level]      e.g. 2000 5 1, or 2000 39 30
//   node tools/kits/run.mjs 2000 39 30 --manual          the same with Auto off (no ultimate fires: the meter's fill time is still measured)

import { fight, place, startBattle, stepBattle } from '../../src/sim/battle';
import { FIELD_BANDS } from '../../src/sim/foes';
import { gradeBoost } from '../../src/sim/run';
import { mixSeed, Rng } from '../../src/sim/rng';
import { KITS } from '../../src/sim/abilities';
import { ALL_HEROES } from '../../src/sim/units';
import { deploySpots, fieldBoost, pickTeam } from '../heroSweep';

const [games = 2000, stage = 5, level = 1] = process.argv.slice(2).filter((a) => !a.startsWith('--')).map(Number);
const manual = process.argv.includes('--manual');

interface Row { fights: number; secs: number; casts: Map<string, number>; ults: number; firstUlt: number[]; wins: number; fill: number; fillSecs: number }
const rows = new Map<string, Row>(ALL_HEROES.map((h) => [h, { fights: 0, secs: 0, casts: new Map(), ults: 0, firstUlt: [], wins: 0, fill: 0, fillSecs: 0 }]));
let wins = 0;
let secs = 0;
for (let g = 0; g < games; g++) {
  const seed = g + 1;
  const team = pickTeam(new Rng(mixSeed(seed, 0x7ea4)));
  const b = startBattle(seed, FIELD_BANDS[g % FIELD_BANDS.length], fieldBoost(stage));
  const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a)));
  team.forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, gradeBoost(1, 0, level)));
  if (manual) (b as { autoUlt?: boolean }).autoUlt = false;
  fight(b);
  const first = new Map<number, number>();
  const filled = new Map<number, number>();
  while (b.phase === 'fight') {
    for (const e of stepBattle(b)) {
      if (e.kind !== 'skill') continue;
      const u = b.units.find((x) => x.id === e.by)!;
      const r = rows.get(u.def);
      if (!r || u.owner !== undefined) continue;
      if (KITS[u.def].ultimate?.name === e.name) {
        r.ults++;
        if (!first.has(u.id)) first.set(u.id, b.t);
      } else r.casts.set(e.name, (r.casts.get(e.name) ?? 0) + 1);
    }
    if (manual) for (const u of b.units) if (u.side === 'hero' && (u.charge2 ?? 0) >= 100 && !first.has(u.id)) first.set(u.id, b.t);
    // (the meter's fill: points gained a second while the hero stands and its meter is not full)
    for (const u of b.units) {
      const r = rows.get(u.def);
      if (!r || u.owner !== undefined || u.side !== 'hero' || !u.alive) continue;
      const was = filled.get(u.id) ?? 0;
      const now = u.charge2 ?? 0;
      if (was < 100) {
        r.fill += Math.max(0, now - was) + (now < was ? now : 0);
        r.fillSecs += 0.1;
      }
      filled.set(u.id, now);
    }
  }
  const won = b.phase === 'won';
  if (won) wins++;
  secs += b.t / 1000;
  for (const u of b.units) {
    const r = rows.get(u.def);
    if (!r || u.owner !== undefined || u.side !== 'hero') continue;
    r.fights++;
    r.secs += b.t / 1000;
    if (won) r.wins++;
    if (first.has(u.id)) r.firstUlt.push(first.get(u.id)! / 1000);
  }
}
console.log(`${games} fights at stage ${stage}, level ${level}${manual ? ' (manual)' : ''}: won ${((100 * wins) / games).toFixed(1)}%, mean fight ${(secs / games).toFixed(1)}s`);
console.log('hero'.padEnd(18), 'win%', ' casts/min by skill', ' | ults/fight, first ult (s, share of fights)');
let allCasts = 0;
let allFill = 0;
let allFillSecs = 0;
let allSecs = 0;
for (const [h, r] of rows) {
  const per = [...r.casts].map(([n, c]) => `${n} ${((60 * c) / r.secs).toFixed(1)}`).join(', ');
  allCasts += [...r.casts.values()].reduce((a, c) => a + c, 0);
  allSecs += r.secs;
  const fu = r.firstUlt.length ? (r.firstUlt.reduce((a, x) => a + x, 0) / r.firstUlt.length).toFixed(1) : '-';
  const fillS = r.fill > 0 ? ((100 * r.fillSecs) / r.fill).toFixed(0) : '-';
  allFill += r.fill;
  allFillSecs += r.fillSecs;
  console.log(h.padEnd(18), ((100 * r.wins) / Math.max(1, r.fights)).toFixed(0).padStart(4), ' ', per, ` | ${(r.ults / Math.max(1, r.fights)).toFixed(2)}, ${fu} (${((100 * r.firstUlt.length) / Math.max(1, r.fights)).toFixed(0)}%) fill ${fillS}s`);
}
console.log(`all heroes: ${((60 * allCasts) / allSecs).toFixed(2)} skill casts a hero-minute; the ultimate's meter fills in ${allFill ? ((100 * allFillSecs) / allFill).toFixed(1) : '-'}s of standing in a fight`);
