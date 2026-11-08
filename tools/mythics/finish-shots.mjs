// The Mythics finished (docs/notes/mythics-finish.md): a picture of each Mythic's three skills and its ultimate mid-cast, in a real fight in
// the built page, on a clock of our own (the Pixi ticker stopped and the page's frame stepped by hand, as tools/ult-show/shots.mjs does).
//
//   npm run web && node tools/mythics/finish-shots.mjs [--size 393x852] [--picks vael,astrax] [--reduced]
//
// Each skill is let go by leaving it the only one off cooldown with a full pool (and what it needs set up: shields on the foes for Star
// Hunger, wounds stored for Heartwood, hurt allies for the healers, foretold foes for Unmake); the picture is taken just after it lands.
// The ultimate is fired by a tap on the hero's row (its first use: the long version), and pictured in its cut-in and in its showcase.
// Writes docs/samples/mythics-finish/<pick>-<s1|s2|s3|ult-cut|ult-show>.png, and prints page errors and missing files.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PORT = Number(process.env.PORT ?? 8697);
const OUT = process.env.OUT ?? 'docs/samples/mythics-finish';
const [W, H] = opt('--size', '393x852').split('x').map(Number);
const PICKS = opt('--picks', 'vael,astrax,ilyra,orrun,nyxara').split(',');
const REDUCED = args.includes('--reduced');
// (--ult-only: the ultimate alone, its cut-in measured, as the sizes check runs it)
const ULT_ONLY = args.includes('--ult-only');
mkdirSync(OUT, { recursive: true });

const root = 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
const OTHERS = ['knight', 'cleric', 'archer', 'wizard'];
let errors = 0;
let missing = 0;

async function open(pick) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  page.on('response', (r) => { if (r.status() === 404) { missing++; console.log('404', r.url()); } });
  const owned = [pick, ...OTHERS];
  await page.addInitScript(([owned, xp]) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('mf-set')) return;
    sessionStorage.setItem('mf-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party: owned.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, [owned, xpAt(40)]);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip, .rvCard, .unlock { display: none !important; }' });
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
  // (an army's wave 6: enough foes for every skill to have something to do)
  await page.evaluate((party) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'beasts' }, stage: 6, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, owned);
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForFunction(() => {
    const u = window.__game.b.units.filter((x) => x.alive);
    return u.some((h) => h.side === 'hero' && u.some((f) => f.side === 'foe' && Math.max(Math.abs(f.u - h.u), Math.abs(f.v - h.v)) <= 2));
  }, null, { timeout: 25000, polling: 200 }).catch(() => {});
  // (the foes made sturdy, so the wave lasts through every picture: the tool's own change, never the game's)
  await page.evaluate(() => { for (const f of window.__game.b.units) if (f.side === 'foe') { f.maxHp *= 40; f.hp = f.maxHp; } });
  // (the heroes fight a while first: Nyxara's memories, Orrun's wounds)
  await page.waitForTimeout(4500);
  await page.evaluate(() => window.__game.app.ticker.stop());
  return { ctx, page };
}

/** Let the Mythic's skill in slot `n` go (the others kept on cooldown), and step on until it lands. */
async function skill(page, pick, n) {
  return page.evaluate(([pick, n]) => {
    const g = window.__game;
    const b = g.b;
    const u = b.units.find((h) => h.side === 'hero' && h.def === pick && h.alive);
    if (!u) return { ok: false, why: 'fallen' };
    const allies = b.units.filter((h) => h.alive && h.side === 'hero' && h.id !== u.id);
    const foes = b.units.filter((f) => f.alive && f.side === 'foe');
    g.fx.casting.delete(u.id);
    let name = '';
    for (let i = 0; i < 900 && b.phase === 'fight'; i++) {
      u.charge = 100;
      u.charge2 = 0;
      u.ks ??= {};
      for (const m of [1, 2, 3]) u.ks[`at${m}`] = m === n ? -1e9 : b.t;
      for (const m of [1, 2, 3]) delete u.ks[`idle${m}`];
      u.hp = Math.max(u.hp, u.maxHp * 0.9);
      // (what each skill needs to have something to do)
      if (pick === 'astrax' && n === 2) for (const f of foes) if (f.alive) f.shield = { hp: 120, until: b.t + 60000 };
      if (pick === 'orrun' && n === 3) (u.mythic ??= {}).wounds = 600;
      if (pick === 'ilyra' && n === 2) for (const a of allies) if (a.alive) a.hp = Math.min(a.hp, Math.round(a.maxHp * 0.5));
      if (pick === 'nyxara' && n === 2) for (const f of foes) if (f.mythic) delete f.mythic.foretold;
      if (pick === 'nyxara' && n === 3) for (const f of foes) if (f.alive) (f.mythic ??= {}).foretold = { by: u.id, until: b.t + 60000 };
      window.__step(16);
      name = g.fx.casting.get(u.id) ?? '';
      if (name) break;
    }
    return { ok: !!name, name, t: b.t };
  }, [pick, n]);
}

