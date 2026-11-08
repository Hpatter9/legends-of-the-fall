// The Last Stand and the Calamity are hidden for now (docs/notes/hide-modes.md): neither can be reached from the page's tap targets
// or rules while `HIDDEN_MODES` is on. The modes' own sim code and tests stay.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { modesHidden, HIDDEN_MODE_ACHIEVEMENTS, achievementShown, modeShown, questNeedsHiddenMode, questShown } from '../src/sim/hiddenModes';
import { QUESTS } from '../src/sim/questData';
import { canOffer, objectivesOf, refreshOffers } from '../src/sim/quests';
import { ACHIEVEMENTS, checkAchievements, shownAchievements, type AchievementCtx } from '../src/sim/achievements';
import { newRun } from '../src/sim/run';
import { startedMeta } from '../src/sim/meta';
import { dueScene } from '../src/sim/sceneRules';

const open = (): ReturnType<typeof startedMeta> => {
  const m = startedMeta(7);
  m.opened = ['castle', 'tower', 'calamity'];
  m.stand = 30;
  m.tower = 30;
  m.calamity = { best: 3, clears: 1 } as never;
  return m;
};

test('the flag hides both modes', () => {
  assert.equal(modesHidden(), true);
  assert.equal(modeShown('tower'), false);
  assert.equal(modeShown('calamity'), false);
});

test('no quest that needs either mode is ever offered, even on a save that has them open', () => {
  const m = open();
  const hidden = QUESTS.filter(questNeedsHiddenMode);
  assert.ok(hidden.length > 20, `${hidden.length} hidden-mode quests`);
  for (const q of hidden) assert.equal(canOffer(m, q), false, q.id);
  for (let d = 20260101; d < 20260130; d++) refreshOffers(m, d);
  for (const o of m.quests!.offers) assert.ok(questShown(QUESTS.find((q) => q.id === o.id)!), o.id);
});

test('every quest still offered has no mode goal, so none can strand a player', () => {
  for (const q of QUESTS.filter(questShown)) {
    for (const g of objectivesOf(q)) assert.ok(!['standWave', 'standRoom', 'holdLine', 'calGuardian', 'calClear'].includes(g.kind), q.id);
  }
});

test('the Last Stand achievements are not shown or earned, unless a save already holds them', () => {
  const m = open();
  const c: AchievementCtx = { won: true, stage: 1, stars: 0, run: newRun(2), meta: m };
  const got = checkAchievements(c).map((a) => a.id);
  for (const id of HIDDEN_MODE_ACHIEVEMENTS) assert.ok(!got.includes(id), id);
  assert.ok(!shownAchievements(m).some((a) => HIDDEN_MODE_ACHIEVEMENTS.includes(a.id)));
  assert.equal(shownAchievements(m).length, ACHIEVEMENTS.length - HIDDEN_MODE_ACHIEVEMENTS.length);
  assert.ok(achievementShown('tower1', ['tower1']));
});

test('the Calamity reveal scene is not due while hidden', () => {
  assert.equal(dueScene(open(), { kind: 'calOpen' }), null);
});

test('the camp builds no place for either mode, and the page has no other way in', () => {
  const home = readFileSync('src/home.ts', 'utf8');
  assert.match(home, /const showTower = modeShown\('tower'\)/);
  assert.match(home, /const showCal = modeShown\('calamity'\)/);
  assert.match(home, /enterCalamity\(\): void \{\s*if \(!modeShown\('calamity'\)\) return;/);
  assert.match(home, /modeShown\('tower'\) && \(towerOpen/);
  assert.match(home, /modeShown\('calamity'\) && \(modeOpen/);
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /private openStand\(\): void \{\s*if \(!modeShown\('tower'\)\) return;/);
  assert.match(main, /if \(!modeShown\(kind\)\) return;/);
  assert.match(main, /modeShown\('calamity'\) && modeOpen\(this\.meta, 'calamity'\)/);
});
