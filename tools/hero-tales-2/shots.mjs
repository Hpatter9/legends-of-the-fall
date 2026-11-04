// Screenshots of the seven tales added in HERO-TALES-2 at the three phone sizes, and a check that no page names a secret hero: the board
// with each tale's first part up, each new giver's card, the story of The Thirteenth Bell with the stranger at the lychgate, its deploy,
// and The Second Throne's last hand-in with the hero's reveal. `npm run web`, then `node tools/hero-tales-2/shots.mjs [port] [WxH]`;
// pictures go to docs/samples/hero-tales-2-*.png.
import { createRequire } from 'node:module';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const port = Number(process.argv[2] ?? 9092);
const only = process.argv[3];
const server = serve('out/web', port);
const launch = () => chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage'] });
const HEROES = ['knight', 'samurai', 'archer', 'kunoichi', 'wizard', 'peasant', 'cleric', 'paladin'];
const rec = () => ({ waves: 15, best: 15, won: 15, clears: 1, stars: { 15: 3 }, hard: { 1: { won: 15, clears: 1 }, 2: { won: 15, clears: 1 } } });
const ARMIES = Object.fromEntries(['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'].map((a) => [a, rec()]));
const SIZES = only ? [only.split('x').map(Number)] : [[393, 852], [360, 780], [412, 915]];
/** The seven new tales' first parts, by giver. */
const FIRSTS = [
  ['taleLedgerUncounted', 'sexton'],
  ['talePawnTicket', 'pawnbroker'],
  ['taleBannerLanterns', 'lantern'],
  ['taleThroneSummons', 'herald'],
  ['taleClockStopped', 'clock'],
  ['taleEyrieAsh', 'falconer'],
  ['taleStarMargins', 'archivist'],
];
const errors = [];
const leaks = [];
// (every name a secret hero goes by: its own, its title, its class; checked against each page's text and attributes)
const SECRET = ['Vuk', 'Hunter of the Full Moon', 'Hideo', 'Holder of the Bridge', 'Vesper', 'Keeper of the Last Hour', 'Adaeze', 'Starlit Hourglass', 'Harrow', 'Twice-Drowned Captain', 'Tiziri', 'Crowned Wyvern Rider', 'Kerem', 'the Marching Wall', 'Seydou', 'Reader of the Stars', 'Aram', 'Host of the Hungry Steel', 'Edmund', 'the Unbending Verdict', 'Juggernaut', 'Dread Pirate', 'Time Witch', 'Queen Dragoon', 'Great Sage', 'Demon Swordsman', 'Samurai Commander', 'Tyrant', 'Reaper'];

async function boot(w, h, quests, tries) {
  // (a browser each, closed after: the page is large and the machine is shared)
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(180000);
  page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(`${w}x${h}: ${e.message}`));
  // (the save is written before the page's own scripts run, so the page is loaded once; far enough on for every tale to open)
  await page.addInitScript(([heroes, armies, quests]) => {
    if (sessionStorage.getItem('shot-seeded')) return;
    sessionStorage.setItem('shot-seeded', '1');
    localStorage.clear();
    const d = new Date();
    const today = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const q = { ...quests, day: today, offers: quests.offers.map(([id, giver]) => ({ id, giver, day: today })), active: quests.active.map((a) => ({ ...a, took: today })), drawn: { patron: today, royal: today, duchess: today } };
    const m = { seed: 7, crowns: 4000, stones: 30, unlocked: heroes, party: ['knight', 'samurai', 'archer', 'kunoichi', 'wizard'], pulls: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(heroes.map((k) => [k, 90000])), bestStage: 14, tower: 0, daily: {}, bosses: [], achievements: [], armies, armySeen: Object.keys(armies), opened: ['tower', 'calamity'], calamity: { best: 6, clears: 2, asc: 1 }, stash: [], scenes: ['opening'], heroesSeen: heroes, quests: q };
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
  }, [HEROES, ARMIES, quests]);
  // (a busy shared machine now and then crashes the tab as it loads: try again in a new browser)
  try {
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => document.getElementById('hmBattle') && window.__game?.home && window.__game?.party, {}, { timeout: 240000 });
  } catch (e) {
    await browser.close();
    if ((tries ?? 0) >= 3) throw e;
    return boot(w, h, quests, (tries ?? 0) + 1);
  }
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx: { close: () => browser.close() }, page };
}

