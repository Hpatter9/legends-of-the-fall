// HORN-GIFT (docs/notes/horn-gift.md): the War Horn is given at the first binding, full, and does not exist (nor fill) before it. Older
// saves: one with an Eidolon bound keeps the horn; one with none keeps its stored fill, hidden and untouched.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordOf } from '../src/sim/armies';
import { loadMeta, startedMeta, type Meta } from '../src/sim/meta';
import { addHorn, bindEidolon, blowHorn, HORN_FULL, hornGain, hornHeld, hornOf, hornReady, readEidolons } from '../src/sim/warHorn';
import { beginChain, bindChain } from '../src/sim/eidolonChains';
import { chainById } from '../src/sim/eidolonChainData';
import { revealCard } from '../src/sim/sceneReveal';
import { hornLine } from '../src/eidolonRules';

const readyAskel = (seed: number): Meta => {
  const m = startedMeta(seed);
  m.armies.orcs = { ...recordOf(m, 'orcs'), clears: 1 };
  beginChain(m, 'askel');
  m.quests!.chains!.askel = { part: 3, progress: 0 };
  m.quests!.pieces = ['emberHeart', 'kennelCollar', 'kennelBell'];
  return m;
};

test('before the first binding the horn is not held and nothing fills it: no gain, no wave-card line, no card', () => {
  const m = startedMeta(3);
  assert.equal(hornHeld(m), false);
  const boss = hornGain({ won: true, boss: 'boss', foes: 30 });
  assert.equal(boss, 130);
  const add = addHorn(m, boss);
  assert.deepEqual(add, { added: 0, fill: 0, filled: false, wasFull: false });
  assert.equal(hornLine(add), undefined, 'the wave card has no horn line');
  assert.equal(m.eidolons, undefined, 'nothing is written to the save');
  assert.equal(hornReady(m), false);
  assert.equal(revealCard({ kind: 'horn' }, m), null);
});

test("Askel's binding gives the War Horn, full, so it can be blown in the next fight; its card says so", () => {
  const m = readyAskel(4);
  assert.equal(hornHeld(m), false);
  assert.ok(bindChain(m, 'askel'));
  assert.ok(hornHeld(m));
  assert.equal(hornOf(m), HORN_FULL);
  assert.ok(hornReady(m), 'Askel answers it at once');
  const card = revealCard({ kind: 'horn' }, m)!;
  assert.equal(card.label, 'Received');
  assert.equal(card.name, 'The War Horn');
  assert.equal(card.art.kind, 'horn');
  assert.match(card.line, /boss wave/);
  assert.match(card.line, /full now: blow it in your next fight/);
  assert.match(card.where, /In battle.*spell orbs.*camp/);
  assert.equal(card.go, undefined, 'Continue only');
  // (blown, it fills again from the fights as before)
  assert.ok(blowHorn(m));
  assert.equal(addHorn(m, 100).added, 100);
  assert.doesNotMatch(revealCard({ kind: 'horn' }, m)!.line, /full now/);
});

test('only the first binding gives the horn full: a later one leaves the fill as it is', () => {
  const m = startedMeta(5);
  bindEidolon(m, 'askel');
  assert.equal(hornOf(m), HORN_FULL);
  blowHorn(m);
  addHorn(m, 120);
  bindEidolon(m, 'nivra');
  assert.equal(hornOf(m), 120);
});

test("the binding's story hands the horn over after the seal: the Summoner gives it, Askel fills it", () => {
  const beats = chainById('askel')!.binding!;
  const horn = beats.find((b) => b.beat === 'horn')!;
  const full = beats.find((b) => b.beat === 'hornFull')!;
  assert.equal(horn.who, 'summoner');
  assert.match(horn.text!, /War Horn of the first kings/);
  assert.equal(full.who, 'eidolon');
  assert.match(full.text!, /next fight/);
  assert.ok(beats.findIndex((b) => b.beat === 'bound') < beats.indexOf(horn));
  // (British spelling, the game's voice: nothing American slipped in)
  for (const b of beats) if (b.text) assert.doesNotMatch(b.text, /\b(color|honor|armor|center)\b/i);
});

test('older saves: a stored fill with none bound is kept hidden and untouched; one with an Eidolon bound keeps the horn', () => {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) };
  const old = startedMeta(6) as Meta & { eidolons?: unknown };
  old.eidolons = { horn: 640 };
  store.set('legends.meta', JSON.stringify(old));
  const a = loadMeta(6);
  assert.equal(hornOf(a), 640, 'the stored fill is kept');
  assert.equal(hornHeld(a), false, 'but the horn is not shown');
  assert.equal(addHorn(a, 300).added, 0);
  assert.equal(hornOf(a), 640);
  // (bound later, the horn is given full whatever was stored)
  bindEidolon(a, 'askel');
  assert.equal(hornOf(a), HORN_FULL);

  const bound = readEidolons({ horn: 300, bound: ['askel'] })!;
  const b = { eidolons: bound };
  assert.ok(hornHeld(b), 'a save with an Eidolon bound keeps the horn');
  assert.equal(addHorn(b, 100).fill, 400, 'and it fills as before');
});

test('the dev flag (all six bound) holds a full horn', () => {
  const m = startedMeta(7);
  for (const id of ['askel', 'nivra', 'aurelan', 'voltara', 'gorm', 'vaelkhar']) bindEidolon(m, id);
  addHorn(m, HORN_FULL);
  assert.ok(hornReady(m));
});
