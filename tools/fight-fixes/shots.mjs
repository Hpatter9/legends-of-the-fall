// FIGHT-FIXES browser checks and shots: node tools/fight-fixes/shots.mjs [root] [port] [prefix]  (build first: npm run web).
// Env: CHROMIUM_PATH, PLAYWRIGHT_MODULE (as for tools/world-001/browser.mjs), VIEWS (default 393x852,360x780,412x915), ONLY (castle,boss,revive,camera).
// Boss shots set the army run's wave by hand (a presentation fixture, not a played run); the revive shot fells the squad by hand.
import { openBrowser } from '../world-001/browser.mjs';
const [root = 'out/web', port = '8203', prefix = 'docs/samples/fight-fixes'] = process.argv.slice(2);
const views = (process.env.VIEWS ?? '393x852,360x780,412x915').split(',').map((v) => v.split('x').map(Number));
const only = process.env.ONLY?.split(',');
const want = (k) => !only || only.includes(k);
const { browser, url, close } = await openBrowser(root, Number(port));
const report = [];
const say = (...a) => (console.log(...a), report.push(a.join(' ')));

async function fresh([w, h], q = '') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.stack.split('\n').slice(0, 3).join(' | ')));
  await page.goto(`${url}/?seed=11${q}`);
  await page.waitForFunction(() => window.__game);
  await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelector('#tipSkip')?.click());
  await page.addStyleTag({ content: '#quip{display:none!important}' });
  return { ctx, page, errors };
}

