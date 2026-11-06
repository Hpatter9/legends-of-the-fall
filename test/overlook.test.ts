import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES, bossesOf } from '../src/sim/armies';
import { DAILY_FOOT, overlookCrew, overlookLayout, overlookRanks, SCOUT_CAMPS, scoutCamp, STAND_TOWER } from '../src/render/overlookLayout';
import { CLIFF, cliffIn, inside, onLedge, pickSpot, ROAM, walkInside, type Pt } from '../src/render/cliffRoam';
import { mixSeed, Rng } from '../src/sim/rng';

test('the overlook shows each army’s field troops, leaving its bosses for the leader', () => {
  for (const army of ARMIES) {
    const crew = overlookCrew(army);
    assert.ok(crew.length > 0, army.id);
    assert.equal(crew.length, new Set(crew).size);
    const bosses = new Set(bossesOf(army).map((b) => b.id));
    assert.ok(crew.every((k) => !bosses.has(k)), army.id);
    for (const wave of army.waves) {
      for (const foe of wave.foes) if (!bosses.has(foe)) assert.ok(crew.includes(foe));
    }
  }
});

test('portrait layouts keep mode controls, chests and party on separate ground', () => {
  for (const [w, h] of [[360, 535], [393, 607], [412, 670]]) {
    const c = overlookLayout(w, h);
    const { daily, tower, calamity } = c.places;
    // (OVERLOOK-STAND, the owner's ask: the Last Stand left the plaque row for the watchtower painted on the left; the Daily board has the row
    //  to itself. Before, this checked the Daily plaque stood left of the Last Stand's on that row)
    assert.ok(tower.box.x + tower.box.w < calamity.box.x, 'the tower and the Calamity at opposite sides');
    assert.ok(tower.box.y + tower.box.h < h * 0.3 && tower.box.y + tower.box.h < daily.box.y - 100, 'the tower high on the left, far above the Daily board');
    for (const p of [daily, tower, calamity]) {
      assert.ok(p.box.x >= 0 && p.box.x + p.box.w <= w);
      assert.ok(p.box.y >= 0 && p.box.y + p.box.h <= h);
      assert.ok(p.box.w >= 44 && p.box.h >= 44);
    }
    assert.ok(calamity.box.y + calamity.box.h < h * 0.3);
    // (UI batch 1: the Daily is a small icon at the right edge above the Battle bar; the heroes' feet stand above it)
    assert.ok(c.heroes.every((p) => p.y > h * 0.7 && p.y < daily.box.y));
    assert.ok(c.stash.x + c.stash.w < w / 2 - 109, 'chests clear of army plaque');
    assert.ok(c.stash.x + c.stash.w <= daily.box.x, 'chests and the Daily icon on opposite sides');
    const ranks = overlookRanks(w, h);
    assert.ok(ranks.length > 0 && ranks.length < 30);
    assert.deepEqual(ranks, overlookRanks(w, h));
    assert.ok(ranks.every((p) => p.x > w * 0.2 && p.x < w * 0.95 && p.y > h * 0.38 && p.y < h * 0.63));
  }
});


test('every army has its own camp painting and a different arrangement of occupants', () => {
  const paintings = new Set<string>();
  const patrols = new Set<string>();
  for (const army of ARMIES) {
    assert.ok(Object.hasOwn(SCOUT_CAMPS, army.id), army.id);
    const camp = scoutCamp(army.id);
    paintings.add(`${camp.atlas}:${camp.row}`);
    const ranks = overlookRanks(393, 607, army.id);
    patrols.add(JSON.stringify(ranks));
    assert.ok(ranks.length >= 8 && ranks.length < 30, 'small groups around the camp');
    assert.ok(ranks.every((p) => p.x > 0 && p.x < 393 && p.y > 607 * 0.32 && p.y < 607 * 0.64));
    assert.ok(camp.boss.every((v) => v > 0 && v < 1));
  }
  assert.equal(paintings.size, ARMIES.length);
  assert.equal(patrols.size, ARMIES.length);
  assert.equal(scoutCamp('unknown'), SCOUT_CAMPS.orcs);
});

