// Fight screenshots of the summons (docs/notes/summon-art.md): node tools/summon-art/shots.mjs [web dir] [port]
// A fight with the five callers (a tier 3 Beastmaster, a tier 3 Druid, the Reaper, the Samurai Commander, the Illusionist),
// their summons stood beside them (pushed in for the picture only, as each skill would call them), at 393x852, 360x780 and
// 412x915 -> docs/samples/summon-art-fight-<w>.png, and a close crop of each summon -> summon-art-<kind>.png.
import { serve, HEROES } from '../battle-ui/lib.mjs';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [root = 'out/web', port = '9011'] = process.argv.slice(2);
const srv = serve(root, +port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function shoot(width, height, crops, dpr = 1) {
  // (as tools/battle-ui/lib.mjs boots, with room for game.js's long parse on software GL)
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, hasTouch: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(240000);
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto(`http://localhost:${port}/?x=${Math.random()}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((heroes) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
    localStorage.setItem('lotf-tips-off', '1');
  }, HEROES);
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game && document.getElementById('summon'));
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  // (any film that starts is skipped)
  await page.evaluate(() => setInterval(() => { for (const b of document.querySelectorAll('button')) if (b.textContent.trim() === 'Skip' && b.offsetParent) b.click(); }, 150));
  await page.evaluate(() => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { mode: { kind: 'army', army: 'orcs' }, stage: 2, over: false, cleared: false, gold: 500, event: undefined });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    for (let i = 0; i < 4; i++) document.getElementById('summon').click();
    const kinds = [['beastmaster', 3], ['druid', 3], ['reaper', 1], ['samuraiCommander', 1], ['illusionist', 1]];
    g.run.roster = g.run.roster.slice(0, 5).map((h, i) => ({ ...h, kind: kinds[i][0], grade: kinds[i][1] }));
    for (const h of g.run.roster) {
      const t = g.freeTile();
      if (t) g.put(String(h.id), t);
    }
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const g = window.__game;
    g.endIntro?.();
    g.begin();
    const b = g.b;
    // (callers and their summons set out in the middle of the board, a tile apart, for the picture)
    const heroAt = (def, u, v, grade = 1) => {
      let h = b.units.find((x) => x.def === def && x.side === 'hero' && x.owner === undefined);
      if (!h) {
        h = { id: b.nextId++, def, side: 'hero', u, v, hp: 200, maxHp: 200, facing: 3, alive: true, busyUntil: 0, charge: 0, grade, owner: -1 };
        b.units.push(h);
      }
      Object.assign(h, { u, v, step: undefined, facing: 3 });
      return h;
    };
    const add = (def, owner, u, v, grade = 1) => b.units.push({ id: b.nextId++, def, side: 'hero', u, v, hp: 200, maxHp: 200, facing: 3, alive: true, busyUntil: 0, charge: 0, owner: owner.id, grade, expires: b.t + 600000 });
    for (const x of b.units) if (x.side === 'hero') x.u = -99;
    // (two rows across the board, each fighter a column of its own so none hides another)
    const bm = heroAt('beastmaster', 1, 7, 3);
    add('wolf', bm, 2, 6); add('wolf', bm, 3, 5, 3); add('direWolf', bm, 4, 4, 3);
    add('treant', heroAt('druid', 5, 3, 3), 6, 2, 3);
    add('wraith', heroAt('reaper', 2, 10), 3, 9);
    add('standard', heroAt('samuraiCommander', 4, 8), 5, 7);
    add('decoy', heroAt('illusionist', 6, 6), 7, 5);
    for (const x of b.units) if (x.side === 'hero' && x.u === -99) x.alive = false, x.u = 0, x.v = 0;
    for (const x of b.units) if (x.side === 'foe') x.v = Math.max(x.v, 9);
    // (everyone held still a moment, for the picture)
    for (const x of b.units) x.busyUntil = b.t + 60000;
  });
  await page.waitForTimeout(800);
  // (the camera held close over the heroes and their summons, for the picture)
  await page.evaluate(() => {
    const g = window.__game;
    g.follow = () => {};
    g.leanIn = () => {};
    setInterval(() => {
      const ours = [...g.sprites.values()].filter((v) => v.unit.side === 'hero');
      if (!ours.length) return;
      const xs = ours.map((v) => v.x), ys = ours.map((v) => v.y);
      g.cx = g.tx = (Math.min(...xs) + Math.max(...xs)) / 2;
      g.cy = g.ty = (Math.min(...ys) + Math.max(...ys)) / 2 - 14;
      g.zoom = g.tzoom = Math.min(2.2, g.area.w / (Math.max(...xs) - Math.min(...xs) + 40) / g.scale);
    }, 16);
  });
  await page.waitForTimeout(3000);
  // (the picture held still, so the close crops match it)
  await page.evaluate(() => window.__game.app.ticker.stop());
  await page.waitForTimeout(200);
  await page.screenshot({ path: `docs/samples/summon-art-fight-${width}.png` });
  if (crops) {
    const boxes = await page.evaluate(() => {
      const g = window.__game;
      const out = {};
      const cv = document.querySelector('canvas').getBoundingClientRect();
      for (const v of g.sprites?.values?.() ?? []) {
        const u = v.unit;
        if (u.owner === undefined || u.side !== 'hero') continue;
        const k = u.def === 'wolf' && u.grade === 3 ? 'wolf3' : u.def;
        const gp = v.root.getGlobalPosition();
        const r = g.app.canvas.getBoundingClientRect();
        out[k] = { x: r.left + gp.x * r.width / g.app.screen.width, y: r.top + gp.y * r.height / g.app.screen.height, k: g.world.scale.x * r.width / g.app.screen.width };
      }
      return out;
    });
    console.log(JSON.stringify(boxes));
    for (const [k, p] of Object.entries(boxes)) {
      const r = 36 * p.k;
      const clip = { x: Math.max(0, p.x - r), y: Math.max(0, p.y - r * 1.6), width: r * 2, height: r * 1.9 };
      await page.screenshot({ path: `out/summon-crop-${k}.png`, clip });
    }
  }
  await ctx.close();
}
await shoot(393, 852, true);
await shoot(360, 780, false);
await shoot(412, 915, false);
await browser.close();
srv.close();
