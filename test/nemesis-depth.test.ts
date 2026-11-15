// NEMESIS-DEPTH (docs/notes/nemesis-depth.md): the first batch of depth for the Nemesis War. Idea 1, staying power: fate spares a member in
// its first two meetings (not Vengeance, a duel or the Muster), a Recruit weighs 1, a stranger is placed first and at twice the chance, the
// death-spiral guard, and a new warchief's tenure before his Muster (three captains slain).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { place, startBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { armyRun, recruit } from '../src/sim/run';
import { decorate } from '../src/sim/revenge';
import { duelOffer } from '../src/sim/duel';
import { startedMeta, type Meta } from '../src/sim/meta';
import { GUARD, LIEUTENANT, newWar, planNemeses, readWar, snapOf, STRANGER_CHANCE, type Nemesis, type War } from '../src/sim/nemesis';
import { startNemesisTally, tallyNemesis, type NemesisTally } from '../src/sim/nemesisLog';
import { CHEAT_DEATH, EVENT_WEIGHT, FATE_MEETINGS, noteWar, swear, takeTurn } from '../src/sim/council';
import { CHIEF_TENURE, MUSTER_NEED, musterLine, musterOpen, startMuster, tenureLeft, warchiefOf } from '../src/sim/muster';

CHEAT_DEATH.on = true;

function warMeta(seed = 3): Meta {
  const m = startedMeta(seed);
  m.armies.undead = { waves: 15, best: 15, won: 15, clears: 1, stars: {} };
  m.opened = ['orcs', 'undead', 'beasts'];
  m.party = ['knight', 'wizard', 'cleric', 'archer', 'paladin'];
  m.war = newWar();
  return m;
}

let nextName = 0;
function member(war: War, rank: Nemesis['rank'], might = 3, extra: Partial<Nemesis> = {}): Nemesis {
  const n: Nemesis = { id: war.nextId++, base: 'skeleton', army: 'undead', name: `D${nextName++}`, epithet: '', rank, loyalty: 60, might, scars: 0, traits: ['scarred'], weak: ['dread:knight'], known: [], memory: [], met: 1, lost: 0, born: 0, ...extra };
  war.members.push(n);
  return n;
}

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
const nemOf = (n: Nemesis) => ({ id: n.id, name: n.name, rank: n.rank, traits: n.traits, weak: n.weak });

/** A won fight in which the member stood and the Knight slew it. */
function slay(m: Meta, n: Nemesis, seed = 7, run = armyRun(seed, n.army)) {
  const b = fightOf([n.base, 'skeleton'], seed);
  const u = b.units.find((x) => x.side === 'foe' && x.def === n.base)!;
  u.nem = nemOf(n);
  const tally = told(b, [hit(hero(b, 'knight'), u, u.maxHp, true)]);
  for (const x of b.units.filter((y) => y.side === 'foe')) {
    x.alive = false;
    x.hp = 0;
  }
  b.phase = 'won';
  return noteWar(m, run, b, tally, true, 5);
}

/** A lost fight in which the member stood and lived. */
function survive(m: Meta, n: Nemesis, seed: number) {
  const b = fightOf([n.base, 'skeleton'], seed);
  const u = b.units.find((x) => x.side === 'foe' && x.def === n.base)!;
  u.nem = nemOf(n);
  b.phase = 'lost';
  return noteWar(m, armyRun(seed, n.army), b, startNemesisTally(), false, 5);
}

test('fate spares a member in its first two meetings: brought down, it is always dragged off; from the third, the old chances', () => {
  for (let s = 0; s < 120; s++) {
    const m = warMeta(s);
    const n = member(m.war!, 'lieutenant', 2, { met: 0 });
    slay(m, n, s + 1);
    assert.ok(m.war!.members.includes(n), `seed ${s}: the first meeting spares it`);
    slay(m, n, s + 1000);
    assert.ok(m.war!.members.includes(n), `seed ${s}: the second meeting spares it`);
    assert.equal(n.met, FATE_MEETINGS);
  }
  let fell = 0;
  for (let s = 0; s < 200; s++) {
    const m = warMeta(s);
    const n = member(m.war!, 'lieutenant', 2, { met: FATE_MEETINGS });
    slay(m, n, s + 1);
    if (!m.war!.members.includes(n)) fell++;
  }
  assert.ok(fell > 120, `the third meeting can slay it (${fell} of 200)`);
});

