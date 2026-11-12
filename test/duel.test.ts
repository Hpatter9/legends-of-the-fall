// The Nemesis War, phase 4: duel waves (docs/notes/nemesis-4.md; the design is docs/design/legends-expansion.md, sections 2.8, 2.10 and
// 2.11): who challenges and whom (Vengeful, a Grudge holder, the Dread, a Vain one openly), at most one challenge a run, refusing makes it
// Mocking, the duel's fight (two on the board, in the middle ring, sixty seconds, the king's spells out, the nemesis at its duel share, a
// Vain one taking a tenth more, the fight's streams on the War's side stream, the same every time), a win counted as the wave won with its pay
// doubled and every hero healed a fifth, a warchief humiliated instead, a loss that wounds the champion and makes the nemesis mightier, a
// timeout that is an escape, and the save.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, hurt, playOut, stepBattle, type Battle } from '../src/sim/battle';
import { castSpell } from '../src/sim/spells';
import { armyRun, finish, keepCharges, loadRun, noteFight, recruit, saveRun, type Run } from '../src/sim/run';
import { startedMeta, type Meta } from '../src/sim/meta';
import { newWar, nemStats, MOCKING_ATK, snapOf, type Nemesis, type War } from '../src/sim/nemesis';
import { startNemesisTally, tallyNemesis, type NemesisTally } from '../src/sim/nemesisLog';
import { VAIN_DUEL } from '../src/sim/nemesisTraits';
import { CHEAT_DEATH, noteWar, TROPHIES } from '../src/sim/council';
import { decorate } from '../src/sim/revenge';
import { acceptDuel, challengeOf, championFor, contenders, DUEL_HEAL, DUEL_SHARE, duelHeal, duelMs, duelOffer, duelOutcome, duelShare, readRunDuel, refuseDuel, ringFor, settleDuelRun, startDuel, type DuelOffer } from '../src/sim/duel';
import { DUEL_MS, inRing, RING_R } from '../src/sim/duelRing';
import { REVIVE_SHARE } from '../src/sim/wounds';
import { armyById } from '../src/sim/armies';

/** A started save with the War open. */
function warMeta(seed = 3): Meta {
  const m = startedMeta(seed);
  m.armies.undead = { waves: 15, best: 15, won: 15, clears: 1, stars: {} };
  m.opened = ['orcs', 'undead'];
  m.party = ['knight', 'wizard', 'cleric', 'archer', 'paladin'];
  m.war = newWar();
  return m;
}
function member(war: War, extra: Partial<Nemesis> = {}): Nemesis {
  const n: Nemesis = { id: war.nextId++, base: 'skeleton', army: 'undead', name: `Rattle${war.nextId}`, epithet: 'the Bony', rank: 'lieutenant', loyalty: 60, might: 3, scars: 0, traits: ['scarred'], weak: ['dread:knight'], known: [], memory: [], met: 1, lost: 0, born: 0, ...extra };
  war.members.push(n);
  return n;
}
/** An Undead Legion run on `tier` at wave 3 with the given heroes in its squad, and the member standing in that wave. */
function runWith(m: Meta, n: Nemesis, kinds = ['knight', 'wizard', 'cleric'], wave = 3, seed = 11, tier = 0): Run {
  const run = armyRun(seed, n.army, kinds, undefined, tier);
  run.roster = [];
  run.squad = [];
  for (const k of kinds) {
    const h = recruit(run, k);
    run.squad.push(h.id);
  }
  run.stage = wave;
  run.nemesis = { members: [decorate(m, snapOf(n), n)], waves: { [String(wave)]: [n.id] } };
  return run;
}
const heroId = (run: Run, kind: string): number => run.roster.find((h) => h.kind === kind)!.id;
/** Play a duel out, tallying it as the page does. */
function duelOf(run: Run, o: DuelOffer, kind: string): { b: Battle; tally: NemesisTally } {
  const b = startDuel(run, o, heroId(run, kind));
  fight(b);
  const tally = startNemesisTally();
  while (b.phase === 'fight') tallyNemesis(tally, stepBattle(b), b.units, b.t);
  return { b, tally };
}
/** A duel decided by hand: the nemesis (`won`), the champion (`lost`) or neither (`timeout`, the nemesis at `left` of its health) falls. */
function decided(run: Run, o: DuelOffer, kind: string, end: 'won' | 'lost' | 'timeout', left = 0.5): { b: Battle; tally: NemesisTally } {
  const b = startDuel(run, o, heroId(run, kind));
  fight(b);
  const tally = startNemesisTally();
  const champ = b.units.find((u) => u.id === b.duel!.hero)!;
  const nem = b.units.find((u) => u.id === b.duel!.nem)!;
  const events = stepBattle(b);
  if (end === 'won') events.push(...blow(b, champ, nem, nem.hp + 999));
  else if (end === 'lost') events.push(...blow(b, nem, champ, champ.hp + 999));
  else {
    nem.hp = Math.max(1, Math.round(nem.maxHp * left));
    b.t = duelMs() - 100;
  }
  tallyNemesis(tally, events, b.units, b.t);
  while (b.phase === 'fight') tallyNemesis(tally, stepBattle(b), b.units, b.t);
  return { b, tally };
}
function blow(b: Battle, by: Battle['units'][number], to: Battle['units'][number], dmg: number) {
  const out: import('../src/sim/battle').BattleEvent[] = [];
  hurt(b, by, to, dmg, false, false, out, 'skill');
  return out;
}

