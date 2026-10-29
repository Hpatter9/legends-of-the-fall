// MERGE-TWO's yardstick (`docs/notes/merge-two.md`): single tries at army cells (army:tier:level), no XP carried, the recruits' party with
// every talent its level opens, gear dressed, the castle a climb has at that level (as `tools/army-pace`). For each cell: the share of tries
// that clear, the mean waves won, and how strong the fielded squad's grades were (the mean grade multiplier of the five, and the share of
// fielded heroes at each grade) at waves 5, 10 and 15. Run on two trees (before and after a change) to compare.
//
//   node tools/merge-two/run.mjs orcs:4:55 infernal:0:55          SAVES (default 24) tries a cell
//   node tools/merge-two/run.mjs early:beasts:20 spire:max         the starting five at a level (no castle or talents); the spire's climb
import { ARMIES, armyById } from '../../src/sim/armies';
import { armyRules } from '../../src/sim/armyStars';
import { TIERS } from '../../src/sim/tiers';
import { fight, playOut, type Boost } from '../../src/sim/battle';
import { BUILDINGS, maxLevel, newCastle, type BuildingId, type Castle } from '../../src/sim/castle';
import { levelOfKind } from '../../src/sim/levels';
import { heroRank, type Meta } from '../../src/sim/meta';
import { mixSeed } from '../../src/sim/rng';
import { armyRun, boostOf, canRetry, finish, isBossRun, noteFight, retryWave, startStage, gradeBoost, tierOfRun, type Owned } from '../../src/sim/run';
import { autoDeploy, autoRound } from '../../src/sim/autoplay';
import { ratingOf } from '../../src/sim/stars';
import { heroStats, learn, tierNodes } from '../../src/sim/talents';
import { playArmy, playTower, savedAt } from '../autoplay';
import { HEROES } from '../../src/sim/units';
import { startedMeta } from '../../src/sim/meta';
import * as run_ from '../../src/sim/run';

// (GB=1,1.4,1.9,2.8 tries other grade multipliers: a tuning run, nothing is written; only on a tree that has `GRADE_BOOST`)
if (process.env.GB) (run_ as unknown as { GRADE_BOOST: number[] }).GRADE_BOOST.splice(0, 4, ...process.env.GB.split(',').map(Number));

// (START=infernal:11,yokai:14 sets an army's Normal `start`; TIERK=4:1.2 scales a tier's hp and attack (4:1.2:1.1 each on its own): tuning runs, nothing is written)
for (const kv of (process.env.START ?? '').split(',').filter(Boolean)) {
  const [aid, v] = kv.split(':');
  (ARMIES.find((a) => a.id === aid) as unknown as { start: number }).start = Number(v);
}
for (const kv of (process.env.TIERK ?? '').split(',').filter(Boolean)) {
  const [i, hp, atk] = kv.split(':').map(Number);
  const t = TIERS[i] as { hp: number; atk: number };
  t.hp *= hp;
  t.atk *= atk ?? hp;
}

const party = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];
const SAVES = Number(process.env.SAVES ?? 24);
// (HEARTS=1: a lost wave burns a heart and is fought again, as the page does; by default a loss ends the try, as the notes' figures were measured)
const HEARTS = process.env.HEARTS === '1';
const SPREAD: BuildingId[] = ['barracks', 'armoury', 'library', 'treasury', 'stable', 'mage'].filter((id) => id in BUILDINGS) as BuildingId[];
const CASTLE_MAX = (Object.keys(BUILDINGS) as BuildingId[]).reduce((n, id) => n + maxLevel(id), 0);
const castleLevels = (L: number): number => {
  const pts: [number, number][] = [[30, 0], [38, 6], [40, 13], [46, 18], [52, 22]];
  if (L <= 30) return 0;
  for (let i = 1; i < pts.length; i++) if (L <= pts[i][0]) return Math.round(pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * (L - pts[i - 1][0])) / (pts[i][0] - pts[i - 1][0]));
  return Math.min(CASTLE_MAX, Math.round(22 + (L - 52) / 2));
};
function castleAt(L: number): Castle {
  const c = newCastle();
  const ids = Object.keys(BUILDINGS) as BuildingId[];
  for (let n = 0; n < castleLevels(L); n++) {
    const open = [...SPREAD, ...ids.filter((id) => !SPREAD.includes(id))].filter((id) => c[id] < maxLevel(id));
    if (!open.length) break;
    c[open.sort((a, b) => c[a] - c[b])[0]]++;
  }
  return c;
}
function dress(meta: Meta): void {
  for (const k of party) {
    if (!meta.unlocked.includes(k)) meta.unlocked.push(k);
    for (const t of [1, 2, 3, 4, 5, 6, 7] as const) for (const n of tierNodes(k, t)) learn(meta, k, n.id);
  }
}

