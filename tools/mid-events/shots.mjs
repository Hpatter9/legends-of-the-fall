// MID-EVENTS' browser check (`docs/notes/mid-events.md`): the passing cart and several road cards over an army's deploy, at the three
// upright phone sizes. Writes docs/samples/mid-events-*.png.
//   npm run web && node tools/mid-events/shots.mjs
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch, HEROES } from '../battle-ui/lib.mjs';

/** The battle-ui boot, with room for a slow machine (a long first load). */
async function boot(browser, w, h, port) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  ctx.setDefaultTimeout(120000);
  ctx.setDefaultNavigationTimeout(120000);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  await page.goto(`http://localhost:${port}/?x=${Math.random()}`);
  await page.evaluate((heroes) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: { knight: 5000, samurai: 5000 }, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
    localStorage.setItem('lotf-tips-off', '1');
  }, HEROES);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForTimeout(2200);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page, errors };
}

mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/mid-events/cards.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/mid-cards.mjs', logLevel: 'error', loader: { '.png': 'empty' } });
const { cardRun } = await import('../../out/shots/mid-cards.mjs');

const PORT = 8771;
const server = serve('out/web', PORT);
const browser = await launch();
let errors = 0;

async function show(page, json) {
  await page.waitForFunction(() => window.__game?.home, {}, { timeout: 60000 });
  await page.evaluate((json) => {
    localStorage.setItem('legends.run', json);
    const g = window.__game;
    g.home.go(() => g.resume());
  }, json);
  await page.waitForTimeout(1600);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.evaluate(() => document.querySelectorAll('.cutscene, #scene').forEach((e) => e.remove?.()));
  await page.waitForTimeout(300);
}
const tap = (page, text) => page.evaluate((t) => [...document.querySelectorAll('#events .opt')].find((b) => b.textContent.includes(t))?.click(), text);

const plan = [
  ['market', 'orcs', 4],
  ['scout', 'undead', 4],
  ['ladyDue', 'orcs', 6],
  ['duel', 'orcs', 6],
  ['storm', 'beasts', 4],
  ['crown', 'undead', 10],
  ['refugees', 'wildwood', 2],
  ['stranger', 'orcs', 4],
];
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const { ctx, page, errors: errs } = await boot(browser, w, h, PORT);
  for (const [kind, army, stage] of w === 393 ? plan : plan.slice(0, 2)) {
    await show(page, cardRun(kind, army, stage));
    await page.screenshot({ path: `docs/samples/mid-events-${kind}-${w}x${h}.png` });
    if (w === 393 && kind === 'market') {
      await tap(page, 'Rummage');
      await page.waitForTimeout(300);
      const ware = await page.evaluate(() => [...document.querySelectorAll('#events .opt:not(:disabled)')][0]?.textContent);
      await tap(page, ware?.slice(0, 8) ?? 'zzz');
      await page.waitForTimeout(300);
      await page.screenshot({ path: `docs/samples/mid-events-market-bought-${w}x${h}.png` });
    }
    if (w === 393 && kind === 'scout') {
      await tap(page, 'Take her map');
      await page.waitForTimeout(300);
      await page.screenshot({ path: `docs/samples/mid-events-scout-after-${w}x${h}.png` });
      await page.evaluate(() => document.querySelector('#events .primary')?.click());
      await page.waitForTimeout(900);
      await page.screenshot({ path: `docs/samples/mid-events-ambush-banner-${w}x${h}.png` });
      const tw = await page.evaluate(() => ({ banner: document.getElementById('twistBanner')?.hidden === false, twist: !!window.__game.b.twist?.ambush }));
      console.log('ambush after the card:', JSON.stringify(tw));
    }
    // (the card fits: no option below the card's own bottom unreachable)
    const fit = await page.evaluate(() => {
      const c = document.querySelector('#events .evcard');
      return c ? { h: Math.round(c.getBoundingClientRect().height), scroll: c.scrollHeight > c.clientHeight + 2, vh: innerHeight } : null;
    });
    console.log(w, h, kind, JSON.stringify(fit));
  }
  errors += errs.length;
  await ctx.close();
}
console.log(`page errors: ${errors}`);
await browser.close();
server.close();
