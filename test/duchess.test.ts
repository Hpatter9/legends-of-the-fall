import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng } from '../src/sim/rng';
import {
  chewBob,
  DUCHESS_COSMETICS,
  DUCHESS_LORE_SNIPPETS,
  FRAME,
  goatFrame,
  GOAT_SPEED,
  HOP_MS,
  HOP_PX,
  hopLift,
  newDuchessBattleState,
  newGoat,
  NIBBLE_MS,
  resetDuchessBattle,
  rollDailyTreat,
  stepGoat,
  tapGoat,
  tapNudgeGoat,
  triggerLuckyBleat,
  type Ground,
} from '../src/render/duchessRules';
import { startStage } from '../src/sim/run';
import { newRun } from '../src/sim/run';
import { stepBattle } from '../src/sim/battle';

const ground: Ground = { min: 40, max: 240, friends: [100, 180] };

/** Run her for `ms` of game time and give back where she has been. */
function run(seed: number, ms: number, g = newGoat(120), gr = ground, still = false) {
  const rng = new Rng(seed);
  const rand = () => rng.next();
  const seen = { modes: new Set<string>(), xs: [] as number[] };
  for (let t = 0; t < ms; t += 50) {
    stepGoat(g, 50, t, gr, rand, still);
    seen.modes.add(g.mode);
    seen.xs.push(g.x);
  }
  return { g, seen };
}

test('Duchess stays on her ground', () => {
  for (let seed = 1; seed < 20; seed++) {
    const { seen } = run(seed, 120000);
    for (const x of seen.xs) assert.ok(x >= ground.min && x <= ground.max, `x ${x}`);
  }
});

test('she grazes, ambles, and goes to nibble at a hero', () => {
  const seen = new Set<string>();
  let nibbledNear = false;
  for (let seed = 1; seed < 20; seed++) {
    const rng = new Rng(seed);
    const g = newGoat(120);
    for (let t = 0; t < 120000; t += 50) {
      stepGoat(g, 50, t, ground, () => rng.next());
      seen.add(g.mode);
      if (g.mode === 'nibble' && ground.friends.some((f) => Math.abs(f - g.x) <= 14.5)) nibbledNear = true;
    }
  }
  for (const m of ['graze', 'walk', 'nibble']) assert.ok(seen.has(m), m);
  assert.ok(nibbledNear, 'a nibble happens beside a hero');
});

test('she walks at an amble, not a dash', () => {
  const g = newGoat(40);
  g.mode = 'walk';
  g.to = 240;
  g.then = 'graze';
  stepGoat(g, 1000, 0, ground, () => 0.5);
  assert.ok(Math.abs(g.x - 40 - GOAT_SPEED) < 0.01);
});

test('a tap is one hop, over by itself, and a second tap inside it is ignored', () => {
  const g = newGoat(100);
  assert.equal(hopLift(g, 0), 0);
  assert.ok(tapGoat(g, 1000));
  assert.equal(tapGoat(g, 1100), false);
  let top = 0;
  for (let t = 1000; t <= 1000 + HOP_MS; t += 10) top = Math.max(top, hopLift(g, t));
  assert.ok(top > HOP_PX - 0.5 && top <= HOP_PX);
  assert.equal(hopLift(g, 1000 + HOP_MS), 0, 'back on the ground');
  stepGoat(g, 50, 1000 + HOP_MS, ground, () => 0.5);
  assert.equal(g.mode, 'graze');
  assert.ok(tapGoat(g, 3000), 'she can hop again later');
});

test('a hop never leaves her anywhere but where she was', () => {
  const g = newGoat(100);
  tapGoat(g, 0);
  for (let t = 0; t <= HOP_MS + 100; t += 50) stepGoat(g, 50, t, ground, () => 0.5);
  assert.equal(g.x, 100);
});

test('under reduced motion she stands still, but still hops when tapped', () => {
  const { g, seen } = run(3, 60000, newGoat(120), ground, true);
  assert.equal(g.x, 120);
  assert.deepEqual([...seen.modes], ['graze']);
  assert.equal(chewBob(g, 1000, true), 0);
  tapGoat(g, 61000);
  assert.equal(g.mode, 'hop');
});

