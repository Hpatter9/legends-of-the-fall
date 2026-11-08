// FIXES-4, ask 1 (docs/notes/fixes-4.md): the skill and attack marks on the ground, under the fighters. Starts a real fight, stops the
// clock, and lays every kind of tile mark round the heroes (a boss's signature windup, a land hazard's tell, a burning ground, caltrops,
// a snare, an aura, a flood, the spell aim's 3x3 on the board), then takes the whole screen and a close crop.
//
//   npm run web && node tools/fixes-4/marks.mjs [tag]   (writes docs/samples/fixes4-marks-<tag>-<w>.png and -<tag>-<w>-zoom.png)
import { serve, launch } from '../battle-ui/lib.mjs';
import { mkdirSync } from 'node:fs';
const TAG = process.argv[2] ?? 'after';
const AURA = TAG.includes('aura');
const port = 8893;
const server = serve('out/web', port);
const browser = await launch();
const PARTY = ['knight', 'paladin', 'archer', 'wizard', 'cleric'];
mkdirSync('docs/samples', { recursive: true });
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(180000);
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto(`http://localhost:${port}/${AURA ? '#aura' : ''}`);
  await page.evaluate((party) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: party, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(party.map((k) => [k, 200000])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, PARTY);
  await page.reload();
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 180000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip, #bossCard { display: none !important; }' });
  await page.evaluate((party) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'orcs' }, stage: 3, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, PARTY);
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const g = window.__game;
    g.app.ticker.stop();
    window.__step = (ms) => { for (let t = 0; t < ms; t += 16) g.frame(16, 16); g.app.render(); };
    window.__step(300);
    const b = g.b;
    const w = b.board.w;
    const heroes = b.units.filter((u) => u.side === 'hero' && u.alive);
    const around = (u, v) => { const out = []; for (let du = -1; du <= 1; du++) for (let dv = -1; dv <= 1; dv++) if (u + du >= 0 && u + du < w && v + dv >= 0 && v + dv < b.board.d) out.push((v + dv) * w + u + du); return out; };
    const [h0, h1, h2, h3, h4] = heroes;
    // (the fight stands still from here: the marks are laid and only the effects' clock runs)
    if (location.hash.includes('aura')) b.auras = [{ by: h4.id, what: 'healing mist', until: b.t + 1e6 }, { by: h1.id, what: 'slow time', until: b.t + 1e6 }];
    window.__marks = () => {
      g.fx.show(b, [
        { kind: 'bossSig', phase: 'warn', by: b.units.find((u) => u.side !== 'hero').id, n: 99, key: 'x', name: 'Skull Crusher', el: 'fire', tiles: around(h0.u, h0.v), ms: 3000, rage: false },
        { kind: 'hazard', id: 7, what: 'flare', phase: 'tell', tiles: around(h1.u, h1.v), ms: 3000 },
        { kind: 'zone', u: h2.u, v: h2.v, ms: 4000 },
        { kind: 'trap', u: h3.u, v: h3.v + 1, ms: 4000 },
        { kind: 'zone', u: h4.u, v: h4.v, ms: 4000, what: 'spikes' },
        // (an aura round the cleric: the painted Healing Mist, laid on the rows of the ground under those in it)
        ...(location.hash.includes('aura') ? [{ kind: 'aura', by: h4.id, at: null, reach: 1, what: 'healing mist', ms: 6000 }, { kind: 'aura', by: h1.id, at: null, reach: 1, what: 'slow time', ms: 6000 }] : []),
      ]);
      for (let du = -1; du <= 1; du++) for (let dv = -1; dv <= 1; dv++) g.boardView.mark(h3.u + du, h3.v + dv, 'bad');
    };
    window.__marks();
    window.__hero = [h0.u, h0.v];
  });
  for (let i = 0; i < 12; i++) await page.evaluate(() => { const g = window.__game; for (let t = 0; t < 120; t += 16) { g.fx.step?.(16); } g.app.render(); });
  await page.evaluate(() => window.__game.app.render());
  await page.screenshot({ path: `docs/samples/fixes4-marks-${TAG}-${w}.png` });
  // (a close look round the heroes: the middle of their sprites on the page)
  const box = await page.evaluate(() => {
    const g = window.__game;
    const pts = [...g.sprites.values()].filter((s) => s.root.visible && s.root.alpha > 0).map((s) => g.toClient(s.x, s.y));
    const hs = g.b.units.filter((u) => u.side === 'hero').map((u) => g.sprites.get(u.id)).filter(Boolean).map((s) => g.toClient(s.x, s.y));
    const xs = hs.map((p) => p.x);
    const ys = hs.map((p) => p.y);
    return { x: Math.min(...xs), y: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), n: pts.length };
  });
  const cx = (box.x + box.x1) / 2;
  const cy = (box.y + box.y1) / 2;
  const cw = Math.min(w, Math.max(220, box.x1 - box.x + 120));
  const ch = Math.max(200, box.y1 - box.y + 140);
  await page.screenshot({ path: `docs/samples/fixes4-marks-${TAG}-${w}-zoom.png`, clip: { x: Math.max(0, Math.min(w - cw, cx - cw / 2)), y: Math.max(0, cy - ch / 2 - 20), width: cw, height: ch } });
  console.log('ok', w);
  await ctx.close();
}
await browser.close();
server.close();
