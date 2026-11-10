// FIRST-HOUR (docs/notes/first-hour.md): the rules fixed after playing a new save's first hour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roman } from '../src/sim/roman';
import { modesHidden, namesHiddenMode, setModesHidden } from '../src/sim/hiddenModes';
import { LOADING_TIPS } from '../src/quipData';
import { devGrant } from '../src/sim/devGrant';
import { modeOpen } from '../src/sim/modeUnlock';
import { newMeta } from '../src/sim/meta';
import { sceneList, sceneOfHiddenMode } from '../src/sim/sceneRules';
import { FOE_ENTRIES, whereMet } from '../src/sim/codex';
import { ALL_HEROES } from '../src/sim/units';
import { ARMIES } from '../src/sim/armies';
import { hireHintWords, TIPS } from '../src/tips';

test('a hero\'s card number is a true Roman numeral for every hero', () => {
  assert.equal(roman(67), 'LXVII');
  assert.equal(roman(69), 'LXIX');
  assert.equal(roman(75), 'LXXV');
  assert.equal(roman(18), 'XVIII');
  assert.equal(roman(40), 'XL');
  assert.equal(roman(49), 'XLIX');
  assert.equal(roman(90), 'XC');
  for (let n = 1; n <= Math.max(100, ALL_HEROES.length); n++) assert.match(roman(n), /^(C|XC|L?X{0,3}|XL)(IX|IV|V?I{0,3})$/, `${n}`);
});

test('while the modes are hidden no loading tip names them, and plenty of tips are left', () => {
  assert.equal(modesHidden(), true);
  const shown = LOADING_TIPS.filter((t) => !namesHiddenMode(t));
  assert.ok(shown.length >= 20);
  assert.ok(shown.length < LOADING_TIPS.length, 'some tips are about the modes');
  for (const t of shown) assert.doesNotMatch(t, /Last Stand|Calamity/);
  setModesHidden(false);
  assert.equal(namesHiddenMode('the Last Stand never ends'), false, 'nothing is held back once the modes are shown');
  setModesHidden(true);
});

test('Build Town opens the castle gate (the Castle tab has no testing door of its own)', () => {
  const m = newMeta(5);
  assert.equal(modeOpen(m, 'castle'), false);
  devGrant(m, 'town', 0);
  assert.equal(modeOpen(m, 'castle'), true);
  devGrant(m, 'town', 0);
  assert.equal(m.opened?.filter((k) => k === 'castle').length, 1, 'written once');
});

test('the Scenes list of a new save shows no scene of a hidden mode', () => {
  const rows = sceneList(newMeta(9));
  assert.ok(rows.length > 5);
  for (const r of rows) {
    assert.doesNotMatch(r.text, /Calamity|Last Stand|Ascension|first elite/, r.id);
    assert.equal(sceneOfHiddenMode(r.id), false, r.id);
  }
  setModesHidden(false);
  assert.ok(sceneList(newMeta(9)).some((r) => /Calamity/.test(r.text)), 'they come back with the modes');
  setModesHidden(true);
});

test('where a foe is met names no hidden mode for a foe of the armies', () => {
  const orcs = ARMIES[0];
  const defs = new Set(orcs.waves.flatMap((w) => w.foes));
  const met = FOE_ENTRIES.filter((e) => e.defs.some((d) => defs.has(d)));
  assert.ok(met.length >= 3);
  for (const e of met) for (const line of whereMet(e)) assert.doesNotMatch(line, /Last Stand|Calamity/, `${e.id}: ${line}`);
});

test('the hire hint counts the party picked, and the first-run tips name what is on the screen', () => {
  assert.match(hireHintWords(3), /your three are the pool/);
  assert.match(hireHintWords(5), /your five are the pool/);
  assert.match(hireHintWords(0), /your heroes are the pool/);
  assert.match(TIPS.mana.text, /SPELL/);
  assert.match(TIPS.recycle.text, /Recycle spot appears/);
  assert.match(TIPS.runes.text, /Tap Runes/);
});

// ---- FIRST-HOUR 2: the director's calls after the first pass ----

test('a new save starts with Auto spells on; a save from before keeps what it had', async () => {
  const { spellAutoSaved } = await import('../src/sim/autoCast');
  const { loadMeta, startedMeta } = await import('../src/sim/meta');
  assert.equal(spellAutoSaved(newMeta(1)), true);
  assert.equal(newMeta(1).ultAuto, undefined, 'the ultimates\' switch is left alone');
  // (an old save has no `spellAuto` key: it reads as its one old switch did, off unless that was on)
  const old = { ...startedMeta(3) } as Record<string, unknown>;
  delete old.spellAuto;
  const back = loadMeta(1, { getItem: () => JSON.stringify(old) });
  assert.equal(back.spellAuto, undefined);
  assert.equal(spellAutoSaved(back), false);
  const was = loadMeta(1, { getItem: () => JSON.stringify({ ...old, spellAuto: false }) });
  assert.equal(spellAutoSaved(was), false, 'one that chose off stays off');
});

