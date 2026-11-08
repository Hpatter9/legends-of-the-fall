// Camp declutter shots: TAG=before|after SIZES=393,360,412 node tools/camp/declutter-shots.mjs  (build with `npm run web` first)
// Writes docs/samples/camp-declutter-<tag>-<w>.png: the camp with a few heroes, the Tower open, and the stall's new-stock dot.
import { mkdirSync } from 'node:fs';
import { serve, launch, SIZES } from '../calmap/lib.mjs';
mkdirSync('docs/samples', { recursive: true });
const srv = serve();
const browser = await launch();
const sizes = process.env.SIZES ? SIZES.filter(([w]) => process.env.SIZES.split(',').includes(String(w))) : [SIZES[0]];
const tag = process.env.TAG ?? 'after';
for (const [w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.addInitScript(() => localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false })));
  await page.goto('http://localhost:8139/?seed=7');
  await page.waitForFunction(() => !!window.__game);
  await page.evaluate(() => {
    const g = window.__game;
    g.meta.unlocked = ['knight', 'archer', 'wizard', 'cleric', 'samurai'];
    g.meta.party = [...g.meta.unlocked];
    g.meta.heroesSeen = [...g.meta.unlocked];
    g.meta.bestStage = 14; g.meta.opened = ['castle','tower','calamity'];
    localStorage.removeItem('legends.run');
    g.home.open();
    document.getElementById('tip').hidden = true;
  });
  await page.waitForFunction(() => window.__game.home.camp.bossRig && window.__game.home.camp.goatArt);
  await page.locator('#tipSkip').evaluate((b) => b.click()).catch(() => {});
  // (a story card may be showing on a fresh save: skip it)
  for (let i = 0; i < 4; i++) {
    const skip = page.locator('.csSkip:visible');
    if (!(await skip.count())) break;
    await skip.first().click();
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: `docs/samples/hide-modes/camp-${w}x${h}.png` });
  await ctx.close();
}
await browser.close();
srv.close();
