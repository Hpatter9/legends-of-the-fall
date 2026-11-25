// Screenshots of HALL-OF-HEROES: node tools/hall/shots.mjs  (run `npm run web` first; SIZES=393,360,412 by default)
// Writes docs/samples/hall-of-heroes/<scene>-<w>.png (kept in the repository as .webp): the Hall's page (its head, its trait sets, its
// heroes), the tavern's door to it, the tutorial card the first time it matters, Recruit's "Nearest to joining" with the set's missing hero
// marked, and the deploy bench with a Rested hero.
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch, SIZES } from '../calmap/lib.mjs';
const OUT = process.env.OUT ?? 'docs/samples/hall-of-heroes';
mkdirSync(OUT, { recursive: true });
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/hall/saves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/hallSaves.mjs', logLevel: 'error', loader: { '.png': 'empty', '.webp': 'empty' } });
const S = await import('../../out/shots/hallSaves.mjs');
const TIPS = ['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay'];
const srv = serve();
const browser = await launch();
const sizes = process.env.SIZES ? SIZES.filter(([w]) => process.env.SIZES.split(',').includes(String(w))) : SIZES;
const only = process.argv.slice(2);
const want = (name) => !only.length || only.includes(name);

async function open(w, h, meta, run) {
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
  }, [meta, run ?? null, TIPS]);
  await page.goto('http://localhost:8139/');
  await page.waitForFunction(() => window.__game?.home, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  return { ctx, page };
}
const shoot = async (page, path) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path });
};
const tab = (page, t) => page.evaluate((x) => { document.getElementById('tipSkip')?.click(); window.__game.home.open(); window.__game.home.show(x); }, t);
const scrollTo = (page, words) => page.evaluate((wd) => {
  const x = [...document.querySelectorAll('#hallOfHeroes .omSection, #hallOfHeroes .omSectionHead, #hallOfHeroes h3')].find((e) => e.textContent.includes(wd));
  x?.scrollIntoView({ block: 'start' });
}, words);

for (const [w, h] of sizes) {
  if (want('hall')) {
    const { ctx, page } = await open(w, h, S.meta());
    await tab(page, 'heroes');
    await page.waitForTimeout(1200);
    await page.evaluate(() => document.querySelector('.hallDoor')?.scrollIntoView({ block: 'center' }));
    await shoot(page, `${OUT}/tavern-door-${w}.png`);
    await page.click('.hallDoor');
    await page.waitForTimeout(900);
    await shoot(page, `${OUT}/hall-${w}.png`);
    await scrollTo(page, 'Trait sets');
    await shoot(page, `${OUT}/hall-sets-${w}.png`);
    await scrollTo(page, 'Every hero');
    await shoot(page, `${OUT}/hall-heroes-${w}.png`);
    await ctx.close();
  }
  if (want('tutorial')) {
    const { ctx, page } = await open(w, h, S.meta(true));
    await tab(page, 'heroes');
    await page.waitForTimeout(2200);
    await shoot(page, `${OUT}/tutorial-${w}.png`);
    await ctx.close();
  }
  if (want('recruit')) {
    const { ctx, page } = await open(w, h, S.meta());
    await page.evaluate(() => { document.getElementById('tipSkip')?.click(); window.__game.gacha.open(); });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.getElementById('nearRow')?.scrollIntoView({ block: 'center' }));
    await shoot(page, `${OUT}/recruit-target-${w}.png`);
    await ctx.close();
  }
  if (want('rested')) {
    const { ctx, page } = await open(w, h, S.meta(), S.run());
    await page.click('.hmCont');
    await page.waitForTimeout(2500);
    await shoot(page, `${OUT}/rested-${w}.png`);
    await ctx.close();
  }
}
await browser.close();
srv.close();
