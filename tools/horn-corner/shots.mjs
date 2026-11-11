// HORN-CORNER shots and checks (docs/notes/horn-corner.md): the War Horn in the fight's bottom-right corner, beside the tactic button. For each upright size:
//   wave5-ready     an army fight with four spells, the horn full (an Eidolon bound),
//   wave5-charging  the same, the horn part filled,
//   wave5-locked    the same on a save with no Eidolon bound (no horn at all),
//   wave8-ready     a boss wave (the boss's bar),
//   duel            a duel (the king's spells and the horn are put away).
// It prints the spell row's height (one line or two), the horn's box, whatever the horn's box lies over, and how far the action's centre
// sits from the middle of the camera's room. Exits 1 on a failed check (run against a build with the horn in the corner).
//
//   npm run web && node tools/horn-corner/shots.mjs            (TAG=after, OUT=docs/samples/horn-right)
//   ROOT=<a build of main> TAG=before node tools/horn-corner/shots.mjs
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch } from '../calmap/lib.mjs';

const ROOT = process.env.ROOT ?? 'out/web';
const OUT = process.env.OUT ?? 'docs/samples/horn-right';
const TAG = process.env.TAG ?? 'after';
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
const HORNS = { ready: { horn: 1000, bound: ['gorm'], chosen: 'gorm', confirmed: true }, charging: { horn: 430, bound: ['gorm'], chosen: 'gorm', confirmed: true }, locked: null };
const QUIET = '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip, .toast { display: none !important; }';

const srv = serve(ROOT, PORT);
const browser = await launch();
let bad = 0;
let errors = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) bad++; };
const after = TAG !== 'before';

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

/** What the page shows: the spell row, the horn, what the horn lies over, and the camera against its room. */
const read = (page) => page.evaluate(() => {
  const g = window.__game;
  const shown = (e) => {
    if (!e || e.hidden || e.closest('[hidden]')) return null;
    const b = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return b.width > 0 && b.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0 ? b : null;
  };
  const row = shown(document.getElementById('hudSpells'));
  const hornEl = [...document.querySelectorAll('.ehFight')].find((e) => shown(e));
  const horn = shown(hornEl);
  const others = ['#top', '#hudSpells', '#bossBar', '#comboBar', '#twistBanner', '#phaseBanner', '#synCol', '#tacticBtn', '#tacticWord.up', '#autoBar', '#fightHud', '.fhRow', '#benchWrap', '#benchGrip', '#fight', '#result', '#duelBar', '.dsTug', '.fhCutIn'];
  const hits = [];
  if (horn)
    for (const sel of others)
      for (const e of document.querySelectorAll(sel)) {
        const b = shown(e);
        if (b && !e.contains(hornEl) && b.left < horn.right && horn.left < b.right && b.top < horn.bottom && horn.top < b.bottom) hits.push(sel);
      }
  // (the fighters under the horn's box)
  const c = g.app.canvas.getBoundingClientRect();
  const s = c.width / g.app.screen.width;
  const k = g.world.scale.x;
  let under = 0;
  if (horn)
    for (const sp of g.sprites.values()) {
      if (!sp.root.visible) continue;
      const x = c.left + (g.world.x + sp.x * k) * s;
      const y = c.top + (g.world.y + (sp.y - sp.tall * 0.45) * k) * s;
      if (x > horn.left && x < horn.right && y > horn.top && y < horn.bottom) under++;
    }
  // (the camera's room, as it holds it: canvas px, here made client px)
  const safe = g.safe ? { x0: c.left + g.safe.x, y0: c.top + g.safe.y, x1: c.left + g.safe.x + g.safe.w, y1: c.top + g.safe.y + g.safe.h } : null;
  const ax = c.left + (g.world.x + g.tx * k) * s;
  const ay = c.top + (g.world.y + g.ty * k) * s;
  // (where a skill's banner comes in: the stack as it is, or one made to be measured)
  let stack = document.querySelector('.fhCutStack');
  const made = !stack;
  if (!stack) { stack = document.createElement('div'); stack.className = 'fhCutStack'; document.body.append(stack); }
  const cutLeft = Math.round(parseFloat(getComputedStyle(stack).left));
  if (made) stack.remove();
  const r = (b) => (b ? [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)] : null);
  return {
    row: r(row), rowH: row ? Math.round(row.height) : 0, orbs: document.querySelectorAll('#spellCards > *').length, horn: r(horn), state: hornEl?.dataset.state ?? null,
    inRow: !!document.querySelector('#hudSpells .ehFight'), hits, under, boss: !document.getElementById('bossBar').hidden, panelTop: Math.round(document.getElementById('panel').getBoundingClientRect().top),
    tactic: r(shown(document.getElementById('tacticBtn'))), cutLeft,
    off: safe ? [Math.round(ax - (safe.x0 + safe.x1) / 2), Math.round(ay - (safe.y0 + safe.y1) / 2)] : null, safe: safe ? [Math.round(safe.x0), Math.round(safe.y0), Math.round(safe.x1), Math.round(safe.y1)] : null,
  };
});

