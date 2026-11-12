// TACTIC-SIZE checks and shots (docs/notes/tactic-size.md): the tactic button's size in a real wave. The owner: "the tactic button is huge
// now for some reason in a wave". For each upright size it plays whole waves and samples the plaque's box every 100 ms, so anything that
// grows it for a moment (an ultimate's push-in, a showcase's dim, a boss's arrival) is caught, with the transforms and zooms of everything
// above it in the page:
//   late-wave5       a late save (four spells, ultimates, the War Horn), Auto off,
//   late-boss        the same on a boss wave, each ultimate fired by hand so its whole scene plays, then both Autos put on,
//   fresh-wave1      a new save's party (no ultimates, the three starting spells), wave 1,
//   bigtext          the late save with every text of the page a third larger (a phone's larger text),
//   duel             a duel.
// It prints the smallest and largest box seen, and writes a shot at the wave's third second and at the first moment an ultimate's scene is
// up. With PIN (the default on a build of this branch) it fails if the box is ever anything but the pinned size at any width.
//
//   npm run web && node tools/tactic-size/shots.mjs                       (TAG=after, OUT=docs/samples/tactic-size)
//   ROOT=<a build of another release> TAG=v486 PIN=0 node tools/tactic-size/shots.mjs
//   SIDE=1 node tools/tactic-size/shots.mjs                               (only the two sizes side by side, `sizes-<w>.png`)
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch } from '../calmap/lib.mjs';

const ROOT = process.env.ROOT ?? 'out/web';
const OUT = process.env.OUT ?? 'docs/samples/tactic-size';
const TAG = process.env.TAG ?? 'after';
const PIN = process.env.PIN !== '0';
const SIDE = process.env.SIDE === '1';
const ONLY = process.env.ONLY ?? '';
/** The plaque's pinned size, px (src/tactics.css). */
const SIZE = { w: 92, h: 44 };
const PORT = 8139;
const ALL = [[393, 852], [360, 780], [412, 915]];
const SIZES = process.env.SIZES ? ALL.filter(([w]) => process.env.SIZES.split(',').includes(String(w))) : ALL;
mkdirSync(OUT, { recursive: true });
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/nemesis/saves4.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/nemsaves4.mjs', logLevel: 'error', loader: { '.png': 'empty' } });
const S = await import('../../out/shots/nemsaves4.mjs');
const TIPS = ['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay'];
const PARTY = ['knight', 'cleric', 'archer', 'wizard', 'samurai'];
const SPELLS = ['heal', 'meteor', 'haste', 'shield', 'chain', 'frost', 'rally', 'quake', 'smite', 'resurrect', 'poison', 'cleanse', 'blink', 'hex', 'lance', 'renewal'];
// (armies beaten with their stars: the fourth army opens the Formation button, and twenty stars open all four spell slots, SPELL-SLOTS)
const ARMIES_WON = Object.fromEntries(['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres'].map((id) => [id, { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: { 0: 255, 1: 255, 2: 255, 3: 255, 4: 255 }, hard: { 1: { won: 15, clears: 1 }, 2: { won: 15, clears: 1 } } }]));
const QUIET = '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip, .toast { display: none !important; }';
const LATE = { seed: 7, crowns: 0, unlocked: PARTY, party: PARTY, chapel: true, xp: Object.fromEntries(PARTY.map((k) => [k, 99999])), spellbook: { owned: SPELLS }, eidolons: { horn: 1000, bound: ['gorm'], chosen: 'gorm', confirmed: true },
  armies: ARMIES_WON, featuresTold: ['autoMerge', 'autoRunes', 'autoPlace'], bestStage: 14, opened: ['undead', 'beasts', 'castle'] };
const FRESH = { seed: 7, crowns: 0, unlocked: PARTY.slice(0, 3), party: PARTY.slice(0, 3) };

const srv = serve(ROOT, PORT);
const browser = await launch();
let bad = 0;
let errors = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) bad++; };

async function open(w, h, store) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript(() => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
  });
  await page.goto(`http://localhost:${PORT}/?x=1`);
  await page.evaluate((items) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(items)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  }, { 'lotf-tips-off': '1', ...store });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.addStyleTag({ content: QUIET });
  return { ctx, page };
}

/** Start a beasts army's wave with the party placed, and fight. */
const fight = (page, stage, party) => page.evaluate(async ([p, st]) => {
  const g = window.__game;
  const r = JSON.parse(JSON.stringify(g.run));
  Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'beasts' }, stage: st, over: false, cleared: false, gold: 0, event: undefined, roster: p.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
  document.getElementById('home').hidden = true;
  g.startRun(r);
  await new Promise((res) => setTimeout(res, 600));
  g.autoArrange(true);
  await new Promise((res) => setTimeout(res, 500));
  document.getElementById('fight').click();
}, [party, stage]);

