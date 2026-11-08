import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES, totalStars } from '../src/sim/armies';
import { TIERS, tierOf } from '../src/sim/tiers';
import { newMeta, type Meta } from '../src/sim/meta';
import { AUTO_RUNES_STARS, FEATURES, autoRunesOpen, featureStarsToGo, featuresToTell, markTold } from '../src/sim/featureUnlocks';
import { GRIP_FLIP_SHARE, GRIP_TAP_PX, gripLanding, gripProgress, gripShown, runeAutoLabel, shownSide } from '../src/benchSideRules';

/** Win `n` stars across the armies, filling each army's tiers in turn (each army beaten). */
const stars = (m: Meta, n: number): void => {
  for (let i = 0; n > 0; i++) {
    const met: Record<string, number> = {};
    for (let t = 0; t < TIERS.length && n > 0; t++) {
      const take = Math.min(tierOf(t).stars, n);
      met[String(t)] = (1 << take) - 1;
      n -= take;
    }
    m.armies[ARMIES[i].id] = { best: 15, won: 15, clears: 1, stars: {}, met };
  }
};

describe('rune Auto: opened by stars', () => {
  it('is locked on a new save, with the stars it needs', () => {
    const m = newMeta(1);
    assert.equal(autoRunesOpen(m), false);
    assert.equal(featureStarsToGo(m, 'autoRunes'), AUTO_RUNES_STARS);
    assert.equal(FEATURES.autoRunes.stars, AUTO_RUNES_STARS);
  });
  it(`opens at ${AUTO_RUNES_STARS} stars won across the armies, not one before`, () => {
    const m = newMeta(1);
    stars(m, AUTO_RUNES_STARS - 1);
    assert.equal(totalStars(m), AUTO_RUNES_STARS - 1);
    assert.equal(autoRunesOpen(m), false);
    assert.equal(featureStarsToGo(m, 'autoRunes'), 1);
    stars(m, AUTO_RUNES_STARS);
    assert.equal(autoRunesOpen(m), true);
    assert.equal(featureStarsToGo(m, 'autoRunes'), 0);
  });
  it('lands between Auto merge and Auto place on the pace of two stars an army', () => {
    // (the second army: four stars, below the threshold; the fourth: eight, past it)
    assert.ok(2 * 2 < AUTO_RUNES_STARS && AUTO_RUNES_STARS < 2 * 4);
  });
  it('is told once, and in its turn between the other two', () => {
    const m = newMeta(1);
    stars(m, AUTO_RUNES_STARS);
    assert.deepEqual(featuresToTell(m), ['autoRunes']);
    // (the second army beaten too: Auto merge comes first in the telling)
    m.armies[ARMIES[1].id] = { best: 15, won: 15, clears: 1, stars: {} };
    assert.deepEqual(featuresToTell(m), ['autoMerge', 'autoRunes']);
    markTold(m, featuresToTell(m));
    assert.deepEqual(featuresToTell(m), []);
    for (const a of ARMIES.slice(0, 4)) m.armies[a.id] ??= { best: 15, won: 15, clears: 1, stars: {} };
    assert.deepEqual(featuresToTell(m), ['autoPlace']);
  });
  it('an old save with the stars already won has it at once, and is told on its next deploy; one told before is not told again', () => {
    const m = newMeta(1);
    stars(m, 9);
    m.featuresTold = ['autoMerge', 'autoPlace'];
    assert.equal(autoRunesOpen(m), true);
    assert.deepEqual(featuresToTell(m), ['autoRunes']);
    m.featuresTold.push('autoRunes');
    assert.deepEqual(featuresToTell(m), []);
  });
  it('the button says it is locked and how many stars are left', () => {
    assert.equal(runeAutoLabel(false, 4), 'Auto · 4★');
    assert.equal(runeAutoLabel(true, 0), 'Auto runes');
  });
});

describe('the pull bar', () => {
  const travel = 300;
  it('a tap flips the side', () => {
    assert.equal(gripLanding('heroes', 0, travel), 'runes');
    assert.equal(gripLanding('runes', GRIP_TAP_PX - 1, travel), 'heroes');
  });
  it('a pull past the share lands on the far side; a short one springs back', () => {
    const far = Math.ceil(travel * GRIP_FLIP_SHARE);
    assert.equal(gripLanding('heroes', -far, travel), 'runes');
    assert.equal(gripLanding('heroes', -(far - 20), travel), 'heroes');
    assert.equal(gripLanding('runes', far, travel), 'heroes');
    assert.equal(gripLanding('runes', -far, travel), 'runes');
  });
  it('a flick lands it the way it was flicked, however short', () => {
    assert.equal(gripLanding('heroes', -20, travel, -0.8), 'runes');
    assert.equal(gripLanding('heroes', -200, travel, 0.8), 'heroes');
  });
  it('follows the finger along the slide, and stretches only a little past the ends', () => {
    assert.equal(gripProgress('heroes', 0, travel), 0);
    assert.equal(gripProgress('heroes', -150, travel), 0.5);
    assert.equal(gripProgress('runes', 0, travel), 1);
    assert.ok(gripProgress('heroes', 100, travel) < 0 && gripProgress('heroes', 100, travel) > -0.2);
    assert.ok(gripProgress('runes', -100, travel) > 1 && gripProgress('runes', -100, travel) < 1.2);
  });
  it('shows only in a rune run on the deploy screen; elsewhere the bench is the heroes', () => {
    assert.equal(gripShown(true, true), true);
    assert.equal(gripShown(false, true), false);
    assert.equal(gripShown(true, false), false);
    assert.equal(shownSide('runes', true, true), 'runes');
    assert.equal(shownSide('runes', true, false), 'heroes');
    assert.equal(shownSide('runes', false, true), 'heroes');
    assert.equal(shownSide('heroes', true, true), 'heroes');
  });
});