test('the Last Stand’s place covers the painted watchtower and its plate hangs under the tower’s foot (OVERLOOK-STAND)', () => {
  for (const [w, h] of [[360, 535], [393, 607], [412, 670]]) {
    const { tower, daily } = overlookLayout(w, h).places;
    const t = STAND_TOWER;
    // (the whole painted tower, side to side and top to foot, is inside the tap box)
    assert.ok(tower.box.x <= w * t.left && tower.box.x + tower.box.w >= w * t.right, `tower across at ${w}`);
    assert.ok(tower.box.y <= h * t.top && tower.plate.y >= h * t.base, `tower top to foot at ${w}`);
    assert.ok(tower.box.w >= 96 && tower.box.h >= 96, 'a generous tap box');
    // (the plate is the box's foot, clear of the Daily board; CLIFF-ROAM: the stall below it has gone to the tavern)
    assert.equal(tower.plate.y + tower.plate.h, tower.box.y + tower.box.h);
    // (UI batch 1: the Daily is a small icon at the right edge, a thumb wide, clear of the tower)
    assert.ok(daily.box.x + daily.box.w <= w && daily.box.x > w / 2 && daily.box.w >= 44 && daily.box.w <= 64, 'the Daily icon at the right edge');
    // (DAILY-LOW: down in the scene's bottom corner beside the enemy banner, not floating halfway up the cliff)
    const gap = h - (daily.box.y + daily.box.h);
    assert.ok(gap >= 4 && gap <= 20, `the Daily low in the corner at ${w}`);
  }
});

// CLIFF-ROAM: this replaces the CAMP-DEPTH test of Hester's Stall set back behind the heroes: the stall has gone to the tavern, and the
// heroes wander the whole ledge, so what is checked now is that ledge and the walks on it.
test('the heroes wander only the cliff’s ledge, clear of the drop, the sky, the fire, the plates and the Daily (CLIFF-ROAM)', () => {
  // (the overlook's own layout has no stall any more)
  assert.ok(!('stall' in overlookLayout(393, 607).places));
  // (the scenes the overlook is drawn at: the three test sizes, and the three phones' own, 393x852, 360x780 and 412x915)
  for (const [w, h] of [[360, 535], [393, 607], [412, 670], [393, 624], [360, 554], [412, 687]]) {
    const camp = overlookLayout(w, h);
    const poly = cliffIn(w, h);
    // (each hero's first spot is on the ledge, so the walks start on the rock)
    for (const s of camp.heroes) assert.ok(inside([s.x, s.y], poly), `start ${s.x},${s.y} at ${w}`);
    // (the ledge is the cliff's foreground: behind its rim is the valley and the enemy camp, which ends at 0.64 of the scene)
    const ys = poly.map((p) => p[1]);
    const xs = poly.map((p) => p[0]);
    assert.ok(Math.min(...ys) >= h * 0.62, 'never up into the valley or the camp');
    assert.ok(Math.min(...xs) >= 0 && Math.max(...xs) <= w * 0.86, 'never past the lip on the right');
    // (a hero is drawn up from their feet, so the lowest feet stay above the army's plate (it sits at least 10 px over the scene's foot and is
    //  about 60 tall) and the Daily icon's box)
    const daily = camp.places.daily.box;
    assert.ok(Math.max(...ys) < h - 70, `above the Enemy below plate at ${w}`);
    assert.ok(Math.max(...ys) < daily.y && daily.y + daily.h === h - DAILY_FOOT, `above the Daily at ${w}`);
    // (the fire's picture, 66 across, is never walked through: the ledge keeps a hero's feet off it)
    for (let x = camp.fire.x - 33; x <= camp.fire.x + 33; x += 3) for (let y = camp.fire.y - 10; y <= camp.fire.y + 4; y += 2) assert.ok(!inside([x, y], poly), `the fire at ${w}`);
    // (the chests by the supplies)
    const st = camp.stash;
    assert.ok(!inside([st.x + st.w / 2, st.y + st.h / 2], poly), 'off the chests');
    // (many seeded walks: every picked spot is on the ledge, every walk to it stays on it, and none ends on top of another hero)
    const rng = new Rng(mixSeed(7, w * 1000 + h));
    const rand = () => rng.next();
    const at: Pt[] = camp.heroes.map((s) => [s.x, s.y]);
    let walks = 0;
    for (let t = 0; t < 4000; t++) {
      const i = t % at.length;
      const others = at.filter((_, j) => j !== i);
      const to = pickSpot(at[i], poly, others, rand);
      if (!to) continue;
      walks++;
      assert.ok(inside(to, poly), `spot ${to} on the ledge at ${w}`);
      assert.ok(walkInside(at[i], to, poly), `walk ${at[i]} → ${to} stays on the ledge at ${w}`);
      for (let k = 0; k <= 20; k++) assert.ok(inside([at[i][0] + ((to[0] - at[i][0]) * k) / 20, at[i][1] + ((to[1] - at[i][1]) * k) / 20], poly), 'every step of the walk');
      const len = Math.hypot(to[0] - at[i][0], to[1] - at[i][1]);
      assert.ok(len >= ROAM.minStep * 0.45 - 1e-9 && len <= ROAM.maxStep + 1e-9, 'a comfortable stroll');
      assert.ok(others.every((o) => Math.hypot(o[0] - to[0], (o[1] - to[1]) * 1.6) >= ROAM.apart), 'not on top of another hero');
      at[i] = to;
    }
    assert.ok(walks > 2500, `the heroes do wander at ${w} (${walks} walks)`);
    // (they reach the whole ledge, the left by the fire to the lip on the right, back to front)
    const seen: Pt[] = [];
    const rng2 = new Rng(mixSeed(11, w));
    let p: Pt = [camp.heroes[0].x, camp.heroes[0].y];
    for (let t = 0; t < 3000; t++) {
      const to = pickSpot(p, poly, [], () => rng2.next());
      if (to) seen.push((p = to));
    }
    assert.ok(Math.min(...seen.map((q) => q[0])) < w * 0.22 && Math.max(...seen.map((q) => q[0])) > w * 0.75, `across the whole ledge at ${w}`);
    assert.ok(Math.min(...seen.map((q) => q[1])) < h * 0.66 && Math.max(...seen.map((q) => q[1])) > h * 0.8, `back to front at ${w}`);
  }
});

