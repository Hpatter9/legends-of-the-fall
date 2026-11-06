// The Nemesis War, phase 2: the Dark Council (docs/notes/nemesis-2.md; the design is docs/design/legends-expansion.md, section 2.5): the
// turns a day, the events' weights and conditions, loyalty, betrayals, trials, feasts, blood-oaths and desertion, the warchief's seat (never
// lost to the Council's own turns), the three lieutenants kept, determinism by the turn counter, the War Trophies and the Spoils, the
// Warchief's Muster's gate and its fight, and the save.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { hurt, place, startBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { armyRun, startStage, waveArmyOf } from '../src/sim/run';
import { startedMeta, type Meta } from '../src/sim/meta';
import { mixSeed, Rng } from '../src/sim/rng';
import { newWar, readWar, SEATS, type Nemesis, type War } from '../src/sim/nemesis';
import { startNemesisTally, tallyNemesis, type NemesisTally } from '../src/sim/nemesisLog';
import { nemHurt, nemMove } from '../src/sim/nemesisTraits';
import { buyScout, buyShard, COUNCIL_SALT, councilTurn, drawEvent, endOfRun, EVENT_WEIGHT, eventOpen, happen, LOYALTY, MIN_LIEUTENANTS, noteWar, RUN_TURNS, SHARD_PRICE, SHARD_WEEK, shardHeroes, swear, swornTo, takeTurn, TROPHY_DAY, type CouncilEvent } from '../src/sim/council';
import { MUSTER_NEED, musterArmy, musterOpen, musterPlan, startMuster, warchiefOf } from '../src/sim/muster';
import { CHIEF_PHASE, phaseKitOf } from '../src/sim/bossPhases';
import { ARMIES } from '../src/sim/armies';
import { settleRun } from '../src/sim/modes';

/** A started save with the War open, the first three armies opened and a party picked. */
function warMeta(seed = 3): Meta {
  const m = startedMeta(seed);
  m.armies.undead = { waves: 15, best: 15, won: 15, clears: 1, stars: {} };
  m.opened = ['orcs', 'undead', 'beasts'];
  m.party = ['knight', 'wizard', 'cleric', 'archer', 'paladin'];
  m.war = newWar();
  return m;
}

let nextName = 0;
/** A member of the Council, by hand. */
function member(war: War, rank: Nemesis['rank'], might = 3, extra: Partial<Nemesis> = {}): Nemesis {
  const n: Nemesis = { id: war.nextId++, base: 'skeleton', army: 'undead', name: `N${nextName++}`, epithet: '', rank, loyalty: 60, might, scars: 0, traits: ['scarred'], weak: ['dread:knight'], known: [], memory: [], met: 1, lost: 0, born: 0, ...extra };
  war.members.push(n);
  return n;
}

