// Screenshots of Vaelkhar's chain (EIDOLON-CHAIN-6, docs/notes/eidolon-chain-6.md): a save with Askel to Gorm bound and the Calamity cleared;
// the plaque (the rift's voice waits), the prologue, the Eidolons tab, then the chain set to every piece and the trial won, the Sanctum ready to bind and
// the void-purple binding beat by beat. Based on tools/eidolon-chain-2/shots.mjs (older description follows):  at a phone size: a save of the Sword and
// Shield pack at about level 20 with Askel bound and the Beast Packs just cleared; the Sanctum's plaque (the hunter waits), the hunter's
// prologue, the Eidolons tab at each part, each part done (a real fight, hurried by thinning the foes, and for part 3 the first four quiet
// waves written into the save: a screenshot tool's shortcuts, not the game's) and its piece card, The Glass Mere (party, story, deploy,
// fight), the Sanctum ready to bind, the ice binding beat by beat, Nivra's "Bound" card, and the Pact Gallery with her in it.
// `npm run web`, then `node tools/eidolon-chain-6/shots.mjs [port] [WxH]`; pictures go to docs/samples/eidolon-chain6-*.png (the size in
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
    const m = { seed: 11, crowns: 900, stones: 0, unlocked: heroes, party: heroes, pulls: 0, castle: { treasury: 1, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(heroes.map((k) => [k, xp])), bestStage: 1, tower: 0, daily: {}, bosses: ['orcChieftain', 'orcWarlord', 'boneCaptain', 'lichKing', 'alphaWolf', 'boarKing'], achievements: [], calamity: { best: 30, clears: 1 }, armies: { orcs: cleared, undead: cleared, beasts: cleared, wildwood: cleared, labyrinth: cleared, infernal: cleared }, armySeen: ['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'infernal'], stash: [], scenes: ['opening'], heroesSeen: ['peasant', 'kunoichi', 'wizard', ...heroes], featuresTold: ['autoMerge', 'autoPlace'],
      quests: { active: [], offers: [], done: [], chains: { askel: { part: 3, progress: 0, bound: true }, nivra: { part: 3, progress: 0, trialWon: true, bound: true }, aurelan: { part: 3, progress: 0, trialWon: true, bound: true }, voltara: { part: 3, progress: 0, trialWon: true, bound: true }, gorm: { part: 3, progress: 0, trialWon: true, bound: true } }, pieces: ['emberHeart', 'kennelCollar', 'kennelBell', 'rimeScale', 'merePearl', 'heldBreath', 'dawnThread', 'sunCrown', 'dawnLamp', 'copperCoil', 'clockFace', 'stormGlass', 'emberCrack', 'masonsMark', 'knockingStone'] }, eidolons: { horn: 400, bound: ['askel', 'nivra', 'aurelan', 'voltara', 'gorm'], chosen: 'gorm', seen: ['askel', 'nivra', 'aurelan', 'voltara', 'gorm'], confirmed: true } };
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
  const shot = (page, name) => page.screenshot({ path: `docs/samples/eidolon-chain6-${name}${W(w)}.png` });
  const { ctx, page } = await boot(w, h);
  await tab(page, 'Recruit');
  await page.waitForTimeout(1800);
  await shot(page, 'sanctum-offer');
  await page.evaluate(() => document.querySelector('.hlChain').click());
  await page.waitForTimeout(3800);
  await shot(page, 'prologue');
  await page.waitForTimeout(9000);
  await shot(page, 'prologue-2');
  await skipScenes(page);
  await page.waitForTimeout(1200);
  await shot(page, 'tab-part1');
  await page.evaluate(() => { document.querySelector('.qlShut')?.click(); const m = window.__game.meta; m.quests.chains.vaelkhar = { part: 3, progress: 0 }; m.quests.pieces.push('blackScale', 'unansweredLetter', 'crownTine'); window.__game.home.openQuests('eidolons'); });
  await page.waitForTimeout(800);
  await shot(page, 'tab-trial');
  await page.evaluate(() => { document.querySelector('.qlShut')?.click(); window.__game.meta.quests.chains.vaelkhar.trialWon = true; });
  await goHome(page);
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
  await page.evaluate(() => document.querySelector('.ebGo').click());
  await page.waitForTimeout(1200);
  await shot(page, 'bound-card');
  await ctx.close();
}
await browser.close();
server.close?.();
console.log('errors', errors, 'missing', missing);
