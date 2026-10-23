import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PACK_NAMES } from '../src/render/fxSheets';
import { TONE_ELEMENTS, toneColour } from '../src/render/spectacle';
import { FLASH_MAX, FLASH_MS, packKey } from '../src/render/fxRules';
import { COMBOS } from '../src/sim/combos';

// The families the combo and promotion effects play (`spectacle.ts`): every one must be in the atlas, or the effect silently draws nothing.
const FAMILIES = ['circle', 'gather', 'sparkle', 'pillar', 'nova', 'wave', 'strike', 'explosion'] as const;

test('every element a combo\'s look uses has all the strips its effects play', () => {
  for (const [tone, els] of Object.entries(TONE_ELEMENTS)) for (const el of els) for (const f of FAMILIES) assert.ok(PACK_NAMES.includes(packKey(el, f)), `${tone}: ${packKey(el, f)}`);
  for (const key of ['light-circle', 'light-nova', 'light-sparkle', 'light-pillar', 'light-wave', 'fire-aura']) assert.ok(PACK_NAMES.includes(key), key);
});

test('every combo has a look and a colour, and the eight differ', () => {
  for (const c of COMBOS) assert.ok(TONE_ELEMENTS[c.tone] && toneColour(c.tone) > 0, c.id);
  assert.equal(new Set(COMBOS.map((c) => c.tone)).size, COMBOS.length);
});

test('a flash stays a blink: no brighter than half, no longer than about 120 ms', () => {
  assert.ok(FLASH_MAX <= 0.5);
  assert.ok(FLASH_MS <= 120);
});
