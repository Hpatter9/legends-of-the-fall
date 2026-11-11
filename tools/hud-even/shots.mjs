// HUD-EVEN shots and checks (docs/notes/hud-even.md): the fight's spell row spread evenly across the screen, and the tactic button's
// plaque in the Formation button's corner. For each upright size:
//   handover-deploy, handover-fight   the same save placing (Formation) and fighting (the tactic),
//   spells-<n>, spells-<n>-noult      every count of spells (none to four), with and without the ULT Auto button,
//   boss, boss-word                   a boss wave with four spells, and the tactic's word after a tap,
//   twist                             the same with a twist's banner under the top bar,
//   duel                              a duel (the spells and the horn are put away).
// It prints the row's pieces, margins and gaps, the plaque's box against the Formation button's, what the plaque and the horn lie over, and
// the action's centre against the camera's room. Exits 1 on a failed check (run against a build with HUD-EVEN).
//
//   npm run web && node tools/hud-even/shots.mjs                      (TAG=after, OUT=docs/samples/hud-even)
//   ROOT=<a build of main> TAG=before node tools/hud-even/shots.mjs
//   SIZES=393 ONLY=spells node tools/hud-even/shots.mjs               (one size, the cases whose name starts so)
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch } from '../calmap/lib.mjs';

const ROOT = process.env.ROOT ?? 'out/web';
const OUT = process.env.OUT ?? 'docs/samples/hud-even';
const TAG = process.env.TAG ?? 'after';
const ONLY = process.env.ONLY ?? '';
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
const QUIET = '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip, .toast { display: none !important; }';

const srv = serve(ROOT, PORT);
const browser = await launch();
let bad = 0;
let errors = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) bad++; };
const after = TAG !== 'before';

/** A save with four spells (every spell known: the three slots and the open one), heroes who have their ultimates or not, the fourth army
 *  beaten (so the Formation button shows), and an Eidolon bound (the War Horn). */
function metaOf(ult) {
  return { seed: 7, crowns: 0, unlocked: PARTY, party: PARTY, chapel: true, xp: Object.fromEntries(PARTY.map((k) => [k, ult ? 99999 : 0])), spellbook: { owned: SPELLS }, eidolons: { horn: 1000, bound: ['gorm'], chosen: 'gorm', confirmed: true },
    armies: { wildwood: { waves: 15, best: 15, won: 15, clears: 1 } }, featuresTold: ['autoMerge', 'autoRunes', 'autoPlace'], bestStage: 14, opened: ['undead', 'beasts', 'castle'] };
}

/** Leave `n` orbs in the row (a save always knows its three starting spells, so the smaller counts are made on the page: the orbs past `n`
 *  are taken out, and with none the SPELL Auto button is hidden as the page hides it). The row lays itself out again as they go. */
const orbs = (page, n) => page.evaluate(async (keep) => {
  const all = [...document.querySelectorAll('#spellCards > .spell')];
  for (const e of all.slice(keep)) e.remove();
  if (!keep) for (const e of document.querySelectorAll('#hudSpells .fhAutoSpell')) e.hidden = true;
  await new Promise((res) => setTimeout(res, 150));
}, n);

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
  }, { 'lotf-tips-off': '1', 'legends.settings': { cinematics: false, speed: 1 }, ...store });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.addStyleTag({ content: QUIET });
  return { ctx, page };
}

/** Start a beasts army's wave with the five placed (the deploy). */
const deploy = (page, stage) => page.evaluate(async ([party, st]) => {
  const g = window.__game;
  const r = JSON.parse(JSON.stringify(g.run));
  Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'beasts' }, stage: st, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
  document.getElementById('home').hidden = true;
  g.startRun(r);
  await new Promise((res) => setTimeout(res, 600));
  g.autoArrange(true);
  await new Promise((res) => setTimeout(res, 500));
}, [PARTY, stage]);

