// A quest battle's own rules (QUESTS-3, Q5): protect, survive, race, spare and the mutators; each rule's win and its loss, and every
// fight without rules played out the same, tick for tick.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { fight, place, startBattle, stepBattle, type Battle, type BattleEvent } from '../src/sim/battle';
import { applyRules, ruleEnd, type QuestRules } from '../src/sim/questRules';
import { questStartGold } from '../src/sim/questRun';
import { QUEST_BATTLES } from '../src/sim/questBattles';
import { UNITS } from '../src/sim/units';

/** A fight under `rules`: `heroes` placed in order, `band` the foes; `tweak` may change the units before it starts. */
function begin(rules: QuestRules | undefined, heroes: string[], band = 'skeletons', tweak?: (b: Battle) => void): Battle {
  const b = startBattle(4, band, rules ? { rules } : {});
  const spots: [number, number][] = [];
  for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  heroes.forEach((k, i) => assert.ok(place(b, k, ...spots[(i * 3) % spots.length], i + 1), `place ${k}`));
  tweak?.(b);
  assert.ok(fight(b));
  return b;
}
/** Step to the end (or 400 seconds); returns every event. */
function run(b: Battle, maxTicks = 4000): BattleEvent[] {
  const all: BattleEvent[] = [];
  for (let i = 0; i < maxTicks && b.phase === 'fight'; i++) all.push(...stepBattle(b));
  return all;
}
const strong = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];

test('every guest is a summon of the heroes\' side, so it never counts as one of the party', () => {
  for (const k of ['guestCarter', 'guestPilgrim', 'guestBosun', 'guestEnvoy', 'guestPrisoner']) {
    assert.ok(UNITS[k].summon && UNITS[k].side === 'hero', k);
  }
});

test('protect: the guest fights beside the heroes, the fight is won with it standing, and lost the moment it falls', () => {
  const won = begin({ protect: { kind: 'guestCarter', hp: 400 } }, strong, 'skeletons', (b) => void b);
  assert.ok(won.guard !== undefined, 'the guest stood up as the fight began');
  const guest = won.units.find((u) => u.id === won.guard)!;
  assert.equal(guest.side, 'hero');
  run(won);
  assert.equal(won.phase, 'won');
  assert.ok(won.units.find((u) => u.id === won.guard)!.alive);
  // (a frail guest: the foes reach it and the fight is lost, though the heroes still stand)
  const lost = begin({ protect: { kind: 'guestCarter', hp: 0.001 } }, strong);
  const events = run(lost);
  assert.equal(lost.phase, 'lost');
  assert.ok(lost.units.some((u) => u.side === 'hero' && u.alive && u.def !== 'guestCarter'), 'the heroes were still standing');
  assert.deepEqual(events.filter((e) => e.kind === 'end'), [{ kind: 'end', won: false }]);
});

test('survive: no boss to fell: won when the clock runs out with a hero standing, lost if the heroes fall first', () => {
  const b = begin({ survive: 3 }, strong, 'skeletons', (x) => x.units.filter((u) => u.side === 'foe').forEach((u) => ((u.hp = u.maxHp = 1e9))));
  run(b);
  assert.equal(b.phase, 'won');
  assert.ok(b.t >= 3000 && b.t < 3300, `won at ${b.t} ms`);
  assert.ok(b.units.some((u) => u.side === 'foe' && u.alive), 'the foes were not felled');
  const lost = begin({ survive: 500 }, ['peasant'], 'skeletons', (x) => x.units.filter((u) => u.side === 'foe').forEach((u) => ((u.hp = u.maxHp = 1e9, u.power = 50))));
  run(lost);
  assert.equal(lost.phase, 'lost');
});

test('race: every foe must fall within the seconds, or the fight is lost', () => {
  const slow = begin({ race: 1 }, strong);
  run(slow);
  assert.equal(slow.phase, 'lost');
  assert.ok(slow.t >= 1000 && slow.t < 1200);
  const quick = begin({ race: 300 }, strong);
  run(quick);
  assert.equal(quick.phase, 'won');
});

test('spare: a spared foe falling loses the fight; it is won when every other foe has fallen, the spared one standing', () => {
  const kind = 'skeleton';
  const probe = begin(undefined, strong);
  const spared = probe.units.find((u) => u.side === 'foe')!.def;
  void kind;
  const ok = begin({ spare: spared }, strong, 'skeletons', (b) => {
    // (the first of that kind is the one spared: made too sturdy for the heroes to fell, the rest are as they were)
    const first = b.units.find((u) => u.side === 'foe' && u.def === spared)!;
    first.hp = first.maxHp = 1e9;
    for (const u of b.units) if (u.side === 'foe' && u !== first && u.def === spared) u.alive = false;
  });
  run(ok);
  // (every other foe of the band fell; the spared one is still standing)
  assert.equal(ok.phase, 'won');
  assert.ok(ok.units.some((u) => u.side === 'foe' && u.def === spared && u.alive));
  const bad = begin({ spare: spared }, strong);
  run(bad);
  assert.equal(bad.phase, 'lost', 'the heroes felled it');
});

test('mutators: foes hasten, no healing, no hearts and a smaller purse', () => {
  const b = begin({ hasten: 0.25, noHeal: true }, strong);
  assert.equal(b.foeSpeed, 1.25);
  assert.equal(b.heroHeal, 0);
  const qb = QUEST_BATTLES[0];
  const plainGold = questStartGold(qb);
  assert.equal(questStartGold({ ...qb, rules: { purse: 0.5 } }), Math.round(plainGold * 0.5));
  assert.equal(questStartGold({ ...qb, rules: {} }), plainGold);
});

test('no rules set: a fight plays out tick for tick as it did, and an empty set of rules changes nothing', () => {
  const plain = begin(undefined, strong);
  const same = begin(undefined, strong);
  const empty = begin({}, strong);
  const a = run(plain);
  assert.deepEqual(run(same), a, 'the same fight twice');
  const c = run(empty);
  assert.deepEqual(c, a, 'rules with nothing set');
  assert.equal(plain.t, empty.t);
  assert.equal(plain.rules, undefined);
  assert.equal(ruleEnd(plain, true), null);
  // (and the rules are applied only by the fight's start)
  const b = startBattle(4, 'skeletons');
  applyRules(b, { hasten: 0.5 });
  assert.equal(b.foeSpeed, 1.5);
});
