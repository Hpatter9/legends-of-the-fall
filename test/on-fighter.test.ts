// ON-FIGHTER (docs/notes/on-fighter.md): what stands or plays on a fighter must leave its body readable (the owner: "effects like
// this still hide the heroes ... maybe it's a wispy smoke that circles around them").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BODY, PAINT_OVER, ROUND, ROW_CLIP, ROW_PAINT, STATUS_ROUND, UNDER, behindRow, frontCover, onFighterClip, overAlpha, rowCut, rowsUnder, wispAt, wispsOf } from '../src/render/onFighterRules';
import { BODY_COVER } from '../src/render/bodyCover';
import { BFX_CLIPS } from '../src/render/blenderFxData';
import { STATUS_LOOKS, maxStatuses } from '../src/render/fxRules';

test('a status goes round its fighter: a pool at the feet and wisps that pass behind the body for the back half of each turn', () => {
  // (every status the fight can put on a fighter has its element's wisp and pool, rendered)
  assert.deepEqual(Object.keys(STATUS_ROUND).sort(), Object.keys(STATUS_LOOKS).sort());
  for (const [key, look] of Object.entries(STATUS_ROUND)) {
    assert.ok(BFX_CLIPS[`aura-wisp-${look.el}`]?.loop, `${key}: no wisp in ${look.el}`);
    assert.ok(BFX_CLIPS[`aura-pool-${look.el}`]?.loop, `${key}: no pool in ${look.el}`);
  }
  // (through a whole turn each wisp is behind the body half the time and in front half; in front it is smaller and fainter)
  let front = 0;
  const steps = 240;
  for (let i = 0; i < steps; i++) {
    const w = wispAt((i / steps) * ROUND.TURN_MS, 0, ROUND.N);
    if (w.front) front++;
    assert.ok(Math.abs(w.x) <= ROUND.RX + 1e-9);
    assert.equal(w.size, w.front ? ROUND.SIZE * ROUND.FRONT : ROUND.SIZE);
    assert.ok(w.alpha <= (w.front ? ROUND.FRONT_ALPHA : ROUND.BACK_ALPHA) + 1e-9);
  }
  assert.ok(Math.abs(front / steps - 0.5) < 0.02, `in front ${front} of ${steps}`);
  assert.ok(ROUND.FRONT < 1 && ROUND.FRONT_ALPHA < ROUND.BACK_ALPHA);
  // (evenly spaced round the turn, so never more than half of them, rounded up, are in front at once)
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * ROUND.TURN_MS;
    const n = Array.from({ length: ROUND.N }, (_, k) => wispAt(t, k, ROUND.N)).filter((w) => w.front).length;
    assert.ok(n <= Math.ceil(ROUND.N / 2), `${n} in front at ${t}`);
  }
  // (it fades in at the bottom of its climb and out at the top: never a pop)
  assert.equal(wispAt(0, 0, ROUND.N).alpha, 0);
});

test('however many statuses hold, the smoke in front of the body is under the ceiling: the wisps are shared out, not multiplied', () => {
  assert.ok(frontCover() <= BODY.CEILING, `${frontCover()}`);
  assert.ok(frontCover(1.2, ROUND.SAVER) <= BODY.CEILING);
  for (const saver of [false, true]) {
    const n = saver ? ROUND.SAVER : ROUND.N;
    for (let statuses = 1; statuses <= maxStatuses(saver); statuses++) {
      const dealt = wispsOf(statuses, n);
      assert.equal(dealt.length, n);
      assert.equal(dealt[0], 0);
      for (const k of dealt) assert.ok(k >= 0 && k < statuses);
    }
  }
  assert.deepEqual(wispsOf(0, 3), []);
  assert.deepEqual(wispsOf(2, 3), [0, 1, 0]);
  // (the smoke is to be seen: more than three wisps, and behind the body each is large and at full strength)
  assert.ok(ROUND.N >= 5 && ROUND.SIZE >= 0.8 && ROUND.BACK_ALPHA === 1);
});

