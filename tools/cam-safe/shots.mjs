// CAM-SAFE debug shots (docs/notes/cam-safe.md): a boss wave with four spells and the War Horn, the parts of the page over the board
// outlined in red, the safe rect in green, the middle of the safe rect a green ring and the action's centre (where the follow camera puts
// its point) a yellow cross. The same rule is run in the page for the "before" build, so both show the room the fight should keep to.
//
//   npm run web && OUT=docs/samples/cam-safe TAG=after node tools/cam-safe/shots.mjs [--sizes 393x852,360x780,412x915] [--stage 5]
//
// Writes <OUT>/<TAG>-<w>.png and prints, for each, the action's centre against the safe rect.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PORT = Number(process.env.PORT ?? 8721);
const ROOT = process.env.ROOT ?? 'out/web';
const OUT = process.env.OUT ?? 'out/cam-safe';
const TAG = process.env.TAG ?? 'after';
const STAGE = Number(opt('--stage', '5'));
const WAIT = Number(opt('--wait', '6000'));
const SIZES = opt('--sizes', '393x852,360x780,412x915').split(',').map((s) => s.split('x').map(Number));
mkdirSync(OUT, { recursive: true });

const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css', jpg: 'image/jpeg' };
const srv = createServer((q, r) => {
  const p = `${ROOT}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const PARTY = ['knight', 'cleric', 'archer', 'wizard', 'samurai'];
const SPELLS = ['heal', 'meteor', 'haste', 'shield', 'chain', 'frost', 'rally', 'quake', 'smite', 'resurrect', 'poison', 'cleanse', 'blink', 'hex', 'lance', 'renewal'];
// (the rule of src/render/safeRectRules.ts, run in the page for either build)
const RULE = `(view, covers, margin = 8, minW = 160, minH = 140) => {
  const area = (r) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
  const over = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  let r = { ...view };
  for (const c of covers.filter((c) => c.x1 > c.x0 && c.y1 > c.y0).sort((a, b) => area(b) - area(a))) {
    if (!over(r, c)) continue;
    const cuts = [[{ ...r, y0: Math.max(r.y0, c.y1) }, 1.15], [{ ...r, y1: Math.min(r.y1, c.y0) }, 1.15], [{ ...r, x0: Math.max(r.x0, c.x1) }, 1], [{ ...r, x1: Math.min(r.x1, c.x0) }, 1]].filter(([k]) => k.x1 - k.x0 >= minW && k.y1 - k.y0 >= minH);
    if (cuts.length) r = cuts.reduce((b, k) => (area(k[0]) * k[1] > area(b[0]) * b[1] ? k : b))[0];
  }
  const m = Math.min(margin, (r.x1 - r.x0 - minW) / 2, (r.y1 - r.y0 - minH) / 2);
  return m > 0 ? { x0: r.x0 + m, y0: r.y0 + m, x1: r.x1 - m, y1: r.y1 - m } : r;
}`;
let errors = 0;

for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([party, spells]) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('cs-set')) return;
    sessionStorage.setItem('cs-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 0, unlocked: party, party, chapel: true, xp: Object.fromEntries(party.map((k) => [k, 99999])), spellbook: { owned: spells }, eidolons: { bound: ['gorm'], chosen: 'gorm' }, bestStage: 14, opened: ['undead', 'beasts', 'castle'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, [PARTY, SPELLS]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip, .toast { display: none !important; }' });
  await page.evaluate(async ([party, stage]) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'beasts' }, stage, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    await new Promise((res) => setTimeout(res, 600));
    g.autoArrange(true);
    await new Promise((res) => setTimeout(res, 400));
    document.getElementById('fight').click();
  }, [PARTY, STAGE]);
  await page.waitForTimeout(WAIT);
  const info = await page.evaluate((rule) => {
    const g = window.__game;
    g.app.ticker.stop();
    const safeRect = eval(rule);
    const sels = ['#top', '#twistBanner', '#hudSpells', '#bossBar', '#comboBar', '#synCol', '#tacticBtn', '#panel', '#duelBar', '#panel > .ehFight'];
    const covers = [];
    for (const sel of sels)
      for (const e of document.querySelectorAll(sel)) {
        if (e.hidden || e.closest('[hidden]')) continue;
        const b = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        if (b.width <= 0 || b.height <= 0 || cs.display === 'none' || cs.visibility === 'hidden') continue;
        covers.push({ sel, x0: b.left, y0: b.top, x1: b.right, y1: b.bottom });
      }
    const c = g.app.canvas.getBoundingClientRect();
    const safe = safeRect({ x0: c.left, y0: c.top, x1: c.right, y1: c.bottom }, covers);
    // (the action's centre: the point the follow camera holds, on the screen)
    const k = g.world.scale.x;
    const s = c.width / g.app.screen.width;
    const ax = c.left + (g.world.x + g.tx * k) * s;
    const ay = c.top + (g.world.y + g.ty * k) * s;
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none';
    const rect = (r, css) => { const d = document.createElement('div'); d.style.cssText = `position:fixed;left:${r.x0}px;top:${r.y0}px;width:${r.x1 - r.x0}px;height:${r.y1 - r.y0}px;box-sizing:border-box;${css}`; box.append(d); };
    for (const r of covers) rect(r, 'border:2px solid #ff3b3b;background:#ff3b3b22');
    rect(safe, 'border:3px dashed #3bff6a');
    const mx = (safe.x0 + safe.x1) / 2, my = (safe.y0 + safe.y1) / 2;
    rect({ x0: mx - 9, y0: my - 9, x1: mx + 9, y1: my + 9 }, 'border:3px solid #3bff6a;border-radius:50%');
    rect({ x0: ax - 14, y0: ay - 2, x1: ax + 14, y1: ay + 2 }, 'background:#ffe23b;box-shadow:0 0 0 1px #000');
    rect({ x0: ax - 2, y0: ay - 14, x1: ax + 2, y1: ay + 14 }, 'background:#ffe23b;box-shadow:0 0 0 1px #000');
    document.body.append(box);
    const orbs = document.querySelectorAll('#spellCards > *').length;
    const horn = !!document.querySelector('.ehFight:not([hidden])');
    const boss = !document.getElementById('bossBar').hidden;
        return { safe, ax, ay, mx, my, orbs, horn, boss, covers: covers.map((r) => r.sel), cam: { safe: g.safe, safeTo: g.safeTo, tx: g.tx, ty: g.ty, cx: g.cx, cy: g.cy, held: g.held, zoom: g.zoom, tzoom: g.tzoom, manual: g.manualCam } };
  }, RULE);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${TAG}-${w}.png` });
  const r = (n) => Math.round(n);
  console.log(`${TAG} ${w}x${h}: orbs ${info.orbs}, horn ${info.horn}, boss ${info.boss}; safe y ${r(info.safe.y0)}..${r(info.safe.y1)} x ${r(info.safe.x0)}..${r(info.safe.x1)}; action (${r(info.ax)}, ${r(info.ay)}) vs the safe middle (${r(info.mx)}, ${r(info.my)}): off by ${r(info.ax - info.mx)}, ${r(info.ay - info.my)}; covers ${info.covers.join(' ')}`);
  if (process.env.DEBUG) console.log(JSON.stringify(info.cam));
  await ctx.close();
}
console.log('page errors:', errors);
await browser.close();
srv.close();
