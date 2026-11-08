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

test('each Eidolon strikes in its own way (EIDOLON-FX unique pass): different rhythm, order, spread and layers', async () => {
  const { pillarOrder, spreadShocks, faultLine } = await import('../src/eidolonFx');
  const sigs = EIDOLONS.map((e) => STRIKE_FX[e.id].sig);
  for (const key of ['special', 'order', 'spread'] as const) assert.equal(new Set(sigs.map((g) => g[key])).size, sigs.length, `${key} differs per Eidolon`);
  assert.equal(new Set(sigs.map((g) => `${g.stagger}/${g.burstAt}`)).size, sigs.length, 'no two share a rhythm');
  // the cold and the heavy have no hot white flash; the earth no bloom; shadow dims the screen; fire and light flash warm
  assert.equal(STRIKE_FX.nivra.sig.flash, 0);
  assert.equal(STRIKE_FX.gorm.sig.flash, 0);
  assert.equal(STRIKE_FX.gorm.sig.bloom, 0);
  assert.ok(STRIKE_FX.vaelkhar.sig.dim > 0.3 && STRIKE_FX.vaelkhar.sig.flash === 0);
  assert.ok(STRIKE_FX.gorm.sig.shake.amp > STRIKE_FX.voltara.sig.shake.amp && STRIKE_FX.gorm.sig.shake.ms > STRIKE_FX.voltara.sig.shake.ms);
  // the orders
  const foes = [{ x: 300, y: 200 }, { x: 100, y: 220 }, { x: 200, y: 180 }];
  const mid = { x: 200, y: 200 };
  assert.deepEqual(pillarOrder('ltr', foes, mid, null), [1, 2, 0]);
  assert.deepEqual(pillarOrder('together', foes, mid, null), [0, 1, 2]);
  assert.deepEqual(pillarOrder('mouth', foes, mid, { x: 0, y: 200 }), [1, 2, 0]);
  assert.deepEqual(pillarOrder('mouth', foes, mid, { x: 400, y: 200 }), [0, 2, 1]);
  assert.equal(pillarOrder('chain', foes, mid, null).length, 3);
  assert.deepEqual([...pillarOrder('inward', foes, mid, null)].sort(), [0, 1, 2]);
  // the aftershocks stay on the screen, come one after another and differ by spread
  const seen = new Set<string>();
  for (const kind of ['wave', 'radial', 'rain', 'jump', 'fault', 'implode'] as const) {
    const sh = spreadShocks(kind, 6, mid, 393, 852, { extraAt: 100, extraGap: 60 }, null, faultLine(mid, 393));
    assert.equal(sh.length, 6, kind);
    for (const s of sh) assert.ok(s.x >= 0 && s.x <= 393 && s.delay >= 100, kind);
    seen.add(sh.map((s) => `${Math.round(s.x)},${Math.round(s.y)}`).join('|'));
  }
  assert.equal(seen.size, 6, 'six different spreads');
});
