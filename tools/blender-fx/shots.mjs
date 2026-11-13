// BLENDER-FX screenshots (docs/notes/blender-fx.md): each king's spell cast in a real army fight on the page (the sim's own `castSpell`, on
// the fight's own fighters), the fight held still at the moment that shows it, and the board photographed. After `npm run web`:
//   node tools/blender-fx/shots.mjs <out dir>            every size      SIZES=393x852 ... one      ONLY=heal,frost ... some spells
//   STRIP=6 ... six pictures of each spell as it plays      REDUCED=1 ... with reduced motion asked for
//   GROUND=1 ... the ground loops (a patch of each element round a hero, and burning ground) instead of the spells
// `tools/blender-fx/shots_sheet.py` joins a size's pictures into one sheet.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = Number(process.env.PORT ?? 8846);
const OUT = process.argv[2] ?? 'out/blender-fx/shots';
// (ROOT=<folder>: another build's page, for a before and after)
const root = process.env.ROOT ?? 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync(OUT, { recursive: true });
const SIZES = (process.env.SIZES ?? '393x852,360x780,412x915').split(',').map((s) => s.split('x').map(Number));
const REDUCED = !!process.env.REDUCED;
const STRIP = Number(process.env.STRIP ?? 0);
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
const PARTY = ['knight', 'juggernaut', 'paladin', 'kunoichi', 'wizard'];
let errors = 0;

// Each spell: who it is aimed at (a hero or a foe in the thick of it), and how long after the cast its effect is at its fullest, in the
// fight's own ms (the fight's clock runs at about half the wall's at this speed): the picture is taken then.
const SPELLS = [
  ['heal', 'hero', 230], ['meteor', 'foe', 1010], ['haste', 'hero', 200], ['shield', 'hero', 240], ['smite', 'foe', 200], ['chain', 'foe', 140], ['poison', 'foe', 500],
  ['frost', 'foe', 220], ['rally', 'hero', 230], ['quake', 'foe', 280], ['resurrect', 'hero', 300], ['cleanse', 'hero', 230], ['blink', 'foe', 220], ['hex', 'foe', 250],
  ['lance', 'foe', 260], ['renewal', 'hero', 260], ['deepfreeze', 'foe', 300], ['warcry', 'hero', 220], ['bulwark', 'hero', 230], ['wolves', 'foe', 170], ['starfall', 'foe', 1250],
  ['firewall', 'foe', 500], ['icewall', 'foe', 500], ['shatter', 'foe', 180], ['gale', 'foe', 230], ['thunderclap', 'foe', 170], ['snare', 'foe', 260], ['charm', 'foe', 260],
  ['foresight', 'hero', 260], ['sunbeam', 'foe', 280], ['venom', 'foe', 240], ['mirage', 'hero', 230], ['drain', 'foe', 260], ['bonewall', 'foe', 500], ['raisedead', 'foe', 280],
];
const ONLY = process.env.ONLY?.split(',');

