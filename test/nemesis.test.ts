// The Nemesis War, phase 1 (docs/notes/nemesis-1.md; the design is docs/design/legends-expansion.md, section 2): foes named by their deeds,
// read from a fight's log; traits from what actually happened; the caps; Normal's half Might; the run's snapshot and the fight's hooks; the save.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { hurt, place, startBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { armyRun, startStage } from '../src/sim/run';
import { gate } from '../src/sim/ailments';
import { loadMeta, saveMeta, startedMeta, type Meta } from '../src/sim/meta';
import { mixSeed, Rng } from '../src/sim/rng';
import { BIRTH, foeClass, MIGHT_MAX, NEMESIS_SALT, nemesisBand, RANK_STATS, nemStats, newWar, noteNemesis, openWar, planNemeses, readWar, SEATS, traitsEarned, type Nemesis, type War } from '../src/sim/nemesis';
import { blankLog, startNemesisTally, tallyNemesis, type FoeLog, type NemesisTally } from '../src/sim/nemesisLog';
import { addTrait, canAdd, immunityTraits, MAX_IMMUNE, MAX_TRAITS, nemHurt, TRAITS } from '../src/sim/nemesisTraits';
import { NEMESIS_NAMES } from '../src/sim/nemesisNames';
import { ARMIES } from '../src/sim/armies';

/** A started save with the War open (the Undead Legion cleared on Normal). */
function warMeta(seed = 3): Meta {
  const m = startedMeta(seed);
  m.armies.undead = { waves: 15, best: 15, won: 15, clears: 1, stars: {} };
  openWar(m);
  return m;
}