test('who challenges: Vengeful first, then the deepest Grudge, then the Dread, and a Vain one openly; none without a score', () => {
  const m = warMeta();
  const squad = [{ id: 1, kind: 'knight' }, { id: 2, kind: 'wizard' }, { id: 3, kind: 'cleric' }];
  const base = snapOf(member(m.war!, { weak: ['dread:wizard'] }));
  assert.deepEqual(challengeOf(base, squad), { id: base.id, why: 'dread', hero: 2, kind: 'wizard' });
  assert.equal(challengeOf({ ...base, weak: ['dread:archer'] }, squad), undefined, 'its Dread is not in the squad: no challenge');
  assert.deepEqual(challengeOf({ ...base, grudge: { cleric: 0.1, knight: 0.2 } }, squad)?.kind, 'knight', 'the deepest Grudge');
  assert.deepEqual(challengeOf({ ...base, grudge: { knight: 0.2 }, vengeful: 'cleric' }, squad), { id: base.id, why: 'vengeful', hero: 3, kind: 'cleric' });
  assert.deepEqual(challengeOf({ ...base, weak: ['dread:archer', 'vain'] }, squad), { id: base.id, why: 'vain' }, 'Vain: an open challenge');
  assert.equal(challengeOf({ ...base, weak: ['dread:wizard', 'vain'] }, squad)?.kind, 'wizard', 'a Vain one with a score names its hero');
});

test('the offer reads only the run: an army run, the wave the nemesis stands in, at most one a run', () => {
  const m = warMeta();
  const n = member(m.war!);
  const run = runWith(m, n);
  const o = duelOffer(run)!;
  assert.deepEqual(o, { id: n.id, wave: 3, why: 'dread', hero: heroId(run, 'knight'), kind: 'knight' });
  assert.deepEqual(duelOffer(structuredClone(run)), o, 'the same every time');
  run.stage = 4;
  assert.equal(duelOffer(run), undefined, 'not in a wave it does not stand in');
  run.stage = 3;
  acceptDuel(run, o, heroId(run, 'knight'));
  assert.equal(duelOffer(run), undefined, 'one a run: an accepted challenge is the run’s one');
  const run2 = runWith(m, n);
  refuseDuel(run2, duelOffer(run2)!);
  assert.equal(duelOffer(run2), undefined, 'and so is a refused one');
  const daily = runWith(m, n);
  daily.mode = { kind: 'daily', date: 20260101, practice: true };
  assert.equal(duelOffer(daily), undefined, 'never outside an army run');
  // (a guest is never a champion)
  const run3 = runWith(m, n, ['knight', 'wizard']);
  run3.roster.find((h) => h.kind === 'knight')!.guest = true as never;
  assert.deepEqual(contenders(run3).map((h) => h.kind), ['wizard']);
  assert.equal(duelOffer(run3), undefined);
});

