// PAINTED-BUTTONS screenshots and checks (docs/notes/painted-buttons.md). After `npm run web`:
//   node tools/painted-buttons/shots.mjs <before|after> [scene ...]
// Scenes: camp, tavern, services, recruit, castle, spells, armies, achievements, settings, stall, deploy, fight. Each at 393x852, 360x780
// and 412x915 (`SIZES=393` for one). Writes docs/samples/painted-buttons/<prefix>-<scene>-<w>.png and, for each scene, checks that no
// page error was thrown, that nothing runs past the screen's right edge, and that every visible button is at least 44 px one way and
// 32 px the other (a list of any that are not). Exits 1 on a page error or overflow.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire(existsSync('/opt/node-tools/node_modules/') ? '/opt/node-tools/node_modules/' : import.meta.url)('playwright');
const PORT = Number(process.env.PORT ?? 8651);
const root = 'out/web';
const args = process.argv.slice(2);
const prefix = args.shift() ?? 'after';
const ALL_SCENES = ['camp', 'tavern', 'services', 'recruit', 'castle', 'spells', 'armies', 'achievements', 'settings', 'stall', 'deploy', 'fight'];
const want = args.length ? args : ALL_SCENES;
const SIZES = (process.env.SIZES ?? '393,360,412').split(',').map((w) => ({ 393: [393, 852], 360: [360, 780], 412: [412, 915] })[w]);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (decodeURIComponent(q.url.split('?')[0]).slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const dir = 'docs/samples/painted-buttons';
mkdirSync(dir, { recursive: true });
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
const PARTY = ['knight', 'cleric', 'wizard', 'archer', 'samurai'];
const ALL = [...PARTY, 'kunoichi', 'paladin', 'ranger'];
let errors = 0;
let overflow = 0;
const report = {};

async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', (e) => { errors++; page.errs.push(e.message); console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([owned, party, xp]) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('pb-set')) return;
    sessionStorage.setItem('pb-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, gold: 3400, stones: 25, unlocked: owned, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: ['first'], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, [ALL, PARTY, xpAt(32)]);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip, .hmDispatch { display: none !important; }' });
  return { ctx, page };
}

const tap = (page, sel, i = 0) => page.evaluate(([sel, i]) => document.querySelectorAll(sel)[i]?.dispatchEvent(new MouseEvent('click', { bubbles: true })), [sel, i]);
const tapText = (page, sel, text) => page.evaluate(([sel, text]) => [...document.querySelectorAll(sel)].find((b) => b.textContent.includes(text))?.click(), [sel, text]);

async function army(page, go) {
  await page.evaluate(() => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'beasts' }, stage: 3, over: false, cleared: false, gold: 40, event: undefined, roster: ['knight', 'cleric', 'wizard', 'archer', 'samurai'].map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  });
  await page.waitForTimeout(900);
  if (!go) return;
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForTimeout(3500);
  await page.evaluate(() => { const g = window.__game; g.sceneHold = 1; if (g.b?.spells) g.b.spells.mana = 7; g.hud?.refresh(g.b); });
  await page.waitForTimeout(400);
}

/** Overflow past the right edge, and visible buttons under 44 x 32 (the thumb rule). */
async function check(page) {
  return page.evaluate(() => {
    const W = innerWidth;
    const wide = document.documentElement.scrollWidth > W + 1;
    const small = [];
    for (const b of document.querySelectorAll('button, [role=button], [role=switch]')) {
      const r = b.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || getComputedStyle(b).visibility === 'hidden') continue;
      if (b.closest('[hidden]')) continue;
      if (Math.max(r.width, r.height) < 44 || Math.min(r.width, r.height) < 32) small.push(`${b.id || b.className || b.tagName}:${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return { wide, small: [...new Set(small)].slice(0, 40) };
  });
}

for (const [w, h] of SIZES) {
  for (const scene of want) {
    const { ctx, page } = await open(w, h);
    try {
      if (scene === 'tavern' || scene === 'services') {
        await tap(page, '.hmTab', 1);
        await page.waitForTimeout(900);
        if (scene === 'services') { await tap(page, '.ptSectionTab', 1); await page.waitForTimeout(300); }
      } else if (scene === 'recruit') { await tap(page, '.hmTab', 0); await page.waitForTimeout(900); }
      else if (scene === 'castle') { await tap(page, '.hmTab', 3); await page.waitForTimeout(900); }
      else if (scene === 'spells') { await tap(page, '.hmTab', 4); await page.waitForTimeout(900); }
      else if (scene === 'armies') { await tap(page, '#hmBattle'); await page.waitForTimeout(900); }
      else if (scene === 'achievements') { await tap(page, '#hmTrophy'); await page.waitForTimeout(900); }
      else if (scene === 'settings') { await tap(page, '#hmGear'); await page.waitForTimeout(900); }
      else if (scene === 'stall') {
        await tap(page, '.hmTab', 1);
        await page.waitForTimeout(700);
        await tap(page, '.ptSectionTab', 1);
        await tapText(page, '.ptButton', 'shop');
        await page.waitForTimeout(900);
      } else if (scene === 'deploy') await army(page, false);
      else if (scene === 'fight') await army(page, true);
      else await page.waitForTimeout(500);
      const path = `${dir}/${prefix}-${scene}-${w}.png`;
      await page.screenshot({ path });
      const c = await check(page);
      if (c.wide) overflow++;
      report[`${scene}-${w}`] = { ...c, errors: page.errs };
      console.log(scene, w, c.wide ? 'OVERFLOW' : 'fits', c.small.length ? `small: ${c.small.join(' ')}` : '');
    } catch (e) {
      errors++;
      console.log('FAILED', scene, w, e.message);
    }
    await ctx.close();
  }
}
writeFileSync(`${dir}/${prefix}-checks.json`, JSON.stringify(report, null, 1));
console.log(`page errors: ${errors}, overflow: ${overflow}`);
await browser.close();
srv.close();
process.exit(errors || overflow ? 1 : 0);