function report(name, w, i, wantHorn) {
  console.log(`${TAG} ${name}-${w}: orbs ${i.orbs}, spell row ${i.rowH} px tall ${JSON.stringify(i.row)}; horn ${JSON.stringify(i.horn)} (${i.state}); tactic ${JSON.stringify(i.tactic)}; panel top ${i.panelTop}; horn over: ${i.hits.join(' ') || 'nothing'}; fighters under it ${i.under}; skill banners from x ${i.cutLeft}; room ${JSON.stringify(i.safe)}, action off its middle by ${JSON.stringify(i.off)}`);
  if (!after) return;
  check(!i.inRow, `${name}-${w}: the horn is out of the spell row`);
  check(!!i.horn === wantHorn, `${name}-${w}: the horn ${wantHorn ? 'shows' : 'is not shown'}`);
  if (i.horn) {
    check(i.horn[2] - i.horn[0] >= 48 && i.horn[3] - i.horn[1] >= 48, `${name}-${w}: a thumb target of at least 48 px (${i.horn[2] - i.horn[0]} x ${i.horn[3] - i.horn[1]})`);
    check(i.horn[2] >= w - 80 && i.horn[2] <= w - 4 && i.horn[3] <= i.panelTop, `${name}-${w}: in the bottom-right corner, above the panel`);
    check(!i.tactic || (i.horn[2] <= i.tactic[0] - 4 && i.horn[1] >= i.tactic[1] && i.horn[3] <= i.tactic[3]), `${name}-${w}: beside the tactic button, a gap between, no taller than it`);
    check(!i.hits.length, `${name}-${w}: the horn lies over no other part`);
    check(i.cutLeft + Math.min(200, w * 0.56) <= i.horn[0], `${name}-${w}: a skill's banner stops short of the horn`);
    check(!i.tactic || i.safe[3] === i.tactic[1] - 8, `${name}-${w}: the camera's room ends where the tactic button alone cut it`);
    check(i.safe[3] <= i.horn[1], `${name}-${w}: the camera's room ends above the horn`);
  }
  if (i.rowH && w >= 393) check(i.rowH <= 56, `${name}-${w}: the spell row is one line (${i.rowH} px)`);
  check(i.cutLeft === 0, `${name}-${w}: a skill's banner comes in at the left edge`);
  if (i.off) check(Math.abs(i.off[0]) <= 24 && Math.abs(i.off[1]) <= 8, `${name}-${w}: the action sits at the middle of the room (${i.off})`);
}

