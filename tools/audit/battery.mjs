// Battery checks on the built page, with the battery saver on:  the drawing rate of each scene (should be at most 30 a second), that a hidden
// page stops drawing, and when the screen wake lock is held (a fight only).   node tools/audit/battery.mjs
import { serve, launch, HEROES, saveScript } from './lib.mjs';
const srv = serve();
const base = `http://localhost:${srv.address().port}/`;
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.addInitScript(saveScript(), [HEROES, {}]);
await page.addInitScript(() => localStorage.setItem('legends.settings', JSON.stringify({ saver: true, awake: true })));
await page.addInitScript(() => {
  // (a fake wake lock that counts how many are held)
  window.__held = 0;
  Object.defineProperty(navigator, 'wakeLock', { value: { request: async () => { window.__held++; let on = true; return { released: false, release: async () => { if (on) { on = false; window.__held--; } }, addEventListener() {} }; } } });
  // (frames drawn: the animation frames in which a 2D canvas got a draw call, or the WebGL stage was rendered)
  window.__fi = 0; window.__draws = {};
  const tick = () => { window.__fi++; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const d = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (...a) { if (this.canvas.width > 300) { const k = this.canvas.className || `${this.canvas.width}x${this.canvas.height}`; (window.__draws[k] ??= new Set()).add(window.__fi); } return d.apply(this, a); };
});
await page.goto(base);
await page.waitForTimeout(1500);
const rate = async (label, ms = 3000) => {
  await page.evaluate(() => { window.__draws = {}; window.__fi0 = window.__fi; window.__r0 = performance.now(); });
  await page.waitForTimeout(ms);
  const r = await page.evaluate(() => ({ drawn: Object.fromEntries(Object.entries(window.__draws).map(([k, v]) => [k, v.size])), frames: window.__fi - window.__fi0, secs: (performance.now() - window.__r0) / 1000 }));
  console.log(label.padEnd(20), `of ${(r.frames / r.secs).toFixed(1)} frames/s:`, Object.entries(r.drawn).map(([k, n]) => `${k} ${(n / r.secs).toFixed(1)}/s`).join(', ') || 'nothing drawn');
  return r;
};
// (Pixi: count the stage renders)
await page.evaluate(() => { const g = window.__game; const o = g.app.renderer.render.bind(g.app.renderer); g.app.renderer.render = (...a) => { (window.__draws['pixi'] ??= new Set()).add(window.__fi); return o(...a); }; });
await rate('home (battle tab)');
await page.locator('.hmTab').nth(1).click();
await rate('tavern');
await page.locator('.hmTab').nth(3).click();
await rate('castle');
// summoning: the recruit page
await page.locator('.hmTab').nth(0).click();
await page.waitForTimeout(500);
await rate('recruit (summoning)', 2000);
// a fight
console.log('wake lock held on the home screen:', await page.evaluate(() => window.__held));
await page.evaluate(() => {
  const g = window.__game; g.run.gold = 9999;
  for (let i = 0; i < 20; i++) document.getElementById('summon')?.click();
  g.run.stage = 4; g.run.squad = [...g.run.roster].sort((a, b) => b.grade - a.grade).slice(0, 5).map((h) => h.id);
  document.getElementById('home').hidden = true; g.newBattle();
});
await page.waitForTimeout(500);
console.log('wake lock held while deploying:', await page.evaluate(() => window.__held));
await page.evaluate(() => document.getElementById('fight').click());
await page.waitForTimeout(500);
console.log('wake lock held in the fight:', await page.evaluate(() => window.__held));
const f = await rate('fight (pixi)');
console.log('pixi maxFPS:', await page.evaluate(() => window.__game.app.ticker.maxFPS));
// hidden page: the browser stops animation frames itself; the scenes also halt on the event (checked on the tavern and the castle)
const hide = (on) => page.evaluate((on) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => on }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (on ? 'hidden' : 'visible') }); document.dispatchEvent(new Event('visibilitychange')); }, on);
await page.evaluate(() => { document.getElementById('home').hidden = false; window.__game.home.open(); });
for (const [tab, name] of [[1, 'tavern'], [3, 'castle']]) {
  await page.locator('.hmTab').nth(tab).click();
  await page.waitForTimeout(600);
  await hide(true);
  await rate(`${name}, page hidden`, 2000);
  await hide(false);
  await rate(`${name}, back`, 1500);
}
// the fight ends (win by force): the lock goes
await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') u.hp = 0; });
await page.waitForTimeout(3500);
console.log('fight phase now:', await page.evaluate(() => window.__game.b.phase), 'wake lock held after the fight:', await page.evaluate(() => window.__held));
await browser.close(); srv.close();
