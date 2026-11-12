// ULT-CAMERA screenshots (docs/notes/ult-camera.md): the camera through a show, on a clock of our own (the Pixi ticker stopped, the page's
// frame and the CSS animations stepped by hand). For each pick: the caster's frame, the travel, the strike's frame, the hold and the
// return, with the camera's own numbers logged and a check that everything the strike bursts on is inside the safe rectangle.
//
//   npm run web && PORT=8695 OUT=out/ult-camera node tools/ult-camera/shots.mjs [--size 393x852] [--picks samurai,wizard,beastmaster,wanderer] [--early wizard] [--eidolons askel] [--spell]
//
// Writes <OUT>/<pick>-<W>-<n>-<beat>.png; `tools/ult-epic/stage-strips.py` joins them.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire(existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/' : import.meta.url)('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PORT = Number(process.env.PORT ?? 8695);
const OUT = process.env.OUT ?? 'out/ult-camera';
const [W, H] = opt('--size', '393x852').split('x').map(Number);
const PICKS = opt('--picks', 'samurai,wizard,beastmaster,wanderer').split(',').filter(Boolean);
const EIDOLONS = opt('--eidolons', 'askel').split(',').filter(Boolean);
const SPELL = args.includes('--spell');
/** The picks fired as the fight begins (`--early wizard,samurai`), the foes still across the field. */
const EARLY = opt('--early', '').split(',').filter(Boolean);
const REDUCED = args.includes('--reduced');
const FIRST = args.includes('--first');
mkdirSync(OUT, { recursive: true });

const root = 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
// (the machine's own Chromium when Playwright finds one; else the pinned build the other capture tools use)
const PINNED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ ...(existsSync(PINNED) ? { executablePath: PINNED } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
const ALL = ['knight', 'cleric', 'wizard', 'archer', 'samurai', 'lightningMage', 'paladin', 'kraken', 'kunoichi', 'minotaur', 'beastmaster', 'barbarian', 'druid', 'ranger', 'wanderer', 'lancer'];
const PARTY_OF = (pick) => [pick, ...['knight', 'cleric', 'archer', 'wizard', 'samurai'].filter((k) => k !== pick)].slice(0, 5);
let errors = 0;

async function open(eidolons) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([owned, xp, eid, first]) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('us-set')) return;
    sessionStorage.setItem('us-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party: owned.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'], ...(first ? {} : { ultSeen: Object.fromEntries(owned.map((k) => [k, 1])) }), ...(eid ? { eidolons: eid } : {}) }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 2, quips: false }));
  }, [ALL, xpAt(32), eidolons ?? null, FIRST]);
  await page.goto(`http://localhost:${PORT}/`, { timeout: 240000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 240000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  await page.evaluate(() => {
    const g = window.__game;
    const seen = new Map();
    window.__step = (ms) => {
      for (let t = 0; t < ms; t += 16) {
        g.frame(16, 16);
        for (const a of document.getAnimations()) {
          const at = (seen.get(a) ?? 0) + 16;
          seen.set(a, at);
          if (a.playbackRate !== 0) a.playbackRate = 0;
          a.currentTime = at;
        }
      }
      g.app.render();
    };
  });
  return { ctx, page };
}

async function army(page, party, army = 'beasts', stage = 3, early = false) {
  await page.evaluate(([party, army, stage]) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army }, stage, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
    g.setSpeed(2);
  }, [party, army, stage]);
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById('fight').click());
  // (`early`: as the fight begins, the two sides still far apart, so the camera has somewhere to travel)
  if (early) return page.waitForTimeout(350);
  await page.waitForFunction(() => {
    const u = window.__game.b.units.filter((x) => x.alive);
    return u.some((h) => h.side === 'hero' && u.some((f) => f.side === 'foe' && Math.max(Math.abs(f.u - h.u), Math.abs(f.v - h.v)) <= 2));
  }, null, { timeout: 25000, polling: 200 }).catch(() => {});
  await page.waitForTimeout(600);
}


