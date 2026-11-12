// WAVE-DELAY (docs/notes/wave-delay.md): what stops a fight in the middle of a wave, how often and for how long. The owner: "There is
// still a lot of delay in the combat waves. It seems to be more often for a shorter delay. The same as before but during waves now too."
//
//   npm run web && node tools/wave-delay/delays.mjs [--waves 12] [--configs auto1,auto2,hand1,hand2] [--real] [--cpu 4] [--horn]
//
// Each config is its own page at 393x852 playing whole runs the way a player does, with five heroes past level 30:
//   auto1, auto2   both Auto switches on (the ultimates and the king's spells), at x1 and x2
//   hand1, hand2   both off: a hero's ultimate tapped when its charge is full, a spell cast when the mana is there
// Nothing is forced: charge and mana fill as they do in play. `--horn` blows the War Horn once a fight as well.
//
// While a fight is on, every stretch in which the battle's clock does not move for 250 ms or more is kept, with what was holding it on
// each frame of the stretch (an ultimate's moment and its phase, the freeze on a blow, the slow beat after it, the effects' own
// hit-stop and slow beat, an Eidolon's call, a film, a sheet, a boss changing form, or nothing). By default the page's clock is stepped
// by hand (33 ms frames), so the stretches are the game's own and the machine's speed does not blur them. With `--real` the clock is
// left alone and the CPU throttled (`--cpu`), and every frame over 100 ms is kept too, with what the frame did: the pictures handed
// to the graphics card in it (how many, how large, how long that took) and what the effects' atlas book released.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire(existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/' : import.meta.url)('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PORT = Number(process.env.PORT ?? 8721);
const OUT = process.env.OUT ?? 'out/wave-delay';
const root = process.env.ROOT ?? 'out/web';
const WAVES = Number(opt('--waves', '12'));
const CONFIGS = opt('--configs', 'auto1,auto2,hand1,hand2').split(',').filter(Boolean);
const REAL = args.includes('--real');
const CPU = Number(opt('--cpu', REAL ? '4' : '1'));
const HORN = args.includes('--horn');
/** `--work`: the stepped clock, with every frame drawn and its own work timed (the frame and its drawing, on this machine's CPU: a
 *  phone's is four to six times slower); a frame whose work is over `WORK_MS` in a fight is kept, with the pictures handed to the
 *  graphics card in it and what the atlas book held before and after. */
const WORK = args.includes('--work');
const WORK_MS = Number(opt('--work-ms', '25'));
const HOLD_MS = 250;
const LONG_MS = 100;
mkdirSync(OUT, { recursive: true });

const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const PINNED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ ...(existsSync(PINNED) ? { executablePath: PINNED } : {}), args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