/** A fight of `band` with three heroes placed, ready to be told what happened. */
function fightOf(band: string[], seed = 5): Battle {
  const b = startBattle(seed, band, {});
  const spots: [number, number][] = [];
  for (let v = b.board.d - DEPLOY_ROWS; v < b.board.d; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  ['knight', 'wizard', 'cleric'].forEach((k, i) => place(b, k, spots[i * 3][0], spots[i * 3][1]));
  b.phase = 'fight';
  return b;
}
const hero = (b: Battle, k: string): Unit => b.units.find((u) => u.side === 'hero' && u.def === k)!;
const foe = (b: Battle, k: string): Unit => b.units.find((u) => u.side === 'foe' && u.def === k)!;
const hit = (by: Unit, to: Unit, dmg: number, killed = false, extra: Partial<Extract<BattleEvent, { kind: 'hit' }>> = {}): BattleEvent => ({ kind: 'hit', by: by.id, to: to.id, dmg, heavy: false, splash: false, killed, src: 'blow', ...extra });

/** Play hand-made events into a tally, as the page does a tick at a time (the units' state is set by the caller). */
function told(b: Battle, events: BattleEvent[], t = 6000): NemesisTally {
  const tally = startNemesisTally();
  tallyNemesis(tally, events, b.units, t);
  return tally;
}

test('a boss that slays a hero is named a captain, with a trait from the log and the Dread of the hero who hurt it most', () => {
  const m = warMeta();
  const run = armyRun(11, 'undead');
  const b = fightOf(['lichKing', 'skeleton']);
  const lich = foe(b, 'lichKing');
  const knight = hero(b, 'knight');
  const wizard = hero(b, 'wizard');
  knight.alive = false;
  knight.hp = 0;
  const tally = told(b, [hit(wizard, lich, 400), hit(knight, lich, 100), hit(lich, knight, knight.maxHp, true)]);
  b.phase = 'lost';
  const rngBefore = b.rng;
  const note = noteNemesis(m, run, b, tally, false, 15);
  assert.equal(b.rng, rngBefore, 'the fight’s own stream is never drawn');
  assert.equal(note.born.length, 1);
  const n = m.war!.members[0];
  assert.equal(n.base, 'lichKing');
  assert.equal(n.rank, 'captain');
  assert.equal(n.boss, true);
  assert.equal(n.might, 1);
  assert.equal(n.army, 'undead');
  assert.ok(n.traits.length === 1 && traitsEarned(tally.foes[lich.id], lich, b, tally, false).includes(n.traits[0]));
  assert.deepEqual(n.weak, ['dread:wizard']);
  assert.ok(NEMESIS_NAMES.undead.includes(n.name));
  assert.match(n.memory[0], /^Slew Kwame the Knight/);
  // (the War remembers the deed and the birth reveals what the player saw)
  assert.ok(n.known.includes(n.traits[0]) && n.known.includes('dread:wizard'));
});

test('maiming and escaping name a foe; an escort only by a killing blow, and only at its chance, from the War’s own stream', () => {
  // (maimed: a boss's 60%, drawn from mixSeed(run seed, NEMESIS_SALT, wave))
  let named = 0;
  let missed = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const m = warMeta();
    const run = armyRun(seed, 'undead');
    const b = fightOf(['boneCaptain', 'skeleton']);
    const cap = foe(b, 'boneCaptain');
    const knight = hero(b, 'knight');
    knight.hp = Math.round(knight.maxHp * 0.1);
    const tally = told(b, [hit(cap, knight, Math.round(knight.maxHp * 0.6))]);
    b.phase = 'won';
    cap.alive = true;
    const want = new Rng(mixSeed(seed, NEMESIS_SALT, 8)).next() < BIRTH.maimed.boss;
    const note = noteNemesis(m, run, b, tally, true, 8);
    assert.equal(note.born.length === 1, want, `seed ${seed}`);
    if (want) named++;
    else missed++;
  }
  assert.ok(named > 0 && missed > 0, 'some named, some not');
  // (escaped: alive at a loss)
  const m = warMeta();
  const b = fightOf(['alphaWolf', 'packBlack']);
  b.phase = 'lost';
  const tally = told(b, [hit(foe(b, 'alphaWolf'), hero(b, 'cleric'), 10)]);
  assert.equal(noteNemesis(m, armyRun(2, 'beasts'), b, tally, false, 8).born[0]?.deed, 'escaped');
  // (an escort is named only for a killing blow: maiming does not do it)
  const m2 = warMeta();
  const b2 = fightOf(['skeleton', 'skeleton']);
  const sk = b2.units.filter((u) => u.side === 'foe');
  const k2 = hero(b2, 'knight');
  b2.phase = 'lost';
  const t2 = told(b2, [hit(sk[0], k2, k2.maxHp)]);
  assert.equal(noteNemesis(m2, armyRun(2, 'undead'), b2, t2, false, 4).born.length, 0);
  // (and its slaying names it at 35%: the draw decides, the same draw every time)
  const tries = Array.from({ length: 20 }, (_, i) => {
    const mm = warMeta();
    const bb = fightOf(['skeleton', 'skeleton']);
    const s0 = bb.units.find((u) => u.side === 'foe')!;
    const kn = hero(bb, 'knight');
    kn.alive = false;
    bb.phase = 'won';
    const tt = told(bb, [hit(s0, kn, kn.maxHp, true)]);
    const got = noteNemesis(mm, armyRun(100 + i, 'undead'), bb, tt, true, 4).born.length;
    assert.equal(got === 1, new Rng(mixSeed(100 + i, NEMESIS_SALT, 4)).next() < BIRTH.slew.escort);
    return got;
  });
  assert.ok(tries.some((x) => x) && tries.some((x) => !x));
});

test('no War before the Undead Legion’s first Normal clear; the daily, the Last Stand and the quests never name a foe', () => {
  const m = startedMeta(4);
  const b = fightOf(['lichKing']);
  const knight = hero(b, 'knight');
  knight.alive = false;
  const tally = told(b, [hit(foe(b, 'lichKing'), knight, knight.maxHp, true)]);
  b.phase = 'lost';
  noteNemesis(m, armyRun(1, 'undead'), b, tally, false, 15);
  assert.equal(m.war, undefined);
  const w = warMeta();
  const daily = armyRun(1, 'undead');
  daily.mode = { kind: 'daily', date: 20260101, practice: false };
  assert.equal(noteNemesis(w, daily, b, tally, false, 10).born.length, 0);
  assert.equal(w.war!.members.length, 0);
});

/** A foe's log with the given numbers (a 1000-hp foe). */
const logOf = (over: Partial<FoeLog>): FoeLog => ({ ...blankLog('skeleton'), ...over });

