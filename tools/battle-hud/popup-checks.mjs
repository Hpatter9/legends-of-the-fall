// Real popup controls; event/menu data is an isolated browser review fixture.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';
let fixtureBuilt = false;
export async function checkBattlePopups(page, { prefix, w }) {
  if (!fixtureBuilt) {
    mkdirSync('out/shots', { recursive: true });
    await build({ entryPoints: ['tools/painted-combat/popup-fixtures.ts'], bundle: true, format: 'iife', globalName: 'PopupReview', platform: 'browser', outfile: 'out/shots/popup-fixtures.js', loader: { '.png': 'dataurl', '.webp': 'dataurl' }, logLevel: 'error' });
    fixtureBuilt = true;
  }
  await page.addScriptTag({ path: 'out/shots/popup-fixtures.js' });
  const checks = [];
  const check = (name, ok) => { assert.ok(ok, name); checks.push(name); };
  const shot = async (name, selector) => {
    // Wait for the popup's entrance fade, rather than capturing an almost
    // transparent first frame while the large game bundle is still busy.
    await page.locator(selector).first().evaluate(async (e) => {
      const root = e.closest('.omVeil, #events, #tacticSheet, .fhSheet, .stSheet') ?? e;
      await Promise.allSettled(root.getAnimations({ subtree: true }).filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished));
    });
    check(`${name}: painted panel`, await page.locator(selector).first().evaluate((e) => getComputedStyle(e).borderImageSource.includes('combat-panel.png')));
    check(`${name}: panel stays inside phone`, await page.locator(selector).first().evaluate((e) => { const r = e.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1; }));
    check(`${name}: no horizontal page overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `docs/samples/${prefix}-${name}-${w}.png` });
  };
  await page.locator('#fightHud .fhChip').first().click();
  check('skill pauses combat', await page.evaluate(() => window.__game.hud.holding));
  await shot('skill', '.fhSheet:not([hidden]) .fsCard');
  check('skill tab targets are at least 44px tall', await page.locator('.fhSheet:not([hidden]) .fsTabs button').evaluateAll((es) => es.every((e) => e.getBoundingClientRect().height >= 44)));
  await page.locator('.fhSheet:not([hidden]) [data-tab="ult"]').click();
  await shot('ultimate', '.fhSheet:not([hidden]) .fsCard');
  await page.locator('.fhSheet:not([hidden]) .fsClose').click();
  check('Close releases skill pause', await page.evaluate(() => !window.__game.hud.holding));
  await page.evaluate(() => {
    const g = window.__game;
    const army = PopupReview.ARMIES[3];
    g.meta.armies[army.id] = { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: {} };
    g.meta.featuresTold = ['autoMerge', 'autoPlace'];
    g.sceneHold = 0;
    g.newBattle(); g.autoArrange(true);
  });
  await page.locator('#formBtn').click();
  await shot('formation', '#tacticSheet .tacCard');
  await page.locator('#tacticSheet .tacForm').first().click();
  check('formation choice closes sheet', await page.locator('#tacticSheet').isHidden());
  await page.locator('#formBtn').click();
  check('formation choice remains selected', await page.locator('#tacticSheet .tacForm.on').count() === 1);
  await page.locator('#tacticSheet .tacClose').click();

  await page.evaluate(() => {
    const g = window.__game;
    g.run.gold = 100;
    g.run.event = { kind: 'shrine', stage: 1, title: 'A shrine in the ruins', text: 'A weathered altar offers aid before the next battle.', options: [
      { label: 'Take the offering', text: 'Gain 20 gold.', cost: 0, effect: { t: 'gold', n: 20 } },
      { label: 'Restore the altar', text: 'A gift beyond your purse.', cost: 9999, effect: { t: 'gold', n: 20 } },
      { label: 'Move on', text: 'Leave the shrine untouched.', cost: 0, effect: { t: 'leave' } },
    ] };
    g.events.openEvent(g.run, () => {});
  });
  await shot('event-fixture', '#events .evcard');
  check('unaffordable event choice remains disabled', await page.getByRole('button', { name: /Restore the altar/ }).isDisabled());
  await page.getByRole('button', { name: /Take the offering/ }).click();
  check('event reward applies once', await page.evaluate(() => window.__game.run.gold === 120));
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  check('event Continue closes card', await page.locator('#events').isHidden());
  await page.evaluate(() => {
    const g = window.__game;
    g.run.relics = [Object.keys(PopupReview.RELICS)[0]];
    g.events.openPack(g.run, true, () => {});
  });
  await shot('equipment', '#events .evcard');
  await page.evaluate(() => { const g = window.__game; PopupReview.openRelicCard(g.run, g.run.relics[0], document.body); });
  await shot('relic', '#relicCard .om');
  await page.locator('#relicCard .omBack').click();
  check('relic Close removes only relic sheet', await page.locator('#relicCard').count() === 0 && await page.locator('#events').isVisible());
  await page.locator('#events .evcard header button').click();
  await page.evaluate(() => {
    const g = window.__game;
    PopupReview.openMarchOrders(g.meta, 'orcs', 0, 4242, g.meta.party, PopupReview.defaultPicks(g.meta, 'orcs', g.meta.party), (pick) => { window.reviewMarchPick = pick; });
  });
  await shot('march', '#marchOrders .om');
  await page.locator('#marchOrders .omPrimary').click();
  check('Set orders returns picks and closes', await page.evaluate(() => !!window.reviewMarchPick && !document.getElementById('marchOrders')));
  await page.evaluate(() => PopupReview.showAnvil(3, 45, false, () => {}));
  await shot('anvil', '#marchOrders .om');
  check('unaffordable mend remains disabled', await page.locator('#marchOrders .omPrimary').isDisabled());
  await page.locator('#marchOrders .omBack').click();

  await page.evaluate(() => {
    const g = window.__game;
    g.meta.opened = [...new Set([...g.meta.opened, 'castle', 'tower'])];
    g.home.go(() => g.openStand());
  });
  await page.locator('.stPick').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Auto fill', exact: true }).click();
  await page.locator('.stPick .primary').click();
  await page.locator('.stStart').click();
  await page.locator('.stPause').click();
  await shot('pause', '#stand .stSheetCard');
  const before = await page.evaluate(() => window.__game.stand.state.b.t);
  await page.waitForTimeout(350);
  check('pause stops Last Stand clock', await page.evaluate(() => window.__game.stand.state.b.t) === before);
  const scrolling = await page.locator('#stand .stSheetList').evaluate((e) => { e.scrollTop = e.scrollHeight; return e.scrollHeight <= e.clientHeight || e.scrollTop > 0; });
  check('pause hero list scrolls', scrolling);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await shot('pause-reduced', '#stand .stSheetCard');
  await page.locator('.stResume').click();
  check('Resume dismisses pause sheet', await page.locator('#stand .stSheet').isHidden());
  writeFileSync(`docs/samples/${prefix}-checks-${w}.json`, JSON.stringify({ width: w, checks }, null, 2) + '\n');
  console.log('popup checks', w, checks.length, 'passed');
}