const units = readFileSync('src/sim/units.ts', 'utf8');
const list = (name) => [...(units.match(new RegExp(`export const ${name}[^=]*= \\[([^\\]]*)\\]`))?.[1] ?? '').matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]);
const HEROES = [...new Set([...list('HEROES'), ...list('ALL_HEROES')])];
const ARMIES = ['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'];
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
let seed = 0x51ed270b;
const rnd = () => ((seed = (Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;

/** In the page: the recorder. */
function inPage([HOLD, LONG, REAL, WORK, WORK_MS]) {
  const wd = (window.__wd = { holds: [], long: [], fightMs: 0, ticks: 0, x1Ms: 0, clock: 0, cur: null, tex: { n: 0, ms: 0, px: 0 }, bfx: null, errors: [] });
  window.addEventListener('error', (e) => wd.errors.push(String(e.message)));
  /** What holds the fight on this frame, most particular first. */
  const cause = (g) => {
    const b = g.b;
    const q = g.ultm.queue;
    const m = q.current;
    const by = g.ultAutoOn?.() ? 'Auto' : 'by hand';
    if (g.sceneHold > 0) return 'a film or card (sceneHold)';
    if (g.hud?.holding) return 'a skill sheet open';
    if (g.eid?.sheetOpen) return 'the horn\'s confirm';
    if (g.duelShow?.holding) return 'a duel\'s walk-in';
    if (m && q.stopLeft > 0) return `an ultimate's moment: the freeze on the blow (${by})`;
    if (m && q.holdsBattle) return `an ultimate's moment: ${q.phase === 'open' ? 'wind-up' : q.phase === 'show' ? 'showcase' : 'strike held'} (${by})`;
    if (g.eid?.holds) return 'an Eidolon\'s call';
    if (b.pause) return 'a boss changing form (the sim\'s pause)';
    if (g.fx?.stopLeft > 0) return 'the effects\' hit-stop (a heavy blow or a kill)';
    if (g.fx?.slowLeft > 0) return 'the effects\' slow beat (a boss\'s fall)';
    if (m && q.rate < 1) return `an ultimate's moment: the slow beat after the blow (${by})`;
    if (g.intro) return 'a boss\'s card';
    return 'nothing holding';
  };
  const close = () => {
    const c = wd.cur;
    wd.cur = null;
    if (c && c.ms >= HOLD) wd.holds.push({ ms: Math.round(c.ms), at: c.at, causes: Object.fromEntries(Object.entries(c.causes).map(([k, v]) => [k, Math.round(v)])) });
  };
  /** One frame seen: `dt` ms of the page's clock since the last. */
  window.__seen = (dt) => {
    const g = window.__game;
    const b = g?.b;
    if (!b || b.phase !== 'fight' || g.homeUp || g.standOn || wd.hidden) return close();
    wd.fightMs += dt;
    if (g.ultm.queue.current || g.eid?.long) wd.x1Ms += dt;
    if (!wd.cur || wd.cur.tick !== b.t) {
      if (wd.cur) wd.ticks += Math.max(0, b.t - wd.cur.tick) / 100;
      close();
      wd.cur = { tick: b.t, at: b.t, ms: 0, causes: {} };
    } else {
      wd.cur.ms += dt;
      const c = cause(g);
      wd.cur.causes[c] = (wd.cur.causes[c] ?? 0) + dt;
    }
    // (a long frame, on a real clock: what it carried)
    if (REAL && dt > LONG) {
      const mem = window.__bfxMem?.();
      wd.long.push({ ms: Math.round(dt), at: b.t, cause: cause(g), tex: { ...wd.tex, ms: Math.round(wd.tex.ms) }, bfx: mem ? { held: mem.held, up: +mem.uploadedMB.toFixed(1), was: wd.bfx?.up ?? null } : null, task: wd.task ?? 0 });
    }
    const mem = window.__bfxMem?.();
    if (mem) wd.bfx = { up: +mem.uploadedMB.toFixed(1), held: mem.held };
    wd.tex = { n: 0, ms: 0, px: 0 };
    wd.task = 0;
  };
  wd.work = [];
  wd.texAll = { n: 0, ms: 0, px: 0, big: 0 };
  wd.frames = 0;
  wd.workMs = 0;
  wd.releases = 0;
  window.__run = (ms) => {
    const g = window.__game;
    for (let t = 0; t < ms; t += 33) {
      const t0 = performance.now();
      try { g.frame(33, 33); } catch (err) { wd.errors.push(String(err?.message ?? err)); }
      if (WORK) {
        g.app.render();
        const took = performance.now() - t0;
        const b = g.b;
        if (b?.phase === 'fight' && b.t > 300) {
          const mem = window.__bfxMem?.();
          const up = mem ? +mem.uploadedMB.toFixed(1) : null;
          wd.frames++;
          wd.workMs += took;
          wd.texAll.n += wd.tex.n;
          wd.texAll.ms += wd.tex.ms;
          wd.texAll.px += wd.tex.px;
          if (wd.tex.px > 250000) wd.texAll.big++;
          if (up !== null && wd.upWas != null && up < wd.upWas) wd.releases++;
          if (took > WORK_MS) wd.work.push({ ms: Math.round(took), at: b.t, cause: cause(g), tex: { n: wd.tex.n, ms: Math.round(wd.tex.ms), px: wd.tex.px }, up, upWas: wd.upWas ?? null, held: mem?.held ?? null, units: b.units.length });
          wd.upWas = up;
        }
      }
      window.__seen(33);
    }
    if (!WORK) g.app.render();
  };
  if (REAL) {
    let last = performance.now();
    const loop = () => {
      const now = performance.now();
      window.__seen(now - last);
      last = now;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) wd.task = Math.max(wd.task ?? 0, Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] });
    } catch { /* (no long-task timing) */ }
  }
  /** The pictures handed to the graphics card: counted and timed, once the game's renderer is there. */
  window.__hookGl = () => {
    const gl = window.__game?.app?.renderer?.gl;
    if (!gl || gl.__hooked) return;
    gl.__hooked = true;
    for (const name of ['texImage2D', 'texSubImage2D']) {
      const real = gl[name].bind(gl);
      gl[name] = (...a) => {
        const t0 = performance.now();
        real(...a);
        const src = a[a.length - 1];
        wd.tex.n++;
        wd.tex.ms += performance.now() - t0;
        wd.tex.px += (src?.width ?? src?.naturalWidth ?? 0) * (src?.height ?? src?.naturalHeight ?? 0);
        // (a large one, in a fight: which picture it was, and how long the hand-over took)
        const w = src?.width ?? src?.naturalWidth ?? 0;
        const h = src?.height ?? src?.naturalHeight ?? 0;
        const b = window.__game?.b;
        if (w * h > 250000 && b?.phase === 'fight' && b.t > 300) {
          const what = `${src?.constructor?.name ?? typeof src} ${w}x${h}${src?.src ? ` ${String(src.src).startsWith('data:') ? 'data:' + String(src.src).length : String(src.src).split('/').slice(-2).join('/')}` : ''}`;
          const e = (wd.big ??= {})[what] ?? (wd.big[what] = { n: 0, ms: 0, at: [] });
          e.n++;
          e.ms += performance.now() - t0;
          if (e.at.length < 6) e.at.push(b.t);
        }
      };
    }
  };
}