for (const [w, h] of SIZES) {
  // (the army fights: wave 5 with each horn, wave 8 with its boss)
  for (const [name, stage, hornKey] of [['wave5-ready', 5, 'ready'], ['wave5-charging', 5, 'charging'], ['wave5-locked', 5, 'locked'], ['wave8-ready', 8, 'ready']]) {
    const eid = HORNS[hornKey];
    const meta = { seed: 7, crowns: 0, unlocked: PARTY, party: PARTY, chapel: true, xp: Object.fromEntries(PARTY.map((k) => [k, 99999])), spellbook: { owned: SPELLS }, ...(eid ? { eidolons: eid } : {}), bestStage: 14, opened: ['undead', 'beasts', 'castle'] };
    const { ctx, page } = await open(w, h, { 'legends.meta': meta });
    await page.evaluate(async ([party, st]) => {
      const g = window.__game;
      const r = JSON.parse(JSON.stringify(g.run));
      Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'beasts' }, stage: st, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
      document.getElementById('home').hidden = true;
      g.startRun(r);
      await new Promise((res) => setTimeout(res, 600));
      g.autoArrange(true);
      await new Promise((res) => setTimeout(res, 400));
      document.getElementById('fight').click();
    }, [PARTY, stage]);
    await page.waitForTimeout(6000);
    await page.evaluate(() => window.__game.app.ticker.stop());
    const i = await read(page);
    await page.screenshot({ path: `${OUT}/${TAG}-${name}-${w}.png` });
    report(name, w, i, hornKey !== 'locked');
    // (a tap on a horn still filling says so in a note by it, on the screen)
    if (name === 'wave5-charging') {
      await page.evaluate(() => [...document.querySelectorAll('.ehFight')].find((e) => e.getBoundingClientRect().width > 0).click());
      await page.waitForTimeout(400);
      const note = await page.evaluate(() => { const n = document.querySelector('.ehNote'); if (!n) return null; const b = n.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; });
      await page.screenshot({ path: `${OUT}/${TAG}-wave5-charging-note-${w}.png` });
      console.log(`${TAG} note-${w}: ${JSON.stringify(note)}`);
      if (after) check(!!note && note[0] >= 0 && note[2] <= w && note[1] >= 0 && note[3] <= i.horn[1], `note-${w}: the horn's note shows above it, on the screen`);
    }
    // (a tap on the tactic button: its word rises clear of the horn)
    if (name === 'wave8-ready') {
      await page.evaluate(() => { window.__game.app.ticker.start(); document.getElementById('tacticBtn').click(); });
      await page.waitForTimeout(350);
      const word = await page.evaluate(() => {
        const box = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
        const wd = document.querySelector('#tacticWord.up');
        const hn = [...document.querySelectorAll('.ehFight')].find((e) => e.getBoundingClientRect().width > 0);
        return wd && hn ? { word: box(wd), horn: box(hn), tactic: box(document.getElementById('tacticBtn')) } : null;
      });
      await page.screenshot({ path: `${OUT}/${TAG}-wave8-tactic-word-${w}.png` });
      console.log(`${TAG} word-${w}: ${JSON.stringify(word)}`);
      const apart = (a, b) => a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1];
      if (after) check(!!word && apart(word.word, word.horn) && apart(word.word, word.tactic) && word.word[2] <= w, `word-${w}: the tactic's word shows clear of the horn and the button`);
    }
    // (the full horn blown: the call's horn swings up from the button)
    if (name === 'wave5-ready') {
      await page.evaluate(() => { window.__game.app.ticker.start(); [...document.querySelectorAll('.ehFight')].find((e) => e.getBoundingClientRect().width > 0).click(); });
      await page.waitForTimeout(450);
      const blast = await page.evaluate(() => { const n = document.querySelector('.ecLayer .ecHorn'); if (!n) return null; const b = n.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; });
      await page.screenshot({ path: `${OUT}/${TAG}-wave5-call-${w}.png` });
      console.log(`${TAG} call-${w}: the call's horn ${JSON.stringify(blast)}`);
      if (after) check(!!blast && blast[2] >= i.horn[0] && blast[2] <= w + 12 && blast[0] >= 0 && blast[3] >= i.horn[1] - 40 && blast[3] <= h, `call-${w}: the call's horn rises from the button's corner`);
    }
    await ctx.close();
  }
  // (a duel: Hask calls a champion out; the spells and the horn are put away)
  {
    const m = S.meta();
    m.eidolons = HORNS.ready;
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
    await page.evaluate(() => window.__game.app.ticker.stop());
    const i = await read(page);
    await page.screenshot({ path: `${OUT}/${TAG}-duel-${w}.png` });
    report('duel', w, i, false);
    await ctx.close();
  }
}
console.log('page errors:', errors, 'failed checks:', bad);
await browser.close();
srv.close();
process.exit(bad || errors ? 1 : 0);
