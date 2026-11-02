import { createRequire } from 'module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
// CLOSE-SCREENS: the owner's case (a run lost to its end, the recap, the summoning opened and shut, a chest from the cart) and a
// tour of the other screens, back home after each. Serve out/web on :8123 (python3 -m http.server 8123), then:
// node tools/close-screens/probe.mjs <width> <height> <tag> <out-dir>   (pixel ratio 3)
const [W, H, tag] = [+(process.argv[2] ?? 393), +(process.argv[3] ?? 852), process.argv[4] ?? 'x'];
const out = process.argv[5] ?? '.';
const url = 'http://127.0.0.1:8123';
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(`${url}/?seed=7`, { timeout: 180000 });
await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
await page.evaluate(() => {
  const g = window.__game;
  g.meta.armies.orcs = { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: { 0: 7, 1: 7, 2: 7, 3: 1, 4: 1 } };
  g.meta.opened = ['castle', 'calamity', 'tower'];
  g.meta.crowns = 1500; g.meta.scenes = ['opening'];
  localStorage.setItem('legends.meta', JSON.stringify(g.meta));
});
console.log('t0', Date.now()); await page.goto(`${url}/`, { timeout: 180000 });
await page.waitForFunction(() => window.__game && !document.getElementById('home').hidden, null, { timeout: 90000 });
await page.evaluate(() => document.getElementById('tipSkip')?.click());
await page.waitForTimeout(1500);
const skipFilms = async () => { for (let i = 0; i < 12; i++) { const n = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((b) => /^(Skip|Continue)$/.test(b.textContent.trim()) && b.closest('#cutscene')); if (b) b.click(); return window.__game.sceneHold; }); if (!n) return; await page.waitForTimeout(700); } };
const dismissCards = () => page.evaluate(() => { let n = 0; for (let i = 0; i < 6; i++) { const b = [...document.querySelectorAll('.rvCard button, .unlock button')].find((b) => /Continue/.test(b.textContent)); if (!b) break; b.click(); n++; } return n; });
const tap = async (sel) => { const b = await page.locator(sel).first().boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
// what full-screen screens are in the DOM and which are on view
const census = () => page.evaluate(() => {
  const ids = ['result', 'recap', 'home', 'party', 'gacha', 'settings', 'autoSum', 'events'];
  const vis = (e) => { if (!e || !e.isConnected) return false; const s = getComputedStyle(e); return !e.closest('[hidden]') && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0; };
  const r = {};
  for (const id of ids) { const e = document.getElementById(id); if (e) r[id] = { hidden: e.hidden, kids: e.querySelectorAll('*').length, drawn: vis(e) }; }
  r.bodyOverlays = [...document.body.children].filter((e) => !e.id && e.nodeName === 'DIV').map((e) => e.className.split(' ')[0] + (vis(e) ? '*' : ''));
  r.recapText = (document.getElementById('recap')?.textContent ?? '').slice(0, 40);
  r.resultText = (document.getElementById('result')?.textContent ?? '').slice(0, 60);
  return r;
});
// a run: into the orcs, then lose with no heart left
console.log('home', Date.now()); await page.evaluate(() => { const h = window.__game.home; h.go(() => h.hooks.onArmy('orcs', 0)); });
await page.waitForTimeout(900);
await page.waitForFunction(() => !document.getElementById('party').hidden, null, { timeout: 20000 });
await page.waitForTimeout(1500);
await page.evaluate(() => document.getElementById('ptGo').click());
await page.waitForFunction(() => document.getElementById('party').hidden && window.__game.b.phase === 'deploy', null, { timeout: 20000 });
await page.waitForTimeout(2500);
for (let i = 0; i < 2; i++) { await page.evaluate(() => document.getElementById('summon').click()); await page.waitForTimeout(300); }
await page.evaluate(() => window.__game.autoArrange(true));
await page.waitForTimeout(300);
await page.evaluate(() => document.getElementById('fight').click());
await page.waitForTimeout(600);
await page.evaluate(() => { window.__game.run.retries = 99; for (const u of window.__game.b.units) if (u.side === 'hero') u.hp = 0; });
console.log('state', await page.evaluate(() => JSON.stringify({ph: window.__game.b.phase, n: window.__game.b.units.filter(u=>u.side==='hero').length, home: document.getElementById('home').hidden, party: document.getElementById('party').hidden})));
await skipFilms(); await page.waitForTimeout(1000); await page.evaluate(() => { for (const u of window.__game.b.units) if (u.side === 'hero') u.hp = 0; }); console.log('dbg', await page.evaluate(() => JSON.stringify({ hold: window.__game.sceneHold, tip: document.getElementById('tip').hidden, top: [...document.body.children].filter((e) => getComputedStyle(e).display !== 'none' && !e.hidden).map((e) => e.id || e.className).join(',') })));
for (let i = 0; i < 30 && (await page.evaluate(() => document.getElementById('result').hidden)); i++) { await page.waitForTimeout(3000); console.log('wait', await page.evaluate(() => JSON.stringify({ ph: window.__game.b.phase, t: window.__game.b.t, ew: window.__game.endWait, alive: window.__game.b.units.filter((u) => u.side === 'hero' && u.alive).length }))); await page.evaluate(() => { for (const u of window.__game.b.units) if (u.side === 'hero') u.hp = 0; }); await skipFilms(); }
await page.waitForTimeout(2500);
await page.evaluate(() => document.getElementById('result').click());
await page.waitForTimeout(500);
await page.evaluate(() => document.getElementById('next').click());
await page.waitForFunction(() => !document.getElementById('recap').hidden, null, { timeout: 20000 });
await page.waitForTimeout(2500);
console.log('recap up', JSON.stringify(await census()));
await page.evaluate(() => document.querySelector('#recap .rcFoot button').click());
await page.waitForTimeout(2500);
console.log('cards dismissed', await dismissCards());
await page.waitForTimeout(1500);
console.log('cards dismissed', await dismissCards());
// (the summoning opened and shut from home: its close refreshes the game, as many things do)
await page.evaluate(() => { const g = window.__game; g.gacha.open(); });
await page.waitForTimeout(800);
await page.evaluate(() => window.__game.gacha.close());
await page.waitForTimeout(800);
console.log('cards dismissed', await dismissCards());
console.log('after recap', JSON.stringify(await census()));
// a chest on the cart, then a tap on it
await page.evaluate(() => { const g = window.__game; g.meta.stash.push({ army: 'orcs', at: 3, tier: 0 }); g.home.show('battle'); });
await page.waitForTimeout(800);
await page.evaluate(() => document.querySelector('.csChest')?.click());
await page.waitForTimeout(3800);
console.log('chest up', JSON.stringify(await census()));
await page.screenshot({ path: `${out}/chest-${tag}-${W}.png` });
const layers = async () => { const c = await ctx.newCDPSession(page); await c.send('LayerTree.enable'); let n = 0; const p = new Promise((res) => c.once('LayerTree.layerTreeDidChange', (e) => res(e.layers ?? []))); await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); const ls = await Promise.race([p, new Promise((r) => setTimeout(() => r([]), 3000))]); await c.detach(); return ls.filter((l) => l.drawsContent).length; };
console.log('layers under chest', await layers());