async function play(config) {
  const auto = config.startsWith('auto');
  const speed = Number(config.slice(-1)) || 1;
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message)));
  await page.addInitScript(inPage, [HOLD_MS, LONG_MS, REAL, WORK, WORK_MS]);
  await page.addInitScript(([owned, xp, auto]) => {
    if (sessionStorage.getItem('wd-set')) return;
    sessionStorage.setItem('wd-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 99999, unlocked: owned, party: owned.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, chapel: true, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 30, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'], ultAuto: auto, spellAuto: auto, ultSeen: Object.fromEntries(owned.map((k) => [k, 1])), eidolons: { horn: 1000, bound: ['askel'], chosen: 'askel', confirmed: true } }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 2, quips: false }));
  }, [HEROES, xpAt(34), auto]);
  await page.goto(`http://localhost:${PORT}/`, { timeout: 240000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 240000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { document.getElementById('tipSkip')?.click(); window.__hookGl(); });
  await page.mouse.click(4, 4);
  if (CPU > 1) await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const step = async (ms) => (REAL ? page.waitForTimeout(ms) : page.evaluate((ms) => window.__run(ms), ms));
  let waves = 0;
  let fresh = true;
  let n = CONFIGS.indexOf(config) * 2;
  const begun = Date.now();
  while (waves < WAVES && Date.now() - begun < 25 * 60000) {
    if (fresh) {
      const party = [];
      while (party.length < 5) { const k = HEROES[Math.floor(rnd() * HEROES.length)]; if (!party.includes(k)) party.push(k); }
      await page.evaluate((o) => {
        const g = window.__game;
        for (const el of document.querySelectorAll('.rvRow button:last-child')) el.click();
        g.closeResult?.();
        if (g.meta.eidolons) Object.assign(g.meta.eidolons, { horn: 1000, confirmed: true });
        const r = JSON.parse(JSON.stringify(g.run));
        Object.assign(r, { seed: o.seed, mode: { kind: 'army', army: o.army }, stage: o.stage, over: false, cleared: false, gold: 0, event: undefined, tower: undefined, rift: undefined, duel: undefined, roster: o.party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
        document.getElementById('home').hidden = true;
        g.startRun(r);
      }, { party, army: ARMIES[n % ARMIES.length], stage: 6 + ((n * 5) % 14), seed: 1000 + Math.floor(rnd() * 1e6) });
      n++;
      await page.waitForTimeout(REAL ? 800 : 150);
    }
    await page.evaluate(([speed, REAL]) => {
      const g = window.__game;
      g.autoArrange(true);
      if (!REAL) { g.app.ticker.stop(); window.__run(300); }
      document.getElementById('bossCard')?.click();
      document.getElementById('fight').click();
      g.speed = speed;
      if (!REAL) g.app.ticker.stop();
    }, [speed, REAL]);
    // (the fight: the player's taps, nothing forced)
    for (let i = 0; i < 600; i++) {
      await step(400 + Math.round(rnd() * 300));
      const phase = await page.evaluate(([auto, horn, r1, r2]) => {
        const g = window.__game;
        const b = g.b;
        if (b.phase !== 'fight') return b.phase;
        document.getElementById('bossCard')?.click();
        for (const el of document.querySelectorAll('.rvRow button:last-child')) el.click();
        if (!auto) {
          // (a hero whose ultimate is ready is tapped, as a player taps the lit row)
          for (const u of b.units.filter((x) => x.alive && x.side === 'hero' && x.owner === undefined && (x.charge2 ?? 0) >= 100)) document.querySelector(`.fhRow[data-unit="${u.id}"]`)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          // (and a spell cast when one can be)
          if (r1 < 0.5 && b.spells) {
            const foes = b.units.filter((u) => u.side === 'foe' && u.alive);
            const to = foes[Math.floor(r2 * foes.length)];
            for (const id of Object.keys(g.meta.spellbook?.equipped ?? {}).length ? Object.values(g.meta.spellbook.equipped) : ['fireball', 'lightning', 'smite', 'frost']) {
              if (to && typeof id === 'string' && window.__castSpell(b, id, to.u, to.v)) { g.glanceAt?.(id, to.u, to.v); break; }
            }
          }
        }
        if (horn && b.t > 4000 && !g.eid.p) { const h = document.querySelector('.ehFight'); if (h && !h.hidden) h.click(); }
        return b.phase;
      }, [auto, HORN, rnd(), rnd()]);
      if (phase !== 'fight') break;
    }
    waves++;
    // (the wave's end, as a player goes on)
    await page.evaluate(() => { window.__endB = window.__game.b; });
    let on = false;
    for (let i = 0; i < 60 && !on; i++) {
      await step(500);
      const at = await page.evaluate(() => {
        const g = window.__game;
        const vis = (el) => !!el && !el.hidden && el.offsetParent !== null;
        if (g.b !== window.__endB && g.b.phase === 'deploy' && !(window.__screens?.() ?? []).length && !g.homeUp) return 'next';
        for (const el of document.querySelectorAll('.rvRow button:last-child')) el.click();
        const r = document.getElementById('result');
        if (vis(r)) {
          r.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          const next = document.getElementById('next');
          if (vis(next) && !g.passing) next.click();
        }
        return g.homeUp || ((g.run.over || g.run.cleared) && !vis(r)) ? 'over' : 'wait';
      });
      if (at === 'next') on = true;
      if (at === 'over') break;
    }
    fresh = !on;
  }
  const got = await page.evaluate(() => { const w = window.__wd; return { holds: w.holds, long: w.long, fightMs: Math.round(w.fightMs), ticks: Math.round(w.ticks), x1Ms: Math.round(w.x1Ms), errors: w.errors, bfx: window.__bfxMem?.() ?? null, work: w.work, big: w.big ?? {}, texAll: w.texAll, frames: w.frames, workMs: Math.round(w.workMs), releases: w.releases }; });
  await ctx.close().catch(() => {});
  return { config, waves, ...got, pageErrors: errs };
}

const mid = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);
const results = [];
// (one page at a time on a real clock, so the pages do not slow each other; all at once when the clock is stepped)
if (REAL || WORK) for (const c of CONFIGS) results.push(await play(c));
else results.push(...(await Promise.all(CONFIGS.map(play))));
writeFileSync(`${OUT}/delays${REAL ? '-real' : WORK ? '-work' : ''}.json`, JSON.stringify(results, null, 1));
for (const r of results) {
  console.log(`\n== ${r.config}: ${r.waves} waves, ${(r.fightMs / 1000).toFixed(0)} s of fight on the page's clock, the battle's clock moved ${(r.ticks / 10).toFixed(0)} s; held to x1 by a show for ${(r.x1Ms / 1000).toFixed(0)} s; errors ${r.errors.length + r.pageErrors.length}`);
  // (each stop under the cause that held it longest)
  const by = new Map();
  for (const h of r.holds) {
    const main = Object.entries(h.causes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'nothing holding';
    by.set(main, [...(by.get(main) ?? []), h.ms]);
  }
  console.log(`   stops of ${HOLD_MS} ms or more: ${r.holds.length} (${(r.holds.length / Math.max(1, r.waves)).toFixed(1)} a wave), ${(r.holds.reduce((n, h) => n + h.ms, 0) / 1000).toFixed(0)} s in all`);
  for (const [k, v] of [...by].sort((a, b) => b[1].reduce((n, x) => n + x, 0) - a[1].reduce((n, x) => n + x, 0))) console.log(`   ${String(v.length).padStart(4)} x  ${(v.length / Math.max(1, r.waves)).toFixed(1).padStart(5)} a wave  middle ${String(mid(v)).padStart(5)} ms  worst ${String(Math.max(...v)).padStart(5)} ms  | ${k}`);
  if (WORK) {
    const w = r.work;
    console.log(`   frames drawn in fights: ${r.frames}, their work ${(r.workMs / Math.max(1, r.frames)).toFixed(1)} ms each on this machine; over ${WORK_MS} ms: ${w.length} (${(w.length / Math.max(1, r.waves)).toFixed(1)} a wave), middle ${mid(w.map((x) => x.ms))} ms, worst ${Math.max(0, ...w.map((x) => x.ms))} ms`);
    console.log(`   pictures handed to the graphics card in fights: ${r.texAll.n} (${(r.texAll.px / 1e6).toFixed(1)} M px, ${Math.round(r.texAll.ms)} ms in all); frames carrying 0.25 M px or more: ${r.texAll.big} (${(r.texAll.big / Math.max(1, r.waves)).toFixed(1)} a wave); frames after which the atlas book held less on the card (a release): ${r.releases}`);
    const up = w.filter((x) => x.tex.px > 250000);
    console.log(`   slow frames carrying 0.25 M px or more: ${up.length}, middle ${mid(up.map((x) => x.ms))} ms (the hand-over itself middle ${mid(up.map((x) => x.tex.ms))} ms, worst ${Math.max(0, ...up.map((x) => x.tex.ms))} ms)`);
    console.log('   the large pictures handed over in fights, by picture:');
    for (const [k, v] of Object.entries(r.big).sort((a, b) => b[1].ms - a[1].ms).slice(0, 25)) console.log(`      ${String(v.n).padStart(3)} x  ${String(Math.round(v.ms / v.n)).padStart(4)} ms each  ${k}  (at t ${v.at.join(', ')})`);
    for (const l of [...w].sort((a, b) => b.ms - a.ms).slice(0, 8)) console.log(`      ${l.ms} ms at t ${l.at}: ${l.cause}; pictures ${l.tex.n} (${(l.tex.px / 1e6).toFixed(2)} M px, ${l.tex.ms} ms); atlas book on the card ${l.upWas} -> ${l.up} MB, ${l.held} held; ${l.units} fighters`);
  }
  if (REAL) {
    const fr = r.long.filter((l) => l.cause === 'nothing holding' || true);
    console.log(`   frames over ${LONG_MS} ms: ${fr.length} (${(fr.length / Math.max(1, r.waves)).toFixed(1)} a wave), middle ${mid(fr.map((l) => l.ms))} ms, worst ${Math.max(0, ...fr.map((l) => l.ms))} ms`);
    const up = fr.filter((l) => l.tex.px > 250000);
    console.log(`   of those, carrying a picture of 0.25 M px or more to the graphics card: ${up.length} (middle ${mid(up.map((l) => l.ms))} ms; the upload itself middle ${mid(up.map((l) => l.tex.ms))} ms, worst ${Math.max(0, ...up.map((l) => l.tex.ms))} ms)`);
    console.log(`   and with the atlas book's uploaded MB fallen since the frame before (a release): ${fr.filter((l) => l.bfx && l.bfx.was !== null && l.bfx.up < l.bfx.was).length}`);
    for (const l of [...fr].sort((a, b) => b.ms - a.ms).slice(0, 6)) console.log(`      ${l.ms} ms at t ${l.at}: ${l.cause}; pictures ${l.tex.n} (${(l.tex.px / 1e6).toFixed(2)} M px, ${l.tex.ms} ms); atlas book ${JSON.stringify(l.bfx)}; longest task ${l.task} ms`);
  }
}
await browser.close();
srv.close();
