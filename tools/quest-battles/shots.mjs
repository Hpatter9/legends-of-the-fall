// Screenshots of the quest battles (batch 2 of the quests) at the three phone sizes: Kenji's card offering Two Blades on the Bridge
// (and its Fight once taken), the log's Fight, the party with the cast locked in, the story before, the locked deploy and its line,
// the fight, the win and its beat, the quest waiting to be handed in, and a loss with Try again. `npm run web`, then
// `node tools/quest-battles/shots.mjs [port]`; pictures go to docs/samples/quest-battles-*.png. The fights are hurried along by
// thinning the foes (or the heroes, for the loss): a screenshot tool's shortcut, not the game's.
import { createRequire } from 'node:module';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const port = Number(process.argv[2] ?? 8820);
const only = process.argv[3];
const server = serve('out/web', port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['knight', 'samurai', 'archer', 'kunoichi', 'wizard', 'peasant', 'samuraiCommander', 'cleric'];
const rec = () => ({ waves: 15, best: 15, won: 15, clears: 1, stars: { 15: 3 } });
const ARMIES = Object.fromEntries(['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'].map((a) => [a, rec()]));
const SIZES = (only ? [only.split('x').map(Number)] : [[393, 852], [360, 780], [412, 915]]);
const errors = [];
const XP = 4_000_000;

async function boot(w, h, quests) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w}x${h}: ${e.message}`));
  await page.goto(`http://localhost:${port}/?x=${Math.random()}`);
  await page.evaluate(([heroes, armies, quests, xp]) => {
    localStorage.clear();
    const d = new Date();
    const today = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const q = { ...quests, day: today, offers: quests.offers.map((id) => ({ id, giver: 'patron', day: today })), active: quests.active.map((a) => ({ ...a, took: today })), drawn: { patron: today, royal: today, duchess: today } };
    const m = { seed: 7, crowns: 4000, stones: 30, unlocked: heroes, party: ['knight', 'samurai', 'archer', 'kunoichi', 'wizard'], pulls: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(heroes.map((k) => [k, xp])), bestStage: 14, tower: 0, daily: {}, bosses: [], achievements: [], armies, armySeen: Object.keys(armies), stash: [], scenes: ['opening'], heroesSeen: heroes, quests: q };
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
    // (the game's other cinematics off, so only the quest's own story and beat play: they play whatever this setting says)
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
  }, [HEROES, ARMIES, quests, XP]);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => document.getElementById('hmBattle'), {}, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  for (let i = 0; i < 16 && (await page.$('.earnedArrival')); i++) {
    await page.evaluate(() => document.querySelector('.earnedArrival')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await page.waitForTimeout(700);
  }
  return { ctx, page };
}

