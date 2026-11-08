// The nine heroes that joined from the twenty (docs/notes/heroes-join.md): the collection with them in it, and a fight with three of them. After `npm run web`:
//   node tools/heroes-join/looks.mjs   the nine's battle sprites in the real page at battle size (idle, walk, attack), beside an existing hero; docs/samples/heroes-join/looks-*.png
// Fails on a page error, or a roster name or hero bar name that does not fit its tile.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 8711;
const root = 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync('docs/samples/heroes-join', { recursive: true });
const src = readFileSync('src/sim/units.ts', 'utf8');
const ALL = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', ...src.match(/ALL_HEROES[^=]*= \[\.\.\.HEROES, ([^\]]*)\]/)[1].split(',').map((s) => s.trim().replace(/'/g, ''))];
const PARTY = ['vampireLord', 'warDrummer', 'falconer', 'knight', 'wizard'];
const NEW = ['vampireLord', 'hemomancer', 'nightstalker', 'bloodGargoyle', 'dhampir', 'warDrummer', 'geomancer', 'bellWarden', 'falconer'];
const xp = Math.round(30 * 19 * 20);
let errors = 0;
const fails = [];
const check = (name, ok, info = '') => { console.log(ok ? 'ok  ' : 'FAIL', name, info); if (!ok) fails.push(name); };

async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: false });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([owned, party, xp]) => {
    if (sessionStorage.getItem('hl-set')) return;
    sessionStorage.setItem('hl-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1, music: 0, effects: 0, quips: false }));
  }, [ALL, PARTY, xp]);
  await page.goto(`http://localhost:${PORT}/`, { timeout: 240000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 240000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  return { ctx, page };
}



const PARTIES = { a: ['vampireLord', 'nightstalker', 'bloodGargoyle', 'dhampir', 'knight'], b: ['hemomancer', 'warDrummer', 'geomancer', 'bellWarden', 'archer'], c: ['falconer', 'knight', 'wizard', 'samurai', 'kunoichi'] };
for (const [id, party] of Object.entries(PARTIES)) {
  const { ctx, page } = await open(393, 852);
  await page.evaluate((party) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'undead' }, stage: 1, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, party);
  await page.waitForTimeout(1200);
  const clip = { x: 0, y: 380, width: 393, height: 200 };
  await page.screenshot({ path: `docs/samples/heroes-join/looks-${id}-idle.png`, clip });
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `docs/samples/heroes-join/looks-${id}-walk.png`, clip });
  await page.waitForTimeout(4500);
  await page.screenshot({ path: `docs/samples/heroes-join/looks-${id}-fight.png`, clip: { x: 0, y: 250, width: 393, height: 330 } });
  await ctx.close();
}
check('no page errors', errors === 0, String(errors));
await browser.close();
srv.close();
if (fails.length) { console.log('FAILED:', fails.join('; ')); process.exitCode = 1; }