try {
  for (const view of views) {
    const tag = `${view[0]}x${view[1]}`;
    const main = view[0] === 393;
    // ---- 4. the trophy wall on the castle and in the tavern
    if (want('castle')) {
      const { ctx, page, errors } = await fresh(view);
      await page.evaluate(() => {
        const g = window.__game;
        g.meta.opened = [...(g.meta.opened ?? []), 'castle'];
        g.home.open();
        g.home.show('castle');
      });
      await page.waitForTimeout(1200);
      const shown = () => page.evaluate(() => [...document.querySelectorAll('.twOverlay')].map((x) => getComputedStyle(x).display));
      const top = () => page.evaluate(() => document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('.twOverlay') ? 'wall' : 'castle');
      say(tag, 'castle on arrival: overlays', JSON.stringify(await shown()), 'middle tap lands on', await top());
      if (main) await page.screenshot({ path: `${prefix}-castle-closed.png` });
      const chip = page.locator('.ctPortalChip', { hasText: 'Trophies' });
      if (await chip.count()) {
        await chip.first().click();
        await page.waitForTimeout(400);
        say(tag, 'after the Trophies chip: overlays', JSON.stringify(await shown()));
        if (main) await page.screenshot({ path: `${prefix}-castle-open.png` });
        await page.locator('.twOverlay:not([hidden]) .twCloseBtn').click();
        await page.waitForTimeout(200);
        say(tag, 'after ✕:', JSON.stringify(await shown()), 'middle tap lands on', await top());
        await chip.first().click();
        await page.waitForTimeout(200);
        await page.mouse.click(5, 120);
        await page.waitForTimeout(200);
        say(tag, 'after a backdrop tap:', JSON.stringify(await shown()));
        await chip.first().click();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        say(tag, 'after Escape:', JSON.stringify(await shown()));
      } else say(tag, 'no Trophies chip found');
      // (the tavern holds its own wall)
      const tav = page.locator('.ctPortalChip', { hasText: 'Tavern' });
      if (await tav.count()) {
        await tav.first().click();
        await page.waitForTimeout(1200);
        say(tag, 'tavern: overlays', JSON.stringify(await shown()), 'middle tap lands on', await top());
        if (main) await page.screenshot({ path: `${prefix}-tavern-closed.png` });
      }
      say(tag, 'castle errors', JSON.stringify(errors));
      await ctx.close();
    }
    // ---- 1. bosses in their arenas' middles
    if (want('boss') && main)
      for (const [army, stage] of [['orcs', 8], ['undead', 15], ['wildwood', 5], ['infernal', 15]]) {
        const { ctx, page, errors } = await fresh(view, `&scenario=${army}`);
        await page.locator('#summon').click().catch(() => {});
        await page.locator('#summon').click().catch(() => {});
        const at = await page.evaluate(([army, stage]) => {
          const g = window.__game;
          g.scenesOn = () => false;
          g.goat.newFight = () => {};
          g.run.mode.army = army;
          g.run.mode.scenario = army;
          g.run.stage = Number(stage);
          g.newBattle();
          g.endIntro();
          g.autoArrange();
          const foes = g.b.units.filter((u) => u.side === 'foe');
          return { mid: g.b.board.arenaMid, boss: foes[0] && { def: foes[0].def, u: foes[0].u, v: foes[0].v }, band: foes.slice(1).map((u) => `${u.u},${u.v}`) };
        }, [army, stage]);
        say(tag, army, stage, JSON.stringify(at));
        await page.waitForTimeout(400);
        await page.evaluate(() => {
          const g = window.__game;
          const b = g.bbox;
          g.clampCam = () => {};
          g.zoom = g.tzoom = Math.min(1, g.area.w / (b.x1 - b.x0 + 24) / g.scale, g.area.h / (b.y1 - b.y0 - 60) / g.scale) * 1.5;
          const bd = g.b.board;
          const m = bd.arenaMid;
          const col = g.boardView.built?.tiles[m.v * bd.w + m.u]?.children[0];
          g.cx = g.tx = col ? col.x + 32 : (b.x0 + b.x1) / 2;
          g.cy = g.ty = col ? col.y + 40 : (b.y0 + b.y1) / 2;
        });
        await page.waitForTimeout(1500);
        await page.waitForFunction(() => window.__game.boardView.toBake.length === 0, {}, { timeout: 15000 }).catch(() => {});
        await page.screenshot({ path: `${prefix}-boss-${army}-${stage}.png` });
        say(tag, army, 'errors', JSON.stringify(errors));
        await ctx.close();
      }
    // ---- 2. the camera is the player's during a wave
    if (want('camera')) {
      const { ctx, page, errors } = await fresh(view);
      await page.locator('#summon').click().catch(() => {});
      await page.locator('#summon').click().catch(() => {});
      await page.evaluate(() => {
        const g = window.__game;
        g.scenesOn = () => false;
        g.endIntro();
        g.autoArrange();
        document.querySelector('#fight')?.click();
      });
      await page.waitForTimeout(1500);
      const cam = () => page.evaluate(() => ({ cx: Math.round(window.__game.cx), cy: Math.round(window.__game.cy), zoom: +window.__game.zoom.toFixed(3), manual: window.__game.manualCam, phase: window.__game.b.phase, t: window.__game.b.t }));
      const before = await cam();
      // (a two-finger pinch out through the touch protocol, then a one-finger drag)
      const cdp = await ctx.newCDPSession(page);
      const [w, h] = view;
      const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
      const cy = h * 0.45;
      await touch('touchStart', [[w / 2 - 40, cy], [w / 2 + 40, cy]]);
      for (let k = 1; k <= 8; k++) await touch('touchMove', [[w / 2 - 40 - k * 10, cy], [w / 2 + 40 + k * 10, cy]]);
      await touch('touchEnd', []);
      await page.waitForTimeout(150);
      const pinched = await cam();
      await page.mouse.move(w / 2, cy);
      await page.mouse.down();
      for (let k = 1; k <= 10; k++) await page.mouse.move(w / 2 + k * 8, cy + k * 6);
      await page.mouse.up();
      await page.waitForTimeout(150);
      const dragged = await cam();
      await page.mouse.move(w / 2, cy);
      await page.mouse.wheel(0, -240);
      await page.waitForTimeout(150);
      const wheeled = await cam();
      // (past the old pause: the follow used to take the camera back after four seconds)
      await page.waitForTimeout(6000);
      const later = await cam();
      say(tag, 'camera before', JSON.stringify(before), 'pinched', JSON.stringify(pinched), 'dragged', JSON.stringify(dragged), 'wheeled', JSON.stringify(wheeled), '6 s later', JSON.stringify(later));
      if (main) await page.screenshot({ path: `${prefix}-camera-zoomed.png` });
      say(tag, 'camera errors', JSON.stringify(errors));
      await ctx.close();
    }
    // ---- 3. a heart raises the fallen: they get up where they lay
    if (want('revive')) {
      const { ctx, page, errors } = await fresh(view);
      await page.locator('#summon').click().catch(() => {});
      await page.locator('#summon').click().catch(() => {});
      await page.evaluate(() => {
        const g = window.__game;
        g.scenesOn = () => false;
        g.endIntro();
        g.autoArrange();
        document.querySelector('#fight')?.click();
      });
      await page.waitForFunction(() => window.__game.b.t >= 2500, {}, { timeout: 30000 }).catch(() => {});
      // (the squad falls by hand where it stands: a controlled defeat)
      await page.evaluate(() => {
        const g = window.__game;
        for (const u of g.b.units) if (u.side === 'hero') {
          u.hp = 0;
          u.alive = false;
          u.diedAt = g.b.t;
        }
        g.b.phase = 'lost';
      });
      await page.waitForFunction(() => window.__game.revive?.swapped, {}, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(260);
      const mid = await page.evaluate(() => window.__game.b.units.filter((u) => u.side === 'hero').map((u) => `${u.def}@${u.u},${u.v}:${u.alive}`));
      say(tag, 'revive mid-get-up', JSON.stringify(mid));
      if (main) {
        await page.evaluate(() => (window.__game.speed = 0));
        await page.screenshot({ path: `${prefix}-revive-getting-up.png` });
      }
      await page.waitForTimeout(1600);
      say(tag, 'revive after: phase', await page.evaluate(() => window.__game.b.phase), 'errors', JSON.stringify(errors));
      await ctx.close();
    }
  }
} finally {
  await close();
}
