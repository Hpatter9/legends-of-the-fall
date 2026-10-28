import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, place, startBattle, stepBattle, type BattleEvent } from '../src/sim/battle';
import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { ALL_HEROES } from '../src/sim/units';
import { gradeBoost } from '../src/sim/run';
import { CUES, Mixer, PITCH_JITTER, cuesFor, intensityOf, weightOf, type Cue } from '../src/render/soundRules';
import { readyBattle } from './helpers';

test('the same sound is held back until its gap has passed', () => {
  const m = new Mixer(14, () => 0.5);
  assert.ok(m.request('hitSword', 1000));
  assert.equal(m.request('hitSword', 1000 + CUES.hitSword.gap - 1), null);
  assert.ok(m.request('hitSword', 1000 + CUES.hitSword.gap));
  // (a different sound is not held by it)
  assert.ok(m.request('swingSword', 1001));
});

test('a full mix drops the small sounds first and never the big ones', () => {
  const m = new Mixer(6, () => 0.5);
  // fill the mix with long heavy sounds
  assert.ok(m.request('hitHeavy', 0));
  assert.ok(m.request('deathThud', 0));
  assert.ok(m.load(0) >= 6);
  assert.equal(m.request('swingSword', 10), null, 'prio 0 dropped');
  assert.equal(m.request('hitSword', 10), null, 'prio 1 dropped');
  assert.ok(m.request('ultimate', 10), 'prio 3 plays');
  // once they have rung out, the small ones play again
  assert.ok(m.request('swingSword', 5000));
  assert.equal(m.load(20000), 0);
});

test('pitch stays within the jitter and ×2 is quieter than ×1', () => {
  const lo = new Mixer(14, () => 0).request('bow', 0)!;
  const hi = new Mixer(14, () => 1).request('bow', 0)!;
  assert.ok(Math.abs(lo.pitch - (1 - PITCH_JITTER)) < 1e-9);
  assert.ok(Math.abs(hi.pitch - (1 + PITCH_JITTER)) < 1e-9);
  const slow = new Mixer(14, () => 0.5).request('bow', 0, 1)!;
  const fast = new Mixer(14, () => 0.5).request('bow', 0, 2)!;
  assert.ok(fast.gain < slow.gain);
  // (and the gap grows at ×2)
  const m = new Mixer(14, () => 0.5);
  m.request('bow', 0, 2);
  assert.equal(m.request('bow', CUES.bow.gap * 1.2, 2), null);
  assert.ok(m.request('bow', CUES.bow.gap * 1.6, 2));
});

test('weapons sort by weight', () => {
  assert.equal(weightOf('Ogre'), 'heavy');
  assert.equal(weightOf('Skeleton'), 'bone');
  assert.equal(weightOf('Peasant'), 'spear');
  assert.equal(weightOf('Knight'), 'sword');
  assert.equal(weightOf('Kunoichi'), 'light');
  assert.equal(weightOf('Ninja Monk'), 'fist');
});

test('a fight calls for shots, hits and a closing sting with basic swings filtered', () => {
  const b = readyBattle(7);
  fight(b);
  const seen = new Set<Cue>();
  const events: BattleEvent[] = [];
  for (let i = 0; i < 2400 && b.phase === 'fight'; i++) {
    const out = stepBattle(b);
    events.push(...out);
    for (const e of out) for (const q of cuesFor(b, e)) {
      assert.ok(CUES[q.cue], `${q.cue} has a mixing entry`);
      seen.add(q.cue);
    }
  }
  // (repetitive generic swings are filtered so combat audio remains crisp and uncluttered)
  assert.equal(seen.has('swingSword') || seen.has('swingLight'), false, 'generic swings muted');
  assert.ok([...seen].some((c) => c.startsWith('hit') || c === 'arrowHit'), 'a hit');
  assert.ok([...seen].some((c) => c.startsWith('death')), 'a death');
  assert.ok(seen.has('victory') || seen.has('defeat'), 'an ending');
});

test('heavy blows keep their impactful windup swing', () => {
  const b = readyBattle(1, ['ogre']);
  const ogre = b.units.find((u) => u.side === 'foe');
  assert.ok(ogre);
  const hero = b.units.find((u) => u.side === 'hero')!;
  const q = cuesFor(b, { kind: 'swing', by: ogre.id, to: hero.id });
  assert.deepEqual(q.map((x) => x.cue), ['swingHeavy']);
});

test('the meteor falls, then booms when it lands', () => {
  const b = readyBattle(1);
  const q = cuesFor(b, { kind: 'area', by: 1, id: 'meteor', u: 3, v: 3, ms: 1400 });
  assert.deepEqual(q.map((x) => x.cue), ['meteorFall', 'fireBoom', 'thunder']);
  assert.ok(q[1].delay! >= 1400 && q[0].delay! < q[1].delay!);
});

test('tension climbs as a side thins out', () => {
  const b = readyBattle(3);
  fight(b);
  assert.equal(intensityOf(b), 0);
  for (const u of b.units) if (u.side === 'foe') u.alive = false;
  b.units.find((u) => u.side === 'foe')!.alive = true;
  assert.ok(intensityOf(b) > 0.5);
});

test('every event of every hero\'s fights can be voiced (a melee hero\'s thrown shot froze the fight)', () => {
  const spots = (b: ReturnType<typeof startBattle>): [number, number][] => {
    const out: [number, number][] = [];
    for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) out.push([u, v]);
    return out;
  };
  for (const level of [1, 20])
    for (let g = 0; g < ALL_HEROES.length; g += 5)
      for (let seed = 1; seed <= 3; seed++) {
        const b = startBattle(seed * 97 + g);
        const at = spots(b);
        ALL_HEROES.slice(g, g + 5).forEach((id, i) => place(b, id, ...at[(i * 3) % at.length], undefined, gradeBoost(1, 0, level)));
        fight(b);
        for (let t = 0; t < 2500 && b.phase === 'fight'; t++)
          for (const e of stepBattle(b)) assert.doesNotThrow(() => cuesFor(b, e), `${e.kind} by ${'by' in e ? b.units.find((u) => u.id === e.by)?.def : '-'} (level ${level})`);
      }
});
