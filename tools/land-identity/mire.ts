// LAND-IDENTITY, the terrain proposal: what the mire's flooding (`src/sim/landTerrain.ts`) does to a fight, measured with the switch
// off and on over the same seeds, teams and bands (the hero sweep's fights, on the mire's boards):
//   node tools/land-identity/mire.mjs [--games 3000] [--stage 5]
import '../joint/off';
import '../tactics/off';
import { boardOk, makeBoard, standable } from '../../src/sim/board';
import { FIELD_BANDS } from '../../src/sim/foes';
import { LAND_TERRAIN, layLandTerrain } from '../../src/sim/landTerrain';
import { mixSeed, Rng } from '../../src/sim/rng';
import { fieldBoost, pickTeam, play } from '../heroSweep';

const arg = (name: string, fallback: number): number => (process.argv.includes(name) ? Number(process.argv[process.argv.indexOf(name) + 1]) : fallback);
const GAMES = arg('--games', 3000);
const STAGE = arg('--stage', 5);

// the boards: how much of the mire is shallow water, before and after
let open = 0;
let wetOff = 0;
let wetOn = 0;
let walkable = 0;
let most = 0;
const BOARDS = 500;
for (let seed = 1; seed <= BOARDS; seed++) {
  const b = makeBoard(seed, 'swamp');
  const n = b.tiles.filter((t) => standable(t)).length;
  open += n;
  wetOff += b.tiles.filter((t) => t.ground === 'water').length;
  LAND_TERRAIN.on = true;
  layLandTerrain(b, seed);
  LAND_TERRAIN.on = false;
  const w = b.tiles.filter((t) => t.ground === 'water').length;
  wetOn += w;
  most = Math.max(most, w / n);
  if (boardOk(b)) walkable++;
}
console.log(`\nTHE MIRE'S BOARDS (${BOARDS} seeds)`);
console.log(`shallow water, share of the standable tiles: ${((100 * wetOff) / open).toFixed(1)}% as it is, ${((100 * wetOn) / open).toFixed(1)}% flooded (the wettest board ${(100 * most).toFixed(0)}%)`);
console.log(`tiles a board: ${(wetOff / BOARDS).toFixed(1)} as it is, ${(wetOn / BOARDS).toFixed(1)} flooded; boards every tile of which can still be walked to: ${walkable} of ${BOARDS}`);

// the fights: the same seeds, teams and bands, with the switch off and then on
const tally = (on: boolean): { won: number; by: Map<string, [number, number]> } => {
  LAND_TERRAIN.on = on;
  let won = 0;
  const by = new Map<string, [number, number]>();
  for (let g = 0; g < GAMES; g++) {
    const seed = g + 1;
    const band = FIELD_BANDS[g % FIELD_BANDS.length];
    const team = pickTeam(new Rng(mixSeed(seed, 0x7ea4)));
    const w = play(seed, band, { ...fieldBoost(STAGE), area: 'swamp' }, team).won;
    if (w) won++;
    const t = by.get(band) ?? [0, 0];
    by.set(band, [t[0] + (w ? 1 : 0), t[1] + 1]);
  }
  LAND_TERRAIN.on = false;
  return { won, by };
};
const off = tally(false);
const on = tally(true);
const pct = (w: number, n: number) => ((100 * w) / n).toFixed(1).padStart(6);
console.log(`\nTHE MIRE'S FIGHTS (${GAMES} random five-hero teams, the field bands in turn, stage ${STAGE} foes, on the mire)`);
console.log(`${'band'.padEnd(16)}${'as it is %'.padStart(12)}${'flooded %'.padStart(12)}${'change'.padStart(9)}`);
for (const [band, [w, n]] of off.by) {
  const [w2] = on.by.get(band)!;
  console.log(`${band.padEnd(16)}${pct(w, n).padStart(12)}${pct(w2, n).padStart(12)}${(((100 * (w2 - w)) / n).toFixed(1)).padStart(9)}`);
}
console.log(`${'all'.padEnd(16)}${pct(off.won, GAMES).padStart(12)}${pct(on.won, GAMES).padStart(12)}${(((100 * (on.won - off.won)) / GAMES).toFixed(1)).padStart(9)}`);
// (the sample's own noise, for reading the change: one standard error of a share near a half over this many fights)
console.log(`(one standard error of a share over ${GAMES} fights is about ${(50 / Math.sqrt(GAMES)).toFixed(1)} points; over a band's ${Math.round(GAMES / FIELD_BANDS.length)}, about ${(50 / Math.sqrt(GAMES / FIELD_BANDS.length)).toFixed(1)})`);
