// RELICS-PREP: the run's relics on the wave-prep screen (a tapped one read out), and gone once the fight starts.
// Usage: node tools/relics/prep-shots.mjs [root] [port]   (after `npm run web`); writes docs/samples/relics-prep-*.png.
// The relics are set on the run by hand (a presentation fixture, not a played run).
import { openBrowser } from '../world-001/browser.mjs';
const [root = 'out/web', port = '9041'] = process.argv.slice(2);
const { browser, url, close } = await openBrowser(root, Number(port));
const SIZES = [[393, 852], [360, 780], [412, 915]];
const RELICS = ['whetstone', 'phoenix', 'emberRuby', 'warDrum', 'hourglass', 'luckyCoin', 'ironShield'];
let bad = 0;
try {
  for (const [w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${url}/?seed=11`);
    await page.waitForFunction(() => window.__game);
    await page.waitForTimeout(700);
    // (the opening scene and any tips are skipped)
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => { document.querySelector('.csSkip')?.click(); document.querySelector('#tipSkip')?.click(); });
      await page.waitForTimeout(400);
    }
    await page.addStyleTag({ content: '#quip{display:none!important}' });
    await page.locator('#summon').click().catch(() => {});
    await page.locator('#summon').click().catch(() => {});
    await page.evaluate((ids) => {
      const g = window.__game;
      g.scenesOn = () => false;
      g.run.relics = ids;
      g.newBattle();
      g.endIntro?.();
      g.autoArrange();
      g.refresh();
    }, RELICS);
    await page.waitForTimeout(500);
    await page.evaluate(() => { document.querySelector('.csSkip')?.click(); document.querySelector('#tipSkip')?.click(); });
    await page.evaluate(() => document.querySelectorAll('#relics .relic')[2]?.click());
    await page.waitForTimeout(300);
    const read = () => page.evaluate(() => ({ phase: document.body.dataset.phase, shown: getComputedStyle(document.getElementById('relics')).display !== 'none', icons: document.querySelectorAll('#relics .relic').length, hint: document.querySelector('#relics .hint')?.textContent, overflow: document.documentElement.scrollWidth > innerWidth }));
    const prep = await read();
    await page.screenshot({ path: `docs/samples/relics-prep-${w}x${h}.png` });
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(1500);
    const fight = await read();
    if (w === 393) await page.screenshot({ path: `docs/samples/relics-prep-fight-${w}x${h}.png` });
    console.log(`${w}x${h}`, JSON.stringify({ prep, fight, errors }));
    if (prep.phase !== 'deploy' || !prep.shown || !prep.hint || prep.overflow || fight.phase !== 'fight' || fight.shown || errors.length) bad++;
    await ctx.close();
  }
} finally {
  await close();
}
if (bad) { console.log('FAILED', bad); process.exit(1); }
console.log('ok');