test('each trait comes from its own condition in the log', () => {
  const b = fightOf(['skeleton', 'skeleton']);
  const [u, other] = b.units.filter((x) => x.side === 'foe');
  u.maxHp = 1000;
  u.hp = 500;
  const tally = startNemesisTally();
  const has = (f: Partial<FoeLog>, t: string, won = true) => traitsEarned(logOf(f), u, b, tally, won).includes(t);
  assert.ok(has({ ailHits: { burn: 3 } }, 'fireproof'));
  assert.ok(has({ ailDmg: { burn: 150 } }, 'fireproof'));
  assert.ok(!has({ ailHits: { burn: 2 }, ailDmg: { burn: 100 } }, 'fireproof'));
  assert.ok(has({ laid: { freeze: 1, chill: 1 } }, 'rime'));
  assert.ok(has({ ailDmg: { poison: 150 } }, 'venom'));
  assert.ok(has({ ailDmg: { bleed: 150 } }, 'thick'));
  assert.ok(has({ laid: { shock: 2 } }, 'grounded') && has({ arcs: 1 }, 'grounded'));
  assert.ok(has({ laid: { stun: 2 } }, 'ironSkull') && !has({ laid: { stun: 1 } }, 'ironSkull'));
  assert.ok(has({ laid: { fear: 1 } }, 'fearless'));
  assert.ok(has({ taken: 100, shots: 50 }, 'arrowCatcher') && !has({ taken: 100, shots: 40 }, 'arrowCatcher'));
  assert.ok(has({ taken: 100, melee: 60 }, 'scarred'));
  assert.ok(has({ moved: 1 }, 'sureFooted'));
  assert.ok(has({ spells: 2 }, 'spellScorned') && !has({ spells: 1 }, 'spellScorned'));
  assert.ok(has({ eidolon: 1 }, 'hornDeaf'));
  u.hp = 150;
  assert.ok(has({}, 'survivor'));
  u.hp = 500;
  assert.ok(!has({}, 'survivor'));
  assert.ok(has({ slew: ['knight'] }, 'bane:martial'));
  assert.ok(has({ slew: ['cleric'] }, 'healerHunter'));
  assert.ok(has({ slew: ['knight', 'wizard'] }, 'executioner') && !has({ slew: ['knight'] }, 'executioner'));
  assert.ok(has({ first: 4000 }, 'ambusher') && !has({ first: 6000 }, 'ambusher'));
  assert.ok(has({}, 'elusive', false), 'alive at a loss with heroes standing: a timeout');
  assert.ok(has({ dealt: { 1: 100 }, high: 40 }, 'hillKing') && !has({ dealt: { 1: 100 }, high: 30 }, 'hillKing'));
  // (Lone Wolf: it outlived every escort by 10 s)
  other.alive = false;
  other.diedAt = 1000;
  b.t = 20_000;
  assert.ok(has({}, 'loneWolf'));
  other.diedAt = 15_000;
  assert.ok(!has({}, 'loneWolf'));
});

test('the log reads an ailment newly laid on a foe from what it shows after a tick', () => {
  const b = fightOf(['skeleton']);
  const sk = foe(b, 'skeleton');
  const tally = startNemesisTally();
  sk.ail = [{ kind: 'chill', until: 5000, by: 1 }];
  tallyNemesis(tally, [], b.units, 1000);
  tallyNemesis(tally, [], b.units, 1100);
  sk.ail = [];
  tallyNemesis(tally, [], b.units, 6000);
  sk.ail = [{ kind: 'freeze', until: 9000, by: 1 }];
  tallyNemesis(tally, [], b.units, 7000);
  assert.equal(tally.foes[sk.id].laid.chill, 1);
  assert.equal(tally.foes[sk.id].laid.freeze, 1);
});

test('at most 3 traits, at most 2 of them immunities, and the epithet’s trait is never the one replaced', () => {
  const t: string[] = ['fireproof'];
  assert.ok(addTrait(t, 'rime', 'fireproof'));
  assert.ok(!canAdd(t, 'venom'), 'a third immunity');
  assert.ok(!addTrait(t, 'venom', 'fireproof'));
  assert.ok(addTrait(t, 'scarred', 'fireproof'));
  assert.ok(addTrait(t, 'ambusher', 'fireproof'));
  assert.equal(t.length, MAX_TRAITS);
  assert.ok(t.includes('fireproof'));
  // (a thousand generated nemeses: the caps hold whatever order they earn their traits in)
  const ids = Object.keys(TRAITS);
  const rng = new Rng(77);
  for (let i = 0; i < 1000; i++) {
    const list: string[] = [];
    const mark = rng.pick(ids);
    addTrait(list, mark);
    for (let k = 0; k < 8; k++) addTrait(list, rng.pick(ids), mark);
    assert.ok(list.length <= MAX_TRAITS && immunityTraits(list).length <= MAX_IMMUNE, list.join());
    assert.ok(list.includes(mark));
  }
});

