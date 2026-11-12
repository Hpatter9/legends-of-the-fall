// BLENDER-FX (docs/notes/blender-fx.md): every hero's ultimate fired by hand in a real fight and photographed through its three stages.
// This is ULT-EPIC's `tools/ult-epic/stages.mjs` (its own clock, the fight's speed set to x2) with two changes: the save owns whichever
// heroes are picked, so any of the 70 can fire, and it takes six moments chosen to show the wind-up at its height, the blow, and the
// aftermath. The Eidolons are not photographed here.
//
//   npm run web && PORT=8693 OUT=out/ult-all node tools/blender-fx/ult-shots.mjs [--size 393x852] [--picks samurai,wizard | --picks all] [--reduced]
//
// Writes <OUT>/<pick>-<W>-<n>-<stage>.png; `tools/blender-fx/ult_sheet.py` joins them into sheets.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire(existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/' : import.meta.url)('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PORT = Number(process.env.PORT ?? 8693);
const OUT = process.env.OUT ?? 'out/ult-all';
const [W, H] = opt('--size', '393x852').split('x').map(Number);
const EVERY = ['vael', 'astrax', 'ilyra', 'orrun', 'nyxara', 'kunoichi', 'wizard', 'beastmaster', 'mercenary', 'arcBlade', 'samurai', 'lancer', 'minotaur', 'barbarian', 'ninjaMonk', 'buccaneer', 'archer', 'dreadPirate', 'siegeBot', 'lightningMage', 'gunslinger', 'rifleBot', 'dragoon', 'ranger', 'knight', 'paladin', 'yamabushi', 'gorgon', 'juggernaut', 'kraken', 'mummy', 'warlock', 'tyrant', 'shambler', 'reaper', 'druid', 'illusionist', 'priestess', 'werewolf', 'demonSwordsman', 'kitsune', 'karasu', 'timeWitch', 'wanderer', 'satyr', 'samuraiCommander', 'sage', 'cleric', 'peasant', 'wolfBard', 'vampireLord', 'hemomancer', 'nightstalker', 'bloodGargoyle', 'dhampir', 'warDrummer', 'geomancer', 'bellWarden', 'falconer', 'banneret', 'astralSphinx', 'mirageDancer', 'plagueDoctor', 'bombardier', 'astrologer', 'inquisitor', 'seraph', 'corsairSurgeon', 'harpooner', 'seaReaver'];
const PICKS = opt('--picks', 'samurai,wizard') === 'all' ? EVERY : opt('--picks', 'samurai,wizard').split(',').filter(Boolean);
const REDUCED = args.includes('--reduced');
const FIRST = args.includes('--first');
mkdirSync(OUT, { recursive: true });

// (ROOT: another build's folder, to photograph an older version beside this one)
const root = process.env.ROOT ?? 'out/web';
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
// (the save owns the picks themselves and a few to stand with them)
const ALL = [...new Set([...PICKS, 'knight', 'cleric', 'wizard', 'archer', 'samurai'])];
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
  // (NOFLASH=1: without the moment's flash of colour over the field as the blow lands, to see what plays under it)
  if (process.env.NOFLASH) await page.addStyleTag({ content: '.umFlash { display: none !important; }' });
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

async function army(page, party, army = 'beasts', stage = 3) {
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
  await page.waitForFunction(() => {
    const u = window.__game.b.units.filter((x) => x.alive);
    return u.some((h) => h.side === 'hero' && u.some((f) => f.side === 'foe' && Math.max(Math.abs(f.u - h.u), Math.abs(f.v - h.v)) <= 2));
  }, null, { timeout: 25000, polling: 200 }).catch(() => {});
  await page.waitForTimeout(600);
}

