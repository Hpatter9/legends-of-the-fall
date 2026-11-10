// QUEST-POSSIBLE: the Eidolons tab on Askel's Part 3 ("The Kennel-Master's Bell"), with its words and its rule chip, at the three phone
// sizes. `npm run web`, then `node tools/quest-audit/shots.mjs`; pictures go to docs/samples/quest-possible/.
import { mkdirSync } from 'node:fs';
import { serve, launch, SIZES } from '../calmap/lib.mjs';
const OUT = 'docs/samples/quest-possible';
mkdirSync(OUT, { recursive: true });
const srv = serve('out/web', 8139);
const browser = await launch();
const HEROES = ['peasant', 'kunoichi', 'wizard', 'knight', 'archer'];
let bad = 0;
for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => (bad++, console.log('PAGE ERROR', e.message)));
  await page.goto('http://localhost:8139/?x=' + Math.random());
  await page.evaluate((heroes) => {
    localStorage.clear();
    const m = { seed: 11, crowns: 900, stones: 0, unlocked: heroes, party: heroes, pulls: 0, castle: { treasury: 1, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(heroes.map((k) => [k, 9000])), bestStage: 1, tower: 0, daily: {}, bosses: ['orcChieftain', 'orcWarlord', 'boneCaptain'], achievements: [], armies: { orcs: { waves: 15, best: 15, won: 15, clears: 1, stars: { 15: 3 } }, undead: { waves: 15, best: 15, won: 15, clears: 1, stars: {} } }, armySeen: ['orcs', 'undead', 'beasts'], stash: [], scenes: ['opening', 'chain:askel'], heroesSeen: ['knight', 'samurai', 'archer', ...heroes], featuresTold: ['autoMerge', 'autoPlace'], quests: { day: 0, board: [], active: [], done: [], chains: { askel: { part: 2, progress: 0 } }, pieces: [] } };
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, quips: false }));
  }, HEROES);
  await page.goto('http://localhost:8139/');
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  for (let i = 0; i < 16 && (await page.$('.earnedArrival')); i++) {
    await page.evaluate(() => document.querySelector('.earnedArrival')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await page.waitForTimeout(700);
  }
  await page.evaluate(() => window.__game.home.openQuests('eidolons'));
  await page.waitForTimeout(900);
  const text = await page.evaluate(() => document.body.innerText);
  const ok = text.includes('no sellsword hired at the cart') && !/no hero hired/i.test(text);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (!ok || wide) bad++;
  console.log(`${w}x${h}: the new words ${ok ? 'shown' : 'MISSING'}${wide ? ', WIDER THAN THE PAGE' : ''}`);
  await page.screenshot({ path: `${OUT}/askel3-${w}.png` });
  await ctx.close();
}
await browser.close();
srv.close();
process.exit(bad ? 1 : 0);
