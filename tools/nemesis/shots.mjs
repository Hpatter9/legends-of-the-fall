// Screenshots of the Nemesis War, phase 1: node tools/nemesis/shots.mjs  (builds with `npm run web` first; SIZES=393,360,412 by default all three)
// Writes docs/samples/nemesis-1/<scene>-<w>.png: the camp with the Council's place, the board, a nemesis's card, Morrow on the boss wave
// (deploy and fight), and the wave card after a lieutenant falls.
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch, SIZES } from '../calmap/lib.mjs';
const OUT = 'docs/samples/nemesis-1';
mkdirSync(OUT, { recursive: true });
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/nemesis/saves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/nemsaves.mjs', logLevel: 'error' });
const S = await import('../../out/shots/nemsaves.mjs');
const TIPS = ['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay'];
const srv = serve();
const browser = await launch();
const sizes = process.env.SIZES ? SIZES.filter(([w]) => process.env.SIZES.split(',').includes(String(w))) : SIZES;
const only = process.argv.slice(2);
const want = (name) => !only.length || only.includes(name);

async function open(w, h, run) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto('http://localhost:8139/?x=' + Math.random());
  await page.evaluate(([m, r, tips]) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('legends.tips', JSON.stringify(tips));
    localStorage.setItem('lotf-tips-off', '1');
    if (r) localStorage.setItem('legends.run', JSON.stringify(r));
  }, [S.meta(), run ?? null, TIPS]);
  await page.goto('http://localhost:8139/');
  await page.waitForTimeout(2500);
  return { ctx, page };
}

for (const [w, h] of sizes) {
  if (want('camp') || want('board') || want('card')) {
    const { ctx, page } = await open(w, h);
    if (want('camp')) await page.screenshot({ path: `${OUT}/camp-${w}.png` });
    await page.click('#hmCouncil');
    await page.waitForTimeout(700);
    if (want('board')) await page.screenshot({ path: `${OUT}/board-${w}.png` });
    await page.click('#nemesisBoard .nmRow');
    await page.waitForTimeout(700);
    if (want('card')) await page.screenshot({ path: `${OUT}/card-${w}.png` });
    await ctx.close();
  }
  if (want('boss')) {
    const { ctx, page } = await open(w, h, S.run(15));
    await page.click('.hmCont');
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.__game.autoArrange(true));
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/boss-deploy-${w}.png` });
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(3200);
    await page.screenshot({ path: `${OUT}/boss-fight-${w}.png` });
    await ctx.close();
  }
  if (want('wave')) {
    const { ctx, page } = await open(w, h, S.run(5));
    await page.click('.hmCont');
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.__game.autoArrange(true));
    await page.waitForTimeout(500);
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${OUT}/lieutenant-fight-${w}.png` });
    await page.evaluate(() => window.__game.setSpeed(3));
    await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 150000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/wave-card-${w}.png` });
    await ctx.close();
  }
}
await browser.close();
srv.close();
