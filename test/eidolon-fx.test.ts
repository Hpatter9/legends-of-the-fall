// The Eidolons' strikes made bigger (EIDOLON-FX, docs/notes/eidolon-fx.md; `src/eidolonFx.ts`): every Eidolon's strike is layered from
// effect strips that are in the game and credited, its aftershocks spread over the foes' half and land before the aftermath, battery saver
// draws less and reduced motion flings nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { extraSpots, fxBudget, FX_CELL, FX_SHEETS, PILLAR_STAGGER, RING, STRIKE_FX } from '../src/eidolonFx';
import { FULL, SHORT } from '../src/eidolonRules';
import { EIDOLONS } from '../src/sim/eidolons';

test('every Eidolon has a layered strike, its strips in the game with the frames they say', () => {
  for (const e of EIDOLONS) {
    const look = STRIKE_FX[e.id];
    assert.ok(look, e.id);
    for (const st of [look.pillar, look.burst, look.extra, look.after]) {
      const f = `src/art/eidolons/fx/${st.sheet}.webp`;
      assert.ok(existsSync(f), f);
      assert.ok(st.hold >= 0 && st.hold < st.n, `${st.sheet}: the held frame is one of its frames`);
      // (a webp's size: the VP8X header's canvas, 24-bit width - 1 and height - 1 at bytes 24 and 27)
      const b = readFileSync(f);
      assert.equal(b.toString('ascii', 12, 16), 'VP8X', f);
      const w = 1 + b.readUIntLE(24, 3);
      const h = 1 + b.readUIntLE(27, 3);
      assert.equal(h, FX_CELL, f);
      assert.equal(w, FX_CELL * st.n, `${f}: ${st.n} frames`);
    }
    // (the strike is big: the burst fills about half the screen's width or more, the pillars stand taller than a fighter's tile)
    assert.ok(FX_CELL * look.burst.scale >= 420, `${e.id}: the burst is big`);
    assert.ok(FX_CELL * look.pillar.scale >= 240, `${e.id}: the pillars are tall`);
    assert.ok(look.after.loop, `${e.id}: the aftermath lingers`);
  }
  assert.ok(existsSync(`src/art/eidolons/fx/${RING.sheet}.png`));
});

test('the strips are credited, and kept for offline play', () => {
  const credits = readFileSync('CREDITS.md', 'utf8');
  assert.match(credits, /src\/art\/eidolons\/fx\//);
  assert.match(credits, /impact-ring/);
  const build = readFileSync('build.mjs', 'utf8');
  assert.match(build, /src\/art\/eidolons\/fx/);
  assert.match(build, /EIDOLON_ART_FILES\.push\(`eidolons\/fx\/\$\{f\}`\)/);
  assert.ok(FX_SHEETS.length >= 12);
});

test('the aftershocks spread over the foes\' half and land before the aftermath', () => {
  const bunches = [
    [{ x: 0.5, y: 0.35 }],
    [{ x: 0.3, y: 0.3 }, { x: 0.45, y: 0.33 }, { x: 0.6, y: 0.29 }, { x: 0.7, y: 0.4 }],
    [{ x: 0.1, y: 0.2 }, { x: 0.9, y: 0.5 }],
  ];
  for (const foes of bunches) {
    const spots = extraSpots(foes, fxBudget(false, false).extras);
    assert.equal(spots.length, 6);
    const xs = spots.map((s) => s.x);
    assert.ok(Math.max(...xs) - Math.min(...xs) >= 0.5, 'spread wide');
    for (const s of spots) assert.ok(s.x >= 0.08 && s.x <= 0.92 && s.y >= 0.12 && s.y <= 0.78, 'inside the screen');
    spots.forEach((s, i) => i && assert.ok(s.delay > spots[i - 1].delay, 'one after another'));
    assert.ok(spots[spots.length - 1].delay < FULL.AFTER - FULL.STRIKE, 'before the aftermath');
  }
  assert.deepEqual(extraSpots([{ x: 0.5, y: 0.3 }], 0), []);
  // (the pillars roll across ten foes within the blow's beats)
  assert.ok(PILLAR_STAGGER * 9 < (FULL.AFTER - FULL.STRIKE));
  assert.ok(SHORT.AFTER > SHORT.STRIKE);
});

test('battery saver draws less, and reduced motion flings no debris', () => {
  const full = fxBudget(false, false);
  const saver = fxBudget(true, false);
  assert.ok(saver.extras < full.extras && saver.debris < full.debris && saver.linger < full.linger);
  assert.equal(fxBudget(false, true).debris, 0);
});
