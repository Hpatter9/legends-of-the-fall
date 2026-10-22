// Plays made-up pulls in the summoning hall on an upright phone (393x852) and saves a contact sheet of frames for each:
//   node tools/scenes/summon-shots.mjs      (PORT; pictures go to docs/samples/summon-<name>.png)
// Needs `npm run web` first. The hall's `window.__hall.play(pulls)` is called directly; nothing is saved.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
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
const meta = { seed: 7, crowns: 2000, unlocked: HEROES, party: HEROES, pulls: 0, dry: 29, dryMythic: 89, castle: { treasury: 0, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 3, tower: 0, daily: {}, bosses: [], achievements: [], spellbook: undefined };
const P = (kind, rarity, isNew = true, shards = 0) => ({ kind, rarity, isNew, shards });
const COMMONS = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'];
const ten = (...hi) => [...hi, ...COMMONS.concat(COMMONS).slice(0, 10 - hi.length).map((k) => P(k, 1, false, 1))];
const SCENES = {
  epic: { pulls: [P('lightningMage', 3)], step: 380, n: 10 },
  legendary: { pulls: [P('warlock', 4)], step: 450, n: 12 },
  mythic: { pulls: [P('kitsune', 5)], step: 520, n: 12 },
  'mythic-dup': { pulls: [P('kitsune', 5, false, 3)], step: 340, n: 12 },
  tenpull: { pulls: ten(P('kitsune', 5), P('werewolf', 4)), step: 600, n: 18 },
};
const only = process.env.ONLY?.split(',');
mkdirSync('docs/samples', { recursive: true });
const vp = process.env.SIZE ? { width: Number(process.env.SIZE.split('x')[0]), height: Number(process.env.SIZE.split('x')[1]) } : { width: 393, height: 852 };
const suffix = (process.env.SIZE ? `-${process.env.SIZE}` : '') + (process.env.REDUCED ? '-reduced' : '');
for (const [name, sc] of Object.entries(SCENES)) {
  if (only && !only.includes(name)) continue;
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: true, reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('console error', m.text()));
  await page.addInitScript(([m]) => { try { localStorage.setItem('legends.meta', JSON.stringify(m)); localStorage.setItem('lotf-tips-off', '1'); } catch {} }, [meta]);
  await page.goto(`http://localhost:${srv.address().port}/`);
  await page.waitForTimeout(1200);
  await page.locator('.hmTab').nth(0).click();
  await page.waitForTimeout(1500);
  const wait = await page.evaluate((p) => { window.__t0 = performance.now(); window.__done = false; window.__hall.play(p).then(() => (window.__done = true)); return true; }, sc.pulls);
  const frames = [];
  for (let i = 0; i < sc.n; i++) {
    const want = 150 + i * sc.step;
    const now = await page.evaluate(() => performance.now() - window.__t0);
    if (want > now) await page.waitForTimeout(want - now);
    frames.push((await page.screenshot()).toString('base64'));
  }
  const total = await page.evaluate(() => performance.now() - window.__t0);
  console.log(name, 'frames', frames.length, 'elapsed', Math.round(total), 'done', await page.evaluate(() => window.__done));
  // the contact sheet: the frames in a grid, 6 to a row
  const sheet = await ctx.newPage();
  const cols = 6;
  const w = 230;
  const h = Math.round((w * vp.height) / vp.width);
  const rows = Math.ceil(frames.length / cols);
  await sheet.setViewportSize({ width: cols * w, height: rows * h });
  await sheet.setContent(`<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(${cols},${w}px)">${frames.map((f) => `<img src="data:image/png;base64,${f}" width="${w}" height="${h}">`).join('')}</body>`);
  writeFileSync(`docs/samples/summon-${name}${suffix}.png`, await sheet.screenshot());
  await ctx.close();
}
await browser.close();
srv.close();
