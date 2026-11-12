// FREEZE-FIX soak (docs/notes/freeze-fix.md): plays fights back to back on a throttled phone-sized page, four ways at once, and watches for
// a fight that stops. The owner's report: "The game is freezing now. Seemingly random in a wave".
//
//   npm run web && node tools/freeze-fix/soak.mjs [--waves 200] [--cpu 4] [--modes auto,hand,horn,spells] [--faults 1] [--minutes 40]
//
// Each mode is its own page (393x852, touch, CPU throttled):
//   auto    both Auto switches on (the ultimates and the king's spells fire on their own; short banners)
//   hand    ultimates fired by hand the moment they are ready, often two at once (the queue)
//   horn    the War Horn blown each fight (the six Eidolons in turn), ultimates by hand as well
//   spells  the king's spells cast by hand, with ultimates and the horn besides
// Every fight takes the next army, a stage and a speed (x1, x2, x3) in turn. While it plays the driver hides and shows the tab (the page's
// animation frames held back, as a hidden tab's are), taps to skip shows, and (with --faults) makes some effect sheets fail or arrive
// seconds late.
//
// A watchdog in the page looks every animation frame and flags: (a) the battle's clock not moving for 12 real seconds while a fight is on,
// the tab is shown and no card is up; (b) one frame longer than 2 s; (c) a page error, an unhandled rejection, a lost graphics context.
// On a flag the state is dumped (the show, its stage, the queue, every hold) with a screenshot under OUT, and a new fight is begun.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire(existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/' : import.meta.url)('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PORT = Number(process.env.PORT ?? 8711);
const OUT = process.env.OUT ?? 'out/freeze-fix';
const WAVES = Number(opt('--waves', '200'));
const CPU = Number(opt('--cpu', '4'));
const MODES = opt('--modes', 'auto,hand,horn,spells').split(',').filter(Boolean);
const FAULTS = opt('--faults', '1') !== '0';
const MINUTES = Number(opt('--minutes', '40'));
const STALL_MS = 12000;
/** The fight's own clock held this long by shows that are themselves moving (ms of the game's time): flagged apart, as `heldLong`. */
const HELD_MS = Number(opt('--held', '20000'));
/** The page's clock stepped by hand (the default: thirty frames a second of the game's own time, as fast as the machine can, so a logic freeze
 *  shows whatever the machine's speed), or left to real time (`--real`: slow under a software renderer, but the frames are real). */
const STEPPED = !args.includes('--real');
/** Whole runs, wave after wave through the game's own wave-end flow (the default: the owner's freeze was between two waves); `--fresh`
 *  begins every fight as a new run instead. */
const RUNS = STEPPED && !args.includes('--fresh');
/** The longest the wave-end flow may take to show something (the result, or the next deploy), ms of the game's time. */
const END_MS = Number(opt('--end', '8000'));
/** One frame's own work (ms, stepped clock) that is kept as a slow frame; and the party: new heroes every fight, or the same five (`--party fixed`). */
const SLOW_MS = Number(opt('--slow', '250'));
const FIXED = opt('--party', 'random') === 'fixed';
const DPR = Number(opt('--dpr', '1'));
/** A frame this long is flagged (ms): 2 s by the brief; the software renderer here needs more room when several pages run at once. */
const LONG_MS = Number(opt('--long', '2000'));
mkdirSync(OUT, { recursive: true });

const root = process.env.ROOT ?? 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const PINNED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ ...(existsSync(PINNED) ? { executablePath: PINNED } : {}), args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

