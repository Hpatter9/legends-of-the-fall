// The Nemesis War, phase 3: revenge, trophies and taunts (docs/notes/nemesis-3.md; the design is docs/design/legends-expansion.md, sections
// 2.6 to 2.9): the Grudges and their steps, the Avenger only at Sworn, Vengeance (no cheating death, the bond's points, double pay, its
// scene), humiliation (the runs away, Vengeful, Stitched, the trophy from the first filled slot, two at most, the underlings' loyalty),
// trophies brought home, fleeing (decided by a hash of the moment, never `b.rng`; it walks off and is escaped, not slain), Craven and Vain,
// every taunt template filled from a real memory, the cut-in's lengths and reduced motion, and the save.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { fight, hurt, place, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { bondKey, levelOf } from '../src/sim/bonds';
import { armyRun } from '../src/sim/run';
import { loadMeta, saveMeta, startedMeta, type Meta } from '../src/sim/meta';
import { LAZY, newWar, readGrudges, readWar, SEATS, TROPHY_ATK, nemStats, nemesisBand, type NemSnap, type Nemesis, type War } from '../src/sim/nemesis';
import { startNemesisTally, tallyNemesis, type NemesisTally } from '../src/sim/nemesisLog';
import { CRAVEN_AT, FLEE, fleeOdds, nemFlees, nemHurt, secondWeakPool, weakWords, type UnitNem } from '../src/sim/nemesisTraits';
import { CHEAT_DEATH, noteWar, swear } from '../src/sim/council';
import { addGrudge, avengersOf, AWAY, grudgeOn, HUMBLED_LOYALTY, planRun, reclaimed, trophyFrom, VENGEANCE_BOND } from '../src/sim/revenge';
import { REPLIES, TAUNTS, TRIGGERS, VOICES, type TauntTrigger } from '../src/sim/nemesisLines';
import { cutLength, fill, tauntFor, triggerOf, TAUNT_CUT } from '../src/tauntCutRules';
import { cdOf, HERO_KITS } from '../src/sim/heroKits';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import { SCENES } from '../src/sim/sceneScripts';
import { dueScene } from '../src/sim/sceneRules';
import { vengeanceSceneId } from '../src/sim/vengeanceScenes';

/** A started save with the War open and a party picked. */
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
  const n: Nemesis = { id: war.nextId++, base: 'skeleton', army: 'undead', name: `R${nextName++}`, epithet: '', rank, loyalty: 60, might, scars: 0, traits: ['scarred'], weak: ['dread:knight'], known: [], memory: [], met: 1, lost: 0, born: 0, ...extra };
  war.members.push(n);
  return n;
}
/** A fight with the Knight, the Wizard and the Cleric placed. */
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
const told = (b: Battle, events: BattleEvent[]): NemesisTally => {
  const t = startNemesisTally();
  tallyNemesis(t, events, b.units, 6000);
  return t;
};
const nemOf = (n: Nemesis): UnitNem => ({ id: n.id, name: n.name, rank: n.rank, traits: n.traits, weak: n.weak });

/** A won fight in which a member stood and was slain by `by` (the Knight by default). */
function slay(m: Meta, n: Nemesis, seed = 7, by = 'knight') {
  const b = fightOf([n.base, 'skeleton'], seed);
  if (by !== 'knight' && by !== 'wizard' && by !== 'cleric') {
    const spare = b.units.find((u) => u.side === 'hero' && u.def === 'cleric')!;
    spare.def = by;
  }
  const u = b.units.find((x) => x.side === 'foe' && x.def === n.base)!;
  u.nem = nemOf(n);
  const tally = told(b, [hit(hero(b, by), u, u.maxHp, true)]);
  for (const x of b.units.filter((y) => y.side === 'foe')) {
    x.alive = false;
    x.hp = 0;
  }
  b.phase = 'won';
  return noteWar(m, armyRun(seed, n.army), b, tally, true, 5);
}
/** A lost fight in which a member stood and slew the Knight. */
function slew(m: Meta, n: Nemesis, seed = 7) {
  const b = fightOf([n.base, 'skeleton'], seed);
  const u = b.units.find((x) => x.side === 'foe' && x.def === n.base)!;
  u.nem = nemOf(n);
  const k = hero(b, 'knight');
  const tally = told(b, [hit(u, k, k.maxHp, true)]);
  for (const x of b.units.filter((y) => y.side === 'hero')) {
    x.alive = false;
    x.diedAt = 1000;
  }
  b.phase = 'lost';
  return noteWar(m, armyRun(seed, n.army), b, tally, false, 5);
}
/** Give the Knight a piece in a slot. */
function wear(m: Meta, kind: string, slot: string, id: number, base = 'ironSword'): void {
  (m.equipment ??= []).push({ id, base, rarity: 2, level: 5 });
  ((m.equipped ??= {})[kind] ??= {})[slot as 'main'] = id;
}

