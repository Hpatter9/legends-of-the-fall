// Heritage looks and hero names: screenshots and checks (docs/notes/heritage-looks.md). After `npm run web`:
//   node tools/heritage/shots.mjs      the home overlook's party, the company roster, a dossier, a fight with five re-toned heroes and its hero bar, at
//                                      393x852 (and the roster and fight at 360x780 and 412x915); docs/samples/heritage-*.png
// Fails on a page error, or a hero bar or roster name that does not fit its tile.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = 8711;
const root = 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync('docs/samples', { recursive: true });
const src = readFileSync('src/sim/units.ts', 'utf8');
const ALL = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', ...src.match(/ALL_HEROES[^=]*= \[\.\.\.HEROES, ([^\]]*)\]/)[1].split(',').map((s) => s.trim().replace(/'/g, ''))];
const PARTY = ['knight', 'cleric', 'wizard', 'timeWitch', 'buccaneer'];
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
  // --- the company roster: each card's own name, its class under it
  {
    const { ctx, page } = await open(w, h);
    // (the home page first: the party stands on the overlook in its battle sprites)
    await page.evaluate(() => { const g = window.__game; g.home.open(); g.home.show('battle'); });
    await page.waitForTimeout(1500);
    if (w === 393) await page.screenshot({ path: 'docs/samples/heritage-home.png' });
    await page.evaluate(() => window.__game.home.show('heroes'));
    await page.waitForTimeout(2000);
    await page.locator('.heroRoster .heroAnimeArt').evaluateAll((images) => Promise.all(images.map((i) => i.decode().catch(() => {}))));
    const cards = await page.evaluate(() => [...document.querySelectorAll('.hcard .heroCardName')].map((b) => ({ text: b.textContent, over: b.scrollWidth > b.clientWidth + 1 || [...b.children].some((c) => c.scrollWidth > c.clientWidth + 1) })));
    check(`roster names fit (${w})`, cards.length === 45 && cards.every((c) => !c.over), JSON.stringify(cards.filter((c) => c.over)));
    check(`roster shows the names (${w})`, cards[0]?.text === 'KwameKnight', cards[0]?.text);
    await page.screenshot({ path: `docs/samples/heritage-roster${tag}.png` });
    if (w === 393) {
      await page.locator('.hcard[data-kind="knight"]').click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: 'docs/samples/heritage-dossier.png' });
    }
    await ctx.close();
  }
  // --- a fight with five re-toned heroes: the board and the hero bar
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
    if (w === 393) await page.screenshot({ path: 'docs/samples/heritage-deploy.png' });
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(3500);
    const bar = await page.evaluate(() => [...document.querySelectorAll('#heroBar .hb')].map((t) => {
      const n = t.querySelector('.hbName');
      return { name: n?.textContent, title: t.title, shown: !!n && getComputedStyle(n).display !== 'none', over: !!n && n.scrollWidth > n.clientWidth + 1 };
    }));
    check(`hero bar names fit (${w})`, bar.length === 5 && bar.every((b) => !b.shown || !b.over), JSON.stringify(bar));
    check(`hero bar shows the names, the class in the tooltip (${w})`, bar.some((b) => b.name === 'Kwame' && b.title.startsWith('Kwame · Knight')), JSON.stringify(bar.map((b) => [b.name, b.title.slice(0, 20)])));
    await page.screenshot({ path: `docs/samples/heritage-fight${tag}.png` });
    await ctx.close();
  }
}
check('no page errors', errors === 0, String(errors));
await browser.close();
srv.close();
if (fails.length) { console.log('FAILED:', fails.join('; ')); process.exitCode = 1; }
