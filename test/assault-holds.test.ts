// ASSAULT-HOLDS (docs/notes/assault-3.md; the design's phase 3): the codex has a page for each army's hold. A built hold has its name, its
// lord, its defences counted from its blueprint, the player's record there and how it is won; one not built yet is a locked line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defendersOf, holdPages } from '../src/sim/assault/holdCodex';
import { BLOODTUSK } from '../src/sim/assault/maps/orcs';
import { holdName } from '../src/sim/assault/warAnswer';
import { ARMIES } from '../src/sim/armies';
import { newWar, type Nemesis } from '../src/sim/nemesis';
import { startedMeta } from '../src/sim/meta';
import { UNITS } from '../src/sim/units';

test('a page for every army\'s hold, in order: the holds built so far, the others locked', () => {
  const m = startedMeta(2);
  const pages = holdPages(m);
  assert.deepEqual(pages.map((p) => p.army), ARMIES.map((a) => a.id));
  const orcs = pages[0];
  assert.ok(orcs.built);
  assert.equal(orcs.name, 'Bloodtusk Hold');
  assert.equal(holdName('orcs'), 'Bloodtusk Hold');
  const d = defendersOf(BLOODTUSK);
  assert.equal(d.posted + d.bands, 200, 'the design\'s garrison of 200');
  assert.ok(orcs.facts.some((f) => f.startsWith(`200 defenders: ${d.posted} at`)));
  assert.equal(orcs.record, 'Not yet stormed');
  assert.ok(orcs.facts.some((f) => f.includes('The Iron Gate')));
  assert.ok(orcs.facts.some((f) => /^3 war drums$/.test(f)));
  assert.ok(orcs.tips.length >= 4);
  assert.ok(orcs.facts[0].includes('Orc Warlord'), 'no warchief sits: the Warlord');
  // (phase 4 builds the holds one at a time: the Barrow Necropolis, the Howling Den, Elder Root, the Heart of the Maze and Bonefire Crag are built, the rest are locked lines)
  assert.ok(pages[1].built && pages[1].name === 'Barrow Necropolis');
  assert.ok(pages[1].facts.some((f) => /^3 bone-bell belfries$/.test(f)));
  assert.ok(pages[2].built && pages[2].name === 'Howling Den');
  assert.ok(pages[3].built && pages[3].name === 'Elder Root');
  assert.ok(pages[4].built && pages[4].name === 'Heart of the Maze');
  assert.ok(pages[5].built && pages[5].name === 'Bonefire Crag');
  for (const p of pages.slice(6)) assert.ok(!p.built && p.facts.length === 0 && !p.record.includes('undefined'));
  // (no fighter of the Assault is loaded for the page)
  assert.equal(UNITS.warWolf, undefined);
});

test('the record follows the save: stormed, then conquered and taken again; the warchief named while he sits', () => {
  const m = startedMeta(2);
  m.assault = { v: 1, troops: {}, conquered: {}, tries: { orcs: 2 } };
  assert.equal(holdPages(m)[0].record, 'Stormed 2 times; it still stands');
  m.assault.tries.orcs = 4;
  m.assault.conquered.orcs = { day: 20261109, tier: 3, wins: 2 };
  assert.equal(holdPages(m)[0].record, 'Conquered, and taken 2 times in 4 assaults');
  m.war = newWar();
  const chief: Nemesis = { id: 1, base: 'orcWarlord', army: 'orcs', name: 'Vorga', epithet: 'the Skullsplitter', rank: 'warchief', loyalty: 90, might: 9, scars: 0, traits: [], weak: [], known: [], memory: [], met: 0, lost: 0, born: 0 };
  m.war.members.push(chief);
  assert.ok(holdPages(m)[0].facts[0].startsWith('Vorga the Skullsplitter, Warchief of the Dark Council'));
});
