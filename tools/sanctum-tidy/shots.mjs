// Screenshots of the Summoning Sanctum (SANCTUM-TIDY, docs/notes/sanctum-tidy.md) at the phone sizes: a save with Askel bound (nothing
// waiting at the Summoner, no dot on the Recruit tab), a save with a chain going (the compact plaque), and a save before any chain (no
// Pact Gallery). `npm run web`, then `node tools/sanctum-tidy/shots.mjs [port] [tag] [WxH]`; pictures go to
// docs/samples/sanctum-<tag>-<state>[-360|-412].png.
import { createRequire } from 'node:module';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const port = Number(process.argv[2] ?? 9080);
const tag = process.argv[3] ?? 'after';
const only = process.argv[4];
const server = serve('out/web', port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['peasant', 'kunoichi', 'wizard'];
const SIZES = only ? [only.split('x').map(Number)] : [[393, 852], [360, 780], [412, 915]];
const errors = [];
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); };

const base = (heroes) => ({ seed: 11, crowns: 900, stones: 0, unlocked: heroes, party: heroes, pulls: 0, castle: { treasury: 1, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(heroes.map((k) => [k, 3000])), bestStage: 1, tower: 0, daily: {}, bosses: ['orcChieftain', 'orcWarlord'], achievements: [], armies: { orcs: { waves: 15, best: 15, won: 15, clears: 1, stars: { 15: 3 } } }, armySeen: ['orcs', 'undead'], stash: [], scenes: ['opening'], heroesSeen: ['knight', 'samurai', 'archer', ...heroes], featuresTold: ['autoMerge', 'autoPlace'] });
const STATES = {
  // (Askel bound at the Summoner, as `bindChain` leaves the save)
  bound: { quests: { chains: { askel: { part: 3, progress: 0, bound: true } }, pieces: ['emberHeart', 'kennelCollar', 'kennelBell'] }, eidolons: { horn: 1000, bound: ['askel'], chosen: 'askel' } },
  // (a chain going: part 2)
  going: { quests: { chains: { askel: { part: 1, progress: 0 } }, pieces: ['emberHeart'] } },
  // (before any chain: the Orc Warband not yet cleared)
  fresh: { armies: {}, bosses: [] },
};

async function boot(w, h, state) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w}x${h}: ${e.message}`));
  await page.goto(`http://localhost:${port}/?x=${Math.random()}`, { timeout: 180000 });
  await page.evaluate((m) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, quips: false }));
  }, { ...base(HEROES), ...STATES[state] });
  await page.goto(`http://localhost:${port}/`, { timeout: 180000 });
  await page.waitForFunction(() => document.getElementById('hmBattle'), {}, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  for (let i = 0; i < 16 && (await page.$('.earnedArrival')); i++) {
    await page.evaluate(() => document.querySelector('.earnedArrival')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await page.waitForTimeout(700);
  }
  return { ctx, page };
}

const W = (w) => (w === 393 ? '' : `-${w}`);
// (what is really on screen: an element with `hidden` that its CSS still shows counts, as the plaque did before SANCTUM-TIDY)
const vis = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.checkVisibility()).map((e) => e.textContent.trim()), sel);

try {
  for (const [w, h] of SIZES) {
    for (const state of Object.keys(STATES)) {
      const { ctx, page } = await boot(w, h, state);
      const dot = await page.evaluate(() => [...document.querySelectorAll('.hmTab')].find((b) => b.textContent.includes('Recruit'))?.classList.contains('new'));
      await page.evaluate(() => [...document.querySelectorAll('.hmTab')].find((b) => b.textContent.includes('Recruit')).click());
      // (the page has slid into place and the room is painted: a slow machine takes a while)
      await page.waitForFunction(() => { const r = document.querySelector('.hlWrap').getBoundingClientRect(); return Math.abs(r.left) < 1 && document.querySelector('.hlRoom').width > 300; }, {}, { timeout: 120000 });
      await page.waitForTimeout(2500);
      const plaque = await vis(page, '.hlChain');
      console.log(`${w}x${h} ${state}: recruit dot ${dot}; plaque ${JSON.stringify(plaque)}; corner ${JSON.stringify(await vis(page, '.hlCorner button'))}; low ${await page.evaluate(() => Math.round(document.querySelector('.hlWrap').getBoundingClientRect().bottom - document.querySelector('.hlLow').getBoundingClientRect().top))}px`);
      if (state === 'bound') {
        check(!dot, `${w} bound: no dot on the Recruit tab`);
        check(!plaque.length, `${w} bound: no Summoner plaque`);
      }
      if (state === 'going') check(plaque.length === 1, `${w} going: the plaque shows`);
      const corner = await vis(page, '.hlCorner button');
      check(corner.some((t) => t.includes('Shop')), `${w} ${state}: the shop in the corner`);
      check(corner.some((t) => t.includes('Pacts')) === (state !== 'fresh'), `${w} ${state}: the Pact Gallery ${state === 'fresh' ? 'not yet' : 'in the corner'}`);
      // (every button on the Sanctum page at least 44px tall and wide, and nothing off the side)
      const small = await page.evaluate(() => [...document.querySelectorAll('.hlWrap button')].filter((b) => b.checkVisibility()).filter((b) => { const r = b.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map((b) => b.className + ':' + b.textContent.trim().slice(0, 20)));
      check(!small.length, `${w} ${state}: tap targets 44px (${small.join(', ')})`);
      check(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `${w} ${state}: no sideways overflow`);
      await page.screenshot({ path: `docs/samples/sanctum-${tag}-${state}${W(w)}.png` });
      if (state === 'going' && tag !== 'before') {
        // (the shards' scroll opened by its row, and folded again)
        await page.evaluate(() => document.querySelector('.hlFold').click());
        await page.waitForTimeout(300);
        check((await vis(page, '.hlMore')).length === 1, `${w}: the shards' scroll opens`);
        await page.screenshot({ path: `docs/samples/sanctum-${tag}-open${W(w)}.png` });
        await page.evaluate(() => document.querySelector('.hlFold').click());
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors');
console.log(fails.length ? `${fails.length} FAILED` : 'all ok');
