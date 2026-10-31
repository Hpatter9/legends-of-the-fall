// Screenshots of the secret heroes and the hero quests (SECRET-HEROES) at the three phone sizes, and a check that no page shows a secret
// hero's name: the All heroes list and a secret's sheet, the Recruit tab's collection, the party screen, the codex; then the tale of the
// Fold: Old Maud's offer on the board and her card, the quest battle's story with the stranger, the deploy, and the hand-in with Vuk's
// reveal. `npm run web`, then `node tools/secret-heroes/shots.mjs [port] [WxH]`; pictures go to docs/samples/secret-*.png and
// docs/samples/hero-quest-*.png.
import { createRequire } from 'node:module';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const port = Number(process.argv[2] ?? 9091);
const only = process.argv[3];
const server = serve('out/web', port);
const launch = () => chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage'] });
const HEROES = ['knight', 'samurai', 'archer', 'kunoichi', 'wizard', 'peasant', 'cleric', 'paladin'];
const rec = () => ({ waves: 15, best: 15, won: 15, clears: 1, stars: { 15: 3 } });
const ARMIES = Object.fromEntries(['orcs', 'undead', 'beasts'].map((a) => [a, rec()]));
const SIZES = only ? [only.split('x').map(Number)] : [[393, 852], [360, 780], [412, 915]];
const errors = [];
const leaks = [];
// (every name a secret hero goes by: its own, its title, its class; checked against each page's text and attributes)
const SECRET = ['Vuk', 'Hunter of the Full Moon', 'Hideo', 'Holder of the Bridge', 'Vesper', 'Keeper of the Last Hour', 'Adaeze', 'Starlit Hourglass', 'Harrow', 'Twice-Drowned Captain', 'Tiziri', 'Crowned Wyvern Rider', 'Kerem', 'the Marching Wall', 'Seydou', 'Reader of the Stars', 'Aram', 'Host of the Hungry Steel', 'Edmund', 'the Unbending Verdict', 'Juggernaut', 'Dread Pirate', 'Time Witch', 'Queen Dragoon', 'Great Sage', 'Demon Swordsman', 'Samurai Commander', 'Tyrant', 'Reaper'];

