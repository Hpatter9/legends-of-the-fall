// The sound left from HOLD-SOUND (docs/notes/hold-sound.md) once the Assault was withdrawn (RELEASE-TRIM, docs/notes/release-trim.md): a
// hand-fired ultimate's cues, the doorway swap's, the menus' cues on the ui bus, and the War's end's own piece (a save that ended the War
// at the Last Hold still plays its scene and card).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FILE_LOUDNESS, MOMENT_CUES, busOf, trackGain } from '../src/render/audioMix';
import { EPIC_MANIFEST } from '../src/render/epicManifest';
import { WAR_END_SCENE, warEndScene } from '../src/sim/warEndScene';
import { CUES, cuesFor, isDoorwaySwap } from '../src/render/soundRules';
import type { Battle } from '../src/sim/battle';
import { sceneTrack } from '../src/render/epicMusic';
import { ultCues } from '../src/ultMomentRules';

test('a hand-fired ultimate: the build-up under the slash, the slow beat after the freeze; none of the drag when calm', () => {
  assert.deepEqual(ultCues('open', false).map((q) => q.cue), ['ultSlash', 'ultCharge']);
  const hit = ultCues('impact', false);
  assert.deepEqual(hit.map((q) => q.cue), ['ultImpact', 'ultSlow']);
  assert.ok(hit[1].delay! > 0, 'the slow beat comes as the freeze lets go');
  assert.deepEqual(ultCues('impact', true).map((q) => q.cue), ['ultImpact']);
  // (the build-up lasts the opening: about a second and a half)
  assert.ok(CUES.ultCharge.ms >= 1200 && CUES.ultCharge.ms <= 1500);
});

test('the doorway swap is feet shuffling past, not a spell\'s blink; a kit\'s swap still blinks', () => {
  const door = { t: 5000, units: [{ id: 1, swapAt: 5000 }, { id: 2, swapAt: 5000 }] } as unknown as Battle;
  assert.ok(isDoorwaySwap(door, 1));
  assert.deepEqual(cuesFor(door, { kind: 'swap', a: 1, b: 2 }).map((q) => q.cue), ['steps']);
  // (a kit's or a spell's swap stamps nobody; one stamped long ago is not this swap)
  const kit = { t: 5000, units: [{ id: 1 }, { id: 2 }] } as unknown as Battle;
  assert.deepEqual(cuesFor(kit, { kind: 'swap', a: 1, b: 2 }).map((q) => q.cue), ['blink', 'blink']);
  const old = { t: 9000, units: [{ id: 1, swapAt: 5000 }, { id: 2 }] } as unknown as Battle;
  assert.deepEqual(cuesFor(old, { kind: 'swap', a: 1, b: 2 }).map((q) => q.cue), ['blink', 'blink']);
});

test('the menus\' new cues are the page\'s own (the ui bus)', () => {
  for (const k of ['runeSlide', 'runeMerge', 'runeSet', 'ledger'] as const) assert.equal(busOf(k), 'ui');
  for (const k of ['gateHit', 'keepFall', 'ultSlash', 'ultImpact', 'warEnd'] as const) assert.equal(busOf(k), 'sfx');
  // (round 2: the ultimate's long cues are on the bus a skip can hush; its slash and its blow are not)
  for (const k of MOMENT_CUES) assert.equal(busOf(k), 'show');
});

test('the War\'s end has its own piece: the scene and the Council\'s end card play it, a minute of the main theme at the music\'s one loudness', () => {
  assert.equal(sceneTrack(WAR_END_SCENE), 'warend');
  assert.equal(warEndScene().music, WAR_END_SCENE, 'the scene asks for it');
  const e = EPIC_MANIFEST.warend;
  assert.ok(e.loop, 'it loops under the scene and the card');
  assert.ok(e.seconds >= 40 && e.seconds <= 60, `${e.seconds} s`);
  assert.ok(e.bytes < 300_000, 'a small file');
  const m = FILE_LOUDNESS.warend;
  assert.ok(Math.abs(m.lufs - -18) <= 1 && m.tp < -1, 'levelled to -18 LUFS, its peak under -1 dBTP');
  assert.ok(Number.isFinite(m.phone), 'its phone loudness is measured, so its trim is a number');
  assert.ok(Number.isFinite(trackGain('warend')) && trackGain('warend') > 0.5 && trackGain('warend') < 2);
  // (the scenes that had music keep it)
  assert.equal(sceneTrack('victory'), 'triumph');
  assert.equal(sceneTrack('calBoss1'), 'gorvak');
  assert.equal(sceneTrack('no such scene'), undefined);
});
