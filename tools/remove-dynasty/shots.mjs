// REMOVE-DYNASTY: node tools/remove-dynasty/shots.mjs (after `npm run web`). Loads an old save holding the Dynasties' record and photographs
// the screens the removal touched, at 393x852, 360x780 and 412x915, into docs/samples/remove-dynasty/: the camp's top bar (no season chip),
// the Heroes tab (no Elders' table, no ghosts), the knight's sheet (no House row), the party picker (no banner, no mourning) and the War
// Horn's card (no Shades). Fails on a page error, on a page that scrolls sideways, or on any of the Dynasties' words left on a screen.
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch, SIZES } from '../calmap/lib.mjs';
const OUT = 'docs/samples/remove-dynasty';
mkdirSync(OUT, { recursive: true });
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/remove-dynasty/oldSave.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/oldSave.mjs', logLevel: 'error', loader: { '.png': 'empty', '.webp': 'empty' } });
const { oldSave } = await import('../../out/shots/oldSave.mjs');
const TIPS = ['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay'];
const WORDS = /\b(House of|the Houses|Houses|heir|Heir|Mantle|Legend Oath|Shades?|mourning|Elders|Season|bearer|Kwame’s line)\b/;
const srv = serve();
const browser = await launch();
let errors = 0;
const fail = (why) => { errors++; console.log('FAIL', why); };
for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fail(`page error ${e.message}`));
  await page.goto('http://localhost:8139/?x=' + Math.random());
  await page.evaluate(([m, tips]) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('legends.tips', JSON.stringify(tips));
    localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false }));
  }, [oldSave(), TIPS]);
  await page.goto('http://localhost:8139/');
  await page.waitForFunction(() => window.__game?.home, null, { timeout: 120000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  const check = async (name) => {
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) fail(`${name} ${w}: scrolls sideways`);
    const text = await page.evaluate(() => document.body.innerText);
    const hit = text.match(WORDS);
    if (hit) fail(`${name} ${w}: "${hit[0]}" on the screen`);
    await page.screenshot({ path: `${OUT}/${name}-${w}.png` });
  };
  await check('home');
  await page.evaluate(() => window.__game.home.show('heroes'));
  await page.waitForTimeout(1500);
  await check('heroes');
  await page.evaluate(() => window.__game.home.openSheet('knight'));
  await page.waitForTimeout(1200);
  await check('sheet');
  await page.evaluate(() => document.querySelector('.legacyLine, .dossierRanks')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(400);
  await check('sheet-legacy');
  await page.evaluate(() => window.__game.home.closeSheet());
  await page.evaluate(() => window.__game.home.show('battle'));
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__game.party.open('start', () => {}));
  await page.waitForTimeout(1200);
  await check('party');
  await page.evaluate(() => document.querySelector('#party .omBack, #party [data-back], #ptBack')?.click());
  await page.evaluate(() => window.__game.home.open());
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__game.eid.openCamp());
  await page.waitForTimeout(800);
  await check('horn');
  await ctx.close();
  console.log('shots', w);
}
console.log('failures:', errors);
await browser.close();
srv.close();
process.exit(errors ? 1 : 0);