for (const cell of process.argv.slice(2)) {
  const [id, tierS, levelS] = cell.split(':');
  // (`early:undead:20`: the starting five at a level, no castle, talents or gear, as `test/armies.test.ts`'s `clearRate`: the share cleared)
  if (id === 'early') {
    let won = 0;
    for (let i = 0; i < SAVES; i++) if (playArmy(savedAt(Number(levelS), HEROES, i + 1), tierS, 900 + i, HEROES).cleared) won++;
    console.log(`${cell}\tclear ${Math.round((100 * won) / SAVES)}%`);
    continue;
  }
  // (`spire:none` or `spire:max`: the spire climbed by the greedy player from a fresh save, with no castle or a full one)
  if (id === 'spire') {
    const castle = newCastle();
    if (tierS === 'max') for (const b of Object.keys(BUILDINGS) as BuildingId[]) castle[b] = maxLevel(b);
    const floors: number[] = [];
    let boss = 0;
    for (let save = 1; save <= SAVES; save++) {
      const r = playTower(startedMeta(save), mixSeed(save, 0x5917), undefined, castle, 90);
      floors.push(r.floors);
      if (r.bosses > 0) boss++;
    }
    floors.sort((a, b) => a - b);
    console.log(`${cell}\tfloors p25/median/p75/p90 ${[0.25, 0.5, 0.75, 0.9].map((q) => floors[Math.floor(floors.length * q)]).join("/")} mean ${(floors.reduce((a, b) => a + b, 0) / SAVES).toFixed(1)}\tfirst act boss ${Math.round((100 * boss) / SAVES)}%`);
    continue;
  }
  const tier = Number(tierS);
  const L = Number(levelS);
  const army = armyById(id)!;
  let cleared = 0;
  let waves = 0;
  let summons = 0;
  /** Tries whose squad fielded a grade-4 hero by wave 10, and by the last wave. */
  let top10 = 0;
  /** Tries that met each of the tier's star rules. */
  const starsMet: number[] = [];
  let topEnd = 0;
  const mult: Record<number, number[]> = { 5: [], 10: [], 15: [] };
  const grades: Record<number, number[]> = { 5: [0, 0, 0, 0, 0], 10: [0, 0, 0, 0, 0], 15: [0, 0, 0, 0, 0] };
  for (let save = 1; save <= SAVES; save++) {
    const meta = savedAt(L, party, save);
    dress(meta);
    const castle = castleAt(L);
    const run = armyRun(mixSeed(save, 0x3e26, tier), id, party, castle, tier);
    const bf = (h: Owned): Boost => boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), heroStats(meta, h.kind));
    let won = 0;
    let t10 = false;
    let tEnd = false;
    while (!run.over) {
      autoRound(run, meta, true);
      const top = run.roster.some((h) => run.squad.includes(h.id) && h.grade >= 4);
      if (top && run.stage <= 10) t10 = true;
      if (top) tEnd = true;
      if (mult[run.stage]) {
        const sq = run.roster.filter((h) => run.squad.includes(h.id));
        mult[run.stage].push(sq.reduce((n, h) => n + gradeBoost(h.grade).hp!, 0) / Math.max(1, sq.length));
        for (const h of sq) grades[run.stage][h.grade]++;
      }
      const b = startStage(run);
      autoDeploy(b, run, meta, bf);
      fight(b);
      playOut(b);
      const ok = b.phase === 'won';
      if (!ok && HEARTS && canRetry(run)) {
        retryWave(run);
        continue;
      }
      if (ok) won = run.stage;
      noteFight(run, b);
      finish(run, ok, ratingOf(b, isBossRun(run)).stars);
    }
    waves += won;
    summons += run.summons;
    if (t10) top10++;
    if (tEnd) topEnd++;
    if (run.cleared && won === army.waves.length) {
      cleared++;
      // (each star's rule as the game settles it, `armyRules`, so the tool follows the stars' rules as they change)
      armyRules(army, tierOfRun(run), run).forEach((r, i) => r.earned && (starsMet[i] = (starsMet[i] ?? 0) + 1));
    }
  }
  const at = (w: number) => {
    const m = mult[w];
    const g = grades[w];
    const tot = g.reduce((a, b) => a + b, 0) || 1;
    return m.length ? `w${w} x${(m.reduce((a, b) => a + b, 0) / m.length).toFixed(2)} [${g.slice(1).map((n) => Math.round((100 * n) / tot)).join('/')}]` : `w${w} -`;
  };
  console.log(`${cell}\tclear ${Math.round((100 * cleared) / SAVES)}%\twaves ${(waves / SAVES).toFixed(1)}/${army.waves.length}\thires ${(summons / SAVES).toFixed(1)}\tstars ${Array.from(starsMet, (n) => `${Math.round((100 * (n ?? 0)) / SAVES)}%`).join('/') || '-'}\tg4 by w10 ${Math.round((100 * top10) / SAVES)}% by end ${Math.round((100 * topEnd) / SAVES)}%\t${at(5)}\t${at(10)}\t${at(15)}`);
}