test('refusing makes the nemesis Mocking: +5% attack for the rest of the run', () => {
  const m = warMeta();
  const n = member(m.war!);
  const run = runWith(m, n);
  const before = nemStats(run.nemesis!.members[0], 0).atk;
  refuseDuel(run, duelOffer(run)!);
  assert.equal(run.duel?.out, 'refused');
  assert.equal(run.nemesis!.members[0].mocking, true);
  assert.ok(Math.abs(nemStats(run.nemesis!.members[0], 0).atk - before * (1 + MOCKING_ATK)) < 1e-9);
});

test('the duel’s fight: the two alone in the middle ring, sixty seconds, the nemesis at its share, the king’s spells out', () => {
  const m = warMeta();
  const n = member(m.war!);
  const run = runWith(m, n);
  const o = duelOffer(run)!;
  const b = startDuel(run, o, heroId(run, 'knight'));
  assert.equal(b.units.length, 2, 'the escorts are out of the duel');
  const champ = b.units.find((u) => u.side === 'hero')!;
  const nem = b.units.find((u) => u.side === 'foe')!;
  assert.equal(champ.def, 'knight');
  assert.equal(nem.nem?.id, n.id);
  assert.ok(inRing(b.duel!, champ) && inRing(b.duel!, nem), 'both in the ring');
  assert.ok(champ.v > nem.v, 'the champion at the near side');
  assert.equal(b.duel!.r, RING_R);
  assert.equal(b.timeLimit, duelMs());
  assert.ok(duelMs() >= DUEL_MS, 'the ring’s clock (DUEL-SHOW: stretched) never shorter than its sixty seconds');
  // (the share: against the wave's own nemesis)
  const wave = startDuelWave(run);
  const full = wave.units.find((u) => u.nem?.id === n.id)!;
  const share = duelShare('knight', false, 'undead');
  assert.ok(Math.abs(nem.maxHp - Math.round(full.maxHp * share.hp)) <= 1);
  assert.ok(Math.abs((nem.power ?? 1) - (full.power ?? 1) * share.atk) < 1e-9);
  assert.ok(DUEL_SHARE.hp < 1 && DUEL_SHARE.atk < 1, 'a fraction of its wave strength');
  fight(b);
  b.spells.mana = 999;
  assert.equal(castSpell(b, 'meteor' as never, nem.u, nem.v), false, 'no king’s spell in a duel');
  // (and it walks inside the ring all the way)
  while (b.phase === 'fight') {
    stepBattle(b);
    for (const u of b.units) if (u.alive && u.owner === undefined) assert.ok(inRing(b.duel!, u), `${u.def} left the ring`);
  }
  assert.ok(duelOutcome(b));
});

/** The wave's own fight, for comparing the nemesis's strength. */
import { startStage } from '../src/sim/run';
const startDuelWave = (run: Run) => startStage(run);

test('a duel replays exactly, on the War’s side stream; the wave’s own fight is untouched by it', () => {
  const m = warMeta();
  const n = member(m.war!);
  const run = runWith(m, n);
  const o = duelOffer(run)!;
  const a = duelOf(run, o, 'knight').b;
  const c = duelOf(structuredClone(run), o, 'knight').b;
  assert.equal(a.t, c.t);
  assert.equal(duelOutcome(a), duelOutcome(c));
  assert.deepEqual(a.units.map((u) => u.hp), c.units.map((u) => u.hp));
  const w1 = startStage(run);
  assert.notEqual(a.rng, w1.rng);
  // (having made the duel changes nothing in the wave's fight)
  const before = JSON.stringify(startStage(structuredClone(runWith(m, n))).units);
  assert.equal(JSON.stringify(startStage(run).units), before);
});

test('a ring stands where the two can walk to each other', () => {
  const m = warMeta();
  const n = member(m.war!);
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const run = runWith(m, n, ['knight'], 3, seed);
    const b = startStage(run);
    const r = ringFor(b.board);
    assert.ok(inRing({ mid: r.mid, r: RING_R }, r.hero) && inRing({ mid: r.mid, r: RING_R }, r.nem));
    assert.ok(r.mid.u - RING_R >= 0 && r.mid.u + RING_R < b.board.w && r.mid.v - RING_R >= 0 && r.mid.v + RING_R < b.board.d);
  }
});

