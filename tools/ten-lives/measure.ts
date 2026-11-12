// TEN-LIVES (`docs/notes/ten-lives.md`): the armies under the old two hearts and under the ten lives, from one build, so the two can be
// set side by side. The player is ARMY-PACE's: the recruits' party at a level, every talent row the level opens, gear dressed, the
// castle a climb has by then, the greedy bot placing and Auto casting the king's spells; one try a save, a fresh save each.
//
//   node tools/ten-lives/run.mjs tiers            orcs, labyrinth and golems on every tier, each at the level the tier is for
//   node tools/ten-lives/run.mjs first            a new save's first tries at the Orc Warband (the starter packs of three)
//   node tools/ten-lives/run.mjs daily            thirty days of the daily
//
// Each line is played three ways: `none` (a lost wave ends the try: what the other balance tools measure), `hearts` (the old rule as
// the page played it: a lost wave burns one of two hearts, the fallen rise whole in the same fight, a Hire's gold is paid) and `lives`
// (the new rule, `src/sim/lives.ts`). Environment: SAVES (default 16), ONLY (army ids), TRIES (`first`: 12).
import '../living-fields/switch';
import { ARMIES, armyById } from '../../src/sim/armies';
import { fight, stepBattle, TIME_LIMIT_MS, type Battle, type Boost } from '../../src/sim/battle';
import { BUILDINGS, maxLevel, newCastle, xpRate, type BuildingId, type Castle } from '../../src/sim/castle';
import { dailyRun } from '../../src/sim/modes';
import { fightXp, gainXp, levelOfKind } from '../../src/sim/levels';
import { LIVES_RULE } from '../../src/sim/lives';
import { heroRank, type Meta } from '../../src/sim/meta';
import { armyRun, boostOf, finish, isBossRun, livesSpent, noteFight, partyFalls, startStage, summonCost, type Owned, type Run } from '../../src/sim/run';
import { autoDeploy, autoRound } from '../../src/sim/autoplay';
import { ratingOf } from '../../src/sim/stars';
import { FIXED_PACKS } from '../../src/sim/starter';
import { heroStats, learn, tierNodes } from '../../src/sim/talents';
import { TIERS } from '../../src/sim/tiers';
import { UNITS } from '../../src/sim/units';
import { maybeSpells, newSaveMeta, savedAt } from '../autoplay';

type Mode = 'none' | 'hearts' | 'lives';
const MODES: Mode[] = ['none', 'hearts', 'lives'];
const SAVES = Number(process.env.SAVES ?? 16);
const party = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];
/** The castle a climb has at a hero level (ARMY-PACE's `castleAt`). */
function castleAt(L: number): Castle {
  const pts: [number, number][] = [[30, 0], [38, 6], [40, 13], [46, 18], [52, 22]];
  const ids = Object.keys(BUILDINGS) as BuildingId[];
  const top = ids.reduce((n, id) => n + maxLevel(id), 0);
  let levels = 0;
  if (L > 52) levels = Math.min(top, Math.round(22 + (L - 52) / 2));
  else if (L > 30) for (let i = 1; i < pts.length; i++) if (L <= pts[i][0]) { levels = Math.round(pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * (L - pts[i - 1][0])) / (pts[i][0] - pts[i - 1][0])); break; }
  const c = newCastle();
  const spread = (['barracks', 'armoury', 'library', 'treasury', 'stable', 'mage'] as BuildingId[]).filter((id) => id in BUILDINGS);
  for (let n = 0; n < levels; n++) {
    const open = [...spread, ...ids.filter((id) => !spread.includes(id))].filter((id) => c[id] < maxLevel(id));
    if (!open.length) break;
    c[open.sort((a, b) => c[a] - c[b])[0]]++;
  }
  return c;
}

/** The old hearts' rise, as the page played it: the fallen heroes whole again in the same fight, with more time if the clock had run out. */
function oldRise(b: Battle): void {
  for (const u of b.units) {
    if (u.side !== 'hero' || UNITS[u.def].summon || u.alive) continue;
    u.alive = true;
    u.hp = u.maxHp;
    u.diedAt = u.step = u.swing = u.cast = u.hurtAt = undefined;
    u.busyUntil = b.t;
  }
  if (b.t >= (b.timeLimit ?? TIME_LIMIT_MS)) b.timeLimit = b.t + TIME_LIMIT_MS;
  b.phase = 'fight';
}

interface Tally { runs: number; cleared: number; waves: number; deaths: number; spent: number; falls: number; ranOut: number; ms: number }
const blank = (): Tally => ({ runs: 0, cleared: 0, waves: 0, deaths: 0, spent: 0, falls: 0, ranOut: 0, ms: 0 });

