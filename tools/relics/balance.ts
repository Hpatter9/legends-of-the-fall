// RELICS-2's yardstick (`npm run relic-balance`, docs/notes/relics-2.md): what each relic is worth on its own.
//
// The default table plays single fights: the greedy player's runs (the starting five at one hero level, its hires and merges, no events,
// no relic) brought to one army wave where they win about half the time, FIGHTS runs (default 300), then that wave's fight from each
// run's state with no relic, with the old Whetstone (a flat +8% attack: the yardstick of a Common, the
// size of most old relics), and with each relic alone. A growing relic is at its size half way through a 15-wave run (7 waves won, 2
// elites felled, 3 heroes fallen). Auto casts the king's spells (AUTO-CAST), so the mana relics count. It prints the win rate and its lift over no relic, in points, beside the old Whetstone's. Single fights
// are far less noisy than whole runs for the same time. Gold relics (the Crown-Piece, the Tax Ingot) change no fight; their worth is
// their gold.
//
//   npm run relic-balance                                 the default cells (undead:18:15 beasts:10:15 orcs:4:15: army, hero level, wave; last boss waves the greedy player, casting the king's spells, wins about half the time)
//   npm run relic-balance -- beasts:20:9                  other cells
//   FIGHTS=600 ONLY=whetstone,banner npm run relic-balance
//   npm run relic-balance -- --runs orcs:1 beasts:20      whole army runs instead (SAVES a cell, default 16; much noisier)
//
// The targets (the owner's per-rarity power): a Common about the old Whetstone's lift, a Rare up to half as much again, a Storied about
// twice it. A price relic's lift is net of its price.
import { fight, playOut } from '../../src/sim/battle';
import { fightXp, gainXp, xpFor } from '../../src/sim/levels';
import { newCastle, xpRate } from '../../src/sim/castle';
import { startedMeta, type Meta } from '../../src/sim/meta';
import { armyById } from '../../src/sim/armies';
import { armyRun, finish, isBossRun, noteFight, startStage } from '../../src/sim/run';
import { autoDeploy, autoRound } from '../../src/sim/autoplay';
import { ratingOf } from '../../src/sim/stars';
import { GREAT_RELIC_IDS, RELIC_IDS, RELICS, type RelicMarks } from '../../src/sim/relics';
import { HEROES } from '../../src/sim/units';
import { STARTER_SPELLS } from '../../src/sim/spells';
import { autoSpellsFor } from '../../src/sim/autoCast';

/** The king's spells cast by Auto (AUTO-CAST), as the page's Auto does: the equipped ones, or the starter's (so the mana relics count). */
const castFor = (meta: Meta) => autoSpellsFor(true, meta.spellbook.equipped.length ? meta.spellbook.equipped : STARTER_SPELLS);

const ONLY = process.env.ONLY?.split(',');
const RUNS = process.argv.includes('--runs');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
/** A growing relic's size half way through a run. */
const MID: RelicMarks = { won: 7, elites: 2, fallen: 3 };

function savedAt(level: number, seed: number): Meta {
  const m = startedMeta(seed);
  for (const k of HEROES) m.xp[k] = xpFor(level);
  return m;
}

const EIDOLON_RELICS = Object.keys(RELICS).filter((id) => RELICS[id].rarity === 'eidolon');
const ids = ['', 'old', ...[...RELIC_IDS, ...GREAT_RELIC_IDS, ...EIDOLON_RELICS].filter((id) => !ONLY || ONLY.includes(id))];
const label = (id: string) => (id === '' ? '(none)' : id === 'old' ? '(old Whetstone, +8% attack)' : `${RELICS[id].name} [${RELICS[id].rarity}]`);
const OLD = { atk: 1.08, duration: 999 };

/** A run brought to wave `wave` by the greedy player with no relic (its hires and merges made, no events), or null when it fell before. */
function warm(meta: Meta, armyId: string, wave: number, seed: number): ReturnType<typeof armyRun> | null {
  const run = armyRun(seed, armyId, HEROES);
  while (!run.over && run.stage < wave) {
    run.event = undefined;
    autoRound(run, meta, false);
    run.event = undefined;
    const b = startStage(run);
    autoDeploy(b, run, meta);
    b.autoSpells = castFor(meta);
    fight(b);
    playOut(b);
    finish(run, b.phase === 'won', ratingOf(b, isBossRun(run)).stars);
  }
  if (run.over) return null;
  run.event = undefined;
  autoRound(run, meta, false);
  run.event = undefined;
  return run;
}

