// Screenshots of Dynasties, phase 6: node tools/dynasty/shots6.mjs [scene ...]  (builds with `npm run web` first; SIZES=393,360,412 by
// default all three). Writes docs/samples/dynasty-6/<scene>-<w>.png: the Houses' "With heirs" filter, Kwame's House with its second
// generation (the partner's thread, the cadet, the heirloom), Ama's card (birthright, heirloom, Blood Grudge, the Promise), Kwame's card
// as an elder (change honour, field this bearer), the honour card, naming an heir, the Mantle (candidates, heirloom, honour) and the
// farewell, the Elders' table in the tavern, the party picker's banner, the hero sheet's heir row, the camp's roaming heroes in their
// looks, and a deploy with the heir (and with the elder fielded in her place). Also checks no page scrolls sideways.
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch, SIZES } from '../calmap/lib.mjs';
const OUT = 'docs/samples/dynasty-6';
mkdirSync(OUT, { recursive: true });
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/dynasty/saves6.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/dynsaves6.mjs', logLevel: 'error', loader: { '.png': 'empty' } });
const S = await import('../../out/shots/dynsaves6.mjs');
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
const clickNth = (page, sel, i) => page.evaluate(([s, n]) => document.querySelectorAll(s)[n].click(), [sel, i]);
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

for (const [w, h] of sizes) {
  if (want('camp', 'houses', 'line', 'heir', 'elder', 'honour')) {
    const { ctx, page } = await open(w, h);
    if (want('camp')) await shoot(page, `${OUT}/camp-${w}.png`);
    await houses(page);
    await page.click('#housesPage .hsTabs .omChoice:nth-child(2)');
    if (want('houses')) await shoot(page, `${OUT}/houses-heirs-${w}.png`);
    await clickNth(page, '#housesPage .hsLine', 0);
    await page.waitForTimeout(500);
    if (want('line')) {
      await shoot(page, `${OUT}/line-${w}.png`);
      await scroll(page, '#houseLine .omBody', 420);
      await shoot(page, `${OUT}/line-2-${w}.png`);
      await scroll(page, '#houseLine .omBody', 0);
    }
    await clickNth(page, '#houseLine .hsBearer', 1);
    await page.waitForTimeout(500);
    if (want('heir')) {
      await shoot(page, `${OUT}/heir-${w}.png`);
      await scroll(page, '#bearerCard .omBody', 9999);
      await shoot(page, `${OUT}/heir-foot-${w}.png`);
    }
    await page.click('#bearerCard .omBack');
    await clickNth(page, '#houseLine .hsBearer', 0);
    await page.waitForTimeout(500);
    if (want('elder')) {
      await scroll(page, '#bearerCard .omBody', 260);
      await shoot(page, `${OUT}/elder-${w}.png`);
    }
    await page.evaluate(() => [...document.querySelectorAll('#bearerCard .omChoice')].find((e) => /honour/i.test(e.querySelector('b')?.textContent ?? '')).click());
    await page.waitForTimeout(500);
    if (want('honour')) await shoot(page, `${OUT}/honour-${w}.png`);
    await ctx.close();
  }
  if (want('name', 'mantle', 'farewell')) {
    const { ctx, page } = await open(w, h);
    await houses(page);
    if (want('name')) {
      await lineOf(page, 'Karim');
      await clickNth(page, '#houseLine .hsBearer', 0);
      await page.waitForTimeout(400);
      await page.click('#bearerCard .omPrimary');
      await page.waitForTimeout(400);
      await clickNth(page, '#nameHeir .hsRow', 0);
      await shoot(page, `${OUT}/name-heir-${w}.png`);
      await page.click('#nameHeir .omBack');
      await page.click('#bearerCard .omBack');
      await page.click('#houseLine .omBack');
    }
    await lineOf(page, 'Ravi');
    await page.click('#houseLine .hsReady');
    await page.waitForTimeout(500);
    await clickNth(page, '#mantleCard .hsRow', 0);
    await page.evaluate(() => [...document.querySelectorAll('#mantleCard .omChoice')].find((e) => e.querySelector('b')?.textContent === 'Tavern regular').click());
    if (want('mantle')) {
      await shoot(page, `${OUT}/mantle-${w}.png`);
      await scroll(page, '#mantleCard .omBody', 9999);
      await shoot(page, `${OUT}/mantle-foot-${w}.png`);
    }
    await page.click('#mantleCard .omPrimary');
    await page.waitForTimeout(200);
    if (want('mantle')) await shoot(page, `${OUT}/mantle-sure-${w}.png`);
    await page.click('#mantleCard .omPrimary');
    await page.waitForTimeout(500);
    if (want('farewell')) {
      await shoot(page, `${OUT}/farewell-${w}.png`);
      await scroll(page, '#farewellCard .omBody', 9999);
      await shoot(page, `${OUT}/farewell-foot-${w}.png`);
    }
    await ctx.close();
  }
  if (want('table')) {
    const { ctx, page } = await open(w, h);
    await page.evaluate(() => { const g = window.__game; g.home.show('heroes'); });
    await page.waitForTimeout(1500);
    await page.click('.tvElders');
    await page.waitForTimeout(500);
    await shoot(page, `${OUT}/elders-table-${w}.png`);
    await scroll(page, '#eldersTable .omBody', 9999);
    await shoot(page, `${OUT}/elders-table-foot-${w}.png`);
    await ctx.close();
  }
  if (want('party')) {
    const { ctx, page } = await open(w, h);
    await page.evaluate(() => window.__game.party.open('edit', () => {}));
    await page.waitForTimeout(1200);
    await shoot(page, `${OUT}/party-${w}.png`);
    await page.evaluate(() => document.querySelector('.ptBanner')?.closest('.ptCard')?.scrollIntoView({ block: 'center' }));
    await shoot(page, `${OUT}/party-banner-${w}.png`);
    await page.click('.ptBanner');
    await page.waitForTimeout(400);
    await shoot(page, `${OUT}/banner-${w}.png`);
    await ctx.close();
  }
  if (want('sheet')) {
    const { ctx, page } = await open(w, h);
    await page.evaluate(() => { const g = window.__game; g.home.open(); g.home.show('heroes'); g.home.openSheet('knight'); });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.querySelector('.dossierLine')?.scrollIntoView({ block: 'center' }));
    await shoot(page, `${OUT}/sheet-${w}.png`);
    await page.evaluate(() => { const g = window.__game; g.home.closeSheet?.(); g.home.openSheet('wizard'); });
    await page.waitForTimeout(1200);
    await page.evaluate(() => document.querySelector('.dossierLine')?.scrollIntoView({ block: 'center' }));
    await shoot(page, `${OUT}/sheet-ready-${w}.png`);
    await ctx.close();
  }
  if (want('fight')) {
    for (const [name, m] of [['deploy', S.meta()], ['deploy-elder', S.elderMeta()]]) {
      const { ctx, page } = await open(w, h, S.run(2), m);
      await page.click('.hmCont');
      await page.waitForTimeout(2500);
      await page.evaluate(() => window.__game.autoArrange(true));
      await page.waitForTimeout(900);
      await shoot(page, `${OUT}/${name}-${w}.png`);
      await ctx.close();
    }
  }
}
await browser.close();
srv.close();
if (bad) process.exitCode = 1;