/** The camera now, and whether everything the strike bursts on (each spot and the strike sheet's box on it) is inside the safe rectangle. */
const camNow = (page) => page.evaluate(() => {
  const g = window.__game;
  const q = g.ultm.queue;
  const m = q.current;
  const f = g.ultm.focus;
  const out = { cx: Math.round(g.cx), cy: Math.round(g.cy), zoom: +g.zoom.toFixed(2), focus: f ? ('view' in f ? 'frame' : 'caster') : 'follow' };
  if (m) {
    const plan = g.ultm.cams.get(m)?.plan;
    if (plan) Object.assign(out, { both: plan.both, frames: plan.views.length });
  }
  return out;
});
/** Whether the caster, and each one the show struck or helped, is inside the safe rectangle on the page now. */
const inSafe = (page) => page.evaluate(() => {
  const g = window.__game;
  const m = g.ultm.queue.current;
  if (!m) return null;
  const c = g.app.canvas;
  const k = c.offsetWidth / g.app.screen.width;
  const safe = { x0: g.safe.x * k, y0: g.safe.y * k, x1: (g.safe.x + g.safe.w) * k, y1: (g.safe.y + g.safe.h) * k };
  const inside = (id) => {
    const s = g.sprites.get(id);
    if (!s) return true;
    const p = g.toClient(s.x, s.y - s.tall * 0.5);
    return p.x >= safe.x0 - 2 && p.x <= safe.x1 + 2 && p.y >= safe.y0 - 2 && p.y <= safe.y1 + 2;
  };
  const t = m.landing ?? m.targets ?? { struck: [], helped: [] };
  const ids = [...new Set([...(m.targets?.struck ?? []), ...(m.targets?.helped ?? []), ...t.struck])];
  return { caster: inside(m.unit), touched: `${ids.filter(inside).length}/${ids.length}` };
});