test('her frames are on the sheet, facing the way she walks', () => {
  const g = newGoat(100);
  g.face = -1;
  assert.equal(goatFrame(g), 1);
  g.face = 1;
  assert.equal(goatFrame(g), 4);
  g.mode = 'walk';
  for (let s = 0; s < 40; s += 1) {
    g.steps = s;
    const f = goatFrame(g);
    assert.ok(f >= 3 && f <= 5);
  }
  assert.equal(FRAME, 48);
});

test('chewing is a one-pixel bob, only while she grazes or nibbles', () => {
  const g = newGoat(100);
  const seen = new Set<number>();
  for (let t = 0; t < 2000; t += 100) seen.add(chewBob(g, t, false));
  assert.deepEqual([...seen].sort(), [0, 1]);
  g.mode = 'walk';
  assert.equal(chewBob(g, 100, false), 0);
  assert.ok(NIBBLE_MS > 1000);
});

test('a visit comes to about one fight in four or five, and always has its times in range', async () => {
  const { rollVisit, VISIT_ARRIVE_MS, VISIT_STAY_MS } = await import('../src/render/duchessRules');
  const rng = new Rng(77);
  let n = 0;
  for (let i = 0; i < 2000; i++) {
    const v = rollVisit(() => rng.next());
    if (!v) continue;
    n++;
    assert.ok(v.arrive >= VISIT_ARRIVE_MS[0] && v.arrive <= VISIT_ARRIVE_MS[1]);
    assert.ok(v.stay >= VISIT_STAY_MS[0] && v.stay <= VISIT_STAY_MS[1]);
  }
  assert.ok(n > 2000 * 0.17 && n < 2000 * 0.27, `${n} visits in 2000 fights`);
});

test('a visit: away, walks in, stays, walks out, away', async () => {
  const { visitAt, VISIT_WALK_MS } = await import('../src/render/duchessRules');
  const v = { arrive: 5000, stay: 30000 };
  assert.equal(visitAt(null, 9000).phase, 'away');
  assert.equal(visitAt(v, 4999).phase, 'away');
  assert.deepEqual(visitAt(v, 5000 + VISIT_WALK_MS / 2), { phase: 'in', k: 0.5 });
  assert.equal(visitAt(v, 5000 + VISIT_WALK_MS + 100).phase, 'here');
  const outAt = 5000 + VISIT_WALK_MS + 30000;
  assert.deepEqual(visitAt(v, outAt + VISIT_WALK_MS / 2), { phase: 'out', k: 0.5 });
  assert.equal(visitAt(v, outAt + VISIT_WALK_MS).phase, 'away');
});

test('In-Battle Lucky Bleat: once-per-battle tactical state machine', () => {
  const state = newDuchessBattleState();
  assert.equal(state.luckyBleatUsed, false);

  // First trigger with rand < 0.5 returns startle effect
  const effect1 = triggerLuckyBleat(state, () => 0.2);
  assert.ok(effect1);
  assert.equal(effect1.kind, 'startle');
  if (effect1.kind === 'startle') {
    assert.equal(effect1.durationMs, 400);
    assert.equal(effect1.text, 'Startled by livestock');
  }
  assert.equal(state.luckyBleatUsed, true);

  // Second trigger in the same battle is strictly blocked (once per battle)
  assert.equal(triggerLuckyBleat(state, () => 0.8), null);
  assert.equal(triggerLuckyBleat(state, () => 0.1), null);

  // Resetting fight re-enables lucky bleat
  resetDuchessBattle(state);
  assert.equal(state.luckyBleatUsed, false);

  // Trigger with rand >= 0.5 returns cabbage heal effect
  const effect2 = triggerLuckyBleat(state, () => 0.7);
  assert.ok(effect2);
  assert.equal(effect2.kind, 'cabbage');
  if (effect2.kind === 'cabbage') {
    assert.equal(effect2.healPercent, 0.1);
  }
  assert.equal(state.luckyBleatUsed, true);

  // Duchess can still hop and bleat on tap even after lucky bleat is spent
  const g = newGoat(100);
  assert.ok(tapGoat(g, 1000));
  assert.equal(g.mode, 'hop');
});

