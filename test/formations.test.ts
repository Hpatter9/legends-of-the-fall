import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { fight, place, startBattle, stepBattle, type Battle, type Unit } from '../src/sim/battle';
import { DEPLOY_ROWS } from '../src/sim/board';
import { FORM, formationAc, formationBlow, formationFacing, formationMelee, formationMove, formationOf, formationSpots, formationSplash, FORMATIONS_LIST, setFormations, shapeFits } from '../src/sim/formations';
import { shortLine, shortTag } from '../src/sim/tacticPick';
import { roleOf } from '../src/sim/suggest';

// The party's formations (docs/notes/tactics.md, batch 4): a shape on the deploy rows read as the fight begins, each with a small bonus and
// a weak point, counted only where the fight has them on.

/** A fight on bare level ground with `party` placed at `spots` (front row 0, back row 2, as columns and rows of the deploy rows). */
function staged(party: string[], spots: [number, number][], on = true, seed = 11): Battle {
  const b = bareBoard(startBattle(seed, 'skeletons'));
  const front = b.board.d - DEPLOY_ROWS;
  party.forEach((k, i) => place(b, k, spots[i][0], front + spots[i][1]));
  setFormations(b, on);
  return b;
}
const unit = (b: Battle, kind: string): Unit => b.units.find((u) => u.def === kind)!;
const ending = (b: Battle) => JSON.stringify({ phase: b.phase, t: b.t, units: b.units.map((u) => [u.def, u.hp, u.u, u.v]) });

test('the shapes are read from where the heroes stand: a wall needs two front-liners, a spearhead a tip and two wings', () => {
  const d = 11;
  const at = (kind: string, u: number, dv: number, id: number) => ({ id, kind, u, v: d - DEPLOY_ROWS + dv });
  // (Knight, Minotaur and Samurai side by side on the front row: a wall, its ends the Knight and the Samurai)
  const wall = formationOf(d, [at('knight', 2, 0, 1), at('minotaur', 3, 0, 2), at('samurai', 4, 0, 3), at('archer', 3, 2, 4)]);
  assert.equal(wall?.kind, 'wall');
  assert.deepEqual(wall?.ends, [1, 3]);
  // (one front-liner is not a wall: the Knight between two strikers)
  assert.notEqual(formationOf(d, [at('samurai', 2, 0, 1), at('knight', 3, 0, 2), at('kunoichi', 4, 0, 3)])?.kind, 'wall');
  const spear = formationOf(d, [at('samurai', 3, 0, 1), at('knight', 2, 1, 2), at('minotaur', 4, 1, 3), at('archer', 3, 2, 4)]);
  assert.equal(spear?.kind, 'spear');
  assert.equal(spear?.tip, 1);
  // (the Archer and the Cleric on the back row with friends either side and the Knight and Minotaur ahead: a square, both inside)
  const square = formationOf(d, [at('knight', 3, 0, 1), at('minotaur', 4, 0, 2), at('samurai', 2, 1, 3), at('kunoichi', 5, 1, 4), at('archer', 3, 2, 5), at('cleric', 4, 2, 6)]);
  assert.equal(square?.kind, 'square');
  assert.deepEqual(square?.inside, [5, 6]);
  const skirmish = formationOf(d, [at('knight', 1, 0, 1), at('samurai', 5, 0, 2), at('kunoichi', 3, 1, 3), at('archer', 0, 2, 4), at('wizard', 6, 2, 5)]);
  assert.equal(skirmish?.kind, 'skirmish');
  // (two touching heroes and no other shape: Loose)
  assert.equal(formationOf(d, [at('knight', 1, 0, 1), at('samurai', 2, 0, 2), at('archer', 6, 2, 3), at('wizard', 0, 2, 4)]), undefined);
});

