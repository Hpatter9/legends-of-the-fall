// LAND-IDENTITY: what turning the battlefield's two switches on does to a fight, measured over the same seeds, teams and bands with
// both off and then both on (the hero sweep's fights, on each land's own boards): `FIELD_HAZARDS` (the traps and hazards, laid at the
// level a run lays them at this wave) and `LAND_TERRAIN` (a land's own terrain laid thicker).
//   node tools/land-identity/flip.mjs [--games 1800] [--stage 5] [--lands swamp,snow]   (every land unless named)
//   --only hazards | terrain   turns only that one on in the second pass
import '../joint/off';
import '../tactics/off';
import { AREAS, boardOk, makeBoard, standable, type Area } from '../../src/sim/board';
import { FIELD_BANDS } from '../../src/sim/foes';
import { FIELD_HAZARDS, hazardLevel } from '../../src/sim/fieldTraps';
import { FLOODS, LAND_TERRAIN, layLandTerrain } from '../../src/sim/landTerrain';
import { mixSeed, Rng } from '../../src/sim/rng';
import { fieldBoost, pickTeam, play, SWEEP } from '../heroSweep';

const has = (name: string) => process.argv.includes(name);
const val = (name: string): string | undefined => (has(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);
const GAMES = Number(val('--games') ?? 1800);
const STAGE = Number(val('--stage') ?? 5);
const LANDS = (val('--lands')?.split(',') as Area[] | undefined) ?? [...AREAS];
const ONLY = val('--only');
const LEVEL = hazardLevel(STAGE, 0);
// (`--force`: a land whose own terrain is off is measured with it on; `--base hazards`: the first pass has the traps on too, so the
//  change read is the terrain's alone, on top of the traps as the game now has them)
if (has('--force')) for (const a of LANDS) if (FLOODS[a]) FLOODS[a]!.on = true;
const BASE_HAZARDS = val('--base') === 'hazards';
// (`--set volcano=1,1,1,2`: try a land's patches at other numbers: pools min,max and size min,max; several with `;`)
for (const part of (val('--set') ?? '').split(';').filter(Boolean)) {
  const [a, nums] = part.split('=');
  const [p0, p1, s0, s1] = nums.split(',').map(Number);
  const fl = FLOODS[a as Area];
  if (fl) Object.assign(fl, { pools: [p0, p1], size: [s0, s1] });
}

// (`--boards`: how much of each land's own ground its boards carry, as `makeBoard` lays them and with the land's terrain laid thicker)
if (has('--boards')) {
  const N = 500;
  console.log(`\nTHE BOARDS (${N} seeds a land)`);
  for (const area of LANDS) {
    const flood = FLOODS[area];
    if (!flood) continue;
    const is = (t: { ground?: string; rock?: boolean }) => (flood.kind === 'rock' ? !!t.rock : t.ground === flood.kind);
    let [open, was, now, ok, most] = [0, 0, 0, 0, 0];
    for (let seed = 1; seed <= N; seed++) {
      const b = makeBoard(seed, area);
      const stands = (t: (typeof b.tiles)[number]): boolean => standable(t);
      const n = b.tiles.filter((t) => stands(t) || (flood.kind === 'rock' && !!t.rock)).length;
      open += n;
      was += b.tiles.filter(is).length;
      const [t0, f0] = [LAND_TERRAIN.on, flood.on];
      LAND_TERRAIN.on = flood.on = true;
      layLandTerrain(b, seed);
      LAND_TERRAIN.on = t0;
      flood.on = f0;
      const k = b.tiles.filter(is).length;
      now += k;
      most = Math.max(most, k / n);
      if (boardOk(b)) ok++;
    }
    console.log(`${area.padEnd(11)}${flood.kind.padEnd(6)} ${((100 * was) / open).toFixed(1)}% of the open tiles as it is, ${((100 * now) / open).toFixed(1)}% laid thicker (${(was / N).toFixed(1)} tiles a board to ${(now / N).toFixed(1)}; the most on a board ${(100 * most).toFixed(0)}%); every tile still walkable on ${ok} of ${N}`);
  }
}

const tally = (area: Area, on: boolean): Map<string, [number, number]> => {
  FIELD_HAZARDS.on = BASE_HAZARDS || (on && ONLY !== 'terrain');
  LAND_TERRAIN.on = on && ONLY !== 'hazards';
  SWEEP.hazards = FIELD_HAZARDS.on ? LEVEL : 0;
  const by = new Map<string, [number, number]>();
  for (let g = 0; g < GAMES; g++) {
    const seed = g + 1;
    const band = FIELD_BANDS[g % FIELD_BANDS.length];
    const team = pickTeam(new Rng(mixSeed(seed, 0x7ea4)));
    const w = play(seed, band, { ...fieldBoost(STAGE), area }, team).won;
    const t = by.get(band) ?? [0, 0];
    by.set(band, [t[0] + (w ? 1 : 0), t[1] + 1]);
  }
  return by;
};
const pct = (w: number, n: number) => (100 * w) / n;
const f = (x: number, n = 7) => x.toFixed(1).padStart(n);
console.log(`\n${GAMES} random five-hero teams a land, the field bands in turn, stage ${STAGE} foes; second pass: ${ONLY ?? 'traps (level ' + LEVEL + ') and terrain'} on`);
console.log(`one standard error: about ${(50 / Math.sqrt(GAMES)).toFixed(1)} points for a land, ${(50 / Math.sqrt(GAMES / FIELD_BANDS.length)).toFixed(1)} for a band on a land, ${(50 / Math.sqrt(GAMES * LANDS.length)).toFixed(1)} for all, ${(50 / Math.sqrt((GAMES * LANDS.length) / FIELD_BANDS.length)).toFixed(1)} for a band over all lands\n`);
console.log(`${'land'.padEnd(11)}${'off %'.padStart(7)}${'on %'.padStart(7)}${'change'.padStart(8)}   ${FIELD_BANDS.map((b) => b.slice(0, 6).padStart(7)).join('')}   (each band's change)`);
const all = new Map<string, [number, number, number]>();
for (const area of LANDS) {
  const off = tally(area, false);
  const on = tally(area, true);
  let [w0, w1, n] = [0, 0, 0];
  const cells: string[] = [];
  for (const band of FIELD_BANDS) {
    const [a, k] = off.get(band)!;
    const [b] = on.get(band)!;
    w0 += a;
    w1 += b;
    n += k;
    cells.push(f(pct(b - a, k)));
    const t = all.get(band) ?? [0, 0, 0];
    all.set(band, [t[0] + a, t[1] + b, t[2] + k]);
  }
  console.log(`${area.padEnd(11)}${f(pct(w0, n))}${f(pct(w1, n))}${f(pct(w1 - w0, n), 8)}   ${cells.join('')}`);
}
FIELD_HAZARDS.on = false;
LAND_TERRAIN.on = false;
console.log(`\n${'band'.padEnd(11)}${'off %'.padStart(7)}${'on %'.padStart(7)}${'change'.padStart(8)}   (over ${LANDS.length} land${LANDS.length > 1 ? 's' : ''})`);
let [W0, W1, N] = [0, 0, 0];
for (const band of FIELD_BANDS) {
  const [a, b, k] = all.get(band)!;
  W0 += a;
  W1 += b;
  N += k;
  console.log(`${band.padEnd(11)}${f(pct(a, k))}${f(pct(b, k))}${f(pct(b - a, k), 8)}`);
}
console.log(`${'all'.padEnd(11)}${f(pct(W0, N))}${f(pct(W1, N))}${f(pct(W1 - W0, N), 8)}`);