test('Might grows +1 a run at most, never past 10; Normal takes half of it', () => {
  const m = warMeta();
  const run = armyRun(21, 'undead');
  const war = m.war!;
  const n: Nemesis = { id: war.nextId++, base: 'lichKing', army: 'undead', name: 'Morrow', epithet: 'the Unburnt', rank: 'captain', boss: true, loyalty: 60, might: 9, scars: 0, traits: ['fireproof'], weak: ['dread:knight'], known: [], memory: [], met: 1, lost: 0, born: 0 };
  war.members.push(n);
  const escape = () => {
    const b = fightOf(['lichKing']);
    b.units.find((u) => u.def === 'lichKing')!.nem = { id: n.id, name: 'Morrow', rank: 'captain', traits: n.traits, weak: n.weak };
    b.phase = 'lost';
    noteNemesis(m, run, b, told(b, []), false, 15);
  };
  escape();
  assert.equal(n.might, 10);
  // (a second escape in the same run adds nothing; nor does another run past 10)
  escape();
  assert.equal(n.might, 10);
  n.might = 3;
  escape();
  assert.equal(n.might, 3, 'the same run: +1 a run');
  noteNemesis(m, armyRun(22, 'undead'), (() => {
    const b = fightOf(['lichKing']);
    b.units.find((u) => u.def === 'lichKing')!.nem = { id: n.id, name: 'Morrow', rank: 'captain', traits: n.traits, weak: n.weak };
    b.phase = 'lost';
    return b;
  })(), startNemesisTally(), false, 15);
  assert.equal(n.might, 4);
  assert.ok(n.memory.length >= 1 && n.memory.length <= 8);
  // (Normal at half Might)
  const hard = nemStats({ rank: 'lieutenant', might: 10, scars: 0 }, 1);
  const normal = nemStats({ rank: 'lieutenant', might: 10, scars: 0 }, 0);
  assert.ok(Math.abs(hard.hp - RANK_STATS.lieutenant.hp * 1.6) < 1e-9 && Math.abs(hard.atk - RANK_STATS.lieutenant.atk * 1.35) < 1e-9);
  assert.ok(Math.abs(normal.hp - RANK_STATS.lieutenant.hp * 1.3) < 1e-9 && Math.abs(normal.atk - RANK_STATS.lieutenant.atk * 1.175) < 1e-9);
  const boss = nemStats({ rank: 'captain', boss: true, might: 10, scars: 0 }, 1);
  assert.ok(Math.abs(boss.hp - 1.3) < 1e-9 && Math.abs(boss.atk - 1.2) < 1e-9);
  assert.equal(MIGHT_MAX, 10);
});

test('slaying a nemesis pays crowns by its Might and moves it to the fallen', () => {
  const m = warMeta();
  const war = m.war!;
  war.members.push({ id: 1, base: 'skeleton', army: 'undead', name: 'Hask', epithet: 'the Scarred', rank: 'lieutenant', loyalty: 60, might: 3, scars: 0, traits: ['scarred'], weak: ['dread:cleric'], known: ['scarred'], memory: [], met: 1, lost: 0, born: 0 });
  war.nextId = 2;
  const b = fightOf(['skeleton', 'skeleton']);
  const sk = b.units.find((u) => u.side === 'foe')!;
  sk.nem = { id: 1, name: 'Hask', rank: 'lieutenant', traits: ['scarred'], weak: ['dread:cleric'] };
  sk.alive = false;
  const cleric = hero(b, 'cleric');
  b.phase = 'won';
  const before = m.crowns;
  const note = noteNemesis(m, armyRun(3, 'undead'), b, told(b, [hit(cleric, sk, 50, true)]), true, 5);
  assert.equal(m.crowns - before, 40 * 3);
  assert.equal(note.slain[0].by, 'cleric');
  assert.equal(war.members.length, 0);
  assert.equal(war.fallen[0].name, 'Hask');
  // (and the meeting taught the player a secret: the Dread)
  assert.deepEqual(note.learned, ['Hask the Scarred: Dread of Selam']);
});

