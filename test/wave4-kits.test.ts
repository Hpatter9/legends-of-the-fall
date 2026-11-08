// The twenty heroes' fourth batch's kits (docs/notes/twenty-heroes.md, batch 4): the Inquisitor, the Seraph, the Corsair Surgeon, the
// Harpooner and the Sea Reaver, held to the roster's kit rules as the others are (`test/comingKits.ts`); and the Corsair Surgeon's revive face on
// skill 2, as the four roster healers' are (`test/revive.test.ts`). The Seraph is a guardian, not a healer (docs/notes/twenty-heroes-review.md):
// she neither heals nor raises.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, startBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX } from '../src/sim/abilities';
import { castHero, heroKitOf, reviveReady } from '../src/sim/heroKits';
import { REVIVE } from '../src/sim/kits/revive';
import { countTraits, HERO_TRAITS, membersOf, traitsOf } from '../src/sim/traits';
import { profileOf } from '../src/sim/stats';
import { ALL_HEROES, COMING_HEROES, UNITS } from '../src/sim/units';
import { comingKitTests } from './comingKits';

comingKitTests('batch 4', ['inquisitor', 'seraph', 'corsairSurgeon', 'harpooner', 'seaReaver']);

const BATCH = { inquisitor: ['holy', 'arcanist'], seraph: ['holy', 'guardian'], corsairSurgeon: ['pirate', 'support'], harpooner: ['pirate', 'gunner'], seaReaver: ['pirate', 'vanguard'] } as const;

test('batch 4 has joined the roster (docs/notes/heroes-join-2.md): units, traits and scores, in ALL_HEROES and the roster\'s trait members', () => {
  for (const [k, traits] of Object.entries(BATCH)) {
    assert.ok(!COMING_HEROES.includes(k) && ALL_HEROES.includes(k), k);
    assert.equal(UNITS[k].side, 'hero');
    assert.ok(profileOf(k), `${k} has scores`);
    assert.deepEqual([...traitsOf(k)], [...traits], k);
    assert.ok(HERO_TRAITS[k], `${k} is in HERO_TRAITS`);
    for (const t of traits) assert.ok(membersOf(t).includes(k), `${k} is a member of ${t}`);
  }
  // (none wait now: all twenty have joined)
  assert.equal(COMING_HEROES.length, 0);
});

test('in a fight a batch-4 hero counts for its origin and class as a roster hero does', () => {
  // (the Corsair Surgeon, the Harpooner and the Sea Reaver with the Buccaneer and the Kraken: five Pirates, the trait awake)
  const pirates = countTraits(['corsairSurgeon', 'harpooner', 'seaReaver', 'buccaneer', 'kraken']).find((c) => c.trait.id === 'pirate')!;
  assert.equal(pirates.count, 5);
  assert.ok(pirates.active);
  // (the Seraph and the Knight: two Guardians)
  assert.ok(countTraits(['seraph', 'knight']).find((c) => c.trait.id === 'guardian')!.active);
});

function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  return b;
}

test('the Corsair Surgeon raises the nearest fallen friend at 30% with his skill 2\'s revive face, as the roster\'s healers do', () => {
  for (const [h, name] of [['corsairSurgeon', 'Revive: Smelling Salts']] as const) {
    const b = arena();
    const me = addUnit(b, h, 3, 9, { level: 10 });
    assert.ok(heroKitOf(me)!.s2.revive, `${h} has a revive face on skill 2`);
    const near = addUnit(b, 'knight', 3, 8, { level: 30 });
    const far = addUnit(b, 'archer', 7, 9, { level: 30 });
    addUnit(b, 'skeleton', 3, 1);
    for (const x of [near, far]) {
      x.hp = 0;
      x.alive = false;
      x.diedAt = b.t;
    }
    me.charge = CHARGE_MAX;
    assert.ok(reviveReady(b, me), h);
    const out: BattleEvent[] = [];
    castHero(b, me, heroKitOf(me)!, out);
    const rev = out.find((e) => e.kind === 'revive');
    assert.ok(rev && rev.kind === 'revive' && rev.to === near.id && rev.by === me.id, `${h}: the nearest first`);
    assert.ok(out.some((e) => e.kind === 'skill' && e.name === name), `${h}: ${name}`);
    assert.ok(near.alive && !far.alive);
    assert.equal(near.hp, Math.round(near.maxHp * REVIVE.SHARE));
  }
  // (and one below level 10, whose skill 2 is not open, raises no one)
  const b = arena();
  const me: Unit = addUnit(b, 'corsairSurgeon', 3, 9);
  const x = addUnit(b, 'knight', 3, 8);
  x.hp = 0;
  x.alive = false;
  assert.ok(!reviveReady(b, me));
});

test('the Seraph holds the line as a guardian: no revive face, and none of her skills or her ultimate heals', () => {
  const b = arena();
  const me = addUnit(b, 'seraph', 3, 9, { level: 30 });
  const hk = heroKitOf(me)!;
  assert.ok(!hk.s2.revive);
  assert.ok(hk.slots.every((s) => !s.heals));
  const x = addUnit(b, 'knight', 3, 8, { level: 30 });
  x.hp = 0;
  x.alive = false;
  x.diedAt = b.t;
  assert.ok(!reviveReady(b, me));
});
