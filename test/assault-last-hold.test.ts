// ASSAULT-LAST-HOLD (docs/notes/assault-5.md; the design's 1.4 and phase 5): the last hold standing is where the warchief makes his last
// stand with every Council member left, and its fall ends the Dark Council and the War.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startAssault } from '../src/sim/assault/assault';
import { assaultInput, settleAssault } from '../src/sim/assault/assaultMode';
import { councilPlaces, HOLD_SHARE, LAST_SHARE, lordOf, shareOf, sparesOf } from '../src/sim/assault/garrison';
import { endLine, isLastHold, lastCouncil, warOver } from '../src/sim/assault/lastHold';
import { holdPages } from '../src/sim/assault/holdCodex';
import { HOLDS } from '../src/sim/assault/holds';
import { orderPlatoon } from '../src/sim/assault/platoons';
import { ARMIES } from '../src/sim/armies';
import { stepBattle, type Battle } from '../src/sim/battle';
import { councilTurn, recruit } from '../src/sim/council';
import { newWar, readWar, snapOf, type Nemesis } from '../src/sim/nemesis';
import { startedMeta, type Meta } from '../src/sim/meta';
import { Rng } from '../src/sim/rng';
import { dueScene } from '../src/sim/sceneRules';
import { SCENES } from '../src/sim/sceneScripts';
import { WAR_END_SCENE, warEndScene } from '../src/sim/warEndScene';
import { fell, PARTY, steps } from './assaultKit';

const mk = (id: number, army: string, rank: Nemesis['rank'], might: number, base = 'orcBrute'): Nemesis => ({ id, base, army, name: `N${id}`, epithet: 'the Test', rank, loyalty: 50, might, scars: 0, traits: [], weak: [], known: [], memory: [], met: 0, lost: 0, born: 0 });

