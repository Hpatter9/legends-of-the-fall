// Screenshots of the Calamity's map and the camp's portal, at 393x852 (and 360x780 and 412x915):
//   node tools/calmap/shots.mjs [scene ...]     (builds with `npm run web` first; writes docs/samples/calamity-map-*.png)
// Each scene starts from a saved run in the state it names (`tools/calmap/saves.ts`), so the maps are the same every time.
import * as esbuild from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { serve, launch, openHome, SIZES } from './lib.mjs';
const out = 'out/shots';
mkdirSync(out, { recursive: true });
await esbuild.build({ entryPoints: ['tools/calmap/saves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: `${out}/saves.mjs`, logLevel: 'error' });
const S = await import(`../../${out}/saves.mjs`);
const srv = serve();
const browser = await launch();
const want = process.argv.slice(2);
const sizes = process.env.SIZES ? SIZES.filter(([w]) => process.env.SIZES.split(',').includes(String(w))) : [SIZES[0]];
const side = S.withSide(1, 1);
const side2 = S.withSide(3, 2, 'elite');
const later = (act, seed) => () => { const r = S.fresh(seed); const m = S.firstNodeAt(r, act, 2); return S.standing(r, act, m); };
const scenes = {
  'camp': null,
  'fresh': () => S.fresh(11),
  'fork': () => { const f = S.withFork(1); return S.standing(S.fresh(f.seed), 1, f.id); },
  'side': () => S.standing(S.fresh(side.seed), side.act, side.from),
  'side-elite': () => S.standing(S.fresh(side2.seed), side2.act, side2.from),
  'walk': { make: () => { const f = S.withFork(1); return S.standing(S.fresh(f.seed), 1, f.id); }, after: async (page) => {
    await page.evaluate(() => document.querySelector('.cmSpot.open .cmHit').click());
    await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector('.rtGo').click());
    await page.waitForTimeout(120);
  } },
  'later': later(4, 14),
  'm2': later(2, 12),
  'm3': later(3, 13),
  'm5': later(5, 15),
  'm6': later(6, 16),
  'boss': () => { const r = S.fresh(15); return S.standing(r, 6, S.beforeBoss(r, 6)); },
};
// the whole land of each map with the fog off (to look at the art): land-1 .. land-6
for (let n = 1; n <= 6; n++) scenes[`land-${n}`] = () => S.standing(S.fresh(11 + n), n, -1);
for (const [w, h] of sizes) {
  const suffix = w === 393 ? '' : `-${w}`;
  for (const [name, make] of Object.entries(scenes)) {
    if (want.length && !want.includes(name)) continue;
    const { ctx, page } = await openHome(browser, w, h);
    const spec = typeof make === 'function' ? { make } : make;
    if (spec) {
      const run = spec.make();
      await page.evaluate((json) => localStorage.setItem('legends.calamity', json), JSON.stringify(run));
      await page.reload();
      await page.waitForTimeout(2000);
      await page.evaluate(() => document.getElementById('tipSkip')?.click());
      await page.evaluate(() => { document.getElementById('hmCalamity').click(); });
      await page.waitForTimeout(1800);
    }
    if (spec?.after) await spec.after(page);
    if (name.startsWith('land-')) {
      // (the baked ground and its landmarks, straight from the canvas: the whole land, no fog)
      const data = await page.evaluate(() => window.__game.towerView.cal.bakedGround.toDataURL('image/png'));
      writeFileSync(`out/shots/${name}${suffix}.png`, Buffer.from(data.split(',')[1], 'base64'));
    } else await page.screenshot({ path: `docs/samples/calamity-void-${name}${suffix}.png` });
    await ctx.close();
  }
}
await browser.close();
srv.close();
