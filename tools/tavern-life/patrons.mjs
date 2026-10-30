// Checks that the patrons' quest marks and taps still work with the fixed activities (QUESTS-1b with TAVERN-LIFE): offers from heroes
// at the bar, the arm-wrestle, the dartboard, the stage and the card table; each view shot, then a tap on two patrons opens their card.
//   npm run web && node tools/tavern-life/patrons.mjs     (PORT, default 8793; pictures go to ${OUT ?? 'docs/samples'}/tavern-life-patrons-*.png)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const root = 'out/web';
const OUT = process.env.OUT ?? 'docs/samples';
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : p.endsWith('.png') ? 'image/png' : 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(Number(process.env.PORT ?? 8793));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader'] });
mkdirSync(OUT, { recursive: true });
const url = `http://localhost:${srv.address().port}/`;
const ALL = ['archer', 'knight', 'kunoichi', 'samurai', 'wizard', 'peasant', 'ninjaMonk', 'yamabushi', 'wanderer', 'lightningMage', 'gorgon', 'paladin', 'cleric', 'barbarian', 'ranger', 'mercenary', 'mummy', 'buccaneer', 'rifleBot', 'illusionist', 'gunslinger', 'satyr', 'druid', 'warlock', 'samuraiCommander', 'shambler', 'kitsune', 'werewolf', 'karasu', 'minotaur', 'dragoon', 'lancer', 'dreadPirate', 'sage', 'demonSwordsman', 'tyrant', 'siegeBot', 'juggernaut', 'priestess', 'wolfBard', 'timeWitch', 'arcBlade', 'reaper', 'kraken', 'beastmaster'];
const OFFERS = ['kwameShieldPractice', 'eirikRedAxe', 'selamLantern', 'harrowWhoPaysForRum', 'itzelGreyPack', 'edmundVerdict', 'hideoHoldTheLine', 'hobbUnburied'];
let errors = 0;
const open = async (cam) => {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
  ctx.setDefaultTimeout(180000);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => (errors++, console.log('PAGE ERROR', e.message)));
  await page.addInitScript(([heroes, offers, c]) => {
    const d = new Date();
    const today = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const m = { seed: 7, crowns: 600, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, castle: { treasury: 0, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 3, tower: 0, daily: {}, bosses: [], achievements: [], heroesSeen: heroes, scenes: ['opening'] };
    m.quests = { day: today, offers: offers.map((id) => ({ id, giver: 'x', day: today })), active: [], done: [], times: {}, last: {} };
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('legends.meta', JSON.stringify(m));
      sessionStorage.setItem('seeded', '1');
    }
    localStorage.setItem('lotf-tips-off', '1');
    sessionStorage.setItem('lotf.tavern.cam', String(c));
  }, [ALL, OFFERS, cam]);
  await page.goto(url, { timeout: 180000 });
  await page.waitForFunction(() => document.getElementById('hmBattle'));
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  for (let i = 0; i < 12 && (await page.$('.earnedArrival')); i++) {
    await page.evaluate(() => document.querySelector('.earnedArrival')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await page.waitForTimeout(700);
  }
  await page.locator('.hmTab').nth(1).click();
  await page.waitForFunction(() => document.querySelector('.tvRoom')?.width > 0);
  await page.waitForTimeout(2500);
  return { ctx, page };
};
// (a room pixel on the page: two CSS pixels a room pixel; the floor's top, room y 128, sits where the canvas puts it)
const tapRoom = async (page, cam, x, y) => {
  const box = await page.locator('.tvRoom').boundingBox();
  const camY = Math.max(-72, 296 + 26 - box.height / 2);
  await page.mouse.click(box.x + (x - cam) * 2, box.y + (y - camY) * 2);
  await page.waitForTimeout(1500);
};
const VIEWS = { bar: 190, hearth: 574, games: 768, stage: 956 };
for (const [name, cam] of Object.entries(VIEWS)) {
  const { ctx, page } = await open(cam);
  await page.screenshot({ path: `${OUT}/tavern-life-patrons-${name}-393x852.png` });
  // (a tap on a patron at the darts and on the stage opens their card)
  if (name === 'games') {
    await tapRoom(page, cam, 768 + 88, 184 - 20);
    await page.screenshot({ path: `${OUT}/tavern-life-patrons-tap-dartboard-393x852.png` });
  }
  if (name === 'stage') {
    await tapRoom(page, cam, 768 + 366, 266 - 20);
    await page.screenshot({ path: `${OUT}/tavern-life-patrons-tap-stage-393x852.png` });
  }
  await ctx.close();
}
console.log('page errors:', errors);
await browser.close();
srv.close();