async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: false, reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([owned, xp]) => {
    if (sessionStorage.getItem('bfx-set')) return;
    sessionStorage.setItem('bfx-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party: owned, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])) }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, [PARTY, xpAt(30)]);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 400000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  return { ctx, page };
}

/** Into a wave of the Undead with the party, the fight begun and the lines met. */
async function fight(page, stage) {
  await page.evaluate(([party, stage]) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    // (one seed for every run of the tool, so two builds' photographs are of the same field)
    Object.assign(r, { seed: 7, mode: { kind: 'army', army: 'undead' }, stage, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, [PARTY, stage]);
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForFunction(() => {
    const b = window.__game.b;
    const u = b.units.filter((x) => x.alive);
    return b.t >= 9000 || u.filter((h) => h.side === 'hero' && u.some((f) => f.side === 'foe' && Math.abs(f.u - h.u) + Math.abs(f.v - h.v) <= 1)).length >= 2;
  }, null, { timeout: 120000, polling: 200 }).catch(() => {});
}

/** Cast `id` at a hero or a foe in the thick of the fight, the camera on the tile. Returns the tile, or null when it could not be cast. */
const cast = (page, id, aim, zoom) => page.evaluate(([id, aim, zoom]) => {
  const g = window.__game;
  const b = g.b;
  if (b.phase !== 'fight') return null;
  const live = b.units.filter((x) => x.alive && x.id !== 0);
  const near = (x, side) => live.filter((y) => y.side === side && Math.abs(y.u - x.u) <= 1 && Math.abs(y.v - x.v) <= 1).length;
  const pool = live.filter((x) => x.side === aim);
  // (the one with the most of its own side round it, then the most of the other: the thick of the fight)
  const at = pool.sort((x, y) => near(y, aim) + 0.5 * near(y, aim === 'hero' ? 'foe' : 'hero') - near(x, aim) - 0.5 * near(x, aim === 'hero' ? 'foe' : 'hero') || x.id - y.id)[0];
  if (!at) return null;
  let u = at.u, v = at.v;
  if (id === 'resurrect') {
    // (a hero must have fallen for it: the weakest one falls where it stands)
    const h = live.filter((x) => x.side === 'hero').sort((x, y) => x.hp - y.hp)[0];
    h.hp = 0; h.alive = false; u = h.u; v = h.v;
  }
  // (the spell is cast on the fallen hero's own tile, not on the one the camera first chose)
  const aim_ = id === 'resurrect' ? { u, v } : at;
  if (id === 'raisedead') { const f = pool[0]; f.hp = 0; f.alive = false; (b.fallen ??= []); }
  b.spells.mana = 10;
  b.spells.ready[id] = 0;
  // (a spell that needs open ground, a wall or a blink, is tried on the tiles round the aim until one takes it)
  const spots = id === 'blink' || id === 'wolves' || id.endsWith('wall') ? [[0, 1], [0, -1], [1, 0], [-1, 0], [0, 2], [0, -2], [1, 1], [-1, -1], [0, 0]] : [[0, 0]];
  let ok = false;
  for (const [du, dv] of spots) {
    ok = window.__castSpell(b, id, aim_.u + du, aim_.v + dv);
    if (ok) { u = aim_.u + du; v = aim_.v + dv; break; }
  }
  const s = g.sprites.get(at.id);
  g.manualCam = true;
  g.tx = g.cx = s.x + (u - at.u - (v - at.v)) * 32;
  g.ty = g.cy = s.y + (u - at.u + (v - at.v)) * 16 - 30;
  g.zoom = g.tzoom = zoom;
  return ok ? [u, v] : null;
}, [id, aim, zoom]);

async function runThenHold(page, ms) {
  const until = await page.evaluate((ms) => window.__game.b.t + ms, ms);
  await page.waitForFunction((until) => window.__game.b.t >= until || window.__game.b.phase !== 'fight', until, { timeout: 8000, polling: 'raf' }).catch(() => {});
  await page.evaluate(() => { window.__game.sceneHold = 1; });
  await page.waitForTimeout(250);
}

// GROUND=1: the ground loops instead of the spells. A 3x3 patch of each element is laid on open ground beside a placed hero before the
// fight begins (the renderer's own `alivePatch`, as an area's warning or a spell's tiles lay it), then burning ground (`zone`), and each
// is photographed.
const ELEMENTS = [['fire', 0xff5a2a], ['ice', 0x8ae8ff], ['lightning', 0xbfe6ff], ['light', 0xfff2a0], ['dark', 0xb06aff], ['forest', 0x7dff8a], ['poison', 0x8aff5a], ['earth', 0xb88a5a], ['wind', 0xdff8ff], ['blood', 0xf65563]];
if (process.env.GROUND) {
  const all = [...ELEMENTS, ['zone', 0]];
  // (three patches a fight: a fresh fight each time, so every patch is photographed in a fight's first seconds)
  for (const [w, h] of SIZES) for (let from = 0; from < all.length; from += 3) {
    const size = `${w}x${h}`;
    const { ctx, page } = await open(w, h);
    // (a first wave on the open ground of the Orcs' land, with the heroes placed and the fight not yet begun: open ground, nothing in the
    // way. Each patch is a 3x3 in the middle of the board with one hero's tile in it, so it shows on open ground and under a fighter.)
    await page.evaluate(([party]) => {
      const g = window.__game;
      const r = JSON.parse(JSON.stringify(g.run));
      Object.assign(r, { mode: { kind: 'army', army: 'orcs' }, stage: 1, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
      document.getElementById('home').hidden = true;
      g.startRun(r);
      g.autoArrange(true);
    }, [PARTY]);
    await page.waitForTimeout(1200);
    // (the fight is begun, since the effects only move while it runs; the patches are photographed in its first seconds, before the lines meet)
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(400);
    for (const [el, colour] of all.slice(from, from + 3)) {
      await page.evaluate(([el, colour, zoom]) => {
        const g = window.__game;
        const b = g.b;
        const heroes = b.units.filter((x) => x.alive && x.side === 'hero' && x.id !== 0);
        // (the hero nearest the far rows: the patch runs from its tile out over the open ground ahead of it)
        const at = window.__at ?? (window.__at = (() => { const h = heroes.sort((x, y) => x.v - y.v || x.id - y.id)[0]; return { id: h.id, u: h.u, v: h.v }; })());
        window.__patch?.destroy();
        window.__patch = undefined;
        const mid = { u: Math.max(1, Math.min(b.board.w - 2, at.u)), v: Math.max(1, at.v - 1) };
        if (el === 'zone') g.fx.zone(b, mid.u, mid.v, 60000);
        else {
          const tiles = [];
          for (let du = -1; du <= 1; du++) for (let dv = -1; dv <= 1; dv++) tiles.push({ u: mid.u + du, v: mid.v + dv });
          window.__patch = g.fx.alivePatch(b, tiles, colour, el);
        }
        // (the camera on the patch's middle tile, wherever the heroes have walked to)
        const [px, py] = g.fx.tilePos(b, mid.u, mid.v);
        g.manualCam = true;
        g.tx = g.cx = px;
        g.ty = g.cy = py - 45;
        g.zoom = g.tzoom = zoom;
      }, [el, colour, Number(process.env.ZOOM ?? 2)]);
      await page.waitForTimeout(450);
      await page.screenshot({ path: `${OUT}/ground-${el}-${size}${REDUCED ? '-still' : ''}.png` });
      console.log(size, 'ground', el);
    }
    await ctx.close();
  }
  await browser.close();
  console.log(errors ? `${errors} page errors` : 'no page errors');
  process.exit(errors ? 1 : 0);
}

for (const [w, h] of SIZES) {
  const size = `${w}x${h}`;
  const list = SPELLS.filter(([id]) => !ONLY || ONLY.includes(id));
  let page, ctx, cast_ = 0;
  for (const [id, aim, ms] of list) {
    // (a fresh fight every few spells, so there are always fighters of both sides to aim at)
    if (!page || cast_ % 4 === 0) {
      if (ctx) await ctx.close();
      ({ ctx, page } = await open(w, h));
      await fight(page, 2 + (cast_ / 4) % 3);
      await page.waitForTimeout(600);
    }
    cast_++;
    await page.evaluate(() => { window.__game.sceneHold = 0; });
    const at = await cast(page, id, aim, Number(process.env.ZOOM ?? 1.7));
    if (STRIP) {
      // (a strip: the fight let on a beat at a time and photographed at each, so the sheet shows the effect move)
      for (let i = 0; i < STRIP; i++) {
        await page.evaluate(() => { window.__game.sceneHold = 0; });
        await runThenHold(page, Math.round((ms * 2) / (STRIP + 1)));
        await page.screenshot({ path: `${OUT}/${id}-${size}-${i}.png` });
      }
      console.log(size, id, JSON.stringify(at));
      continue;
    }
    await runThenHold(page, ms);
    await page.screenshot({ path: `${OUT}/${id}-${size}${REDUCED ? '-still' : ''}.png` });
    console.log(size, id, JSON.stringify(at));
  }
  if (ctx) await ctx.close();
}
await browser.close();
console.log(errors ? `${errors} page errors` : 'no page errors');
process.exit(errors ? 1 : 0);
