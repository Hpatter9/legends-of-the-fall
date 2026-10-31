// Screenshots of the War Horn given at the first binding (HORN-GIFT, docs/notes/horn-gift.md) at a phone size: an older save with a stored
// fill and no Eidolon bound (no horn at the camp, none in a fight, no horn line on the wave card, the fill kept), then Askel's binding with
// its new beats (the seal, the Summoner handing over the horn, Askel filling it), the end card "Received: The War Horn", and after: the
// horn at the camp and full in the next fight. `npm run web`, then `node tools/horn-gift/shots.mjs [port] [WxH]`; pictures go to
// docs/samples/horn-gift-*.png (the size in the name for 360 and 412 wide).
import { createRequire } from 'node:module';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const port = Number(process.argv[2] ?? 8960);
const only = process.argv[3];
const server = serve('out/web', port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['peasant', 'kunoichi', 'wizard'];
const SIZES = only ? [only.split('x').map(Number)] : [[393, 852], [360, 780], [412, 915]];
const errors = [];
const missing = [];
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); };

async function boot(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w}x${h}: ${e.message}`));
  page.on('response', (r) => r.status() === 404 && missing.push(r.url()));
  await page.goto(`http://localhost:${port}/?x=${Math.random()}`, { timeout: 180000 });
  await page.evaluate((heroes) => {
    localStorage.clear();
    // (an older save: Askel's three pieces in, ready to bind, and a horn filled to 640 before the horn became the binding's gift)
    const m = { seed: 11, crowns: 900, stones: 0, unlocked: heroes, party: heroes, pulls: 0, castle: { treasury: 1, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(heroes.map((k) => [k, 3000])), bestStage: 1, tower: 0, daily: {}, bosses: ['orcChieftain', 'orcWarlord'], achievements: [], armies: { orcs: { waves: 15, best: 15, won: 15, clears: 1, stars: { 15: 3 } } }, armySeen: ['orcs', 'undead'], stash: [], scenes: ['opening'], heroesSeen: ['knight', 'samurai', 'archer', ...heroes], featuresTold: ['autoMerge', 'autoPlace'], quests: { chains: { askel: { part: 3, progress: 0 } }, pieces: ['emberHeart', 'kennelCollar', 'kennelBell'] }, eidolons: { horn: 640 } };
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, quips: false }));
  }, HEROES);
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
const tab = (page, label) => page.evaluate((l) => [...document.querySelectorAll('.hmTab')].find((b) => b.textContent.includes(l)).click(), label);
const visible = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && !e.hidden && e.getClientRects().length > 0; }, sel);
const phase = (page) => page.evaluate(() => window.__game.b.phase);
const thin = (page) => page.evaluate(() => { for (const u of window.__game.b.units) if (u.side === 'foe' && u.alive) { u.hp = Math.min(u.hp, 1); u.shield = 0; } });
const leaveEvent = (page) => page.evaluate(() => { const o = [...document.querySelectorAll('.evcard .opt, .evcard button')].filter((e) => e.getClientRects().length); o[o.length - 1]?.click(); });
const offScreen = (page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);