test('a Vain nemesis takes a tenth more in a duel, and only in a duel', () => {
  const m = warMeta();
  const n = member(m.war!, { weak: ['dread:knight', 'vain'], traits: ['ambusher'] });
  const run = runWith(m, n);
  const o = duelOffer(run)!;
  const b = startDuel(run, o, heroId(run, 'knight'));
  fight(b);
  const champ = b.units.find((u) => u.side === 'hero')!;
  const nem = b.units.find((u) => u.side === 'foe')!;
  const hp = nem.hp;
  const plain = structuredClone(b);
  delete plain.duel;
  const pn = plain.units.find((u) => u.side === 'foe')!;
  hurt(b, champ, nem, 100, false, false, [], 'skill');
  hurt(plain, plain.units.find((u) => u.side === 'hero')!, pn, 100, false, false, [], 'skill');
  const inDuel = hp - nem.hp;
  const outside = hp - pn.hp;
  assert.ok(outside > 0);
  // (and, DUEL-SHOW, softened as every blow in a ring is)
  assert.ok(Math.abs(inDuel - Math.round(Math.round(outside * (1 + VAIN_DUEL)) / (b.duel!.soften ?? 1))) <= 1, `${inDuel} against ${outside}`);
});

test('a win counts as the wave won, with its pay doubled; the nemesis cannot cheat death; every hero heals a fifth', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const m = warMeta(seed);
    const n = member(m.war!, { might: 4 });
    const run = runWith(m, n, ['knight', 'wizard', 'cleric'], 3, seed);
    run.wounds = { [String(heroId(run, 'wizard'))]: REVIVE_SHARE, [String(heroId(run, 'cleric'))]: 0.9 };
    const o = duelOffer(run)!;
    acceptDuel(run, o, heroId(run, 'knight'));
    const { b, tally } = decided(run, o, 'knight', 'won');
    assert.equal(b.phase, 'won');
    const crowns = m.crowns;
    const note = noteWar(m, run, b, tally, true, run.stage);
    assert.equal(note.slain.length, 1, 'slain for good: no cheating death');
    assert.equal(note.slain[0].crowns, 2 * 40 * 4, 'double pay');
    assert.equal(m.crowns - crowns, 2 * 40 * 4);
    assert.equal(note.trophies, 2 * TROPHIES.lieutenant, 'double War Trophies');
    assert.equal(m.war!.fallen[0].how, 'duel');
    assert.ok(!m.war!.members.some((x) => x.id === n.id));
    assert.ok(note.council?.some((l) => /single combat: the wave breaks and runs/.test(l)));
    assert.equal(m.war!.news.find((x) => x.kind === 'duel')?.kind, 'duel');
    // (the run's side: the wave is won, its pay and its next stage, and the heroes healed)
    assert.equal(settleDuelRun(run, b), 'won');
    noteFight(run, b);
    keepCharges(run, b);
    const gold = run.gold;
    finish(run, true, 3);
    assert.ok(run.gold > gold, 'the wave’s pay');
    assert.equal(run.stage, 4);
    assert.deepEqual(run.wounds, { [String(heroId(run, 'wizard'))]: REVIVE_SHARE + DUEL_HEAL });
    assert.equal(run.duel?.out, 'won');
  }
  assert.deepEqual(duelHeal({ a: 0.5, b: 0.85 }), { a: 0.7 });
  assert.equal(duelHeal(undefined), undefined);
  assert.ok(CHEAT_DEATH.on);
});

