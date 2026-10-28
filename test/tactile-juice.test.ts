import test from 'node:test';
import assert from 'node:assert/strict';
import { hitStopMs, isBackstab } from '../src/render/fxRules';
import { BOSS_TROPHIES, isTrophyUnlocked } from '../src/trophyWall';
import { newMeta } from '../src/sim/meta';

test('hitStopMs: subtle 2-frame hit-stop (~34ms) for lethal backstabs, crits, and meteor impact', () => {
  // 1. Lethal backstabs:
  assert.equal(hitStopMs(false, 0.1, true, false, true, false, false), 34, 'lethal backstab has 2-frame (34ms) hit-stop');
  // Non-lethal backstab:
  assert.equal(hitStopMs(false, 0.1, false, false, true, false, false), 0, 'non-lethal backstab has no extra hit-stop');

  // 2. Critical hits:
  assert.equal(hitStopMs(true, 0.1, false, false, false, true, false), 34, 'critical hit has 2-frame (34ms) hit-stop');

  // 3. King\'s Meteor impact:
  assert.equal(hitStopMs(false, 0, false, false, false, false, true), 34, 'meteor impact has 2-frame (34ms) hit-stop');

  // 4. Calm / Reduced motion:
  assert.equal(hitStopMs(true, 0.5, true, true, true, true, true), 0, 'calm/reduced motion yields 0ms hit-stop');

  // 5. Existing backwards compatibility:
  assert.equal(hitStopMs(false, 0.1, false, false), 0);
  assert.equal(hitStopMs(true, 0.1, false, false), 60);
  assert.equal(hitStopMs(false, 0.4, true, false), 90);
  assert.equal(hitStopMs(true, 0.5, true, true), 0);
});

test('isBackstab: detects strikes from behind defender facing', () => {
  // Same facing direction: attacker is striking from behind
  assert.equal(isBackstab(1, 1), true, 'same facing is backstab');
  assert.equal(isBackstab(2, 2), true, 'same facing is backstab');

  // Opposite facing direction (frontal blow)
  assert.equal(isBackstab(1, 3), false, 'opposite facing is not backstab');
  assert.equal(isBackstab(0, 2), false, 'opposite facing is not backstab');

  // With explicit way vector matching target facing
  assert.equal(isBackstab(0, 1, 1), true, 'way matching target facing is backstab');
  assert.equal(isBackstab(0, 1, 3), false, 'way opposite target facing is not backstab');
});

test('BOSS_TROPHIES: catalogues Calamity and Spire bosses with humorous blurbs', () => {
  assert.ok(BOSS_TROPHIES.length >= 18, 'has at least 18 boss trophies');

  const calamity = BOSS_TROPHIES.filter((t) => t.origin === 'calamity');
  assert.equal(calamity.length, 6, 'has all 6 Calamity heralds');

  const spire = BOSS_TROPHIES.filter((t) => t.origin === 'spire');
  assert.ok(spire.length >= 12, 'has at least 12 Spire champions');

  for (const t of BOSS_TROPHIES) {
    assert.ok(t.id, 'trophy has id');
    assert.ok(t.name, 'trophy has name');
    assert.ok(t.title, 'trophy has title');
    assert.ok(t.blurb && t.blurb.length > 20, `${t.name} has substantial humorous defeat blurb`);
    assert.ok(t.humorousLore && t.humorousLore.length > 15, `${t.name} has incident report / humorous lore`);
    assert.ok(t.defeatTag, `${t.name} has defeat status tag`);
  }
});

test('isTrophyUnlocked: tracks defeat through meta bosses and calamity records', () => {
  const meta = newMeta(42);
  const gorvak = BOSS_TROPHIES.find((t) => t.id === 'calBoss1')!;
  const malphas = BOSS_TROPHIES.find((t) => t.id === 'calBoss3')!;
  const lich = BOSS_TROPHIES.find((t) => t.id === 'lichKing')!;

  // Fresh save: unconquered
  assert.equal(isTrophyUnlocked(meta, gorvak), false);
  assert.equal(isTrophyUnlocked(meta, lich), false);

  // After defeating Lich King in Spire / Armies
  meta.bosses.push('lichKing');
  assert.equal(isTrophyUnlocked(meta, lich), true);

  // Calamity cleared to map 2
  meta.calamity = { best: 2, clears: 0 };
  assert.equal(isTrophyUnlocked(meta, gorvak), true, 'map 1 boss unlocked when best >= 2');
  assert.equal(isTrophyUnlocked(meta, malphas), false, 'map 3 boss still locked when best is 2');

  // Calamity whole clear
  meta.calamity.clears = 1;
  assert.equal(isTrophyUnlocked(meta, malphas), true, 'all calamity bosses unlocked when cleared whole');
});