// (the save: every hero owned and past level 30, so each has its ultimate; the six Eidolons bound and the horn full)
const units = readFileSync('src/sim/units.ts', 'utf8');
const list = (name) => [...(units.match(new RegExp(`export const ${name}[^=]*= \\[([^\\]]*)\\]`))?.[1] ?? '').matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]);
const HEROES = [...new Set([...list('HEROES'), ...list('ALL_HEROES'), ...list('MYTHIC_KINDS')])];
const ARMIES = ['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'];
const EIDOLONS = ['askel', 'nivra', 'aurelan', 'voltara', 'gorm', 'vaelkhar'];
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
let seed = 0x9e3779b9;
const rnd = () => ((seed = (Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
const pick = (a) => a[Math.floor(rnd() * a.length)];

const totals = { waves: 0, flags: [], slow: [], ends: [], endsDown: 0, endsLost: 0, faults: { failed: 0, late: 0 }, hides: 0, skips: 0, ults: 0, horns: 0, spells: 0 };

/** The watchdog and the hidden-tab stand-in, put in the page before the game loads. */
function inPage([STALL, LONG, HELD, SLOW]) {
  const wd = (window.__wd = { flags: [], longest: 0, hidden: false, quiet: 0, last: performance.now(), tick: -1, moved: performance.now(), frames: 0 });
  // (a hidden tab's animation frames do not fire: held back here and let go when the tab is "shown" again)
  const raf = window.requestAnimationFrame.bind(window);
  let held = [];
  window.requestAnimationFrame = (cb) => (wd.hidden ? (held.push(cb), 0) : raf(cb));
  window.__hide = (on) => {
    wd.hidden = on;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => on });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (on ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
    if (!on) {
      wd.quiet = performance.now() + 1500;
      const go = held;
      held = [];
      for (const cb of go) raf(cb);
    }
  };
  const flag = (kind, more) => wd.flags.length < 20 && wd.flags.push({ kind, at: Math.round(performance.now()), ...more, state: window.__dump?.() });
  window.addEventListener('error', (e) => flag('error', { message: String(e.message) }));
  window.addEventListener('unhandledrejection', (e) => flag('rejection', { message: String(e.reason?.message ?? e.reason) }));
  document.addEventListener('webglcontextlost', () => flag('contextlost', {}), true);
  // (the graphics memory the page's textures hold, MB, as four bytes a pixel: what a phone's GPU must find room for)
  window.__gpu = () => {
    const list = window.__game?.app?.renderer?.texture?.managedTextures ?? [];
    let px = 0;
    for (const t of list) if (t) px += (t.pixelWidth ?? t.width ?? 0) * (t.pixelHeight ?? t.height ?? 0);
    // (and how many things are on the stage, and elements on the page: a leak shows as either climbing fight after fight)
    let nodes = 0;
    const walk = (c) => { nodes++; for (const k of c.children ?? []) walk(k); };
    if (window.__game?.app?.stage) walk(window.__game.app.stage);
    return { textures: list.length, mb: Math.round((px * 4) / 1e6), heap: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1e6), nodes, dom: document.getElementsByTagName('*').length };
  };
  window.__dump = () => {
    const g = window.__game;
    if (!g) return null;
    const b = g.b;
    const q = g.ultm?.queue;
    const p = g.eid?.p;
    return {
      phase: b?.phase, t: b?.t, pause: b?.pause, area: b?.board?.area, acc: Math.round(g.acc), speed: g.speed, ticker: g.app?.ticker?.started,
      homeUp: g.homeUp, standOn: g.standOn, auto: !!g.auto, sceneHold: g.sceneHold, hudHolding: g.hud?.holding, eidSheet: g.eid?.sheetOpen, eidHolds: g.eid?.holds,
      duelHolding: g.duelShow?.holding, revive: g.revive ? { started: g.revive.started } : null, intro: !!g.intro, endWait: Math.round(g.endWait ?? 0),
      queue: q ? { phase: q.phase, left: Math.round(q.left), stopLeft: Math.round(q.stopLeft), since: q.since, stage: q.stageName, clock: Math.round(q.clock), waiting: q.waiting, holds: q.holdsBattle, current: q.current ? { unit: q.current.unit, kind: q.current.kind, name: q.current.name, shape: q.current.shape, show: q.current.show, stages: q.current.stages } : null } : null,
      eidolon: p ? { id: p.e.id, t: Math.round(p.t), releasing: p.releasing, struckDone: p.struckDone, shot: p.shot, stopLeft: Math.round(p.stopLeft), beats: p.beats, resume: p.m.RESUME } : null,
      alive: b ? { heroes: b.units.filter((u) => u.alive && u.side === 'hero').length, foes: b.units.filter((u) => u.alive && u.side === 'foe').length } : null,
      result: !document.getElementById('result')?.hidden, screens: window.__screens?.() ?? [],
      waveEnd: { settled: g.settled, passing: g.passing ? { ...g.passing } : null, jr: !!g.jr, move: document.body.dataset.move ?? null, reveal: !!g.destinationReveal, resultDone: g.resultDone, heldReveals: g.heldReveals?.length, eidPlaying: g.eid?.playing, duelEnding: g.duelShow?.ending, stage: g.run?.stage, over: g.run?.over, cleared: g.run?.cleared },
    };
  };
  // (the longest single task, which a long frame is nearly always made of)
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.duration > (wd.task ?? 0)) wd.task = Math.round(e.duration); }).observe({ entryTypes: ['longtask'] });
  } catch { /* (no long-task timing here) */ }
  // (the stepped clock: `ms` of the game's time in frames of 33 ms, the stall counted on that clock; one picture drawn at the end)
  wd.clock = 0;
  wd.stepMoved = 0;
  wd.stepTick = -1;
  window.__run = (ms) => {
    const g = window.__game;
    const t0 = performance.now();
    for (let t = 0; t < ms; t += 33) {
      const f0 = performance.now();
      // (the page's own ticker catches a frame's fault and goes on to the next; a fault that comes back every frame holds the fight for good)
      try {
        g.frame(33, 33);
      } catch (err) {
        wd.faults = (wd.faults ?? 0) + 1;
        if (wd.faults <= 5 || wd.faults % 500 === 0) flag('frameError', { message: String(err?.stack ?? err).slice(0, 400), count: wd.faults });
      }
      const took = performance.now() - f0;
      if (took > (wd.slowest ?? 0)) wd.slowest = Math.round(took);
      // (one frame's own work this long is a hitch on this machine and a freeze on a phone: kept, with what was going on)
      if (took > SLOW && wd.clock > 500) {
        const q = g.ultm?.queue;
        (wd.slow ??= []).push({ ms: Math.round(took), phase: g.b?.phase, t: g.b?.t, area: g.b?.board?.area, show: q?.current ? `${q.current.kind} ${q.phase}` : '', eidolon: g.eid?.p ? `${g.eid.p.e.id} ${g.eid.p.shot}` : '', units: g.b?.units.length });
      }
      wd.clock += 33;
      const b = g.b;
      const fighting = !!b && b.phase === 'fight' && !g.homeUp && !g.standOn;
      // (the fight's clock, and everything that may rightly hold it for a while: a show's or a call's own clock)
      const q = g.ultm?.queue;
      const sign = `${b?.t}|${q?.seq}|${Math.round(q?.clock ?? 0)}|${Math.round(g.eid?.p?.t ?? -1)}|${g.eid?.p?.stopLeft ?? 0}`;
      if (!fighting || sign !== wd.stepSign) {
        wd.stepSign = sign;
        wd.stepMoved = wd.clock;
      } else if (wd.clock - wd.stepMoved > STALL) {
        flag((window.__screens?.() ?? []).length || !document.getElementById('result')?.hidden ? 'cardUp' : 'stall', { ms: Math.round(wd.clock - wd.stepMoved) });
        wd.stepMoved = wd.clock + 1e9;
      }
      // (shows one after another holding the fight: not a stall, but the fight has not moved for a long while)
      if (!fighting || b.t !== wd.stepTick) {
        wd.stepTick = b?.t ?? -1;
        wd.heldFrom = wd.clock;
      } else if (wd.clock - wd.heldFrom > HELD) {
        flag('heldLong', { ms: Math.round(wd.clock - wd.heldFrom) });
        wd.heldFrom = wd.clock + 1e9;
      }
    }
    g.app.render();
    return Math.round(performance.now() - t0);
  };
  const loop = () => {
    const now = performance.now();
    const gap = now - wd.last;
    wd.last = now;
    wd.frames++;
    const g = window.__game;
    const b = g?.b;
    const fighting = !!b && b.phase === 'fight' && !g.homeUp && !g.standOn;
    if (fighting && !wd.hidden && now > wd.quiet) {
      wd.fightFrames = (wd.fightFrames ?? 0) + 1;
      wd.fightMs = (wd.fightMs ?? 0) + Math.min(gap, 5000);
    }
    if (now > wd.quiet && !wd.hidden && !wd.stepped) {
      if (gap > wd.longest) wd.longest = gap;
      if (gap > LONG) flag('longFrame', { ms: Math.round(gap) });
    }
    if (wd.stepped || !fighting || wd.hidden || now < wd.quiet || b.t !== wd.tick) {
      wd.tick = b?.t ?? -1;
      wd.moved = now;
    } else if (now - wd.moved > STALL) {
      // (a card waiting for the player's tap holds the fight by design: noted apart)
      flag((window.__screens?.() ?? []).length || !document.getElementById('result')?.hidden ? 'cardUp' : 'stall', { ms: Math.round(now - wd.moved) });
      wd.moved = now + 1e9;
    }
    raf(loop);
  };
  raf(loop);
  // (and from a timer too: a page whose frames have stopped altogether is still seen)
  setInterval(() => {
    const now = performance.now();
    if (!wd.stepped && !wd.hidden && now > wd.quiet && now - wd.last > 4000) {
      flag('noFrames', { ms: Math.round(now - wd.last) });
      wd.last = now;
    }
  }, 1000);
}