/** What the page shows. */
const read = (page) => page.evaluate(() => {
  const g = window.__game;
  const shown = (e) => {
    if (!e || e.hidden || e.closest('[hidden]')) return null;
    const b = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return b.width > 0 && b.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0 ? b : null;
  };
  const r = (b) => (b ? [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)] : null);
  const row = shown(document.getElementById('hudSpells'));
  const pieces = row ? [...document.querySelectorAll('#hudSpells #mana, #hudSpells #spellCards > .spell, #hudSpells .fhAuto')].map(shown).filter(Boolean).sort((a, b) => a.left - b.left) : [];
  const tacticEl = document.getElementById('tacticBtn');
  const tactic = shown(tacticEl);
  const hornEl = [...document.querySelectorAll('.ehFight')].find((e) => shown(e));
  const horn = shown(hornEl);
  const over = (a, el) => {
    const out = [];
    if (!a) return out;
    for (const sel of ['#top', '#hudSpells #mana', '#hudSpells .spell', '#hudSpells .fhAuto', '#bossBar', '#comboBar', '#twistBanner', '#phaseBanner', '#tacticBtn', '#tacticWord.up', '.ehFight', '#autoBar', '#fightHud', '#formBtn', '.fhCutIn', '#duelBar'])
      for (const e of document.querySelectorAll(sel)) {
        const b = shown(e);
        if (b && e !== el && !e.contains(el) && b.left < a.right && a.left < b.right && b.top < a.bottom && a.top < b.bottom) out.push(sel);
      }
    return [...new Set(out)];
  };
  const c = g.app.canvas.getBoundingClientRect();
  const s = c.width / g.app.screen.width;
  const k = g.world.scale.x;
  const safe = g.safe ? { x0: c.left + g.safe.x, y0: c.top + g.safe.y, x1: c.left + g.safe.x + g.safe.w, y1: c.top + g.safe.y + g.safe.h } : null;
  const ax = c.left + (g.world.x + g.tx * k) * s;
  const ay = c.top + (g.world.y + g.ty * k) * s;
  return {
    W: innerWidth, row: r(row), rowH: row ? Math.round(row.height) : 0, pieces: pieces.map((b) => [Math.round(b.left * 10) / 10, Math.round(b.right * 10) / 10]), piecesTop: pieces.length ? Math.round(Math.min(...pieces.map((b) => b.top))) : null,
    piecesBottom: pieces.length ? Math.round(Math.max(...pieces.map((b) => b.bottom))) : null,
    tactic: r(tactic), tacticOver: over(tactic, tacticEl), tacticInPanel: !!document.querySelector('#panel #tacticBtn'), form: r(shown(document.getElementById('formBtn'))),
    horn: r(horn), hornOver: over(horn, hornEl), boss: r(shown(document.getElementById('bossBar'))), twist: r(shown(document.getElementById('twistBanner'))),
    panelTop: Math.round(document.getElementById('panel').getBoundingClientRect().top),
    safe: safe ? [Math.round(safe.x0), Math.round(safe.y0), Math.round(safe.x1), Math.round(safe.y1)] : null,
    off: safe ? [Math.round(ax - (safe.x0 + safe.x1) / 2), Math.round(ay - (safe.y0 + safe.y1) / 2)] : null,
  };
});

/** The row's margins and gaps, from its pieces' edges. */
function spread(i) {
  if (!i.pieces.length) return null;
  const left = i.pieces[0][0];
  const right = i.W - i.pieces[i.pieces.length - 1][1];
  const gaps = i.pieces.slice(1).map((p, n) => Math.round((p[0] - i.pieces[n][1]) * 10) / 10);
  return { n: i.pieces.length, left: Math.round(left * 10) / 10, right: Math.round(right * 10) / 10, gaps };
}

