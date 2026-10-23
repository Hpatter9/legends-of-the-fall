// The close-and-reopen check: a calamity mid-map (a hidden hoard taken, spots spent, fog lifted), the page reloaded, the portal tapped, and the same view shown;
// then a game closed mid-walk, which reopens with the leader at the spot it was walking to (lit as chosen) and its fight not begun.
//   node tools/calmap/reload.mjs   (builds with `npm run web` first) -> docs/samples/calamity-map-reload-*.png
import * as esbuild from 'esbuild';
import { mkdirSync, readFileSync } from 'node:fs';
import { serve, launch, openHome } from './lib.mjs';
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/calmap/saves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/saves.mjs', logLevel: 'error' });
const S = await import('../../out/shots/saves.mjs');
const srv = serve();
const browser = await launch();
const [w, h] = [393, 852];
const open = async (page) => {
  await page.evaluate(() => { document.getElementById('tipSkip')?.click(); document.getElementById('hmCalamity').click(); });
  await page.waitForTimeout(1800);
};
// 1. mid-map
{
  const { ctx, page } = await openHome(browser, w, h);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate((j) => localStorage.setItem('legends.calamity', j), JSON.stringify(S.afterSide(1)));
  await page.reload();
  await page.waitForTimeout(2000);
  await open(page);
  await page.screenshot({ path: 'docs/samples/calamity-map-reload-before.png' });
  await page.reload();
  await page.waitForTimeout(2000);
  await open(page);
  await page.screenshot({ path: 'docs/samples/calamity-map-reload-after.png' });
  const same = readFileSync('docs/samples/calamity-map-reload-before.png').equals(readFileSync('docs/samples/calamity-map-reload-after.png'));
  console.log('mid-map: the view after reopening is', same ? 'identical' : 'DIFFERENT');
  await ctx.close();
}
// 2. mid-walk
{
  const { ctx, page } = await openHome(browser, w, h);
  const f = S.withFork(1);
  await page.evaluate((j) => localStorage.setItem('legends.calamity', j), JSON.stringify(S.standing(S.fresh(f.seed), 1, f.id)));
  await page.reload();
  await page.waitForTimeout(2000);
  await open(page);
  await page.evaluate(() => document.querySelector('.cmSpot.open .cmHit').click());
  await page.evaluate(() => document.querySelector('.rtGo').click());
  await page.waitForTimeout(150);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('legends.calamity')).tower.going);
  console.log('saved as going:', saved);
  await page.reload();
  await page.waitForTimeout(2000);
  await open(page);
  await page.screenshot({ path: 'docs/samples/calamity-map-reload-walk.png' });
  console.log(await page.evaluate(() => JSON.stringify({ picked: document.querySelector('.cmSpot.picked')?.dataset.id, go: document.querySelector('.rtGo')?.textContent, fightOpen: !!document.getElementById('fight')?.offsetParent })));
  await ctx.close();
}
await browser.close();
srv.close();
