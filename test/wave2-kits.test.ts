// The twenty heroes' second batch's kits (docs/notes/twenty-heroes.md, batch 2): the War Drummer, the Banneret, the Geomancer, the Bell Warden
// and the Falconer, held to the roster's kit rules as the Vampires are (`test/comingKits.ts`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countTraits, HERO_TRAITS, membersOf, traitsOf } from '../src/sim/traits';
import { profileOf } from '../src/sim/stats';
import { ALL_HEROES, COMING_HEROES, UNITS } from '../src/sim/units';
import { comingKitTests } from './comingKits';

comingKitTests('batch 2', ['warDrummer', 'banneret', 'geomancer', 'bellWarden', 'falconer']);

const BATCH = { warDrummer: ['samurai', 'support'], banneret: ['knightly', 'warden'], geomancer: ['mystic', 'bulwark'], bellWarden: ['yokai', 'bulwark'], falconer: ['wild', 'marksman'] } as const;

test('batch 2: four have joined the roster and the Banneret still waits; units, traits and scores for all five', () => {
  for (const [k, traits] of Object.entries(BATCH)) {
    const joined = k !== 'banneret';
    assert.equal(ALL_HEROES.includes(k), joined, k);
    assert.equal(COMING_HEROES.includes(k), !joined, k);
    assert.equal(UNITS[k].side, 'hero');
    assert.ok(profileOf(k), `${k} has scores`);
    assert.deepEqual([...traitsOf(k)], [...traits], k);
    assert.equal(!!HERO_TRAITS[k], joined, k);
    for (const t of traits) assert.equal(membersOf(t).includes(k), joined, `${k} and ${t}`);
  }
});

test('in a fight a batch-2 hero counts for its origin and class as a roster hero does', () => {
  // (the War Drummer and the Samurai: two Samurai)
  assert.ok(countTraits(['warDrummer', 'samurai']).find((c) => c.trait.id === 'samurai')!.active);
  // (the Banneret and the Cleric: two Wardens)
  assert.ok(countTraits(['banneret', 'cleric']).find((c) => c.trait.id === 'warden')!.active);
  // (the Geomancer and the Bell Warden: two Bulwarks)
  assert.equal(countTraits(['geomancer', 'bellWarden']).find((c) => c.trait.id === 'bulwark')!.count, 2);
});