/** An army's boss wave begun straight from the save; `win` fights it out with the foes thinned. */
async function wave(page, stage, win) {
  await page.evaluate(([stage, heroes]) => {
    const g = window.__game;
    g.app.ticker.start();
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242 + stage, mode: { kind: 'army', army: 'orcs' }, stage, over: false, cleared: false, gold: 0, event: undefined, roster: heroes.map((kind, i) => ({ id: 100 + i, kind, grade: 2, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, [stage, HEROES]);
  await page.waitForTimeout(900);
  if (await visible(page, '#bossCard')) await page.evaluate(() => document.getElementById('bossCard').click());
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForTimeout(2200);
  if (!win) return;
  for (let i = 0; i < 400 && !(await visible(page, '#result')); i++) {
    if ((await phase(page)) === 'fight') await thin(page);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1200);
}

async function goHome(page) {
  await page.evaluate(() => document.querySelector('.ecnPiece button')?.click());
  if (await visible(page, '#result')) await page.evaluate(() => document.getElementById('next').click());
  for (let i = 0; i < 30 && (await phase(page)) !== 'deploy'; i++) {
    await leaveEvent(page);
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('homeBtn').click());
  await page.waitForTimeout(900);
}

for (const [w, h] of SIZES) {
  const shot = (page, name) => page.screenshot({ path: `docs/samples/horn-gift-${name}${W(w)}.png` });
  const { ctx, page } = await boot(w, h);
  // ---- before: no horn at the camp
  await tab(page, 'Battle');
  await page.waitForTimeout(1200);
  check(!(await visible(page, '.ehCamp')), `${w}: no horn at the camp before the binding`);
  await shot(page, 'before-camp');
  // ---- before: no horn in a fight; a boss wave won adds nothing and the wave card says nothing of it
  await wave(page, 8, false);
  check(!(await visible(page, '.ehFight')), `${w}: no horn in the fight's HUD`);
  await shot(page, 'before-fight');
  for (let i = 0; i < 400 && !(await visible(page, '#result')); i++) {
    if ((await phase(page)) === 'fight') await thin(page);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1500);
  const card = await page.evaluate(() => document.body.innerText);
  check(!/War Horn/.test(card), `${w}: no War Horn line on the wave card`);
  await shot(page, 'before-wavecard');
  check((await page.evaluate(() => window.__game.meta.eidolons?.horn)) === 640, `${w}: the stored fill kept at 640, untouched`);
  await goHome(page);
  // ---- the binding: the seal, the horn handed over, Askel filling it
  await tab(page, 'Recruit');
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelector('.hlChain').click());
  const t0 = await page.evaluate(() => performance.now());
  for (const [name, at] of [['bound', 14000], ['horn', 19500], ['horn-full', 25500]]) {
    const now = await page.evaluate(() => performance.now());
    await page.waitForTimeout(Math.max(0, at - (now - t0)));
    await shot(page, `bind-${name}`);
    if (name === 'bound') check(!(await page.evaluate(() => document.querySelector('.ebLayer').classList.contains('end'))), `${w}: no Continue on the seal (the horn follows)`);
  }
  check(await page.evaluate(() => getComputedStyle(document.querySelector('.ebGo')).opacity === '1'), `${w}: Continue on the last beat`);
  check(!(await offScreen(page)), `${w}: the binding fits the width`);
  await page.evaluate(() => document.querySelector('.ebGo').click());
  await page.waitForTimeout(900);
  check(await visible(page, '.rvCard'), `${w}: the end card "Received: The War Horn"`);
  const rv = await page.evaluate(() => { const r = document.querySelector('.rvCard').getBoundingClientRect(); return { text: document.querySelector('.rvCard').innerText, top: r.top, bottom: r.bottom }; });
  check(/Received/i.test(rv.text) && /War Horn/.test(rv.text) && /next fight/.test(rv.text) && rv.top >= 0 && rv.bottom <= h, `${w}: the card says what and where, on screen`);
  await shot(page, 'card');
  check((await page.evaluate(() => window.__game.meta.eidolons.horn)) === 1000, `${w}: the horn given full`);
  await page.evaluate(() => [...document.querySelectorAll('.rvCard button')].pop().click());
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelector('.ecnShut')?.click());
  // ---- after: the horn at the camp, and full in the next fight
  await tab(page, 'Battle');
  await page.waitForTimeout(1200);
  check(await visible(page, '.ehCamp'), `${w}: the horn at the camp after the binding`);
  await shot(page, 'after-camp');
  await wave(page, 15, false);
  check(await visible(page, '.ehFight'), `${w}: the horn in the fight`);
  check((await page.evaluate(() => document.querySelector('.ehFight').dataset.state)) === 'ready', `${w}: full and ready to blow`);
  await shot(page, 'after-fight');
  await ctx.close();
}
console.log('page errors:', errors.length ? errors : 'none', '· 404s:', missing.length ? missing : 'none', '· fails:', fails.length);
await browser.close();
server.close();
process.exit(fails.length || errors.length ? 1 : 0);
