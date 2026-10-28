// After npm run web, serve out/web locally and run this with Playwright available.
// URL and CHROMIUM can override the local server and browser binary.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/usr/bin/chromium', args: ['--no-sandbox', '--no-proxy-server', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const url = process.env.URL ?? 'http://127.0.0.1:8000';
mkdirSync('docs/samples', { recursive: true });
const armies = ['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'];
try {
  for (const [width, height] of [[393, 852], [360, 780], [412, 915]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${url}/?seed=7`);
    await page.waitForFunction(() => !!window.__game);
    await page.evaluate(() => {
      const g = window.__game;
      g.meta.unlocked = ['knight', 'archer', 'wizard', 'cleric', 'samurai'];
      g.meta.party = [...g.meta.unlocked];
      localStorage.removeItem('legends.run');
      g.home.open();
      document.getElementById('tip').hidden = true;
    });
    await page.waitForFunction(() => window.__game.home.camp.bossRig && window.__game.home.camp.goatArt);
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#hmCalamity').isDisabled(), true);
    assert.equal(await page.locator('#hmTower').isDisabled(), true);
    await page.screenshot({ path: `docs/samples/battle-overlook-locked-${width}.png` });
    const still = await page.locator('.cpRoom').evaluate((c) => c.toDataURL());
    await page.waitForTimeout(350);
    assert.equal(await page.locator('.cpRoom').evaluate((c) => c.toDataURL()), still, 'reduced-motion scene stays still');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    // A full touch target must be unobstructed at its centre.
    for (const selector of ['#hmBattle', '#hmDaily', '#hmParty', '.cpPlate']) {
      assert.ok(await page.locator(selector).evaluate((e) => {
        const b = e.getBoundingClientRect();
        return e.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2));
      }), `${selector} unobstructed at ${width}`);
    }
    // Existing actions still open the correct screen.
    await page.locator('#hmBattle').click();
    assert.equal(await page.locator('#hmSubTitle').innerText(), 'Armies');
    await page.locator('.asBack').click();
    await page.locator('#hmParty').click();
    assert.ok(await page.locator('#party').isVisible());
    await page.locator('#ptBack').click();
    await page.locator('#hmDaily').click();
    assert.ok(await page.locator('.dayCard').isVisible());
    await page.locator('.dayCard').getByRole('button', { name: 'Back', exact: true }).click();
    await page.evaluate(() => {
      const g = window.__game;
      g.meta.opened = [...new Set([...(g.meta.opened ?? []), 'tower', 'calamity'])];
      g.meta.stash = [{ army: 'orcs', at: 3, tier: 0, seed: 7 }, { army: 'orcs', at: 5, tier: 0, seed: 8 }];
      g.home.refresh();
    });
    assert.equal(await page.locator('#hmCalamity').isDisabled(), false);
    assert.equal(await page.locator('#hmTower').isDisabled(), false);
    await page.screenshot({ path: `docs/samples/battle-overlook-${width}.png` });
    await page.locator('#hmCalamity').click();
    assert.ok(await page.locator('.cvPick').isVisible());
    await page.locator('.cvPick').getByRole('button', { name: 'Back', exact: true }).click();
    await page.locator('#hmTower').click();
    assert.ok(await page.locator('.stPickCard').isVisible());
    await page.locator('.stPickCard').getByRole('button', { name: 'Back', exact: true }).click();
    // Load the current army through the real saved-run hook, rather than directly setting a scene.
    const campPixels = new Set();
    const campPanels = new Set();
    for (const army of armies) {
      await page.evaluate((id) => {
        localStorage.setItem('legends.run', JSON.stringify({ seed: 7, roster: [], gold: 70, stage: 3, over: false, mode: { kind: 'army', army: id } }));
        window.__game.home.refresh();
      }, army);
      assert.equal(await page.locator('.cpWrap').getAttribute('data-army'), army);
      assert.ok(await page.evaluate(() => {
        const c = window.__game.home.camp;
        return c.armyRigs.size > 0 && c.bossRig && c.crew.every((k) => c.armyRigs.has(k));
      }));
      campPanels.add(await page.locator('.cpWrap').getAttribute('data-camp'));
      campPixels.add(await page.evaluate(() => {
        const c = window.__game.home.camp;
        const data = c.back.getContext('2d').getImageData(0, Math.round(c.camp.h * 0.34), c.camp.w, Math.round(c.camp.h * 0.26)).data;
        let hash = 2166136261;
        for (let i = 0; i < data.length; i += 37) hash = Math.imul(hash ^ data[i], 16777619);
        return hash;
      }));
      assert.ok(await page.evaluate(() => window.__game.home.camp.ranks.length < 30));
      assert.match(await page.locator('.hmCont').innerText(), /wave 3/);
      if (width === 393 || ['undead', 'labyrinth'].includes(army)) {
        await page.waitForTimeout(80);
        await page.screenshot({ path: `docs/samples/battle-overlook-${army}${width === 393 ? '' : '-' + width}.png` });
      }
    }
    assert.equal(campPanels.size, armies.length, 'every army uses distinct scenery');
    assert.equal(campPixels.size, armies.length, 'every army actually repaints the valley');
    // Static scenery and sprites remain opaque through animated frames and saver mode.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => { window.__game.home.camp.saver = true; });
    await page.waitForTimeout(250);
    assert.ok(await page.evaluate(() => {
      const c = window.__game.home.camp;
      const pixels = c.ctx.getImageData(0, 0, c.canvas.width, c.canvas.height).data;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 255) return false;
      return true;
    }), 'no transparent scene pixels');
    // A hero remains tappable from the ledge, and tab changes stop the animation loop.
    await page.evaluate(() => {
      localStorage.removeItem('legends.run');
      window.__game.home.refresh();
      window.__game.home.camp.stop();
    });
    const hero = await page.evaluate(() => {
      const c = window.__game.home.camp;
      const a = [...c.actors.values()][0];
      const b = c.canvas.getBoundingClientRect();
      return { x: b.left + a.x * c.unit, y: b.top + (a.spot.y - 20) * c.unit };
    });
    await page.mouse.click(hero.x, hero.y);
    assert.ok(await page.locator('#hmSheet').isVisible());
    await page.evaluate(() => window.__game.home.closeSheet());
    await page.locator('.hmTab').nth(3).click();
    assert.equal(await page.evaluate(() => window.__game.home.camp.raf), 0);
    await page.locator('.hmTab').nth(2).click();
    await page.waitForFunction(() => window.__game.home.camp.raf > 0);
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}x${height}: controls, locked/open Calamity, nine distinct camps, reduced motion, saver, hero taps and tab lifecycle`);
    await context.close();
  }
  // The new artwork is bundled inside the already-cached game.js. Verify a real offline launch.
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${url.replace('127.0.0.1', 'localhost')}/?seed=7`);
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise((ok) => {
      if (navigator.serviceWorker.controller) return ok();
      navigator.serviceWorker.addEventListener('controllerchange', () => ok(), { once: true });
    });
  });
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => { window.__game.home.open(); document.getElementById('tip').hidden = true; });
  await page.waitForFunction(() => !!window.__game.home.camp.back && !!window.__game.home.camp.bossRig);
  await page.screenshot({ path: 'docs/samples/battle-overlook-offline.png' });
  for (const army of armies) {
    await page.evaluate((id) => {
      localStorage.setItem('legends.run', JSON.stringify({ seed: 7, roster: [], gold: 70, stage: 3, over: false, mode: { kind: 'army', army: id } }));
      window.__game.home.refresh();
    }, army);
    assert.equal(await page.locator('.cpWrap').getAttribute('data-army'), army);
    assert.ok(await page.locator('.cpWrap').getAttribute('data-camp'));
  }
  assert.deepEqual(errors, []);
  console.log('PASS cached offline launch with all nine camp paintings and army sprites');
  await context.close();
} finally {
  await browser.close();
}