test('the Auto ultimates button waits for a hero with an ultimate', async () => {
  const { anyUltimate } = await import('../src/sim/heroKits');
  const { ULT_LEVEL } = await import('../src/sim/abilities');
  const unit = (level: number, side = 'hero') => ({ def: 'knight', side, level }) as never;
  assert.equal(anyUltimate({ units: [] }), false);
  assert.equal(anyUltimate({ units: [unit(1), unit(ULT_LEVEL - 1)] }), false, 'a new save\'s heroes have none');
  assert.equal(anyUltimate({ units: [unit(1), unit(ULT_LEVEL)] }), true);
});

test('after a clear the armies screen opens on the army it opened', async () => {
  const { armiesFocusAfterClear } = await import('../src/screenRules');
  assert.equal(armiesFocusAfterClear('orcs', 'undead', true), 'undead', 'the new army, not the cleared one on Hard');
  assert.equal(armiesFocusAfterClear('orcs', undefined, true), 'orcs', 'no new army: the cleared one, its chest ticked');
  assert.equal(armiesFocusAfterClear('orcs', undefined, false), undefined);
});

test('what only a hidden mode gives is not offered while it is hidden, and comes back with it', async () => {
  const { achievementShown, HIDDEN_MODE_LEGENDS, legendShown, trophyShown } = await import('../src/sim/hiddenModes');
  const { ACHIEVEMENTS } = await import('../src/sim/achievements');
  const { allMilestones, gotOf, shownEntries, totalOf, entryOfHiddenMode } = await import('../src/sim/codex');
  const { CHAINS } = await import('../src/sim/eidolonChainData');
  const { listedChains } = await import('../src/sim/eidolonChains');
  const { LEGEND_LIST } = await import('../src/sim/legendBases');
  const { canOffer } = await import('../src/sim/quests');
  const { questById } = await import('../src/sim/questData');
  const { DAILY_WAVES } = await import('../src/sim/daily');
  const m = newMeta(4);
  // the achievements: no run a player can start reaches wave 20
  assert.ok(Math.max(DAILY_WAVES, ...ARMIES.map((a) => a.waves.length)) < 20);
  for (const id of ['stage20', 'stage30']) {
    assert.ok(ACHIEVEMENTS.some((a) => a.id === id), 'the data stays');
    assert.equal(achievementShown(id, []), false);
    assert.equal(achievementShown(id, [id]), true, 'one already earned stays');
  }
  // the bestiary: every entry counted can be met, so the last reward can be reached
  assert.ok(shownEntries().every((e) => e.class === 'common' || e.class === 'boss'));
  assert.equal(totalOf('bestiary'), shownEntries().length);
  const all = { ...m, codex: { met: FOE_ENTRIES.flatMap((e) => e.defs), kills: {} } };
  assert.equal(gotOf(all, 'bestiary'), totalOf('bestiary'), 'a herald met before is not counted over the total');
  assert.equal(allMilestones().find((x) => x.id === 'bestiary100')!.need, shownEntries().length);
  // the trophies: the heralds' empty plaques wait; the armies' bosses hang
  assert.equal(trophyShown('calamity', false), false);
  assert.equal(trophyShown('calamity', true), true);
  assert.equal(trophyShown('spire', false), true);
  // Vaelkhar's chain opens with the Calamity cleared: not listed until begun
  const vael = CHAINS.find((c) => c.opens.kind === 'calCleared')!;
  assert.ok(vael);
  assert.ok(!listedChains(m).includes(vael));
  assert.equal(listedChains(m).length, CHAINS.length - 1);
  assert.ok(listedChains({ ...m, quests: { active: [], offers: [], done: [], chains: { [vael.id]: { part: 0, progress: 0 } } } } as never).includes(vael), 'a save that had begun it keeps it');
  // the legends that wait in a mode
  for (const id of HIDDEN_MODE_LEGENDS) {
    assert.ok(LEGEND_LIST.some((l) => l.id === id), `${id} is a legend`);
    assert.equal(legendShown(id, false), false);
    assert.equal(legendShown(id, true), true);
  }
  for (const l of LEGEND_LIST.filter((x) => !HIDDEN_MODE_LEGENDS.includes(x.id))) assert.doesNotMatch(l.legend!.source, /spire|Calamity|Last Stand|Vaelkhar/, l.id);
  // the two quests whose first step is in a mode are never offered to a save that could not have done it
  for (const id of ['musterStandard', 'keepOneRun']) assert.equal(canOffer(m, questById(id)!), false, id);
  // and all of it is back when the modes are
  setModesHidden(false);
  assert.equal(achievementShown('stage30', []), true);
  assert.equal(totalOf('bestiary'), FOE_ENTRIES.length);
  assert.ok(FOE_ENTRIES.some((e) => e.class === 'elite') && !FOE_ENTRIES.some(entryOfHiddenMode));
  assert.equal(trophyShown('calamity', false), true);
  assert.equal(listedChains(m).length, CHAINS.length);
  assert.equal(legendShown('gravesong', false), true);
  setModesHidden(true);
});

