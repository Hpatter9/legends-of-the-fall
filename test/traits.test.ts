import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { fight, place, startBattle, stepBattle, type Battle } from '../src/sim/battle';
import { rollCrit } from '../src/sim/abilities';
import { speedOf } from '../src/sim/spells';
import { ALL_HEROES } from '../src/sim/units';
import { countTraits, HERO_TRAITS, membersOf, TRAITS, traitEffects } from '../src/sim/traits';

const spots = (b: Battle) => {
  const out: [number, number][] = [];
  for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) out.push([u, v]);
  return out;
};
const started = (kinds: string[]): Battle => {
  const b = startBattle(3);
  const s = spots(b);
  kinds.forEach((k, i) => place(b, k, ...s[i * 2]));
  fight(b);
  return b;
};
const hero = (b: Battle, kind: string) => b.units.find((x) => x.def === kind)!;

test('every hero has an origin and a class, and every trait has two to four heroes', () => {
  for (const k of ALL_HEROES) {
    const [o, c] = HERO_TRAITS[k];
    assert.equal(TRAITS[o].kind, 'origin');
    assert.equal(TRAITS[c].kind, 'class');
  }
  for (const t of Object.keys(TRAITS)) {
    const n = membersOf(t).length;
    assert.ok(n >= 2 && n <= 4, `${t} has ${n}`);
  }
});

test('only distinct kinds count, and a trait unlocks at its thresholds', () => {
  const find = (kinds: string[], id: string) => countTraits(kinds).find((c) => c.trait.id === id);
  assert.equal(find(['knight', 'knight', 'knight'], 'guardian')!.count, 1);
  assert.ok(!find(['knight', 'knight'], 'guardian')!.active);
  assert.ok(find(['knight', 'peasant'], 'guardian')!.active);
  assert.equal(find(['samurai', 'kunoichi'], 'samurai')!.tier, 0);
  assert.equal(find(['samurai', 'kunoichi', 'archer'], 'samurai')!.tier, 0);
  assert.equal(find(['samurai', 'kunoichi', 'archer', 'ninjaMonk'], 'samurai')!.tier, 1);
  assert.equal(find(['samurai'], 'samurai')!.goal, 2);
  assert.deepEqual(traitEffects(['knight']), {});
});

test('each trait bonus applies to the heroes in the fight', () => {
  // Samurai: attack
  assert.equal(hero(started(['samurai', 'kunoichi']), 'samurai').power, TRAITS.samurai.tiers[0].effects.atk);
  assert.equal(hero(started(['samurai', 'kunoichi', 'archer', 'ninjaMonk']), 'samurai').power, TRAITS.samurai.tiers[1].effects.atk);
  // Knightly: health
  const k = hero(started(['knight', 'peasant']), 'knight');
  assert.ok(k.maxHp > 380 && k.hp === k.maxHp);
  // Mystic: the king's mana
  assert.equal(started(['wizard', 'wanderer']).spells.rate, TRAITS.mystic.tiers[0].effects.mana);
  assert.equal(started(['wizard']).spells.rate, 1);
  // Trickster: speed, for heroes only
  const t = started(['kunoichi', 'kitsune']);
  assert.equal(speedOf(t, hero(t, 'kunoichi')), TRAITS.trickster.tiers[0].effects.speed);
  assert.equal(speedOf(t, t.units.find((x) => x.side === 'foe')!), 1);
  // Blade: crit, for a hero with no crit of its own
  const bl = started(['samurai', 'ninjaMonk']);
  const monk = hero(bl, 'ninjaMonk');
  let crits = 0;
  for (let i = 0; i < 400; i++) if (rollCrit(bl, monk) > 1) crits++;
  assert.ok(crits > 10 && crits < 90, `${crits} crits`);
  const none = started(['ninjaMonk']);
  for (let i = 0; i < 100; i++) assert.equal(rollCrit(none, hero(none, 'ninjaMonk')), 1);
  // Caster: skill charge over time
  const c = started(['wizard', 'wanderer']);
  const plain = started(['wizard']);
  stepBattle(c);
  stepBattle(plain);
  assert.ok(hero(c, 'wizard').charge > hero(plain, 'wizard').charge);
});

test('Guardian cuts damage taken and Yokai slips blows', () => {
  assert.equal(started(['knight', 'peasant']).traits!.guard, TRAITS.guardian.tiers[0].effects.guard);
  assert.equal(started(['kitsune', 'karasu']).traits!.dodge, TRAITS.yokai.tiers[0].effects.dodge);
});

test('Marksman lengthens a shooter\'s reach from height, and the traits are fixed at the start of the fight', async () => {
  const { strikeDef } = await import('../src/sim/battle');
  const m = started(['archer', 'lightningMage']);
  assert.ok(strikeDef(m, hero(m, 'archer')).heightReach! > 1.4);
  assert.equal(strikeDef(m, m.units.find((x) => x.side === 'foe')!).heightReach, undefined);
  const lone = started(['archer']);
  assert.equal(strikeDef(lone, hero(lone, 'archer')).heightReach, 1.4);
  const before = hero(m, 'archer').power;
  place(m, 'knight', 0, D - 1);
  assert.equal(hero(m, 'archer').power, before);
});