/** The wave's fight from a warmed run's state, with `relic` held. */
function oneFight(meta: Meta, warmed: ReturnType<typeof armyRun>, relic: string): boolean {
  const run = JSON.parse(JSON.stringify(warmed)) as typeof warmed;
  if (relic && relic !== 'old') {
    run.relics = [relic];
    run.relicMarks = { ...MID };
  }
  if (relic === 'old') run.buff = { ...OLD };
  const b = startStage(run);
  autoDeploy(b, run, meta);
  b.autoSpells = castFor(meta);
  fight(b);
  playOut(b);
  return b.phase === 'won';
}

function fightTable(cells: string[]): void {
  const FIGHTS = Number(process.env.FIGHTS ?? 300);
  for (const cell of cells) {
    const [army, levelS, waveS] = cell.split(':');
    const meta = savedAt(Number(levelS), 1);
    // (the same warmed runs for every relic: each the greedy player's run, no relic, brought to the wave)
    const runs: ReturnType<typeof armyRun>[] = [];
    for (let seed = 5000; runs.length < FIGHTS && seed < 5000 + FIGHTS * 4; seed++) {
      const r = warm(meta, army, Number(waveS), seed);
      if (r) runs.push(r);
    }
    console.log(`\n${cell} (army:level:wave): ${runs.length} fights a relic, from runs brought to the wave; win rate, and its lift over none in points`);
    let base = 0;
    let old = 0;
    for (const id of ids) {
      let won = 0;
      for (const r of runs) won += Number(oneFight(meta, r, id));
      const rate = (100 * won) / runs.length;
      if (id === '') base = rate;
      if (id === 'old') old = rate - base;
      const lift = rate - base;
      const ratio = id && id !== 'old' && old > 0 ? `  (${(lift / old).toFixed(2)}x the old Whetstone)` : '';
      console.log(`${label(id).padEnd(46)} ${rate.toFixed(1).padStart(5)}%  lift ${(lift >= 0 ? '+' : '') + lift.toFixed(1)}${ratio}`);
    }
  }
}

/** One army run with `relic` held from the start. Returns the waves won and whether it cleared. */
function play(meta: Meta, armyId: string, seed: number, relic: string): { waves: number; cleared: boolean } {
  const army = armyById(armyId)!;
  const run = armyRun(seed, armyId, HEROES);
  if (relic && relic !== 'old') run.relics = [relic];
  if (relic === 'old') run.buff = { ...OLD };
  while (!run.over) {
    run.event = undefined;
    autoRound(run, meta, false);
    run.event = undefined;
    const b = startStage(run);
    autoDeploy(b, run, meta);
    fight(b);
    playOut(b);
    const ok = b.phase === 'won';
    noteFight(run, b);
    finish(run, ok, ratingOf(b, isBossRun(run)).stars);
    if (relic === 'old') run.buff = { ...OLD };
    gainXp(meta, fightXp(b, xpRate(newCastle())));
  }
  const cleared = !!run.cleared && run.stage >= army.waves.length;
  return { waves: cleared ? army.waves.length : run.best - 1, cleared };
}

function runTable(cells: string[]): void {
  const SAVES = Number(process.env.SAVES ?? 16);
  for (const cell of cells) {
    const [army, levelS] = cell.split(':');
    console.log(`\n${cell}: ${SAVES} runs a relic (no events), mean waves won, clear rate`);
    let base = 0;
    for (const id of ids) {
      let waves = 0;
      let won = 0;
      for (let i = 0; i < SAVES; i++) {
        const r = play(savedAt(Number(levelS), i + 1), army, 900 + i, id);
        waves += r.waves;
        won += Number(r.cleared);
      }
      const mean = waves / SAVES;
      if (id === '') base = mean;
      console.log(`${label(id).padEnd(46)} ${mean.toFixed(2)} waves  clear ${Math.round((100 * won) / SAVES)}%  lift ${(mean - base >= 0 ? '+' : '') + (mean - base).toFixed(2)}`);
    }
  }
}

if (RUNS) runTable(args.length ? args : ['orcs:1', 'undead:22', 'beasts:20']);
else fightTable(args.length ? args : ['undead:18:15', 'beasts:10:15', 'orcs:4:15']);
