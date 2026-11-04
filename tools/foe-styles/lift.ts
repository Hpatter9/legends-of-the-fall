// The hero sweep's lifts (`tools/kits/tune.ts`'s fights: game g meets field band g mod 9) broken down by band, with FOE-STYLES' knobs set
// first: each hero's wins in its fights against a band, less the band's average, so a band that favours or punishes a hero shows.
//   node tools/foe-styles/run.mjs lift <level> <stage> <games> [from] [to] [heroes,...]     (from and to share the games out to a child)
import './knobs';
import { FIELD_BANDS } from '../../src/sim/foes';
import { mixSeed, Rng } from '../../src/sim/rng';
import { ALL_HEROES } from '../../src/sim/units';
import { fieldBoost, pickTeam, play } from '../heroSweep';

const [level, stage, games] = process.argv.slice(2, 5).map(Number);
const from = Number(process.argv[5] ?? 0);
const to = Number(process.argv[6] ?? games);
const heroes = (process.argv[7] ?? '').split(',').filter(Boolean);
const n: Record<string, number[]> = {};
const w: Record<string, number[]> = {};
const bandN = FIELD_BANDS.map(() => 0);
const bandW = FIELD_BANDS.map(() => 0);
for (let g = from; g < to; g++) {
  const seed = g + 1;
  const team = pickTeam(new Rng(mixSeed(seed, 0x7ea4)));
  const bi = g % FIELD_BANDS.length;
  const won = play(seed, FIELD_BANDS[bi], fieldBoost(stage), team, 1, level).won;
  bandN[bi]++;
  if (won) bandW[bi]++;
  for (const h of team) {
    (n[h] ??= FIELD_BANDS.map(() => 0))[bi]++;
    if (won) (w[h] ??= FIELD_BANDS.map(() => 0))[bi]++;
  }
}
console.log(JSON.stringify({ bandN, bandW, n, w }));
if (heroes.length || process.argv.length <= 5) {
  for (const h of heroes.length ? heroes : ALL_HEROES)
    console.log(h.padEnd(16), FIELD_BANDS.map((b, i) => `${b} ${(100 * ((w[h]?.[i] ?? 0) / Math.max(1, n[h]?.[i] ?? 0) - bandW[i] / Math.max(1, bandN[i]))).toFixed(1)}`).join('  '));
}