test('a warchief beaten in a duel is humiliated instead, and flees to his Muster', () => {
  const m = warMeta();
  const n = member(m.war!, { rank: 'warchief', might: 6 });
  const run = runWith(m, n);
  const o = duelOffer(run)!;
  const { b, tally } = decided(run, o, 'knight', 'won');
  const crowns = m.crowns;
  const note = noteWar(m, run, b, tally, true, run.stage);
  assert.equal(note.slain.length, 0);
  assert.equal(m.crowns, crowns);
  const still = m.war!.members.find((x) => x.id === n.id)!;
  assert.ok(still, 'he lives');
  assert.equal(still.shamed, 'knight');
  assert.ok(m.war!.away?.[String(n.id)], 'licking his wounds');
  assert.ok(!m.war!.fallen.some((f) => f.id === n.id));
  assert.ok(note.council?.some((l) => /flees to his Muster/.test(l)));
});

test('a loss wounds the champion to half, and the nemesis fights the wave a Might stronger', () => {
  const m = warMeta();
  const n = member(m.war!, { might: 3 });
  const run = runWith(m, n);
  const o = duelOffer(run)!;
  acceptDuel(run, o, heroId(run, 'knight'));
  const { b, tally } = decided(run, o, 'knight', 'lost');
  assert.equal(duelOutcome(b), 'lost');
  noteWar(m, run, b, tally, false, run.stage);
  assert.equal(m.war!.members.find((x) => x.id === n.id)!.might, 4, 'a Might more in the War');
  assert.equal(settleDuelRun(run, b), 'lost');
  assert.equal(run.wounds?.[String(heroId(run, 'knight'))], REVIVE_SHARE, 'the champion stands again at half');
  assert.equal(run.nemesis!.members[0].might, 4, 'and in the run’s snapshot');
  assert.deepEqual(run.nemesis!.waves['3'], [n.id], 'it fights the wave');
  assert.equal(run.stage, 3, 'the wave is still to fight');
  assert.ok(startStage(run).units.some((u) => u.nem?.id === n.id && u.side === 'foe'), 'with its escorts');
  assert.ok(m.war!.news.some((x) => x.kind === 'duel' && /bests/.test(x.text)));
  assert.ok((m.grudges?.knight?.[String(n.id)] ?? 0) >= 1, 'the champion bears a Grudge on it');
});

test('a timeout is an escape: a Might more, humiliated if under a quarter, and the wave is fought without it', () => {
  for (const [left, shamed] of [[0.5, false], [0.2, true]] as const) {
    const m = warMeta();
    const n = member(m.war!, { might: 2 });
    const run = runWith(m, n);
    const o = duelOffer(run)!;
    const { b, tally } = decided(run, o, 'knight', 'timeout', left);
    assert.equal(duelOutcome(b), 'timeout');
    assert.equal(b.phase, 'lost');
    noteWar(m, run, b, tally, false, run.stage);
    const still = m.war!.members.find((x) => x.id === n.id)!;
    assert.equal(still.might, 3, 'escaped: a Might more');
    assert.ok((still.fled ?? 0) >= 1);
    assert.equal(!!m.war!.away?.[String(n.id)], shamed, shamed ? 'humiliated under a quarter' : 'not humiliated at half');
    settleDuelRun(run, b);
    assert.deepEqual(run.nemesis!.waves['3'], [], 'it left the wave');
    assert.ok(!startStage(run).units.some((u) => u.nem), 'the wave without it');
    assert.equal(run.duel?.out, 'timeout');
  }
});

test('a champion for an open challenge, and the duel played out to its end for real', () => {
  const m = warMeta();
  const n = member(m.war!, { weak: ['dread:archer', 'vain'] });
  const run = runWith(m, n, ['wizard', 'knight', 'cleric']);
  const o = duelOffer(run)!;
  assert.equal(o.why, 'vain');
  assert.equal(o.hero, undefined);
  const champ = championFor(run, o)!;
  assert.ok(run.squad.includes(champ));
  const { b } = duelOf(run, o, run.roster.find((h) => h.id === champ)!.kind);
  assert.ok(['won', 'lost', 'timeout'].includes(duelOutcome(b)!));
  assert.ok(b.t <= duelMs());
});

test('a lost duel is never fought again: its ring has no lives, and the duellist does not rise (TEN-LIVES)', () => {
  const m = warMeta();
  const n = member(m.war!);
  const run = runWith(m, n);
  const { b } = decided(run, duelOffer(run)!, 'knight', 'lost');
  assert.equal(b.lives, undefined);
  assert.equal(b.units.find((u) => u.id === b.duel!.hero)!.alive, false);
  assert.notEqual(b.phase, 'fight');
});

