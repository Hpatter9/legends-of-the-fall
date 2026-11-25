// TRAIT-PERKS (docs/notes/trait-perks.md): the trait's card and the deploy chip's words, and every perk's look.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countLine, ladderRows, tierPips, traitHeroes } from '../src/traitCardRules';
import { PERK_LOOKS, TRAIT_BEATS, perkClips } from '../src/render/perkFxRules';
import { markFrame, MARK_FRAME_MS, perkMark, perkTint, PERK_TINTS } from '../src/render/perkLookRules';
import { TRAITS } from '../src/sim/traits';
import { BFX_CLIPS } from '../src/render/blenderFxData';
import { beatBfx } from '../src/render/blenderFxRules';

const UNDEAD = ['shambler', 'mummy', 'reaper'];

test("a trait's card: its three tiers, the reached ones awake and the next one marked", () => {
  const rows = ladderRows('undead', UNDEAD);
  assert.deepEqual(rows.map((r) => r.roman), ['I', 'II', 'III']);
  assert.deepEqual(rows.map((r) => r.reached), [true, true, false]);
  assert.deepEqual(rows.map((r) => r.next), [false, false, true]);
  assert.equal(rows[2].name, 'Rise from the Grave');
  assert.match(rows[2].rule, /three skeletons/);
  // (the daily's featured trait counts one more)
  assert.ok(ladderRows('undead', UNDEAD, 'undead')[2].reached);
  assert.equal(countLine('undead', UNDEAD), '3 of 4 on the field');
  assert.equal(countLine('undead', UNDEAD, 'undead'), '3 of 4 on the field, and one more today');
  assert.equal(tierPips('undead', UNDEAD), '●●○');
  assert.equal(tierPips('undead', []), '○○○');
  const heroes = traitHeroes('undead', UNDEAD);
  assert.deepEqual(heroes.slice(0, 3).map((h) => h.on), [true, true, true]);
  assert.ok(heroes.some((h) => !h.on));
  assert.deepEqual(ladderRows('nothing', UNDEAD), []);
});

test('every perk a trait can show has a look, and its beat clip is one the game holds', () => {
  for (const [what, look] of Object.entries(PERK_LOOKS)) {
    assert.ok(beatBfx(look.clip, look.el) && BFX_CLIPS[beatBfx(look.clip, look.el)!], `${what}: ${look.clip} ${look.el}`);
    assert.ok(look.size > 0 && look.size <= 2, what);
  }
  for (const id of Object.keys(TRAITS)) assert.ok(TRAIT_BEATS[id], `${id} has its beats`);
  for (const whats of Object.values(TRAIT_BEATS)) for (const w of whats) assert.ok(PERK_LOOKS[w], w);
  assert.equal(perkClips(['rise', 'rise']).length, 1);
});

test('what a perk raised is tinted for what it is; a plain fighter is not', () => {
  assert.equal(perkTint({ raised: 'thrall' }), PERK_TINTS.thrall);
  assert.equal(perkTint({}), undefined);
});

// PIXELLAB-ART: the risen skeletons wear their own grave sheets, and the crowned and the Wanted a painted mark over the head, not a tint
test('the grave skeletons, the crowned and the Wanted are not tinted; the crowned and the Wanted wear a mark', () => {
  assert.equal(perkTint({ raised: 'grave' }), undefined);
  // (ROUND4-WIRE: the sentry turret's own sheet)
  assert.equal(perkTint({ raised: 'sentry' }), undefined);
  assert.equal(perkTint({ crowned: true }), undefined);
  assert.equal(perkTint({ wanted: true }), undefined);
  assert.equal(perkMark({ crowned: true }), 'crown');
  assert.equal(perkMark({ wanted: true }), 'wanted');
  assert.equal(perkMark({}), undefined);
  assert.equal(perkMark(undefined), undefined);
  assert.equal(markFrame(0, false), 0);
  assert.equal(markFrame(MARK_FRAME_MS, false), 1);
  assert.equal(markFrame(MARK_FRAME_MS, true), 0);
});
