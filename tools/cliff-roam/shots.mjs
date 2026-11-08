// CLIFF-ROAM shots (docs/notes/cliff-roam.md): build with `npm run web` first, then node tools/cliff-roam/shots.mjs
// Writes docs/samples/cliff-roam/: camp-<w>-<n>.png, three moments of the heroes wandering the ledge at each phone size (the camp's
// own think and step, run ahead in tenths of a second), camp-reduced-<w>.png with motion reduced, and the tavern's hearth hall with
// Hester's corner: tavern-<w>.png (new stock) and tavern-dealer-<w>.png (the Gloaming Dealer visiting).
import { mkdirSync } from 'node:fs';
import { serve, launch, SIZES } from '../calmap/lib.mjs';
const OUT = 'docs/samples/cliff-roam';
mkdirSync(OUT, { recursive: true });
const srv = serve();
const browser = await launch();

async function open(w, h, { reduced = false, dealer = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.addInitScript(() => localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false })));
  await page.goto('http://localhost:8139/?seed=7');
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate((dealer) => {
    const g = window.__game;
    g.meta.unlocked = ['knight', 'archer', 'wizard', 'cleric', 'samurai', 'mercenary', 'buccaneer', 'gunslinger', 'rifleBot', 'samuraiCommander', 'shambler', 'druid', 'satyr'];
    g.meta.party = ['knight', 'archer', 'wizard', 'cleric', 'samurai'];
    g.meta.heroesSeen = [...g.meta.unlocked];
    g.meta.bestStage = 14;
    if (dealer) g.meta.stall = { ...(g.meta.stall ?? { day: 0, sold: {}, spent: 0 }), dealerDue: true };
    localStorage.removeItem('legends.run');
    g.home.open();
    document.getElementById('tip').hidden = true;
  }, dealer);
  await page.locator('#tipSkip').evaluate((b) => b.click()).catch(() => {});
  for (let i = 0; i < 4; i++) {
    const skip = page.locator('.csSkip:visible');
    if (!(await skip.count())) break;
    await skip.first().click();
    await page.waitForTimeout(400);
  }
  return { ctx, page };
}

for (const [w, h] of SIZES) {
  const { ctx, page } = await open(w, h);
  await page.waitForFunction(() => window.__game.home.camp.bossRig && window.__game.home.camp.goatArt && window.__game.home.camp.actors.size === 5);
  // (the loop is stopped and the camp is run ahead by hand, so each moment is where the wander has got to, then painted once)
  await page.evaluate(() => window.__game.home.camp.stop());
  for (const [n, secs] of [[1, 0], [2, 25], [3, 60]]) {
    await page.evaluate((secs) => {
      const c = window.__game.home.camp;
      for (let t = 0; t < secs * 10; t++) {
        c.now += 100;
        for (const a of c.actors.values()) { c.think(a, c.now); c.step(a, 100, c.now); }
      }
      c.draw();
    }, secs);
    await page.screenshot({ path: `${OUT}/camp-${w}-${n}.png` });
  }
  await ctx.close();
  const r = await open(w, h, { reduced: true });
  await r.page.waitForFunction(() => window.__game.home.camp.bossRig && window.__game.home.camp.goatArt);
  await r.page.waitForTimeout(3000);
  await r.page.screenshot({ path: `${OUT}/camp-reduced-${w}.png` });
  await r.ctx.close();
  for (const dealer of [false, true]) {
    const t = await open(w, h, { dealer, reduced: true });
    await t.page.evaluate(() => {
      window.__game.home.show('heroes');
    });
    await t.page.waitForTimeout(1200);
    await t.page.evaluate(() => {
      const tv = window.__game.home.tavern;
      tv.camX = tv.centreOn(384 + 312);
      tv.draw();
    });
    await t.page.waitForTimeout(300);
    await t.page.screenshot({ path: `${OUT}/tavern${dealer ? '-dealer' : ''}-${w}.png` });
    await t.ctx.close();
  }
}
await browser.close();
srv.close();
