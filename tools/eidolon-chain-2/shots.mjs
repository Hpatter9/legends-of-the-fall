// Screenshots of Nivra's chain end to end (EIDOLON-CHAIN-2, docs/notes/eidolon-chain-2.md) at a phone size: a save of the Sword and
// Shield pack at about level 20 with Askel bound and the Beast Packs just cleared; the Sanctum's plaque (the hunter waits), the hunter's
// prologue, the Eidolons tab at each part, each part done (a real fight, hurried by thinning the foes, and for part 3 the first four quiet
// waves written into the save: a screenshot tool's shortcuts, not the game's) and its piece card, The Glass Mere (party, story, deploy,
// fight), the Sanctum ready to bind, the ice binding beat by beat, Nivra's "Bound" card, and the Pact Gallery with her in it.
// `npm run web`, then `node tools/eidolon-chain-2/shots.mjs [port] [WxH]`; pictures go to docs/samples/eidolon-chain2-*.png (the size in
// the name for 360 and 412 wide).
import { createRequire } from 'node:module';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const port = Number(process.argv[2] ?? 8870);
const only = process.argv[3];
const server = serve('out/web', port);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
// (a save that picked the Sword and Shield pack, at about level 20, Askel bound, the Beast Packs just cleared)
const HEROES = ['knight', 'samurai', 'archer'];
const XP = 11400;
const SIZES = only ? [only.split('x').map(Number)] : [[393, 852], [360, 780], [412, 915]];
const errors = [];
const missing = [];

