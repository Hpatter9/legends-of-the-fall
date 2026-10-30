// The unit's info card (UNIT-INFO, docs/notes/unit-info.md): checks and shots at the three upright sizes.
//   node tools/unit-info/shots.mjs   (after `npm run web`; writes docs/samples/unit-info-*.png)
// A real press-and-hold (the mouse held still) opens the card on a hero, a caster, a low hero with its ultimate locked, a foe and a boss;
// a press that moves lets go as a drag and opens nothing.
import { createRequire } from 'node:module';
import { serve, HEROES } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const launch = () => chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const PORT = 8761;
const s = serve('out/web', PORT);
const br = await launch();
const fails = [];
const check = (name, ok, info = '') => { console.log(ok ? 'ok  ' : 'FAIL', name, info); if (!ok) fails.push(name); };
// (the battle-ui boot, with the service worker blocked: its first-visit cache of the whole game would hold up the little server)
async function boot(browser, w, h, port) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  await page.goto(`http://localhost:${port}/?x=${Math.random()}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.evaluate(([heroes]) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
    localStorage.setItem('lotf-tips-off', '1');
  }, [HEROES]);
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForTimeout(2200);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page, errors };
}
const xpFor = (lv) => Math.round(30 * (lv - 1) * lv * (lv > 20 ? 4 : 1));
for (const [w, h] of (process.env.ONE ? [[393, 852]] : [[393, 852], [360, 780], [412, 915]])) {
  const { ctx, page, errors } = await boot(br, w, h, PORT);
  await page.waitForFunction(() => window.__game?.meta, {}, { timeout: 60000 });
  const out = (n) => `docs/samples/unit-info-${n}${w === 393 ? '' : `-${w}`}.png`;
  await page.evaluate((xp) => {
    const g = window.__game;
    Object.assign(g.meta.xp, xp);
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { mode: { kind: 'army', army: 'orcs' }, stage: 15, over: false, cleared: false, gold: 900, event: undefined });
    r.roster = [{ id: 901, kind: 'knight', grade: 2 }, { id: 902, kind: 'wizard', grade: 1 }, { id: 903, kind: 'archer', grade: 1 }];
    r.squad = [901, 902];
    document.getElementById('home').hidden = true;
    g.startRun(r);
  }, { knight: xpFor(35), wizard: xpFor(14), archer: xpFor(3) });
  await page.waitForTimeout(2500);
  // (the boss's title card goes, and the deploy camera settles)
  for (let i = 0; i < 3; i++) { await page.evaluate(() => { const c = document.getElementById('bossCard'); if (c && !c.hidden) c.click(); }); await page.waitForTimeout(1200); }
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.waitForTimeout(300);
  // (where each unit stands on the screen)
  const find = () => page.evaluate(([w, h]) => {
    const g = window.__game;
    // (the screen point nearest each unit's middle that the hold's own lookup finds it at)
    const hit = new Map();
    for (let y = 60; y < h - 200; y += 4) for (let x = 4; x < w; x += 4) { const u = g.unitAtScreen(x, y); if (u && !hit.has(u.id)) hit.set(u.id, []); if (u) hit.get(u.id).push([x, y]); }
    const at = (u) => { const ps = u && hit.get(u.id); if (!ps) return null; const m = ps[Math.floor(ps.length / 2)]; return { x: m[0], y: m[1], def: u.def }; };
    const by = (f) => at(g.b.units.find(f));
    return { knight: by((u) => u.def === 'knight'), wizard: by((u) => u.def === 'wizard'), foe: by((u) => u.side === 'foe' && !(u.size > 1) && !u.phase && hit.has(u.id)), boss: by((u) => u.side === 'foe' && (u.size > 1 || u.phase)) };
  }, [w, h]);
  let spots = await find();
  const bench = await page.evaluate(() => { const c = document.querySelector('#bench .card[data-id="903"]'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 30 }; });
  const open = () => page.evaluate(() => { const s = document.querySelector('.uiSheet:not([hidden])'); return !!s ? s.querySelector('.fsHead b')?.textContent : null; });
  const hold = async (p, name, ring) => {
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.waitForTimeout(550);
    await page.mouse.up();
    await page.waitForTimeout(250);
    const got = await open();
    check(`a hold on the ${name} opens its card (${w})`, !!got, String(got));
    // (the card fits on the screen and scrolls inside)
    const box = await page.evaluate(() => { const c = document.querySelector('.uiSheet:not([hidden]) .fsCard')?.getBoundingClientRect(); return c ? { l: c.left, r: c.right, t: c.top, b: c.bottom } : null; });
    check(`the ${name} card fits (${w})`, !!box && box.l >= 0 && box.r <= w && box.t >= 0 && box.b <= h, JSON.stringify(box));
    // (the locked card is shown at its locked skill 2 and ultimate)
    if (name === 'locked') await page.evaluate(() => document.querySelector('.uiSheet:not([hidden]) .uiMove.locked')?.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(100);
    await page.screenshot({ path: out(name) });
    await page.mouse.click(w / 2, 20);
    await page.waitForTimeout(200);
    check(`a tap outside closes it (${w})`, !(await open()));
  };
  const before = await page.evaluate(() => JSON.stringify(window.__game.b.units.map((u) => [u.id, u.u, u.v, u.hp])));
  // (the ring, caught part way round: a hold begun on the knight whose fill is stopped at 70%, and no card)
  if (spots.knight) {
    await page.evaluate(([x, y]) => {
      const g = window.__game;
      g.hold.start(x, y, () => {});
      clearTimeout(g.hold.timer);
      g.hold.timer = 0;
      for (const a of document.querySelector('.uiRing:not([hidden])').getAnimations({ subtree: true })) { a.pause(); a.currentTime = 120 + 200; }
    }, [spots.knight.x, spots.knight.y]);
    await page.waitForTimeout(100);
    await page.screenshot({ path: out('ring') });
    await page.evaluate(() => window.__game.hold.cancel());
    // (the deploy camera may still be easing: where the knight stands now)
    spots = await find();
    if (spots.knight) await hold(spots.knight, 'hero');
  }
  // (a press that moves is a drag as before: no card. The press and its move are sent together in the page, so a slow software renderer
  // cannot let the hold's time run out between them)
  if (spots.wizard) {
    await page.evaluate(([x, y]) => {
      const c = window.__game.app.canvas;
      const ev = (type, x, y) => new PointerEvent(type, { clientX: x, clientY: y, pointerId: 7, bubbles: true, pointerType: 'touch', isPrimary: true });
      c.dispatchEvent(ev('pointerdown', x, y));
      for (let i = 1; i <= 4; i++) window.dispatchEvent(ev('pointermove', x + i * 6, y - i * 2));
    }, [spots.wizard.x, spots.wizard.y]);
    await page.waitForTimeout(700);
    await page.evaluate(([x, y]) => window.dispatchEvent(new PointerEvent('pointerup', { clientX: x + 24, clientY: y - 8, pointerId: 7, bubbles: true, pointerType: 'touch', isPrimary: true })), [spots.wizard.x, spots.wizard.y]);
    await page.waitForTimeout(200);
    check(`a moving press opens no card (${w})`, !(await open()));
  }
  spots = await find();
  if (spots.wizard) await hold(spots.wizard, 'caster');
  if (bench) await hold(bench, 'locked');
  // (the camera panned up the board to the foes, as a finger would)
  for (let i = 0; i < 6 && !(spots.foe && spots.boss); i++) {
    await page.evaluate((i) => { const g = window.__game; const f = g.b.units.find((u) => u.side === 'foe' && (u.size > 1 || u.phase)) ?? g.b.units.find((u) => u.side === 'foe'); const sp = g.sprites.get(f.id); g.manualCam = true; g.cx = g.tx = sp.x - 30 + i * 5; g.cy = g.ty = sp.y; g.clampCam(); g.place(); }, i);
    await page.waitForTimeout(400);
    spots = await find();
  }
  if (spots.foe) await hold(spots.foe, 'foe');
  spots = await find();
  if (spots.boss) await hold(spots.boss, 'boss');
  const after = await page.evaluate(() => JSON.stringify(window.__game.b.units.map((u) => [u.id, u.u, u.v, u.hp])));
  check(`holding changed no unit (${w})`, before === after);
  check(`no page errors (${w})`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}
await br.close();
s.close();
console.log(fails.length ? `${fails.length} failed` : 'all ok');
process.exit(fails.length ? 1 : 0);
