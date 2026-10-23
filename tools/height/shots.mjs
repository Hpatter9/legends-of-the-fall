// Screenshots for the height pass: new boards, a shooter perched high, the high-ground tag on a hit, and the hero sheet with Jump,
// at the upright phone sizes:
//   node tools/height/shots.mjs <web dir>
// Writes docs/samples/height-<scene>-<w>x<h>.png (needs Playwright, as the other shot scripts).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [root = 'out/web'] = process.argv.slice(2);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8133);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let errors = 0;
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  const shot = (name) => page.screenshot({ path: `docs/samples/height-${name}-${w}x${h}.png` });
  await page.goto('http://localhost:8133/?x=' + Math.random());
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:8133/');
  await page.waitForTimeout(2200);
  // a new save: the second starter pack (it has the Archer), then the tips skipped
  await page.waitForSelector('.stPack', { timeout: 30000 });
  await page.click('.stPack:nth-child(2)');
  await page.click('.stGo');
  // (the opening cutscene: skipped)
  await page.getByText('Skip', { exact: true }).click({ timeout: 15000 }).catch(() => {});
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  // a board per area: a run on a stage of that area, the squad set out by the Auto button
  const areas = ['highlands', 'forest', 'snow', 'desert', 'volcano', 'dungeon'];
  for (let i = 0; i < 3; i++) {
    await page.evaluate((stage) => {
      const g = window.__game;
      const r = JSON.parse(JSON.stringify(g.run));
      Object.assign(r, { mode: { kind: 'run' }, stage, over: false, cleared: false, gold: 500, event: undefined });
      document.getElementById('home').hidden = true;
      g.startRun(r);
      for (let k = 0; k < 4; k++) document.getElementById('summon').click();
      document.getElementById('auto').click();
    }, 1 + i * 6);
    await page.waitForTimeout(700);
    await shot(`board-${i + 1}`);
  }
  // a shooter perched high: the first stage with a deploy tile three or more levels up, the Archer set on it by hand and the rest by Auto
  const perch = await page.evaluate(() => {
    const g = window.__game;
    for (let stage = 1; stage <= 80; stage++) {
      const r = JSON.parse(JSON.stringify(g.run));
      Object.assign(r, { mode: { kind: 'run' }, stage, over: false, cleared: false, gold: 500, event: undefined });
      document.getElementById('home').hidden = true;
      g.startRun(r);
      const b = g.b;
      const spot = [];
      for (let v = b.board.d - 3; v < b.board.d; v++) for (let u = 0; u < b.board.w; u++) { const t = b.board.tiles[v * b.board.w + u]; if (t.h >= 3 && !t.rock && !t.ground) spot.push([u, v]); }
      if (!spot.length) continue;
      for (let k = 0; k < 4; k++) document.getElementById('summon').click();
      document.getElementById('auto').click();
      // (the starter pack is random: an Archer is lent to the squad)
      const archer = { ...g.run.roster[0], id: 99, kind: 'archer' };
      g.run.roster.push(archer);
      g.run.squad = [...g.run.squad.slice(0, 4), 99];
      g.b = g.b;
      g.put(String(archer.id), spot[0]);
      return [stage, spot[0], archer.kind];
    }
    return 0;
  });
  console.log('perch', JSON.stringify(perch));
  await page.waitForTimeout(700);
  await shot('perch');
  // a fight in progress, played on until a blow from high ground has landed (its number carries the green arrow)
  await page.evaluate(() => {
    const fx = window.__game.fx;
    const show = fx.show.bind(fx);
    fx.show = (b, events) => {
      if (events.some((e) => e.kind === 'hit' && e.high)) window.__high = performance.now();
      return show(b, events);
    };
    document.getElementById('fight')?.click();
  });
  let tagged = false;
  for (let i = 0; i < 300; i++) {
    await page.waitForTimeout(100);
    const [phase, at] = await page.evaluate(() => [window.__game.b.phase, window.__high ? performance.now() - window.__high : -1]);
    if (!tagged && at >= 0 && at < 250) {
      await shot('tag');
      tagged = true;
    }
    if (phase !== 'fight') break;
  }
  console.log('high-ground tag captured:', tagged);
  await shot('fight');
  // the hero sheet, with Jump beside Range and Walk
  await page.evaluate(() => { window.__game.home.open(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const m = window.__game.meta;
    if (!m.unlocked.includes('kunoichi')) m.unlocked.push('kunoichi');
    window.__game.home.openSheet('kunoichi');
  });
  await page.waitForTimeout(600);
  await shot('sheet');
  await ctx.close();
}
console.log('page errors:', errors);
await browser.close();
srv.close();