async function boot(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w}x${h}: ${e.message}`));
  page.on('response', (r) => r.status() === 404 && missing.push(r.url()));
  await page.goto(`http://localhost:${port}/?x=${Math.random()}`, { timeout: 180000 });
  await page.evaluate(([heroes, xp]) => {
    localStorage.clear();
    const cleared = { waves: 15, best: 15, won: 15, clears: 1, stars: { 15: 3 } };
    const m = { seed: 11, crowns: 900, stones: 0, unlocked: heroes, party: heroes, pulls: 0, castle: { treasury: 1, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(heroes.map((k) => [k, xp])), bestStage: 1, tower: 0, daily: {}, bosses: ['orcChieftain', 'orcWarlord', 'boneCaptain', 'lichKing', 'alphaWolf', 'boarKing'], achievements: [], armies: { orcs: cleared, undead: cleared, beasts: cleared }, armySeen: ['orcs', 'undead', 'beasts', 'wildwood'], stash: [], scenes: ['opening'], heroesSeen: ['peasant', 'kunoichi', 'wizard', ...heroes], featuresTold: ['autoMerge', 'autoPlace'],
      quests: { active: [], offers: [], done: [], chains: { askel: { part: 3, progress: 0, bound: true } }, pieces: ['emberHeart', 'kennelCollar', 'kennelBell'] }, eidolons: { horn: 400, bound: ['askel'], chosen: 'askel', seen: ['askel'], confirmed: true } };
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, quips: false }));
  }, [HEROES, XP]);
  await page.goto(`http://localhost:${port}/`, { timeout: 180000 });
  await page.waitForFunction(() => document.getElementById('hmBattle'), {}, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  // (a hero the cleared army earns arrives first: tapped through)
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
const skipScenes = async (page) => {
  for (let i = 0; i < 40 && (await page.evaluate(() => window.__game.scenes.playing)); i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
};
const thin = (page) => page.evaluate(() => { for (const u of window.__game.b.units) if (u.side === 'foe' && u.alive) { u.hp = Math.min(u.hp, 1); u.shield = 0; } });
const leaveEvent = (page) => page.evaluate(() => { const o = [...document.querySelectorAll('.evcard .opt, .evcard button')].filter((e) => e.getClientRects().length); o[o.length - 1]?.click(); });

/** An army's wave, begun straight from the save (the boss wave the part asks for), fought with the foes thinned. */
async function bossWave(page, army, stage) {
  await page.evaluate(([army, stage, heroes]) => {
    const g = window.__game;
    g.app.ticker.start();
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242 + stage, mode: { kind: 'army', army }, stage, over: false, cleared: false, gold: 0, event: undefined, roster: heroes.map((kind, i) => ({ id: 100 + i, kind, grade: 2, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, [army, stage, HEROES]);
  await page.waitForTimeout(800);
  if (await visible(page, '#bossCard')) await page.evaluate(() => document.getElementById('bossCard').click());
  await page.evaluate(() => document.getElementById('fight').click());
  // (the fight is settled as its result shows; the piece's card follows it)
  for (let i = 0; i < 400 && !(await visible(page, '#result')); i++) {
    if ((await phase(page)) === 'fight') await thin(page);
    await page.waitForTimeout(250);
  }
}

/** Back to the home screen from a won wave, as a player does: the piece's card closed, Onward to the next wave's deploy, then Home. */
async function goHome(page) {
  await page.evaluate(() => document.querySelector('.ecnPiece button')?.click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('next').click());
  for (let i = 0; i < 30 && (await phase(page)) !== 'deploy'; i++) {
    await leaveEvent(page);
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('homeBtn').click());
}

for (const [w, h] of SIZES) {
  const shot = (page, name) => page.screenshot({ path: `docs/samples/eidolon-chain2-${name}${W(w)}.png` });
  const { ctx, page } = await boot(w, h);
  // ---- the Sanctum: the hunter waits by the altar
  await tab(page, 'Recruit');
  await page.waitForTimeout(1800);
  await shot(page, 'sanctum-offer');
  // ---- the prologue, then the Eidolons tab on part 1
  await page.evaluate(() => document.querySelector('.hlChain').click());
  await page.waitForTimeout(3800);
  await shot(page, 'prologue');
  await page.waitForTimeout(9000);
  await shot(page, 'prologue-2');
  await page.waitForTimeout(12000);
  await shot(page, 'prologue-3');
  await skipScenes(page);
  await page.waitForTimeout(1200);
  await shot(page, 'tab-part1');
  // ---- part 1: the Alpha Werewolf (the Beast Packs' wave 8), and the Rime Scale
  await page.evaluate(() => document.querySelector('.qlShut')?.click());
  await bossWave(page, 'beasts', 8);
  await page.waitForTimeout(1800);
  await shot(page, 'piece-1');
  await page.evaluate(() => { document.querySelector('.ecnPiece button')?.click(); window.__game.goHome(); });
  await page.waitForTimeout(800);
  // ---- part 2: the Glass Mere, from the tab
  await page.evaluate(() => window.__game.home.openQuests('eidolons'));
  await page.waitForTimeout(700);
  await shot(page, 'tab-part2');
  await page.evaluate(() => document.querySelector('.ecnChain.going .ecnGo').click());
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.getElementById('ptSuggest').click());
  await page.waitForTimeout(600);
  await shot(page, 'party');
  await page.evaluate(() => document.getElementById('ptGo').click());
  await page.waitForTimeout(3600);
  await shot(page, 'battle-story');
  await page.waitForTimeout(8000);
  await shot(page, 'battle-story-2');
  await skipScenes(page);
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.__game.autoArrange(true));
  await page.waitForTimeout(600);
  await shot(page, 'battle-deploy');
  let fought = false;
  for (let i = 0; i < 1200; i++) {
    if (await visible(page, '.ecnPiece')) break;
    if (await page.evaluate(() => window.__game.scenes.playing)) {
      await page.waitForTimeout(1200);
      await skipScenes(page);
      await page.waitForTimeout(1500);
      continue;
    }
    const ph = await phase(page);
    await leaveEvent(page);
    if (await visible(page, '#bossCard')) {
      await shot(page, 'battle-boss');
      await page.evaluate(() => document.getElementById('bossCard').click());
    }
    if (ph === 'deploy' && !(await visible(page, '#home'))) {
      if (await page.evaluate(() => document.getElementById('fight').disabled)) await page.evaluate(() => window.__game.autoArrange(true));
      await page.evaluate(() => document.getElementById('fight').click());
      await page.waitForTimeout(400);
    } else if (ph === 'fight') {
      if (!fought) {
        await page.waitForTimeout(2200);
        await shot(page, 'battle-fight');
        fought = true;
      }
      await thin(page);
      await page.waitForTimeout(250);
    } else if (await visible(page, '#result')) {
      await page.evaluate(() => document.getElementById('next').click());
      await page.waitForTimeout(800);
    } else await page.waitForTimeout(400);
  }
  await page.waitForTimeout(600);
  await shot(page, 'piece-2');
  await page.evaluate(() => document.querySelector('.ecnPiece button').click());
  await page.waitForTimeout(600);
  await shot(page, 'tab-part3');
  // ---- part 3: five army waves with no king's spell (four written into the save, the fifth fought), and the Held Breath
  await page.evaluate(() => { document.querySelector('.qlShut')?.click(); window.__game.meta.quests.chains.nivra.progress = 4; });
  await bossWave(page, 'orcs', 3);
  await page.waitForTimeout(1800);
  await shot(page, 'piece-3');
  await goHome(page);
  await page.waitForTimeout(800);
  // ---- the binding
  await tab(page, 'Recruit');
  await page.waitForTimeout(1500);
  await shot(page, 'sanctum-bind');
  await page.evaluate(() => document.querySelector('.hlChain').click());
  for (const [name, at] of [['pieces', 2200], ['circle', 4300], ['rise', 6600], ['name', 7800], ['line', 9800], ['bound', 14500]]) {
    const t0 = await page.evaluate(() => (window.__bindT0 ??= performance.now()));
    const now = await page.evaluate(() => performance.now());
    await page.waitForTimeout(Math.max(0, at - (now - t0)));
    await shot(page, `bind-${name}`);
  }
  console.log(`${w}x${h} continue`, await page.evaluate(() => JSON.stringify([getComputedStyle(document.querySelector('.ebGo')).opacity, document.querySelector('.ebGo').getBoundingClientRect()])));
  await page.evaluate(() => document.querySelector('.ebGo').click());
  await page.waitForTimeout(1200);
  await shot(page, 'bound-card');
  await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.getClientRects().length && /Continue/.test(b.textContent)).at(-1)?.click());
  await page.waitForTimeout(900);
  await shot(page, 'gallery');
  await page.evaluate(() => [...document.querySelectorAll('.ecnAlcove.bound')][1]?.click());
  await page.waitForTimeout(500);
  await shot(page, 'gallery-nivra');
  await page.evaluate(() => document.querySelector('.ecnShut').click());
  const state = await page.evaluate(() => ({ bound: window.__game.meta.eidolons?.bound, chosen: window.__game.meta.eidolons?.chosen, horn: window.__game.meta.eidolons?.horn, chains: window.__game.meta.quests?.chains, pieces: window.__game.meta.quests?.pieces, stash: window.__game.meta.stash.length }));
  console.log(`${w}x${h}`, JSON.stringify(state));
  await page.evaluate(() => window.__game.home.openQuests('eidolons'));
  await page.waitForTimeout(700);
  await shot(page, 'tab-bound');
  await ctx.close();
}
console.log('page errors:', errors.length ? errors : 'none', '· 404s:', missing.length ? missing : 'none');
await browser.close();
server.close();