CHEAT_DEATH.on = false;

test('a hero slain by a nemesis bears a Grudge on it: +10% against it a step, three steps at most; it is forgotten when the nemesis falls', () => {
  const m = warMeta();
  const n = member(m.war!, 'lieutenant', 2);
  for (let i = 0; i < 4; i++) slew(m, n, 10 + i);
  assert.equal(grudgeOn(m, 'knight', n.id), 3, 'three steps at most');
  assert.equal(grudgeOn(m, 'wizard', n.id), 0);
  // (in the fight: the Knight's blow lands 30% harder on it, the Wizard's as before)
  const rn = planRun(m, armyRun(3, 'undead'));
  const snap: NemSnap = rn?.members.find((s) => s.id === n.id) ?? { id: n.id, base: n.base, name: n.name, epithet: '', rank: n.rank, might: n.might, scars: 0, traits: [], weak: [], grudge: { knight: 0.3 } };
  assert.deepEqual(snap.grudge, { knight: 0.3 });
  const b = fightOf(['skeleton', 'skeleton']);
  const u = b.units.find((x) => x.side === 'foe')!;
  u.nem = { id: n.id, name: 'R', rank: 'lieutenant', traits: [], weak: [], grudge: snap.grudge };
  assert.equal(nemHurt(b, hero(b, 'knight'), u, hero(b, 'knight'), 100, 'blow', false, []), 130);
  assert.equal(nemHurt(b, hero(b, 'wizard'), u, hero(b, 'wizard'), 100, 'blow', false, []), 100);
  slay(m, n, 30);
  assert.equal(grudgeOn(m, 'knight', n.id), 0, 'the Grudge goes with it');
  assert.equal(m.grudges, undefined);
});

test('the Avenger is the slain hero’s partner at Sworn (bond level 3) or more, never at Comrades', () => {
  const m = warMeta();
  const n = member(m.war!, 'lieutenant', 2);
  addGrudge(m, 'knight', n.id);
  m.bonds = { [bondKey('knight', 'peasant')]: 119, [bondKey('knight', 'archer')]: 999 };
  assert.equal(levelOf(m, bondKey('knight', 'peasant')), 2);
  assert.deepEqual(avengersOf(m, n.id), {}, 'Comrades is not enough; a pair that is not kindred stops at Comrades');
  m.bonds[bondKey('knight', 'peasant')] = 120;
  assert.deepEqual(avengersOf(m, n.id), { peasant: 'knight' });
  // (in the fight: +15% on it, and its skills come round 10% quicker while the nemesis stands)
  const b = fightOf(['skeleton', 'skeleton']);
  const u = b.units.find((x) => x.side === 'foe')!;
  const p = hero(b, 'cleric');
  u.nem = { id: n.id, name: 'R', rank: 'lieutenant', traits: [], weak: [], avengers: ['cleric'] };
  assert.equal(nemHurt(b, p, u, p, 100, 'blow', false, []), 115);
  b.phase = 'deploy';
  assert.ok(fight(b));
  assert.ok(p.avenge, 'the Avenger is marked as the fight begins');
  assert.ok(Math.abs(p.avenge!.cd - 1 / 1.1) < 1e-9);
  const slot = HERO_KITS().cleric.slots[0];
  const quick = cdOf(p, slot);
  const was = p.avenge;
  p.avenge = undefined;
  assert.ok(quick <= cdOf(p, slot), 'its cooldown is never longer');
  p.avenge = was;
  // (and once the nemesis has fallen, as before)
  u.hp = 1;
  const k = hero(b, 'knight');
  for (let i = 0; i < 400 && u.alive; i++) stepBattle(b);
  if (!u.alive) assert.equal(p.avenge, undefined);
  void k;
});