test('the unit view draws a status by the rule: nothing of it over the body but the front wisps, the rest under the body', () => {
  const src = readFileSync('src/render/unitView.ts', 'utf8');
  // (under the body: its index in the fighter; over: the old overlays' place)
  assert.match(src, /this\.root\.addChildAt\(sp, this\.root\.getChildIndex\(front \? this\.stars : this\.body\)\);/);
  assert.match(src, /const pool = take\(false\);/);
  assert.match(src, /const sp = take\(w\.front\);/);
  // (the old loop as tall as the fighter over its body is gone from the fighter's drawing)
  assert.ok(!src.includes('STATUS_LOOKS'));
});

test('every rendered clip that plays on a fighter is measured, and drawn over the fighter no more strongly than the ceiling allows', () => {
  const on = Object.keys(BFX_CLIPS).filter((key) => onFighterClip(key, BFX_CLIPS[key].at));
  assert.ok(on.length > 200, `${on.length}`);
  assert.deepEqual(Object.keys(BODY_COVER).sort(), on.sort());
  for (const key of on) {
    const cover = BODY_COVER[key];
    assert.ok(cover >= 0 && cover <= 1, key);
    // (what lies over the body, counting how see-through it is drawn, is the ceiling at most)
    assert.ok(cover * overAlpha(cover) <= BODY.CEILING + 1e-9, `${key}: ${cover}`);
    // (a clip that covers little is not thinned at all)
    if (cover <= BODY.CEILING) assert.equal(overAlpha(cover), 1);
  }
  // (the wisps and pools are the rule's own, and an ultimate's one great strike in the midst is not on a fighter)
  assert.ok(!onFighterClip('aura-wisp-forest') && !onFighterClip('aura-pool-forest'));
  assert.ok(!onFighterClip('ult-wizard-strike', undefined) && onFighterClip('ult-priestess-strike', 'friends') && onFighterClip('ult-wizard-windup'));
  // (the renderer draws such a clip under the fighter at full strength and over it thinned)
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  assert.match(fx, /const thin = cover === undefined \? 1 : overAlpha\(cover\);/);
  assert.match(fx, /const host = on && thin < 1 \? this\.sprites\.get\(on\.id\) : undefined;/);
  // (ROW-UNDER, the director's order: the copy is on the ground of every row it covers, and in the fighter's own layer only where
  // the board gives no rows; the assertion follows the new call)
  assert.match(fx, /for \(const under of rows\.length \? rows : \[this\.underAt\(host\.underLayer\(\)\)\]\) \{/);
  // (presence without cover: behind the body it is larger and keeps its glow; a ring lands at the feet under the fighter; and the
  // clip is over the body at full strength only for the rule's brief flash)
  assert.ok(UNDER.SIZE > 1 && UNDER.RING >= 1);
  assert.equal(UNDER.FLASH_MS, BODY.FLASH_MS);
  assert.ok(BODY.FLASH_MS <= 150);
  assert.match(fx, /const grown = \(UNDER\.SIZE \* BFX_SCALE \* size\) \/ k;/);
  assert.match(fx, /const ring = stage === 'strike' && SHOWCASES\[kind\] \? beatBfx\('ring', SHOWCASES\[kind\]\.el\) : undefined;/);
  assert.match(fx, /life: UNDER\.FLASH_MS, alpha: base, solid: true \}\);/);
  assert.match(readFileSync('src/render/unitView.ts', 'utf8'), /this\.root\.addChildAt\(this\.underFx, this\.root\.getChildIndex\(this\.body\)\);/);
  assert.match(fx, /this\.moment\.spawn\(\{ \.\.\.bit, alpha: base \* thin \}\);/);
});