// Collect, then a tour of the other screens, back home after each: the layers and the page's elements must not grow
await page.evaluate(() => document.querySelector('.chestShow .chestGo')?.click());
await page.waitForTimeout(800);
console.log('after collect', JSON.stringify(await census()), 'screens', await page.evaluate(() => window.__screens?.() ?? 'n/a'));
const nodes = () => page.evaluate(() => document.body.querySelectorAll('*').length);
const back = async () => { await page.evaluate(() => window.__game.home.open()); await page.waitForTimeout(900); };
const steps = [
  ['open all', async () => { await page.evaluate(() => { const g = window.__game; g.meta.stash.push({ army: 'orcs', at: 1, tier: 0 }, { army: 'orcs', at: 2, tier: 0 }); g.home.show('battle'); }); await page.waitForTimeout(600); await page.evaluate(() => document.querySelector('.csAll')?.click()); await page.waitForTimeout(2000); await page.evaluate(() => document.querySelector('.chestShow .chestGo')?.click()); }],
  ['stall', async () => { await page.evaluate(() => document.getElementById('hmStall')?.click()); await page.waitForTimeout(1500); await page.evaluate(() => document.querySelector('.hsBack')?.click()); }],
  ['codex', async () => { await page.evaluate(() => window.__game.home.openCodex()); await page.waitForTimeout(1500); }],
  ['settings', async () => { await page.evaluate(() => document.getElementById('hmGear').click()); await page.waitForTimeout(800); await page.evaluate(() => document.getElementById('settingsClose').click()); }],
  ['hero sheet', async () => { await page.evaluate(() => { const h = window.__game.home; h.openSheet(h.meta.unlocked[0]); }); await page.waitForTimeout(1500); await page.evaluate(() => window.__game.home.closeSheet()); }],
  ['armies', async () => { await page.evaluate(() => window.__game.home.openArmies()); await page.waitForTimeout(1500); }],
];
await back();
console.log('home', 'layers', await layers(), 'nodes', await nodes());
for (let round = 0; round < 2; round++)
  for (const [name, go] of steps) {
    await go();
    await back();
    console.log(`r${round} ${name}`, 'layers', await layers(), 'nodes', await nodes(), 'hidden-kept', await page.evaluate(() => ['hmSheetBox', 'hmSubBody', 'settingsBody', 'ptSheetBox', 'recap', 'summary', 'fightStats'].map((id) => `${id}:${document.getElementById(id)?.childElementCount ?? '-'}`).join(' ')), 'screens', await page.evaluate(() => window.__screens?.() ?? 'n/a'));
  }
console.log('errors', errs.length, errs.slice(0, 3));
await browser.close();
