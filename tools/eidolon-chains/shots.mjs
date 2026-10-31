// Screenshots of Askel's chain end to end (EIDOLON-CHAINS, docs/notes/eidolon-chains.md) at a phone size: the Sanctum's plaque after the
// Orc Warband falls, the Summoner's prologue, the quest log's Eidolons tab at each part, each part done (a real fight, hurried by thinning
// the foes: a screenshot tool's shortcut, not the game's) and its piece card, the chain's quest battle (party, story, deploy), the Sanctum
// ready to bind, the binding ceremony beat by beat, the Pact Gallery, the War Horn's card at the camp, and the horn blown in a fight with
// Askel bound. `npm run web`, then `node tools/eidolon-chains/shots.mjs [port] [WxH]`; pictures go to docs/samples/eidolon-chain1-*.png
// (the size in the name for 360 and 412 wide).
import { createRequire } from 'node:module';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const port = Number(process.argv[2] ?? 8850);
const only = process.argv[3];
const server = serve('out/web', port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
// (a save that picked the Blade and Spell pack, at about level 10, with the Orc Warband just cleared)
const HEROES = ['peasant', 'kunoichi', 'wizard'];
const XP = 3000;
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
    const m = { seed: 11, crowns: 900, stones: 0, unlocked: heroes, party: heroes, pulls: 0, castle: { treasury: 1, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(heroes.map((k) => [k, xp])), bestStage: 1, tower: 0, daily: {}, bosses: ['orcChieftain', 'orcWarlord'], achievements: [], armies: { orcs: { waves: 15, best: 15, won: 15, clears: 1, stars: { 15: 3 } } }, armySeen: ['orcs', 'undead'], stash: [], scenes: ['opening'], heroesSeen: ['knight', 'samurai', 'archer', ...heroes], featuresTold: ['autoMerge', 'autoPlace'] };
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
  const shot = (page, name) => page.screenshot({ path: `docs/samples/eidolon-chain1-${name}${W(w)}.png` });
  const { ctx, page } = await boot(w, h);
  // ---- the Sanctum: the Summoner looks up from the altar
  await tab(page, 'Recruit');
  await page.waitForTimeout(1800);
  await shot(page, 'sanctum-offer');
  // ---- the prologue, then the Eidolons tab on part 1
  await page.evaluate(() => document.querySelector('.hlChain').click());
  await page.waitForTimeout(4200);
  await shot(page, 'prologue');
  await page.waitForTimeout(7000);
  await shot(page, 'prologue-2');
  await skipScenes(page);
  await page.waitForTimeout(1200);
  await shot(page, 'tab-part1');
  // ---- part 1: the Orc Chieftain (wave 8), and the Ember Heart
  await page.evaluate(() => document.querySelector('.qlShut')?.click());
  await bossWave(page, 'orcs', 8);
  await page.waitForTimeout(1800);
  await shot(page, 'piece-1');
  // (home as a run that ended goes: the won fight left on the board, the case the ticker fix covers)
  await page.evaluate(() => { document.querySelector('.ecnPiece button')?.click(); window.__game.goHome(); });
  await page.waitForTimeout(800);
  // ---- part 2: the Kennel Fires, from the tab
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
    if (await visible(page, '#bossCard')) await page.evaluate(() => document.getElementById('bossCard').click());
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
  // ---- part 3: the Bone Captain (the Undead Legion's wave 8), and the Kennel Bell
  await page.evaluate(() => document.querySelector('.qlShut')?.click());
  await bossWave(page, 'undead', 8);
  await page.waitForTimeout(1800);
  await shot(page, 'piece-3');
  await goHome(page);
  await page.waitForTimeout(800);
  // ---- the binding
  await tab(page, 'Recruit');
  await page.waitForTimeout(1500);
  await shot(page, 'sanctum-bind');
  await page.evaluate(() => document.querySelector('.hlChain').click());
  for (const [name, at] of [['pieces', 2200], ['circle', 4300], ['rise', 6600], ['name', 7800], ['line', 9800], ['bound', 15500]]) {
    const t0 = await page.evaluate(() => (window.__bindT0 ??= performance.now()));
    const now = await page.evaluate(() => performance.now());
    await page.waitForTimeout(Math.max(0, at - (now - t0)));
    await shot(page, `bind-${name}`);
  }
  console.log(`${w}x${h} continue`, await page.evaluate(() => JSON.stringify([getComputedStyle(document.querySelector('.ebGo')).opacity, document.querySelector('.ebGo').getBoundingClientRect()])));
  await page.evaluate(() => document.querySelector('.ebGo').click());
  await page.waitForTimeout(900);
  await shot(page, 'gallery');
  await page.evaluate(() => document.querySelector('.ecnAlcove.bound').click());
  await page.waitForTimeout(500);
  await shot(page, 'gallery-askel');
  await page.evaluate(() => document.querySelector('.ecnShut').click());
  // ---- the horn's card at the camp, full, with Askel answering it
  const state = await page.evaluate(() => ({ bound: window.__game.meta.eidolons?.bound, chosen: window.__game.meta.eidolons?.chosen, chains: window.__game.meta.quests?.chains, pieces: window.__game.meta.quests?.pieces, stash: window.__game.meta.stash.length }));
  console.log(`${w}x${h}`, JSON.stringify(state));
  await page.evaluate(() => { window.__game.meta.eidolons.horn = 1000; window.__game.home.refresh(); });
  await tab(page, 'Battle');
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('.ehCamp').click());
  await page.waitForTimeout(600);
  await shot(page, 'horn-card');
  await page.evaluate(() => document.querySelector('.ehSheet .ehRow button:not(.primary)').click());
  await page.waitForTimeout(600);
  await shot(page, 'gallery-from-horn');
  await page.evaluate(() => document.querySelector('.ecnShut').click());
  // ---- the horn blown in a fight: Askel answers
  await page.evaluate(([heroes]) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 999, mode: { kind: 'army', army: 'undead' }, stage: 15, over: false, cleared: false, gold: 0, event: undefined, roster: heroes.map((kind, i) => ({ id: 100 + i, kind, grade: 2, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, [HEROES]);
  await page.waitForTimeout(900);
  if (await visible(page, '#bossCard')) await page.evaluate(() => document.getElementById('bossCard').click());
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForTimeout(2500);
  await shot(page, 'horn-fight');
  await page.evaluate(() => document.querySelector('.ehFight').click());
  await page.waitForTimeout(500);
  if (await visible(page, '.ehSheet')) {
    await shot(page, 'horn-confirm');
    await page.evaluate(() => document.querySelector('.ehSheet .ehRow button.primary').click());
  }
  for (const [name, at] of [['call-name', 1900], ['call-close', 2600], ['call-strike', 3300], ['call-after', 5600]]) {
    await page.waitForTimeout(at - (name === 'call-name' ? 0 : [1900, 2600, 3300][['call-close', 'call-strike', 'call-after'].indexOf(name)]));
    await shot(page, name);
  }
  for (let i = 0; i < 40 && !(await page.evaluate(() => window.__game.b.eidolon?.called !== undefined)); i++) await page.waitForTimeout(250);
  const left = await page.evaluate(() => ({ called: window.__game.b.eidolon?.called, foes: window.__game.b.units.filter((u) => u.side === 'foe' && u.alive).map((u) => `${u.def} ${Math.round((u.hp / u.maxHp) * 100)}%`) }));
  console.log(`${w}x${h} call`, JSON.stringify(left));
  await ctx.close();
}
console.log('page errors:', errors.length ? errors : 'none', '· 404s:', missing.length ? missing : 'none');
await browser.close();
server.close();