test('Camp / Castle Haystack Trinket: nesting and nudge mechanics', () => {
  const g = newGoat(100);
  // Normal tap when not nesting
  const nudge1 = tapNudgeGoat(g, 1000);
  assert.equal(nudge1.hopped, true);
  assert.equal(nudge1.nudgedFromNest, false);
  assert.equal(g.mode, 'hop');

  // Second tap while still hopping is ignored
  const nudge2 = tapNudgeGoat(g, 1100);
  assert.equal(nudge2.hopped, false);

  // Duchess nests on a haystack
  g.mode = 'nest';
  g.x = 80;
  const nudge3 = tapNudgeGoat(g, 3000);
  assert.equal(nudge3.hopped, true);
  assert.equal(nudge3.nudgedFromNest, true);
  assert.equal(g.mode, 'hop');
  assert.equal(g.then, 'graze');
  assert.ok(g.to !== 80, 'nudged to an adjacent spot');
});

test('Daily Haystack Treat: rewards stones, crowns, or lore', () => {
  const kinds = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const treat = rollDailyTreat(() => (i % 10) / 10);
    kinds.add(treat.kind);
    if (treat.kind === 'stones') {
      assert.ok(treat.amount >= 1 && treat.amount <= 2);
    } else if (treat.kind === 'crowns') {
      assert.ok(treat.amount >= 15 && treat.amount <= 35);
    } else if (treat.kind === 'lore') {
      assert.ok(DUCHESS_LORE_SNIPPETS.includes(treat.snippet));
    }
    assert.ok(treat.message.length > 0);
  }
  assert.ok(kinds.has('stones'));
  assert.ok(kinds.has('crowns'));
  assert.ok(kinds.has('lore'));
});

test('Duchess Unlockable Hats & Costumes: milestones and unlock rules', () => {
  const none = DUCHESS_COSMETICS.find((c) => c.id === 'none')!;
  const crown = DUCHESS_COSMETICS.find((c) => c.id === 'crown')!;
  const wizard = DUCHESS_COSMETICS.find((c) => c.id === 'wizard')!;
  const quiver = DUCHESS_COSMETICS.find((c) => c.id === 'quiver')!;

  // None is always unlocked
  assert.ok(none.unlocked());
  assert.ok(none.unlocked({}));

  // Tiny Tin Crown: unlocks at 5 taps
  assert.equal(crown.unlocked({ duchessTaps: 4 }), false);
  assert.equal(crown.unlocked({ duchessTaps: 5 }), true);
  assert.equal(crown.unlocked({ duchessTaps: 12 }), true);

  // Wizard Hat: unlocks via Lucky Bleat in battle
  assert.equal(wizard.unlocked({ duchessLucky: false }), false);
  assert.equal(wizard.unlocked({ duchessLucky: true }), true);

  // Archery Quiver: unlocks via daily haystack treat
  assert.equal(quiver.unlocked({ duchessHay: false }), false);
  assert.equal(quiver.unlocked({ duchessHay: true }), true);
});

test('Cabbage tactical effect: heals the first unit walking over it for 10% max HP', () => {
  const run = newRun(42);
  const b = startStage(run);
  b.phase = 'fight';
  const unit = b.units.find((u) => u.alive)!;
  unit.hp = Math.floor(unit.maxHp * 0.5); // wounded
  const startingHp = unit.hp;

  // Place cabbage on unit's tile
  b.cabbages = [{ u: unit.u, v: unit.v, healPercent: 0.1 }];
  const events = stepBattle(b);

  const healEvent = events.find((e) => e.kind === 'heal' && e.to === unit.id);
  assert.ok(healEvent, 'heal event fired');
  const expectedHeal = Math.max(1, Math.round(unit.maxHp * 0.1));
  assert.equal(unit.hp, startingHp + expectedHeal);
  assert.equal(b.cabbages, undefined, 'cabbage was consumed on walking over');
});