/** A Council of the given numbers (warchief, captains, lieutenants), sworn as the Council swears them. */
function council(m: Meta, chief: number, caps: number, lts: number): War {
  const war = m.war!;
  for (let i = 0; i < chief; i++) member(war, 'warchief', 6);
  for (let i = 0; i < caps; i++) member(war, 'captain', 4);
  for (let i = 0; i < lts; i++) member(war, 'lieutenant', 2);
  swear(war);
  return war;
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** A fight with three heroes placed, ready to be told what happened. */
function fightOf(band: string[], seed = 5): Battle {
  const b = startBattle(seed, band, {});
  const spots: [number, number][] = [];
  for (let v = b.board.d - DEPLOY_ROWS; v < b.board.d; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  ['knight', 'wizard', 'cleric'].forEach((k, i) => place(b, k, spots[i * 3][0], spots[i * 3][1]));
  b.phase = 'fight';
  return b;
}
const hero = (b: Battle, k: string): Unit => b.units.find((u) => u.side === 'hero' && u.def === k)!;
const hit = (by: Unit, to: Unit, dmg: number, killed = false): BattleEvent => ({ kind: 'hit', by: by.id, to: to.id, dmg, heavy: false, splash: false, killed, src: 'blow' });
function told(b: Battle, events: BattleEvent[]): NemesisTally {
  const t = startNemesisTally();
  tallyNemesis(t, events, b.units, 6000);
  return t;
}

/** A won fight in which the given member stood and was slain by the Knight. */
function slay(m: Meta, n: Nemesis, seed = 7, day?: number, run = armyRun(seed, n.army)) {
  const b = fightOf([n.base, 'skeleton'], seed);
  const u = b.units.find((x) => x.side === 'foe' && x.def === n.base)!;
  u.nem = { id: n.id, name: n.name, rank: n.rank, traits: n.traits, weak: n.weak };
  const tally = told(b, [hit(hero(b, 'knight'), u, u.maxHp, true)]);
  for (const x of b.units.filter((y) => y.side === 'foe')) {
    x.alive = false;
    x.hp = 0;
  }
  b.phase = 'won';
  return noteWar(m, run, b, tally, true, 5, day);
}

test('the Council takes at most four turns a day after runs, and one on the first visit; a new day counts afresh', () => {
  const m = warMeta();
  council(m, 0, 2, 4);
  const war = m.war!;
  for (let i = 0; i < RUN_TURNS; i++) assert.ok(councilTurn(m, 'run', 20270105), `run turn ${i + 1}`);
  assert.equal(councilTurn(m, 'run', 20270105), null, 'a fifth run turn that day is not counted');
  assert.ok(councilTurn(m, 'visit', 20270105), 'the first visit still counts');
  assert.equal(councilTurn(m, 'visit', 20270105), null, 'one visit a day');
  assert.equal(war.turn, RUN_TURNS + 1);
  assert.ok(councilTurn(m, 'run', 20270106), 'the next day counts afresh');
  assert.ok(councilTurn(m, 'visit', 20270106));
  assert.equal(war.turn, RUN_TURNS + 3);
});

test('only an army run that has ended gives the Council its turn (not a wave won, nor the Muster)', () => {
  const m = warMeta();
  council(m, 0, 1, 3);
  const run = armyRun(9, 'undead');
  assert.equal(endOfRun(m, run, 20270105), null, 'a run still going');
  run.over = true;
  assert.ok(endOfRun(m, run, 20270105));
  const muster = { ...armyRun(9, 'undead'), over: true, mode: { kind: 'muster' as const, army: 'undead', chief: 1, base: 'skeleton' } };
  assert.equal(endOfRun(m, muster, 20270105), null);
  // (and settleRun takes it when the page gives the day, never in a tool that leaves the day out)
  const b = fightOf(['skeleton']);
  b.phase = 'lost';
  const before = m.war!.turn;
  settleRun(m, run, { won: false, stage: 4, stars: 0, battle: b, nemesis: told(b, []) });
  assert.equal(m.war!.turn, before, 'no day: no turn');
  const fight: Parameters<typeof settleRun>[2] = { won: false, stage: 4, stars: 0, battle: b, nemesis: told(b, []), day: 20270105 };
  settleRun(m, run, fight);
  assert.equal(m.war!.turn, before + 1);
});

test('a turn replays exactly from the turn counter and the save’s seed, and draws nothing else', () => {
  const m = warMeta(11);
  council(m, 1, 3, 5);
  const a = clone(m);
  const b = clone(m);
  for (let i = 0; i < 30; i++) {
    takeTurn(a.war!, a);
    takeTurn(b.war!, b);
  }
  assert.deepEqual(a.war, b.war);
  // (another save's seed, or another turn number, is another stream)
  const c = clone(m);
  c.seed = 12;
  for (let i = 0; i < 30; i++) takeTurn(c.war!, c);
  assert.notDeepEqual(JSON.stringify(c.war!.news), JSON.stringify(a.war!.news));
  assert.equal(new Rng(mixSeed(m.seed, COUNCIL_SALT, 0)).next(), new Rng(mixSeed(m.seed, COUNCIL_SALT, 0)).next());
});

test('the events’ weights are the design’s table, and each is drawn about as often as its weight says when all are open', () => {
  assert.deepEqual({ ...EVENT_WEIGHT }, { recruit: 3, promotion: 4, feud: 2, betrayal: 1, feast: 1, trial: 1, oath: 0.5, desertion: 0.5 });
  const m = warMeta();
  const war = council(m, 1, 3, 6);
  const lts = war.members.filter((n) => n.rank === 'lieutenant');
  lts[0].loyalty = 10;
  lts[0].might = 4;
  lts[1].might = 1;
  lts[1].streak = -3;
  for (const e of Object.keys(EVENT_WEIGHT) as CouncilEvent[]) assert.ok(eventOpen(war, e), `${e} is open`);
  const counts: Partial<Record<CouncilEvent, number>> = {};
  const N = 13_000;
  for (let i = 0; i < N; i++) {
    const e = drawEvent(war, new Rng(mixSeed(5, i)))!;
    counts[e] = (counts[e] ?? 0) + 1;
  }
  for (const [e, w] of Object.entries(EVENT_WEIGHT)) assert.ok(Math.abs((counts[e as CouncilEvent] ?? 0) / N - w / 13) < 0.02, `${e}: ${counts[e as CouncilEvent]}`);
});

test('each event waits for its conditions', () => {
  const m = warMeta();
  const war = m.war!;
  assert.ok(!eventOpen(war, 'feud') && !eventOpen(war, 'feast') && !eventOpen(war, 'promotion') && !eventOpen(war, 'oath'));
  assert.ok(eventOpen(war, 'recruit'));
  // (eight lieutenants: no recruit; four captains: no promotion)
  council(m, 0, 4, 8);
  assert.ok(!eventOpen(war, 'recruit'), 'the lieutenants’ seats are full');
  assert.ok(!eventOpen(war, 'promotion'), 'no captain’s seat is free');
  assert.ok(eventOpen(war, 'feud') && eventOpen(war, 'feast') && eventOpen(war, 'oath'));
  // (no betrayal while every lieutenant is loyal or far weaker; no trial below Might 4; no desertion without three meetings lost)
  assert.ok(!eventOpen(war, 'betrayal') && !eventOpen(war, 'trial') && !eventOpen(war, 'desertion'));
  const lt = war.members.find((n) => n.rank === 'lieutenant')!;
  lt.loyalty = 29;
  assert.ok(!eventOpen(war, 'betrayal'), 'too weak: Might 2 against a captain of 4');
  lt.might = 3;
  assert.ok(eventOpen(war, 'betrayal'), 'loyalty under 30, within a Might of its captain');
  lt.might = 4;
  assert.ok(eventOpen(war, 'trial'));
  lt.might = 1;
  lt.streak = -2;
  assert.ok(!eventOpen(war, 'desertion'));
  lt.streak = -3;
  assert.ok(eventOpen(war, 'desertion'));
});

test('a Recruit seats a named foe of an opened army as a lieutenant, at Might 1 or 2, its secrets unknown', () => {
  for (let s = 0; s < 40; s++) {
    const m = warMeta(s);
    happen(m.war!, m, new Rng(s), 'recruit');
    const n = m.war!.members[0];
    assert.equal(n.rank, 'lieutenant');
    assert.ok(n.might === 1 || n.might === 2);
    assert.ok(m.opened!.includes(n.army), `${n.base} of ${n.army}`);
    assert.deepEqual(n.known, []);
    assert.equal(n.traits.length, 1);
    assert.ok(n.weak[0]?.startsWith('dread:') && m.party.includes(n.weak[0].slice(6)));
    assert.equal(n.loyalty, LOYALTY.start);
  }
});

test('a Promotion raises the mightiest lieutenant (ties to loyalty) to a free captain’s seat', () => {
  const m = warMeta();
  const war = council(m, 0, 2, 3);
  const [a, b] = war.members.filter((n) => n.rank === 'lieutenant');
  a.might = 5;
  b.might = 5;
  b.loyalty = 90;
  happen(war, m, new Rng(1), 'promotion');
  assert.equal(b.rank, 'captain');
  assert.equal(a.rank, 'lieutenant');
  assert.equal(b.sworn, undefined);
});

test('a Feud: the winner gains a Might, the loser loses one and is slain 30% of the time; the warchief is never in one', () => {
  let slain = 0;
  const N = 400;
  for (let s = 0; s < N; s++) {
    const m = warMeta(s);
    const war = council(m, 1, 2, 0);
    const [a, b] = war.members.filter((n) => n.rank === 'captain');
    happen(war, m, new Rng(mixSeed(s, 1)), 'feud');
    const [w, l] = a.might > b.might ? [a, b] : [b, a];
    assert.equal(w.might, 5);
    if (!war.members.includes(l)) {
      slain++;
      assert.equal(war.fallen[0].how, 'council');
      assert.equal(war.fallen[0].foe, w.name);
    } else assert.equal(l.might, 3);
    assert.equal(warchiefOf(war)?.might, 6, 'the warchief is untouched');
  }
  assert.ok(Math.abs(slain / N - 0.3) < 0.07, `slain ${slain} of ${N}`);
});

test('a Betrayal succeeds half the time: the traitor takes the seat, the old captain is slain or cast down; a failed one is slain', () => {
  let won = 0;
  let killed = 0;
  const N = 400;
  for (let s = 0; s < N; s++) {
    const m = warMeta(s);
    const war = council(m, 0, 1, 2);
    const cap = war.members.find((n) => n.rank === 'captain')!;
    const [t, other] = swornTo(war, cap);
    t.loyalty = 5;
    t.might = 4;
    happen(war, m, new Rng(mixSeed(s, 2)), 'betrayal');
    if (t.rank === 'captain') {
      won++;
      assert.equal(other.sworn, t.id, 'the old captain’s lieutenants are sworn to the new');
      if (!war.members.includes(cap)) killed++;
      else assert.ok(cap.rank === 'lieutenant' && cap.sworn === t.id);
    } else {
      assert.ok(!war.members.includes(t), 'a failed traitor is slain');
      assert.equal(cap.rank, 'captain');
      assert.equal(war.fallen[0].foe, cap.name);
    }
  }
  assert.ok(Math.abs(won / N - 0.5) < 0.08, `won ${won}`);
  assert.ok(Math.abs(killed / Math.max(1, won) - 0.5) < 0.12, `killed ${killed} of ${won}`);
});

test('loyalty: a feast lifts a captain’s table, ambition wears at a strong lieutenant, a captain who wins its meeting is followed more gladly', () => {
  const m = warMeta();
  const war = council(m, 0, 1, 2);
  const cap = war.members.find((n) => n.rank === 'captain')!;
  const [a, b] = swornTo(war, cap);
  b.weak = ['dread:knight', 'glutton'];
  happen(war, m, new Rng(3), 'feast');
  assert.equal(cap.loyalty, 75);
  assert.equal(a.loyalty, 75);
  assert.equal(b.might, 3, 'a Glutton grows at a feast');
  // (ambition: a lieutenant as mighty as its captain loses 2 a turn; one weaker does not)
  cap.might = 3;
  a.might = 3;
  const was = a.loyalty;
  const bWas = b.loyalty;
  m.war!.members = m.war!.members.filter((n) => n === cap || n === a || n === b);
  takeTurn(war, m);
  assert.ok(!war.members.includes(a) || a.loyalty <= was + LOYALTY.ambition || a.rank !== 'lieutenant');
  assert.ok(!war.members.includes(b) || b.loyalty >= bWas || b.rank !== 'lieutenant', 'a weaker lieutenant’s loyalty does not wear');
  // (a captain who lived through a fight the heroes lost: its lieutenants +10)
  const m2 = warMeta();
  const w2 = council(m2, 0, 1, 1);
  const c2 = w2.members.find((n) => n.rank === 'captain')!;
  const l2 = swornTo(w2, c2)[0];
  const fight = fightOf([c2.base]);
  fight.units.find((u) => u.side === 'foe')!.nem = { id: c2.id, name: c2.name, rank: 'captain', traits: c2.traits, weak: c2.weak };
  fight.phase = 'lost';
  const note = noteWar(m2, armyRun(4, 'undead'), fight, told(fight, []), false, 7);
  assert.deepEqual(note.held, [c2.id]);
  assert.equal(l2.loyalty, 70);
  // (the Glutton's slow walk)
  const u = fight.units.find((x) => x.side === 'foe')!;
  u.nem!.weak = ['glutton'];
  assert.equal(nemMove(u), 0.9);
});

test('a Trial of Strength: a lieutenant of Might 4 or more against its captain; the winner takes the higher seat', () => {
  let rose = 0;
  for (let s = 0; s < 200; s++) {
    const m = warMeta(s);
    const war = council(m, 0, 1, 1);
    const cap = war.members.find((n) => n.rank === 'captain')!;
    const lt = swornTo(war, cap)[0];
    lt.might = 4;
    happen(war, m, new Rng(mixSeed(s, 3)), 'trial');
    if (lt.rank === 'captain') {
      rose++;
      if (war.members.includes(cap)) assert.equal(cap.rank, 'lieutenant');
    } else assert.equal(cap.rank, 'captain');
  }
  assert.ok(rose > 40 && rose < 160, `the challenger won ${rose} of 200`);
});

test('a Blood-oath binds two members; when one falls to the heroes, the other turns Vengeful against the hero who struck the blow', () => {
  const m = warMeta();
  const war = council(m, 0, 2, 0);
  happen(war, m, new Rng(4), 'oath');
  const [a, b] = war.members;
  assert.equal(a.oath, b.id);
  assert.equal(b.oath, a.id);
  const note = slay(m, a);
  assert.equal(note.slain[0]?.id, a.id);
  assert.equal(b.vengeful, 'knight');
  assert.equal(b.oath, undefined);
  assert.ok(war.news.some((x) => x.kind === 'oath' && x.text.includes('vengeance')));
  // (in the fight: +20% to that hero, and it goes for that hero first)
  const fight = fightOf(['skeleton']);
  const u = fight.units.find((x) => x.side === 'foe')!;
  u.nem = { id: b.id, name: b.name, rank: 'captain', traits: [], weak: [], veng: 'knight' };
  const knight = hero(fight, 'knight');
  const wizard = hero(fight, 'wizard');
  assert.equal(nemHurt(fight, u, knight, u, 100, 'blow', false, []), 120);
  assert.equal(nemHurt(fight, u, wizard, u, 100, 'blow', false, []), 100);
  // (a brother slain by a rival of the Council: the other's loyalty falls instead)
  const m2 = warMeta();
  const w2 = council(m2, 0, 2, 0);
  const [c, d] = w2.members;
  c.oath = d.id;
  d.oath = c.id;
  c.might = 1;
  d.might = 9;
  for (let s = 0; !w2.fallen.length && s < 200; s++) {
    c.might = 1;
    happen(w2, m2, new Rng(mixSeed(s, 9)), 'feud');
  }
  assert.equal(w2.fallen[0]?.id, c.id);
  assert.ok(d.loyalty <= 60 + LOYALTY.brother);
  void hurt;
});

test('a member at Might 1 who has lost its last three meetings deserts', () => {
  const m = warMeta();
  const war = council(m, 0, 1, 3);
  const n = war.members.find((x) => x.rank === 'lieutenant')!;
  n.might = 1;
  n.streak = -3;
  happen(war, m, new Rng(1), 'desertion');
  assert.ok(!war.members.includes(n));
  assert.ok(war.news[0].text.includes('has had enough'));
});

test('the warchief is never slain by the Council’s turns: only the heroes bring him down', () => {
  for (let s = 0; s < 12; s++) {
    const m = warMeta(s);
    const war = council(m, 1, 4, 8);
    const chief = warchiefOf(war)!;
    chief.might = 1;
    for (const n of war.members) n.loyalty = 0;
    for (let i = 0; i < 200; i++) takeTurn(war, m);
    assert.equal(warchiefOf(war)?.id, chief.id);
    assert.ok(!war.fallen.some((f) => f.id === chief.id));
  }
});

test('the empty warchief’s seat: the mightiest captain claims it, and takes it a turn later (or a challenger wins it)', () => {
  const m = warMeta();
  const war = council(m, 0, 3, 3);
  const caps = war.members.filter((n) => n.rank === 'captain');
  caps[1].might = 7;
  takeTurn(war, m);
  assert.equal(war.claim, caps[1].id);
  assert.ok(war.news.some((x) => x.kind === 'claim'));
  takeTurn(war, m);
  const chief = warchiefOf(war);
  assert.ok(chief, 'a warchief sits');
  assert.equal(war.claim, undefined);
  assert.ok(chief.id === caps[1].id || war.news.some((x) => x.kind === 'feud' && x.text.includes('for the seat')));
});

test('the Council keeps at least three lieutenants once the War is open, and every lieutenant is sworn while a captain has room', () => {
  for (let s = 0; s < 10; s++) {
    const m = warMeta(s);
    const war = m.war!;
    for (let i = 0; i < 60; i++) {
      takeTurn(war, m);
      assert.ok(war.members.filter((n) => n.rank === 'lieutenant').length >= MIN_LIEUTENANTS, `turn ${war.turn}`);
      assert.ok(war.members.filter((n) => n.rank === 'warchief').length <= SEATS.warchief);
      assert.ok(war.members.filter((n) => n.rank === 'captain').length <= SEATS.captain);
      assert.ok(war.members.filter((n) => n.rank === 'lieutenant').length <= SEATS.lieutenant);
      const caps = war.members.filter((n) => n.rank === 'captain');
      for (const c of caps) assert.ok(swornTo(war, c).length <= 2);
      const room = caps.reduce((k, c) => k + 2 - swornTo(war, c).length, 0);
      if (room > 0) assert.ok(war.members.every((n) => n.rank !== 'lieutenant' || n.sworn !== undefined), 'sworn while a captain has room');
      assert.ok(war.members.every((n) => n.might >= 1 && n.might <= 10 && n.loyalty >= 0 && n.loyalty <= 100));
    }
  }
});

test('slaying pays War Trophies (twelve a day at most); the Spoils sell unlock shards (two a week) and scouts', () => {
  const m = warMeta();
  const war = council(m, 0, 4, 4);
  for (const n of war.members.slice()) slay(m, n, 7, 20270105);
  // (four captains 8, four lieutenants 4: twelve, the day's cap)
  assert.equal(war.trophies, TROPHY_DAY);
  council(m, 0, 1, 0);
  slay(m, war.members.find((n) => n.rank === 'captain')!, 8, 20270105);
  assert.equal(war.trophies, TROPHY_DAY, 'the day is spent');
  const kind = shardHeroes(m)[0];
  assert.ok(kind);
  const had = m.unlock?.[kind] ?? 0;
  assert.ok(buyShard(m, kind, 20270105));
  assert.equal(war.trophies, TROPHY_DAY - SHARD_PRICE);
  assert.equal(m.unlock?.[kind] ?? (m.unlocked.includes(kind) ? had + 1 : 0), had + 1);
  war.trophies = 99;
  for (let i = 1; i < SHARD_WEEK; i++) assert.ok(buyShard(m, kind, 20270106));
  assert.equal(buyShard(m, kind, 20270106), null, 'two a week');
  assert.ok(buyShard(m, kind, 20270118), 'a new week');
  assert.equal(buyShard(m, m.unlocked[0], 20270118), null, 'never an owned hero');
  // (a scout reveals one secret)
  const n = member(war, 'lieutenant');
  assert.ok(buyScout(m, n.id)?.includes('Battle-scarred'));
  assert.deepEqual(n.known, ['scarred']);
});

test('the Muster opens with a warchief once two captains have fallen since the last; it is three waves with the warchief last, who changes form', () => {
  const m = warMeta();
  const war = council(m, 1, 4, 4);
  const chief = warchiefOf(war)!;
  assert.ok(!musterOpen(war));
  assert.equal(startMuster(m, m.party, 9), null, 'not open: no Muster');
  const caps = war.members.filter((n) => n.rank === 'captain');
  slay(m, caps[0], 1);
  assert.ok(!musterOpen(war));
  const note = slay(m, caps[1], 2);
  assert.equal(war.musterSince, MUSTER_NEED);
  assert.ok(musterOpen(war));
  assert.ok(note.council?.some((l) => l.includes('Muster is open')));
  // (a slain lieutenant does not count)
  const run = startMuster(m, m.party, 9)!;
  assert.equal(run.mode?.kind, 'muster');
  const army = waveArmyOf(run)!;
  assert.equal(army.waves.length, 3);
  assert.equal(army.waves[2].foes[0], chief.base);
  assert.equal(army.waves[2].boss, 'final');
  assert.deepEqual(run.nemesis!.waves['3'], [chief.id]);
  assert.ok(run.nemesis!.waves['1'].length > 0 && run.nemesis!.waves['1'].length <= 3);
  assert.ok(run.nemesis!.waves['2'].length > 0 && run.nemesis!.waves['2'].length <= 2);
  // (the third wave: the warchief at the head, the last boss's wall, a second form at half health)
  run.stage = 3;
  const b = startStage(run);
  const boss = b.units.find((u) => u.side === 'foe' && u.nem?.id === chief.id)!;
  assert.ok(boss, 'the warchief stands');
  assert.equal(b.units.filter((u) => u.side === 'foe').indexOf(boss), 0, 'at the head of the band');
  assert.ok(boss.phase && !boss.phase.done);
  assert.equal(phaseKitOf(boss), CHIEF_PHASE);
  // (its strength runs on from the army's own last waves)
  const a = ARMIES.find((x) => x.id === chief.army)!;
  const mA = musterArmy(a.id, chief.base)!;
  const k = (army: typeof a, n: number) => army.start * (1 + army.growth * (n - 1));
  assert.ok(Math.abs(k(mA, 3) - k(a, a.waves.length)) < 1e-9);
  assert.ok(musterPlan(war)!.members.every((s) => !s.boss));
});

test('the warchief’s fall leaves his Head, resets the Muster, and reshuffles the Council: a captain to the seat, a lieutenant to captain', () => {
  const m = warMeta();
  const war = council(m, 1, 3, 4);
  war.musterSince = 2;
  const chief = warchiefOf(war)!;
  const top = war.members.filter((n) => n.rank === 'captain')[0];
  top.might = 8;
  const lt = war.members.filter((n) => n.rank === 'lieutenant')[0];
  lt.might = 5;
  const run = startMuster(m, m.party, 3)!;
  const note = slay(m, chief, 3, 20270105, run);
  assert.equal(note.slain[0].rank, 'warchief');
  assert.equal(war.fallen[0].how, 'muster');
  assert.equal(war.heads?.[0]?.base, chief.base);
  assert.equal(war.musterSince, 0);
  assert.equal(warchiefOf(war)?.id, top.id, 'the mightiest captain takes the seat at once');
  assert.equal(lt.rank, 'captain', 'the mightiest lieutenant rises');
  assert.equal(war.trophies, 5);
  assert.ok(note.council?.some((l) => l.includes('Head')));
});

test('the save keeps the Council’s new fields and drops what does not hold', () => {
  const m = warMeta();
  const war = council(m, 1, 2, 3);
  for (let i = 0; i < 10; i++) takeTurn(war, m);
  war.trophies = 7;
  war.musterSince = 1;
  war.heads = [{ name: 'Gash', base: 'orcWarlord', army: 'orcs', might: 4, turn: 3 }];
  const back = readWar(clone(war))!;
  assert.deepEqual(back, war);
  const raw = clone(war) as unknown as Record<string, unknown>;
  raw.news = [...Array(60)].map((_, i) => ({ turn: i, kind: 'feud', text: 'x' })).concat([{ turn: 1, kind: 'nonsense', text: 'y' }]);
  raw.trophies = -4;
  (raw.members as Record<string, unknown>[])[0].sworn = 9999;
  (raw.members as Record<string, unknown>[])[0].oath = 9999;
  const read = readWar(raw)!;
  assert.equal(read.news.length, 40);
  assert.equal(read.trophies, 0);
  assert.equal(read.members[0].sworn, undefined);
  assert.equal(read.members[0].oath, undefined);
  // (a phase 1 War reads with the new fields at rest)
  const old = readWar({ v: 1, turn: 0, members: [], fallen: [], nextId: 1 })!;
  assert.deepEqual(old, newWar());
});