const speedNow = (page) => page.evaluate(() => `${document.getElementById('speed').textContent}${document.getElementById('speed').dataset.show ? ' (held)' : ''} set x${window.__game.speed}`);
/** Two frames in each stage: [stage, share of it]. */
// (EARLY=1: the first moments after the blow lands instead of the strike's middle, for what is over quickly: a line run out from the caster)
// (SHOW=1: four moments of the showcase itself, which plays through the first part of the strike's stage, before the blow)
const FRAMES = process.env.SHOW ? [['windup', 0.55], ['windup', 0.95], ['strike', 0.05], ['strike', 0.15], ['strike', 0.3], ['strike', 0.45]] : process.env.EARLY ? [['windup', 0.55], ['windup', 0.95], ['blow', 60], ['blow', 200], ['blow', 400], ['blow', 700]] : [['windup', 0.55], ['windup', 0.95], ['strike', 0.5], ['strike', 0.9], ['aftermath', 0.12], ['aftermath', 0.5]];

for (const pick of PICKS) {
  const { ctx, page } = await open();
  try {
    await army(page, PARTY_OF(pick));
    const before = await speedNow(page);
    const st = await page.evaluate((pick) => {
      const g = window.__game;
      g.app.ticker.stop();
      const hs = g.b.units.filter((u) => u.side === 'hero' && u.owner === undefined);
      for (const u of hs) u.charge2 = 0;
      const u = hs.find((h) => h.def === pick);
      u.charge2 = 100;
      document.querySelector(`.fhRow[data-unit="${u.id}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      for (let i = 0; i < 400 && !g.ultm.queue.current; i++) window.__step(16);
      const m = g.ultm.queue.current;
      return m ? { ...m.stages, shape: m.shape, show: m.show ?? 0 } : null;
    }, pick);
    if (!st) throw new Error('the ultimate never fired');
    let t = 0;
    const speeds = [];
    for (const [i, [name, k]] of FRAMES.entries()) {
      // (`blow`: so many ms after the blow itself lands, which is the strike's start and the showcase's length on)
      const at = name === 'blow' ? Math.round(st.strike.at + st.show + k) : Math.round(st[name].at + st[name].ms * k);
      await page.evaluate((d) => window.__step(d), at - t);
      t = at;
      speeds.push(await speedNow(page));
      await page.screenshot({ path: `${OUT}/${pick}-${W}-${i + 1}-${name}.png` });
      if (process.env.DEBUG) console.log(name, k, await page.evaluate(() => { const q = window.__game.ultm.queue; return JSON.stringify({ phase: q.phase, left: Math.round(q.left), dim: q.dim, since: q.since, stage: q.stageNow, op: document.querySelector('.umDim').style.opacity, px: [...document.querySelector('.umDim').getContext('2d').getImageData(3, 3, 1, 1).data], targets: [q.current?.targets?.struck.length, q.current?.targets?.helped.length, q.current?.targets?.tiles.length], kids: [...document.querySelector('.umLayer').children].map((c) => c.className + ':' + getComputedStyle(c).opacity), hidden: document.querySelector('.umLayer').hidden, zoom: window.__game.zoom }); }));
    }
    // (on to its end, counting the real ms the whole show took)
    const rest = await page.evaluate(() => {
      let n = 0;
      while (window.__game.ultm.queue.current && n < 12000) {
        window.__step(16);
        n += 16;
      }
      return n;
    });
    // (and on into the fight after the show: what the ability leaves lasting, an aura's spirits, a wall, a mark)
    for (const [i, ms] of [1200, 2600].entries()) {
      await page.evaluate((d) => window.__step(d), ms);
      await page.screenshot({ path: `${OUT}/${pick}-${W}-${7 + i}-after.png` });
    }
    const after = await speedNow(page);
    console.log('ok', pick, `${W}x${H}`, JSON.stringify({ mem: await page.evaluate(() => window.__bfxMem?.()), weight: st.weight, shape: st.shape, show: st.show, windup: st.windup.ms, strike: st.strike.ms, aftermath: st.aftermath.ms, total: st.total, measured: t + rest, before, during: [...new Set(speeds)], after }));
  } catch (e) {
    console.log('FAILED', pick, String(e.message).split('\n')[0]);
  }
  await ctx.close();
}

console.log('page errors:', errors);
await browser.close();
srv.close();