const shot = (page, name, w) => page.screenshot({ path: `docs/samples/hero-tales-2-${name}-${w}.png` });
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
  // ---------------------------------------------------------------- the board, and each new giver's card
  {
    const { ctx, page } = await boot(w, h, { active: [], offers: FIRSTS, done: [] });
    await heroesTab(page);
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__game.home.openQuests('board'));
    await page.waitForSelector('#hmSheet:not([hidden])');
    await page.waitForTimeout(1500);
    await shot(page, 'board', w);
    await noLeak(page, `${w} board`);
    await page.evaluate(() => window.__game.home.closeSheet());
    for (const [, giver] of FIRSTS) {
      await page.evaluate((g) => window.__game.home.tavern.quests.onGiver(g), giver);
      await page.waitForTimeout(700);
      await shot(page, `offer-${giver}`, w);
      await noLeak(page, `${w} offer ${giver}`);
      await page.keyboard.press('Escape');
      await page.evaluate(() => document.querySelector('.qcClose, .qcRow button:not(.primary)')?.click());
      await page.waitForTimeout(400);
    }
    await ctx.close();
  }
  // ---------------------------------------------------------------- The Thirteenth Bell: the story, the stranger, the deploy
  {
    const { ctx, page } = await boot(w, h, { active: [{ id: 'taleLedgerThirteen', progress: 0 }], offers: [], done: ['taleLedgerUncounted', 'taleLedgerBell'] });
    await heroesTab(page);
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__game.home.openQuests('active'));
    await page.waitForSelector('#hmSheet:not([hidden])');
    await page.waitForTimeout(1500);
    await shot(page, 'log', w);
    await noLeak(page, `${w} log`);
    await page.evaluate(() => document.querySelector('.qlFight').click());
    await page.waitForTimeout(900);
    await page.evaluate(() => document.getElementById('ptGo').click());
    await page.waitForTimeout(7000);
    await shot(page, 'story', w);
    await noLeak(page, `${w} story`);
    // (on to the figure at the lychgate, in shadow: Enter moves the story on, as a tap does)
    for (let i = 0; i < 1; i++) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1800);
    }
    await shot(page, 'story-2', w);
    await noLeak(page, `${w} story 2`);
    await skipScenes(page);
    await page.waitForTimeout(1200);
    await page.evaluate(() => document.getElementById('auto').click());
    await page.waitForTimeout(800);
    await shot(page, 'deploy', w);
    await noLeak(page, `${w} deploy`);
    await ctx.close();
  }
  // ---------------------------------------------------------------- The Second Throne's end: the hand-in, and the reveal
  {
    const { ctx, page } = await boot(w, h, { active: [{ id: 'taleThroneAppeal', progress: 1 }], offers: [], done: ['taleThroneSummons', 'taleThroneContempt'], won: ['theAppeal'] });
    await heroesTab(page);
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__game.home.tavern.quests.onGiver('herald'));
    await page.waitForTimeout(700);
    await shot(page, 'handin', w);
    await noLeak(page, `${w} hand-in`);
    await page.evaluate(() => document.querySelector('.qcRow button.primary').click());
    await page.waitForTimeout(700);
    await shot(page, 'thanks', w);
    await page.evaluate(() => document.querySelector('.qcRow button.primary').click());
    await page.waitForTimeout(2500);
    await shot(page, 'reveal', w);
    await ctx.close();
  }
}
console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors');
console.log(leaks.length ? `LEAKS:\n${leaks.join('\n')}` : 'no secret hero named on any page');
server.close();
