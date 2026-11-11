// BLENDER-FX screenshots (docs/notes/blender-fx.md): each king's spell cast in a real army fight on the page (the sim's own `castSpell`, on
// the fight's own fighters), the fight held still at the moment that shows it, and the board photographed. After `npm run web`:
//   node tools/blender-fx/shots.mjs <out dir>            every size      SIZES=393x852 ... one      ONLY=heal,frost ... some spells
//   STRIP=6 ... six pictures of each spell as it plays      REDUCED=1 ... with reduced motion asked for
// `tools/blender-fx/shots_sheet.py` joins a size's pictures into one sheet.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = Number(process.env.PORT ?? 8846);
const OUT = process.argv[2] ?? 'out/blender-fx/shots';
const root = 'out/web';
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
    Object.assign(r, { mode: { kind: 'army', army: 'undead' }, stage, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
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
  if (id === 'raisedead') { const f = pool[0]; f.hp = 0; f.alive = false; (b.fallen ??= []); }
  b.spells.mana = 10;
  b.spells.ready[id] = 0;
  // (a spell that needs open ground, a wall or a blink, is tried on the tiles round the aim until one takes it)
  const spots = id === 'blink' || id === 'wolves' || id.endsWith('wall') ? [[0, 1], [0, -1], [1, 0], [-1, 0], [0, 2], [0, -2], [1, 1], [-1, -1], [0, 0]] : [[0, 0]];
  let ok = false;
  for (const [du, dv] of spots) {
    ok = window.__castSpell(b, id, at.u + du, at.v + dv);
    if (ok) { u = at.u + du; v = at.v + dv; break; }
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
