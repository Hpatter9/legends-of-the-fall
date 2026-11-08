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
import { setModesHidden } from '../src/sim/hiddenModes';
import { CONTENT_HEROES } from '../src/sim/contentHeroes';
import { questById } from '../src/sim/questData';
import { questBattleById } from '../src/sim/questBattles';
import { ALL_HEROES } from '../src/sim/units';

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

/** The quests of a chain, the last one first (each `after` the one before). */
const chainOf = (last: string): string[] => {
  const out: string[] = [];
  for (let q = questById(last); q; q = q.after ? questById(q.after) : undefined) out.push(q.id);
  return out;
};

test('every hero, tale hero and Mythic has a reachable earning path while the modes are hidden', () => {
  assert.equal(modesHidden(), true);
  const content = new Map(CONTENT_HEROES.map((c) => [c.kind, c]));
  for (const kind of ALL_HEROES) {
    const c = content.get(kind);
    // (a hero not earned by a quest is collected by shards from summoning stones, which no mode gates)
    if (!c) continue;
    // the hero's last quest is the one whose reward makes it join
    const lastQuest = QUESTS.find((q) => (q.reward as { hero?: { kind: string } }).hero?.kind === kind);
    assert.ok(lastQuest, `${kind} has a hero quest`);
    for (const id of chainOf(lastQuest!.id)) {
      const q = questById(id)!;
      assert.ok(questShown(q), `${kind}: ${id} is offered while hidden`);
      for (const g of objectivesOf(q)) {
        assert.ok(!['standWave', 'standRoom', 'holdLine', 'calGuardian', 'calClear'].includes(g.kind), `${kind}: ${id} goal ${g.kind}`);
        if (g.kind === 'battle') assert.ok(questBattleById(g.battle), `${kind}: ${id} battle exists`);
      }
    }
  }
});

test('the six re-pointed hero chains keep their original goals when the modes return', () => {
  const taken = ['taleChainsWorth', 'taleThroneSummons', 'taleClockStopped', 'taleEyrieAsh', 'mythic-astrax-trace', 'mythic-nyxara-trace'].map((id) => questById(id)!.goal.kind);
  assert.ok(!taken.some((k) => ['standWave', 'calGuardian', 'calClear'].includes(k)));
  setModesHidden(false);
  try {
    assert.deepEqual(['taleChainsWorth', 'taleThroneSummons', 'taleClockStopped', 'taleEyrieAsh', 'mythic-astrax-trace', 'mythic-nyxara-trace'].map((id) => questById(id)!.goal.kind), ['standWave', 'standWave', 'calGuardian', 'calClear', 'calGuardian', 'calGuardian']);
  } finally {
    setModesHidden(true);
  }
  assert.equal(questById('taleChainsWorth')!.goal.kind, 'wavesWon');
});

test('the re-pointed Mythic chains stay endgame: Legendary or Mythic tier army goals', () => {
  for (const id of ['mythic-astrax-trace', 'mythic-astrax-rite', 'mythic-nyxara-trace', 'mythic-nyxara-rite']) {
    const g = questById(id)!.goal as { tier?: number };
    assert.ok((g.tier ?? 0) >= 3, id);
  }
});
