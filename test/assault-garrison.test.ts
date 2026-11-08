// ASSAULT-GARRISON (docs/notes/assault-1.md; the design's section 4 and 7.6): 180 at their posts and 20 reinforcements, the posts' rosters,
// the Council filling the leaders' places by rank and Might, the empty places taken by Orc Chieftains, the warchief on the throne when he sits
// and the Warlord when he does not, and no other army's members at the hold.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startAssault } from '../src/sim/assault/assault';
import { councilPlaces, lordOf } from '../src/sim/assault/garrison';
import { assaultInput } from '../src/sim/assault/assaultMode';
import { startedMeta } from '../src/sim/meta';
import { newWar, type Nemesis, type NemSnap } from '../src/sim/nemesis';
import { input } from './assaultKit';

const snap = (id: number, base: string, rank: NemSnap['rank'], might: number): NemSnap => ({ id, base, name: `N${id}`, epithet: 'the Test', rank, might, scars: 0, traits: [], weak: [] });

test('180 stand at their posts as the assault opens, every one asleep', () => {
  const b = startAssault(input());
  const h = b.field!.hold!;
  assert.equal(h.garrison.length, 180);
  assert.equal(h.foesTotal, 200);
  assert.ok(h.posts.every((p) => p.mood === 'posted'));
  assert.equal(b.units.filter((x) => x.side === 'foe').length, 180);
  // (each post's roster as the blueprint's)
  for (const p of h.posts) assert.equal(b.field!.groups[p.group].members.length, p.def.roster.replace(/ /g, '').length, p.def.id);
});

test('the Council fills the leaders\' places by rank, mightiest first; the rest take Orc Chieftains', () => {
  const council = [snap(1, 'orcGrunt', 'lieutenant', 2), snap(2, 'orcArcher', 'lieutenant', 6), snap(3, 'orcBrute', 'captain', 4)];
  const places = councilPlaces(council);
  assert.equal(places.bridge.id, 2, 'the mightiest lieutenant holds the Old Bridge');
  assert.equal(places.drumW.id, 1);
  assert.equal(places.southGate.id, 3, 'the mightiest captain holds the South Gate');
  const b = startAssault(input({ council }));
  const h = b.field!.hold!;
  const leader = (id: string) => b.field!.byId[b.field!.groups[h.posts.find((p) => p.def.id === id)!.group].leader];
  assert.equal(leader('bridge').nem?.id, 2);
  assert.equal(leader('bridge').def, 'orcArcher');
  assert.equal(leader('southGate').nem?.id, 3);
  assert.equal(leader('ironGate').def, 'orcChieftain', 'a captain\'s place the Council cannot fill');
  assert.equal(leader('ironGate').nem, undefined);
  assert.equal(leader('drumE').def, 'orcChieftain');
});

test('the warchief holds the throne when he sits; the Warlord when he does not', () => {
  assert.equal(lordOf('orcs', []).base, 'orcWarlord');
  const chief = snap(9, 'boneCaptain', 'warchief', 7);
  assert.equal(lordOf('orcs', [], chief).base, 'boneCaptain');
  const b = startAssault(input({ warchief: chief }));
  const lord = b.field!.byId[b.field!.hold!.lord];
  assert.equal(lord.def, 'boneCaptain');
  assert.equal(lord.nem?.id, 9);
  assert.ok(lord.phase, 'he changes form at half health');
  const plain = startAssault(input());
  assert.equal(plain.field!.byId[plain.field!.hold!.lord].def, 'orcWarlord');
});

test('only the army\'s own members are at the hold; the warchief comes from wherever he sits', () => {
  const m = startedMeta(3);
  m.party = ['knight', 'samurai', 'archer', 'wizard', 'kunoichi'];
  const war = newWar();
  const mk = (id: number, army: string, rank: Nemesis['rank'], base: string): Nemesis => ({ id, base, army, name: `N${id}`, epithet: 'x', rank, loyalty: 50, might: 3, scars: 0, traits: [], weak: [], known: [], memory: [], met: 0, lost: 0, born: 0 });
  war.members = [mk(1, 'orcs', 'lieutenant', 'orcGrunt'), mk(2, 'undead', 'captain', 'skeleton'), mk(3, 'undead', 'warchief', 'lichKing')];
  m.war = war;
  const i = assaultInput(m, 'orcs', 1);
  assert.deepEqual(i.council!.map((n) => n.id), [1]);
  assert.equal(i.warchief?.id, 3);
});
