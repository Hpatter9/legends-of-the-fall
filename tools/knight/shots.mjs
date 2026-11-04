// The Knight's plain form in the game, for review (docs/notes/knight-sprite.md): the hero sheet, the awakening card
// (before and after), the tavern, and a fight (deploy, mid-fight, defeated). Seeded in this browser only.
//   npm run web && node tools/knight/shots.mjs [port]
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { build } from 'esbuild';
const require = createRequire(import.meta.url);
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
await build({ entryPoints: ['tools/ascended/fixture.ts'], outfile: 'out/ascended-seed.cjs', platform: 'node', bundle: true, format: 'cjs', logLevel: 'silent' });
await build({ entryPoints: ['tools/ascended/fixture.ts'], outfile: 'out/web/ascended-fixture.js', platform: 'browser', bundle: true, format: 'iife', globalName: 'ASCEND_FIXTURE', logLevel: 'silent' });
const seed = require('../../out/ascended-seed.cjs');
const out = 'docs/samples';
mkdirSync(out, { recursive: true });
const mime = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', webp: 'image/webp', json: 'application/json', webmanifest: 'application/manifest+json', woff2: 'font/woff2', opus: 'audio/ogg' };
const port = Number(process.argv[2] ?? 8800);
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  try {
    const file = `out/web${path === '/' ? '/index.html' : path}`;
    res.setHeader('Content-Type', mime[file.split('.').pop()] ?? 'application/octet-stream');
    res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(port, '127.0.0.1', ok));
const url = `http://localhost:${port}`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const tipIds = [...readFileSync('src/tips.ts', 'utf8').matchAll(/^  (\w+): \{ text:/gm)].map((m) => m[1]);
const errors = [];
try {
  const [width, height] = [393, 852];
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const meta = seed.startedMeta(7);
  meta.unlocked = [...seed.ALL_HEROES];
  meta.party = ['knight', 'archer', 'wizard', 'paladin', 'cleric'];
  meta.shards = Object.fromEntries(seed.ALL_HEROES.map((k) => [k, 80]));
  meta.ranked = Object.fromEntries(seed.ALL_HEROES.map((k) => [k, 4]));
  meta.heroesSeen = [...seed.ALL_HEROES];
  meta.ores = Object.fromEntries(seed.ORE_TRAITS.map((k) => [k, 100]));
  delete meta.awakened;
  await context.addInitScript(({ meta, tipIds }) => {
    if (!localStorage.getItem('knight-review-seeded')) {
      localStorage.clear();
      localStorage.setItem('legends.meta', JSON.stringify(meta));
      localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false }));
      localStorage.setItem('legends.tips', JSON.stringify(tipIds));
      localStorage.setItem('knight-review-seeded', '1');
    }
  }, { meta, tipIds });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  await page.goto(`${url}/?seed=7`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await page.addScriptTag({ url: `${url}/ascended-fixture.js` });
  await page.waitForTimeout(1500);

  // the tavern (the Heroes tab), then the hero sheet
  await page.evaluate(() => { const g = window.__game; document.getElementById('tipSkip')?.click(); g.home.open(); g.home.show('heroes'); });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/knight-sprite-tavern-393.png` });
  await page.evaluate(() => window.__game.home.openSheet('knight'));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/knight-sprite-sheet-393.png` });
  // the awakening card: before and after, side by side
  await page.locator('.rankBadge').click();
  await page.locator('.ruLooks.two canvas').first().waitFor();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/knight-sprite-awakening-393.png` });
  await page.locator('.ruBtns button').last().click();
  await page.locator('.heroBack').click();

  // a fight, unawakened
  await page.evaluate(() => {
    const g = window.__game, a = window.ASCEND_FIXTURE;
    const kinds = ['knight', 'archer', 'wizard', 'paladin', 'cleric'];
    g.home.go(() => {});
    g.meta.awakened = {};
    g.meta.party = kinds;
    g.run = a.newRun(7, kinds, g.meta.castle, 0, 999);
    g.run.roster = kinds.map((kind, i) => ({ id: i + 1, kind, grade: 1 }));
    g.run.squad = kinds.map((_, i) => i + 1);
    g.run.nextId = kinds.length + 1;
    g.newBattle(); g.endIntro?.();
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/knight-sprite-deploy-393.png` });
  // (close-ups of the Knight on the board: the box round his body, in page pixels, padded)
  const knightBox = () => page.evaluate(() => {
    const g = window.__game;
    const u = g.b.units.find((u) => u.side === 'hero' && u.def === 'knight');
    const s = u && g.sprites.get(u.id);
    if (!s || !s.root.visible) return null;
    const r = s.body.getBounds();
    const k = g.app.canvas.getBoundingClientRect().width / g.app.screen.width;
    const c = g.app.canvas.getBoundingClientRect();
    return { x: Math.max(0, c.left + (r.x - 14) * k), y: Math.max(0, c.top + (r.y - 14) * k), width: (r.width + 28) * k, height: (r.height + 28) * k, hp: u.hp, alive: u.alive, anim: s.anim ?? s.row ?? '' };
  });
  const close = [];
  const snap = async (tag) => {
    const box = await knightBox();
    if (!box) return;
    const file = `out/knight-close-${close.length}.png`;
    await page.screenshot({ path: file, clip: { x: box.x, y: box.y, width: Math.min(box.width, 393 - box.x), height: Math.min(box.height, 852 - box.y) } });
    close.push({ file, tag, hp: box.hp, anim: String(box.anim) });
  };
  await snap('deployed');
  await page.evaluate(() => window.__game.begin());
  for (let i = 0; i < 10; i++) { await page.waitForTimeout(450); await snap('fighting'); }
  await page.screenshot({ path: `${out}/knight-sprite-fight-393.png` });
  // (defeated: the review drops his hit points to one, so the next blow fells him and the renderer plays his dying row)
  await page.evaluate(() => { const g = window.__game; const u = g.b.units.find((u) => u.side === 'hero' && u.def === 'knight'); if (u) u.hp = 1; });
  for (let i = 0; i < 8; i++) { await page.waitForTimeout(250); await snap('falling'); }
  await page.screenshot({ path: `${out}/knight-sprite-late-393.png` });
  writeFileSync('out/knight-close.json', JSON.stringify(close, null, 1));
  await context.close();
} finally {
  await browser.close();
  server.close();
}
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'no page errors');