test('a run meets its army’s nemeses where they stand: a boss nemesis as its boss, a lieutenant in an ordinary wave from wave 3', () => {
  const war: War = newWar();
  war.members.push({ id: 1, base: 'lichKing', army: 'undead', name: 'Morrow', epithet: 'the Unburnt', rank: 'captain', boss: true, loyalty: 60, might: 4, scars: 0, traits: ['fireproof'], weak: ['dread:knight'], known: [], memory: [], met: 1, lost: 0, born: 0 });
  for (let i = 0; i < 3; i++) war.members.push({ id: 2 + i, base: 'skeleton', army: 'undead', name: `L${i}`, epithet: 'the Cruel', rank: 'lieutenant', loyalty: 60, might: 2, scars: 0, traits: ['scarred'], weak: ['dread:cleric'], known: [], memory: [], met: 1, lost: 0, born: 0 });
  war.members.push({ id: 9, base: 'orcGrunt', army: 'orcs', name: 'Gash', epithet: '', rank: 'lieutenant', loyalty: 60, might: 2, scars: 0, traits: [], weak: [], known: [], memory: [], met: 1, lost: 0, born: 0 });
  let lieutenantWaves = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const run = armyRun(seed, 'undead', undefined, undefined, 1);
    const rn = planNemeses(war, run)!;
    assert.deepEqual(rn.waves['15'], [1], 'the Lich King is Morrow');
    assert.ok(!rn.members.some((s) => s.id === 9), 'an orc never stands with the dead');
    const ordinary = Object.entries(rn.waves).filter(([w]) => w !== '15');
    assert.ok(ordinary.length <= 2);
    for (const [w] of ordinary) assert.ok(Number(w) >= 3 && !run.mode || Number(w) >= 3);
    lieutenantWaves += ordinary.length;
    // (the planning is the run's own: the same seed, the same plan)
    assert.deepEqual(planNemeses(war, armyRun(seed, 'undead', undefined, undefined, 1)), rn);
  }
  assert.ok(lieutenantWaves > 10 && lieutenantWaves < 80);
  // (in the wave: Morrow is the band's boss, a lieutenant takes an escort's place at the back)
  const rn = { members: [{ id: 1, base: 'lichKing', name: 'Morrow', epithet: 'the Unburnt', rank: 'captain' as const, boss: true as const, might: 4, scars: 0, traits: ['fireproof'], weak: ['dread:knight'] }, { id: 2, base: 'spearman', name: 'Pell', epithet: 'the Cruel', rank: 'lieutenant' as const, might: 2, scars: 0, traits: ['scarred'], weak: [] }], waves: { '15': [1], '5': [2] } };
  const five = nemesisBand(rn, 5, ['skeleton', 'skeleton', 'boneVolley', 'spearman'], 1);
  assert.deepEqual(five.band, ['skeleton', 'skeleton', 'boneVolley', 'spearman']);
  assert.equal(five.place[0].at, 3);
  assert.deepEqual(nemesisBand(rn, 6, ['skeleton'], 1), { band: ['skeleton'], place: [] });
  // (and the fight it makes: the boss carries `nem` and its Might's hp on its wall)
  const run = armyRun(5, 'undead', undefined, undefined, 1);
  run.stage = 15;
  const plain = startStage(run);
  run.nemesis = rn;
  const named = startStage(run);
  const lich = (b: Battle) => b.units.find((u) => u.def === 'lichKing')!;
  assert.equal(lich(plain).nem, undefined);
  assert.equal(lich(named).nem?.id, 1);
  assert.equal(lich(named).maxHp, Math.max(1, Math.round(lich(plain).maxHp * nemStats(rn.members[0], 1).hp)));
  assert.ok(foeClass(lich(named)) === 'boss');
});