test('the formations count only where the fight has them on: off, a fight plays exactly as it did', () => {
  const party = ['knight', 'minotaur', 'samurai', 'archer'];
  const spots: [number, number][] = [[2, 0], [3, 0], [4, 0], [3, 2]];
  const off = staged(party, spots, false);
  const none = bareBoard(startBattle(11, 'skeletons'));
  party.forEach((k, i) => place(none, k, spots[i][0], none.board.d - DEPLOY_ROWS + spots[i][1]));
  fight(off);
  fight(none);
  assert.equal(off.formation, undefined);
  while (off.phase === 'fight') stepBattle(off);
  while (none.phase === 'fight') stepBattle(none);
  assert.equal(ending(off), ending(none));
  // (on: the wall is read, and the same seed gives the same fight)
  const a = staged(party, spots);
  const c = staged(party, spots);
  fight(a);
  fight(c);
  assert.equal(a.formation?.kind, 'wall');
  while (a.phase === 'fight') stepBattle(a);
  while (c.phase === 'fight') stepBattle(c);
  assert.equal(ending(a), ending(c));
});

test('the Shield Wall: +1 AC while a friend of the wall stands beside; its ends are struck from behind from their outer side', () => {
  const b = staged(['knight', 'minotaur', 'samurai', 'archer'], [[2, 0], [3, 0], [4, 0], [3, 2]]);
  fight(b);
  const [knight, minotaur, samurai, archer] = ['knight', 'minotaur', 'samurai', 'archer'].map((k) => unit(b, k));
  assert.equal(formationAc(b, minotaur), FORM.WALL_AC);
  assert.equal(formationAc(b, archer), 0);
  minotaur.alive = false;
  assert.equal(formationAc(b, knight), 0, 'the Knight stands alone once the Minotaur falls');
  const foe = b.units.find((u) => u.side === 'foe')!;
  foe.u = knight.u - 1;
  foe.v = knight.v;
  assert.equal(formationFacing(b, foe, knight, 1), 1, 'struck from its outer side: as from behind');
  foe.u = samurai.u + 1;
  foe.v = samurai.v;
  assert.equal(formationFacing(b, foe, samurai, 3), 3);
  foe.u = samurai.u;
  foe.v = samurai.v - 1;
  assert.equal(formationFacing(b, foe, samurai, 2), samurai.facing, 'from the front: its own facing');
});

test('the Spearhead: the tip and wings march quicker for 6 s, the tip strikes its first blow harder once, and stands at -1 AC', () => {
  const b = staged(['samurai', 'knight', 'minotaur', 'archer'], [[3, 0], [2, 1], [4, 1], [3, 2]]);
  fight(b);
  const [tip, wing, archer] = ['samurai', 'knight', 'archer'].map((k) => unit(b, k));
  assert.equal(formationMove(b, wing), FORM.SPEAR_MOVE);
  assert.equal(formationMove(b, archer), 1);
  assert.equal(formationAc(b, tip), FORM.TIP_AC);
  assert.equal(formationBlow(b, tip), FORM.TIP_BLOW);
  assert.equal(formationBlow(b, tip), 1, 'only the first blow');
  b.t = FORM.SPEAR_MS + 100;
  assert.equal(formationMove(b, wing), 1);
});

test('the Hollow Square guards its back-liner from the side while two friends stand round it; the square takes more splash, skirmishers less', () => {
  const b = staged(['knight', 'minotaur', 'samurai', 'kunoichi', 'archer', 'cleric'], [[3, 0], [4, 0], [2, 1], [5, 1], [3, 2], [4, 2]]);
  fight(b);
  assert.equal(b.formation?.kind, 'square');
  const archer = unit(b, 'archer');
  const foe = b.units.find((u) => u.side === 'foe')!;
  assert.equal(formationFacing(b, foe, archer, 1), 3, 'any blow counts as from the front');
  assert.equal(formationSplash(b, archer), FORM.SQUARE_SPLASH);
  unit(b, 'samurai').alive = false;
  assert.equal(formationFacing(b, foe, archer, 1), archer.facing, 'one friend left: the square is broken');
  const s = staged(['knight', 'samurai', 'kunoichi', 'archer', 'wizard'], [[1, 0], [5, 0], [3, 1], [0, 2], [6, 2]]);
  fight(s);
  assert.equal(s.formation?.kind, 'skirmish');
  assert.equal(formationSplash(s, unit(s, 'wizard')), FORM.SKIRMISH_SPLASH);
});