test('a walk that would leave the ledge is refused, and a hero off it is brought back on (CLIFF-ROAM)', () => {
  const poly = cliffIn(393, 624);
  const mid: Pt = [393 * 0.5, 624 * 0.73];
  assert.ok(inside(mid, poly));
  // (out over the drop on the right, up into the valley, down onto the plate, into the fire)
  assert.ok(!walkInside(mid, [393 * 0.95, 624 * 0.73], poly));
  assert.ok(!walkInside(mid, [393 * 0.5, 624 * 0.5], poly));
  assert.ok(!walkInside(mid, [393 * 0.5, 624 * 0.95], poly));
  assert.ok(!walkInside(mid, [393 * 0.09, 624 * 0.8], poly));
  // (two spots on the rock with the fire's corner between them: the straight walk would cut across it)
  const a: Pt = [393 * 0.125, 624 * 0.705];
  const b: Pt = [393 * 0.23, 624 * 0.826];
  assert.ok(inside(a, poly) && inside(b, poly));
  assert.ok(!walkInside(a, b, poly), 'no short cut over the fire’s corner');
  // (a point off the ledge, after a resize, comes back onto it; one on it stays)
  for (const q of [[0, 0], [393, 624], [393 * 0.9, 624 * 0.72], [10, 624 * 0.8]] as Pt[]) assert.ok(inside(onLedge(q, poly), poly));
  assert.deepEqual(onLedge(mid, poly), mid);
  // (the polygon is the scene's fractions, so every size has the same ledge)
  assert.ok(CLIFF.every(([x, y]) => x > 0 && x < 1 && y > 0 && y < 1));
});
