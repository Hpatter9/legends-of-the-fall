// The war simulator (`npm run war-sim`; the Nemesis War, phase 2: `docs/notes/nemesis-2.md`, the design's section 8). A player's days of
// play, as the greedy bot: each day a first visit (the Council's day turn), then a few army runs at the player's level (the newest army its
// level reaches, and the armies before it now and then; Hard every third run once it is past day 40), every wave settled for the War as the
// page settles it, so nemeses are born, promoted and slain by real fights; the Council takes its turn after each run (four a day at most).
// When the Muster is open the bot answers it once a day. Reports, by week: the seat changes (a member in or out, or a member's rank changed),
// the members lost to infighting (slain by a rival, or deserted), the Might (mean and top), the empty seats, the warchiefs and how long each
// held the seat.
//
//   npm run war-sim                         120 days, 3 runs a day
//   npm run war-sim -- --days 60 --runs 2   shorter
//   npm run war-sim -- --seed 7             another player

import { ARMIES, armyUnlocked } from '../../src/sim/armies';
import { councilTurn } from '../../src/sim/council';
import { MUSTER_NEED, musterOpen, startMuster, warchiefOf } from '../../src/sim/muster';
import { newWar, type Nemesis, type War } from '../../src/sim/nemesis';
import { mixSeed } from '../../src/sim/rng';
import { playArmy, playWaves, savedAt, WAR_BOT } from '../autoplay';

const arg = (name: string, d: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? Number(process.argv[i + 1]) : d;
};
const DAYS = arg('--days', 120);
const RUNS = arg('--runs', 3);
const SEED = arg('--seed', 1);
const PARTY = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];

/** The player's hero level on a day (the level pace: about 60 by day 80, 100 by day 164). */
const levelOn = (day: number): number => Math.max(1, Math.min(100, Math.round(1 + day * 0.74)));
/** A day's key (yyyymmdd), from 1 January 2027. */
const dayKey = (day: number): number => {
  const d = new Date(Date.UTC(2027, 0, 1 + day));
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
};

const seatsOf = (war: War): Map<number, string> => new Map(war.members.map((n) => [n.id, n.rank]));

