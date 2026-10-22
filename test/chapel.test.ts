import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChapel, canBuildChapel, CHAPEL_COST, chapelBuilt, spellsOpen, upgrade } from '../src/sim/castle';
import { loadMeta, newMeta, saveMeta } from '../src/sim/meta';
import { unlockSpell } from '../src/sim/spells';
import { CHAPEL_SITE, lookFor, PLACE_LOOK } from '../src/render/castleSpots';

const store = () => {
  const d = new Map<string, string>();
  return { getItem: (k: string) => d.get(k) ?? null, setItem: (k: string, v: string) => void d.set(k, v) };
};
const saved = (extra: Record<string, unknown>) => {
  const s = store();
  s.setItem('legends.meta', JSON.stringify({ seed: 3, crowns: 50, unlocked: ['knight'], pulls: 0, dry: 0, ...extra }));
  return loadMeta(1, s);
};

test('the Chapel costs 200 crowns, once: the cost is taken, a short purse changes nothing, and a second build does nothing', () => {
  assert.equal(CHAPEL_COST, 200);
  const m = newMeta(1);
  assert.equal(chapelBuilt(m), false);
  m.crowns = 199;
  assert.equal(canBuildChapel(m), false);
  assert.equal(buildChapel(m), false);
  assert.equal(m.crowns, 199);
  assert.equal(chapelBuilt(m), false);
  m.crowns = 450;
  assert.equal(canBuildChapel(m), true);
  assert.equal(buildChapel(m), true);
  assert.equal(m.crowns, 250);
  assert.equal(chapelBuilt(m), true);
  assert.equal(buildChapel(m), false);
  assert.equal(m.crowns, 250);
});

test('the spellbook is locked until the Chapel stands, and a build survives a save', () => {
  const m = newMeta(1);
  assert.equal(spellsOpen(m), false);
  m.crowns = 200;
  buildChapel(m);
  assert.equal(spellsOpen(m), true);
  const s = store();
  saveMeta(m, s);
  assert.equal(loadMeta(1, s).chapel, true);
});

test('old saves keep what they had: a spell beyond the starters, a changed loadout or any castle upgrade counts the Chapel as built; a plain one does not', () => {
  assert.equal(saved({}).chapel, false);
  assert.equal(saved({ spellbook: { owned: ['heal', 'meteor', 'haste'], equipped: ['heal', 'meteor', 'haste'] } }).chapel, false);
  assert.equal(saved({ spellbook: { owned: ['heal', 'meteor', 'haste', 'shield'], equipped: ['heal', 'meteor', 'haste'] } }).chapel, true);
  assert.equal(saved({ spellbook: { owned: ['heal', 'meteor', 'haste'], equipped: ['heal'] } }).chapel, true);
  assert.equal(saved({ castle: { treasury: 1 } }).chapel, true);
  // (a save that has the flag keeps it either way)
  assert.equal(saved({ chapel: false, castle: { treasury: 1 } }).chapel, false);
  assert.equal(saved({ chapel: true }).chapel, true);
  // (a fresh player who unlocks a spell later, with the book open, still has the Chapel as the flag says)
  const m = newMeta(1);
  m.crowns = 1000;
  upgrade(m, 'treasury');
  assert.equal(chapelBuilt(m), false);
});

test('unlocking a spell once the Chapel is built still works as before', () => {
  const m = newMeta(1);
  m.crowns = 1000;
  buildChapel(m);
  assert.equal(unlockSpell(m, 'shield'), true);
});

test('the unbuilt Chapel is a site made of kit pieces, not the church', () => {
  assert.equal(lookFor('chapel', 0), CHAPEL_SITE);
  assert.equal(lookFor('chapel', 1), PLACE_LOOK.chapel);
  assert.ok(CHAPEL_SITE.parts.every((p) => p.sprite !== 'church'));
});
