// The twenty heroes' third batch's kits (docs/notes/twenty-heroes.md, batch 3): the Astral Sphinx, the Mirage Dancer, the Plague Doctor, the
// Bombardier and the Astrologer, held to the roster's kit rules as the others are (`test/comingKits.ts`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countTraits, HERO_TRAITS, membersOf, traitsOf } from '../src/sim/traits';
import { profileOf } from '../src/sim/stats';
import { ALL_HEROES, COMING_HEROES, UNITS } from '../src/sim/units';
import { comingKitTests } from './comingKits';

comingKitTests('batch 3', ['astralSphinx', 'mirageDancer', 'plagueDoctor', 'bombardier', 'astrologer']);

const BATCH = { astralSphinx: ['arcane', 'beast'], mirageDancer: ['frontier', 'trickster'], plagueDoctor: ['undead', 'arcanist'], bombardier: ['machine', 'gunner'], astrologer: ['royal', 'arcanist'] } as const;

test('batch 3 has joined the roster (docs/notes/heroes-join-2.md): units, traits and scores, in ALL_HEROES and the roster\'s trait members', () => {
  for (const [k, traits] of Object.entries(BATCH)) {
    assert.ok(!COMING_HEROES.includes(k) && ALL_HEROES.includes(k), k);
    assert.equal(UNITS[k].side, 'hero');
    assert.ok(profileOf(k), `${k} has scores`);
    assert.deepEqual([...traitsOf(k)], [...traits], k);
    assert.ok(HERO_TRAITS[k], `${k} is in HERO_TRAITS`);
    for (const t of traits) assert.ok(membersOf(t).includes(k), `${k} is a member of ${t}`);
  }
  // (the beasts are the roster's four and the Astral Sphinx, as test/monster-heroes.test.ts holds)
  assert.equal(membersOf('beast').length, 5);
});

test('in a fight a batch-3 hero counts for its origin and class as a roster hero does', () => {
  // (the Plague Doctor and the Astrologer: two Arcanists)
  assert.ok(countTraits(['plagueDoctor', 'astrologer']).find((c) => c.trait.id === 'arcanist')!.active);
  // (the Bombardier and the Rifle Bot: two Machines, two Gunners)
  const c = countTraits(['bombardier', 'rifleBot']);
  assert.ok(c.find((x) => x.trait.id === 'machine')!.active && c.find((x) => x.trait.id === 'gunner')!.active);
  // (the Mirage Dancer and the Kunoichi: two Tricksters)
  assert.ok(countTraits(['mirageDancer', 'kunoichi']).find((x) => x.trait.id === 'trickster')!.active);
});
