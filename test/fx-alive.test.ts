// FX-ALIVE (docs/notes/fx-alive.md): a patch of marked ground lives and lets the heroes in it show: a faint fill and a bright rim, each tile on
// its own beat, thinned under a fighter, still and fainter with reduced motion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { ALIVE, breath, stripFrame, tileLook, tilePhase } from '../src/render/fxAlive';
import { ZONE_BFX, bfxClip, groundBfx } from '../src/render/blenderFxRules';
import { BFX_DENSITY } from '../src/render/blenderFxData';
import { OVER_FIGHTER_STATUS_ALPHA } from '../src/render/overFighter';

/** The game's elements (`fxRules.ts`): each has its ground loop. */
const ELEMENTS = ['fire', 'ice', 'lightning', 'light', 'dark', 'forest', 'poison', 'earth', 'wind', 'blood'];

test('the edge carries the area: the rim is bright and the fill faint', () => {
  for (let t = 0; t < ALIVE.BREATH_MS; t += 100) {
    const k = tileLook(t, 0, false, false);
    assert.ok(k.fill <= ALIVE.FILL + 1e-9 && k.fill > 0, `fill ${k.fill}`);
    assert.ok(k.rim >= 4 * k.fill, `rim ${k.rim} against fill ${k.fill}`);
  }
  // (the fill was 0.2 to 0.45 before; now it never passes an eighth)
  assert.ok(ALIVE.FILL <= 0.125);
});

test('each tile breathes on its own beat: neighbours are never in step, and the patch moves over time', () => {
  for (let u = 0; u < 8; u++)
    for (let v = 0; v < 11; v++) {
      const p = tilePhase(u, v);
      assert.ok(p >= 0 && p < 1);
      assert.notEqual(p, tilePhase(u + 1, v), `${u},${v} and its right`);
      assert.notEqual(p, tilePhase(u, v + 1), `${u},${v} and below`);
    }
  // (a tile's rim brightens and dims through a breath)
  const rims = Array.from({ length: 16 }, (_, i) => tileLook(i * 100, 0.25, false, false).rim);
  assert.ok(Math.max(...rims) - Math.min(...rims) > 0.3);
  // (its strip turns over, each tile a few frames from its neighbour)
  assert.notEqual(stripFrame(0, tilePhase(0, 0), 8, false), stripFrame(0, tilePhase(1, 0), 8, false));
  assert.notEqual(stripFrame(0, 0, 8, false), stripFrame(ALIVE.STRIP_MS * 3, 0, 8, false));
});

test('a fighter standing on a tile thins its fill and strip; the rim stays, so the edge still shows', () => {
  const open = tileLook(400, 0.5, false, false);
  const under = tileLook(400, 0.5, true, false);
  assert.ok(Math.abs(under.fill - open.fill * ALIVE.OCCUPIED) < 1e-9);
  assert.ok(Math.abs(under.strip - open.strip * ALIVE.OCCUPIED) < 1e-9);
  assert.equal(under.rim, open.rim);
  assert.ok(ALIVE.OCCUPIED < 0.5);
});

test('with reduced motion a patch holds still and fainter; its strength scales everything', () => {
  assert.deepEqual(tileLook(0, 0.3, false, true), tileLook(9999, 0.8, false, true));
  assert.ok(tileLook(0, 0, false, true).rim < ALIVE.RIM);
  assert.equal(breath(1234, 0.4, true), 0.5);
  assert.equal(stripFrame(1234, 0.4, 8, true), 0);
  const half = tileLook(300, 0.2, false, false, 0.5);
  const full = tileLook(300, 0.2, false, false, 1);
  assert.ok(Math.abs(half.rim - full.rim / 2) < 1e-9 && Math.abs(half.fill - full.fill / 2) < 1e-9);
  assert.deepEqual(tileLook(300, 0.2, false, false, 0), { fill: 0, rim: 0, strip: 0 });
});

// BLENDER-FX (docs/notes/blender-fx.md): the owner's call is that every battle effect is a Blender-rendered pixel sheet, the ground loops too.
// These three tests held the painted sheets (`src/art/fx/alive/`: the framed edge cut into quarters, the borderless fill); they now hold the
// rendered loops that took their place.
test('the marks in front of a fighter are drawn at half their strength; every element has its rendered ground loop', () => {
  assert.equal(OVER_FIGHTER_STATUS_ALPHA, 0.5);
  for (const el of ELEMENTS) {
    const key = groundBfx(el);
    assert.ok(key, `${el} has no ground loop`);
    const c = bfxClip(key)!;
    assert.ok(c.loop && c.n >= 8, `${el}: a loop of ${c.n} frames`);
    // (one tile's worth: no wider than a tile and a little, its tile's middle inside its frames)
    assert.ok(c.w <= BFX_DENSITY * 1.2, `${el}: ${c.w} px wide`);
    assert.ok(c.ax > 0 && c.ax < c.w && c.ay > 0 && c.ay <= c.h + 2, `${el}: anchor ${c.ax}, ${c.ay}`);
  }
  // (the lights keep their glow on the ground too)
  assert.ok(bfxClip(groundBfx('light')!)!.g && bfxClip(groundBfx('lightning')!)!.g);
  assert.ok(!bfxClip(groundBfx('fire')!)!.g && !bfxClip(groundBfx('poison')!)!.g);
});

test('the painted ground sheets are gone: nothing of them is left in the game, and no element falls back to an older look', () => {
  assert.ok(!existsSync('src/art/fx/alive'), 'the painted atlases');
  assert.ok(!existsSync('src/render/aliveArt.ts'));
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  assert.doesNotMatch(fx, /aliveFill|aliveQuarters|ALIVE_CELL|edgeQuarter/);
  assert.match(fx, /const key = el && !settings\(\)\.saver \? groundBfx\(el\) : undefined;/, 'the battery saver leaves the loops out');
  // (no two elements' loops are the same thing in another colour: each has its own things standing in it)
  const recipe = readFileSync('tools/blender-fx/effects.py', 'utf8');
  const things = [...recipe.matchAll(/(\w+)=\('\w+', '(\w+)'\)/g)].map((m) => m[2]);
  assert.equal(things.length, ELEMENTS.length);
  assert.equal(new Set(things).size, ELEMENTS.length);
});

test('the rendered loop lies on every tile, a little over the strip\'s strength, and thins under a fighter', () => {
  const open = ALIVE.RENDERED * tileLook(400, 0, false, false).strip;
  const under = ALIVE.RENDERED * tileLook(400, 0, true, false).strip;
  assert.ok(open > 0.45 && open <= 1, `open ground ${open}`);
  assert.ok(under < 0.4, `under a fighter ${under}`);
  assert.ok(ALIVE.RENDERED_GLOW < 0.5, 'a patch\'s glows overlap, so each tile keeps a share');
  // (the loop fills its tile edge to edge, as the painted borderless fill did: the recipe's fill is most of the ground)
  const recipe = readFileSync('tools/blender-fx/effects.py', 'utf8');
  assert.match(recipe, /fx\(f'ground-\{el\}', 'tile'.*fill=0\.[7-9]/);
  assert.match(readFileSync('tools/blender-fx/scenes.py', 'utf8'), /runs right to the tile's edge/);
  // (burning ground is its own, taller loop)
  const zone = bfxClip(ZONE_BFX)!;
  assert.ok(zone.loop && zone.h > bfxClip(groundBfx('fire')!)!.h);
});