test('the save: the run’s duel round-trips, and nonsense reads as none', () => {
  const m = warMeta();
  const n = member(m.war!);
  const run = runWith(m, n);
  refuseDuel(run, duelOffer(run)!);
  const store = new Map<string, string>();
  const io = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  saveRun(run, io);
  const back = loadRun(io)!;
  assert.deepEqual(back.duel, run.duel);
  assert.equal(back.nemesis?.members[0].mocking, true);
  assert.equal(readRunDuel({ wave: 'x', id: 1, out: 'won' }), undefined);
  assert.equal(readRunDuel({ wave: 3, id: 1, out: 'eaten' }), undefined);
  assert.deepEqual(readRunDuel({ wave: 3, id: 1, out: 'lost', hero: 'nobody' }), { wave: 3, id: 1, out: 'lost' });
  assert.equal(armyById('undead')?.id, 'undead');
});

test('a fight with no duel never reads one: the wave’s fight and its settle are as they were', () => {
  const m = warMeta();
  const n = member(m.war!);
  const run = runWith(m, n);
  const b = startStage(run);
  assert.equal(b.duel, undefined);
  const a = playOut((fight(b), b));
  const c = startStage(structuredClone(run));
  fight(c);
  playOut(c);
  assert.equal(a.t, c.t);
  assert.equal(a.phase, c.phase);
});

test('the challenge’s words: every line in every voice fills, the hero answers, the card says what each outcome means', async () => {
  const { duelTaunt, duelWords, duelBar } = await import('../src/duelRules');
  const { DUEL_LINES } = await import('../src/sim/duelLines');
  const { VOICES } = await import('../src/sim/nemesisLines');
  const m = warMeta();
  const n = member(m.war!);
  for (const v of VOICES) {
    for (const k of ['named', 'open'] as const) assert.ok(DUEL_LINES[k][v].length >= 2, `${k} ${v}`);
    const s = { ...snapOf(n), army: v };
    for (let seed = 1; seed <= 6; seed++) {
      const named = duelTaunt({ id: n.id, wave: 3, why: 'dread', hero: 1, kind: 'knight' }, s, seed);
      assert.doesNotMatch(named.line, /[{}]/);
      assert.match(named.line, /Kwame/);
      assert.ok(named.reply && !/[{}]/.test(named.reply), 'the hero answers');
      assert.equal(named.first, true, 'it plays in full');
      const open = duelTaunt({ id: n.id, wave: 3, why: 'vain' }, s, seed);
      assert.doesNotMatch(open.line, /[{}]/);
      assert.equal(open.hero, undefined);
    }
  }
  const w = duelWords({ id: n.id, wave: 3, why: 'grudge', hero: 1, kind: 'knight' }, snapOf(n));
  assert.match(w.title, /challenges Kwame/);
  assert.match(w.why, /Grudge/);
  assert.match(w.win, /pays double/);
  assert.match(w.refuse, /Mocking/);
  assert.match(duelWords({ id: n.id, wave: 3, why: 'vain' }, snapOf(n)).title, /calls out your champion/);
  assert.match(duelWords({ id: n.id, wave: 3, why: 'vain' }, { ...snapOf(n), rank: 'warchief' }).win, /Muster/);
  assert.equal(duelBar('Morrow', 42_300), 'Morrow · 0:43');
  assert.equal(duelBar('Morrow', -5), 'Morrow · 0:00');
});

test('the bot’s duels are off unless asked for, so every tool plays as before', async () => {
  const { WAR_BOT } = await import('../tools/autoplay');
  assert.equal(WAR_BOT.duels, false);
});

test('the wave card tells of a challenge the next wave will open with', async () => {
  const { duelAhead } = await import('../src/duelRules');
  const m = warMeta();
  const n = member(m.war!);
  const run = runWith(m, n);
  assert.equal(duelAhead(duelOffer(run)!, run.nemesis!.members[0]), 'Ahead: Rattle2 the Bony will call Kwame out to single combat');
});