for (const pick of PICKS) {
  const { ctx, page } = await open();
  try {
    await army(page, PARTY_OF(pick), 'beasts', 3, EARLY.includes(pick));
    const st = await page.evaluate((pick) => {
      const g = window.__game;
      g.app.ticker.stop();
      const hs = g.b.units.filter((u) => u.side === 'hero' && u.owner === undefined);
      for (const u of hs) u.charge2 = 0;
      const u = hs.find((h) => h.def === pick);
      u.charge2 = 100;
      // (tapped again every so often until it fires: a tap during the fight's opening is not taken)
      for (let i = 0; i < 400 && !g.ultm.queue.current; i++) {
        if (i % 12 === 0) {
          u.charge2 = 100;
          document.querySelector(`.fhRow[data-unit="${u.id}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
        window.__step(16);
      }
      window.__step(16);
      const m = g.ultm.queue.current;
      const plan = m && g.ultm.cams.get(m)?.plan;
      return m && plan ? { total: m.stages.total, windup: m.stages.windup.ms, leaveAt: plan.leaveAt, travelMs: plan.travelMs, blowAt: plan.blowAt, both: plan.both, frames: plan.views.length, shape: m.shape } : null;
    }, pick);
    if (!st) throw new Error('the ultimate never fired, or it has no camera plan');
    const before = await camNow(page);
    const beats = [['caster', Math.min(st.leaveAt - 80, Math.round(st.windup * 0.6))], ['travel', Math.round(st.leaveAt + st.travelMs * 0.5)], ['strike', st.blowAt + 330], ['hold', Math.round((st.blowAt + st.total) / 2) + 300], ['return', st.total + 1500]];
    let t = 32;
    const log = [];
    for (const [i, [name, at]] of beats.entries()) {
      await page.evaluate((d) => window.__step(d), Math.max(16, at - t));
      t = Math.max(t + 16, at);
      log.push(`${name} ${JSON.stringify(await camNow(page))}${name === 'strike' || name === 'hold' ? ` in the safe rectangle: ${JSON.stringify(await inSafe(page))}` : ''}`);
      await page.screenshot({ path: `${OUT}/${pick}-${W}-${i + 1}-${name}.png` });
    }
    console.log('ok', pick, `${W}x${H}`, JSON.stringify(st), `fight ${JSON.stringify(before)}`);
    for (const l of log) console.log('   ', l);
  } catch (e) {
    console.log('FAILED', pick, String(e.message).split('\n')[0]);
  }
  await ctx.close();
}

for (const pick of EIDOLONS) {
  const { ctx, page } = await open({ horn: 1000, bound: [pick], chosen: pick, confirmed: true });
  try {
    await army(page, ['knight', 'paladin', 'archer', 'wizard', 'cleric'], 'orcs', 15);
    await page.waitForTimeout(900);
    const m = await page.evaluate(() => {
      const g = window.__game;
      g.app.ticker.stop();
      window.__step(400);
      document.querySelector('.ehFight').click();
      window.__step(16);
      return g.eid.p?.m ?? null;
    });
    if (!m) throw new Error('the horn was not blown');
    const frame = () => page.evaluate(() => window.__game.app.canvas.style.transform || 'none');
    const beats = [['summoning', Math.round((m.PASS + m.EXIT) / 2)], ['travel', Math.round((m.BUILD + m.STRIKE) / 2)], ['strike', m.STRIKE + m.HIT_STOP + 260], ['hold', Math.round((m.AFTER + m.RESUME) / 2) + m.HIT_STOP], ['return', m.RESUME + m.HIT_STOP + 1200]];
    let t = 16;
    const log = [];
    for (const [i, [name, at]] of beats.entries()) {
      await page.evaluate((d) => window.__step(d), at - t);
      t = at;
      log.push(`${name} ${await frame()}`);
      await page.screenshot({ path: `${OUT}/${pick}-${W}-${i + 1}-${name}.png` });
    }
    console.log('ok', pick, `${W}x${H}`);
    for (const l of log) console.log('   ', l);
  } catch (e) {
    console.log('FAILED', pick, String(e.message).split('\n')[0]);
  }
  await ctx.close();
}

if (SPELL) {
  const { ctx, page } = await open();
  try {
    await army(page, PARTY_OF('knight'));
    const cast = await page.evaluate(() => {
      const g = window.__game;
      g.app.ticker.stop();
      g.b.spells.mana = 10;
      // (a foe far from the middle of the fight, so the glance has somewhere to go)
      const foes = g.b.units.filter((u) => u.side === 'foe' && u.alive).sort((a, b) => a.v - b.v || b.u - a.u);
      const to = foes[0];
      for (const id of ['meteor', 'fireball', 'blizzard', 'lightning', 'smite', 'frost']) {
        if (window.__castSpell(g.b, id, to.u, to.v)) {
          g.glanceAt(id, to.u, to.v);
          return { id, u: to.u, v: to.v, glance: !!g.spellCam };
        }
      }
      return null;
    });
    if (!cast) throw new Error('no spell could be cast');
    const cam = () => page.evaluate(() => { const g = window.__game; return JSON.stringify({ cx: Math.round(g.cx), cy: Math.round(g.cy), zoom: +g.zoom.toFixed(2), glance: !!g.spellCam }); });
    const log = [`cast ${JSON.stringify(cast)} ${await cam()}`];
    let t = 0;
    for (const [i, [name, at]] of [['cast', 16], ['travel', 180], ['framed', 800], ['return', 2700]].entries()) {
      await page.evaluate((d) => window.__step(d), at - t);
      t = at;
      log.push(`${name} ${await cam()}`);
      await page.screenshot({ path: `${OUT}/spell-${W}-${i + 1}-${name}.png` });
    }
    console.log('ok spell', `${W}x${H}`);
    for (const l of log) console.log('   ', l);
  } catch (e) {
    console.log('FAILED spell', String(e.message).split('\n')[0]);
  }
  await ctx.close();
}
console.log('page errors:', errors);
await browser.close();
srv.close();
