// HERO-LIVE-STATS screenshots and measures (docs/notes/hero-live-stats.md). After `npm run web`:
//   ROOT=out/web node tools/hero-live-stats/shots.mjs
// At 393x852, 360x780 and 412x915 (`SIZES=393` for one): the skills panel mid-fight; a tap on the Knight on the board (real pointer events
// on the canvas) with buffs and ailments on him and one effect's meaning open; a tap on the Cleric switches to her; "‹ Skills" brings the
// rows back. Writes docs/samples/hero-live-<scene>-<w>.png. Then, at 393, the fight left running: the panel's numbers move while it plays,
// and the cost of writing it (ms a write, and the fight's frames with the panel open against closed).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = Number(process.env.PORT ?? 9031);
const root = process.env.ROOT ?? 'out/web';
const SIZES = (process.env.SIZES ?? '393,360,412').split(',').map((w) => ({ 393: [393, 852], 360: [360, 780], 412: [412, 915] })[w]);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync('docs/samples', { recursive: true });
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
const PARTY = ['knight', 'cleric', 'wizard', 'archer', 'samurai'];
let errors = 0;

async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(180000);
  page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([owned, party, xp]) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('hl-set')) return;
    sessionStorage.setItem('hl-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, [PARTY, PARTY, xpAt(32)]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 240000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  await page.evaluate((party) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'beasts' }, stage: 3, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: i === 1 ? 3 : i === 2 ? 2 : 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, PARTY);
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForFunction(() => {
    const u = window.__game.b.units.filter((x) => x.alive);
    return u.some((h) => h.side === 'hero' && u.some((f) => f.side === 'foe' && Math.max(Math.abs(f.u - h.u), Math.abs(f.v - h.v)) <= 2));
  }, null, { timeout: 25000, polling: 200 }).catch(() => {});
  await page.waitForTimeout(1500);
  return { ctx, page };
}

/** Hold the fight (as a cinematic does) and set the scene: meters, health, and the Knight's buffs and ailments. */
async function stage(page) {
  await page.evaluate(() => {
    const g = window.__game;
    const b = g.b;
    g.sceneHold = 1;
    const hs = b.units.filter((u) => u.side === 'hero' && u.owner === undefined);
    hs.forEach((u, i) => { u.charge2 = [70, 40, 35, 85, 15][i % 5]; u.hp = Math.round(u.maxHp * [0.9, 0.62, 0.4, 0.75, 0.25][i % 5]); });
    const k = hs.find((u) => u.def === 'knight');
    // (a haste and a rally on him, a shield; burning and three stacks of poison; pinned by an archer's shot)
    k.hasteUntil = b.t + 4200;
    k.rallyUntil = b.t + 6100;
    k.power = (k.power ?? 1) * 1.25;
    k.shield = { hp: 180, until: b.t + 5000 };
    k.ail = [{ kind: 'burn', until: b.t + 2400, by: 0 }, { kind: 'poison', until: b.t + 4800, by: 0, stacks: 3 }];
    k.kx = { ...(k.kx ?? {}), pinned: b.t + 3300 };
    const c = hs.find((u) => u.def === 'cleric');
    c.ail = [{ kind: 'chill', until: b.t + 2600, by: 0 }];
    c.wardUntil = b.t + 1800;
    g.hud.refresh(b);
  });
  await page.waitForTimeout(400);
}

/** A real tap on the canvas over hero `kind`'s body. */
async function tapHero(page, kind) {
  const at = await page.evaluate((kind) => {
    const g = window.__game;
    const u = g.b.units.find((x) => x.side === 'hero' && x.def === kind);
    const s = g.sprites.get(u.id);
    return g.toClient(s.x, s.y - s.tall * 0.45);
  }, kind);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(150);
  // (the held fight draws no frames of the HUD: the page's own refresh, as a frame would)
  await page.evaluate(() => window.__game.hud.refresh(window.__game.b));
  await page.waitForTimeout(350);
}
const shot = async (page, name, w) => {
  const path = `docs/samples/hero-live-${name}-${w}.png`;
  await page.screenshot({ path });
  console.log('  wrote', path);
};
const state = (page) => page.evaluate(() => {
  const g = window.__game;
  const live = document.querySelector('.fhLive');
  const p = live?.getBoundingClientRect();
  const panel = document.getElementById('panel').getBoundingClientRect();
  return {
    picked: g.hud.picked === null ? null : g.b.units.find((u) => u.id === g.hud.picked)?.def,
    rows: [...document.querySelectorAll('.fhRow')].filter((r) => r.offsetParent).length,
    live: live && !live.hidden ? { h: Math.round(p.height), top: Math.round(p.top), bottom: Math.round(p.bottom), scroll: live.scrollHeight > live.clientHeight + 1, overflowX: live.scrollWidth > live.clientWidth + 1 } : null,
    panelTop: Math.round(panel.top),
    ring: [...g.sprites.values()].filter((s) => s.picked).map((s) => s.unit.def),
    fx: [...document.querySelectorAll('.fhlEff span')].map((s) => s.textContent),
    pageW: document.documentElement.scrollWidth,
    head: live && !live.hidden ? [...live.children].map((c) => `${c.className}:${Math.round(c.getBoundingClientRect().top)}+${Math.round(c.getBoundingClientRect().height)}/${getComputedStyle(c).display}/${getComputedStyle(c).position}`) : null,
  };
});