test('Vengeance: an Avenger’s killing blow cannot be cheated, pays double, gives the pair 30 bond points and queues its scene', () => {
  CHEAT_DEATH.on = true;
  try {
    for (let s = 0; s < 60; s++) {
      const m = warMeta(s);
      const n = member(m.war!, 'captain', 3, { scars: 3 });
      addGrudge(m, 'knight', n.id);
      m.bonds = { [bondKey('knight', 'peasant')]: 300 };
      const crowns = m.crowns;
      const note = slay(m, n, s + 1, 'peasant');
      assert.ok(!m.war!.members.includes(n), 'never cheated');
      assert.equal(note.slain[0].crowns, 80 * 3 * 2, 'double pay');
      assert.equal(m.crowns - crowns, 80 * 3 * 2);
      assert.equal(note.trophies, 4, 'War Trophies doubled too');
      assert.equal(m.bonds[bondKey('knight', 'peasant')], 300 + VENGEANCE_BOND);
      assert.deepEqual(m.war!.vengeance, ['peasant>knight']);
      assert.ok(m.war!.fallen[0].vengeance);
      assert.ok(note.council?.some((l) => l.startsWith('Vengeance!')));
    }
  } finally {
    CHEAT_DEATH.on = false;
  }
  // (the scene exists for every pair that can reach Sworn, each way round, and is due once)
  const m = warMeta();
  assert.ok(SCENES[vengeanceSceneId('peasant>knight')]);
  assert.equal(dueScene(m, { kind: 'vengeance', pair: 'peasant>knight' }), vengeanceSceneId('peasant>knight'));
});

test('humiliation: a member who cheats death sits out one to three runs, comes back Vengeful, Stitched and with the hero’s trophy', () => {
  CHEAT_DEATH.on = true;
  try {
    let cheats = 0;
    const aways = new Set<number>();
    for (let s = 0; s < 200; s++) {
      const m = warMeta(s);
      const war = m.war!;
      const cap = member(war, 'captain', 4);
      const lt = member(war, 'lieutenant', 2);
      swear(war);
      assert.equal(lt.sworn, cap.id);
      wear(m, 'knight', 'head', 500, 'ironHelm');
      wear(m, 'knight', 'off', 501, 'woodenShield');
      slay(m, cap, s + 1);
      if (!war.members.includes(cap)) continue;
      cheats++;
      const away = war.away?.[String(cap.id)] ?? 0;
      assert.ok(away >= AWAY.min && away <= AWAY.max);
      aways.add(away);
      assert.equal(cap.vengeful, 'knight');
      assert.equal(cap.shamed, 'knight');
      assert.ok(cap.stitched);
      assert.equal(cap.scars, 1, 'the cheat’s scar, once');
      // (the first filled slot of weapon, shield, helm, charm: the shield before the helm)
      assert.deepEqual(cap.trophies?.map((t) => [t.slot, t.item]), [['off', 501]]);
      assert.equal(lt.loyalty, 60 + HUMBLED_LOYALTY);
      // (away: its army's runs go on without it, one counted off each; the last brings it back)
      for (let r = 0; r < away; r++) {
        const rn = planRun(m, armyRun(900 + r, 'undead'));
        assert.ok(!rn?.members.some((x) => x.id === cap.id), 'it sits the run out');
      }
      assert.equal(war.away?.[String(cap.id)], undefined, 'back');
      // (an orc run does not count off a member of the dead)
    }
    assert.ok(cheats > 20 && aways.size === 3, `${cheats} cheats, away ${[...aways]}`);
  } finally {
    CHEAT_DEATH.on = false;
  }
});

test('trophies: two at most, +5% attack each, and slaying the bearer brings them home as Reclaimed, for double pay', () => {
  const m = warMeta();
  const n = member(m.war!, 'lieutenant', 2);
  wear(m, 'knight', 'main', 700);
  wear(m, 'wizard', 'acc', 701, 'luckyCharm');
  n.trophies = [trophyFrom(m, 'knight')!, trophyFrom(m, 'wizard')!];
  assert.deepEqual(n.trophies.map((t) => t.slot), ['main', 'acc']);
  assert.equal(trophyFrom(m, 'cleric'), undefined, 'nothing worn, nothing taken');
  const plain = nemStats({ rank: 'lieutenant', might: 2, scars: 0 }, 1);
  const two = nemStats({ rank: 'lieutenant', might: 2, scars: 0, trophies: n.trophies }, 1);
  assert.ok(Math.abs(two.atk / plain.atk - (1 + 2 * TROPHY_ATK)) < 1e-9);
  const three = nemStats({ rank: 'lieutenant', might: 2, scars: 0, trophies: [...n.trophies, n.trophies[0]] }, 1);
  assert.equal(three.atk, two.atk, 'two at most');
  const note = slay(m, n, 3);
  assert.ok(reclaimed(m, 700) && reclaimed(m, 701));
  assert.equal(note.slain[0].crowns, 40 * 2 * 2);
  assert.equal(m.war!.fallen[0].reclaimed, 2);
});

