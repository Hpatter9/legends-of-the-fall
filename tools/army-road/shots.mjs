// Army road mock-up shots: node tools/army-road/shots.mjs <prefix> army:stage[:label] ...  (build first: npm run web).
// Each shot opens a seeded test page, sets the army run's wave by hand (a presentation fixture, not a played run),
// deploys the squad and shoots the board at 393x852. Writes docs/samples/<prefix>-<army>-<label>.png.
import { openBrowser } from '../world-001/browser.mjs';
const [prefix, ...want] = process.argv.slice(2);
const seed = Number(process.env.SEED ?? 11);
const { browser, url, close } = await openBrowser('out/web', 8231);
try {
  for (const spec of want) {
    const [army, stage, label = `w${stage}`] = spec.split(':');
    const ctx = await browser.newContext({ viewport: { width: Number((process.env.VIEW ?? '393x852').split('x')[0]), height: Number((process.env.VIEW ?? '393x852').split('x')[1]) } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${url}/?seed=${seed}&scenario=${army}`);
    await page.waitForFunction(() => window.__game);
    await page.waitForTimeout(600);
    await page.evaluate(() => document.querySelector('#tipSkip')?.click());
    await page.locator('#summon').click().catch(() => {});
    await page.locator('#summon').click().catch(() => {});
    await page.evaluate(([army, stage, walk]) => {
      const g = window.__game;
      // (no cinematics or destination fly-over in a still)
      g.scenesOn = () => false;
      g.goat.newFight = () => {};
      g.run.mode.army = army;
      g.run.mode.scenario = army;
      g.run.stage = Number(stage);
      g.newBattle();
      g.endIntro();
      g.autoArrange();
      if (walk) { g.run.stage = Number(stage) + 1; g.startWalk(Number(stage)); }
    }, [army, stage, label.startsWith('join')]);
    // (the whole section in view, or with `road` in the label the whole road so far, as the map's stand-back does)
    await page.waitForTimeout(400);
    await page.addStyleTag({ content: '#quip{display:none!important}' });
    await page.evaluate(([road, close, focusFall]) => {
      const g = window.__game;
      if (road) return g.overview(true);
      const b = g.bbox;
      g.clampCam = () => {};
      g.zoom = g.tzoom = Math.min(1, g.area.w / (b.x1 - b.x0 + 24) / g.scale, g.area.h / (b.y1 - b.y0 - 60) / g.scale) * close;
      // (centred on the arena's middle for a boss, on the road's middle otherwise)
      const bd = g.b.board;
      const fall = focusFall && bd.falls?.[Math.floor(bd.falls.length / 2)];
      const col = g.boardView.built?.tiles[fall ? fall.v * bd.w + fall.u : (bd.pieces?.length ? 6 : 9) * bd.w + 7]?.children[0];
      g.cx = g.tx = col ? col.x + 32 : (b.x0 + b.x1) / 2;
      g.cy = g.ty = col ? col.y + 16 : (b.y0 + b.y1) / 2 + 20;
    }, [label.includes('road'), label.includes('zoom') ? 2.8 : label.includes('close') ? 1.7 : 1, label.includes('fall')]);
    await page.waitForTimeout(label.startsWith('join') ? 900 : 1500);
    await page.waitForFunction(() => window.__game.boardView.toBake.length === 0, {}, { timeout: 15000 }).catch(() => {});
    // (with `fight` in the label: the fight is started and shot at FIGHT_T ms of fight time, when the land's first strikes are told)
    if (label.includes('fight')) {
      await page.evaluate(() => { window.__game.autoArrange(); document.querySelector('#fight')?.click(); });
      const T = Number(process.env.FIGHT_T ?? 2700);
      await page.waitForFunction((T) => window.__game.b.t >= T, T, { timeout: 60000 }).catch(() => {});
      await page.evaluate(() => { window.__game.speed = 0; });
    }
    if (process.env.MOCK) await page.evaluate((text) => {
      const d = document.createElement('div');
      d.textContent = text;
      d.style.cssText = 'position:fixed;left:8px;top:96px;z-index:99999;padding:3px 8px;font:bold 13px sans-serif;color:#fff;background:rgba(160,20,20,.85);border-radius:4px;pointer-events:none';
      document.body.appendChild(d);
    }, `MOCK-UP · ${army} · wave ${stage}${label.includes('join') ? ' (join)' : ''}`);
    const path = `${process.env.OUT ?? "docs/samples"}/${prefix}-${army}-${label}.png`;
    await page.screenshot({ path });
    console.log(path, errors.length ? JSON.stringify(errors) : 'ok');
    await ctx.close();
  }
} finally {
  await close();
}