test('a painted bit over a fighter is thinned to the ceiling and drawn again at full strength under that fighter\'s body', () => {
  // (a painted bit's cover is not measured, so it is taken to cover the whole body: drawn over it at the ceiling itself)
  assert.equal(PAINT_OVER, BODY.CEILING);
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  assert.match(fx, /this\.particles\.cover = \(x, y, half\) => \(this\.overBody\(x, y, half\) \? PAINT_OVER : 1\);/);
  // (ROW-UNDER 2, the director's order: the copy under the body is laid on the ground's rows, at `ROW_PAINT`, and in the fighter's
  // own layer only where the board gives no rows; the assertion follows the new call)
  assert.match(fx, /if \(rows\.length\) return rows\.map\(\(to\) => \(\{ to, ox: 0, oy: 0, k: 1, a: ROW_PAINT \}\)\);/);
  assert.match(fx, /return \[\{ to: this\.underAt\(s\.underLayer\(\), this\.lows\), ox: s\.root\.x, oy: s\.root\.y, k: s\.root\.scale\.x \|\| 1 \}\];/);
  // (a bit that lies over several fighters goes under the one farthest back, so it is behind them all)
  assert.match(fx, /if \(!best \|\| s\.root\.zIndex < best\.root\.zIndex\) best = s;/);
  // (a plain strip and a king's spell's clip over a fighter go under its body whole)
  assert.match(fx, /const host = this\.bodyAt\(x, y, 16 \* scale\);/);
  assert.match(fx, /const host = paint \? undefined : this\.bodyAt\(\(l \+ r\) \/ 2, Math\.min\(y, bot\) - half, half\);/);
  assert.match(fx, /host\.underLayer\(\)\.addChild\(view\);/);
  // (and a thin copy of a king's spell's clip stays over the fighter, by its measured cover, so the spell is seen to land)
  assert.match(fx, /thin = c\.w \* BFX_SCALE > TW \* 1\.5 \? PAINT_OVER : overAlpha\(BODY_COVER\[key\] \?\? 1\);\n\s+this\.root\.addChild\(ghost\);/);
  assert.match(fx, /view\.scale\.set\(UNDER\.SIZE \/ k\);/);
  // (a loop that stays round a fighter, the spirit guardians and Vael's black sun: whole under the body, thin over it)
  assert.match(fx, /const thin = overAlpha\(BODY_COVER\[key\] \?\? 1\);/);
  assert.match(fx, /if \(host && thin < 1\) this\.bfxStand\(key, this\.root, \.\.\.where\(\), live, \{ rise: true, follow: where, host \}\);/);
  assert.match(fx, /this\.bfxRound\(lasts\.clip, this\.sprites\.get\(me\.id\), over,/);
  assert.match(fx, /if \(this\.bfxRound\(own\.bfx, this\.bodyAt\(hx, hy - 10, 8\), centre, live\)\) return true;/);
  // (the under copies run on the fight's clock with the particles, and go when they go)
  assert.match(fx, /this\.stepUnder\(this\.lows, dt\);/);
  assert.match(fx, /if \(layer\.destroyed \|\| p\.root\.destroyed\) among\.delete\(layer\);/);
  const parts = readFileSync('src/render/particles.ts', 'utf8');
  assert.match(parts, /const low = b\.bare \? null : this\.under\?\.\(b\.x, b\.y,/);
  assert.match(parts, /one\.to\.spawn\(\{ \.\.\.b, x: \(b\.x - one\.ox\) \/ k, y: \(b\.y - one\.oy\) \/ k, scale: \(b\.scale \?\? 1\) \/ k,/);
});

test('a wisp is a long thin thread, not a puff: its clip is far wider than it is tall, in the atlases every fight holds', () => {
  for (const look of Object.values(STATUS_ROUND)) {
    const c = BFX_CLIPS[`aura-wisp-${look.el}`];
    assert.ok(c.w >= 28 && c.w >= c.h * 1.8, `${look.el}: ${c.w} x ${c.h}`);
    assert.ok(c.a <= 1 && c.loop);
  }
});

test("ROW-UNDER: an ultimate's copy under a fighter lies on every row its picture covers, and behind the board above its far edge", () => {
  // (a flat board of 4 x 4: tile (u, v) at ((u - v) * 32, (u + v) * 16), its row u + v, drawn at ten times that)
  const tiles = [];
  for (let u = 0; u < 4; u++) for (let v = 0; v < 4; v++) tiles.push({ depth: (u + v) * 10, x: (u - v) * 32, y: (u + v) * 16 });
  // (a picture standing on tile (2, 2), a tile and a half wide and reaching three tiles' heights up the screen)
  const rows = rowsUnder(tiles, [-48, 64 - 96, 48, 64 + 16], 64, 32);
  // (its own row, the row before it at its near edge, and the rows behind it up the screen: all of them, nearest last)
  assert.deepEqual(rows, [0, 10, 20, 30, 40, 50]);
  // (a small picture at the feet touches only its own row and the two beside it, whose tiles' boxes it is within)
  assert.deepEqual(rowsUnder(tiles, [-4, 60, 4, 68], 64, 32), [30, 40, 50]);
  // (nothing off the board)
  assert.deepEqual(rowsUnder(tiles, [500, 500, 600, 600], 64, 32), []);
  // (the layer behind the board is drawn under the farthest row's tiles: a row's layer is drawn at its depth + 1)
  assert.ok(behindRow(0) + 1 < 0);
  // (a row's cut is a column's shape: its top a pixel over, its near sides down the drop)
  assert.deepEqual(rowCut(0, 0, 12, 64, 32), [0, -17, 33, 0, 33, 12, 0, 29, -33, 12, -33, 0]);
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  // (a row's layer with nothing playing is not drawn, so its cut costs nothing between two ultimates)
  assert.match(fx, /if \(rest\) layer\.visible = p\.busy \|\| layer\.children\.length > \(layer\.mask \? 2 : 1\);/);
  assert.match(fx, /this\.stepUnder\(this\.rowLows, dt, true\);/);
});

test('ROW-UNDER 2: what lies flat on the ground (a painted ring, a king\'s spell\'s ring) goes on the ground\'s rows, tempered; what rises does not', () => {
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  // (the director's ruling after Rally's flames buried two heroes: only what lies FLAT on the ground goes on the rows. A painted bit
  // that is flat, and a clip made to lie on the ground; a bit or a clip that rises stays in the one fighter's own layer, and a
  // painted strip, which cannot be told apart, always does)
  assert.match(fx, /const rows = flat \? this\.rowUnder\(\[x - half, y - half, x \+ half, y \+ half\]\) : \[\];/);
  assert.match(fx, /const rows = c\.layer === 'ground' \? this\.rowLayers\(bfxBox\(c, x, y, \(Math\.abs\(sp\.scale\.y\) \/ BFX_SCALE\) \* UNDER\.SIZE\)\) : \[\];/);
  assert.doesNotMatch(fx, /const copies: Sprite\[\] = \[\];/);
  assert.match(readFileSync('src/render/particles.ts', 'utf8'), /this\.under\?\.\(b\.x, b\.y, b\.half \?\? 16 \* \(b\.scale \?\? 1\) \* Math\.max\(b\.stretchX \?\? 1, b\.stretchY \?\? 1, 1\), flatOf\(b\)\);/);
  // (Rally's rings under the party are hoops of light with a faint glow inside, not the Ring's solid middle)
  assert.equal(BFX_CLIPS['spell-rally-cast'].layer, 'ground');
  assert.match(fx, /low = c\.w \* BFX_SCALE > TW \* 1\.5 \? ROW_CLIP\.WIDE : ROW_CLIP\.ONE;/);
  // (on the rows the whole of a picture shows, where the nearer tiles used to hide most of it: it is drawn below full strength, a
  // wide ring under a party the most tempered, and never so thin that it is lost)
  assert.ok(ROW_PAINT < 1 && ROW_PAINT >= 0.5);
  assert.ok(ROW_CLIP.WIDE < ROW_CLIP.ONE && ROW_CLIP.ONE < 1 && ROW_CLIP.WIDE >= 0.5);
  // (a row's layer is drawn while anything plays or lies on it, and not otherwise)
  assert.match(fx, /if \(rest\) layer\.visible = p\.busy \|\| layer\.children\.length > \(layer\.mask \? 2 : 1\);/);
  // (the tiles of the rows' cuts are kept for the board and the frame, not gathered for every bit)
  assert.match(fx, /if \(!had \|\| had\.board !== board \|\| had\.frame !== getFrame\(\)\) \{/);
});