test('fleeing is decided once a fight by a hash of the moment, never a draw from the fight’s stream; the warchief never flees', () => {
  assert.deepEqual(fleeOdds({ rank: 'warchief', traits: ['elusive'], weak: ['craven'] }), { at: 0, chance: 0 });
  assert.deepEqual(fleeOdds({ rank: 'lieutenant', traits: [], weak: [] }), { at: FLEE.at, chance: FLEE.lieutenant });
  assert.deepEqual(fleeOdds({ rank: 'captain', traits: [], weak: [] }), { at: FLEE.at, chance: FLEE.captain });
  assert.deepEqual(fleeOdds({ rank: 'captain', traits: ['elusive'], weak: [] }), { at: FLEE.at, chance: 1 });
  assert.deepEqual(fleeOdds({ rank: 'captain', traits: [], weak: ['craven'] }), { at: CRAVEN_AT, chance: 1 });
  let ran = 0;
  const N = 600;
  for (let s = 0; s < N; s++) {
    const b = fightOf(['skeleton', 'skeleton'], s);
    const u = b.units.find((x) => x.side === 'foe')!;
    u.nem = { id: 1, name: 'R', rank: 'lieutenant', traits: [], weak: [] };
    const before = JSON.stringify(b.rng);
    u.hp = u.maxHp * 0.5;
    assert.equal(nemFlees(b, u), false, 'not yet hurt enough');
    assert.equal(u.nem.fleeAsked, undefined, 'not asked above its share');
    u.hp = Math.floor(u.maxHp * 0.19);
    const first = nemFlees(b, u);
    assert.equal(JSON.stringify(b.rng), before, 'the fight’s stream is untouched');
    // (asked once: the same answer however often it acts after)
    b.t += 900;
    assert.equal(nemFlees(b, u), first);
    if (first) ran++;
    // (the same moment, the same answer)
    const b2 = fightOf(['skeleton', 'skeleton'], s);
    const u2 = b2.units.find((x) => x.side === 'foe')!;
    u2.nem = { id: 1, name: 'R', rank: 'lieutenant', traits: [], weak: [] };
    u2.hp = u.hp;
    assert.equal(nemFlees(b2, u2), first);
  }
  assert.ok(Math.abs(ran / N - FLEE.lieutenant) < 0.06, `${ran} of ${N}`);
});

test('a fleeing nemesis walks for its own back row and leaves the board: escaped, not slain, and humiliated when no hero fell', () => {
  const m = warMeta();
  const n = member(m.war!, 'lieutenant', 2, { traits: ['elusive'] });
  const b = fightOf([n.base, 'skeleton'], 11);
  b.phase = 'deploy';
  const u = b.units.find((x) => x.side === 'foe' && x.def === n.base)!;
  u.nem = nemOf(n);
  assert.ok(fight(b));
  u.hp = Math.max(1, Math.floor(u.maxHp * 0.15));
  const tally = startNemesisTally();
  let left = false;
  for (let i = 0; i < 2000 && (b.phase as string) === 'fight'; i++) {
    const ev = stepBattle(b);
    tallyNemesis(tally, ev, b.units, b.t);
    if (ev.some((e) => e.kind === 'fade' && e.to === u.id)) left = true;
    // (the heroes are kept standing, so no hero falls)
    for (const h of b.units) if (h.side === 'hero') h.hp = h.maxHp;
    if (left) break;
  }
  assert.ok(left, 'it left the board');
  assert.ok(u.fled && !u.alive);
  for (const x of b.units.filter((y) => y.side === 'foe')) x.alive = false;
  b.phase = 'won';
  const might = n.might;
  const note = noteWar(m, armyRun(11, 'undead'), b, tally, true, 5);
  assert.deepEqual(note.slain, [], 'not slain');
  assert.ok(m.war!.members.includes(n));
  assert.deepEqual(note.fled, [n.id]);
  assert.equal(n.might, might + 1, 'escaped: a Might more');
  assert.ok(m.war!.away?.[String(n.id)], 'no hero fell: humiliated');
  assert.ok(n.memory[0].startsWith('Humiliated'));
});

