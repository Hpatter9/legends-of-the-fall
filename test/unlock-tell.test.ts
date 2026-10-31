import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { SCENES, SCENE_ORDER } from '../src/sim/sceneScripts';
import { revealCard } from '../src/sim/sceneReveal';
import { ascOpenedBy, tellsByCard, unlockOfReveal, UNLOCK_KINDS, UNLOCK_TELLS, type Announcer } from '../src/sim/unlockTell';
import { ASC_MAX } from '../src/sim/ascension';
import { ARMIES } from '../src/sim/armies';
import { newMeta, type Meta } from '../src/sim/meta';

const ANNOUNCERS: readonly Announcer[] = ['card', 'binding', 'heroReveal', 'burst', 'toast', 'recap'];

test('every kind of unlock has exactly one announcer', () => {
  assert.ok(UNLOCK_KINDS.length >= 10);
  for (const k of UNLOCK_KINDS) {
    const a = UNLOCK_TELLS[k];
    assert.equal(typeof a, 'string', k);
    assert.ok(ANNOUNCERS.includes(a), `${k}: ${a}`);
  }
});

test("every unlock a film reveals is told by the film's end card, and only by it", () => {
  const told = new Set<string>();
  for (const id of SCENE_ORDER) {
    const r = SCENES[id].reveal;
    if (!r || r.kind === 'eidolon') continue;
    const k = unlockOfReveal(r);
    assert.equal(UNLOCK_TELLS[k], 'card', `${id} reveals ${k}`);
    assert.ok(tellsByCard(k));
    told.add(k);
  }
  // (the films cover the Calamity, the next army, Ascension, the buildings, the spellbook and the first awakening)
  for (const k of ['calamity', 'army', 'ascension', 'building', 'spellbook', 'awaken'] as const) assert.ok(told.has(k), k);
  // (the War Horn's card follows the binding ceremony, which has no reveal of its own)
  assert.equal(UNLOCK_TELLS.horn, 'card');
});

test('an Eidolon bound is told by its binding, so no card repeats the seal', () => {
  assert.equal(UNLOCK_TELLS.eidolon, 'binding');
  assert.equal(tellsByCard(unlockOfReveal({ kind: 'eidolon', id: 'x' })), false);
  for (const id of SCENE_ORDER) assert.notEqual(SCENES[id].reveal?.kind, 'eidolon', id);
});

test('each Ascension level opened has a card of its own; a lower level replayed, or the last, opens none', () => {
  const m: Meta = newMeta(3);
  (m as { calamity?: unknown }).calamity = { clears: 1, best: 6 };
  // (a first clear, at level 0, opens level 1)
  assert.equal(ascOpenedBy(0, m), true);
  assert.equal(revealCard({ kind: 'ascension' }, m)?.key, 'ascension:1');
  (m as { calamity?: unknown }).calamity = { clears: 4, best: 6, asc: 3 };
  assert.equal(ascOpenedBy(3, m), true);
  assert.equal(ascOpenedBy(1, m), false);
  assert.equal(revealCard({ kind: 'ascension' }, m)?.key, 'ascension:4');
  (m as { calamity?: unknown }).calamity = { clears: 12, best: 6, asc: ASC_MAX };
  assert.equal(ascOpenedBy(ASC_MAX, m), false);
});

test('an army opened by stars, not by its film, has the same card', () => {
  const m = newMeta(5);
  m.opened = [ARMIES[1].id];
  const c = revealCard({ kind: 'nextArmy', after: ARMIES[0].id }, m)!;
  assert.equal(c.key, `army:${ARMIES[1].id}`);
  assert.equal(c.label, 'Unlocked');
});

test('the old announcements are gone from the page', () => {
  const src = readdirSync('src')
    .filter((f) => f.endsWith('.ts'))
    .map((f) => [f, readFileSync(`src/${f}`, 'utf8')] as const);
  for (const [f, s] of src) {
    // (the army's banner, the hero's join toast and the Ascension lines on the Calamity's result)
    assert.ok(!/showUnlock|toastJoined/.test(s), f);
    assert.ok(!/Ascension \$\{[^}]+\} is open/.test(s), f);
  }
  assert.ok(!readFileSync('src/sim/armyDrops.ts', 'utf8').includes('joins you!'));
});
