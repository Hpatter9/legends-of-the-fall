// Room-detail review: all four halls at each portrait size and with reduced motion.
// npm run web first. Set CHROMIUM_PATH if Chromium is outside the usual location.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve('out/web');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.opus': 'audio/ogg' };
const server = createServer((req, res) => {
  const file = resolve(root, '.' + (req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!file.startsWith(root + '/')) { res.writeHead(403); res.end(); return; }
  try { res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream'); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
}).listen(8153, '127.0.0.1');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
  await context.addInitScript(() => {
    const heroes = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'ranger'];
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), opened: ['tower', 'castle'], pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(heroes.map(h => [h, 104400])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, saver: true }));
    localStorage.removeItem('legends.stand');
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8153/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game, {}, { timeout: 120000 });
  await page.evaluate(() => { window.__game.app.ticker.maxFPS = 5; document.getElementById('tipSkip')?.click(); document.getElementById('hmTower').click(); });
  await page.waitForSelector('.stPick:not([hidden])');
  await page.evaluate(() => {
    [...document.querySelectorAll('.stPick button')].find(b => b.textContent === 'Auto fill')?.click();
    document.querySelector('.stPick .primary').click();
  });
  await page.waitForFunction(() => window.__game.stand.state);
  await page.addStyleTag({ content: '#quip, #tip, .stCount { display: none !important; }' });
  for (const [width, height] of [[393, 852], [360, 780], [412, 915]]) {
    await page.setViewportSize({ width, height });
    for (const kind of ['hall', 'chapel', 'library', 'courtyard']) {
      await page.evaluate(kind => window.__game.stand.debugHall(kind), kind);
      await page.waitForTimeout(900);
      await page.screenshot({ path: `docs/samples/stand-depth-${kind}-${width}x${height}.png` });
    }
    await page.evaluate(() => document.querySelector('.stStart').click());
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `docs/samples/stand-depth-fight-${width}x${height}.png` });
    console.log(`Captured four rooms and a live fight at ${width}x${height}`);
  }
  await page.setViewportSize({ width: 393, height: 852 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/samples/stand-depth-reduced-393x852.png' });
  console.log(JSON.stringify({ errors }));
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); server.close(); }