test('Craven and Vain: in the second weakness’s pool, with their words; Craven flees at 30% for certain', () => {
  const pool = secondWeakPool([]);
  assert.ok(pool.includes('craven') && pool.includes('vain'));
  assert.deepEqual(pool.slice(0, -2), secondWeakPool([]).filter((w) => w !== 'craven' && w !== 'vain'), 'the old pool keeps its order');
  assert.match(weakWords('craven', (k) => k).text, /30%/);
  assert.match(weakWords('vain', (k) => k).name, /Vain/);
  const b = fightOf(['skeleton', 'skeleton']);
  const u = b.units.find((x) => x.side === 'foe')!;
  u.nem = { id: 1, name: 'R', rank: 'captain', traits: [], weak: ['craven'] };
  u.hp = Math.floor(u.maxHp * 0.29);
  assert.ok(nemFlees(b, u));
  // (the reader keeps them)
  const war = readWar({ members: [{ id: 1, base: 'skeleton', army: 'undead', name: 'C', rank: 'lieutenant', weak: ['dread:knight', 'craven'], known: ['craven'] }], fallen: [], news: [] })!;
  assert.deepEqual(war.members[0].weak, ['dread:knight', 'craven']);
});

/** A snapshot that brings a trigger out of its memory, with the Knight on the board (and the Peasant as its Avenger). */
function snapFor(t: TauntTrigger, army: string): NemSnap {
  const s: NemSnap = { id: 4, base: 'skeleton', name: 'Morrow', epithet: 'the Unburnt', rank: 'captain', might: 3, scars: 1, traits: [], weak: [], army, met: 3 };
  if (t === 'trophy') s.trophies = [{ kind: 'knight', slot: 'off', item: 1, base: 'woodenShield', rarity: 2 }];
  if (t === 'humiliated') s.shamed = 'knight';
  if (t === 'avenger') s.avengers = { peasant: 'knight' };
  if (t === 'slew') s.slew = ['knight'];
  if (t === 'dread') s.weak = ['dread:knight'];
  if (t === 'maimed') s.maimed = ['knight'];
  if (t === 'escaped') s.fled = 2;
  if (t === 'warchief') s.rank = 'warchief';
  return s;
}

test('every taunt template fills from a real memory, in every voice; the hero it names answers', () => {
  const field = ['knight', 'peasant', 'cleric'];
  for (const t of TRIGGERS)
    for (const v of VOICES) {
      const s = snapFor(t, v);
      const pick = triggerOf(s, field);
      assert.equal(pick.trigger, t, `${t} in the ${v} voice`);
      assert.equal(TAUNTS[t][v].length >= 2, true);
      for (const line of TAUNTS[t][v]) {
        const done = fill(line, { name: s.name, ...(pick.hero ? { hero: 'Kwame', kind: 'Knight' } : {}), ...(pick.trophy ? { trophy: 'shield' } : {}), ...(pick.fallen ? { fallen: 'Kwame' } : {}) });
        assert.ok(!/[{}]/.test(done), `${t}/${v}: "${line}" left a place unfilled`);
      }
      // (and through the whole making: over many runs every line comes up)
      const seen = new Set<string>();
      for (let seed = 0; seed < 60; seed++) {
        const taunt = tauntFor(s, field, seed);
        assert.ok(!/[{}]/.test(taunt.line) && !/[{}]/.test(taunt.reply ?? ''));
        if (pick.hero) assert.equal(taunt.hero, pick.hero === 'knight' || pick.hero === 'peasant' ? pick.hero : taunt.hero);
        seen.add(taunt.line);
      }
      assert.equal(seen.size, TAUNTS[t][v].length, `${t}/${v}: every line comes up`);
    }
  // (a memory of a hero not on the board is not taunted with: it falls back to what the nemesis is)
  assert.equal(triggerOf(snapFor('slew', 'orcs'), ['cleric']).trigger, 'meet');
  // (every hero has two replies, plain and personal)
  for (const k of ALL_HEROES) assert.equal(REPLIES[k]?.length, 2, `${k}'s replies`);
});

