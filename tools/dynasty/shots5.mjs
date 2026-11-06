// Screenshots of Dynasties, phase 5: node tools/dynasty/shots5.mjs  (builds with `npm run web` first; SIZES=393,360,412 by default all three)
// Writes docs/samples/dynasty-5/<scene>-<w>.png: the camp's top bar with the season's chip, the Seasons' card, the Houses (the line
// picker and its Elders filter), a House's page (Kwame's, an Elder's), a bearer's card, the hero sheet's House row, and a fight with the
// Elder and the Veteran on the board in their looks. Also checks no page scrolls sideways.
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch, SIZES } from '../calmap/lib.mjs';
const OUT = 'docs/samples/dynasty-5';
mkdirSync(OUT, { recursive: true });
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/dynasty/saves5.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/dynsaves5.mjs', logLevel: 'error', loader: { '.png': 'empty' } });
const S = await import('../../out/shots/dynsaves5.mjs');
const TIPS = ['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay'];
const srv = serve();
const browser = await launch();
const sizes = process.env.SIZES ? SIZES.filter(([w]) => process.env.SIZES.split(',').includes(String(w))) : SIZES;
const only = process.argv.slice(2);
const want = (name) => !only.length || only.includes(name);
let bad = 0;

async function open(w, h, run, m = S.meta()) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto('http://localhost:8139/?x=' + Math.random());
  await page.evaluate(([m, r, tips]) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('legends.tips', JSON.stringify(tips));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
    if (r) localStorage.setItem('legends.run', JSON.stringify(r));
  }, [m, run ?? null, TIPS]);
  await page.goto('http://localhost:8139/');
  await page.waitForTimeout(2500);
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .say, #quip { display: none !important; }' });
  return { ctx, page };
}
const shoot = async (page, path) => {
  await page.waitForTimeout(450);
  const wide = await page.evaluate(() => {
    const over = [...document.querySelectorAll('.om, .omBody, body')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className || e.tagName);
    return over;
  });
  if (wide.length) {
    bad++;
    console.log('SCROLLS SIDEWAYS', path, wide);
  }
  await page.screenshot({ path });
};
const scroll = (page, sel, y) => page.evaluate(([s, v]) => (document.querySelector(s).scrollTop = v), [sel, y]);

for (const [w, h] of sizes) {
  if (['camp', 'season', 'houses', 'elders', 'line', 'bearer'].some(want)) {
    const { ctx, page } = await open(w, h);
    if (want('camp')) await shoot(page, `${OUT}/camp-${w}.png`);
    await page.click('#hmSeason');
    await page.waitForTimeout(500);
    if (want('season')) await shoot(page, `${OUT}/season-${w}.png`);
    await page.click('#seasonCard .omPrimary');
    await page.waitForTimeout(600);
    if (want('houses')) {
      await shoot(page, `${OUT}/houses-${w}.png`);
      await scroll(page, '#housesPage .omBody', 9999);
      await shoot(page, `${OUT}/houses-foot-${w}.png`);
      await scroll(page, '#housesPage .omBody', 0);
    }
    if (want('elders')) {
      await page.click('#housesPage .hsTabs .omChoice:nth-child(3)');
      await shoot(page, `${OUT}/elders-${w}.png`);
      await page.click('#housesPage .hsTabs .omChoice:nth-child(1)');
    }
    await page.click('#housesPage .hsLine:nth-child(1)');
    await page.waitForTimeout(500);
    if (want('line')) {
      await shoot(page, `${OUT}/line-${w}.png`);
      await scroll(page, '#houseLine .omBody', 9999);
      await shoot(page, `${OUT}/line-foot-${w}.png`);
      await scroll(page, '#houseLine .omBody', 0);
    }
    await page.click('#houseLine .hsBearer');
    await page.waitForTimeout(500);
    if (want('bearer')) await shoot(page, `${OUT}/bearer-${w}.png`);
    await ctx.close();
  }
  if (want('sheet')) {
    const { ctx, page } = await open(w, h);
    await page.evaluate(() => { const g = window.__game; g.home.open(); g.home.show('heroes'); g.home.openSheet('knight'); });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.querySelector('.dossierLine')?.scrollIntoView({ block: 'center' }));
    await shoot(page, `${OUT}/sheet-${w}.png`);
    await ctx.close();
  }
  if (want('fight')) {
    const { ctx, page } = await open(w, h, S.run(2));
    await page.click('.hmCont');
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.__game.autoArrange(true));
    await page.waitForTimeout(900);
    await shoot(page, `${OUT}/deploy-${w}.png`);
    await ctx.close();
    // (the same deploy with every bearer a Youth, for the looks' side-by-side: tools/dynasty/looks.py crops the two)
    const young = await open(w, h, S.run(2), S.youngMeta());
    await young.page.click('.hmCont');
    await young.page.waitForTimeout(2500);
    await young.page.evaluate(() => window.__game.autoArrange(true));
    await young.page.waitForTimeout(900);
    await young.page.screenshot({ path: `out/shots/deploy-young-${w}.png` });
    await young.ctx.close();
  }
}
await browser.close();
srv.close();
if (bad) process.exitCode = 1;
