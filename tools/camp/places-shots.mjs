// Screenshots of the war camp's places and bottom bar: node tools/camp/places-shots.mjs  (SIZES=393,360,412; builds with `npm run web` first)
// Writes docs/samples/camp-places-<scene>[-<w>].png: no run, a run going, the Tower locked, the Daily done.
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch, SIZES } from '../calmap/lib.mjs';
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/camp/placesaves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/placesaves.mjs', logLevel: 'error' });
const S = await import('../../out/shots/placesaves.mjs');
const srv = serve();
const browser = await launch();
const sizes = process.env.SIZES ? SIZES.filter(([w]) => process.env.SIZES.split(',').includes(String(w))) : [SIZES[0]];
const scenes = {
  'no-run': { meta: S.meta({}) },
  'run': { meta: S.meta({}), run: S.run('undead', 4) },
  'locked': { meta: S.meta({ locked: true }) },
  'daily-done': { meta: S.meta({ dailyDone: true, best: 12 }) },
};
for (const [w, h] of sizes) {
  for (const [name, sc] of Object.entries(scenes)) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
    await page.goto('http://localhost:8139/?x=' + Math.random());
    await page.evaluate(([m, r]) => {
      localStorage.clear();
      localStorage.setItem('legends.meta', JSON.stringify(m));
      localStorage.setItem('lotf-tips-off', '1');
      if (r) localStorage.setItem('legends.run', JSON.stringify(r));
    }, [sc.meta, sc.run ?? null]);
    await page.goto('http://localhost:8139/');
    await page.waitForTimeout(2200);
    await page.evaluate(() => document.getElementById('tipSkip')?.click());
    await page.waitForTimeout(400);
    await page.screenshot({ path: `docs/samples/camp-places-${name}${w === 393 ? '' : `-${w}`}.png` });
    await ctx.close();
  }
}
await browser.close();
srv.close();
