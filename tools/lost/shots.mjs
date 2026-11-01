// Screenshots of the lost techniques (LOST-TECHNIQUES) at 393x852: the board with the four chains' first parts up, Kenji's offer card, the
// hand-in of The Empty Dojo and the book arriving in the bag, The Empty Dojo's story and deploy, and Kenji's Skill book with The Ninefold Cut
// learned and chosen. `npm run web`, then `node tools/lost/shots.mjs [port]`; pictures go to docs/samples/lost-*.png.
import { createRequire } from 'node:module';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const port = Number(process.argv[2] ?? 9093);
const server = serve('out/web', port);
const HEROES = ['knight', 'samurai', 'archer', 'kunoichi', 'wizard', 'peasant', 'cleric', 'paladin', 'werewolf', 'priestess'];
const rec = () => ({ waves: 15, best: 15, won: 15, clears: 1, stars: { 15: 3 }, hard: { 1: { won: 15, clears: 1 }, 2: { won: 15, clears: 1 } } });
const ARMIES = Object.fromEntries(['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'].map((a) => [a, rec()]));
const FIRSTS = [['lostNineScroll', 'lost'], ['lostWordsCrossing', 'lost'], ['lostDawnWounds', 'lost'], ['lostHungerPacks', 'lost']];
const errors = [];
const [w, h] = [393, 852];

async function boot(quests, extra = {}) {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(180000);
  page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(([heroes, armies, quests, extra]) => {
    if (sessionStorage.getItem('shot-seeded')) return;
    sessionStorage.setItem('shot-seeded', '1');
    localStorage.clear();
    const d = new Date();
    const today = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const q = { ...quests, day: today, offers: quests.offers.map(([id, giver]) => ({ id, giver, day: today })), active: quests.active.map((a) => ({ ...a, took: today })), drawn: { patron: today, royal: today, duchess: today } };
    const m = { seed: 7, crowns: 4000, stones: 30, unlocked: heroes, party: ['knight', 'samurai', 'archer', 'kunoichi', 'wizard'], pulls: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(heroes.map((k) => [k, 90000])), bestStage: 14, tower: 0, daily: {}, bosses: [], achievements: [], armies, armySeen: Object.keys(armies), opened: ['tower', 'calamity'], calamity: { best: 6, clears: 2, asc: 1 }, stash: [], scenes: ['opening'], heroesSeen: heroes, quests: q, ...extra };
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
  }, [HEROES, ARMIES, quests, extra]);
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => document.getElementById('hmBattle') && window.__game?.home && window.__game?.party, {}, { timeout: 240000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { browser, page };
}
const shot = (page, name) => page.screenshot({ path: `docs/samples/lost-${name}.png` });
const heroesTab = (page) => page.evaluate(() => [...document.querySelectorAll('.hmTab')].find((b) => b.textContent.includes('Heroes')).click());
const skipScenes = async (page) => {
  for (let i = 0; i < 30 && (await page.evaluate(() => window.__game.scenes.playing)); i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
};

{
  const { browser, page } = await boot({ active: [], offers: FIRSTS, done: [] });
  await heroesTab(page);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__game.home.openQuests('board'));
  await page.waitForSelector('#hmSheet:not([hidden])');
  await page.waitForTimeout(1500);
  await shot(page, 'board');
  await browser.close();
}
{
  const { browser, page } = await boot({ active: [], offers: [FIRSTS[0]], done: [] });
  await heroesTab(page);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__game.home.tavern.quests.onGiver('lost'));
  await page.waitForTimeout(700);
  await shot(page, 'offer');
  await browser.close();
}
{
  const { browser, page } = await boot({ active: [{ id: 'lostNineDojo', progress: 0 }], offers: [], done: ['lostNineScroll', 'lostNineRoad'] });
  await heroesTab(page);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__game.home.openQuests('active'));
  await page.waitForSelector('#hmSheet:not([hidden])');
  await page.waitForTimeout(1500);
  await shot(page, 'log');
  await page.evaluate(() => document.querySelector('.qlFight').click());
  await page.waitForTimeout(900);
  await page.evaluate(() => document.getElementById('ptGo').click());
  await page.waitForTimeout(7000);
  await shot(page, 'story');
  await skipScenes(page);
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('auto').click());
  await page.waitForTimeout(800);
  await shot(page, 'deploy');
  await browser.close();
}
{
  const { browser, page } = await boot({ active: [{ id: 'lostNineDojo', progress: 1 }], offers: [], done: ['lostNineScroll', 'lostNineRoad'], won: ['emptyDojo'] });
  await heroesTab(page);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__game.home.tavern.quests.onGiver('lost'));
  await page.waitForTimeout(700);
  await shot(page, 'handin');
  await browser.close();
}
{
  const { browser, page } = await boot({ active: [], offers: [], done: [] }, { learned: { samurai: ['ninefoldCut'] }, loadout: { samurai: ['ninefoldCut', 'own2'] }, books: { oldHunger: 1 } });
  await heroesTab(page);
  await page.waitForTimeout(1500);
  // (Kenji's sheet on its Skills tab: the Skill book panel, The Ninefold Cut in slot 1)
  await page.evaluate(() => window.__game.home.openSheet('samurai', false, 'overview'));
  await page.waitForSelector('#hmSheet:not([hidden])');
  await page.waitForTimeout(1000);
  await page.evaluate(() => [...document.querySelectorAll('.heroTabs button, [role=tab]')].find((x) => x.textContent.includes('Skills'))?.click());
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('.kbPanel, .kbBox, [class^=kb]')?.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(500);
  await shot(page, 'skillbook');
  await browser.close();
}
console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors');
server.close();