function report(name, w, i, o = {}) {
  const sp = spread(i);
  console.log(`${TAG} ${name}-${w}: row ${JSON.stringify(i.row)}; ${sp ? `${sp.n} pieces, margins ${sp.left} and ${sp.right}, gaps ${sp.gaps.join(' ')}` : 'no pieces'}; tactic ${JSON.stringify(i.tactic)} over [${i.tacticOver.join(' ')}]; boss ${JSON.stringify(i.boss)}; twist ${JSON.stringify(i.twist)}; horn ${JSON.stringify(i.horn)} over [${i.hornOver.join(' ')}]; room ${JSON.stringify(i.safe)}, action off its middle by ${JSON.stringify(i.off)}`);
  if (!after) return sp;
  if (sp && sp.n > 1) {
    const g = sp.gaps;
    check(Math.max(...g) - Math.min(...g) <= 1, `${name}-${w}: the gaps between the pieces are even (${g.join(' ')})`);
    check(Math.abs(sp.left - sp.right) <= 1.5, `${name}-${w}: the same margin at both sides (${sp.left}, ${sp.right})`);
    check(g[0] >= 3 && g[0] <= 40, `${name}-${w}: the gap is between 3 and 40 px`);
    const group = g[0] === 24 && sp.left > 8 + sp.n;
    if (!group) check(sp.left >= 7 && sp.left <= 8 + (sp.n - 1) / 2 + 1, `${name}-${w}: the row runs edge to edge (margin ${sp.left})`);
    else check(sp.n <= 4, `${name}-${w}: only four pieces or fewer stand as a centred group (${sp.n})`);
    check(i.piecesBottom - i.piecesTop <= 56, `${name}-${w}: one line (${i.piecesBottom - i.piecesTop} px)`);
  }
  if (sp && sp.n === 1) check(Math.abs(sp.left - sp.right) <= 1.5, `${name}-${w}: a lone piece is centred`);
  if (!o.noTactic) {
    check(!!i.tactic && !i.tacticInPanel, `${name}-${w}: the tactic plaque shows, out of the panel`);
    if (i.tactic) {
      check(i.W - i.tactic[2] === 8, `${name}-${w}: its right edge is the Formation button's (8 px in)`);
      check(i.tactic[2] - i.tactic[0] === 95 && i.tactic[3] - i.tactic[1] === 71, `${name}-${w}: the Formation button's size (${i.tactic[2] - i.tactic[0]} x ${i.tactic[3] - i.tactic[1]})`);
      check(!i.tacticOver.length, `${name}-${w}: the plaque lies over no other part`);
      if (i.piecesBottom !== null) check(i.tactic[1] >= i.piecesBottom && i.tactic[1] <= i.piecesBottom + 12, `${name}-${w}: it hangs just under the spell row`);
      if (i.boss) check(i.boss[2] <= i.tactic[0] - 4, `${name}-${w}: the boss's bar stops short of it`);
      check(i.safe[1] >= Math.floor((i.tactic[1] + i.tactic[3]) / 2) + 7, `${name}-${w}: the camera's room starts no higher than half way down it (a corner cover)`);
    }
  }
  if (i.horn) {
    check(i.W - i.horn[2] === 8 && i.horn[3] <= i.panelTop && i.horn[2] - i.horn[0] === 56, `${name}-${w}: the horn has the bottom-right corner, 56 px`);
    check(!i.hornOver.length, `${name}-${w}: the horn lies over no other part`);
    check(i.safe[3] <= Math.ceil((i.horn[1] + i.horn[3]) / 2) - 7, `${name}-${w}: the camera's room ends no lower than half way up the horn (a corner cover)`);
  }
  if (i.off) check(Math.abs(i.off[0]) <= 24 && Math.abs(i.off[1]) <= 10, `${name}-${w}: the action sits at the middle of the room (${i.off})`);
  return sp;
}

const want = (name) => !ONLY || name.startsWith(ONLY);
const hold = (page) => page.evaluate(() => window.__game.app.ticker.stop());
const shot = (page, name, w) => page.screenshot({ path: `${OUT}/${TAG}-${name}-${w}.png` });

