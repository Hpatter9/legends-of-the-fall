// The Eidolon's staged ground show (EIDOLON-BLENDER, docs/notes/eidolon-blender.md; `src/eidolonStage.ts`): the sheets are in the game with
// the frames they say and small, the sigil is drawn, glows and cools by the call's own beats (there from the start in the short call,
// one steady frame with reduced motion), the painting leaps out of the pillar at the sigil, and the strike crosses the foes' ground the
// same way every time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { BLOW, BLOW_FEEL, cracksFrame, CRACKS_MS, CRACKS_OPEN_MS, DETONATIONS, glowUrl, SMOKE_SPOTS, frameAt, pillarAt, pillarMs, riseIn, risePass, RISE_MS, scorchFrame, SCORCH_COOL_MS, SCORCH_FADE_MS, sigilEnd, sigilFrame, sigilSpot, stageBudget, STAGED, STAGE_SHEETS, stageUrl, wavePlan, WAVE_MS, type StageTile } from '../src/eidolonStage';
import { fullOf, SHORT } from '../src/eidolonRules';
import { PASS, passPose } from '../src/eidolonPass';
import { eidolonById } from '../src/sim/eidolons';

/** A webp's size (the VP8X header's canvas, or the VP8L or VP8 header's 14-bit width and height). */
function webpSize(f: string): [number, number] {
  const b = readFileSync(f);
  if (b.toString('ascii', 12, 16) === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  // (a lossy sheet: the VP8 frame header's 14-bit width and height)
  if (b.toString('ascii', 12, 16) === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  assert.equal(b.toString('ascii', 12, 16), 'VP8L', f);
  const bits = b.readUInt32LE(21);
  return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
}

test('the staged sheets are in the game with the frames they say, fit a phone texture and are small', () => {
  let bytes = 0;
  for (const s of STAGE_SHEETS) {
    const f = `src/art/eidolons/fx/${s.sheet}.webp`;
    assert.ok(existsSync(f), f);
    const [w, h] = webpSize(f);
    assert.equal(w, s.fw * s.cols, `${f}: ${s.cols} frames to a row`);
    assert.equal(h, s.fh * Math.ceil(s.n / s.cols), `${f}: ${s.n} frames`);
    assert.ok(w <= 4096 && h <= 4096, f);
    assert.ok(s.hold >= 0 && s.hold < s.n && s.foot > 0 && s.foot <= s.fh, s.sheet);
    assert.equal(stageUrl(s), `eidolons/fx/${s.sheet}.webp`);
    const last = frameAt(s, s.n - 1);
    assert.ok(last.x + s.fw <= w && last.y + s.fh <= h, s.sheet);
    bytes += statSync(f).size;
    if (s.lit) {
      // (its glow sheet: the same frames in the same places, a quarter of the size)
      const g = `src/art/${glowUrl(s)}`;
      assert.ok(existsSync(g), g);
      assert.deepEqual(webpSize(g), [w / 4, h / 4], g);
      bytes += statSync(g).size;
    }
  }
  // (an Eidolon's whole staged show: under 600 KB)
  assert.ok(bytes / Object.keys(STAGED).length < 600_000, `${bytes} bytes`);
  for (const id of Object.keys(STAGED)) assert.ok(eidolonById(id), id);
  // (played as strips on the page, they are a single row; the ground's sheets are cut by the board's renderer)
  for (const l of Object.values(STAGED)) for (const s of [l.pillar, l.fire, l.smoke, l.embers]) assert.equal(s.cols, s.n, s.sheet);
  // (the explosion is rows of frames, every row full, so the strip steps along each in turn)
  for (const l of Object.values(STAGED)) assert.equal(l.explosion.n % l.explosion.cols, 0);
});

test('the sheets are credited and kept for offline play', () => {
  for (const id of Object.keys(STAGED)) assert.match(readFileSync('CREDITS.md', 'utf8'), new RegExp(`${id}-stage-`), id);
  assert.match(readFileSync('build.mjs', 'utf8'), /EIDOLON_ART_FILES\.push\(`eidolons\/fx\/\$\{f\}`\)/);
});

test('the sigil is drawn while the horn sounds, glows until the aftermath, then cools into the fight', () => {
  const look = STAGED.askel;
  const m = fullOf('askel');
  const s = look.sigil;
  assert.equal(s.draw + s.glow + s.cool, s.n);
  assert.equal(sigilFrame(look, m, -1), null);
  assert.equal(sigilFrame(look, m, 0)?.frame, 0);
  let was = -1;
  for (let t = 0; t < m.PASS; t += 16) {
    const f = sigilFrame(look, m, t)!;
    assert.ok(f.frame >= was && f.frame < s.draw, `${t}`);
    was = f.frame;
  }
  assert.equal(was, s.draw - 1, 'fully drawn as the pillar goes up');
  for (let t = m.PASS; t < m.AFTER; t += 16) {
    const f = sigilFrame(look, m, t)!;
    assert.ok(f.frame >= s.draw && f.frame < s.draw + s.glow && f.alpha === 1, `${t}`);
  }
  was = s.draw + s.glow - 1;
  for (let t = m.AFTER; t < sigilEnd(m); t += 16) {
    const f = sigilFrame(look, m, t)!;
    assert.ok(f.frame >= was && f.frame < s.n, `${t}`);
    was = f.frame;
  }
  assert.equal(was, s.n - 1);
  assert.ok(sigilEnd(m) > m.RESUME, 'it cools on under the fight');
  assert.equal(sigilFrame(look, m, sigilEnd(m)), null);
});

test('the short call has the sigil there from the start, and a quicker pillar', () => {
  const look = STAGED.askel;
  const s = look.sigil;
  for (let t = 0; t < SHORT.AFTER; t += 16) assert.ok(sigilFrame(look, SHORT, t)!.frame >= s.draw, `${t}: never half drawn`);
  assert.ok(sigilFrame(look, SHORT, 16)!.alpha < 1 && sigilFrame(look, SHORT, 400)!.alpha === 1);
  assert.equal(pillarAt(SHORT), 0);
  assert.ok(pillarMs(look, SHORT) < pillarMs(look, fullOf('askel')));
  assert.ok(pillarAt(SHORT) + pillarMs(look, SHORT) <= SHORT.STRIKE, 'the pillar is done before the blow');
  const m = fullOf('askel');
  assert.ok(pillarAt(m) < m.PASS && pillarAt(m) + pillarMs(look, m) <= m.EXIT, 'it burns as the painting leaps out, gone before it has left');
  const b = stageBudget(false, true);
  const full = stageBudget(false, false);
  const saver = stageBudget(true, false);
  assert.ok(b.tiles < full.tiles && b.smokes < full.smokes && saver.tiles < full.tiles);
});

test('reduced motion: one steady frame of the sigil and the scorch, faded in and out', () => {
  const look = STAGED.askel;
  const m = fullOf('askel');
  const seen = new Set<number>();
  for (let t = 0; t < sigilEnd(m); t += 16) {
    const f = sigilFrame(look, m, t, true)!;
    seen.add(f.frame);
    assert.ok(f.alpha >= 0 && f.alpha <= 1);
  }
  assert.deepEqual([...seen], [look.sigil.hold]);
  assert.equal(sigilFrame(look, m, 0, true)!.alpha, 0);
  assert.equal(sigilFrame(look, m, 1000, true)!.alpha, 1);
  for (let age = 0; age < SCORCH_COOL_MS + SCORCH_FADE_MS; age += 50) assert.equal(scorchFrame(look, age, true), look.scorch.hold);
});

test('the painting leaps out of the pillar at the sigil and goes on its own way', () => {
  const spec = PASS.askel;
  const ground = 0.45;
  const rise = risePass(spec, 0.7, 0.47, ground);
  const start = passPose(rise, 0, ground);
  assert.ok(Math.abs(start.x - 0.7) < 1e-9 && Math.abs(start.y - 0.47) < 1e-9, 'it starts on the sigil');
  const end = passPose(rise, 1, ground);
  const was = passPose(spec, 1, ground);
  assert.ok(Math.abs(end.x - was.x) < 1e-9, 'and leaves where it always left');
  assert.equal(rise.gait, spec.gait);
  assert.ok(rise.hops >= 2 && rise.hops <= spec.hops);
  const m = fullOf('askel');
  assert.equal(riseIn(m, m.PASS), 0);
  assert.equal(riseIn(m, m.PASS + RISE_MS), 1);
  assert.ok(riseIn(m, m.PASS + RISE_MS / 2) > 0.4 && riseIn(m, m.PASS + RISE_MS / 2) < 0.6);
});

test('the sigil lies on a tile on the side the painting comes from, wholly on the screen', () => {
  const tiles: StageTile[] = [];
  for (let u = 0; u < 8; u++) for (let v = 0; v < 11; v++) tiles.push({ u, v, x: 196 + (u - v) * 30, y: 300 + (u + v) * 15 });
  const right = sigilSpot(tiles, 393, 852, 0.5, 'right')!;
  const left = sigilSpot(tiles, 393, 852, 0.5, 'left')!;
  assert.ok(right.x > 196 && right.x <= 393 * 0.76);
  assert.ok(left.x < 196 && left.x >= 393 * 0.24);
  assert.ok(Math.abs(right.y - 426) < 40 && Math.abs(left.y - 426) < 40, 'on the ground line');
  assert.equal(sigilSpot([{ u: 0, v: 0, x: 5, y: 400 }], 393, 852, 0.5, 'right'), null);
});

test('the strike crosses the foes\' ground: every foe\'s tile burns, the nearest to the jaws first, the same every time', () => {
  const tileAt = (u: number, v: number) => (u >= 0 && v >= 0 && u < 8 && v < 11 ? { x: 196 + (u - v) * 30, y: 300 + (u + v) * 15 } : null);
  const foes = [{ u: 2, v: 1 }, { u: 5, v: 2 }, { u: 7, v: 0 }, { u: 5, v: 2 }];
  const from = { x: 40, y: 380 };
  const full = wavePlan(foes, tileAt, from, stageBudget(false, false));
  for (const f of foes) assert.ok(full.some((t) => t.u === f.u && t.v === f.v && t.foe), `${f.u},${f.v}`);
  assert.equal(full.filter((t) => t.foe).length, 3, 'a tile burns once');
  assert.equal(new Set(full.map((t) => `${t.u},${t.v}`)).size, full.length);
  assert.equal(full.length, 3 + stageBudget(false, false).tiles);
  for (const t of full) assert.ok(tileAt(t.u, t.v) && t.delay >= 0 && t.delay <= WAVE_MS);
  for (let i = 1; i < full.length; i++) assert.ok(full[i].delay >= full[i - 1].delay);
  const dist = (t: StageTile) => Math.hypot(t.x - from.x, (t.y - from.y) * 2);
  assert.ok(dist(full[0]) <= dist(full[full.length - 1]), 'from the jaws outward');
  assert.equal(full[full.length - 1].delay, WAVE_MS);
  assert.equal(full.filter((t) => t.smoke).length, stageBudget(false, false).smokes);
  assert.deepEqual(wavePlan(foes, tileAt, from, stageBudget(false, false)), full);
  const saver = wavePlan(foes, tileAt, from, stageBudget(true, false));
  assert.ok(saver.length < full.length && saver.filter((t) => t.foe).length === 3);
  assert.deepEqual(wavePlan([], tileAt, from, stageBudget(false, false)), []);
  // (with no jaws to start from, it spreads from the foes' own middle)
  assert.ok(wavePlan(foes, tileAt, null, stageBudget(false, false)).length === full.length);
});

test('the scorched ground cools, then fades, then is gone', () => {
  const look = STAGED.askel;
  const s = look.scorch;
  assert.equal(scorchFrame(look, -1), -1);
  assert.equal(scorchFrame(look, 0), 0);
  let was = 0;
  for (let age = 0; age < SCORCH_COOL_MS + SCORCH_FADE_MS; age += 20) {
    const f = scorchFrame(look, age);
    assert.ok(f >= was && f < s.n);
    assert.equal(f < s.hot, age < SCORCH_COOL_MS);
    was = f;
  }
  assert.equal(was, s.n - 1);
  assert.equal(scorchFrame(look, SCORCH_COOL_MS + SCORCH_FADE_MS), -1);
});

test('the ground breaks open in a rush, then cools and goes dark', () => {
  const look = STAGED.askel;
  const s = look.cracks;
  assert.equal(cracksFrame(look, -1), -1);
  let was = 0;
  for (let age = 0; age < CRACKS_MS; age += 16) {
    const f = cracksFrame(look, age);
    assert.ok(f >= was && f < s.n, `${age}`);
    assert.equal(f < s.open, age < CRACKS_OPEN_MS, `${age}`);
    was = f;
  }
  assert.equal(was, s.n - 1);
  assert.equal(cracksFrame(look, CRACKS_MS), -1);
  assert.ok(CRACKS_OPEN_MS <= 400, 'open within the blow');
  for (let age = 0; age < CRACKS_MS; age += 100) assert.equal(cracksFrame(look, age, true), s.hold);
});

test('the blow is wider than the screen and hits harder than the painted one; two more detonations roll to either side', () => {
  const look = STAGED.askel;
  // (at the smallest phone, 360 px across, with the board at its usual scale of about 0.9: a sheet px is about 1.27 screen px)
  assert.ok(look.explosion.fw * 1.27 * BLOW.mul > 412, 'wider than the widest phone');
  assert.ok(BLOW.lead > 0 && BLOW.lead < look.explosion.ms / 4, 'the frozen frame is the white core, early in its frames');
  assert.ok(BLOW_FEEL.flash > 0.8 && BLOW_FEEL.shake > 1);
  assert.equal(DETONATIONS.length, 2);
  assert.ok(DETONATIONS[0].dx < 0 && DETONATIONS[1].dx > 0);
  for (const d of DETONATIONS) assert.ok(d.mul < 1 && d.mul > 0.5);
  assert.equal(SMOKE_SPOTS[0], 0);
  assert.ok(SMOKE_SPOTS.length >= stageBudget(false, false).smokes);
});

test('every staged Eidolon has its own sheets, the same places in the call, and comes on from the side its painting does', () => {
  for (const [id, l] of Object.entries(STAGED)) {
    for (const s of [l.sigil, l.pillar, l.explosion, l.cracks, l.fire, l.scorch, l.smoke, l.embers]) assert.ok(s.sheet.startsWith(`${id}-stage-`), s.sheet);
    assert.equal(l.sigil.draw + l.sigil.glow + l.sigil.cool, l.sigil.n, id);
    assert.ok(l.cracks.open > 0 && l.cracks.open < l.cracks.n && l.scorch.hot > 0 && l.scorch.hot < l.scorch.n, id);
    // (the sigil lies where the painting comes on: the side its pass starts from)
    assert.equal(l.from, PASS[id].path[0][0] < 0.5 ? 'left' : 'right', id);
    const m = fullOf(id);
    assert.ok(pillarAt(m) + pillarMs(l, m) <= m.EXIT, `${id}: the pillar is done before the painting has left`);
    assert.ok(l.explosion.ms <= m.RESUME - m.STRIKE + 900, `${id}: the blow is over soon after the fight runs again`);
    for (let t = 0; t < sigilEnd(m); t += 50) assert.ok(sigilFrame(l, m, t), `${id} ${t}`);
  }
});
