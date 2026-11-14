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
// (QUIET=1: a party with no one whose own fire or arrows cover the picture: the pick, the Knight and the Cleric)
const PARTY_OF = (pick) => [pick, ...(process.env.QUIET ? ['knight', 'cleric'] : ['knight', 'cleric', 'archer', 'wizard', 'samurai']).filter((k) => k !== pick)].slice(0, 5);
let errors = 0;

async function open(eidolons) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: Number(process.env.DSF ?? 1), hasTouch: true, reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  if (process.env.TRACE) page.on('console', (m) => { if (m.text().startsWith('TRACE')) console.log(m.text()); });
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
  // (TRACE=1: each stage's rendered clip as it is asked for: where, how many spots, and whether its frames were held)
  if (process.env.TRACE) await page.evaluate(() => {
    const g = window.__game;
    const fx = g.fx ?? g.view?.fx ?? g.board?.fx;
    if (!fx) { console.log('TRACE no fx on the game'); return; }
    { const w = fx.bfxStand.bind(fx); fx.bfxStand = (key, layer, x, y, live, o) => { if (key !== 'aura-eclipse') return w(key, layer, x, y, live, o); let said = false; let n = 0; return w(key, layer, x, y, () => { const r = live(); n++; if (!r && !said) { said = true; console.log('TRACE eclipse live false at', window.__game.b.t, 'after calls', n, 'host', !!o?.host, 'phase', window.__game.b.phase); } return r; }, o); }; }
    for (const name of ['bfxRound', 'bfxStand']) { const w = fx[name].bind(fx); fx[name] = (...a) => { let r; try { r = w(...a); } catch (e) { console.log('TRACE', name, 'THREW', String(e)); throw e; } console.log('TRACE', name, a[0], 'returned', r); return r; }; }
    for (const name of ['ultAfter', 'ultImpact']) {
      const was = fx[name].bind(fx);
      fx[name] = (...a) => { console.log('TRACE', name, JSON.stringify(a.slice(1, 6)).slice(0, 300)); return was(...a); };
    }
    const was = fx.bfxUlt.bind(fx);
    fx.bfxUlt = (...a) => { const ok = was(...a); console.log('TRACE bfxUlt', a[0], a[1], Math.round(a[2]), Math.round(a[3]), a[4], a[5], 'drawn', ok); return ok; };
  });
  // (COST=1: the loader's cost on a slow phone. The CPU is throttled six times; every hand-over of a picture to the graphics card is
  // timed (with the card made to finish), every frame's own work is timed, and cutting an atlas's frames is timed on its own)
  if (process.env.COST) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await page.evaluate(() => {
      const g = window.__game;
      const r = g.app.renderer;
      const ts = r.texture;
      window.__cost = { ups: [], frames: [], cut: null };
      const up = ts.onSourceUpdate.bind(ts);
      ts.onSourceUpdate = (src) => {
        const t0 = performance.now();
        up(src);
        r.gl.finish();
        const res = src.resource;
        window.__cost.ups.push({ w: src.pixelWidth, h: src.pixelHeight, of: res?.constructor?.name ?? typeof res, ms: +(performance.now() - t0).toFixed(1), fight: !!g.b && g.b.phase === 'fight', label: String(src.label ?? '') });
      };
      const frame = g.frame.bind(g);
      g.frame = (a, b) => {
        const t0 = performance.now();
        const u0 = window.__cost.ups.length;
        frame(a, b);
        const ms = performance.now() - t0;
        // (a slow frame says how much of it was pictures going to the graphics card, and which)
        const ups = window.__cost.ups.slice(u0);
        if (ms > 30) window.__cost.frames.push({ ms: +ms.toFixed(1), fight: !!g.b && g.b.phase === 'fight', show: !!g.ultm?.queue?.current, upMs: +ups.reduce((n, u) => n + u.ms, 0).toFixed(1), ups: ups.map((u) => `${u.w}x${u.h} ${u.of} ${u.ms}`) });
      };
    });
  }
  // (NOFLASH=1: without the moment's flash of colour over the field as the blow lands, to see what plays under it)
  if (process.env.NOFLASH) await page.addStyleTag({ content: '.umFlash { display: none !important; }' });
  await page.evaluate(() => {
    const g = window.__game;
    // (the game starts its own loop again when it finds it stopped (WAVE-DELAY's `watchLoop`): this tool stops the loop to step the
    // fight by hand, so the watch is put to sleep here, or real time passes between a step and its photograph)
    g.watchLoop = () => {};
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
// (AT=0.18,0.22,0.26,0.3: four moments of the strike by how far through it, to catch a clip that is over between the usual frames)
const FRAMES = process.env.AT ? [['windup', 0.55], ['windup', 0.95], ...process.env.AT.split(',').map((x) => ['strike', Number(x)])] : process.env.SHOW ? [['windup', 0.55], ['windup', 0.95], ['strike', 0.05], ['strike', 0.15], ['strike', 0.3], ['strike', 0.45]] : process.env.EARLY ? [['windup', 0.55], ['windup', 0.95], ['blow', 60], ['blow', 200], ['blow', 400], ['blow', 700]] : [['windup', 0.55], ['windup', 0.95], ['strike', 0.5], ['strike', 0.9], ['aftermath', 0.12], ['aftermath', 0.5]];

// (WATCH=1: no ultimate is fired. The party named by --picks (all of them together) fights the wave on its own, and the field is
// photographed every WATCH_MS of the fight (600) for WATCH_N frames (40), and once more as the wave ends: for what stands or plays
// on the fighters in an ordinary fight, a heal over time, a ward, an aura)
if (process.env.WATCH) {
  const { ctx, page } = await open();
  await army(page, PICKS.slice(0, 5), process.env.ARMY ?? 'beasts', Number(process.env.STAGE ?? 3));
  // (FRAIL=gorgon,knight: those heroes begin the fight at one health, so a hero's fall can be caught)
  if (process.env.FRAIL) await page.evaluate((who) => { for (const u of window.__game.b.units) if (u.side === 'hero' && who.includes(u.def)) u.hp = 1; }, process.env.FRAIL.split(','));
  // (TOUGH=<n>: the foes are given n times their health, so the fight lasts and the heroes' heals and wards are seen)
  await page.evaluate((k) => { const g = window.__game; g.app.ticker.stop(); if (k !== 1) for (const f of g.b.units) if (f.side === 'foe' && f.alive) { f.maxHp = Math.max(1, Math.round(f.maxHp * k)); f.hp = f.maxHp; } }, Number(process.env.TOUGH ?? 1));
  // (STATUS=1: each hero is given a status that lasts the fight, a different one each (haste, rally, both), so what goes round a
  // fighter is on the screen in every photograph)
  if (process.env.STATUS) await page.evaluate(() => { window.__game.b.units.filter((u) => u.side === 'hero').forEach((u, i) => { if (i % 3 !== 1) u.hasteUntil = 1e9; if (i % 3 !== 0) u.rallyUntil = 1e9; }); });
  const every = Number(process.env.WATCH_MS ?? 600);
  // (CATCH=crit,block: the fight is stepped a frame at a time until a hit spark of each kind named lands, and each is photographed
  // 50 ms and 110 ms after it lands: for what is over between two ordinary frames)
  if (process.env.CATCH) {
    const want = process.env.CATCH.split(',');
    await page.evaluate(() => { const fx = window.__game.fx; const was = fx.bfxHit.bind(fx); window.__hits = []; fx.bfxHit = (kind, ...a) => { const ok = was(kind, ...a); if (ok) { window.__hits.push(kind); window.__hitAt = { ...(window.__hitAt ?? {}), [kind]: [a[1], a[2]] }; } return ok; }; });
    for (const kind of want) {
      const got = await page.evaluate((kind) => { window.__hits = []; for (let i = 0; i < 4000 && !window.__hits.includes(kind) && window.__game.b.phase === 'fight'; i++) window.__step(16); return window.__hits.includes(kind); }, kind);
      if (!got) console.log('NOT CAUGHT', kind);
      if (!got) continue;
      // (the fight at its ordinary speed for the photographs, so a spark of 200 ms is on the screen for 200 ms; where it is on the
      // screen is asked at each photograph, since the camera moves)
      await page.evaluate(() => window.__game.setSpeed(1));
      for (const [i, ms] of [16, 48, 64].entries()) {
        await page.evaluate((d) => window.__step(d), ms);
        const at = await page.evaluate((k) => { const [x, y] = window.__hitAt[k]; const g = window.__game.fx.root.toGlobal({ x, y }); return [Math.round(g.x), Math.round(g.y)]; }, kind);
        await page.screenshot({ path: `${OUT}/catch-${kind}-${W}-${i}.png` });
        console.log('caught', kind, i, JSON.stringify(at));
        if (process.env.DUMP && i === 0) console.log('DUMP', kind, JSON.stringify(await page.evaluate((k) => { const fx = window.__game.fx; const [x, y] = window.__hitAt[k]; return { want: [Math.round(x), Math.round(y)], hush: fx.hushOn, rootVis: fx.particles.root.visible, n: fx.particles.live.length, near: fx.particles.live.filter((l) => Math.abs(l.b.x - x) < 30 && Math.abs(l.b.y - y) < 30).map((l) => ({ x: Math.round(l.sp.x), y: Math.round(l.sp.y), a: +l.sp.alpha.toFixed(2), v: l.sp.visible, t: Math.round(l.t), span: Math.round(l.span), w: l.sp.texture.frame.width, sc: +l.sp.scale.x.toFixed(2), bare: !!l.b.bare })) }; }, kind)));
      }
      await page.evaluate(() => window.__game.setSpeed(2));
    }
    await ctx.close();
    console.log('page errors:', errors);
    await browser.close();
    srv.close();
    process.exit(0);
  }
  // (WHO=1 with WATCH: which fighters something leaves from in WATCH_S seconds of the fight (20), and whether each has a measured
  // point: the list of who still starts from the old place)
  if (process.env.WHO) {
    console.log('WHO', await page.evaluate((secs) => {
      const g = window.__game, fx = g.fx, seen = {};
      const was = fx.emitOf.bind(fx);
      fx.emitOf = (s, lift) => { const k = s.unit.side + ':' + s.unit.def + ':' + (s.emitPoint() ? 'point' : 'old'); seen[k] = (seen[k] ?? 0) + 1; return was(s, lift); };
      for (let t = 0; t < secs * 1000 && g.b.phase === 'fight'; t += 16) window.__step(16);
      return JSON.stringify(seen);
    }, Number(process.env.WATCH_S ?? 20)));
    await ctx.close();
    await browser.close();
    srv.close();
    process.exit(0);
  }
  // (STAGED=1 with WATCH: EMIT-POINTS' proof. As the fight opens, before the lines meet, each hero of the party is put in the frame of
  // its attack that is on show as a shot leaves, facing each of the four ways in turn, and its own shot is loosed at the nearest
  // foe; one frame later (the shot just out) the hero is photographed, 130 px round it. Nothing of the fight is stepped: only the
  // hero's picture and the effects. The fight is not played on afterwards.)
  if (process.env.STAGED) {
    const { readFileSync } = await import('node:fs');
    const shots = Object.fromEntries([...readFileSync('src/sim/units.ts', 'utf8').matchAll(/^\s+(\w+): \{ id: '\w+'[^\n]*?shot: '(\w+)'/gm)].map((m) => [m[1], m[2]]));
    // (STAGED=foe: the same for each kind of shooting foe in the fight, loosing at the nearest hero)
    const FOE_SHOTS = { gorgon1: 'bone', gorgon2: 'bone', gorgon3: 'bone', orcArcher: 'arrow', boneVolley: 'bone', mazeGorgon1: 'bone', mazeGorgon2: 'bone', mazeGorgon3: 'bone', gorgonQueen: 'bone', lichKing: 'curse', yokaiWitch: 'curse', nineTails: 'fire', shamanKing: 'bolt', voltaraGoddess: 'bolt', vaelkharKing: 'curse' };
    const foes = process.env.STAGED === 'foe';
    if (foes) Object.assign(shots, FOE_SHOTS);
    const who = foes ? await page.evaluate((ids) => [...new Set(window.__game.b.units.filter((u) => u.side === 'foe' && u.alive && ids.includes(u.def)).map((u) => u.def))], Object.keys(FOE_SHOTS)) : PICKS.slice(0, 5);
    if (foes) console.log('foes here:', await page.evaluate(() => [...new Set(window.__game.b.units.filter((u) => u.side === 'foe').map((u) => u.def))].join(' ')));
    for (const pick of who) {
      for (const dir of process.env.STAGED === 'swing' ? [0] : [0, 1, 2, 3]) {
        const at = await page.evaluate(([pick, dir, shot, cast, foes, swing]) => {
          const g = window.__game, b = g.b, fx = g.fx;
          const u = b.units.find((x) => x.side === (foes ? 'foe' : 'hero') && x.def === pick && x.alive);
          const foe = b.units.find((x) => x.side === (foes ? 'hero' : 'foe') && x.alive);
          const sp = g.sprites.get(u.id);
          if (!u || !foe || !sp) return null;
          fx.step(3000);
          u.facing = dir;
          // (STAGED=cast: the hero in the middle of its skill's cast, and a strand run from it to the foe, for the heroes that cast
          // without shooting: where a skill's effect leaves them)
          if (swing) {
            // (STAGED=swing: the hero in the frame on show as its blow lands, turned to the fighter nearest it, and its stroke swung at
            // that fighter: where a melee stroke lies. One photograph a hero, 200 px round the two of them.)
            const near = b.units.filter((x) => x.alive && x.id !== u.id).sort((p, q) => Math.hypot(p.u - u.u, p.v - u.v) - Math.hypot(q.u - u.u, q.v - u.v))[0];
            const D = [[1, 0], [0, 1], [-1, 0], [0, -1]];
            u.facing = D.map((d, i) => [d[0] * (near.u - u.u) + d[1] * (near.v - u.v), i]).sort((p, q) => q[0] - p[0])[0][1];
            u.cast = undefined;
            u.swing = { at: b.t - 600, ms: 1000, to: near.id };
            sp.update(b.board, b.t, true);
            fx.slash(b, u.id, near.id);
            fx.step(60);
            g.app.renderer.render(g.app.stage);
            const t = g.sprites.get(near.id);
            const p = fx.root.toGlobal({ x: (sp.x + t.x) / 2, y: (sp.y + t.y) / 2 - sp.tall * 0.5 });
            return [Math.round(p.x), Math.round(p.y)];
          }
          if (cast) {
            u.swing = undefined;
            u.cast = { at: b.t - 300, ms: 1000, anim: 'attack2' };
            sp.update(b.board, b.t, true);
            fx.arc(u.id, foe.id);
          } else {
            u.swing = { at: b.t - 600, ms: 1000, to: foe.id };
            sp.update(b.board, b.t, true);
            fx.shot(u.id, foe.id, shot, 400);
          }
          fx.step(16);
          g.app.renderer.render(g.app.stage);
          const p = fx.root.toGlobal({ x: sp.x, y: sp.y - sp.tall * 0.5 });
          return [Math.round(p.x), Math.round(p.y)];
        }, [pick, dir, shots[pick], process.env.STAGED === 'cast', foes, process.env.STAGED === 'swing']);
        if (!at) { console.log('NOT STAGED', pick); continue; }
        const x = Math.max(0, Math.min(W - 130, at[0] - 65));
        await page.screenshot({ path: `${OUT}/staged-${pick}-${dir}.png`, clip: { x, y: Math.max(0, at[1] - 75), width: 130, height: 130 } });
      }
      console.log('staged', pick);
    }
    await ctx.close();
    await browser.close();
    srv.close();
    process.exit(0);
  }
  // (FRAMES=1 with WATCH: what a frame of an ordinary fight costs on a slow phone. The CPU is throttled four times and every frame
  // of the fight's first WATCH_S seconds (20) is timed, the graphics card made to finish each; and how many of the ground's row
  // layers were being drawn, on the average and at the most)
  if (process.env.FRAMES) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const cost = await page.evaluate((secs) => {
      const g = window.__game;
      const gl = g.app.renderer.gl;
      const all = [];
      let rows = 0, most = 0;
      for (let t = 0; t < secs * 1000 && g.b.phase === 'fight'; t += 16) {
        const t0 = performance.now();
        g.frame(16, 16);
        gl?.finish();
        all.push(performance.now() - t0);
        const on = g.fx.rowLows ? [...g.fx.rowLows.keys()].filter((l) => !l.destroyed && l.visible).length : 0;
        rows += on;
        most = Math.max(most, on);
      }
      const s = [...all].sort((x, y) => x - y);
      return { n: s.length, mean: +(s.reduce((x, y) => x + y, 0) / s.length).toFixed(2), p50: +s[Math.floor(s.length * 0.5)].toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(2), worst: +s[s.length - 1].toFixed(2), rowsMean: +(rows / s.length).toFixed(1), rowsMost: most };
    }, Number(process.env.WATCH_S ?? 20));
    console.log('FRAMES fight', JSON.stringify(cost));
    await ctx.close();
    await browser.close();
    srv.close();
    process.exit(0);
  }
  // (SEE=shot:wizard,arc:kitsune: the fight is stepped a frame at a time until that fighter looses a shot or an arc leaves it
  // (arc:shock for a shock's jump), and it is photographed in flight, at the fight's ordinary speed)
  if (process.env.SEE) {
    await page.evaluate(() => {
      const fx = window.__game.fx;
      window.__seen = [];
      const defOf = (id) => fx.sprites.get(id)?.unit.def;
      const shot = fx.shot.bind(fx);
      fx.shot = (by, to, kind, ms) => { const k = 'shot:' + defOf(by); window.__seen.push(k); window.__seenMs = ms; const sp = fx.sprites.get(by); if (sp) window.__seenAt = { ...(window.__seenAt ?? {}), [k]: [sp.x, sp.y - sp.tall * 0.5] }; return shot(by, to, kind, ms); };
      // (swing:<kind> a melee blow's stroke by that kind, fall:<kind> that kind's fall; either side's fighters)
      const slash = fx.slash.bind(fx);
      fx.slash = (b, by, to) => { window.__seen.push('swing:' + defOf(by)); window.__seenMs = 150; return slash(b, by, to); };
      const death = fx.death.bind(fx);
      fx.death = (target, ...a) => { window.__seen.push('fall:' + target.def); window.__seenMs = 500; window.__seenAt = { ...(window.__seenAt ?? {}), ['fall:' + target.def]: [a[0], a[2] ?? a[1]] }; return death(target, ...a); };
      // (blink:<kind> a blink by that kind that strikes a foe: its streak and the cut on the foe)
      const streak = fx.streak.bind(fx);
      fx.streak = (b, e, slash) => { if (e.kind === 'blink' && slash) { window.__seen.push('blink:' + defOf(e.by)); window.__seenMs = 200; } return streak(b, e, slash); };
      // (land:<kind> a melee blow by that kind landing on the one it was aimed at: the moment its spark, and its stroke, play)
      const show = fx.show.bind(fx);
      fx.show = (b, events) => { const r = show(b, events); for (const e of events) if (e.kind === 'hit' && e.src === 'blow' && !e.splash) { const k = 'land:' + defOf(e.by); const p = fx.sprites.get(e.by), q = fx.sprites.get(e.to); if (p && q && !window.__seen.includes(k)) { window.__seen.push(k); window.__seenMs = 150; window.__seenAt = { ...(window.__seenAt ?? {}), [k]: [(p.x + q.x) / 2, (p.y + q.y) / 2 - p.tall * 0.5] }; } } return r; };
      const arc = fx.arc.bind(fx);
      fx.arc = (from, to, shock) => { const k = 'arc:' + (shock ? 'shock' : defOf(from)); window.__seen.push(k); window.__seenMs = 300; const [p, q] = [fx.sprites.get(from), fx.sprites.get(to)]; if (p && q) window.__seenAt = { ...(window.__seenAt ?? {}), [k]: [(p.x + q.x) / 2, (p.y + q.y) / 2 - 20] }; return arc(from, to, shock); };
    });
    for (const what of process.env.SEE.split(',')) {
      const got = await page.evaluate((what) => { window.__seen = []; const has = () => window.__seen.some((s) => s.startsWith(what)); for (let i = 0; i < 6000 && !has() && window.__game.b.phase === 'fight'; i++) window.__step(16); return has() ? window.__seenMs : 0; }, what);
      if (!got) console.log('NOT SEEN', what, 'saw', await page.evaluate(() => [...new Set(window.__seen)].join(' ') + ' | foes ' + [...new Set(window.__game.b.units.filter((u) => u.side === 'foe').map((u) => u.def))].join(' ') + ' | ' + window.__game.b.phase));
      if (!got) continue;
      await page.evaluate(() => window.__game.setSpeed(1));
      // (SEE_AT=0.1,0.2: the shares of its flight at which it is photographed; 0.3 and 0.6 when not given)
      for (const [i, k] of (process.env.SEE_AT ? process.env.SEE_AT.split(',').map(Number).map((v, j, a) => v - (a[j - 1] ?? 0)) : [0.3, 0.3]).entries()) {
        await page.evaluate((d) => window.__step(d), Math.round(got * k));
        await page.screenshot({ path: `${OUT}/see-${what.replace(':', '-')}-${W}-${i}.png` });
      }
      // (where it was on the screen as the last photograph was taken, for a crop round it)
      console.log('seen', what, JSON.stringify(await page.evaluate((w) => { const k = Object.keys(window.__seenAt ?? {}).find((x) => x.startsWith(w)); if (!k) return null; const [x, y] = window.__seenAt[k]; const g = window.__game.fx.root.toGlobal({ x, y }); return [Math.round(g.x), Math.round(g.y)]; }, what)));
      await page.evaluate(() => window.__game.setSpeed(2));
    }
    await ctx.close();
    console.log('page errors:', errors);
    await browser.close();
    srv.close();
    process.exit(0);
  }
  let ended = 0;
  for (let i = 0; i < Number(process.env.WATCH_N ?? 40) && ended < 3; i++) {
    await page.evaluate((d) => window.__step(d), every);
    const st = await page.evaluate(() => ({ phase: window.__game.b.phase, foes: window.__game.b.units.filter((u) => u.side === 'foe' && u.alive).length }));
    if (st.phase !== 'fight' || !st.foes) ended++;
    await page.screenshot({ path: `${OUT}/watch-${W}-${String(i).padStart(2, '0')}${ended ? '-end' : ''}.png` });
  }
  console.log('ok watch', PICKS.join(','));
  await ctx.close();
  console.log('page errors:', errors);
  await browser.close();
  srv.close();
  process.exit(0);
}

for (const pick of PICKS) {
  const { ctx, page } = await open();
  try {
    // (ARMY=<army>: whose land the fight is on; the Undead's is stepped ground)
    await army(page, PARTY_OF(pick), process.env.ARMY ?? 'beasts');
    const before = await speedNow(page);
    if (process.env.KILL) await page.evaluate(() => { window.__killAll = true; });
    if (process.env.LINE) await page.evaluate((v) => { window.__line = v.split(',').map(Number).concat([3]).slice(0, 2); }, process.env.LINE);
    if (process.env.TOUGH) await page.evaluate(() => { window.__tough = true; });
    const st = await page.evaluate((pick) => {
      const g = window.__game;
      g.app.ticker.stop();
      const hs = g.b.units.filter((u) => u.side === 'hero' && u.owner === undefined);
      for (const u of hs) u.charge2 = 0;
      const u = hs.find((h) => h.def === pick);
      // (Ilyra's Death Denied answers an ally who is hurt: it will not fire with everyone whole, so one friend is put at half health)
      if (pick === 'ilyra') {
        const friend = hs.find((h) => h.def !== pick);
        if (friend) friend.hp = Math.round(friend.maxHp * 0.5);
      }
      if (window.__killAll) for (const f of g.b.units) if (f.side === 'foe' && f.alive) f.hp = 1;
      // (TOUGH=1: the foes are given health enough to live through the cast, so a strong hero's whole show is photographed, not its cut-short)
      if (window.__tough) for (const f of g.b.units) if (f.side === 'foe' && f.alive) { f.maxHp *= 60; f.hp = f.maxHp; }
      // (LINE=<0..3>,<from>: for the photograph the foes are stood in a row running from the hero in that direction of the board,
      // the nearest `from` tiles away (3 when not given), on tiles that are there and free: a long line for a breath)
      if (window.__line) {
        const [dir, from] = window.__line;
        const [du, dv] = [[1, 0], [0, 1], [-1, 0], [0, -1]][dir];
        const bd = g.b.board, taken = new Set(g.b.units.filter((x) => x.alive && x.side === 'hero').map((x) => x.u + ',' + x.v));
        let k = from;
        for (const f of g.b.units.filter((x) => x.side === 'foe' && x.alive)) {
          for (; k < 9; k++) { const [tu, tv] = [u.u + du * k, u.v + dv * k]; if (tu >= 0 && tv >= 0 && tu < bd.w && tv < bd.d && !taken.has(tu + ',' + tv)) break; }
          if (k >= 9) { f.u = (f.u + 3) % bd.w; continue; }
          f.u = u.u + du * k; f.v = u.v + dv * k; f.step = undefined; k++;
        }
      }
      u.charge2 = 100;
      document.querySelector(`.fhRow[data-unit="${u.id}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      for (let i = 0; i < 400 && !g.ultm.queue.current; i++) window.__step(16);
      const m = g.ultm.queue.current;
      return m ? { ...m.stages, shape: m.shape, show: m.show ?? 0 } : null;
    }, pick);
    // (ROWS=<ms>: what is playing on the ground's row layers that long after the strike begins, for finding a picture that does not show)
    if (process.env.ROWS) {
      console.log('ROWS', await page.evaluate(([st, ms]) => { const g = window.__game; window.__step(st.strike.at + Number(ms)); const out = []; for (const [layer, p] of g.fx.rowLows) for (const l of p.live) out.push({ z: layer.zIndex || layer.parent?.zIndex, vis: layer.visible, n: l.frames, t: Math.round(l.t), span: Math.round(l.span), x: Math.round(l.sp.x), y: Math.round(l.sp.y), a: +l.sp.alpha.toFixed(2), sv: l.sp.visible, w: l.sp.texture.width, sx: +l.sp.scale.x.toFixed(2), rot: +l.sp.rotation.toFixed(2) }); return JSON.stringify(out.map((o) => [o.n, o.w, o.t, o.span, o.a, o.x, o.y].join(':')).slice(0, 40)) + ' of ' + out.length + ' moment ' + JSON.stringify(g.fx.moment.live.map((l) => [l.frames, l.sp.texture.width, Math.round(l.t), Math.round(l.span), +l.sp.alpha.toFixed(2)].join(':'))); }, [st, process.env.ROWS]));
    }
    // (MOUTH=<ms,ms,...>: the show is stepped until the caster's mouth run begins (the first small flame beat), then photographed
    // that many ms after it, 200 px round the caster: for seeing a breath leave the mouth)
    // (LINKS=<ms,ms>: the show is stepped until the strike begins (`ultImpact`; with LINKS_ON=shot, until the showcase's first shot
    // beat), and the caster is photographed when the first of the bits made from then on is that old (the show's clock stands still
    // on the blow): for seeing where what the ultimate sends leaves the caster. 240 by 200 px round the caster.)
    if (process.env.LINKS) {
      await page.evaluate((on) => { const fx = window.__game.fx; const mark = () => { if (!window.__old) window.__old = new Set(fx.moment.live); }; if (on === 'shot') { const was = fx.showBeat.bind(fx); fx.showBeat = (kind, ...a) => { if (kind === 'shot') mark(); return was(kind, ...a); }; } else { const was = fx.ultImpact.bind(fx); fx.ultImpact = (...a) => { mark(); return was(...a); }; } }, process.env.LINKS_ON ?? '');
      const age = () => page.evaluate(() => { if (!window.__old) return null; const l = window.__game.fx.moment.live.filter((x) => !window.__old.has(x)).sort((p, q) => q.t - p.t)[0]; return l ? l.t : null; });
      let seen = false;
      for (let i = 0; i < 900 && !seen; i++) { await page.evaluate(() => window.__step(16)); seen = (await age()) !== null; }
      console.log(seen ? 'begun' : 'NOT BEGUN', pick);
      for (const [i, ms] of process.env.LINKS.split(',').map(Number).entries()) {
        for (let n = 0; n < 200; n++) { const t = await age(); if (t === null || t >= ms) break; await page.evaluate(() => window.__step(16)); }
        const at = await page.evaluate((pick) => { const g = window.__game; const u = g.b.units.find((x) => x.side === 'hero' && x.def === pick); const sp = g.sprites.get(u.id); const p = g.fx.root.toGlobal({ x: sp.x, y: sp.y - sp.tall * 0.5 }); return [Math.round(p.x), Math.round(p.y)]; }, pick);
        await page.screenshot({ path: `${OUT}/links-${pick}-${i}.png`, clip: { x: Math.max(0, Math.min(W - 240, at[0] - 120)), y: Math.max(0, at[1] - 110), width: 240, height: 200 } });
      }
      await ctx.close();
      continue;
    }
    // (WIND=<ms,ms,...>: the caster photographed that many ms into the show's wind-up, 200 px round it, and what is drawn on it then
    // (the moment's bits near it and its own layer under its body, each with its strength): for seeing what a wind-up covers)
    if (process.env.WIND) {
      if (!st) throw new Error('the ultimate never fired');
      let t = 0;
      for (const [i, ms] of process.env.WIND.split(',').map(Number).entries()) {
        const want = st.windup.at + ms;
        await page.evaluate((d) => window.__step(d), want - t);
        t = want;
        const seen = await page.evaluate((pick) => {
          const g = window.__game, fx = g.fx; const u = g.b.units.find((x) => x.side === 'hero' && x.def === pick); const sp = g.sprites.get(u.id);
          const p = fx.root.toGlobal({ x: sp.x, y: sp.y - sp.tall * 0.5 });
          const near = (l) => Math.abs(l.sp.x - sp.x) < 60 && Math.abs(l.sp.y - sp.y) < 90;
          const over = fx.moment.live.filter(near).map((l) => ({ a: +l.sp.alpha.toFixed(2), w: Math.round(l.sp.width), h: Math.round(l.sp.height), add: l.sp.blendMode !== 'normal', t: Math.round(l.t) }));
          const own = fx.unders.get(sp.underLayer());
          const under = (own?.live ?? []).map((l) => ({ a: +l.sp.alpha.toFixed(2), w: Math.round(l.sp.width), h: Math.round(l.sp.height), t: Math.round(l.t) }));
          return { at: [Math.round(p.x), Math.round(p.y)], over, under, order: sp.root.children.map((c) => c.label || c.constructor.name) };
        }, pick);
        console.log('WIND', ms, JSON.stringify(seen));
        await page.screenshot({ path: `${OUT}/wind-${pick}-${i}.png`, clip: { x: Math.max(0, Math.min(W - 200, seen.at[0] - 100)), y: Math.max(0, seen.at[1] - 120), width: 200, height: 200 } });
      }
      await ctx.close();
      continue;
    }
    if (process.env.MOUTH) {
      // (the run's flames are the moment's bits that are turned; its clock is their own age, which stands still through the freeze on
      // the blow, so each photograph is taken when the first flame is that old, not that long after)
      const age = () => page.evaluate(() => { const l = window.__game.fx.moment.live.filter((x) => x.sp.rotation !== 0 && x.frames === 8).sort((p, q) => q.t - p.t)[0]; return l ? l.t : null; });
      let seen = false;
      for (let i = 0; i < 900 && !seen; i++) { await page.evaluate(() => window.__step(16)); seen = (await age()) !== null; }
      console.log(seen ? 'mouth run begun' : 'NO MOUTH RUN', JSON.stringify(await page.evaluate((pick) => { const g = window.__game; const u = g.b.units.find((x) => x.side === 'hero' && x.def === pick); return { facing: u.facing, flames: g.fx.moment.live.filter((x) => x.sp.rotation !== 0 && x.frames === 8).length }; }, pick)));
      for (const [i, ms] of process.env.MOUTH.split(',').map(Number).entries()) {
        for (let n = 0; n < 200; n++) { const t = await age(); if (t === null || t >= ms) break; await page.evaluate(() => window.__step(16)); }
        const at = await page.evaluate((pick) => { const g = window.__game; const u = g.b.units.find((x) => x.side === 'hero' && x.def === pick); const sp = g.sprites.get(u.id); const p = g.fx.root.toGlobal({ x: sp.x, y: sp.y - sp.tall * 0.5 }); return [Math.round(p.x), Math.round(p.y)]; }, pick);
        await page.screenshot({ path: `${OUT}/mouth-${pick}-${i}.png`, clip: { x: Math.max(0, Math.min(W - 240, at[0] - 120)), y: Math.max(0, at[1] - 120), width: 240, height: 200 } });
      }
      await ctx.close();
      continue;
    }
    // (THRU=<ms>: the fighters drawn again over the strike that long after the strike's stage begins, and where each copy is)
    if (process.env.THRU) console.log('THRU', await page.evaluate(([st, ms]) => { const g = window.__game; window.__step(st.strike.at + Number(ms)); return JSON.stringify(g.fx.throughs.map((h) => ({ id: h.id, t: Math.round(h.t), life: h.life, a: +h.sp.alpha.toFixed(2), x: Math.round(h.sp.x), y: Math.round(h.sp.y), vis: h.sp.visible, w: h.sp.texture.width, sx: +h.sp.scale.x.toFixed(2), par: !!h.sp.parent, lz: g.fx.root.getChildIndex(g.fx.throughLayer), n: g.fx.root.children.length }))); }, [st, process.env.THRU]));
    // (HOOK=<a method of the effects>: each call of it through the show is written out with what it was given and what it returned)
    if (process.env.HOOK) await page.evaluate((name) => { const fx = window.__game.fx; const was = fx[name].bind(fx); fx[name] = (...a) => { const r = was(...a); console.log('TRACE', name, JSON.stringify(a.map((x) => (typeof x === 'number' ? Math.round(x) : x && x.root ? '[fighter ' + x.unit?.def + ']' : x))), '->', JSON.stringify(r)); return r; }; }, process.env.HOOK);
    if (!st) throw new Error('the ultimate never fired');
    if (process.env.UNDERS) console.log('UNDERS', await page.evaluate(() => { const fx = window.__game.fx; window.__step(100); const p = [...fx.unders.values()][0]; const a = { t: p?.live[0]?.t, span: p?.live[0]?.span, frames: p?.live[0]?.frames }; window.__step(400); return JSON.stringify({ ...a, t2: p?.live[0]?.t, alpha: p?.live[0]?.sp.alpha, vis: p?.live[0]?.sp.visible, tex: p?.live[0]?.sp.texture.frame.x, sc: p?.live[0]?.sp.scale.x, msc: window.__game.fx.moment.live.map((l) => [l.sp.scale.x, l.sp.alpha, l.sp.texture.frame.x]) }); }));
    // (FRAMES=1: what a frame of the show costs on a slow phone. The CPU is throttled four times and every frame from the cast to the
    // aftermath's end is timed, the graphics card made to finish each: the mean, the 95th percentile and the worst, for the whole
    // show and for the strike alone)
    if (process.env.FRAMES) {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const cost = await page.evaluate((st) => {
        const g = window.__game;
        const gl = g.app.renderer.gl;
        const end = st.aftermath.at + st.aftermath.ms;
        const all = [], strike = [];
        for (let t = 0; t < end; t += 16) {
          const t0 = performance.now();
          g.frame(16, 16);
          gl?.finish();
          const d = performance.now() - t0;
          all.push(d);
          if (t >= st.strike.at && t < st.strike.at + st.strike.ms) strike.push(d);
        }
        const sum = (a) => { const s = [...a].sort((x, y) => x - y); return { n: s.length, mean: +(s.reduce((x, y) => x + y, 0) / s.length).toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(2), worst: +s[s.length - 1].toFixed(2) }; };
        return { show: sum(all), strike: sum(strike), rows: g.fx.rowLows ? g.fx.rowLows.size : 0 };
      }, st);
      console.log('FRAMES', pick, JSON.stringify(cost));
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await ctx.close();
      continue;
    }
    // (KILL=1: the ultimate lands the last blow of a real fight. Every foe is put at one health as it is fired, so the cast itself ends
    // the fight in the sim and the run settles as it does in play; then it is watched frame by frame: when the fight ended, when the
    // blow was played, when the result card came up; and photographed on the way)
    if (process.env.KILL) {
      const watch = (ms) => page.evaluate((ms) => {
        const g = window.__game;
        const w = (window.__watch ??= { t: 0, over: -1, blow: -1, result: -1, gone: -1 });
        for (const end = w.t + ms; w.t < end && w.result < 0; w.t += 16) {
          window.__step(16);
          if (w.over < 0 && g.b.phase !== 'fight') w.over = w.t;
          if (w.blow < 0 && g.ultm.queue.strikes > 0) w.blow = w.t;
          if (w.gone < 0 && w.over >= 0 && !g.ultm.queue.current) w.gone = w.t;
          const card = document.getElementById('result');
          if (w.result < 0 && card && !card.hidden) w.result = w.t;
        }
        return { ...w, phase: g.b.phase };
      }, ms);
      let seen = await watch(320);
      await page.screenshot({ path: `${OUT}/${pick}-${W}-1-blow300.png` });
      seen = await watch(500);
      await page.screenshot({ path: `${OUT}/${pick}-${W}-2-blow800.png` });
      seen = await watch(600);
      await page.screenshot({ path: `${OUT}/${pick}-${W}-3-at1400.png` });
      seen = await watch(10000);
      console.log('ok', pick, 'the last blow of the fight:', JSON.stringify(seen), seen.over >= 0 ? `blow ${seen.blow - seen.over} ms and result ${seen.result - seen.over} ms after the fight ended` : 'the fight did not end');
      await page.screenshot({ path: `${OUT}/${pick}-${W}-9-result.png` });
      await ctx.close();
      continue;
    }
    let t = 0;
    const speeds = [];
    // (CUT=windup or CUT=strike: the fight is ended in the middle of the show, as when the ultimate lands the killing blow, and the next
    // moments are photographed: what a player sees when a show is cut short (the freeze fix cuts it to a second of aftermath))
    if (process.env.CUT) {
      const when = process.env.CUT === 'windup' ? Math.round(st.windup.at + st.windup.ms * 0.6) : Math.round(st.strike.at + st.show + 150);
      await page.evaluate((d) => window.__step(d), when);
      await page.screenshot({ path: `${OUT}/${pick}-${W}-1-before.png` });
      await page.evaluate(() => { window.__game.b.phase = 'won'; });
      let was = 0;
      for (const [i, ms] of [80, 350, 700, 1200, 2000].entries()) {
        await page.evaluate((d) => window.__step(d), ms - was);
        was = ms;
        await page.screenshot({ path: `${OUT}/${pick}-${W}-${i + 2}-cut${ms}.png` });
      }
      console.log('ok', pick, 'cut in the', process.env.CUT, 'show still playing:', await page.evaluate(() => !!window.__game.ultm.queue.current));
      await ctx.close();
      continue;
    }
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
    if (process.env.ROUNDS) console.log('ROUNDS', await page.evaluate((pick) => { const g = window.__game; const u = g.b.units.find((x) => x.side === 'hero' && x.def === pick); const sp = g.sprites.get(u.id); const lay = sp.underFx; return JSON.stringify({ alive: u.alive, t: g.b.t, phase: g.b.phase, under: lay ? lay.children.map((c) => ({ a: +c.alpha.toFixed(2), v: c.visible, n: c.children.length })) : null }); }, pick));
    const after = await speedNow(page);
    if (process.env.COST) {
    const cost = await page.evaluate(() => {
      // (cutting a large atlas's frames: 400 textures over one source, as the loader makes when an atlas arrives)
      const g = window.__game;
      let any = null;
      const walk = (n) => { if (!any && n.texture?.source && n.texture.frame) any = n.texture; for (const c of n.children ?? []) walk(c); };
      walk(g.app.stage);
      if (any) {
        const T = any.constructor, R = any.frame.constructor;
        const t0 = performance.now();
        const made = [];
        for (let i = 0; i < 400; i++) made.push(new T({ source: any.source, frame: new R(0, 0, 8, 8) }));
        window.__cost.cut = +(performance.now() - t0).toFixed(1);
        for (const t of made) t.destroy(false);
      }
      return window.__cost;
    });
    const big = cost.ups.filter((u) => u.w * u.h >= 200 * 200);
    console.log('cost', pick, JSON.stringify({ uploads: big.length, plain: big.filter((u) => u.of === 'HTMLImageElement').map((u) => `${u.w}x${u.h} ${u.ms}${u.fight ? ' F' : ''}`), bitmaps: big.filter((u) => u.of === 'ImageBitmap').map((u) => `${u.w}x${u.h} ${u.ms}${u.fight ? ' F' : ''}`), inFight: big.filter((u) => u.fight).length, slowFrames: cost.frames.length, worst: cost.frames.sort((a, b) => b.ms - a.ms).slice(0, 6), cut400: cost.cut }));
    }
    console.log('ok', pick, `${W}x${H}`, JSON.stringify({ mem: await page.evaluate(() => window.__bfxMem?.()), weight: st.weight, shape: st.shape, show: st.show, windup: st.windup.ms, strike: st.strike.ms, aftermath: st.aftermath.ms, total: st.total, measured: t + rest, before, during: [...new Set(speeds)], after }));
  } catch (e) {
    console.log('FAILED', pick, String(e.message).split('\n')[0]);
  }
  await ctx.close();
}

console.log('page errors:', errors);
await browser.close();
srv.close();
