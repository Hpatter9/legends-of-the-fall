// Screenshots of Dynasties, phase 7: node tools/dynasty/shots7.mjs [scene ...]  (builds with `npm run web` first; SIZES=393,360,412 by
// default all three). Writes docs/samples/dynasty-7/<scene>-<w>.png: the Houses' "The fallen" filter, Kenji's House in mourning (the
// candle, the slayer's chip), his card (the Oath's section), the knight's heir's House with its Legend's gold frame, the March orders with the Legend
// Oath on Hard (and locked on Normal), the War Horn's card with the Shades and the Shades' card (and greyed with no horn held), the honour
// card with the Shade greyed, the party picker's mourning, the painted tavern's ghosts (pale at a seat with a candle, and by the hearth), and a fight under the Oath with Kenji's Shade called. Also checks no page scrolls sideways.
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch, SIZES } from '../calmap/lib.mjs';
const OUT = 'docs/samples/dynasty-7';
mkdirSync(OUT, { recursive: true });
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/dynasty/saves7.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/dynsaves7.mjs', logLevel: 'error', loader: { '.png': 'empty' } });
const S = await import('../../out/shots/dynsaves7.mjs');
const TIPS = ['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay', 'party'];
const srv = serve();
const browser = await launch();
const sizes = process.env.SIZES ? SIZES.filter(([w]) => process.env.SIZES.split(',').includes(String(w))) : SIZES;
const only = process.argv.slice(2);
const want = (...names) => !only.length || names.some((n) => only.includes(n));
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
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .say, #quip, #toasts, .toast { display: none !important; }' });
  return { ctx, page };
}
const shoot = async (page, path) => {
  await page.waitForTimeout(450);
  const wide = await page.evaluate(() => [...document.querySelectorAll('.om, .omBody, body')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className || e.tagName));
  if (wide.length) {
    bad++;
    console.log('SCROLLS SIDEWAYS', path, wide);
  }
  await page.screenshot({ path });
};
const scroll = (page, sel, y) => page.evaluate(([s, v]) => (document.querySelector(s).scrollTop = v), [sel, y]);
const houses = async (page) => {
  await page.click('#hmSeason');
  await page.waitForTimeout(400);
  await page.click('#seasonCard .omPrimary');
  await page.waitForTimeout(500);
};
const lineOf = async (page, name) => {
  await page.evaluate((n) => [...document.querySelectorAll('#housesPage .hsLine')].find((e) => e.querySelector('b')?.textContent === n).click(), name);
  await page.waitForTimeout(500);
};
const scrollTo = (page, sel) => page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'center' }), sel);

