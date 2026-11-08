// The other eleven heroes that joined from the twenty (docs/notes/heroes-join-2.md): the collection with them in it, and a fight with three of them. After `npm run web`:
//   node tools/heroes-join-2/shots.mjs   docs/samples/heroes-join-2/*.png at 393x852 (and 360x780, 412x915)
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
mkdirSync('docs/samples/heroes-join-2', { recursive: true });
const src = readFileSync('src/sim/units.ts', 'utf8');
const ALL = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', ...src.match(/ALL_HEROES[^=]*= \[\.\.\.HEROES, ([^\]]*)\]/)[1].split(',').map((s) => s.trim().replace(/'/g, ''))];
const PARTY = ['seraph', 'bombardier', 'seaReaver', 'knight', 'wizard'];
const NEW = ['banneret', 'astralSphinx', 'mirageDancer', 'plagueDoctor', 'bombardier', 'astrologer', 'inquisitor', 'seraph', 'corsairSurgeon', 'harpooner', 'seaReaver'];
const xp = Math.round(30 * 19 * 20);
let errors = 0;
const fails = [];
const check = (name, ok, info = '') => { console.log(ok ? 'ok  ' : 'FAIL', name, info); if (!ok) fails.push(name); };

async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: false });
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


for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const tag = w === 393 ? '' : `-${w}`;
  {
    const { ctx, page } = await open(w, h);
    await page.evaluate(() => { const g = window.__game; g.home.open(); g.home.show('heroes'); });
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'All heroes' }).click().catch(() => {});
    await page.locator('.heroRoster .heroAnimeArt').first().waitFor({ timeout: 60000 });
    await page.locator('.heroRoster .heroAnimeArt').evaluateAll((images) => Promise.all(images.map((i) => i.decode().catch(() => {}))));
    const cards = await page.evaluate(() => [...document.querySelectorAll('.hcard')].map((c) => ({ kind: c.dataset.kind, over: [...c.querySelectorAll('.heroCardName')].some((b) => b.scrollWidth > b.clientWidth + 1) })));
    check(`collection holds all 65 (${w})`, cards.length === 65, String(cards.length));
    check(`the eleven are in it (${w})`, NEW.every((k) => cards.some((c) => c.kind === k)));
    check(`names fit (${w})`, cards.every((c) => !c.over), JSON.stringify(cards.filter((c) => c.over)));
    await page.evaluate(() => document.querySelector('.hcard[data-kind="banneret"]')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(600);
    await page.screenshot({ path: `docs/samples/heroes-join-2/collection${tag}.png` });
    await ctx.close();
  }
  {
    const { ctx, page } = await open(w, h);
    await page.evaluate((party) => {
      const g = window.__game;
      const r = JSON.parse(JSON.stringify(g.run));
      Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'undead' }, stage: 1, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
      document.getElementById('home').hidden = true;
      g.startRun(r);
      g.autoArrange(true);
    }, PARTY);
    await page.waitForTimeout(900);
    if (w === 393) await page.screenshot({ path: 'docs/samples/heroes-join-2/deploy.png' });
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(3500);
    const bar = await page.evaluate(() => [...document.querySelectorAll('.fhRow')].map((t) => {
      const n = t.querySelector('.fhName');
      const chips = [...t.querySelectorAll('.fhChip')].map((c) => c.scrollWidth > c.clientWidth + 1);
      return { name: n?.textContent, over: (!!n && n.scrollWidth > n.clientWidth + 1) || chips.some(Boolean) };
    }));
    check(`hero bar names fit (${w})`, bar.length === 5 && bar.every((b) => !b.over), JSON.stringify(bar));
    await page.screenshot({ path: `docs/samples/heroes-join-2/fight${tag}.png` });
    await ctx.close();
  }
}
check('no page errors', errors === 0, String(errors));
await browser.close();
srv.close();
if (fails.length) { console.log('FAILED:', fails.join('; ')); process.exitCode = 1; }