const heroesTab = (page) => page.evaluate(() => [...document.querySelectorAll('.hmTab')].find((b) => b.textContent.includes('Heroes')).click());
const shot = (page, name, w) => page.screenshot({ path: `docs/samples/quest-battles-${name}-${w}.png` });
const visible = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && !e.hidden && e.getClientRects().length > 0; }, sel);
const phase = (page) => page.evaluate(() => window.__game.b.phase);
const skipScenes = async (page) => {
  for (let i = 0; i < 30 && (await page.evaluate(() => window.__game.scenes.playing)); i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
};
/** Place the cast and the rest with the Auto place button, as a player would tap it. */
const autoPlace = (page) => page.evaluate(() => document.getElementById('auto').click());
/** Hurry a fight along: the foes (or, to lose, the heroes) thinned to a sliver. */
/** An event between waves: its last choice (Leave), as a player moving on would. */
const leaveEvent = (page) => page.evaluate(() => { const o = [...document.querySelectorAll('.evcard .opt, .evcard button')].filter((e) => e.getClientRects().length); o[o.length - 1]?.click(); });
const thin = (page, side) => page.evaluate((s) => { for (const u of window.__game.b.units) if (u.side === s && u.alive) { u.hp = Math.min(u.hp, 1); u.shield = 0; } }, side);

async function toTavernLog(page) {
  await heroesTab(page);
  await page.waitForTimeout(1500);
  if (!(await page.$('.tvRoom'))) await heroesTab(page);
  await page.waitForTimeout(800);
}

for (const [w, h] of SIZES) {
  // ---------------------------------------------------------------- a win, from the offer to the hand-in
  {
    const { ctx, page } = await boot(w, h, { active: [], offers: ['twoBladesBridge'], done: [] });
    await toTavernLog(page);
    await page.evaluate(() => window.__game.home.tavern.quests.onGiver('hero:samurai'));
    await page.waitForTimeout(600);
    await shot(page, 'offer', w);
    await page.evaluate(() => document.querySelector('.qcRow button.primary').click());
    await page.waitForTimeout(600);
    await shot(page, 'card-fight', w);
    await page.evaluate(() => document.querySelector('.qcCard .qcRow button:not(.primary)').click());
    await page.waitForTimeout(600);
    await shot(page, 'log', w);
    await page.evaluate(() => document.querySelector('.qlFight').click());
    await page.waitForTimeout(900);
    await shot(page, 'party', w);
    // (a tap on a locked hero: a nudge and a word)
    await page.evaluate(() => document.querySelector('#ptSlots .ptSlot.quest').click());
    await page.waitForTimeout(150);
    await shot(page, 'party-locked', w);
    await page.evaluate(() => document.getElementById('ptGo').click());
    await page.waitForTimeout(3200);
    await shot(page, 'story', w);
    await page.waitForTimeout(4200);
    await shot(page, 'story-2', w);
    await skipScenes(page);
    await page.waitForTimeout(1200);
    await shot(page, 'deploy', w);
    await autoPlace(page);
    await page.waitForTimeout(800);
    await shot(page, 'deploy-ready', w);
    // (the waves: fight, hurry, next, until the bridge is held)
    let fought = false;
    for (let i = 0; i < 400; i++) {
      if (await page.evaluate(() => window.__game.scenes.playing)) {
        await page.waitForTimeout(1500);
        await shot(page, 'beat', w);
        await skipScenes(page);
        await page.waitForTimeout(1200);
        break;
      }
      const ph = await phase(page);
      await leaveEvent(page);
      if (await visible(page, '#bossCard')) await page.evaluate(() => document.getElementById('bossCard').click());
      if (ph === 'deploy') {
        if (await page.evaluate(() => document.getElementById('fight').disabled)) await autoPlace(page);
        await page.evaluate(() => document.getElementById('fight').click());
        await page.waitForTimeout(400);
      } else if (ph === 'fight') {
        if (!fought) {
          await page.waitForTimeout(2500);
          await shot(page, 'fight', w);
          fought = true;
        }
        await thin(page, 'foe');
        await page.waitForTimeout(250);
      } else if (await visible(page, '#result')) {
        const txt = await page.evaluate(() => document.getElementById('next').textContent);
        if (txt === 'Onward') await shot(page, 'won', w);
        await page.evaluate(() => document.getElementById('next').click());
        await page.waitForTimeout(800);
      } else await page.waitForTimeout(500);
    }
    await page.waitForTimeout(800);
    await shot(page, 'handin', w);
    // (handed in: the Done tab offers it again, for practice)
    await page.evaluate(() => document.querySelector('.qlSide button.primary')?.click());
    await page.waitForTimeout(500);
    await page.evaluate(() => [...document.querySelectorAll('.qlTab')].find((b) => b.textContent.startsWith('Done')).click());
    await page.waitForTimeout(400);
    await shot(page, 'replay', w);
    await ctx.close();
  }
  // ---------------------------------------------------------------- a loss: hearts spent, Try again
  {
    const { ctx, page } = await boot(w, h, { active: [{ id: 'twoBladesBridge', progress: 0 }], offers: [], done: [], told: ['bridgeBlades'] });
    await toTavernLog(page);
    await page.evaluate(() => document.querySelector('.tvQuests').click());
    await page.waitForTimeout(400);
    await page.evaluate(() => document.querySelector('.qlFight').click());
    await page.waitForTimeout(700);
    await page.evaluate(() => document.getElementById('ptGo').click());
    await page.waitForTimeout(1200);
    for (let i = 0; i < 400; i++) {
      const ph = await phase(page);
      await leaveEvent(page);
      if (await visible(page, '#bossCard')) await page.evaluate(() => document.getElementById('bossCard').click());
      if (await visible(page, '#result')) {
        const txt = await page.evaluate(() => document.getElementById('next').textContent);
        if (txt === 'Try again') {
          await page.waitForTimeout(600);
          await shot(page, 'lost', w);
          await page.evaluate(() => document.getElementById('next').click());
          await page.waitForTimeout(1200);
          await shot(page, 'try-again', w);
          break;
        }
        await page.evaluate(() => document.getElementById('next').click());
        await page.waitForTimeout(600);
      } else if (ph === 'deploy') {
        await autoPlace(page);
        await page.evaluate(() => document.getElementById('fight').click());
        await page.waitForTimeout(500);
      } else if (ph === 'fight') {
        await thin(page, 'hero');
        await page.waitForTimeout(800);
      } else await page.waitForTimeout(500);
    }
    await ctx.close();
  }
}
await browser.close();
server.close();
console.log(errors.length ? errors.join('\n') : 'no page errors');