for (const [w, h] of SIZES) {
  const { ctx, page } = await open(w, h);
  try {
    await stage(page);
    console.log(w, 'skills', JSON.stringify(await state(page)));
    await shot(page, 'skills', w);
    await tapHero(page, 'knight');
    // (one effect's meaning open: the poison)
    await page.evaluate(() => document.querySelector('.fhlEff[data-fx="poison"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await page.waitForTimeout(200);
    console.log(w, 'knight', JSON.stringify(await state(page)));
    await shot(page, 'knight', w);
    await tapHero(page, 'cleric');
    console.log(w, 'cleric', JSON.stringify(await state(page)));
    await shot(page, 'cleric', w);
    await page.evaluate(() => document.querySelector('.fhlBack').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await page.waitForTimeout(300);
    console.log(w, 'back', JSON.stringify(await state(page)));
    await shot(page, 'back', w);
    if (w === 393) {
      // (the row's own tap picks too, and the empty board puts the skills back)
      await page.evaluate(() => document.querySelectorAll('.fhRow')[2].dispatchEvent(new MouseEvent('click', { bubbles: true })));
      await page.waitForTimeout(200);
      console.log(w, 'row tap', JSON.stringify((await state(page)).picked));
      await page.mouse.click(w / 2, 150);
      await page.waitForTimeout(200);
      console.log(w, 'empty board', JSON.stringify((await state(page)).picked));
      // (live: the fight let go at x1 with the Knight picked; his numbers move)
      await tapHero(page, 'knight');
      await page.evaluate(() => { window.__game.sceneHold = 0; });
      const a = await page.evaluate(() => document.querySelector('.fhlFight').textContent + ' | ' + document.querySelector('.fhlBars').textContent);
      await page.waitForTimeout(3000);
      const c = await page.evaluate(() => document.querySelector('.fhlFight').textContent + ' | ' + document.querySelector('.fhlBars').textContent);
      console.log('live: before', a, '\n      after ', c, '\n      changed', a !== c);
      await shot(page, 'live', w);
      // (the cost: a write of the panel, forced (every part rewritten) and unchanged, each timed over a thousand; then the fight's frames
      // in alternating rounds of 1.5 s with the panel open and closed (alternating, so the fight's own load as it goes weighs on both alike),
      // and the main thread's longest frame in each)
      const cost = await page.evaluate(async () => {
        const g = window.__game;
        const live = g.hud.live;
        const id = g.hud.picked;
        const time = (f) => { const t0 = performance.now(); for (let i = 0; i < 1000; i++) f(); return (performance.now() - t0) / 1000; };
        const forced = time(() => { live.parts = {}; live.refresh(g.b, g.hud.base, true); });
        const same = time(() => live.refresh(g.b, g.hud.base, true));
        const round = (ms) => new Promise((res) => { let n = 0, worst = 0, prev = performance.now(); const t = prev; const tick = () => { const now = performance.now(); worst = Math.max(worst, now - prev); prev = now; n++; if (now - t < ms) requestAnimationFrame(tick); else res({ n, worst }); }; requestAnimationFrame(tick); });
        const open = { n: 0, worst: 0 }, closed = { n: 0, worst: 0 };
        for (let r = 0; r < 4; r++) {
          for (const on of r % 2 ? [false, true] : [true, false]) {
            g.hud.pick(on ? id : null);
            const x = await round(1500);
            const into = on ? open : closed;
            into.n += x.n;
            into.worst = Math.max(into.worst, x.worst);
          }
        }
        return { forcedWriteMs: +forced.toFixed(3), unchangedWriteMs: +same.toFixed(4), framesOpen: open.n, framesClosed: closed.n, worstFrameOpenMs: Math.round(open.worst), worstFrameClosedMs: Math.round(closed.worst) };
      });
      console.log('cost', JSON.stringify(cost));
    }
  } catch (e) {
    errors++;
    console.log('FAILED', w, e.message);
  }
  await ctx.close();
}
await browser.close();
srv.close();
console.log(errors ? `${errors} errors` : 'no page errors');
process.exit(errors ? 1 : 0);
