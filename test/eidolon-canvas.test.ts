// EIDOLON-SMOOTH 2 (docs/notes/eidolon-smooth.md): the strips of an Eidolon's call drawn on canvases, not as page elements. The sums
// here are the stylesheet's animations as they stood (the steps, the delays, the fades, the movers' paths), so the look is the same;
// and the rules that keep what covers what.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bezier, boulderAt, canvasScale, chipAt, driftAt, EASE, eased, emberAt, flareAlpha, fxAlpha, fxFrame, holdAlpha, lingerAlpha, loopAlpha, packFrame, sameCanvas, stageAlpha, stageCell, stillAlpha, tintMatrix, tintPixels, track, wakeAt } from '../src/callPieceRules';
import { chipPiece, flarePiece, fxPiece, glowBakes, hexA, markPiece, pillarGlow, stagePieces, type CallEnv } from '../src/callPieces';
import { STRIKE_FX } from '../src/eidolonFx';
import { STAGED } from '../src/eidolonStage';
import { EIDOLONS } from '../src/sim/eidolons';
import { LOOKS } from '../src/eidolonRules';

const near = (a: number, b: number, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} is not ${b}`);
const env = (reduced = false, out: number | null = null): CallEnv => ({ reduced, out: () => out });

test("a CSS cubic-bezier: its ends, the named curves' known middles, and a keyframed value eased anew between each two stops", () => {
  const lin = bezier(0, 0, 1, 1);
  for (const x of [0, 0.25, 0.5, 1]) near(lin(x), x);
  near(EASE(0.5), 0.8024, 2e-3);
  near(bezier(0.42, 0, 1, 1)(0.5), 0.3154, 2e-3);
  near(bezier(0, 0, 0.58, 1)(0.5), 0.6846, 2e-3);
  assert.equal(EASE(-1), 0);
  assert.equal(EASE(2), 1);
  const stops = [[0, 0], [0.5, 10], [1, 0]] as const;
  assert.equal(track(stops, 0, lin), 0);
  assert.equal(track(stops, 0.5, lin), 10);
  near(track(stops, 0.25, lin), 5);
  near(track(stops, 0.25, EASE), 10 * EASE(0.5));
  assert.equal(track(stops, 2, lin), 0);
});

test('which frame a strip shows: a pack strip turns through five frames or ends on its sixth; a painted one holds its last; a staged one goes down its rows', () => {
  // (`.ecSp.loop`: steps(5) over 0.42 s, never the sixth frame)
  assert.deepEqual([0, 83, 84, 167, 419, 420, 504].map((t) => packFrame(t, 420, true)), [0, 0, 1, 1, 4, 0, 1]);
  // (`.ecSp.once`: forwards, so it rests on the sixth)
  assert.deepEqual([0, 100, 449, 450, 9000].map((t) => packFrame(t, 450, false)), [0, 1, 4, 5, 5]);
  // (`steps(n, jump-none)`: n frames, each an equal share)
  assert.deepEqual([-50, 0, 95, 96, 1149, 1150, 5000].map((t) => fxFrame(t, 1150, 12, false)), [0, 0, 0, 1, 11, 11, 11]);
  assert.equal(fxFrame(1150 + 96, 1150, 12, true), 1, 'a loop turns on');
  // (Askel's explosion: 16 frames, 8 to a row, 1.5 s: the first row in the first half)
  assert.deepEqual(stageCell(0, 1500, 8, 2), { col: 0, row: 0 });
  assert.deepEqual(stageCell(749, 1500, 8, 2), { col: 7, row: 0 });
  assert.deepEqual(stageCell(750, 1500, 8, 2), { col: 0, row: 1 });
  assert.deepEqual(stageCell(1499, 1500, 8, 2), { col: 7, row: 1 });
  assert.deepEqual(stageCell(9999, 1500, 8, 2), { col: 7, row: 1 });
  assert.deepEqual(stageCell(190 + 94, 1500, 8, 2), { col: 3, row: 0 }, 'begun part-way (a negative delay): already blown out');
  assert.deepEqual(stageCell(1500 + 130, 1500, 12, 1, true), { col: 1, row: 0 }, 'the embers loop along their one row');
});

test('how solid a strip is: unseen through its wait, whole, then faded; over when its fade is done', () => {
  assert.equal(fxAlpha(-10, 620, 100), 0, 'waiting: unseen');
  assert.equal(fxAlpha(-10, 620, -40), 1, 'begun part-way: seen at once');
  assert.equal(fxAlpha(499, 620, 0), 1);
  assert.ok(fxAlpha(560, 620, 0)! < 1 && fxAlpha(560, 620, 0)! > 0, 'fading from 120 ms before its last frame');
  assert.equal(fxAlpha(620 + 120, 620, 0), null, 'gone 240 ms later');
  assert.equal(fxAlpha(100, 1300, 520, 0.95), 1, 'a strip that waited comes on whole (the firestorm), as the stylesheet had it');
  assert.equal(fxAlpha(100, 1300, 0, 0.95), 0.95);
  assert.equal(stageAlpha(100, 1500, 60, 0.62), 1, 'and the smoke, which waits');
  near(stageAlpha(1460, 1500, 0)!, 0.5);
  assert.equal(stageAlpha(1500, 1500, 0), null);
  assert.equal(loopAlpha(0), 0);
  assert.equal(loopAlpha(500), 1);
  // (reduced motion: a held frame fading in and out over its life)
  assert.equal(stillAlpha(-1, 900), 0);
  near(stillAlpha(180, 900), 0.9);
  near(stillAlpha(630, 900), 0.8);
  assert.equal(stillAlpha(900, 900), 0);
  assert.equal(flareAlpha(500, 450), 1);
  assert.equal(flareAlpha(450 + 150 + 350, 450), null);
  near(lingerAlpha(2400 * 0.12)!, 0.95);
  assert.equal(lingerAlpha(2400), null);
  near(holdAlpha(900, 1800)!, 0.95);
  assert.equal(eased(0, 1, 180, 180), 1);
  near(eased(1, 1.25, 125, 250), 1 + 0.25 * EASE(0.5));
});

test('the movers carry their strips as the stylesheet did: debris arcs up and falls, a boulder drops, motes and embers rise', () => {
  // (debris waits whole where it starts, is highest at 45%, and ends fallen and gone)
  assert.deepEqual(chipAt(-30, 760, 80, -100, 20), { dx: 0, dy: 0, alpha: 1 });
  const top = chipAt(760 * 0.45, 760, 80, -100, 20)!;
  near(top.dx, 48);
  near(top.dy, -100);
  near(top.alpha, 1);
  assert.equal(chipAt(760, 760, 80, -100, 20), null);
  const b0 = boulderAt(-5, 520, 300)!;
  assert.deepEqual([b0.dy, b0.alpha], [-300, 1]);
  near(boulderAt(520 * 0.8, 520, 300)!.dy, 0);
  assert.equal(boulderAt(520, 520, 300), null);
  assert.deepEqual(driftAt(-1, 1500, 10), { dx: 0, dy: 0, alpha: 0 });
  near(driftAt(1500 * 0.15, 1500, 10)!.alpha, 1);
  assert.ok(driftAt(1400, 1500, 10)!.dy < -55);
  assert.equal(driftAt(1500, 1500, 10), null);
  near(emberAt(1800 * 0.2, 1800, -90)!.alpha, 1);
  assert.equal(emberAt(1800, 1800, -90), null);
  assert.deepEqual(wakeAt(0, -14, -30), { dx: -0, dy: -0, alpha: 1 });
  assert.equal(wakeAt(900, -14, -30), null);
});

test('the colour filters worked into the small strips are the CSS ones', () => {
  const id = tintMatrix('');
  const px = [200, 100, 50, 255];
  tintPixels(px, id);
  assert.deepEqual(px, [200, 100, 50, 255]);
  const grey = [255, 0, 0, 255];
  tintPixels(grey, tintMatrix('grayscale(1)'));
  assert.deepEqual(grey, [54, 54, 54, 255], 'red to its luminance');
  const turned = [255, 0, 0, 255];
  tintPixels(turned, tintMatrix('hue-rotate(120deg)'));
  assert.ok(turned[1] > turned[0] && turned[1] > turned[2], 'red turned a third of the way round is green');
  const bright = [100, 100, 100, 128];
  tintPixels(bright, tintMatrix('brightness(1.2)'));
  assert.deepEqual(bright, [120, 120, 120, 128], 'brighter, as see-through as it was');
  const clear = [9, 9, 9, 0];
  tintPixels(clear, tintMatrix('brightness(3)'));
  assert.deepEqual(clear, [9, 9, 9, 0]);
  // (several functions, left to right: all grey first, so the turn changes nothing)
  const both = [255, 0, 0, 255];
  tintPixels(both, tintMatrix('grayscale(1) hue-rotate(90deg)'));
  assert.ok(Math.abs(both[0] - both[1]) <= 2 && Math.abs(both[1] - both[2]) <= 2);
});

test("a canvas is as sharp as the screen up to twice a page pixel, and a piece shares the last canvas only when lights alone lie after it", () => {
  assert.equal(canvasScale(1, false), 1);
  assert.equal(canvasScale(3, false), 2);
  assert.equal(canvasScale(3, true), 1.5);
  assert.equal(canvasScale(0, false), 1);
  assert.equal(sameCanvas([]), true);
  assert.equal(sameCanvas([{ light: true }, { light: true }]), true);
  assert.equal(sameCanvas([{ light: true }, { light: false }]), false, 'the great burst covers the strips before it: the next take a new canvas, over it');
  const draw = readFileSync('src/callCanvas.ts', 'utf8');
  assert.match(draw, /const BREAKERS = '\.ecRun, \.ecBurst, \.ecExtra, \.ecMon, \.ecBreath'/);
});

test('the pieces: each stands where its element stood, and reduced motion holds it as the stylesheet did', () => {
  const m = markPiece('mark.png', 100.4, 200.6, true, 1.3, 0, env());
  assert.equal(m.piece.pose(0)!.alpha, 0, 'a mark is unseen until it is laid');
  m.set(true, false, 1000);
  assert.equal(m.piece.pose(1180)!.alpha, 1);
  assert.deepEqual([m.piece.pose(1180)!.x, m.piece.pose(1180)!.y], [100, 201], 'on whole page pixels, as the elements were');
  m.set(true, true, 2000);
  near(m.piece.pose(2250)!.scale!, 1.3 * 1.25);
  m.set(false, false, 3000);
  assert.equal(m.piece.pose(3180)!.alpha, 0);
  assert.equal(m.piece.look.oy, 1, 'standing on its point');
  // (a flare with reduced motion stands on its first frame; without, it plays and goes)
  assert.deepEqual(flarePiece('f.png', 0, 0, false, 1.4, 450, 0, env(true)).pose(99999), { x: 0, y: 0, alpha: 1, scale: 1.4, col: 0 });
  assert.equal(flarePiece('f.png', 0, 0, false, 1.4, 450, 0, env()).pose(450 + 150 + 350), null);
  const chip = chipPiece('c.png', 'hue-rotate(235deg) saturate(1.4)', 50, 60, 1.7, 80, -100, 20, 40, 1000);
  assert.equal(chip.look.tint, 'hue-rotate(235deg) saturate(1.4)');
  assert.deepEqual([chip.pose(1010)!.x, chip.pose(1010)!.y, chip.pose(1010)!.alpha], [50, 60, 1]);
  assert.equal(chip.pose(1000 + 40 + 760), null);
  // (a painted pillar: its glow under it; with reduced motion its held frame, fading)
  const look = STRIKE_FX.askel;
  const pil = fxPiece(look.pillar, 10, 20, { delay: 85, glow: pillarGlow('#ff8a3a', false, false) }, 0, env());
  assert.equal(pil.pose(50)!.alpha, 0);
  assert.equal(pil.pose(85 + 200)!.alpha, 1);
  assert.equal(pil.look.w, Math.round(160 * look.pillar.scale));
  assert.equal(pil.look.glow!.blur, 10);
  const still = fxPiece(look.pillar, 10, 20, { delay: 85 }, 0, env(true));
  assert.equal(still.pose(85 + 400)!.col, look.pillar.hold);
  assert.equal(still.pose(85 + look.pillar.ms + 300), null);
  // (what lingers: under its patch's own fade, from its delay)
  const lin = fxPiece(look.after, 0, 0, { delay: -90, carrier: { kind: 'linger', delay: 500 } }, 0, env());
  assert.equal(lin.pose(400)!.alpha, 0);
  assert.ok(lin.pose(500 + 400)!.alpha > 0.9);
  assert.equal(lin.pose(500 + 2400), null);
});

test('a staged sheet: its glow sheet under its strip, the strip unsmoothed over its own glow; the smoke and the embers go with the call', () => {
  const st = STAGED.askel;
  const ex = stagePieces(st.explosion, 200, 300, 0.73, { delay: -190, mul: 1.25 }, '#ff8a3a', 0, env());
  assert.equal(ex.length, 2, 'a lit sheet: its glow sheet, then itself');
  assert.match(ex[0].look.src, /-glow\.webp$/);
  assert.equal(ex[0].look.bright, true);
  assert.equal(ex[1].look.crisp, true);
  assert.equal(ex[1].look.glow!.blur, 7);
  assert.deepEqual([ex[1].look.cols, ex[1].look.rows], [st.explosion.cols, Math.ceil(st.explosion.n / st.explosion.cols)]);
  assert.equal(ex[1].look.oy, st.explosion.foot / st.explosion.fh, 'standing on its ground point');
  assert.equal(ex[1].pose(0)!.alpha, 1, 'begun part-way: there in the frozen frame');
  assert.equal(ex[1].pose(st.explosion.ms), null);
  const smoke = stagePieces(st.smoke, 0, 0, 0.73, { delay: 500, kind: 'smoke' }, '#ff8a3a', 0, env())[0];
  assert.equal(smoke.look.glow, undefined);
  assert.equal(smoke.pose(400)!.alpha, 0);
  assert.equal(smoke.pose(700)!.alpha, 1);
  const going = stagePieces(st.smoke, 0, 0, 0.73, { delay: 500, kind: 'smoke' }, '#ff8a3a', 0, env(false, 600))[0];
  assert.equal(going.pose(700), null, 'gone the moment the call goes, as the page cut it');
  const embers = stagePieces(st.embers, 0, 0, 0.73, { loop: true, kind: 'embers' }, '#ff8a3a', 0, env())[0];
  assert.equal(embers.look.glow!.blur, 3);
  assert.equal(embers.pose(9000)!.alpha, 1, 'they fall on until the call goes');
  // (reduced motion: the steady frame, fading in and out)
  const held = stagePieces(st.fire, 0, 0, 0.73, { delay: 100 }, '#ff8a3a', 0, env(true))[0];
  assert.deepEqual([held.pose(400)!.col, held.pose(400)!.row], [st.fire.hold % st.fire.cols, Math.floor(st.fire.hold / st.fire.cols)]);
});

test("every Eidolon's glows are made ahead, each as its pieces ask for it", () => {
  assert.equal(hexA('#ff8a3a', 0.6), 'rgba(255, 138, 58, 0.6)');
  for (const e of EIDOLONS) {
    const glow = LOOKS[e.element].glow;
    const bakes = glowBakes(e.id, glow, e.element === 'dark');
    const look = STRIKE_FX[e.id];
    const pil = fxPiece(look.pillar, 0, 0, { glow: pillarGlow(glow, e.element === 'dark', look.sig.solid) }, 0, env());
    assert.ok(bakes.some((b) => b.src === pil.look.src && b.scale === pil.look.glowScale && JSON.stringify(b.glow) === JSON.stringify(pil.look.glow)), `${e.id}'s pillar`);
    for (const sh of [STAGED[e.id].pillar, STAGED[e.id].explosion, STAGED[e.id].fire]) {
      const strip = stagePieces(sh, 0, 0, 0.7, {}, glow, 0, env()).at(-1)!;
      assert.ok(bakes.some((b) => b.src === strip.look.src && b.scale === strip.look.glowScale && JSON.stringify(b.glow) === JSON.stringify(strip.look.glow)), `${e.id}'s ${sh.sheet}`);
    }
  }
  assert.deepEqual(glowBakes('nobody', '#fff', false), []);
});

test('no strip of the call is a page element stepped by the stylesheet, but a run; the canvases are drawn by the call\'s own clock', () => {
  const call = readFileSync('src/eidolonCall.ts', 'utf8');
  assert.doesNotMatch(call, /stageEls?\(/);
  assert.equal(call.match(/el\('i', 'ecSp /g)?.length, 1, "only a run's head is an element strip");
  for (const cls of ['ecChip', 'ecDrift', 'ecLinger', 'ecBoulder', 'ecEmber', 'ecFrostHold', 'ecWake', 'ecFlare', 'ecMark', 'ecPillar']) assert.doesNotMatch(call, new RegExp(`el\\('i', [\`']${cls}`), `${cls} is a piece`);
  assert.match(call, /this\.cc\.draw\(this\.pieceClock\)/);
  assert.match(call, /this\.cc\.begin\(settings\(\)\.saver\)/);
  // (the fight's speed is never written from here: ULT-EPIC)
  assert.doesNotMatch(readFileSync('src/callCanvas.ts', 'utf8') + readFileSync('src/callPieces.ts', 'utf8'), /speed/);
});
