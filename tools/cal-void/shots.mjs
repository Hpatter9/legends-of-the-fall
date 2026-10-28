// MOCK-UP screenshots for CAL-VOID phase A: the real Calamity screen (header and footer from the game) with each proposed small map drawn
// into its map box by tools/cal-void/mock.ts.   node tools/cal-void/shots.mjs   (npm run web first)
// Writes docs/samples/cal-void-mock-<scene>.png at 393x852 (SIZES=360,412 for the others) and the contact sheet cal-void-mock-sheet.png.
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { serve, launch, openHome, SIZES } from '../calmap/lib.mjs';
const out = 'out/shots';
mkdirSync(out, { recursive: true });
await esbuild.build({ entryPoints: ['tools/calmap/saves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: `${out}/saves.mjs`, logLevel: 'error' });
await esbuild.build({ entryPoints: ['tools/cal-void/mock.ts'], bundle: true, format: 'iife', loader: { '.png': 'dataurl' }, outfile: `${out}/calvoid-mock.js`, logLevel: 'error' });
const S = await import(`../../${out}/saves.mjs`);
const PORT = 8173;
const srv = serve('out/web', PORT);
const browser = await launch();
const want = process.argv.slice(2);
const scenes = ['a-fresh', 'a-mid', 'b-fresh', 'b-mid', 'c-fresh', 'c-mid'].filter((n) => !want.length || want.includes(n));
const sizes = process.env.SIZES ? SIZES.filter(([w]) => process.env.SIZES.split(',').includes(String(w))) : [SIZES[0]];
for (const [w, h] of sizes) {
  const suffix = w === 393 ? '' : `-${w}`;
  for (const name of scenes) {
    const { ctx, page } = await openHome(browser, w, h, PORT);
    await page.evaluate((json) => localStorage.setItem('legends.calamity', json), JSON.stringify(S.fresh(11)));
    await page.reload();
    await page.waitForTimeout(2000);
    await page.evaluate(() => document.getElementById('tipSkip')?.click());
    await page.waitForSelector('#hmCalamity', { state: 'attached', timeout: 20000 });
    await page.evaluate(() => document.getElementById('hmCalamity').click());
    await page.waitForSelector('.cmScroll', { timeout: 20000 });
    await page.waitForTimeout(1800);
    // (stop the real map's loop drawing into a box it no longer owns)
    await page.evaluate(() => window.__game?.towerView?.cal?.release?.());
    await page.addScriptTag({ path: `${out}/calvoid-mock.js` });
    await page.evaluate((n) => window.__calVoidMock(n), name);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `docs/samples/cal-void-mock-${name}${suffix}.png` });
    console.log('shot', name, w);
    await ctx.close();
  }
}
await browser.close();
srv.close();
if (sizes.some(([w]) => w === 393)) execFileSync('python3', ['-I', 'tools/cal-void/sheet.py'], { stdio: 'inherit' });
