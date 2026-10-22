// Serves out/web and takes the awakening and gear-set samples on an upright phone (393x852, then 360x780):
//   node tools/awaken/shots.mjs      (PORT; DPR default 2; pictures go to docs/samples/awaken-gear-<name>-<size>.png)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const root = 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(Number(process.env.PORT ?? 8129));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'];
const DPR = Number(process.env.DPR ?? 2);
const SIZES = { '393x852': { width: 393, height: 852 }, '360x780': { width: 360, height: 780 } };
mkdirSync('docs/samples', { recursive: true });
const item = (id, base, rarity, level) => ({ id, base, rarity, level });
// knight: ready for the first step; paladin: awakened once; werewolf: fully awakened (the pack's red sheet); samurai: wears two pieces of a set
const meta = {
  seed: 7, crowns: 2000, unlocked: [...HEROES, 'paladin', 'werewolf', 'cleric'], party: HEROES, pulls: 0, sinceNew: 0,
  castle: { treasury: 0, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 },
  shards: { knight: 17, paladin: 17, werewolf: 26, cleric: 12, samurai: 3 }, awakened: { paladin: 1, werewolf: 2 },
  stars: {}, xp: { knight: 9000, paladin: 9000, werewolf: 9000 }, bestStage: 3, tower: 0, daily: {}, bosses: [], achievements: [],
  equipment: [
    item(1, 'katana', 3, 5), item(2, 'lamellar', 2, 4), item(3, 'warDrum', 1, 2),
    item(4, 'ironSword', 1, 3), item(5, 'ironSword', 1, 7), item(6, 'ironSword', 1, 5), item(7, 'ironSword', 1, 1),
    item(8, 'leatherJerkin', 2, 4), item(9, 'leatherJerkin', 2, 6), item(10, 'leatherJerkin', 2, 2), item(11, 'luckyCharm', 1, 1),
  ],
  equipped: { samurai: { weapon: 1, armour: 2 } }, nextItem: 12,
};
for (const size of process.env.SIZES ? process.env.SIZES.split(',') : Object.keys(SIZES)) {
  const ctx = await browser.newContext({ viewport: SIZES[size], deviceScaleFactor: DPR, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('console error', m.text()));
  await page.addInitScript(([m]) => { try { localStorage.setItem('legends.meta', JSON.stringify(m)); localStorage.setItem('lotf-tips-off', '1'); } catch {} }, [meta]);
  await page.goto(`http://localhost:${srv.address().port}/`);
  await page.waitForTimeout(1500);
  await page.addStyleTag({ content: '#tip { display: none !important; }' });
  const shot = (name) => page.screenshot({ path: `docs/samples/awaken-gear-${name}-${size}.png` });
  // (the party screen lists every hero with an info button that opens the sheet)
  await page.evaluate(() => window.__game.party.open('edit', () => {}));
  await page.waitForTimeout(1000);
  const openSheet = async (name) => {
    const card = page.locator('.ptCard', { hasText: name });
    await card.locator('.ptInfo').click();
    await page.waitForTimeout(700);
  };
  const closeSheet = async () => { await page.locator('#ptSheetBox > button.primary', { hasText: 'Close' }).click(); await page.waitForTimeout(300); };
  const scrollTo = async (sel) => { await page.locator(`#ptSheetBox ${sel}`).first().scrollIntoViewIfNeeded(); await page.waitForTimeout(250); };
  // Knight: the path to awaken, the button ready
  await openSheet('Knight');
  await shot('sheet-top');
  await scrollTo('.awPanel');
  await shot('awaken-ready');
  // the show (taken in the first frames)
  await page.locator('#ptSheetBox .awPanel button.primary').click();
  await page.waitForTimeout(250);
  await page.locator('#ptSheetBox').evaluate((e) => (e.scrollTop = 0));
  await shot('awaken-show');
  await page.waitForTimeout(2300);
  await shot('awakened-knight');
  await closeSheet();
  // Werewolf: fully awakened, the pack's red sheet; Paladin: a recolour
  await openSheet('Werewolf');
  await shot('werewolf-top');
  await scrollTo('.awPanel');
  await shot('awaken-done');
  await closeSheet();
  await openSheet('Paladin');
  await shot('paladin-top');
  await closeSheet();
  // Samurai: gear sets
  await openSheet('Samurai');
  await scrollTo('.eqPanel');
  await shot('gear-sets');
  await page.locator('#ptSheetBox .eqPanel button', { hasText: 'Combine' }).click();
  await page.waitForTimeout(300);
  await scrollTo('.eqPanel');
  await shot('combine');
  await page.locator('#ptSheetBox .eqPanel button', { hasText: 'Auto-combine all' }).click();
  await page.waitForTimeout(300);
  await shot('combined');
  await page.locator('#ptSheetBox .eqPanel button', { hasText: 'Back' }).click();
  await page.locator('#ptSheetBox .eqPanel button', { hasText: 'All sets' }).click();
  await page.waitForTimeout(300);
  await shot('all-sets');
  await ctx.close();
}
await browser.close();
srv.close();