for (const [w, h] of sizes) {
  if (want('houses', 'line', 'bearer', 'legend')) {
    const { ctx, page } = await open(w, h);
    await houses(page);
    await page.click('#housesPage .hsTabs .omChoice:nth-child(5)');
    if (want('houses')) await shoot(page, `${OUT}/houses-fallen-${w}.png`);
    await lineOf(page, 'Kenji');
    if (want('line')) await shoot(page, `${OUT}/line-mourning-${w}.png`);
    await page.click('#houseLine .hsBearer');
    await page.waitForTimeout(500);
    if (want('bearer')) {
      await scrollTo(page, '#bearerCard .hsFact:last-of-type');
      await shoot(page, `${OUT}/bearer-fallen-${w}.png`);
    }
    await page.click('#bearerCard .omBack');
    await page.click('#houseLine .omBack');
    await page.waitForTimeout(300);
    await page.click('#housesPage .hsTabs .omChoice:nth-child(1)');
    if (want('legend')) {
      await shoot(page, `${OUT}/houses-legend-${w}.png`);
      await page.click('#housesPage .hsLine.hsLegend');
      await page.waitForTimeout(500);
      await scrollTo(page, '#houseLine .hsLegend');
      await shoot(page, `${OUT}/line-legend-${w}.png`);
    }
    await ctx.close();
  }
  if (want('march')) {
    for (const [tier, name] of [[1, 'march-oath'], [0, 'march-normal']]) {
      const { ctx, page } = await open(w, h);
      await page.evaluate((t) => window.__game.home.hooks.onArmy('orcs', t), tier);
      await page.waitForTimeout(1200);
      if (tier === 1) {
        await shoot(page, `${OUT}/party-mourning-${w}.png`);
        await scrollTo(page, '.ptMourning');
        await shoot(page, `${OUT}/party-mourning-card-${w}.png`);
      }
      // (HEROES-FILTER: the orders are the Plan of the War Council's pack now)
      await page.evaluate(() => { document.getElementById('ptPackTab')?.click(); [...document.querySelectorAll('.ptPackTabs button')].find((b) => /Plan/.test(b.textContent))?.click(); });
      await page.waitForTimeout(500);
      await page.click('#ptOrders');
      await page.waitForTimeout(500);
      await page.evaluate(() => [...document.querySelectorAll('#marchOrders .omSectionHead')].find((e) => /Legend Oath/.test(e.textContent))?.scrollIntoView({ block: 'start' }));
      if (tier === 1) await page.evaluate(() => [...document.querySelectorAll('#marchOrders .omChoice')].find((e) => e.querySelector('b')?.textContent === 'Swear the Oath')?.click());
      await shoot(page, `${OUT}/${name}-${w}.png`);
      if (tier === 1) {
        await page.click('#marchOrders .omPrimary');
        await page.waitForTimeout(400);
        await scrollTo(page, '#ptOrders');
        await shoot(page, `${OUT}/party-oath-${w}.png`);
      }
      await ctx.close();
    }
  }
  if (want('horn', 'shades')) {
    const { ctx, page } = await open(w, h);
    await page.click('.ehCamp');
    await page.waitForTimeout(500);
    if (want('horn')) await shoot(page, `${OUT}/horn-${w}.png`);
    await page.evaluate(() => [...document.querySelectorAll('.ehSheet button')].find((b) => /Shades/.test(b.textContent)).click());
    await page.waitForTimeout(500);
    if (want('shades')) await shoot(page, `${OUT}/shades-${w}.png`);
    await ctx.close();
  }
  if (want('honour')) {
    const { ctx, page } = await open(w, h, null, S.noHornMeta());
    await houses(page);
    await page.click('#housesPage .hsLine.hsLegend');
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelectorAll('#houseLine .hsBearer')[0].click());
    await page.waitForTimeout(500);
    await page.evaluate(() => [...document.querySelectorAll('#bearerCard .omChoice')].find((e) => /honour/i.test(e.querySelector('b')?.textContent ?? '')).click());
    await page.waitForTimeout(500);
    await shoot(page, `${OUT}/honour-shade-greyed-${w}.png`);
    // (a fallen bearer's card with no horn held: its Shade greyed)
    await page.click('#honourCard .omBack');
    await page.click('#bearerCard .omBack');
    await page.click('#houseLine .omBack');
    await page.waitForTimeout(300);
    await lineOf(page, 'Kenji');
    await page.click('#houseLine .hsBearer');
    await page.waitForTimeout(500);
    await scrollTo(page, '#bearerCard .hsFact:last-of-type');
    await shoot(page, `${OUT}/bearer-fallen-nohorn-${w}.png`);
    await ctx.close();
  }
  if (want('tavern')) {
    // (the painted tavern: Kenji, whose House mourns, pale at his seat with a candle if he is among the five; the fallen by the hearth)
    const { ctx, page } = await open(w, h);
    await page.evaluate(() => window.__game.home.show('heroes'));
    await page.waitForTimeout(1800);
    await shoot(page, `${OUT}/tavern-ghosts-${w}.png`);
    await ctx.close();
  }
  if (want('fight')) {
    const { ctx, page } = await open(w, h, S.run(2));
    await page.click('.hmCont');
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.__game.autoArrange(true));
    await page.waitForTimeout(900);
    await shoot(page, `${OUT}/deploy-oath-${w}.png`);
    await page.click('#fight');
    await page.waitForTimeout(2500);
    // (the call's overlay held at its height for the shot: it is a 1.9 s fade otherwise)
    await page.addStyleTag({ content: '.shCall { animation-play-state: paused !important; animation-delay: -0.9s !important; }' });
    await page.click('.ehFight');
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${OUT}/shade-call-${w}.png` });
    await page.evaluate(() => document.querySelector('.shCall')?.remove());
    await shoot(page, `${OUT}/shade-struck-${w}.png`);
    await ctx.close();
  }
}
await browser.close();
srv.close();
if (bad) process.exitCode = 1;