async function boot(w, h, quests) {
  // (a browser each, closed after: the page is large and the machine is shared)
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(180000);
  page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(`${w}x${h}: ${e.message}`));
  await page.goto(`http://localhost:${port}/?x=${Math.random()}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.evaluate(([heroes, armies, quests]) => {
    localStorage.clear();
    const d = new Date();
    const today = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const q = { ...quests, day: today, offers: quests.offers.map((id) => ({ id, giver: 'shepherd', day: today })), active: quests.active.map((a) => ({ ...a, took: today })), drawn: { patron: today, royal: today, duchess: today } };
    const m = { seed: 7, crowns: 4000, stones: 30, unlocked: heroes, party: ['knight', 'samurai', 'archer', 'kunoichi', 'wizard'], pulls: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(heroes.map((k) => [k, 90000])), bestStage: 14, tower: 0, daily: {}, bosses: [], achievements: [], armies, armySeen: Object.keys(armies), stash: [], scenes: ['opening'], heroesSeen: heroes, quests: q };
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
  }, [HEROES, ARMIES, quests]);
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => document.getElementById('hmBattle'), {}, { timeout: 240000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx: { close: () => browser.close() }, page };
}

const shot = (page, name, w) => page.screenshot({ path: `docs/samples/${name}-${w}.png` });
/** The page's words and attributes (alt, aria, data, src) must not name a secret hero. */
async function noLeak(page, where) {
  const text = await page.evaluate(() => {
    const parts = [document.body.innerText];
    for (const e of document.querySelectorAll('*')) for (const a of e.attributes) if (/^(alt|aria-|title|data-|src)/.test(a.name)) parts.push(a.value);
    return parts.join('\n');
  });
  for (const n of SECRET) if (new RegExp(`\\b${n}\\b`).test(text)) leaks.push(`${where}: ${n}`);
}
const heroesTab = (page) => page.evaluate(() => [...document.querySelectorAll('.hmTab')].find((b) => b.textContent.includes('Heroes')).click());
const skipScenes = async (page) => {
  for (let i = 0; i < 30 && (await page.evaluate(() => window.__game.scenes.playing)); i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
};

for (const [w, h] of SIZES) {
  // ---------------------------------------------------------------- the lists
  {
    const { ctx, page } = await boot(w, h, { active: [], offers: [], done: [] });
    await heroesTab(page);
    await page.waitForTimeout(1200);
    await page.evaluate(() => window.__game.home.openRoster());
    await page.waitForTimeout(800);
    await page.evaluate(() => { const r = document.querySelector('.rosHead'); const box = r?.closest('#hmSheetBox') ?? r?.parentElement; if (r && box) box.scrollTop = r.offsetTop - 8; });
    await page.waitForTimeout(300);
    await shot(page, 'secret-roster', w);
    await noLeak(page, `${w} roster`);
    await page.evaluate(() => document.querySelector('.rosRow.secret').click());
    await page.waitForTimeout(600);
    await shot(page, 'secret-sheet', w);
    await noLeak(page, `${w} sheet`);
    await page.evaluate(() => window.__game.home.closeSheet());
    await page.evaluate(() => window.__game.home.show('recruit'));
    await page.waitForTimeout(900);
    await page.evaluate(() => document.querySelector('.hlOdds')?.click());
    await page.waitForTimeout(900);
    await page.evaluate(() => document.getElementById('collection')?.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(300);
    await shot(page, 'secret-recruit', w);
    await noLeak(page, `${w} recruit`);
    await page.evaluate(() => window.__game.home.show('battle'));
    await page.evaluate(() => window.__game.home.openCodex());
    await page.waitForTimeout(800);
    await page.evaluate(() => [...document.querySelectorAll('.cxTab')].find((b) => /Heroes/i.test(b.textContent))?.click());
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector('.cxCard.secret')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    await shot(page, 'secret-codex', w);
    await noLeak(page, `${w} codex`);
    await ctx.close();
  }
  {
    const { ctx, page } = await boot(w, h, { active: [], offers: [], done: [] });
    await page.evaluate(() => window.__game.party.open('edit', () => undefined));
    await page.waitForTimeout(900);
    await page.evaluate(() => document.querySelector('#ptGrid .ptCard.locked')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    await shot(page, 'secret-party', w);
    await noLeak(page, `${w} party`);
    await ctx.close();
  }
  // ---------------------------------------------------------------- the tale of the Fold
  {
    const { ctx, page } = await boot(w, h, { active: [], offers: ['taleFoldTracks'], done: [] });
    await heroesTab(page);
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__game.home.openQuests('board'));
    await page.waitForTimeout(700);
    await shot(page, 'hero-quest-board', w);
    await page.evaluate(() => window.__game.home.closeSheet());
    await page.evaluate(() => window.__game.home.tavern.quests.onGiver('shepherd'));
    await page.waitForTimeout(700);
    await shot(page, 'hero-quest-offer', w);
    await noLeak(page, `${w} offer`);
    await ctx.close();
  }
  {
    const { ctx, page } = await boot(w, h, { active: [{ id: 'taleFoldNight', progress: 0 }], offers: [], done: ['taleFoldTracks'] });
    await heroesTab(page);
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__game.home.openQuests('active'));
    await page.waitForTimeout(700);
    await shot(page, 'hero-quest-log', w);
    await page.evaluate(() => document.querySelector('.qlFight').click());
    await page.waitForTimeout(900);
    await shot(page, 'hero-quest-party', w);
    await page.evaluate(() => document.getElementById('ptGo').click());
    await page.waitForTimeout(3000);
    await shot(page, 'hero-quest-story', w);
    await noLeak(page, `${w} story`);
    await page.waitForTimeout(4500);
    await shot(page, 'hero-quest-story-2', w);
    await noLeak(page, `${w} story 2`);
    await skipScenes(page);
    await page.waitForTimeout(1200);
    await page.evaluate(() => document.getElementById('auto').click());
    await page.waitForTimeout(800);
    await shot(page, 'hero-quest-deploy', w);
    await noLeak(page, `${w} deploy`);
    await ctx.close();
  }
  {
    const { ctx, page } = await boot(w, h, { active: [{ id: 'taleFoldNight', progress: 1 }], offers: [], done: ['taleFoldTracks'], won: ['moonFold'] });
    await heroesTab(page);
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__game.home.tavern.quests.onGiver('shepherd'));
    await page.waitForTimeout(700);
    await shot(page, 'hero-quest-handin', w);
    await noLeak(page, `${w} hand-in`);
    await page.evaluate(() => document.querySelector('.qcRow button.primary').click());
    await page.waitForTimeout(700);
    await shot(page, 'hero-quest-thanks', w);
    await page.evaluate(() => document.querySelector('.qcRow button.primary').click());
    await page.waitForTimeout(2500);
    await shot(page, 'hero-quest-reveal', w);
    await ctx.close();
  }
}
console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors');
console.log(leaks.length ? `LEAKS:\n${leaks.join('\n')}` : 'no secret hero named on any page');
server.close();