/** Sample the plaque every 100 ms from now on (`window.__tac`): its box, and any transform, zoom or scale on it or above it. */
const watch = (page) => page.evaluate(() => {
  const seen = { n: 0, minW: 1e9, maxW: 0, minH: 1e9, maxH: 0, bent: [], ult: 0, tops: new Set() };
  window.__tac = seen;
  setInterval(() => {
    const e = document.getElementById('tacticBtn');
    if (!e || e.hidden) return;
    const b = e.getBoundingClientRect();
    if (b.width <= 0) return;
    seen.n++;
    seen.minW = Math.min(seen.minW, b.width); seen.maxW = Math.max(seen.maxW, b.width);
    seen.minH = Math.min(seen.minH, b.height); seen.maxH = Math.max(seen.maxH, b.height);
    seen.tops.add(Math.round(b.top));
    if (document.querySelector('.umLayer:not([hidden])')) seen.ult++;
    for (let n = e; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const bent = [cs.transform !== 'none' && cs.transform !== 'matrix(1, 0, 0, 1, 0, 0)' && `transform ${cs.transform}`, cs.zoom && cs.zoom !== '1' && `zoom ${cs.zoom}`, cs.scale && cs.scale !== 'none' && `scale ${cs.scale}`].filter(Boolean).map((x) => `${n.id || n.tagName}: ${x}`);
      for (const x of bent) if (!seen.bent.includes(x)) seen.bent.push(x);
    }
  }, 100);
});

const seen = (page) => page.evaluate(() => {
  const s = window.__tac;
  const e = document.getElementById('tacticBtn');
  const b = e && !e.hidden ? e.getBoundingClientRect() : null;
  // (what is inside it, and whether its words spill out of its box)
  const inner = e ? [...e.children].map((c) => { const r = c.getBoundingClientRect(); return `${c.tagName.toLowerCase()} ${Math.round(r.width)}x${Math.round(r.height)}`; }) : [];
  const spill = b ? [...e.children].some((c) => { const r = c.getBoundingClientRect(); return r.left < b.left - 0.5 || r.right > b.right + 0.5 || r.top < b.top - 0.5 || r.bottom > b.bottom + 0.5; }) : false;
  return { ...s, tops: [...s.tops], box: b ? [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)] : null, inner, spill };
});

function report(name, w, s) {
  const r = (n) => Math.round(n * 10) / 10;
  console.log(`${TAG} ${name}-${w}: ${s.n} samples (${s.ult} with an ultimate's scene up); the plaque ${r(s.minW)}..${r(s.maxW)} x ${r(s.minH)}..${r(s.maxH)} px, now ${JSON.stringify(s.box)}; tops ${s.tops.join(' ')}; inside ${s.inner.join(', ')}; ${s.bent.length ? `bent by ${s.bent.join('; ')}` : 'no transform, zoom or scale on it or above it'}`);
  check(s.n > 20, `${name}-${w}: the plaque showed through the wave (${s.n} samples)`);
  check(s.maxW - s.minW < 0.5 && s.maxH - s.minH < 0.5, `${name}-${w}: its box never changed size in the wave`);
  check(!s.bent.length, `${name}-${w}: nothing scales it`);
  if (PIN) {
    check(Math.abs(s.maxW - SIZE.w) < 0.5 && Math.abs(s.maxH - SIZE.h) < 0.5, `${name}-${w}: the pinned size, ${SIZE.w} x ${SIZE.h} px (${r(s.maxW)} x ${r(s.maxH)})`);
    check(!s.spill, `${name}-${w}: its icon and word stay inside it`);
  }
}

const want = (name) => !SIDE && (!ONLY || name.startsWith(ONLY));
const shot = (page, name, w) => page.screenshot({ path: `${OUT}/${TAG}-${name}-${w}.png` });