test('the fight’s hooks: an earned immunity, the Dread’s 25%, a Bane’s 20%; nothing for a fighter with no `nem`', () => {
  const b = fightOf(['skeleton', 'skeleton']);
  const [a, c] = b.units.filter((u) => u.side === 'foe');
  const knight = hero(b, 'knight');
  a.nem = { id: 1, name: 'A', rank: 'lieutenant', traits: ['fireproof', 'bane:martial'], weak: ['dread:knight'] };
  assert.equal(gate(b, a, 'burn', 3000), 0, 'Fireproof');
  assert.ok(gate(b, c, 'burn', 3000) > 0, 'its twin with no nem still burns');
  assert.equal(nemHurt(b, knight, a, knight, 100, 'blow', false, []), 125);
  assert.equal(nemHurt(b, a, knight, a, 100, 'blow', false, []), 120);
  assert.equal(nemHurt(b, hero(b, 'cleric'), a, hero(b, 'cleric'), 100, 'blow', false, []), 100);
  // (through `hurt` itself: the same blow on the same foe, first plain, then with the Dread of its striker)
  let hp = c.hp;
  hurt(b, knight, c, 40, false, false, []);
  const plain = hp - c.hp;
  c.nem = { id: 2, name: 'C', rank: 'lieutenant', traits: [], weak: ['dread:knight'] };
  hp = c.hp;
  hurt(b, knight, c, 40, false, false, []);
  assert.equal(hp - c.hp, Math.round(plain * 1.25));
});

test('the War is saved and read back; an old save plays on; a save past the gate opens it; the reader holds the caps', () => {
  const m = warMeta();
  m.war!.members.push({ id: 1, base: 'lichKing', army: 'undead', name: 'Morrow', epithet: 'the Unburnt', rank: 'captain', boss: true, loyalty: 60, might: 4, scars: 1, traits: ['fireproof'], weak: ['dread:knight'], known: ['fireproof'], mark: 'fireproof', memory: ['Slew Kwame the Knight · Undead Legion · Hard · wave 15'], met: 3, lost: 0, born: 0, grew: 9 });
  m.war!.nextId = 2;
  const store: Record<string, string> = {};
  saveMeta(m, { setItem: (k, v) => void (store[k] = v) });
  const back = loadMeta(1, { getItem: (k) => store[k] ?? null });
  assert.deepEqual(back.war, m.war);
  // (an old save, with no War and short of the gate: no War)
  const old = startedMeta(2);
  saveMeta(old, { setItem: (k, v) => void (store[k] = v) });
  assert.equal(loadMeta(1, { getItem: (k) => store[k] ?? null }).war, undefined);
  // (an old save past the gate: the War opens on its next load, its Council empty)
  const past = startedMeta(2);
  past.armies.undead = { waves: 15, best: 15, won: 15, clears: 2, stars: {} };
  saveMeta(past, { setItem: (k, v) => void (store[k] = v) });
  assert.deepEqual(loadMeta(1, { getItem: (k) => store[k] ?? null }).war, newWar());
  // (a hand-edited War: unknown fighters dropped, numbers clamped, the caps held)
  const raw = {
    turn: -4,
    nextId: 1,
    members: [
      { id: 5, base: 'nobody', army: 'undead', name: 'X', rank: 'captain', traits: [], weak: [] },
      { id: 6, base: 'skeleton', army: 'undead', name: 'Y', rank: 'lieutenant', might: 99, scars: 7, traits: ['fireproof', 'rime', 'venom', 'scarred', 'ambusher'], weak: ['dread:knight', 'fears:fire', 'hatesHeights'], memory: Array(20).fill('a line') },
      ...Array.from({ length: 12 }, (_, i) => ({ id: 10 + i, base: 'skeleton', army: 'undead', name: `Z${i}`, rank: 'lieutenant', traits: [], weak: [] })),
    ],
    fallen: [],
  };
  const w = readWar(raw)!;
  assert.equal(w.turn, 0);
  assert.ok(!w.members.some((n) => n.base === 'nobody'));
  const y = w.members.find((n) => n.id === 6)!;
  assert.equal(y.might, 10);
  assert.equal(y.scars, 3);
  assert.deepEqual(y.traits, ['fireproof', 'rime', 'scarred']);
  assert.equal(y.weak.length, 2);
  assert.equal(y.memory.length, 8);
  assert.equal(w.members.filter((n) => n.rank === 'lieutenant').length, SEATS.lieutenant);
  assert.ok(w.nextId > Math.max(...w.members.map((n) => n.id)));
});

test('every army has forty names of its own', () => {
  for (const a of ARMIES) {
    const bank = NEMESIS_NAMES[a.id];
    assert.equal(bank?.length, 40, a.id);
    assert.equal(new Set(bank).size, 40, `${a.id} names are all different`);
  }
});
