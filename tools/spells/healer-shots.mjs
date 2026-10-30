// RPG-SPELLS batch 2 screenshots (docs/notes/spells-b2.md): a healer's revive and the Cleric's Spirit Guardians, staged in a real army
// fight (a hero is felled where it stands, and the Cleric's pool or meter is filled), then held still at the moment that shows it.
// (Batch 1's tool, `shots.mjs`, staged the toolkit's moves the same way.)
// Was: RPG-SPELLS batch 1 screenshots: the movement toolkit's placeholder looks, each staged in a real army
// fight on the page by calling the toolkit's sim functions (`window.__toolkit`) on the fight's own fighters and handing the events to
// the page's effects, then holding the fight still at the moment that shows it: a launch mid-air, walls of every kind, an aura, a
// burrow's mound, a teleport slash. After `npm run web`:
//   node tools/spells/shots.mjs              every size         SIZES=393x852 node tools/spells/shots.mjs    one
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = Number(process.env.PORT ?? 8850);
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
const SIZES = (process.env.SIZES ?? '393x852,360x780,412x915').split(',').map((s) => s.split('x').map(Number));
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
let errors = 0;
const PARTY = ['knight', 'cleric', 'priestess', 'archer', 'wizard'];

async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: false });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([owned, xp]) => {
    if (sessionStorage.getItem('hl-set')) return;
    sessionStorage.setItem('hl-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party: owned, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, [PARTY, xpAt(30)]);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 400000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  // (into the Undead's second wave with the party, and the fight begun)
  await page.evaluate((party) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { mode: { kind: 'army', army: 'undead' }, stage: 2, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, PARTY);
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForFunction(() => {
    const b = window.__game.b;
    const u = b.units.filter((x) => x.alive);
    return b.t >= 9000 || u.filter((h) => h.side === 'hero' && u.some((f) => f.side === 'foe' && Math.abs(f.u - h.u) + Math.abs(f.v - h.v) <= 1)).length >= 2;
  }, null, { timeout: 120000, polling: 200 }).catch(() => {});
  return { ctx, page };
}

/** Run `stage` (a function body given the game `g`, the toolkit `tk` and an `out` events array) on the page, and show its events. */
const stage = (page, body, arg) => page.evaluate(([body, arg]) => {
  const g = window.__game;
  const tk = window.__toolkit;
  const out = [];
  const r = new Function('g', 'tk', 'out', 'arg', body)(g, tk, out, arg);
  g.fx.show(g.b, out);
  return r;
}, [body, arg]);
/** Let the fight run `ms` of its own time, then hold it still. */
async function runThenHold(page, ms) {
  const until = await page.evaluate((ms) => window.__game.b.t + ms, ms);
  await page.waitForFunction((until) => window.__game.b.t >= until || window.__game.b.phase !== 'fight', until, { timeout: 8000, polling: 'raf' }).catch(() => {});
  await page.evaluate(() => { window.__game.sceneHold = 1; });
  await page.waitForTimeout(300);
}
/** The camera close on a tile. */
const closeOn = (page, u, v, zoom = 2) => page.evaluate(([u, v, zoom]) => {
  const g = window.__game;
  const any = g.b.units.find((x) => x.alive);
  const s = g.sprites.get(any.id);
  // (the tile's place, from a fighter's sprite and its tile: the iso grid is 64x32 a tile)
  const x = s.x + (u - any.u - (v - any.v)) * 32;
  const y = s.y + (u - any.u + (v - any.v)) * 16;
  g.manualCam = true;
  g.tx = g.cx = x;
  g.ty = g.cy = y - 20;
  g.zoom = g.tzoom = zoom;
}, [u, v, zoom]);
/** Put the camera on a hero's sprite (a little ahead of it, `dy` px up the screen, towards the foes) and let it settle, before staging. */
async function lookAt(page, def, zoom, dy) {
  await page.evaluate(([def, zoom, dy]) => {
    const g = window.__game;
    const me = g.b.units.find((x) => x.alive && x.def === def) ?? g.b.units.find((x) => x.alive && x.side === 'hero');
    const s = g.sprites.get(me.id);
    g.manualCam = true;
    g.tx = g.cx = s.x;
    g.ty = g.cy = s.y + dy;
    g.zoom = g.tzoom = zoom;
  }, [def, zoom, dy]);
  await page.waitForTimeout(1500);
}
const hero = 'const me = g.b.units.find((x) => x.alive && x.side === "hero" && x.def === arg.def) ?? g.b.units.find((x) => x.alive && x.side === "hero");';
const nearFoe = 'const foes = g.b.units.filter((x) => x.alive && x.side === "foe" && !x.under).sort((x, y) => Math.abs(x.u - me.u) + Math.abs(x.v - me.v) - Math.abs(y.u - me.u) - Math.abs(y.v - me.v) || x.id - y.id);';

for (const [w, h] of SIZES) {
  const size = `${w}x${h}`;
  // 1. A revive: the knight falls; the Cleric (her pool full) raises him. Held as he gets up in his column of light.
  {
    const { ctx, page } = await open(w, h);
    await lookAt(page, 'cleric', 2.2, -30);
    await page.evaluate(() => {
      const g = window.__game;
      const k = g.b.units.find((x) => x.alive && x.def === 'knight');
      k.hp = 0; k.alive = false; k.diedAt = g.b.t; k.step = k.swing = k.cast = undefined;
      for (const h of g.b.units) if (h.side === 'hero' && h.def !== 'cleric') h.charge = 0;
      const c = g.b.units.find((x) => x.def === 'cleric');
      c.charge = 100; c.busyUntil = g.b.t;
    });
    await page.waitForFunction(() => window.__game.b.units.find((x) => x.def === 'knight')?.alive, null, { timeout: 15000, polling: 'raf' }).catch(() => {});
    await runThenHold(page, 350);
    await page.screenshot({ path: `docs/samples/spells-b2-revive-${size}.png` });
    console.log(size, 'revive', await page.evaluate(() => { const k = window.__game.b.units.find((x) => x.def === 'knight'); return `${k.alive} ${k.hp}/${k.maxHp} risen=${JSON.stringify(window.__game.b.risen)}`; }));
    await ctx.close();
  }
  // 2. Spirit Guardians: the Cleric's meter filled; held a moment after the spirits rise.
  {
    const { ctx, page } = await open(w, h);
    await lookAt(page, 'cleric', 2.2, -30);
    await page.evaluate(() => { const g = window.__game; g.b.autoUlt = true; const c = g.b.units.find((x) => x.def === 'cleric'); c.charge2 = 100; c.busyUntil = g.b.t; });
    await page.waitForFunction(() => window.__game.b.auras?.some((a) => a.what === 'Spirit Guardians'), null, { timeout: 15000, polling: 'raf' }).catch(() => {});
    await runThenHold(page, 1200);
    await page.screenshot({ path: `docs/samples/spells-b2-guardians-${size}.png` });
    console.log(size, 'guardians', await page.evaluate(() => JSON.stringify(window.__game.b.auras?.map((a) => a.what))));
    await ctx.close();
  }
}
console.log('page errors:', errors);
await browser.close();
srv.close();
process.exit(errors ? 1 : 0);
