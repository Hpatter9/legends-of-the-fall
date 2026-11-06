// CLIFF-ROAM checks in the page (build with `npm run web` first): node tools/cliff-roam/check.mjs
// A tap on a hero mid-walk opens their sheet; a press held on a walking hero (a long press) opens nothing else by mistake; a tap on
// Hester's corner in the tavern opens her stall, and its Back returns to the tavern.
import { serve, launch } from '../calmap/lib.mjs';
const srv = serve();
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false })));
await page.goto('http://localhost:8139/?seed=7');
await page.waitForFunction(() => !!window.__game);
await page.evaluate(() => {
  const g = window.__game;
  g.meta.unlocked = ['knight', 'archer', 'wizard', 'cleric', 'samurai'];
  g.meta.party = [...g.meta.unlocked];
  g.meta.heroesSeen = [...g.meta.unlocked];
  g.meta.bestStage = 14;
  localStorage.removeItem('legends.run');
  g.home.open();
  document.getElementById('tip').hidden = true;
});
await page.locator('#tipSkip').evaluate((b) => b.click()).catch(() => {});
await page.waitForFunction(() => window.__game.home.camp.actors.size === 5 && window.__game.home.camp.bossRig);
const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) process.exitCode = 1; };
// (run the camp ahead until a hero is mid-walk, then tap where that hero is drawn)
const at = await page.evaluate(() => {
  const c = window.__game.home.camp;
  c.stop();
  for (let t = 0; t < 3000; t++) {
    c.now += 100;
    for (const a of c.actors.values()) { c.think(a, c.now); c.step(a, 100, c.now); }
    const w = [...c.actors.values()].find((a) => a.mood === 'walk' && Math.hypot(a.tx - a.x, a.ty - a.y) > 20 && Math.hypot(a.x - a.spot.x, a.y - a.spot.y) > 30);
    if (w) {
      c.draw();
      const box = c.canvas.getBoundingClientRect();
      return { kind: w.kind, x: box.left + w.x * c.unit, y: box.top + (w.y - w.small.figure / 2) * c.unit, mood: w.mood };
    }
  }
  return null;
});
ok(!!at, `a hero is walking away from their spot (${at?.kind})`);
await page.touchscreen.tap(at.x, at.y);
await page.waitForTimeout(500);
const sheet = await page.evaluate(() => !document.getElementById('hmSheet').hidden && document.getElementById('hmSheet').textContent);
ok(!!sheet, `the tap on the walking ${at.kind} opened a sheet`);
await page.evaluate(() => window.__game.home.closeSheet());
await page.waitForTimeout(400);
// (a press held on the walking hero: no stall, no party, nothing but what a hold did before)
await page.mouse.move(at.x, at.y);
await page.mouse.down();
await page.waitForTimeout(900);
await page.mouse.up();
await page.waitForTimeout(300);
ok(!(await page.evaluate(() => !!document.getElementById('stall'))), 'a held press on a hero opens no stall');
// (the tavern: Hester's corner opens her stall)
await page.evaluate(() => window.__game.home.show('heroes'));
await page.waitForTimeout(1200);
const hp = await page.evaluate(() => {
  const tv = window.__game.home.tavern;
  tv.camX = tv.centreOn(384 + 312);
  tv.draw();
  const box = tv.canvas.getBoundingClientRect();
  return { x: box.left + (384 + 324 - tv.camX) * tv.scale, y: box.top + (170 - tv.camY) * tv.scale };
});
await page.touchscreen.tap(hp.x, hp.y);
await page.waitForTimeout(800);
ok(await page.evaluate(() => !!document.getElementById('stall')), 'a tap on Hester’s corner opens her stall');
await page.evaluate(() => document.querySelector('#stall .hsBack')?.click());
await page.waitForTimeout(500);
ok(await page.evaluate(() => !document.getElementById('stall') && window.__game.home.tab === 'heroes'), 'Back from the stall returns to the tavern');
ok(await page.evaluate(() => !document.getElementById('hmStall') && !document.querySelector('.cpStallSlot')), 'no stall on the overlook');
// (the chest shop's shortcut in the summoning hall still opens the stall, on its Chests tab)
await page.evaluate(() => window.__game.home.hall.shop.click());
await page.waitForTimeout(800);
ok(await page.evaluate(() => !!document.getElementById('stall')), 'the summoning hall’s Chest shop still opens the stall');
await page.evaluate(() => document.querySelector('#stall .hsBack')?.click());
ok(errors.length === 0, `no page errors ${errors.join(' | ')}`);
await browser.close();
srv.close();
