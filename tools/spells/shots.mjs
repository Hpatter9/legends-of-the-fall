// RPG-SPELLS batch 1 screenshots (docs/notes/spells-b01.md): the movement toolkit's placeholder looks, each staged in a real army
// fight on the page by calling the toolkit's sim functions (`window.__toolkit`) on the fight's own fighters and handing the events to
// the page's effects, then holding the fight still at the moment that shows it: a launch mid-air, walls of every kind, an aura, a
// burrow's mound, a teleport slash. After `npm run web`:
//   node tools/spells/shots.mjs              every size         SIZES=393x852 node tools/spells/shots.mjs    one
// PREFIX names the pictures (docs/samples/<PREFIX>-<move>-<size>.png; spells-b01 by default; the painted effects' pass used
// PREFIX=spell-art, docs/notes/spell-art.md).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = Number(process.env.PORT ?? 8840);
const PREFIX = process.env.PREFIX ?? 'spells-b01';
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
const PARTY = ['knight', 'juggernaut', 'paladin', 'kunoichi', 'wizard'];

async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: false });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([owned, xp]) => {
    if (sessionStorage.getItem('tk-set')) return;
    sessionStorage.setItem('tk-set', '1');
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

const ONLY = process.env.ONLY?.split(',');
const want = (k) => !ONLY || ONLY.includes(k);
for (const [w, h] of SIZES) {
  const size = `${w}x${h}`;
  // 1. A launch, caught mid-air.
  if (want('launch')) {
    const { ctx, page } = await open(w, h);
    await lookAt(page, 'juggernaut', 2.2, -50);
    const at = await stage(page, `${hero} ${nearFoe} const f = foes[0]; if (!f) return null; const p = tk.launch(g.b, me, f, 3, out); if (!p) return null; const s = g.sprites.get(f.id); g.tx = g.cx = s.x; g.ty = g.cy = s.y - 40; return [p.land.u, p.land.v, f.u, f.v, p.from.u, p.from.v];`, { def: 'juggernaut' });
    await runThenHold(page, 260);
    await page.screenshot({ path: `docs/samples/${PREFIX}-launch-${size}.png` });
    console.log(size, 'launch', JSON.stringify(at));
    await ctx.close();
  }
  if (size !== '393x852' && !process.env.ALL) continue;
  // 2. Walls of every kind in a row before the heroes.
  if (want('walls')) {
    const { ctx, page } = await open(w, h);
    await lookAt(page, 'juggernaut', 2.4, -40);
    const row = await stage(page, `${hero} ${nearFoe} const kinds = ['stone', 'ice', 'thorns', 'light', 'fire', 'wind']; const laid = []; let v = me.v - 1; let u = 0; for (const k of kinds) { for (let tries = 0; tries < 40; tries++, u++) { if (u >= g.b.board.w) { u = 0; v--; } if (tk.raiseWall(g.b, me, [{ u, v }], k, 20000, out).length) { laid.push(k + '@' + u + ',' + v); u++; break; } } } return { v, laid };`, { def: 'juggernaut' });
    await runThenHold(page, 400);
    await page.screenshot({ path: `docs/samples/${PREFIX}-walls-${size}.png` });
    console.log(size, 'walls', JSON.stringify(row));
    await ctx.close();
  }
  // 3. An aura round a hero (Spirit Guardians, reach 2), and one on a tile (a font).
  if (want('aura')) {
    const { ctx, page } = await open(w, h);
    await lookAt(page, 'paladin', 2.2, -10);
    const at = await stage(page, `${hero} tk.raiseAura(g.b, me, { what: 'Spirit Guardians', reach: 2, ms: 20000, every: 500, ally: { heal: 0.01 }, foe: { dmg: 0.2, slow: 600 } }, out); return [me.u, me.v];`, { def: 'paladin' });
    await runThenHold(page, 700);
    await page.screenshot({ path: `docs/samples/${PREFIX}-aura-${size}.png` });
    console.log(size, 'aura', JSON.stringify(at));
    await ctx.close();
  }
  // 4. A burrow: the mound halfway along its tunnel.
  if (want('burrow')) {
    const { ctx, page } = await open(w, h);
    await lookAt(page, 'juggernaut', 3, -20);
    const at = await stage(page, `${hero} const ok = tk.burrow(g.b, me, { reach: 8, mult: 1.6, launch: 2, splash: 0.6 }, out); return ok ? [me.u, me.v, me.under.until - g.b.t] : null;`, { def: 'juggernaut' });
    await runThenHold(page, at ? Math.round(at[2] * 0.5) : 300);

    await page.screenshot({ path: `docs/samples/${PREFIX}-burrow-${size}.png` });
    console.log(size, 'burrow', JSON.stringify(at));
    await ctx.close();
  }
  // 5. A teleport slash through three foes.
  if (want('slash')) {
    const { ctx, page } = await open(w, h);
    await lookAt(page, 'kunoichi', 1.7, -60);
    const at = await stage(page, `${hero} const hit = tk.teleportSlash(g.b, me, { k: 3, reach: 6, mult: 1.4, order: (x, y) => x.hp - y.hp }, out); return [me.u, me.v, hit.length];`, { def: 'kunoichi' });
    await runThenHold(page, 150);
    await page.screenshot({ path: `docs/samples/${PREFIX}-slash-${size}.png` });
    console.log(size, 'slash', JSON.stringify(at));
    await ctx.close();
  }
}
console.log('page errors:', errors);
await browser.close();
srv.close();
process.exit(errors ? 1 : 0);