test('fate does not spare a warchief at his Muster: it is his last stand', () => {
  const m = warMeta(4);
  const war = m.war!;
  member(war, 'warchief', 6, { met: 0 });
  for (let i = 0; i < 3; i++) member(war, 'captain', 4);
  for (let i = 0; i < 3; i++) member(war, 'lieutenant', 2);
  swear(war);
  war.musterSince = MUSTER_NEED;
  const chief = warchiefOf(war)!;
  slay(m, chief, 3, startMuster(m, m.party, 3)!);
  assert.ok(!war.members.includes(chief), 'the Muster is his last stand');
});

test('a Recruit weighs 1 on the Council’s turns', () => {
  assert.equal(EVENT_WEIGHT.recruit, 1);
});

test('a lieutenant the heroes have never met is placed first, at twice the chance', () => {
  assert.equal(STRANGER_CHANCE, 2);
  let strangers = 0;
  let known = 0;
  for (let s = 0; s < 400; s++) {
    const m = warMeta(s);
    const war = m.war!;
    const a = member(war, 'lieutenant', 5, { met: 3 });
    const z = member(war, 'lieutenant', 1, { met: 0 });
    const plan = planNemeses(war, armyRun(s + 1, 'undead'));
    const ids = Object.values(plan?.waves ?? {}).flat();
    if (ids.includes(z.id)) strangers++;
    if (ids.includes(a.id)) known++;
    // (when one lieutenant stands, it is the stranger, though it is the weaker)
    if (ids.length === 1) assert.equal(ids[0], z.id);
  }
  assert.ok(strangers > known, `${strangers} strangers, ${known} known`);
  assert.ok(LIEUTENANT.chance * STRANGER_CHANCE <= 1);
});

test('the death-spiral guard: one that has won three meetings in a row feasts instead of growing, about half the time', () => {
  let feasted = 0;
  let grew = 0;
  const N = 300;
  for (let s = 0; s < N; s++) {
    const m = warMeta(s);
    const n = member(m.war!, 'lieutenant', 3, { met: 4, streak: GUARD.streak });
    const note = survive(m, n, s + 1);
    if (note.feasted?.some((x) => x.id === n.id)) {
      feasted++;
      assert.equal(n.might, 3);
      assert.ok(n.memory[0].startsWith('Feasted'));
    } else if (n.might === 4) grew++;
  }
  assert.ok(Math.abs(feasted / N - GUARD.feasts) < 0.08, `${feasted} of ${N} feasted`);
  assert.equal(feasted + grew, N);
  // (below the streak it grows as ever)
  const m = warMeta(9);
  const n = member(m.war!, 'lieutenant', 3, { met: 4, streak: 0 });
  survive(m, n, 11);
  assert.equal(n.might, 4);
});

test('a new warchief holds his seat ten turns before his Muster can open, and the Muster needs three captains slain', () => {
  assert.equal(MUSTER_NEED, 3);
  const m = warMeta(5);
  const war = m.war!;
  for (let i = 0; i < 4; i++) member(war, 'captain', 4 + i);
  for (let i = 0; i < 4; i++) member(war, 'lieutenant', 2);
  swear(war);
  // (the empty seat is claimed, then taken)
  takeTurn(war, m);
  takeTurn(war, m);
  const chief = warchiefOf(war)!;
  assert.ok(chief);
  assert.equal(war.crowned, war.turn);
  war.musterSince = MUSTER_NEED;
  assert.ok(!musterOpen(war));
  assert.equal(tenureLeft(war), CHIEF_TENURE);
  assert.match(musterLine(war), /new to his seat/);
  while (tenureLeft(war) > 0) takeTurn(war, m);
  if (warchiefOf(war) === chief) {
    assert.ok(musterOpen(war));
    assert.ok(war.news.some((x) => x.kind === 'muster'), 'the turn that opens it says so');
  }
  // (the save keeps the turn he was crowned)
  assert.equal(readWar(JSON.parse(JSON.stringify(war)))!.crowned, war.crowned);
  // (a warchief crowned before NEMESIS-DEPTH has no tenure to serve)
  delete war.crowned;
  assert.equal(tenureLeft(war), 0);
});

test('only an old foe calls a champion out: one met fewer than two times makes no challenge, whatever its score', () => {
  const m = warMeta(6);
  for (const met of [0, 1, 2, 5]) {
    const n = member(m.war!, 'lieutenant', 3, { met, weak: ['dread:knight', 'vain'] });
    const run = armyRun(11, n.army, ['knight', 'wizard', 'cleric']);
    run.roster = [];
    run.squad = [];
    for (const k of ['knight', 'wizard', 'cleric']) run.squad.push(recruit(run, k).id);
    run.stage = 3;
    run.nemesis = { members: [decorate(m, snapOf(n), n)], waves: { '3': [n.id] } };
    assert.equal(!!duelOffer(run), met >= FATE_MEETINGS, `met ${met}`);
  }
});
