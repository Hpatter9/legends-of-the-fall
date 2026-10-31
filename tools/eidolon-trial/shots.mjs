// Screenshots of Nivra's trial (EIDOLON-TRIAL, docs/notes/eidolon-chain-2.md) at the phone sizes: a save of the Sword and Shield pack at
// about level 21 with Askel bound and Nivra's three pieces found; the Sanctum's plaque (Part 4: The Trial), the Eidolons tab, the trial's
// story, the deploy, Nivra's boss card, the fight (her Rime Breath marked down a row, her ice armour at half health: a screenshot tool's
// shortcut takes her there), the beat after the win, and the binding it leads straight into, to her "Bound" card.
// `npm run web`, then `node tools/eidolon-trial/shots.mjs [port] [WxH]`; pictures go to docs/samples/eidolon-trial-*.png (the size in the
// name for 360 and 412 wide).
import { createRequire } from 'node:module';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const port = Number(process.argv[2] ?? 8871);
const only = process.argv[3];
const server = serve('out/web', port);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['knight', 'samurai', 'archer'];
const XP = 12600;
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
      quests: { active: [], offers: [], done: [], won: ['glassMere'], told: ['glassMere'], chains: { askel: { part: 3, progress: 0, bound: true }, nivra: { part: 3, progress: 0 } }, pieces: ['emberHeart', 'kennelCollar', 'kennelBell', 'rimeScale', 'merePearl', 'heldBreath'] }, eidolons: { horn: 400, bound: ['askel'], chosen: 'askel', seen: ['askel'], confirmed: true } };
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, quips: false }));
  }, [HEROES, XP]);
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
const playing = (page) => page.evaluate(() => window.__game.scenes.playing);
const skipScenes = async (page) => {
  for (let i = 0; i < 40 && (await playing(page)); i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
};
const thin = (page) => page.evaluate(() => { for (const u of window.__game.b.units) if (u.side === 'foe' && u.alive) { u.hp = Math.min(u.hp, 1); u.shield = undefined; } });
const leaveEvent = (page) => page.evaluate(() => { const o = [...document.querySelectorAll('.evcard .opt, .evcard button')].filter((e) => e.getClientRects().length); o[o.length - 1]?.click(); });
const nivraOn = (page) => page.evaluate(() => window.__game.b.units.some((u) => u.def === 'nivraWyrm' && u.alive));

for (const [w, h] of SIZES) {
  const shot = (page, name) => page.screenshot({ path: `docs/samples/eidolon-trial-${name}${W(w)}.png` });
  const { ctx, page } = await boot(w, h);
  // ---- the Sanctum: Part 4, the Trial
  await tab(page, 'Recruit');
  await page.waitForTimeout(1800);
  await shot(page, 'sanctum');
  // ---- the Eidolons tab on the trial
  await page.evaluate(() => window.__game.home.openQuests('eidolons'));
  await page.waitForTimeout(800);
  await shot(page, 'tab');
  await page.evaluate(() => document.querySelector('.ecnChain.going .ecnGo').click());
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.getElementById('ptSuggest').click());
  await page.waitForTimeout(600);
  await shot(page, 'party');
  await page.evaluate(() => document.getElementById('ptGo').click());
  await page.waitForTimeout(3400);
  await shot(page, 'story');
  await page.waitForTimeout(4200);
  await shot(page, 'story-2');
  await page.waitForTimeout(5200);
  await shot(page, 'story-3');
  await skipScenes(page);
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.__game.autoArrange(true));
  await page.waitForTimeout(600);
  await shot(page, 'deploy');
  let breath = false;
  let armour = false;
  let won = false;
  for (let i = 0; i < 1600; i++) {
    if (await visible(page, '.ebLayer')) break;
    if (await playing(page)) {
      if (!won) {
        won = true;
        await page.waitForTimeout(1500);
        await shot(page, 'after');
        await page.waitForTimeout(3500);
        await shot(page, 'after-2');
      }
      await skipScenes(page);
      await page.waitForTimeout(800);
      continue;
    }
    const ph = await phase(page);
    await leaveEvent(page);
    if (await visible(page, '#bossCard')) {
      await shot(page, 'boss');
      await page.evaluate(() => document.getElementById('bossCard').click());
    }
    if (ph === 'deploy' && !(await visible(page, '#home'))) {
      if (await page.evaluate(() => document.getElementById('fight').disabled)) await page.evaluate(() => window.__game.autoArrange(true));
      await page.evaluate(() => document.getElementById('fight').click());
      await page.waitForTimeout(400);
    } else if (ph === 'fight') {
      if (!(await nivraOn(page))) {
        await thin(page);
        await page.waitForTimeout(250);
        continue;
      }
      // (her Rime Breath: the row marked as she gathers)
      if (!breath) {
        // (the heroes kept standing while she is watched)
        await page.evaluate(() => { for (const u of window.__game.b.units) if (u.side === 'hero' && u.alive) u.hp = u.maxHp; });
        const marked = await page.evaluate(() => (window.__game.b.warnings ?? []).some((x) => x.key === 'rimeBreath'));
        if (marked) {
          await page.waitForTimeout(700);
          await shot(page, 'breath');
          await page.waitForTimeout(1500);
          await shot(page, 'breath-2');
          breath = true;
        } else await page.waitForTimeout(200);
        continue;
      }
      // (her ice armour: a screenshot's shortcut takes her to half health, and the change plays)
      if (!armour) {
        await page.evaluate(() => { const n = window.__game.b.units.find((u) => u.def === 'nivraWyrm'); n.hp = Math.floor(n.maxHp * 0.51); });
        for (let k = 0; k < 80 && !(await page.evaluate(() => window.__game.b.units.find((u) => u.def === 'nivraWyrm')?.phase?.done)); k++) {
          await page.evaluate(() => { for (const u of window.__game.b.units) if (u.side === 'hero' && u.alive) u.hp = u.maxHp; });
          await page.waitForTimeout(150);
        }
        await page.waitForTimeout(500);
        await shot(page, 'armour');
        for (let k = 0; k < 13; k++) {
          await page.evaluate(() => { for (const u of window.__game.b.units) if (u.side === 'hero' && u.alive) u.hp = u.maxHp; });
          await page.waitForTimeout(200);
        }
        await shot(page, 'armour-2');
        armour = true;
        continue;
      }
      await thin(page);
      await page.waitForTimeout(250);
    } else if (await visible(page, '#result')) {
      await page.evaluate(() => document.getElementById('next').click());
      await page.waitForTimeout(800);
    } else await page.waitForTimeout(400);
  }
  // ---- straight into the binding
  for (const [name, at] of [['bind', 2400], ['bind-rise', 7000], ['bind-line', 9800], ['bind-bound', 14500]]) {
    const t0 = await page.evaluate(() => (window.__bindT0 ??= performance.now()));
    const now = await page.evaluate(() => performance.now());
    await page.waitForTimeout(Math.max(0, at - (now - t0)));
    await shot(page, name);
  }
  await page.evaluate(() => document.querySelector('.ebGo')?.click());
  await page.waitForTimeout(1200);
  await shot(page, 'bound-card');
  const state = await page.evaluate(() => ({ bound: window.__game.meta.eidolons?.bound, chosen: window.__game.meta.eidolons?.chosen, chains: window.__game.meta.quests?.chains, won: window.__game.meta.quests?.won }));
  console.log(`${w}x${h}`, JSON.stringify(state));
  await ctx.close();
}
console.log('page errors:', errors.length ? errors : 'none', '· 404s:', missing.length ? missing : 'none');
await browser.close();
server.close();