/** A save with every army open and every hold but the Golems' conquered, and a full Council born of many armies (two of it away). */
function lastSave(): Meta {
  const m = startedMeta(11);
  m.opened = ARMIES.map((a) => a.id).slice(1);
  m.party = [...PARTY];
  m.assault = { v: 1, troops: {}, conquered: Object.fromEntries(ARMIES.filter((a) => a.id !== 'golems').map((a) => [a.id, { day: 20261101, tier: 3, wins: 1 }])), tries: { golems: 2 } };
  m.war = newWar();
  m.war.members.push(mk(1, 'orcs', 'warchief', 8, 'orcWarlord'));
  ['undead', 'beasts', 'golems', 'ogres'].forEach((a, i) => m.war!.members.push(mk(2 + i, a, 'captain', 6 - i)));
  ['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'infernal', 'yokai', 'golems'].forEach((a, i) => m.war!.members.push(mk(10 + i, a, 'lieutenant', 1 + (i % 4))));
  m.war.away = { '11': 2, '3': 1 };
  m.war.nextId = 30;
  return m;
}

test('the Last Hold: the one hold still standing when every other army\'s has fallen', () => {
  const m = lastSave();
  assert.ok(isLastHold(m, 'golems'));
  assert.ok(!isLastHold(m, 'orcs'), 'a conquered hold is not');
  delete m.assault!.conquered.yokai;
  assert.ok(!isLastHold(m, 'golems') && !isLastHold(m, 'yokai'), 'two still stand');
  assert.ok(!isLastHold(startedMeta(1), 'orcs'));
  // (every army has a hold, so the last of them is always one)
  assert.ok(ARMIES.every((a) => !!HOLDS[a.id]));
});

test('the whole Council left defends the Last Hold, of any army and away or not; the warchief cannot flee it', () => {
  const m = lastSave();
  const input = assaultInput(m, 'golems', 5);
  assert.equal(input.last, true);
  assert.equal(input.flightTo, undefined, 'nowhere to ride');
  assert.equal(input.warchief?.id, 1);
  assert.deepEqual(input.council!.map((s) => s.id).sort((a, b) => a - b), lastCouncil(m.war).map((n) => n.id).sort((a, b) => a - b));
  assert.equal(input.council!.length, 12, 'four captains and eight lieutenants, the two away among them');
  // (a hold that is not the last takes only its own army's members, and none away)
  delete m.assault!.conquered.yokai;
  const plain = assaultInput(m, 'golems', 5);
  assert.equal(plain.last, undefined);
  assert.deepEqual(plain.council!.map((s) => s.id), [4, 17]);
  // (the Warband regrouped at a conquered hold is never the Last Hold)
  assert.equal(assaultInput(lastSave(), 'orcs', 5, { approaches: {}, restorm: true }).last, undefined);
});

test('at the Last Hold every member stands on the field: the posts\' officers\' places, and the rest at the throne beside the lord', () => {
  const m = lastSave();
  const input = assaultInput(m, 'golems', 5);
  const council = input.council!;
  const places = councilPlaces(council, input.warchief);
  const spares = sparesOf(HOLDS.golems.posts, council, places, lordOf('golems', council, input.warchief).snap);
  assert.equal(spares.length, 2, 'six lieutenants\' posts for eight lieutenants');
  assert.ok(spares.every((s) => s.rank === 'lieutenant'));
  const b = startAssault(input);
  const f = b.field!;
  const h = f.hold!;
  const nems = h.garrison.map((id) => f.byId[id].nem?.id).filter((x): x is number => x !== undefined);
  assert.deepEqual([...nems].sort((a, b) => a - b), [1, ...council.map((s) => s.id)].sort((a, b) => a - b), 'each once');
  const throne = h.posts.find((p) => p.def.id === 'throne')!;
  const atThrone = f.groups[throne.group].members.map((id) => f.byId[id].nem?.id);
  for (const s of spares) assert.ok(atThrone.includes(s.id), `${s.name} guards the throne`);
  // (the garrison keeps its numbers: the spares take rank and file places)
  const normal = startAssault({ ...input, last: undefined, council: [] });
  assert.equal(h.garrison.length, normal.field!.hold!.garrison.length);
  // (its rank and file stand at the Last Hold's share of the hold's own)
  assert.equal(shareOf(input), HOLD_SHARE.golems * LAST_SHARE.golems);
  assert.equal(shareOf({ army: 'golems' }), HOLD_SHARE.golems);
});

/** The Last Hold stormed and won: the warchief and two captains felled on their posts, the host held back at the Landing. */
function wonLastHold(m: Meta): Battle {
  const b = startAssault(assaultInput(m, 'golems', 5));
  const f = b.field!;
  const h = f.hold!;
  h.platoons.forEach((_p, k) => orderPlatoon(b, k, { kind: 'hold', at: { u: 0, v: 0 } }));
  stepBattle(b);
  for (const id of h.garrison) if ([1, 2, 3].includes(f.byId[id].nem?.id ?? -1)) fell(b, id);
  steps(b, 400);
  assert.equal(h.outcome, 'won');
  return b;
}

test('the Last Hold\'s fall ends the War: the slain die for good, the rest are scattered, the Council takes no more turns and names no one', () => {
  const m = lastSave();
  const b = wonLastHold(m);
  const r = settleAssault(m, b, 20261109);
  assert.ok(r.won && r.first && r.last && r.warEnded);
  const end = m.war!.end!;
  assert.ok(end && warOver(m.war));
  assert.equal(end.army, 'golems');
  assert.equal(end.tries, 3);
  assert.deepEqual(end.chief, { name: 'N1 the Test', base: 'orcWarlord', warchief: true });
  assert.deepEqual(end.slain, ['N1 the Test', 'N2 the Test', 'N3 the Test'], 'mightiest first, none cheating death');
  assert.equal(end.scattered.length, 10);
  assert.equal(m.war!.members.length, 0, 'the seats burn');
  assert.equal(m.war!.away, undefined);
  assert.ok(m.war!.fallen.some((x) => x.id === 1), 'the warchief is among the Fallen');
  assert.ok(r.news.some((l) => /The Dark Council is broken/.test(l)), r.news.join(' | '));
  assert.ok(r.news.some((l) => /10 of the Council live through it/.test(l)));
  assert.equal(m.war!.news[0].text, 'The Dark Council is broken. Its seats burn, and the War is over');
  // (the Council is no more)
  assert.equal(councilTurn(m, 'visit', 20261110), null);
  assert.equal(councilTurn(m, 'run', 20261110), null);
  assert.equal(recruit(m.war!, m, new Rng(1)), undefined);
  // (the ending is kept in the save, and the hold's codex page and the War's record say so)
  const back = readWar(JSON.parse(JSON.stringify(m.war)))!;
  assert.deepEqual(back.end, end);
  const page = holdPages(m).find((p) => p.army === 'golems')!;
  assert.ok(page.record.includes(endLine(end)), page.record);
  assert.match(endLine(end), /The War ended at Iron Foundry, the Last Hold, in 3 assaults: N1 the Test fell on its throne with 2 of the Council/);
  // (and its scene waits at the camp, once, with the warchief who fell)
  assert.equal(dueScene(m, { kind: 'warEnd' }), WAR_END_SCENE);
  assert.ok(SCENES[WAR_END_SCENE]);
  const film = warEndScene(end, 'forge');
  assert.equal(film.cast.chief.role, 'unit:orcWarlord');
  assert.equal(film.cast.chief.name, 'N1 the Test');
  assert.equal(film.shots[0].look, 'forge');
});

test('a Last Hold lost ends nothing; the codex calls a standing Last Hold so; a hold that is not the last never ends the War', () => {
  const m = lastSave();
  const b = startAssault(assaultInput(m, 'golems', 6));
  b.field!.hold!.outcome = 'lost';
  const r = settleAssault(m, b, 20261109);
  assert.ok(!r.warEnded && r.last);
  assert.equal(m.war!.end, undefined);
  assert.equal(m.war!.members.length, 13);
  assert.match(holdPages(m).find((p) => p.army === 'golems')!.record, /It is the Last Hold/);
  // (a hold won that is not the last: the War goes on)
  const n = lastSave();
  delete n.assault!.conquered.yokai;
  const w = startAssault(assaultInput(n, 'golems', 5));
  const f = w.field!;
  w.field!.hold!.platoons.forEach((_p, k) => orderPlatoon(w, k, { kind: 'hold', at: { u: 0, v: 0 } }));
  stepBattle(w);
  fell(w, f.hold!.lord);
  steps(w, 400);
  const r2 = settleAssault(n, w, 20261109);
  assert.ok(r2.won && !r2.warEnded && !r2.last);
  assert.equal(n.war!.end, undefined);
  assert.ok(n.war!.members.length > 0);
  // (a snapshot of a member still reads as before)
  assert.equal(snapOf(n.war!.members[0]).id, n.war!.members[0].id);
});