test('Arrange: a party set out at formationSpots stands in that shape', () => {
  const party = ['knight', 'minotaur', 'samurai', 'archer', 'cleric'];
  for (const shape of FORMATIONS_LIST) {
    const b = bareBoard(startBattle(11, 'skeletons'));
    const spots = formationSpots(b.board, party, shape);
    assert.equal(spots.filter(Boolean).length, party.length, shape);
    assert.equal(new Set(spots.map((s) => `${s.u},${s.v}`)).size, party.length, `${shape}: one tile each`);
    party.forEach((k, i) => assert.ok(place(b, k, spots[i].u, spots[i].v), `${shape}: ${k} placed`));
    const read = formationOf(b.board.d, b.units.filter((u) => u.side === 'hero').map((u) => ({ id: u.id, kind: u.def, u: u.u, v: u.v })));
    assert.equal(read?.kind, shape, shape);
  }
});

test('the tuned shapes (batch 6): the wall takes less from melee blows, the square is armoured while packed, the skirmish takes less from skills', () => {
  const w = staged(['knight', 'minotaur', 'samurai', 'archer'], [[2, 0], [3, 0], [4, 0], [3, 2]]);
  fight(w);
  assert.equal(formationMelee(w, unit(w, 'minotaur')), FORM.WALL_MELEE);
  assert.equal(formationMelee(w, unit(w, 'archer')), 1);
  const q = staged(['knight', 'minotaur', 'samurai', 'kunoichi', 'archer', 'cleric'], [[3, 0], [4, 0], [2, 1], [5, 1], [3, 2], [4, 2]]);
  fight(q);
  assert.equal(formationAc(q, unit(q, 'archer')), FORM.SQUARE_AC);
  const k = staged(['knight', 'samurai', 'kunoichi', 'archer', 'wizard'], [[1, 0], [5, 0], [3, 1], [0, 2], [6, 2]]);
  fight(k);
  assert.equal(formationSplash(k, unit(k, 'wizard'), true), FORM.SKIRMISH_SKILL);
  // (the spearhead's wings strike their first blow harder too)
  const s = staged(['samurai', 'knight', 'minotaur', 'archer'], [[3, 0], [2, 1], [4, 1], [3, 2]]);
  fight(s);
  assert.equal(formationBlow(s, unit(s, 'knight')), FORM.WING_BLOW);
});

test('BATTLE-FEEL round 3: shapeFits says whether a party can make a shape, and the words say so when it cannot', () => {
  const b = bareBoard(startBattle(11, 'skeletons'));
  // (the Arrange test's party makes every shape)
  for (const shape of FORMATIONS_LIST) assert.equal(shapeFits(b.board, ['knight', 'minotaur', 'samurai', 'archer', 'cleric'], shape), true, shape);
  // (shooters and casters alone have no front-liners for a wall)
  const back = ['archer', 'wizard', 'cleric', 'gunslinger', 'warlock'];
  assert.equal(back.filter((k) => roleOf(k) === 'front').length, 0);
  assert.equal(shapeFits(b.board, back, 'wall'), false);
  // (three heroes cannot skirmish: it takes four)
  assert.equal(shapeFits(b.board, ['knight', 'archer', 'cleric'], 'skirmish'), false);
  assert.equal(shapeFits(b.board, [], 'wall'), false);
  assert.equal(shortLine('wall'), 'Not enough for a Shield Wall: fighting loose.');
  assert.equal(shortLine('wall', 'square'), 'Not enough for a Shield Wall: standing in a Hollow Square.');
  assert.equal(shortTag('wall'), 'No Wall');
});