test('the cut-in: full 2.5 s, short the name plate, off none; a first meeting and a Vain nemesis play in full; reduced motion holds it still', () => {
  assert.deepEqual(cutLength('full', { first: false, vain: false }), { ms: TAUNT_CUT.FULL_MS, full: true });
  assert.deepEqual(cutLength('short', { first: false, vain: false }), { ms: TAUNT_CUT.SHORT_MS, full: false });
  assert.deepEqual(cutLength('short', { first: true, vain: false }), { ms: TAUNT_CUT.FULL_MS, full: true });
  assert.deepEqual(cutLength('short', { first: false, vain: true }), { ms: TAUNT_CUT.FULL_MS, full: true });
  assert.equal(cutLength('off', { first: true, vain: true }).ms, 0);
  assert.equal(TAUNT_CUT.SKIP_AFTER_MS, 600);
  assert.ok(tauntFor({ ...snapFor('meet', 'orcs'), met: 1 }, [], 1).first);
  assert.ok(!tauntFor({ ...snapFor('meet', 'orcs'), met: 1, seen: true }, [], 1).first);
  const css = readFileSync('src/nemesis.css', 'utf8');
  assert.match(css, /\.tcCut\.still \.tcBand \{ animation: tcFade/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.tcBand \{ animation: tcFade/);
  assert.ok(!/infinite/.test(css.slice(css.indexOf('.tcLayer'))), 'nothing in the cut-in loops');
});

test('a run’s snapshot carries the Grudges, Avengers, trophies, Stitched and the taunts’ makings into the fight', () => {
  const m = warMeta();
  const n = member(m.war!, 'captain', 3, { stitched: true, maimed: ['wizard'], fled: 1, shamed: 'cleric' });
  wear(m, 'knight', 'main', 800);
  n.trophies = [trophyFrom(m, 'knight')!];
  addGrudge(m, 'knight', n.id);
  m.bonds = { [bondKey('knight', 'peasant')]: 300 };
  let rn = planRun(m, armyRun(1, 'undead'));
  for (let s = 2; !rn?.members.length && s < 60; s++) rn = planRun(m, armyRun(s, 'undead'));
  const s = rn!.members.find((x) => x.id === n.id)!;
  assert.deepEqual(s.grudge, { knight: 0.1 });
  assert.deepEqual(s.avengers, { peasant: 'knight' });
  assert.ok(s.stitched);
  assert.deepEqual(s.slew, ['knight']);
  assert.deepEqual([s.maimed, s.fled, s.shamed, s.army], [['wizard'], 1, 'cleric', 'undead']);
  const wave = Number(Object.keys(rn!.waves).find((w) => rn!.waves[w].includes(n.id)));
  const placed = nemesisBand(rn, wave, ['skeleton', 'skeleton', 'skeleton', 'skeleton'], 1).place[0].nem;
  assert.deepEqual([placed.grudge, placed.avengers, placed.stitched, placed.trophies?.length], [{ knight: 0.1 }, ['peasant'], true, 1]);
});

test('Stitched stands again once at 20%, and is spent when it does', () => {
  const m = warMeta();
  const n = member(m.war!, 'lieutenant', 2, { stitched: true, traits: [] });
  const b = fightOf([n.base, 'skeleton'], 4);
  const u = b.units.find((x) => x.side === 'foe' && x.def === n.base)!;
  u.nem = { ...nemOf(n), stitched: true };
  const out: BattleEvent[] = [];
  // (a killing blow: it stands again at a fifth)
  const knight = hero(b, 'knight');
  const tally = startNemesisTally();
  for (let i = 0; i < 2 && u.alive; i++) {
    const ev: BattleEvent[] = [];
    hurt(b, knight, u, u.hp + 1, false, false, ev);
    out.push(...ev);
    if (i === 0) {
      assert.ok(u.alive, 'stood again');
      assert.equal(u.hp, Math.round(u.maxHp * 0.2));
    }
  }
  assert.ok(!u.alive, 'once only');
  tallyNemesis(tally, out, b.units, 1000);
  // (it lives through the fight on its Stitched life, and has spent it)
  const m2 = warMeta();
  const n2 = member(m2.war!, 'lieutenant', 2, { stitched: true, traits: [] });
  const b2 = fightOf([n2.base, 'skeleton'], 4);
  const u2 = b2.units.find((x) => x.side === 'foe' && x.def === n2.base)!;
  u2.nem = { ...nemOf(n2), stitched: true, stood: true };
  b2.phase = 'lost';
  noteWar(m2, armyRun(4, 'undead'), b2, startNemesisTally(), false, 5);
  assert.equal(n2.stitched, undefined);
});

test('the save: trophies, the members away, the pieces reclaimed, the Vengeance waiting and the Grudges round-trip, within their caps', () => {
  const m = warMeta();
  const n = member(m.war!, 'captain', 4, { stitched: true, maimed: ['wizard'], fled: 2, shamed: 'cleric', seen: true });
  wear(m, 'knight', 'main', 900);
  n.trophies = [trophyFrom(m, 'knight')!];
  m.war!.away = { [String(n.id)]: 2 };
  m.war!.reclaimed = [5, 6];
  m.war!.vengeance = ['peasant>knight'];
  addGrudge(m, 'knight', n.id);
  const store: Record<string, string> = {};
  saveMeta(m, { setItem: (k, v) => void (store[k] = v) });
  const back = loadMeta(1, { getItem: (k) => store[k] ?? null });
  assert.deepEqual(back.war, m.war);
  assert.deepEqual(back.grudges, m.grudges);
  // (the readers hold the caps)
  const odd = readWar({ members: [{ id: 1, base: 'skeleton', army: 'undead', name: 'X', rank: 'lieutenant', trophies: [{ kind: 'knight', slot: 'main', item: 1, base: 'a' }, { kind: 'knight', slot: 'off', item: 2, base: 'b' }, { kind: 'knight', slot: 'head', item: 3, base: 'c' }, { kind: 'nobody', slot: 'main', item: 4, base: 'd' }] }], away: { 1: 9, 77: 1 }, vengeance: ['peasant>knight', 'bad', 'x>y'], fallen: [], news: [] })!;
  assert.equal(odd.members[0].trophies?.length, 2);
  assert.deepEqual(odd.away, { 1: 3 });
  assert.deepEqual(odd.vengeance, ['peasant>knight']);
  assert.deepEqual(readGrudges({ knight: { 1: 9, x: 1 }, nobody: { 1: 1 } }), { knight: { 1: 3 } });
  assert.equal(SEATS.captain, 4);
  void UNITS;
});

test('the death-spiral guard: a nemesis that has won three meetings in a row feasts instead of growing, about half the time', () => {
  let lazy = 0;
  const N = 200;
  for (let s = 0; s < N; s++) {
    const m = warMeta(s);
    const n = member(m.war!, 'lieutenant', 4, { streak: 2 });
    const might = n.might;
    const note = slew(m, n, s + 1);
    assert.equal(n.streak, 3);
    if (note.lazy?.includes(n.id)) {
      lazy++;
      assert.equal(n.might, might, 'no promotion');
      assert.equal(n.loyalty, 75, 'a Feast');
      assert.match(n.memory[0], /fat and lazy/);
    } else assert.equal(n.might, might + 1);
  }
  assert.ok(Math.abs(lazy / N - LAZY.chance) < 0.08, `${lazy} of ${N}`);
  // (two wins in a row: it grows as ever)
  const m = warMeta(1);
  const n = member(m.war!, 'lieutenant', 4, { streak: 1 });
  slew(m, n, 9);
  assert.equal(n.might, 5);
});

test('a warchief is Stitched once a seat holding: a second cheat does not stitch him again until he is crowned anew', () => {
  CHEAT_DEATH.on = true;
  try {
    let twice = 0;
    for (let s = 0; s < 400 && !twice; s++) {
      const m = warMeta(s);
      const chief = member(m.war!, 'warchief', 5);
      slay(m, chief, s + 1);
      if (!m.war!.members.includes(chief)) continue;
      assert.ok(chief.stitched && chief.chiefStitch);
      delete chief.stitched;
      for (let r = 2; r < 40; r++) {
        slay(m, chief, s * 100 + r);
        if (!m.war!.members.includes(chief)) break;
        assert.equal(chief.stitched, undefined, 'not stitched again while he holds the seat');
        twice++;
        break;
      }
    }
    assert.ok(twice > 0, 'a second cheat was seen');
  } finally {
    CHEAT_DEATH.on = false;
  }
});
