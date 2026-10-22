// Loads the built page once online (touring every tab, a fight, the armies screen and the sound), then goes offline, reloads and tours
// again: any request that fails, or any file the tour asked for that the service worker did not cache, is reported.
//   node tools/audit/offline.mjs
import { serve, launch, HEROES, saveScript } from './lib.mjs';
const srv = serve();
const base = `http://localhost:${srv.address().port}/`;
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true });
const page = await ctx.newPage();
const seen = new Set();
const failed = [];
let errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('request', (r) => seen.add(new URL(r.url()).pathname));
page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`));
page.on('response', (r) => r.status() >= 400 && failed.push(`${r.url()} ${r.status()}`));
await page.addInitScript(saveScript(), [HEROES, {}]);
await page.addInitScript(() => { window.__audios = []; const A = window.Audio; window.Audio = function (...a) { const e = new A(...a); window.__audios.push(e); return e; }; });
async function tour(label) {
  await page.waitForTimeout(1500);
  const tabs = await page.locator('.hmTab').count();
  for (let i = 0; i < tabs; i++) {
    await page.locator('.hmTab').nth(i).click();
    await page.waitForTimeout(900);
    // (the Spells tab opens the spellbook over the page)
    if (await page.locator('#sbClose').isVisible()) await page.locator('#sbClose').click();
  }
  // sound: the music and effects start from a tap
  await page.locator('.hmTab').nth(2).click();
  await page.mouse.click(200, 400);
  await page.evaluate(async () => {
    const g = window.__game;
    document.getElementById('home').hidden = true;
    g.run.gold = 9999;
    for (let i = 0; i < 6; i++) document.getElementById('summon')?.click();
    g.run.squad = g.run.roster.slice(0, 5).map((h) => h.id);
    g.newBattle();
    document.getElementById('fight').click();
  });
  await page.waitForTimeout(3000);
  const fight = await page.evaluate(() => ({ phase: window.__game.b.phase, t: window.__game.b.t }));
  const fonts = await page.evaluate(() => ['900 16px "Cinzel Decorative"', '700 16px "Alegreya Sans"', '16px "Press Start 2P"'].map((f) => document.fonts.check(f)));
  const audio = await page.evaluate(() => window.__audios.map((a) => `${a.currentSrc.split('/').pop()}:${a.error ? 'ERR' : a.readyState}`));
  console.log(label, 'fight', JSON.stringify(fight), 'fonts', fonts, 'audio', audio, 'tabs', tabs);
  await page.evaluate(() => { document.getElementById('home').hidden = false; window.__game.home.open(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__game.home.openArmies());
  await page.waitForTimeout(1000);
  console.log(label, 'armies screen cards', await page.locator('.army').count());
}
await page.goto(base);
await tour('online');
await page.evaluate(() => navigator.serviceWorker.ready.then(() => 0));
await page.waitForTimeout(3000);
const cached = await page.evaluate(async () => { const out = []; for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) out.push(new URL(r.url).pathname); return out; });
const missing = [...seen].filter((p) => !cached.includes(p) && p !== '/' && !p.endsWith('.map'));
console.log('requested online:', seen.size, 'cached:', cached.length, 'requested but not cached:', JSON.stringify(missing));
failed.length = 0; errors = []; seen.clear();
await ctx.setOffline(true);
await page.reload();
await tour('offline');
console.log('offline failed requests:', JSON.stringify(failed), 'errors:', JSON.stringify(errors));
await browser.close(); srv.close();