for (const [w, h] of SIZES) {
  if (want('late-wave5')) {
    const { ctx, page } = await open(w, h, { 'legends.meta': LATE, 'legends.settings': { cinematics: false, speed: 1 } });
    await fight(page, 5, PARTY);
    await watch(page);
    await page.waitForTimeout(3000);
    await shot(page, 'late-wave5', w);
    await page.waitForTimeout(7000);
    report('late-wave5', w, await seen(page));
    await ctx.close();
  }
  if (want('late-boss')) {
    const { ctx, page } = await open(w, h, { 'legends.meta': { ...LATE, ultAuto: false }, 'legends.settings': { cinematics: false, ultFull: true, speed: 1 } });
    await fight(page, 8, PARTY);
    await watch(page);
    // (the tool's own hand on the fight, so it lasts and the ultimates are ready: the foes are given fifty times their health and each
    // hero's ultimate is filled)
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      for (const u of window.__game.b.units) {
        if (u.side === 'hero') u.charge2 = 99999;
        else u.hp *= 50;
      }
    });
    // (Auto off, so an ultimate plays its whole scene: each hero's row is tapped as it says TAP, then both Autos are put on)
    let caught = false;
    const from = Date.now();
    let early = false;
    let autos = false;
    while (Date.now() - from < 50000) {
      const n = Math.floor((Date.now() - from) / 100);
      await page.waitForTimeout(100);
      await page.evaluate(() => document.querySelector('#fightHud .fhRow.ready')?.click());
      if (!caught && (await page.evaluate(() => !!document.querySelector('.umLayer:not([hidden])')))) {
        caught = true;
        await page.waitForTimeout(300);
        await shot(page, 'late-boss-ultimate', w);
      }
      if (!early && n >= 30) { early = true; await shot(page, 'late-boss', w); }
      if (!autos && n >= 300) { autos = true; await page.evaluate(() => { for (const b of document.querySelectorAll('#hudSpells .fhAuto:not(.on)')) b.click(); }); }
      if (caught && n > 340) break;
    }
    const s = await seen(page);
    report('late-boss', w, s);
    check(s.ult > 0, `late-boss-${w}: an ultimate's scene played while the plaque was watched (${s.ult} samples)`);
    await ctx.close();
  }
  if (want('fresh-wave1')) {
    const { ctx, page } = await open(w, h, { 'legends.meta': FRESH, 'legends.settings': { cinematics: false, speed: 1 } });
    await fight(page, 1, PARTY.slice(0, 3));
    await watch(page);
    await page.waitForTimeout(3000);
    await shot(page, 'fresh-wave1', w);
    await page.waitForTimeout(3000);
    report('fresh-wave1', w, await seen(page));
    await ctx.close();
  }
  if (want('bigtext')) {
    const { ctx, page } = await open(w, h, { 'legends.meta': LATE, 'legends.settings': { cinematics: false, speed: 1 } });
    // (a phone's larger text: an Android web view's text zoom makes every text of the page larger, whatever unit it is set in; the same
    // is done here to the plaque's own words and to the page's base size)
    await page.addStyleTag({ content: 'html { font-size: 130% !important; } #tacticBtn small { font-size: calc(11px * 1.3) !important; } #tacticBtn b { font-size: calc(13px * 1.3) !important; }' });
    await fight(page, 5, PARTY);
    await watch(page);
    await page.waitForTimeout(3000);
    await shot(page, 'bigtext', w);
    await page.waitForTimeout(6000);
    report('bigtext', w, await seen(page));
    await ctx.close();
  }
  if (want('duel')) {
    const m = S.meta();
    const { ctx, page } = await open(w, h, { 'legends.meta': m, 'legends.tips': TIPS, 'legends.run': S.run(5), 'legends.settings': { cinematics: false, speed: 1 } });
    await page.click('.hmCont');
    await page.waitForFunction(() => document.querySelector('.tcLayer:not([hidden]) .tcCut'), null, { timeout: 15000 });
    await page.evaluate(() => window.__game.autoArrange(true));
    for (let n = 0; n < 3; n++) {
      await page.evaluate(() => window.__game.taunts.end());
      await page.waitForTimeout(200);
      if (await page.$('#duelCard')) break;
    }
    await page.waitForSelector('#duelCard', { timeout: 8000 });
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('#duelCard .omPrimary').click());
    await watch(page);
    await page.waitForTimeout(7000);
    await shot(page, 'duel', w);
    report('duel', w, await seen(page));
    await ctx.close();
  }
  // (two sizes side by side in the same wave: the plaque as this build draws it, and another given as CSS in ALT)
  if (SIDE) {
    const { ctx, page } = await open(w, h, { 'legends.meta': LATE, 'legends.settings': { cinematics: false, speed: 1 } });
    await fight(page, 8, PARTY);
    await page.waitForTimeout(6000);
    await page.evaluate(() => window.__game.app.ticker.stop());
    await page.screenshot({ path: `${OUT}/${TAG}-size-a-${w}.png` });
    if (process.env.ALT) {
      await page.addStyleTag({ content: process.env.ALT });
      await page.evaluate(() => window.__game.placeTopHud());
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${TAG}-size-b-${w}.png` });
    }
    const b = await page.evaluate(() => { const r = document.getElementById('tacticBtn').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    console.log(`${TAG} side-${w}: ${process.env.ALT ? 'the other size' : 'the plaque'} ${b[0]} x ${b[1]}`);
    await ctx.close();
  }
}
console.log('page errors:', errors, 'failed checks:', bad);
await browser.close();
srv.close();
process.exit(bad || errors ? 1 : 0);