/** Play a run of waves to its end in a mode, adding to the tally. Returns whether it was cleared. */
function play(mode: Mode, run: Run, meta: Meta, castle: Castle, t: Tally, boostFor?: (h: Owned) => Boost, gear = true): boolean {
  LIVES_RULE.on = mode === 'lives';
  let hearts = 0;
  let won = 0;
  while (!run.over) {
    autoRound(run, meta, gear);
    const b = startStage(run);
    autoDeploy(b, run, meta, boostFor);
    fight(b);
    maybeSpells(b, meta, castle);
    for (;;) {
      while (b.phase === 'fight') for (const e of stepBattle(b)) if (e.kind === 'hit' && e.killed && b.units.find((u) => u.id === e.to)?.side === 'hero' && !UNITS[b.units.find((u) => u.id === e.to)!.def].summon) t.deaths++;
      if (mode !== 'hearts' || b.phase !== 'lost' || hearts >= 2) break;
      hearts++;
      run.gold += summonCost(run);
      oldRise(b);
    }
    const ok = b.phase === 'won';
    if (ok) won = run.stage;
    t.ms += b.t;
    noteFight(run, b);
    finish(run, ok, ratingOf(b, isBossRun(run)).stars);
    gainXp(meta, fightXp(b, xpRate(castle)));
  }
  t.runs++;
  t.waves += won;
  if (run.cleared) t.cleared++;
  if (mode === 'lives') {
    t.spent += livesSpent(run);
    t.falls += partyFalls(run);
    if (!run.cleared) t.ranOut++;
  } else if (mode === 'hearts') {
    t.spent += hearts;
    t.falls += hearts;
    if (!run.cleared) t.ranOut++;
  } else if (!run.cleared) t.ranOut++;
  LIVES_RULE.on = true;
  return !!run.cleared;
}

const pct = (n: number, of: number) => `${Math.round((100 * n) / Math.max(1, of))}%`.padStart(4);
const per = (n: number, of: number) => (n / Math.max(1, of)).toFixed(1).padStart(5);
const line = (name: string, mode: Mode, t: Tally) =>
  console.log(`${name.padEnd(26)} ${mode.padEnd(6)} cleared ${pct(t.cleared, t.runs)}  waves won ${per(t.waves, t.runs)}  hero deaths/run ${per(t.deaths, t.runs)}  ${mode === 'hearts' ? 'hearts' : 'lives '} spent/run ${per(t.spent, t.runs)}  party falls/run ${per(t.falls, t.runs)}  ended by a loss ${pct(t.ranOut, t.runs)}  fight time/run ${Math.round(t.ms / Math.max(1, t.runs) / 1000)}s`);

function dress(meta: Meta): void {
  for (const k of party) {
    if (!meta.unlocked.includes(k)) meta.unlocked.push(k);
    for (const tr of [1, 2, 3, 4, 5, 6, 7] as const) for (const n of tierNodes(k, tr)) learn(meta, k, n.id);
  }
}

const what = process.argv[2] ?? 'tiers';
if (what === 'tiers') {
  const only = process.env.ONLY?.split(',') ?? ['orcs', 'labyrinth', 'golems'];
  // (the level each tier is for, `docs/notes/difficulty.md`: Normal at the army's own level)
  const at = [0, 45, 60, 85, 100];
  for (const id of only) {
    const army = armyById(id)!;
    for (let tier = 0; tier < TIERS.length; tier++) {
      const L = tier === 0 ? (army as { level?: number }).level ?? 1 : at[tier];
      for (const mode of MODES) {
        const t = blank();
        for (let s = 0; s < SAVES; s++) {
          const meta = savedAt(L, party, 500 + s);
          dress(meta);
          const castle = castleAt(L);
          const run = armyRun(9000 + 31 * s + tier, id, party, castle, tier);
          play(mode, run, meta, castle, t, (h) => boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), heroStats(meta, h.kind)));
        }
        line(`${army.name} ${TIERS[tier].name} Lv${L}`, mode, t);
      }
    }
  }
} else if (what === 'first') {
  const TRIES = Number(process.env.TRIES ?? 12);
  FIXED_PACKS.forEach((pack, pi) => {
    for (const mode of MODES) {
      const t = blank();
      const clearAt: number[] = [];
      const firstTry = blank();
      for (let s = 0; s < SAVES; s++) {
        const meta = newSaveMeta(1000 + s, pi);
        for (let n = 0; n < TRIES; n++) {
          const run = armyRun(77 * s + n + 1, 'orcs', pack.heroes, newCastle(), 0);
          const ok = play(mode, run, meta, newCastle(), n === 0 ? firstTry : t, undefined, false);
          if (ok) { clearAt.push(n + 1); break; }
        }
      }
      line(`${pack.name}: first try`, mode, firstTry);
      line(`${pack.name}: later tries`, mode, t);
      console.log(`${' '.repeat(34)}cleared within ${TRIES} tries ${clearAt.length}/${SAVES}; mean tries to the first clear ${(clearAt.reduce((a, b) => a + b, 0) / Math.max(1, clearAt.length)).toFixed(1)}`);
    }
  });
} else if (what === 'daily') {
  for (const mode of MODES) {
    const t = blank();
    for (let d = 0; d < SAVES; d++) {
      const meta = savedAt(30, party, 700 + d);
      const run = dailyRun(20261101 + d);
      play(mode, run, meta, newCastle(), t);
    }
    line('The daily (Lv30 save)', mode, t);
  }
}
void ARMIES;