function main(): void {
  const war: War = newWar();
  let opened = false;
  const weeks: { changes: number; infight: number; might: number[]; empty: number; musters: number; chiefFell: number; kinds: Record<string, number>; deserted?: number; council: number }[] = [];
  /** A Council turn, its own seat changes counted (a member in, out, or its rank changed while the turn was taken). */
  const turn = (meta: Parameters<typeof councilTurn>[0], why: 'run' | 'visit', key: number, week: { council: number }) => {
    const before = seatsOf(war);
    councilTurn(meta, why, key);
    const after = seatsOf(war);
    for (const [id, rank] of after) if (before.get(id) !== rank) week.council++;
    for (const id of before.keys()) if (!after.has(id)) week.council++;
  };
  const chiefs: { name: string; from: number; to?: number; how?: string }[] = [];
  let firstTen: number | undefined;
  let tenth: Nemesis | undefined;
  const around60: number[] = [];
  const at: Record<number, { mean: number; top: number; n: number }> = {};
  WAR_BOT.settle = true;
  const t0 = Date.now();
  for (let day = 0; day < DAYS; day++) {
    const level = levelOn(day);
    const meta = savedAt(level, PARTY, mixSeed(SEED, 0x5a1, day));
    meta.party = [...PARTY];
    // (the armies a player of this level has opened: those whose own level it has reached)
    const reach = ARMIES.filter((a) => a.level <= level);
    meta.opened = (reach.length ? reach : [ARMIES[0]]).map((a) => a.id);
    for (const a of reach) meta.armies[a.id] = { waves: a.waves.length, best: a.waves.length, won: a.waves.length, clears: 1, stars: {} };
    // (the War opens with the Undead Legion's first Normal clear)
    if (!opened && armyUnlocked(meta, 'undead') && meta.armies.undead?.clears) opened = true;
    if (opened) meta.war = war;
    const week = (weeks[Math.floor(day / 7)] ??= { changes: 0, infight: 0, might: [], empty: 0, musters: 0, chiefFell: 0, kinds: {}, council: 0 });
    const newsBefore = war.news[0];
    const before = seatsOf(war);
    const fallenIds = new Set(war.fallen.map((f) => f.id));
    const chiefBefore = warchiefOf(war);
    const key = dayKey(day);
    if (opened) turn(meta, 'visit', key, week);
    for (let r = 0; r < RUNS; r++) {
      const pool = reach.length ? reach : [ARMIES[0]];
      // (mostly the newest army, now and then an older one)
      // (the newest army its level reaches; every third run the one before it, on Hard once past day 40)
      const older = r % 3 === 2 && pool.length > 1;
      const army = older ? pool[pool.length - 2] : pool[pool.length - 1];
      const hard = older && day > 40;
      playArmy(meta, army.id, mixSeed(SEED, day, r), PARTY, meta.castle, true, hard ? 1 : 0);
      if (opened) turn(meta, 'run', key, week);
      if (!opened && meta.armies.undead?.clears) opened = true;
    }
    // (the Muster, once a day when it is open)
    if (opened && musterOpen(war)) {
      const run = startMuster(meta, PARTY, mixSeed(SEED, 0x3a5, day));
      if (run) {
        week.musters++;
        playWaves(meta, run, meta.castle, true);
      }
    }
    // (what the day changed: the News's kinds, then the seats)
    for (const x of war.news) {
      if (x === newsBefore) break;
      week.kinds[x.kind] = (week.kinds[x.kind] ?? 0) + 1;
      // (phase 3: a humiliation is told on its own line, or on its cheat's)
      if (/humiliated/.test(x.text) && !/returns$/.test(x.text)) week.kinds.shamed = (week.kinds.shamed ?? 0) + 1;
      if (/humiliated.*, and took /.test(x.text)) week.kinds.took = (week.kinds.took ?? 0) + 1;
    }
    const after = seatsOf(war);
    for (const [id, rank] of after) if (before.get(id) !== rank) week.changes++;
    for (const id of before.keys()) if (!after.has(id)) week.changes++;
    const fresh = war.fallen.filter((f) => !fallenIds.has(f.id));
    // (lost to infighting: slain by a rival of the Council, or deserted)
    week.infight += fresh.filter((f) => f.how === 'council').length + (week.kinds.desertion ?? 0) - (week.deserted ?? 0);
    week.deserted = week.kinds.desertion ?? 0;
    const chief = warchiefOf(war);
    if (chiefBefore && chief?.id !== chiefBefore.id) {
      const c = chiefs.find((x) => x.name === chiefBefore.name && x.to === undefined);
      const fell = fresh.find((f) => f.id === chiefBefore.id);
      if (c) {
        c.to = day;
        c.how = fell ? (fell.how === 'muster' ? 'slain at the Muster' : 'slain in a run') : 'gone';
      }
      if (fell) week.chiefFell++;
    }
    if (chief && chief.id !== chiefBefore?.id) chiefs.push({ name: chief.name, from: day });
    const m = war.members.map((n: Nemesis) => n.might);
    week.might.push(...m);
    week.empty += 13 - war.members.length;
    if (firstTen === undefined && m.some((x) => x >= 10)) {
      firstTen = day;
      tenth = war.members.find((n) => n.might >= 10);
    }
    // (phase 3: the Might around day 60 as two weeks' mean of the day's means, a steadier measure than the one day)
    if (day >= 53 && day <= 67 && m.length) around60.push(m.reduce((a, b) => a + b, 0) / m.length);
    if ([30, 45, 60, 90, 119].includes(day)) at[day] = { mean: m.length ? m.reduce((a, b) => a + b, 0) / m.length : 0, top: Math.max(0, ...m), n: m.length };
  }
  WAR_BOT.settle = false;
  console.log(`\nTHE WAR SIMULATOR  (${DAYS} days, ${RUNS} army runs a day, seed ${SEED}; ${((Date.now() - t0) / 1000).toFixed(0)} s; ${war.turn} Council turns)\n`);
  console.log('  week  seat changes (the Council\'s own)  lost to infighting  Might mean  top  empty seats (mean)  Musters  warchiefs slain');
  weeks.forEach((w, i) => {
    const mean = w.might.length ? w.might.reduce((a, b) => a + b, 0) / w.might.length : 0;
    console.log(`  ${String(i + 1).padStart(4)}  ${String(w.changes).padStart(12)} ${`(${w.council})`.padStart(16)}  ${String(w.infight).padStart(18)}  ${mean.toFixed(1).padStart(10)}  ${String(w.might.length ? Math.max(...w.might) : 0).padStart(3)}  ${(w.empty / 7).toFixed(1).padStart(18)}  ${String(w.musters).padStart(7)}  ${String(w.chiefFell).padStart(15)}`);
  });
  console.log('\n  the News by week (Council: recruit, promotion, claim, crowned, feud, betrayal, trial, feast, oath, desertion; the field: named, slain)');
  weeks.forEach((w, i) => console.log(`  ${String(i + 1).padStart(4)}  ${Object.entries(w.kinds).map(([k, n]) => `${k} ${n}`).join(', ')}`));
  const full = weeks.slice(2);
  const avg = (f: (w: (typeof weeks)[number]) => number) => (full.length ? full.reduce((s, w) => s + f(w), 0) / full.length : 0);
  console.log(`\n  from week 3: ${avg((w) => w.changes).toFixed(1)} seat changes a week, ${avg((w) => w.council).toFixed(1)} of them the Council's own turns (target 3 to 5), ${avg((w) => w.infight).toFixed(1)} lost to infighting a week (target about 1)`);
  for (const [d, x] of Object.entries(at)) console.log(`  day ${d}: Might mean ${x.mean.toFixed(1)}, top ${x.top}, ${x.n} members${d === '60' ? ' (target: mean 3 to 5)' : ''}`);
  if (around60.length) console.log(`  days 53 to 67: Might mean ${(around60.reduce((a, b) => a + b, 0) / around60.length).toFixed(1)} (the day's means, averaged)`);
  console.log(`  first member at Might 10: ${firstTen === undefined ? 'none' : `day ${firstTen}`}${tenth ? ` (${tenth.name}, ${tenth.rank}${tenth.boss ? ', born a boss' : ''}: ${tenth.met} meetings, ${tenth.lost} lost, ${tenth.scars} scars)` : ''} (target: not before day 45)`);
  // (phase 3: fleeing and humiliation, read from the News)
  const sum = (k: string) => weeks.reduce((s, w) => s + (w.kinds[k] ?? 0), 0);
  console.log(`  phase 3: ${sum('fled')} fled the board, ${sum('shamed')} humiliated (by fleeing or cheating death), ${sum('took')} trophies taken, ${sum('reclaimed')} brought home, ${sum('vengeance')} Vengeances (the bot's saves have no Sworn pairs)`);
  console.log(`  warchiefs: ${chiefs.length ? chiefs.map((c) => `${c.name} days ${c.from}-${c.to ?? 'now'}${c.how ? ` (${c.how})` : ''}`).join('; ') : 'none'} (target: at least 2 weeks unless the player kills him)`);
  console.log(`  the Muster opens at ${MUSTER_NEED} captains slain; final: ${war.members.length} members, ${war.fallen.length} fallen kept, ${war.heads?.length ?? 0} Warchief's Heads, ${war.trophies} War Trophies\n`);
}

main();
