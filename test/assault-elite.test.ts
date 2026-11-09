// ASSAULT-ELITE (docs/notes/assault-3.md; the design's 6.3, phase 3): every kind's trick is half again as strong for an Elite (six marks
// or more). The Gunners' pierce and the Battlemages' splash take it as the others did in phase 1; the Skirmishers' flank, a step with no
// number of its own, is sharpened instead: an Elite's blow from a foe's side or back lands a fifth harder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fieldHooks, wayTo, type Battle, type Unit } from '../src/sim/battle';
import { ALL_HEROES } from '../src/sim/units';
import { ELITE_TRICK, kindOfUnit, troopOf, TRICKS, type TroopKind } from '../src/sim/assault/troops';
import { quiet } from './assaultKit';

/** A party of five whose first platoon is of `kind`, with its first soldier at `marks`. */
function withKind(kind: TroopKind, marks: number): { b: Battle; me: Unit } {
  const lead = ALL_HEROES.find((k) => troopOf(k) === kind)!;
  assert.ok(lead, `a hero leads ${kind}`);
  const party = [lead, ...['knight', 'samurai', 'archer', 'wizard', 'dragoon'].filter((k) => k !== lead)].slice(0, 5);
  const troops = Object.fromEntries(party.map((k) => [k, Array(10).fill(0)]));
  troops[lead][0] = marks;
  const b = quiet({ heroes: party.map((k) => ({ kind: k, boost: {}, level: 55 })), troops, approaches: Object.fromEntries(party.map((k) => [k, 'bridge'])) });
  const pl = b.field!.hold!.platoons[0];
  const me = b.field!.byId[pl.soldiers[0].id];
  assert.equal(kindOfUnit(me.def), kind);
  return { b, me };
}

test('an Elite gunner\'s shot pierces half again as much armour as a recruit\'s', () => {
  const r = withKind('gunners', 0);
  const e = withKind('gunners', 6);
  assert.equal(fieldHooks.pierce!(r.b, r.me), TRICKS.pierce);
  assert.equal(fieldHooks.pierce!(e.b, e.me), TRICKS.pierce * ELITE_TRICK);
});

test('an Elite battlemage\'s fire splashes half again as hard; a recruit\'s and the other kinds\' as before', () => {
  const r = withKind('battlemages', 0);
  const e = withKind('battlemages', 6);
  assert.equal(fieldHooks.splash!(r.b, r.me), 1);
  assert.equal(fieldHooks.splash!(e.b, e.me), ELITE_TRICK);
  const g = withKind('gunners', 6);
  assert.equal(fieldHooks.splash!(g.b, g.me), 1);
});

test('an Elite skirmisher\'s blow from a foe\'s back lands a fifth harder; from its front, or a recruit\'s, as before', () => {
  for (const marks of [0, 6]) {
    const { b, me } = withKind('skirmishers', marks);
    const foe = b.units.find((x) => x.side === 'foe' && x.alive)!;
    // (the foe beside the skirmisher, facing it, then facing away)
    foe.u = me.u + 1;
    foe.v = me.v;
    foe.facing = wayTo(foe, me);
    const front = fieldHooks.blow!(b, me, foe);
    foe.facing = wayTo(me, foe);
    const back = fieldHooks.blow!(b, me, foe);
    assert.ok(Math.abs(back / front - (marks >= 6 ? TRICKS.flank : 1)) < 1e-9, `${marks} marks: ${back / front}`);
  }
});
