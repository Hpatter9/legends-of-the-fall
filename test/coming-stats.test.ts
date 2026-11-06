// The twenty coming heroes' unit numbers (docs/notes/twenty-heroes-review.md): each sits inside the spread of the roster heroes of its class
// (health, attack, defence, walk, blow time and damage a second), so a new hero is no stronger, faster or busier than its class.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMING_HERO_TRAITS, COMING_TRAITS, HERO_TRAITS, TRAITS } from '../src/sim/traits';
import { ALL_HEROES, COMING_HEROES, TWENTY_HEROES, UNITS } from '../src/sim/units';
import { KITS } from '../src/sim/abilities';
import { twentyHeroKits as comingHeroKits, twentyKits as comingKits } from '../src/sim/kits/coming';

const ORIGINAL = ALL_HEROES.filter((h) => !TWENTY_HEROES.includes(h));
const classOf = (k: string): string => (HERO_TRAITS[k] ?? COMING_HERO_TRAITS[k])[1];
const KEYS = ['hp', 'atk', 'def', 'moveMs', 'atkMs', 'dps'] as const;
const value = (k: string, key: (typeof KEYS)[number]): number => (key === 'dps' ? (UNITS[k].atk * 1000) / UNITS[k].atkMs : UNITS[k][key]);

test("each coming hero's numbers sit inside its class's roster spread", () => {
  for (const k of TWENTY_HEROES) {
    const peers = ORIGINAL.filter((h) => classOf(h) === classOf(k));
    assert.ok(peers.length >= 2, `${k}: ${classOf(k)} has roster peers`);
    for (const key of KEYS) {
      const vs = peers.map((h) => value(h, key));
      const v = value(k, key);
      assert.ok(v >= Math.min(...vs) - 1e-9 && v <= Math.max(...vs) + 1e-9, `${k} ${key} ${v.toFixed(1)} (${classOf(k)}: ${Math.min(...vs).toFixed(1)} to ${Math.max(...vs).toFixed(1)})`);
    }
  }
});

test('a shooter class keeps its shooters, and a melee class its melee: the twenty change no class\'s reach', () => {
  for (const k of TWENTY_HEROES) {
    const peers = ORIGINAL.filter((h) => classOf(h) === classOf(k));
    const ranges = peers.map((h) => UNITS[h].range);
    assert.ok(UNITS[k].range >= Math.min(...ranges) && UNITS[k].range <= Math.max(...ranges), `${k} range ${UNITS[k].range}`);
  }
});

/** A passive's effects, without its words. */
const effects = (p: object): Record<string, unknown> => Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'name' && k !== 'text'));

test('each coming passive does one thing, as the roster\'s do, and none is a roster passive or another coming one over again', () => {
  const seen = new Map(ORIGINAL.map((h) => [JSON.stringify(effects(KITS[h].passive)), h]));
  const names = new Set(ORIGINAL.map((h) => KITS[h].passive.name));
  for (const k of TWENTY_HEROES) {
    const p = comingKits()[k].passive;
    assert.equal(Object.keys(effects(p)).length, 1, `${k}: ${p.name} has one effect`);
    const key = JSON.stringify(effects(p));
    assert.ok(!seen.has(key), `${k}: ${p.name} is ${seen.get(key)}'s passive over again`);
    assert.ok(!names.has(p.name), `${k}: ${p.name} is its own name`);
    seen.set(key, k);
    names.add(p.name);
  }
});

test("slot 3 follows the roster's mix: mostly jabs, a few guards and utilities, and never a heavy", () => {
  const cls = TWENTY_HEROES.map((k) => comingHeroKits()[k].slots[2].cls);
  assert.ok(!cls.includes('heavy'), 'no heavy in slot 3');
  assert.ok(cls.filter((c) => c === 'jab').length >= 12, `jabs: ${cls.filter((c) => c === 'jab').length}`);
  assert.ok(cls.filter((c) => c === 'utility').length <= 3, `utilities: ${cls.filter((c) => c === 'utility').length}`);
});

test('with the twenty joined, every trait has two to five heroes (the owner\'s call), and no trait gains a tier for its fifth', () => {
  const all = [...ALL_HEROES, ...COMING_HEROES];
  for (const t of [...Object.keys(TRAITS), ...Object.keys(COMING_TRAITS)]) {
    const n = all.filter((k) => classOf(k) === t || (HERO_TRAITS[k] ?? COMING_HERO_TRAITS[k])[0] === t).length;
    assert.ok(n >= 2 && n <= 5, `${t} has ${n}`);
  }
  // (the Vampire origin keeps its tier at five, decision 2)
  for (const t of Object.values(TRAITS)) assert.ok(t.tiers.every((x) => x.need <= 4 || t.id === 'vampire'), `${t.id}: no tier at five`);
});