test('one word for a hero\'s merge level, and the chest and the shop say what they mean', async () => {
  const { ACHIEVEMENTS } = await import('../src/sim/achievements');
  assert.match(TIPS.summon.text, /same kind and grade/);
  assert.doesNotMatch(TIPS.summon.text, /star/);
  assert.match(ACHIEVEMENTS.find((a) => a.id === 'threeStar')!.text, /grade three/);
});

test('a tool\'s new save has the three heroes of a starter pack', async () => {
  const { newSaveMeta } = await import('../tools/autoplay');
  const { FIXED_PACKS } = await import('../src/sim/starter');
  const a = newSaveMeta(10, 0);
  assert.deepEqual(a.unlocked, FIXED_PACKS[0].heroes);
  assert.deepEqual(a.party, FIXED_PACKS[0].heroes);
  assert.deepEqual(newSaveMeta(11).unlocked, FIXED_PACKS[11 % FIXED_PACKS.length].heroes);
});

// ---- FIRST-HOUR 3: the owner's answers ----

test('the first clear of the first two armies gives a new save a whole hero, once, and only while it is short of them', async () => {
  const { CLEAR_HEROES, clearHeroWaits, grantClearHero } = await import('../src/sim/clearHero');
  const { newSaveMeta } = await import('../tools/autoplay');
  const { CONTENT_HEROES } = await import('../src/sim/contentHeroes');
  const { unseenHeroes } = await import('../src/sim/heroesSeen');
  const { settleArmyRun } = await import('../src/sim/armyStars');
  const { armyRun } = await import('../src/sim/run');
  const { startedMeta } = await import('../src/sim/meta');
  const [orcs, undead, beasts] = ARMIES;
  assert.deepEqual(CLEAR_HEROES, { 0: { below: 4 }, 1: { below: 5 } });
  // a new save: three heroes, the card promises one, the first clear gives it
  const m = newSaveMeta(21, 0);
  assert.equal(m.unlocked.length, 3);
  assert.equal(clearHeroWaits(m, orcs), true);
  assert.equal(clearHeroWaits(m, beasts), false);
  const run = armyRun(5, orcs.id, m.party);
  run.cleared = true;
  run.over = true;
  const res = settleArmyRun(m, run)!;
  const fourth = res.hero!;
  assert.ok(fourth, 'the result names the hero');
  assert.equal(m.unlocked.length, 4);
  assert.ok(m.unlocked.includes(fourth) && m.party.includes(fourth), 'owned, and in the party while it has room');
  assert.ok(!(fourth in CONTENT_HEROES), 'never a hero earned by a milestone');
  assert.deepEqual(unseenHeroes(m), [fourth], 'its join reveal is due');
  assert.equal(clearHeroWaits(m, orcs), false);
  // once: a second clear, on any tier, gives nothing
  const again = armyRun(6, orcs.id, m.party, undefined, 1);
  again.cleared = true;
  assert.equal(settleArmyRun(m, again)!.hero, undefined);
  assert.equal(m.unlocked.length, 4);
  // the second army gives the fifth
  assert.equal(clearHeroWaits(m, undead), true);
  const fifth = grantClearHero(m, undead, true)!;
  assert.ok(fifth && fifth !== fourth);
  assert.equal(m.unlocked.length, 5);
  assert.equal(grantClearHero(m, undead, true), undefined);
  // the pick is the save's own, on its side stream: the same save gets the same hero, and no pull is used
  const twin = newSaveMeta(21, 0);
  const pulls = twin.pulls;
  assert.equal(grantClearHero(twin, orcs, true), fourth);
  assert.equal(twin.pulls, pulls);
  // a save that already has its heroes gets nothing, now or later
  const old = startedMeta(8);
  assert.equal(clearHeroWaits(old, orcs), false);
  assert.equal(grantClearHero(old, orcs, true), undefined);
  assert.deepEqual(old.clearHeroes, [orcs.id], 'settled for good');
  old.unlocked.length = 3;
  assert.equal(grantClearHero(old, orcs, true), undefined);
  // a save that owns four when it first clears the first army gets none there, but still its fifth at the second
  const four = newSaveMeta(22, 1);
  four.unlocked.push('knight');
  assert.equal(grantClearHero(four, orcs, true), undefined);
  assert.ok(grantClearHero(four, undead, true));
  // not a first clear: nothing, and nothing is settled
  const late = newSaveMeta(23, 0);
  assert.equal(grantClearHero(late, orcs, false), undefined);
  assert.equal(late.clearHeroes, undefined);
});