/** A picture, tried again a frame later if the software renderer stalls on one (it has, now and then, on a heavy frame). */
async function shot(page, path) {
  for (let i = 0; i < 4; i++) {
    try {
      return await page.screenshot({ path, timeout: 15000 });
    } catch {
      console.log('retrying', path);
      await page.evaluate(() => window.__step(32));
    }
  }
  throw new Error(`no picture: ${path}`);
}

for (const pick of PICKS) {
  const { ctx, page } = await open(pick);
  try {
    for (const n of ULT_ONLY ? [] : [1, 2, 3]) {
      const r = await skill(page, pick, n);
      console.log(pick, `s${n}`, JSON.stringify(r));
      // (its wind-up is the cast's 750 ms; the picture is a beat after the release)
      await page.evaluate(() => window.__step(900));
      await shot(page, `${OUT}/${pick}-s${n}.png`);
      await page.evaluate(() => window.__step(900));
    }
    const ult = await page.evaluate((pick) => {
      const g = window.__game;
      const hs = g.b.units.filter((u) => u.side === 'hero' && u.owner === undefined);
      const u = hs.find((h) => h.def === pick);
      for (const h of hs) h.charge2 = 0;
      for (const a of hs) if (a !== u) a.hp = Math.min(a.hp, Math.round(a.maxHp * 0.5));
      if (u.mythic) u.mythic.denied = false;
      u.charge2 = 100;
      document.querySelector(`.fhRow[data-unit="${u.id}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      for (let i = 0; i < 1600 && !g.ultm.queue.current && g.b.phase === 'fight'; i++) {
        window.__step(16);
        if (i % 200 === 199 && u.alive) {
          u.charge2 = 100;
          for (const a of hs) if (a !== u && a.alive) a.hp = Math.min(a.hp, Math.round(a.maxHp * 0.5));
          document.querySelector(`.fhRow[data-unit="${u.id}"]`)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
      }
      return { moment: !!g.ultm.queue.current, name: g.ultm.queue.current?.name, show: g.ultm.queue.current?.show ?? 0, mythic: !!document.querySelector('.umMythic') };
    }, pick);
    console.log(pick, 'ult', JSON.stringify(ult));
    // (the cut-in two thirds of the way into its opening, then the showcase a little past its middle)
    await page.evaluate(() => window.__step(780));
    // (our clock runs ahead of real time: the cut-in's pictures are given the moment they need to decode)
    await page.waitForFunction(() => [...document.querySelectorAll('.umMythic img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 5000 }).catch(() => console.log(pick, 'cut-in pictures not ready'));
    await page.evaluate(() => window.__game.app.render());
    // (the cut-in's words and frame measured against the fight screen's top bar, spell row, Auto, tactic button and hero rows: none may cross
    // them, and all must be on the screen; a text is measured by its text, as tools/combat-hud/probe.mjs does)
    const fit = await page.evaluate(() => {
      const box = (r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom });
      const textBox = (el) => { const g = document.createRange(); g.selectNodeContents(el); return box(g.getBoundingClientRect()); };
      const mine = [...document.querySelectorAll('.umLegend em, .umLegend small, .umLegend b, .umLegend i')].map((e) => [e.tagName, textBox(e)]);
      const frame = document.querySelector('.umFrame');
      if (frame) mine.push(['frame', box(frame.getBoundingClientRect())]);
      const hud = [...document.querySelectorAll('#top, .fhRow, #tacticBtn, .spellOrb, #autoBtn, #mana')].filter((e) => e.offsetParent).map((e) => [e.id || e.className, box(e.getBoundingClientRect())]);
      const hit = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
      const out = [];
      for (const [n, a] of mine) {
        if (a.l < 0 || a.t < 0 || a.r > innerWidth || a.b > innerHeight) out.push(`${n} off the screen`);
        for (const [m, b] of hud) if (hit(a, b)) out.push(`${n} / ${m}`);
      }
      return { parts: mine.length, hud: hud.length, out };
    });
    console.log(pick, `${W}x${H}`, 'cut-in', `${fit.parts} parts against ${fit.hud}`, fit.out.length ? `OVERLAPS ${fit.out.join('; ')}` : '0 overlaps');
    await shot(page, `${OUT}/${pick}-ult-cut.png`);
    await page.evaluate((show) => window.__step(370 + Math.round(show * 0.45)), ult.show);
    await shot(page, `${OUT}/${pick}-ult-show.png`);
    await page.evaluate(() => { window.__step(3000); window.__game.app.ticker.start(); });
    console.log('ok', pick);
  } catch (e) {
    console.log('FAILED', pick, String(e.message).split('\n')[0]);
  }
  await ctx.close();
}
console.log('page errors:', errors, '404s:', missing);
await browser.close();
srv.close();
