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
import { newWar, snapOf, type Nemesis, type War } from '../../src/sim/nemesis';
import { decorate } from '../../src/sim/revenge';
import { setHunt } from '../../src/sim/hunt';
import { tauntFor } from '../../src/tauntCutRules';
import { mixSeed } from '../../src/sim/rng';
import { duelLog, playArmy, playWaves, savedAt, WAR_BOT } from '../autoplay';

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

/** NEMESIS-DEPTH: `--hunts` has the bot set a hunt whenever it can (`hunt.ts`). */
const HUNTS = process.argv.includes('--hunts');

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
  // (NEMESIS-DEPTH: the meetings each member had when the heroes slew it, and the share of seats held by strangers the heroes never met)
  const metAtFall: number[] = [];
  const strangerShare: number[] = [];
  // (NEMESIS-DEPTH: each member's taunt as it would open its next meeting, compared with the one before: the same line twice running)
  const lastTaunt = new Map<number, { met: number; line: string }>();
  let taunts = 0;
  let repeats = 0;
  const triggers: Record<string, number> = {};
  let bornNamed = 0;
  let huntsSet = 0;
  let huntsWon = 0;
  let huntsLost = 0;
  let bornRecruit = 0;
  const at: Record<number, { mean: number; top: number; n: number }> = {};
  WAR_BOT.settle = true;
  // (phase 4: the bot takes every duel it is offered, its champion the hero named or else its strongest; `--no-duels` as phase 3)
  WAR_BOT.duels = !process.argv.includes('--no-duels');
  duelLog.length = 0;
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
    const objs = new Map(war.members.map((n) => [n.id, n]));
    const chiefBefore = warchiefOf(war);
    const key = dayKey(day);
    if (opened) turn(meta, 'visit', key, week);
    // (NEMESIS-DEPTH, idea 4, with `--hunts`: the bot sets a hunt each day it has none and the trophies, on the mightiest member of the army
    // it plays most, else of any army it plays)
    if (HUNTS && opened && !war.hunt && war.trophies >= 2) {
      const armies = (reach.length ? reach : [ARMIES[0]]).map((a) => a.id);
      const pick = [...war.members].filter((n) => armies.includes(n.army) && !war.away?.[String(n.id)]).sort((a, b) => Number(b.army === armies[armies.length - 1]) - Number(a.army === armies[armies.length - 1]) || b.might - a.might || a.id - b.id)[0];
      if (pick && setHunt(meta, pick.id) !== null) huntsSet++;
    }
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
      if (x.kind === 'hunt' && x.text.startsWith('The hunt is over')) huntsWon++;
      if (x.kind === 'hunt' && x.text.startsWith('The hunt has failed')) huntsLost++;
      if (x.kind === 'named') bornNamed++;
      if (x.kind === 'recruit') bornRecruit++;
      // (phase 3: a humiliation is told on its own line, or on its cheat's)
      if (/humiliated/.test(x.text) && !/returns$/.test(x.text)) week.kinds.shamed = (week.kinds.shamed ?? 0) + 1;
      if (/humiliated.*, and took /.test(x.text)) week.kinds.took = (week.kinds.took ?? 0) + 1;
    }
    const after = seatsOf(war);
    for (const [id, rank] of after) if (before.get(id) !== rank) week.changes++;
    for (const id of before.keys()) if (!after.has(id)) week.changes++;
    const fresh = war.fallen.filter((f) => !fallenIds.has(f.id));
    for (const f of fresh) if (f.how !== 'council') metAtFall.push(objs.get(f.id)?.met ?? 1);
    for (const n of war.members) {
      const was = lastTaunt.get(n.id);
      if (was && was.met === n.met) continue;
      const t = tauntFor(decorate(meta, snapOf(n), n), PARTY, mixSeed(SEED, day, n.id));
      if (was) {
        taunts++;
        if (t.line === was.line) repeats++;
      }
      triggers[t.trigger] = (triggers[t.trigger] ?? 0) + 1;
      lastTaunt.set(n.id, { met: n.met, line: t.line });
    }
    if (war.members.length) strangerShare.push(war.members.filter((n) => n.met === 0).length / war.members.length);
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
  WAR_BOT.duels = false;
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
  const dn = (f: (d: (typeof duelLog)[number]) => boolean) => duelLog.filter(f).length;
  const whys = [...new Set(duelLog.map((d) => d.why))].map((w) => `${w} ${dn((d) => d.why === w)}`).join(', ');
  console.log(`  phase 4: ${duelLog.length} duels (${whys || 'none'}): ${dn((d) => d.out === 'won')} won, ${dn((d) => d.out === 'lost')} lost, ${dn((d) => d.out === 'timeout')} out of time (${duelLog.length ? ((100 * dn((d) => d.out === 'won')) / duelLog.length).toFixed(0) : 0}% won; captains ${dn((d) => d.rank === 'captain' && d.out === 'won')} of ${dn((d) => d.rank === 'captain')}, lieutenants ${dn((d) => d.rank === 'lieutenant' && d.out === 'won')} of ${dn((d) => d.rank === 'lieutenant')}, warchiefs ${dn((d) => d.rank === 'warchief' && d.out === 'won')} of ${dn((d) => d.rank === 'warchief')})${WAR_BOT.duels ? '' : ''}`);
  console.log(`  warchiefs: ${chiefs.length ? chiefs.map((c) => `${c.name} days ${c.from}-${c.to ?? 'now'}${c.how ? ` (${c.how})` : ''}`).join('; ') : 'none'} (target: at least 2 weeks unless the player kills him)`);
  const meanOf = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  console.log(`  NEMESIS-DEPTH: ${metAtFall.length} slain by the heroes after ${meanOf(metAtFall).toFixed(1)} meetings on average (${metAtFall.filter((x) => x >= 3).length} after three or more); strangers (never met) held ${(100 * meanOf(strangerShare)).toFixed(0)}% of the seats; ${bornNamed} named by the fights, ${bornRecruit} recruited (${bornNamed + bornRecruit ? ((100 * bornRecruit) / (bornNamed + bornRecruit)).toFixed(0) : 0}% recruits)`);
  const tempers: Record<string, number> = {};
  for (const n of war.members) tempers[n.temper ?? 'none'] = (tempers[n.temper ?? 'none'] ?? 0) + 1;
  console.log(`  temperaments on the Council at the end: ${Object.entries(tempers).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}; epithets grown: ${war.members.filter((n) => n.was?.length).length} of ${war.members.length} members`);
  console.log(`  taunts: ${repeats} of ${taunts} the same line as the member's taunt before (${taunts ? ((100 * repeats) / taunts).toFixed(0) : 0}%); by trigger: ${Object.entries(triggers).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  if (HUNTS) console.log(`  hunts: ${huntsSet} set, ${huntsWon} run down, ${huntsLost} failed, ${huntsSet - huntsWon - huntsLost} lapsed or still on`);
  console.log(`  the Muster opens at ${MUSTER_NEED} captains slain; final: ${war.members.length} members, ${war.fallen.length} fallen kept, ${war.heads?.length ?? 0} Warchief's Heads, ${war.trophies} War Trophies\n`);
}

main();