for (const [w, h] of SIZES) {
  // (the hand-over: the Formation button while placing, the tactic's plaque in the fight)
  if (want('handover')) {
    const { ctx, page } = await open(w, h, { 'legends.meta': metaOf(true) });
    await deploy(page, 5);
    const d = await read(page);
    await shot(page, 'handover-deploy', w);
    console.log(`${TAG} handover-deploy-${w}: Formation ${JSON.stringify(d.form)}; tactic ${JSON.stringify(d.tactic)}`);
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(2500);
    await hold(page);
    const f = await read(page);
    await shot(page, 'handover-fight', w);
    report('handover-fight', w, f);
    if (after) {
      check(!!d.form && !d.tactic, `handover-${w}: placing, the corner holds Formation and no tactic`);
      check(!f.form && !!f.tactic, `handover-${w}: fighting, it holds the tactic and no Formation`);
      if (d.form && f.tactic) check(d.form[2] === f.tactic[2] && d.form[2] - d.form[0] === f.tactic[2] - f.tactic[0] && d.form[3] - d.form[1] === f.tactic[3] - f.tactic[1], `handover-${w}: the same right edge and size (Formation ${d.form}, tactic ${f.tactic}; ${f.tactic[1] - d.form[1]} px lower, under the spell row)`);
    }
    await ctx.close();
  }
  // (every count of spells, with and without ULT)
  for (const ult of [true, false])
    for (const n of [0, 1, 2, 3, 4]) {
      const name = `spells-${n}${ult ? '' : '-noult'}`;
      if (!want(name)) continue;
      const { ctx, page } = await open(w, h, { 'legends.meta': metaOf(ult) });
      await deploy(page, 5);
      await page.evaluate(() => document.getElementById('fight').click());
      await page.waitForTimeout(2500);
      await hold(page);
      await orbs(page, n);
      const i = await read(page);
      report(name, w, i);
      if (after) check(i.pieces.length === 1 + n + (n ? 1 : 0) + (ult ? 1 : 0), `${name}-${w}: ${n} orbs in the row (${i.pieces.length} pieces)`);
      await shot(page, name, w);
      await ctx.close();
    }
  // (a boss wave, the tactic's word after a tap, and a twist's banner)
  if (want('boss') || want('twist')) {
    const { ctx, page } = await open(w, h, { 'legends.meta': metaOf(true) });
    await deploy(page, 8);
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(6000);
    await hold(page);
    const i = await read(page);
    await shot(page, 'boss', w);
    report('boss', w, i);
    if (after) check(!!i.boss, `boss-${w}: the boss's bar shows`);
    await page.evaluate(() => { window.__game.app.ticker.start(); document.getElementById('tacticBtn').click(); });
    await page.waitForTimeout(350);
    // (the word is held as it stands, so the shot has it however long the shot takes)
    await page.evaluate(() => { for (const a of document.getAnimations()) a.pause(); });
    const word = await page.evaluate(() => {
      const box = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
      const wd = document.querySelector('#tacticWord.up');
      return wd ? { word: box(wd), tactic: box(document.getElementById('tacticBtn')), boss: box(document.getElementById('bossBar')), text: wd.textContent, pieces: [...document.querySelectorAll('#hudSpells .fhAuto, #hudSpells .spell')].map(box) } : null;
    });
    await shot(page, 'boss-word', w);
    console.log(`${TAG} boss-word-${w}: ${JSON.stringify(word && { word: word.word, tactic: word.tactic, text: word.text })}`);
    const apart = (a, b) => a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1];
    if (after) check(!!word && word.word[0] >= 0 && apart(word.word, word.tactic) && apart(word.word, word.boss) && word.pieces.every((p) => apart(word.word, p)) && word.word[2] === word.tactic[2] && word.word[1] >= word.tactic[3], `boss-word-${w}: the tactic's word rises under the plaque, clear of it, the boss's bar and the spell row`);
    // (a twist's banner under the top bar: everything below it moves down together)
    await page.evaluate(() => {
      const g = window.__game;
      const t = document.getElementById('twistBanner');
      t.textContent = 'Twist: the foes strike 20% harder';
      t.hidden = false;
      g.placeTopHud();
      g.app.ticker.start();
    });
    await page.waitForTimeout(2500);
    await hold(page);
    const t = await read(page);
    await shot(page, 'twist', w);
    report('twist', w, t);
    if (after) check(!!t.twist && t.piecesTop >= t.twist[3], `twist-${w}: the spell row sits under the twist's banner`);
    await ctx.close();
  }
  // (a duel: the spells and the horn are put away; the tactic's plaque stays)
  if (want('duel')) {
    const m = S.meta();
    m.eidolons = { horn: 1000, bound: ['gorm'], chosen: 'gorm', confirmed: true };
    const { ctx, page } = await open(w, h, { 'legends.meta': m, 'legends.tips': TIPS, 'legends.run': S.run(5) });
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
    await page.waitForTimeout(7000);
    await hold(page);
    const i = await read(page);
    await shot(page, 'duel', w);
    report('duel', w, i);
    if (after) check(!i.horn && !i.pieces.length, `duel-${w}: the spells and the horn are put away`);
    await ctx.close();
  }
}
console.log('page errors:', errors, 'failed checks:', bad);
await browser.close();
srv.close();
process.exit(bad || errors ? 1 : 0);
