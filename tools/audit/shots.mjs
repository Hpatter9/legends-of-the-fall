// Screenshots for docs/samples/upright-*.png: every tab at 393x852, the armies screen, a fight, and a desktop-width window.
import { serve, launch, HEROES, saveScript } from './lib.mjs';
const srv = serve();
const browser = await launch();
const base = `http://localhost:${srv.address().port}/`;
async function open(vp, dpr = 2) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dpr, hasTouch: vp.width < 600 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.addInitScript(saveScript(), [HEROES, {}]);
  await page.goto(base);
  await page.waitForTimeout(2000);
  return page;
}
const out = (n) => `docs/samples/upright-${n}.png`;
let page = await open({ width: 393, height: 852 });
for (const [i, n] of ['recruit', 'heroes', 'battle', 'castle'].entries()) {
  await page.locator('.hmTab').nth(i).click();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: out(n) });
}
await page.locator('.hmTab').nth(4).click();
await page.waitForTimeout(1200);
await page.screenshot({ path: out('spells') });
await page.locator('#sbClose').click();
await page.evaluate(() => window.__game.home.openArmies());
await page.waitForTimeout(1200);
await page.screenshot({ path: out('armies') });
await page.evaluate(() => {
  const g = window.__game; g.run.gold = 99999;
  for (let i = 0; i < 40; i++) document.getElementById('summon')?.click();
  g.run.stage = 8; g.run.squad = [...g.run.roster].sort((a, b) => b.grade - a.grade).slice(0, 5).map((h) => h.id);
  document.getElementById('home').hidden = true; g.newBattle();
});
await page.waitForTimeout(800);
await page.screenshot({ path: out('deploy') });
await page.evaluate(() => document.getElementById('fight').click());
await page.waitForTimeout(5000);
await page.screenshot({ path: out('fight') });
await page.context().close();
// a desktop window: the upright layout stays in a phone-width column
page = await open({ width: 1280, height: 800 }, 1);
await page.screenshot({ path: out('desktop') });
await page.locator('.hmTab').nth(1).click();
await page.waitForTimeout(1500);
await page.screenshot({ path: out('desktop-heroes') });
await page.evaluate(() => {
  const g = window.__game; g.run.gold = 99999;
  for (let i = 0; i < 40; i++) document.getElementById('summon')?.click();
  g.run.squad = [...g.run.roster].sort((a, b) => b.grade - a.grade).slice(0, 5).map((h) => h.id);
  document.getElementById('home').hidden = true; g.newBattle();
});
await page.waitForTimeout(800);
await page.screenshot({ path: out('desktop-deploy') });
await browser.close(); srv.close();
