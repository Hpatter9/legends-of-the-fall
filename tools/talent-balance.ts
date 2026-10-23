// A quick balance check for the hero talents: random five-hero teams against the field bands, with and without talents,
// paired by seed. Table 1 is the effective strength of everyone's talents (every hero with the first row only, with the
// first two rows, and with the whole tree, a random choice of each pair): the plain hp and attack bonus that wins as often. For
// scale, an evolution grade is +60%. Table 2 is each hero's own tree (all four choices of its two pairs) as the win-rate lift,
// in points, on the teams that hold it, so a tree that breaks the balance stands out. Run with `npm run talent-balance`
// (`-- --games 300` for quicker and noisier).

import { DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { fight, place, startBattle, type Battle, type Stage } from '../src/sim/battle';
import { FIELD_BANDS } from '../src/sim/foes';
import { mixSeed, Rng } from '../src/sim/rng';
import { ALL_HEROES } from '../src/sim/units';
import type { EquipStats } from '../src/sim/equipment';
import { startedMeta } from '../src/sim/meta';
import { xpFor } from '../src/sim/levels';
import { buyPoint, learn, talentStats, tierNodes } from '../src/sim/talents';
import { gradeBoost, stageBoost } from '../src/sim/run';
import { stepBattle } from '../src/sim/battle';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 && Number(process.argv[i + 1]) > 0 ? Number(process.argv[i + 1]) : fallback;
};
const GAMES = arg('--games', 600);
const STAGE = arg("--stage", 13);
const LEVEL = arg("--level", 3);
const fieldBoost = (s: number): Stage => ({ ...stageBoost(s), boss: undefined });

function won(seed: number, team: string[], equip: (kind: string) => EquipStats | undefined, mult = 1): boolean {
  const band = FIELD_BANDS[seed % FIELD_BANDS.length];
  const b: Battle = startBattle(seed, band, fieldBoost(STAGE));
  const rng = new Rng(mixSeed(seed, 0xba1a));
  const spots: [number, number][] = [];
  for (let v = b.board.d - DEPLOY_ROWS; v < b.board.d; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  for (let i = spots.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  team.forEach((id, i) => {
    const eq = equip(id);
    const g = gradeBoost(1, 0, LEVEL);
    place(b, id, spots[i][0], spots[i][1], undefined, { ...g, hp: g.hp! * mult, atk: g.atk! * mult, ...(eq ? { equip: eq } : {}) });
  });
  fight(b);
  while (b.phase === 'fight') stepBattle(b);
  return b.phase === 'won';
}

const teams = (): string[][] => {
  const rng = new Rng(0x6ea2);
  return Array.from({ length: GAMES }, () => {
    const pool = [...ALL_HEROES];
    return Array.from({ length: 5 }, () => pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  });
};
const T = teams();
const rate = (equip: (kind: string) => EquipStats | undefined, mult = 1) => (100 * T.filter((t, i) => won(1000 + i, t, equip, mult)).length) / GAMES;
/** The plain hp and attack multiplier (no equipment) that wins as often as `equip`: the kit's "effective strength", as +%. */
function effective(equip: (kind: string) => EquipStats | undefined): string {
  const target = rate(equip);
  if (target >= 99) return '>';
  let lo = 1;
  let hi = 2;
  for (let i = 0; i < 7; i++) {
    const mid = (lo + hi) / 2;
    if (rate(() => undefined, mid) < target) lo = mid;
    else hi = mid;
  }
  return `+${Math.round(((lo + hi) / 2 - 1) * 100)}%`;
}

/** A kind's talents with these node ids taken (in order), as the fight stats; undefined for none. */
function taken(kind: string, ids: string[]): EquipStats | undefined {
  const m = startedMeta(1);
  m.unlocked.push(kind);
  m.xp[kind] = xpFor(20);
  m.shards[kind] = 9;
  while (buyPoint(m, kind));
  for (const id of ids) learn(m, kind, id);
  return talentStats(m, kind);
}
const ones = (kind: string) => tierNodes(kind, 1).map((n) => n.id);
/** The picks of a tree: `rows` rows deep, the pair choices from `pick` (0 or 1 for each of tiers 2 and 3). */
const picks = (kind: string, rows: number, pick: [number, number]) => [...ones(kind), ...(rows >= 2 ? [tierNodes(kind, 2)[pick[0]].id] : []), ...(rows >= 3 ? [tierNodes(kind, 3)[pick[1]].id] : [])];

const base = rate(() => undefined);
console.log(`Stage ${STAGE}, hero level ${LEVEL}, ${GAMES} random teams. No talents: ${base.toFixed(1)}% won.\n`);
console.log('1. Effective strength of everyone\'s talents (a random choice of each pair): the plain hp and attack bonus that wins as often (an evolution grade is +60%).');
const rng = new Rng(0x7a1e);
const choice: Record<string, [number, number]> = {};
for (const k of ALL_HEROES) choice[k] = [rng.int(0, 1), rng.int(0, 1)];
for (const [label, rows] of [['first row only (4 points)', 1], ['first two rows (6 points)', 2], ['the whole tree (9 points)', 3]] as const) {
  console.log(`  ${label.padEnd(28)} ${effective((kind) => taken(kind, picks(kind, rows, choice[kind])))}   (${rate((kind) => taken(kind, picks(kind, rows, choice[kind]))).toFixed(1)}% won)`);
}
if (process.argv.includes('--quick')) process.exit(0);
console.log('\n2. Each hero\'s own full tree, the first row alone, then the four ways of choosing the pairs (win-rate lift in points, on the teams that hold the hero):');
const rows: { kind: string; lifts: number[] }[] = [];
for (const kind of ALL_HEROES) {
  const idx = T.map((t, i) => (t.includes(kind) ? i : -1)).filter((i) => i >= 0);
  const wins = (eq: (k: string) => EquipStats | undefined) => idx.filter((i) => won(1000 + i, T[i], eq)).length;
  const plain = wins(() => undefined);
  const lift = (ids: string[]) => (100 * (wins((k) => (k === kind ? taken(kind, ids) : undefined)) - plain)) / Math.max(1, idx.length);
  const lifts = [lift(ones(kind)), ...([[0, 0], [0, 1], [1, 0], [1, 1]] as [number, number][]).map((p) => lift(picks(kind, 3, p)))];
  rows.push({ kind, lifts });
}
rows.sort((x, y) => Math.max(...y.lifts) - Math.max(...x.lifts));
console.log('  (columns: first row only | 2a+3a | 2a+3b | 2b+3a | 2b+3b)');
for (const { kind, lifts } of rows) console.log(`  ${kind.padEnd(18)} ${lifts.map((l) => `${l >= 0 ? '+' : ''}${l.toFixed(1)}`.padStart(6)).join(' ')}   (teams: ${T.filter((t) => t.includes(kind)).length})`);
