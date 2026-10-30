// DEPLOY-ZOOM's browser check (`docs/notes/deploy-zoom.md`): the deploy bar with Auto place and Auto merge locked and unlocked (and the
// one-time notice), the placement rows framed close at wave 1 and at a later wave, a Calamity (Rift) board, and the fight's framing after
// Fight!, at the three upright phone sizes. Writes docs/samples/deploy-zoom-*.png (or `<prefix>-*`, for "before" shots of an older build).
//   npm run web && node tools/deploy-zoom/shots.mjs [web dir] [prefix]
import { mkdirSync } from 'node:fs';
import { serve, launch, HEROES } from '../battle-ui/lib.mjs';

const [root = 'out/web', prefix = 'deploy-zoom'] = process.argv.slice(2);
const PORT = 8821;
const server = serve(root, PORT);
const browser = await launch();
const wait = (page, ms) => page.waitForTimeout(ms);
let errors = 0;
/** The first four armies (`ARMIES` in `src/sim/armies.ts`). */
const FIRST_FOUR = ['orcs', 'undead', 'beasts', 'wildwood'];

/** A page on the battle-ui save with the Calamity open; loads wait only for the page's own start, not the web fonts. */
async function boot(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => { errs.push(e.message); console.log('PAGE ERROR', e.message); });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.evaluate((heroes) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: { knight: 5000, samurai: 5000 }, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['tower', 'castle', 'calamity'] }));
    localStorage.setItem('lotf-tips-off', '1');
  }, HEROES);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__game?.run, {}, { timeout: 90000 });
  await wait(page, 1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page, errs };
}

/** Into a fresh army run at `stage` whose roster is `heroes` ([kind, grade]); `cleared` armies are marked beaten first. */
async function setUp(page, heroes, stage, cleared) {
  await page.evaluate(([heroes, stage, cleared]) => {
    const g = window.__game;
    g.meta.armies = Object.fromEntries(cleared.map((id) => [id, { best: 15, won: 15, clears: 1, stars: {} }]));
    const r = g.run;
    r.roster = heroes.map(([kind, grade], i) => ({ id: i + 1, kind, grade }));
    r.nextId = heroes.length + 1;
    r.squad = [];
    r.gold = 400;
    r.stage = stage;
    localStorage.setItem('legends.run', JSON.stringify(r));
    g.home.go(() => g.resume());
  }, [heroes, stage, cleared]);
  await wait(page, 300);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.evaluate(() => window.__game.endIntro?.());
}
const camOf = (page) => page.evaluate(() => { const g = window.__game; return { phase: g.b.phase, zoom: +g.zoom.toFixed(2), k: +g.world.scale.x.toFixed(2), auto: document.getElementById('auto').hidden ? 'hidden' : 'shown', merge: document.getElementById('mergeAll').hidden ? 'hidden' : 'shown', toast: document.querySelector('.toast')?.textContent ?? '' }; });

// (the Calamity's saves, as the battle-ui shots make them)
const esbuild = await import('esbuild');
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/battle-ui/saves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/bu-saves.mjs', logLevel: 'error' });
const SAVES = await import('../../out/shots/bu-saves.mjs');

const ROSTER = [['knight', 1], ['knight', 1], ['archer', 1], ['cleric', 1], ['wizard', 1], ['samurai', 1]];
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const tag = `${w}x${h}`;
  // (ONLY=calamity in the environment runs the Calamity's shots alone)
  if (process.env.ONLY !== 'calamity') {
  const { ctx, page, errs } = await boot(w, h);
  // (wave 1, a save with no army beaten: Auto and Auto merge are locked; the camera eases in on the placement rows)
  await setUp(page, ROSTER, 1, []);
  console.log(tag, 'wave 1 start', JSON.stringify(await camOf(page)));
  await wait(page, 1600);
  await page.screenshot({ path: `docs/samples/${prefix}-wave1-locked-${tag}.png` });
  console.log(tag, 'wave 1 settled', JSON.stringify(await camOf(page)));
  // (a later wave, with the first four armies beaten: both buttons show, and their one-time notices)
  await setUp(page, ROSTER, 6, FIRST_FOUR);
  await wait(page, 500);
  if (w === 393) await page.screenshot({ path: `docs/samples/${prefix}-notice-${tag}.png` });
  console.log(tag, 'wave 6 notice', JSON.stringify(await camOf(page)));
  await wait(page, 1400);
  await page.screenshot({ path: `docs/samples/${prefix}-wave6-unlocked-${tag}.png` });
  console.log(tag, 'wave 6 settled', JSON.stringify(await camOf(page)), await page.evaluate(() => JSON.stringify(window.__game.meta.featuresTold)));
  // (a pan lets go of the close view: the camera stays where the player put it)
  const at = await page.evaluate(() => { const a = window.__game.area; return [a.x + a.w / 2, a.y + a.h * 0.9]; });
  await page.mouse.move(at[0], at[1]);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(at[0] + i * 12, at[1] - i * 14);
  await page.mouse.up();
  const panned = await page.evaluate(() => [Math.round(window.__game.cx), Math.round(window.__game.cy), window.__game.manualCam]);
  await wait(page, 800);
  const after = await page.evaluate(() => [Math.round(window.__game.cx), Math.round(window.__game.cy)]);
  console.log(tag, 'pan held', JSON.stringify({ panned, after }));
  // (Auto place, then Fight!: the camera eases back to the fight's own framing)
  await page.evaluate(() => document.getElementById('auto').click());
  await wait(page, 300);
  await page.evaluate(() => window.__game.begin());
  await wait(page, 200);
  console.log(tag, 'fight start', JSON.stringify(await camOf(page)));
  await wait(page, 2200);
  await page.screenshot({ path: `docs/samples/${prefix}-fight-${tag}.png` });
  console.log(tag, 'fight', JSON.stringify(await camOf(page)));
  await ctx.close();
  errors += errs.length;
  }
  // (a Calamity: the Rift's arena and its own board)
  const c = await boot(w, h);
  await c.page.evaluate((json) => localStorage.setItem('legends.calamity', json), JSON.stringify(SAVES.big(11)));
  await c.page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await c.page.waitForFunction(() => window.__game?.run && document.getElementById('hmCalamity'), {}, { timeout: 90000 });
  await wait(c.page, 1500);
  await c.page.evaluate(() => document.getElementById('hmCalamity').click());
  await wait(c.page, 1500);
  for (let i = 0; i < 4; i++) { await c.page.evaluate(() => document.querySelector('.csSkip')?.click()); await wait(c.page, 700); }
  await c.page.evaluate(() => document.querySelector('.rsEnter')?.click());
  await wait(c.page, 2500);
  for (let i = 0; i < 3; i++) { await c.page.evaluate(() => document.querySelector('.csSkip')?.click()); await wait(c.page, 700); }
  await wait(c.page, 1500);
  await c.page.evaluate(() => window.__game.endIntro?.());
  await wait(c.page, 1600);
  await c.page.screenshot({ path: `docs/samples/${prefix}-calamity-${tag}.png` });
  console.log(tag, 'calamity', JSON.stringify(await camOf(c.page)), await c.page.evaluate(() => JSON.stringify({ dims: [window.__game.b.board.w, window.__game.b.board.d], rift: !!window.__game.b.board.riftWorld })));
  errors += c.errs.length;
  await c.ctx.close();
}
await browser.close();
server.close();
console.log('page errors', errors);