async function open(mode) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message)));
  // (what the page logs as an error: a frame's fault is caught there and logged, not thrown)
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text()) && errs.push(`console: ${m.text().slice(0, 300)}`));
  if (FAULTS)
    await page.route(/\/(fx\/blender|eidolons\/fx)\/.*\.webp$/, async (route) => {
      const r = rnd();
      if (r < 0.08) { totals.faults.failed++; return route.abort(); }
      if (r < 0.3) { totals.faults.late++; await new Promise((ok) => setTimeout(ok, 1500 + rnd() * 5000)); }
      return route.continue().catch(() => {});
    });
  await page.addInitScript(inPage, [STALL_MS, LONG_MS, HELD_MS, SLOW_MS]);
  await page.addInitScript(([owned, xp, mode, eidolons]) => {
    if (sessionStorage.getItem('soak-set')) return;
    sessionStorage.setItem('soak-set', '1');
    localStorage.clear();
    const auto = mode === 'auto';
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 99999, unlocked: owned, party: owned.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, chapel: true, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 30, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'], ultAuto: auto, spellAuto: auto, ultSeen: Object.fromEntries(owned.map((k) => [k, 1])), eidolons: { horn: 1000, bound: eidolons, chosen: eidolons[0], confirmed: true } }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 2, quips: false }));
  }, [HEROES, xpAt(34), mode, EIDOLONS]);
  await page.goto(`http://localhost:${PORT}/`, { timeout: 240000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 240000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  // (a real tap, so the page's sound starts as it does under a player's finger and the sound's own code runs)
  await page.mouse.click(4, 4);
  // (the page's own start-up is not a fight: what it took is not flagged)
  await page.evaluate((stepped) => { window.__wd.flags.length = 0; window.__wd.longest = 0; window.__wd.stepped = stepped; }, STEPPED);
  const cdp = await ctx.newCDPSession(page);
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  return { ctx, page, errs };
}

/** Begin a fight: the next army, stage, speed and five heroes with ultimates. */
async function begin(page, n, mode) {
  const party = FIXED ? ['knight', 'wizard', 'archer', 'cleric', 'samurai'] : [];
  while (party.length < 5) {
    const k = pick(HEROES);
    if (!party.includes(k)) party.push(k);
  }
  const o = { party, army: ARMIES[n % ARMIES.length], // (every third run is a hard one, deep in the army, so heroes fall, lives are spent and waves end with a fallen hero counting down)
  stage: RUNS ? (n % 3 === 2 ? 24 + (n % 5) : 1 + ((n * 4) % 11)) : 2 + ((n * 7) % 28), speed: 1 + (n % 3), seed: 1000 + Math.floor(rnd() * 1e6), eid: EIDOLONS[n % EIDOLONS.length] };
  await page.evaluate((o) => {
    const g = window.__game;
    // (a card that is up is closed by its own button, as a player would)
    for (const el of document.querySelectorAll('.rvRow button:last-child')) el.click();
    g.closeResult?.();
    if (g.meta.eidolons) Object.assign(g.meta.eidolons, { horn: 1000, chosen: o.eid, confirmed: true });
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: o.seed, mode: { kind: 'army', army: o.army }, stage: o.stage, over: false, cleared: false, gold: 0, event: undefined, tower: undefined, rift: undefined, duel: undefined, roster: o.party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, o);
  await page.waitForTimeout(STEPPED ? 150 : 500);
  if (STEPPED) await page.evaluate(() => (window.__game.app.ticker.stop(), window.__run(400)));
  await page.evaluate((o) => {
    const g = window.__game;
    document.getElementById('bossCard')?.click();
    document.getElementById('fight').click();
    g.speed = o.speed;
    if (window.__wd.stepped) g.app.ticker.stop();
  }, o);
  return o;
}

/** One look at a fight, and something done to it by the mode. */
async function poke(page, mode) {
  return page.evaluate(([mode, r1, r2, r3]) => {
    const g = window.__game;
    const b = g.b;
    const out = { phase: b.phase, t: b.t, slow: (window.__wd.slow ?? []).splice(0), flags: window.__wd.flags.splice(0), longest: Math.round(window.__wd.longest), did: [] };
    if (b.phase !== 'fight' || window.__wd.hidden) return out;
    document.getElementById('bossCard')?.click();
    for (const el of document.querySelectorAll('.rvRow button:last-child')) el.click();
    const heroes = b.units.filter((u) => u.alive && u.side === 'hero' && u.owner === undefined);
    if (mode !== 'auto' && b.t > 1500 && r1 < (mode === 'hand' ? 0.5 : 0.25)) {
      // (one, and sometimes two at once: the queue)
      for (const u of heroes.slice().sort(() => r2 - 0.5).slice(0, r1 < 0.15 ? 2 : 1)) {
        u.charge2 = 100;
        document.querySelector(`.fhRow[data-unit="${u.id}"]`)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        out.did.push('ult');
      }
    }
    if ((mode === 'horn' || mode === 'spells') && b.t > 2500 && r3 < 0.35 && !g.eid.p) {
      const h = document.querySelector('.ehFight');
      if (h && !h.hidden) { h.click(); out.did.push('horn'); }
      // (a confirm, if one came up)
      document.querySelector('.ehRow .primary')?.click();
    }
    if (mode === 'spells' && b.spells && r2 < 0.5) {
      b.spells.mana = 10;
      const foes = b.units.filter((u) => u.side === 'foe' && u.alive);
      const to = foes[Math.floor(r3 * foes.length)];
      const ids = ['meteor', 'fireball', 'blizzard', 'lightning', 'smite', 'frost', 'firewall', 'chain', 'deepfreeze', 'cleanse'].sort(() => r1 - 0.5);
      for (const id of ids) {
        if (to && window.__castSpell(b, id, to.u, to.v)) { g.glanceAt?.(id, to.u, to.v); out.did.push('spell'); break; }
      }
    }
    // (a tap to skip a show, now and then)
    if (r3 > 0.9) {
      const layer = document.querySelector('.umLayer.live:not([hidden]), .ecLayer:not([hidden])');
      if (layer) { layer.dispatchEvent(new MouseEvent('click', { bubbles: true })); out.did.push('skip'); }
    }
    return out;
  }, [mode, rnd(), rnd(), rnd()]);
}

/** A wave has ended. The game's own flow must show something within `END_MS` (the result's card, or the next wave's deploy; a fall a
 *  heart revives resumes the fight). Then the player's part: the card tapped, the way on pressed, whatever card comes up closed by its
 *  own button, until the next wave's deploy is up. True when the run goes on to another wave. */
async function waveEnd(page, mode, o, note) {
  const look = () => page.evaluate(() => {
    const g = window.__game;
    const vis = (el) => !!el && !el.hidden && el.offsetParent !== null;
    return { down: g.b.units.filter((u) => u.side === 'hero' && !u.alive && u.owner === undefined).length, lives: g.b.lives?.left ?? null, phase: g.b.phase, result: vis(document.getElementById('result')), screens: window.__screens?.() ?? [], over: !!g.run.over, cleared: !!g.run.cleared, home: !!g.homeUp, queue: g.ultm.queue.waiting + (g.ultm.queue.current ? 1 : 0), call: !!g.eid.playing };
  });
  await page.evaluate(() => { window.__endB = window.__game.b; });
  const first = await look();
  let ms = 0;
  let s = first;
  while (ms < 60000) {
    s = await look();
    if (s.result || s.screens.length || s.phase === 'fight' || s.phase === 'deploy' || s.home) break;
    await page.evaluate(() => window.__run(250));
    await page.waitForTimeout(5);
    ms += 250;
  }
  totals.ends.push(ms);
  // (TEN-LIVES: a wave that ended with a hero down and a life to raise it, its countdown cut short by the end)
  if (first.down > 0 && first.lives > 0) totals.endsDown++;
  if (first.phase === 'lost') totals.endsLost++;
  if (ms > END_MS) await note({ kind: 'waveEnd', ms, message: `nothing shown for ${ms} ms after the fight ended${ms >= 60000 ? ' (never, in a minute)' : ''}; as it ended: ${first.queue} shows playing or waiting, a call ${first.call}`, state: await page.evaluate(() => window.__dump()) }, o);
  if (s.phase === 'fight') return true;
  // (the player's part)
  const seen = new Set();
  for (let i = 0; i < 60; i++) {
    const at = await page.evaluate(() => {
      const g = window.__game;
      const vis = (el) => !!el && !el.hidden && el.offsetParent !== null;
      if (g.b !== window.__endB && g.b.phase === 'deploy' && !(window.__screens?.() ?? []).length && !g.homeUp) return { done: true };
      const did = [];
      for (const el of document.querySelectorAll('.rvRow button:last-child')) { el.click(); did.push('card'); }
      const r = document.getElementById('result');
      if (vis(r)) {
        r.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        did.push('result');
        const next = document.getElementById('next');
        if (vis(next) && !g.passing) { next.click(); did.push('next'); }
      }
      return { done: false, did, phase: g.b.phase, same: g.b === window.__endB, screens: window.__screens?.() ?? [], over: !!g.run.over, cleared: !!g.run.cleared, home: !!g.homeUp, result: vis(r) };
    });
    if (at.done) return true;
    for (const x of at.screens) seen.add(x);
    // (the run is over, or the game has gone somewhere this driver does not play: a new run)
    if (at.home || ((at.over || at.cleared) && !at.result)) return false;
    await page.evaluate(() => window.__run(500));
    await page.waitForTimeout(5);
    if (i === 59) {
      const stuck = !at.result && !at.screens.length;
      await note({ kind: stuck ? 'afterResult' : 'driverLost', message: `no next wave 30 s after the result; cards seen: ${[...seen].join(',') || 'none'}`, state: await page.evaluate(() => window.__dump()) }, o);
    }
  }
  return false;
}

async function soak(mode) {
  const { ctx, page, errs } = await open(mode);
  const each = Math.ceil(WAVES / MODES.length);
  const until = Date.now() + MINUTES * 60000;
  let waves = 0;
  let peak = 0;
  let n = MODES.indexOf(mode) * 3;
  let fresh = true;
  let o = null;
  const note = async (f, o) => {
    const id = `${mode}-${totals.flags.length + 1}-${f.kind}`;
    totals.flags.push({ mode, fight: o, ...f, shot: `${OUT}/${id}.png` });
    const st = f.state;
    console.log(`FLAG ${mode} ${f.kind} ${f.ms ?? ''} ${(f.message ?? '').replace(/\n/g, ' / ')} | ${o.army} stage ${o.stage} x${o.speed} ${o.party.join(',')} | t ${st?.t} phase ${st?.phase} queue ${st?.queue?.phase} left ${st?.queue?.left} waiting ${st?.queue?.waiting}${st?.queue?.current ? ` (${st.queue.current.kind} ${st.queue.stage})` : ''} eidolon ${st?.eidolon ? `${st.eidolon.id} ${st.eidolon.shot} t${st.eidolon.t} releasing ${st.eidolon.releasing}` : '-'} holds ${JSON.stringify({ scene: st?.sceneHold, hud: st?.hudHolding, sheet: st?.eidSheet, duel: st?.duelHolding, revive: st?.revive, pause: st?.pause })} screens ${st?.screens} waveEnd ${JSON.stringify(st?.waveEnd)}`);
    await page.screenshot({ path: `${OUT}/${id}.png` }).catch(() => {});
    writeFileSync(`${OUT}/flags.json`, JSON.stringify(totals.flags, null, 2));
  };
  try {
    while (waves < each && Date.now() < until) {
      if (fresh) o = await begin(page, n++, mode);
      else {
        // (the next wave of the same run, as a player goes on: set out, and the fight begun)
        const speed = 1 + (n++ % 3);
        await page.evaluate((speed) => { const g = window.__game; g.autoArrange(true); window.__run(300); document.getElementById('bossCard')?.click(); document.getElementById('fight').click(); g.speed = speed; g.app.ticker.stop(); }, speed);
        o = { ...o, speed, stage: await page.evaluate(() => window.__game.run.stage) };
      }
      const t0 = Date.now();
      let stalled = false;
      let hung = false;
      // (a fight is given three real minutes; one that takes longer is left)
      while (Date.now() - t0 < 180000 && (!STEPPED || (await page.evaluate(() => window.__game.b.t)) < 240000)) {
        if (STEPPED) {
          // (a second or so of the game's time, then a breath so loads and timers get their turn)
          const took = await Promise.race([page.evaluate((ms) => window.__run(ms), 500 + Math.round(rnd() * 700)), new Promise((ok) => setTimeout(() => ok(-1), 60000))]);
          if (took === -1) { await note({ kind: 'hung', state: null }, o); stalled = true; hung = true; break; }
          await page.waitForTimeout(15);
        } else await page.waitForTimeout(400 + rnd() * 500);
        const s = await poke(page, mode);
        for (const sl of s.slow) {
          totals.slow.push({ mode, fight: `${o.army} ${o.stage} x${o.speed} seed ${o.seed}`, ...sl });
          console.log(`SLOW ${mode} ${sl.ms} ms | ${o.army} stage ${o.stage} x${o.speed} seed ${o.seed} ${o.party.join(',')} | ${sl.phase} t ${sl.t} ${sl.area} show[${sl.show}] eidolon[${sl.eidolon}] units ${sl.units}`);
        }
        for (const d of s.did) totals[d === 'ult' ? 'ults' : d === 'horn' ? 'horns' : d === 'spell' ? 'spells' : 'skips']++;
        for (const f of s.flags) {
          await note(f, o);
          if (f.kind === 'stall' || f.kind === 'noFrames') stalled = true;
        }
        if (stalled || s.phase !== 'fight') break;
        // (the tab hidden for a moment and shown again)
        if (rnd() < 0.03) {
          totals.hides++;
          await page.evaluate(() => window.__hide(true));
          await page.waitForTimeout(STEPPED ? 300 : 600 + rnd() * 2500);
          await page.evaluate(() => window.__hide(false));
          // (the first frame back is a long one)
          if (STEPPED) await page.evaluate(() => window.__game.frame(100, 4000));
        }
      }
      if (hung) throw new Error('the page no longer answers');
      if (!stalled && RUNS) {
        fresh = !(await waveEnd(page, mode, o, note));
      } else if (!stalled && STEPPED) {
        // (the end: let what is still playing finish, and see that the result comes up)
        let up = false;
        for (let i = 0; i < 40 && !up; i++) {
          await page.evaluate(() => window.__run(1000));
          await page.waitForTimeout(15);
          up = await page.evaluate(() => { for (const el of document.querySelectorAll('.rvRow button:last-child')) el.click(); return window.__game.b.phase !== 'fight' && !document.getElementById('result').hidden; });
        }
        const phase = await page.evaluate(() => window.__game.b.phase);
        if (phase === 'fight') await note({ kind: 'tooLong', state: await page.evaluate(() => window.__dump()) }, o);
        else if (!up) await note({ kind: 'noResult', state: await page.evaluate(() => window.__dump()) }, o);
      } else if (!stalled) {
        const done = await page.waitForFunction(() => window.__game.b.phase !== 'fight' && !document.getElementById('result').hidden, null, { timeout: 30000, polling: 250 }).then(() => true, () => false);
        const phase = await page.evaluate(() => window.__game.b.phase);
        if (phase === 'fight') await note({ kind: 'tooLong', state: await page.evaluate(() => window.__dump()) }, o);
        else if (!done) await note({ kind: 'noResult', state: await page.evaluate(() => window.__dump()) }, o);
      }
      if (stalled) fresh = true;
      waves++;
      totals.waves++;
      if (waves % 5 === 0) {
        const m = await page.evaluate(() => ({ ...window.__gpu(), slowest: window.__wd.slowest ?? 0 }));
        peak = Math.max(peak, m.mb);
        console.log(`${mode}: ${waves} fights, ${totals.flags.filter((f) => f.mode === mode).length} flags; textures ${m.textures} holding ${m.mb} MB, heap ${m.heap} MB, ${m.nodes} on the stage, ${m.dom} elements, slowest frame's work ${m.slowest} ms`);
      }
    }
  } catch (e) {
    console.log(`${mode}: the driver stopped: ${String(e.message).split('\n')[0]}`);
  }
  for (const e of new Set(errs)) console.log(`${mode}: page error: ${e}`);
  const longest = await page.evaluate(() => Math.round(window.__wd.longest)).catch(() => -1);
  const fps = await page.evaluate(() => +((window.__wd.fightFrames ?? 0) / Math.max(1, (window.__wd.fightMs ?? 0) / 1000)).toFixed(1)).catch(() => -1);
  const task = await page.evaluate(() => window.__wd.task ?? 0).catch(() => -1);
  await ctx.close().catch(() => {});
  return { mode, waves, longest, fps, task, peak, errors: [...new Set(errs)] };
}

let closing = false;
browser.on('disconnected', () => closing || console.log('THE BROWSER WENT AWAY (crashed or was killed)'));
const results = await Promise.all(MODES.map((m) => soak(m).catch((e) => ({ mode: m, waves: -1, errors: [String(e.message).split('\n')[0]] }))));
const sum = { ...totals, results, cpu: CPU, faultsOn: FAULTS };
writeFileSync(`${OUT}/soak.json`, JSON.stringify(sum, null, 2));
console.log(`\nslow frames (over ${SLOW_MS} ms of work): ${totals.slow.length}, the worst ${Math.max(0, ...totals.slow.map((x) => x.ms))} ms`);
if (totals.ends.length) console.log(`wave ends: ${totals.ends.length}; from the fight's end to something shown: ${[...totals.ends].sort((a, b) => a - b)[Math.floor(totals.ends.length / 2)]} ms at the middle, ${Math.max(...totals.ends)} ms at the worst, ${totals.ends.filter((x) => x > END_MS).length} over ${END_MS} ms; ${totals.endsDown} ended with a hero down and lives left, ${totals.endsLost} lost`);
console.log(`fights ${totals.waves}; flags ${totals.flags.length} (${[...new Set(totals.flags.map((f) => f.kind))].join(', ') || 'none'}); ultimates by hand ${totals.ults}, horns ${totals.horns}, spells ${totals.spells}, skips ${totals.skips}, tab hidden ${totals.hides} times; sheets failed ${totals.faults.failed}, late ${totals.faults.late}`);
// (the frame times are only real with `--real`: the stepped clock draws one picture a second)
for (const r of results) console.log(`  ${r.mode}: ${r.waves} fights, most texture memory ${r.peak} MB, ${STEPPED ? '' : `longest frame ${r.longest} ms, longest task ${r.task} ms, ${r.fps} frames a second in fights, `}page errors ${r.errors.length}`);
closing = true;
await browser.close();
srv.close();
