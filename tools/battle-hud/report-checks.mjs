// Production announcements and result flows, with explicitly labelled outcome and
// long-report fixtures. No claim is made that a full campaign was played here.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
export async function checkBattleReports(page, { prefix, w }) {
  // Keep transient achievement notifications out of the visual evidence only.
  await page.addStyleTag({ content: '.toast { display: none !important; }' });
  // This is an established-player visual fixture. Its first-win Calamity reveal
  // has already been seen, so that unrelated onboarding card cannot cover results.
  await page.evaluate(() => {
    const m = window.__game.meta;
    m.scenes = [...new Set([...(m.scenes ?? []), 'calamityOpens'])];
    m.achievements = [...new Set([...(m.achievements ?? []), 'firstWin'])];
  });
  const checks = [];
  const check = (name, ok) => { assert.ok(ok, name); checks.push(name); };
  const shot = async (name, selector, material = 'combat-panel.png') => {
    await page.locator(selector).first().waitFor({ state: 'visible' });
    await page.locator(selector).first().evaluate(async (e) => {
      await Promise.allSettled(e.getAnimations({ subtree: true }).filter((a) => a.playState !== 'paused' && a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished));
    });
    check(`${name}: painted material`, await page.locator(selector).first().evaluate((e, material) => getComputedStyle(e).borderImageSource.includes(material), material));
    check(`${name}: no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `docs/samples/${prefix}-${name}-${w}.png` });
  };
  await page.evaluate(() => {
    const g = window.__game;
    g.bossm.show('orcWarlord', 'Earthshaker', 'earth', false);
    g.bossm.left = 100000;
  });
  await shot('boss-fixture', '.bmBand', 'combat-crimson.png');
  check('boss band clears the spell controls', await page.evaluate(() => document.querySelector('.bmBand').getBoundingClientRect().top >= document.querySelector('#hudSpells').getBoundingClientRect().bottom));
  check('boss announcement cannot intercept taps', await page.locator('.bmLayer').evaluate((e) => getComputedStyle(e).pointerEvents === 'none'));
  const t = await page.evaluate(() => { const g = window.__game; g.sceneHold = 0; return g.b.t; });
  await page.waitForTimeout(300);
  check('fight clock continues under boss announcement', await page.evaluate(() => window.__game.b.t) > t);
  await page.evaluate(() => { window.__game.sceneHold = 1; window.__game.bossm.hide(); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => window.__game.bossm.show('orcWarlord', 'Earthshaker', 'earth', true));
  await shot('boss-reduced-fixture', '.bmBand', 'combat-crimson.png');
  check('reduced-motion boss band uses fade', await page.locator('.bmBand').evaluate((e) => getComputedStyle(e).animationName === 'bmFade'));
  await page.evaluate(() => window.__game.bossm.hide());
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => {
    const g = window.__game;
    const u = g.b.units.find((u) => u.side === 'hero' && !u.owner && u.def !== 'king');
    g.hud.demoCast(u.id, 1);
    for (const a of document.querySelector('.fhCutIn').getAnimations()) { a.currentTime = 400; a.pause(); }
  });
  await shot('hero-cast-fixture', '.fhCutIn');
  await page.evaluate(() => document.querySelectorAll('.fhCutIn').forEach((e) => e.remove()));

  // Force an outcome, then let the real settlement and result handlers run.
  await page.evaluate(() => { const g = window.__game; g.sceneHold = 0; for (const u of g.b.units) if (u.side === 'foe') { u.hp = 0; u.alive = false; } });
  await page.locator('#result').waitFor({ state: 'visible', timeout: 60000 });
  await page.evaluate(() => { const g = window.__game; g.sceneHold = 1; g.endWait = 3000; if (g.passing) g.passing.wait = 0; g.refresh(); });
  await shot('wave-victory-fixture', '#result #banner');
  check('short victory leaves board visible', await page.locator('#result').evaluate((e) => e.classList.contains('passing')));
  await page.locator('#result #banner').click();
  check('victory tap dismisses short card', await page.locator('#result').isHidden());
  await page.evaluate(() => { const g = window.__game; g.sceneHold = 0; g.autoArrange(true); });
  await page.locator('#fight').click();
  await page.evaluate(() => { const g = window.__game; g.run.retries = 2; for (const u of g.b.units) if (u.side === 'hero') { u.hp = 0; u.alive = false; } });
  await page.locator('#result').waitFor({ state: 'visible', timeout: 60000 });
  await shot('defeat-fixture', '#result #banner', 'combat-crimson.png');
  check('defeat retains Run recap action', await page.locator('#next').textContent() === 'Run recap');
  await page.locator('#next').click();
  await page.locator('#recap .jrTitle').click();
  await shot('defeat-recap', '#recap .jrHead', 'combat-crimson.png');
  await page.locator('#recap .rcAdvice').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `docs/samples/${prefix}-comeback-${w}.png` });
  await page.locator('#recap .rcTip button').first().click();
  await page.waitForFunction(() => document.getElementById('recap').hidden && !document.getElementById('home').hidden);
  check('comeback advice still navigates', true);

  await page.evaluate(() => {
    const g = window.__game;
    for (const e of document.querySelectorAll('#hmSheet, #hmSub, #party')) e.hidden = true;
    g.home.go(() => {}); g.sceneHold = 1;
    g.run.mode = { kind: 'army', army: 'beasts' }; g.run.cleared = true; g.run.over = true;
    const heroes = {}, xp = {}, levels = {};
    for (const [i, k] of ['knight', 'samurai', 'wizard', 'archer', 'cleric', 'werewolf', 'paladin'].entries()) {
      heroes[k] = { dealt: 15432 - i * 1750, healed: k === 'cleric' ? 12640 : 0, taken: 8420 - i * 500, kills: 42 - i * 4, grade: i % 3 + 1 };
      xp[k] = 1250 + i * 100; levels[k] = [29, 31];
    }
    g.run.recap = { fights: 12, cleared: 10, ms: 284000, earned: 12450, spent: 9800, crowns: 840, chests: 3, heroes, xp, levels };
    window.reviewCrowns = g.meta.crowns;
    g.showRunRecap();
  });
  await page.locator('#recap .jrTitle').click();
  await shot('victory-recap-fixture', '#recap .jrHead');
  check('viewing recap does not pay crowns twice', await page.evaluate(() => window.__game.meta.crowns === window.reviewCrowns));
  check('recap retains every fixture hero', await page.locator('#recap .rcHero').count() === 7);
  await page.locator('#recap .rcHeroes').scrollIntoViewIfNeeded();
  await shot('company-fixture', '#recap .rcHero');
  await page.locator('#recap .rcSheet').evaluate((e) => { e.scrollTop = e.scrollHeight; });
  check('long recap scrolls', await page.locator('#recap .rcSheet').evaluate((e) => e.scrollTop > 0));
  await page.screenshot({ path: `docs/samples/${prefix}-recap-end-${w}.png` });
  check('recap Continue stays reachable', await page.locator('#recap .rcFoot button').isVisible());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#recap .rcSheet').evaluate((e) => { e.scrollTop = 0; });
  await shot('recap-reduced-fixture', '#recap .jrHead');
  await page.locator('#recap .rcFoot button').click();
  check('recap Continue dismisses report', await page.locator('#recap').isHidden());

  await page.evaluate(() => { const g = window.__game; g.home.go(() => {}); g.run.recap = undefined; g.showRunRecap(); });
  await page.locator('#recap .jrTitle').click();
  await shot('old-save-fixture', '#recap .jrHead');
  await page.locator('#recap .rcFoot button').click();
  for (const cal of [false, true]) {
    await page.evaluate((cal) => {
      const g = window.__game; g.home.go(() => {});
      g.towerView.showSummary(g.run, { floors: 18, act: 3, crowns: 480, bronze: 2, silver: 1, gold: 1, gear: ['Rare steel armour'], relics: 4, heroes: 5, newBest: true, ...(cal ? { maps: 2, ascension: 1 } : {}) }, () => {});
    }, cal);
    await shot(cal ? 'calamity-summary-fixture' : 'route-summary-fixture', '#towerMap .rtCard.summary');
    await page.locator('#towerMap .rtCard.summary > .primary').click();
    check('summary Continue closes report', await page.locator('#towerMap').isHidden());
  }
  await page.evaluate(() => {
    const g = window.__game;
    g.auto = { army: 'undead', count: 3, run: 3, totals: { runs: 3, crowns: 1260, xp: 18450, chests: 3, gear: 2 } };
    g.endAuto('done');
  });
  await shot('replay-summary-fixture', '#autoSum .asumCard');
  check('replay labels and values share a row', await page.locator('#autoSum .asumRows').evaluate((e) => {
    const a = e.children[0].getBoundingClientRect(), b = e.children[1].getBoundingClientRect();
    return Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) < 1;
  }));
  check('replay totals are preserved', await page.locator('#autoSum .asumRows').textContent().then((s) => s.includes('1260') && s.includes('18450')));
  await page.locator('#asumOk').click();
  check('replay summary closes', await page.locator('#autoSum').isHidden());

  await page.evaluate(() => { const g = window.__game; g.meta.opened = [...new Set([...g.meta.opened, 'castle', 'tower'])]; g.home.go(() => g.openStand()); });
  await page.locator('.stPick').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Auto fill', exact: true }).click();
  await page.locator('.stPick .primary').click();
  await page.locator('.stStart').click();
  await page.evaluate(() => { const s = window.__game.stand.state; s.king.hp = 0; s.king.alive = false; s.b.phase = 'lost'; });
  await page.locator('.stEnd').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('.stEnd .jrTitle').click();
  await shot('last-stand-end-fixture', '#stand .stEndCard', 'combat-crimson.png');
  await page.getByRole('button', { name: 'Home', exact: true }).last().click();
  check('Last Stand end returns Home', await page.locator('#stand').isHidden());
  const asset = await page.request.get(new URL('ui/combat-crimson.png', page.url()).href);
  check('crimson asset loads', asset.ok());
  if (w === 393) {
    await page.waitForFunction(async () => { for (const key of await caches.keys()) if (await (await caches.open(key)).match('ui/combat-crimson.png')) return true; return false; }, null, { timeout: 120000 });
    check('crimson art cached offline', true);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => navigator.serviceWorker.controller && window.__game?.home, null, { timeout: 90000 });
    await page.context().setOffline(true);
    try { check('crimson art served offline', await page.evaluate(async () => (await fetch('ui/combat-crimson.png')).ok)); }
    finally { await page.context().setOffline(false); }
  }
  writeFileSync(`docs/samples/${prefix}-checks-${w}.json`, JSON.stringify({ width: w, checks }, null, 2) + '\n');
  console.log('report checks', w, checks.length, 'passed');
}
