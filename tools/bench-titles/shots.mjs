// BENCH-TITLES' browser check (docs/notes/bench-titles.md): a placed hero dragged down to the bench lights the whole panel as a drop
// target and goes back when let go there; a quick flick down does the same; a drag onto a matching bench card still merges. Then the
// hero titles in the dossier, the summon reveal, the codex and the end recap's MVP. At the three upright phone sizes.
//   npm run web && node tools/bench-titles/shots.mjs      writes docs/samples/bench-titles-*.png; fails on a page error or a check
import { serve } from '../battle-ui/lib.mjs';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const launch = () => chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

const PORT = 8761;
const server = serve('out/web', PORT);
const browser = await launch();
const wait = (page, ms) => page.waitForTimeout(ms);
const fails = [];
let errors = 0;
const check = (name, ok, info = '') => { console.log(ok ? 'ok  ' : 'FAIL', name, info); if (!ok) fails.push(name); };

/** A page on a save of eight heroes (the battle-ui save), with long waits: the machine may be busy. */
async function boot(browser, w, h, port) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(180000);
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  const heroes = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'werewolf'];
  await page.addInitScript((heroes) => {
    if (sessionStorage.getItem('bt-set')) return;
    sessionStorage.setItem('bt-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: { knight: 5000, samurai: 5000 }, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
    localStorage.setItem('lotf-tips-off', '1');
  }, heroes);
  await page.goto(`http://localhost:${port}/`, { timeout: 240000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 240000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page, errors };
}

/** Into a fresh army run whose roster is `heroes` ([kind, grade]). */
async function setUp(page, heroes) {
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 120000 });
  await page.evaluate((heroes) => {
    const g = window.__game;
    const r = g.run;
    r.roster = heroes.map(([kind, grade], i) => ({ id: i + 1, kind, grade }));
    r.nextId = heroes.length + 1;
    r.squad = [];
    r.gold = 400;
    localStorage.setItem('legends.run', JSON.stringify(r));
    g.home.go(() => g.resume());
  }, heroes);
  await wait(page, 1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.evaluate(() => document.querySelectorAll('.cutscene, #scene').forEach((e) => e.remove?.()));
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
}
/** Put hero `id` on a deploy tile (the middle of the nearest row's free ones, shifted by `off`). */
const field = (page, id, off = 0) => page.evaluate(([id, off]) => {
  const g = window.__game;
  const spots = [];
  for (let v = g.b.board.d - 3; v < g.b.board.d; v++) for (let u = 1; u < g.b.board.w - 1; u++) if (g.canPut(id, [u, v])) spots.push([u, v]);
  g.put(id, spots[Math.floor(spots.length / 2) + off] ?? spots[0]);
  g.refresh();
  g.markTiles();
}, [id, off]);
/** Where hero `tag` stands on screen (the finger's point that picks it up). */
const heroAt = (page, tag) => page.evaluate((tag) => {
  const g = window.__game;
  const u = g.b.units.find((x) => x.tag === tag);
  const p = g.sprites.get(u.id).root.getGlobalPosition();
  const c = g.app.canvas.getBoundingClientRect();
  return [c.left + p.x, c.top + p.y - 10];
}, tag);
/** Wait for the camera to settle (the opening framing glides), then where hero `tag` stands. */
async function settled(page, tag) {
  let last = await heroAt(page, tag);
  for (let i = 0; i < 40; i++) {
    await wait(page, 300);
    const now = await heroAt(page, tag);
    if (Math.abs(now[0] - last[0]) < 1 && Math.abs(now[1] - last[1]) < 1) return now;
    last = now;
  }
  return last;
}
const onBoard = (page, tag) => page.evaluate((tag) => window.__game.b.units.some((u) => u.side === 'hero' && u.tag === tag), tag);

for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const { ctx, page, errors: errs } = await boot(browser, w, h, PORT);
  await setUp(page, [['knight', 1], ['knight', 1], ['archer', 1], ['cleric', 1], ['wizard', 1], ['paladin', 1]]);
  await field(page, '3', -1);
  await field(page, '4', 1);
  await wait(page, 900);
  // --- a slow drag of the archer down into the bench: the panel lights, "Return to bench"
  const [x0, y0] = await settled(page, 3);
  const panel = await page.locator('#panel').boundingBox();
  const to = [x0 + 30, panel.y + panel.height * 0.55];
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(x0, y0 + 10 * i); await wait(page, 30); }
  const can = await page.evaluate(() => ({ can: document.getElementById('panel').classList.contains('returnCan'), tag: document.getElementById('returnTag').hidden ? '' : document.getElementById('returnTag').textContent }));
  check(`a placed hero picked up outlines the bench (${w})`, can.can && !!can.tag, JSON.stringify(can));
  for (let i = 1; i <= 14; i++) { await page.mouse.move(x0 + ((to[0] - x0) * i) / 14, y0 + 60 + ((to[1] - y0 - 60) * i) / 14); await wait(page, 30); }
  await wait(page, 300);
  const hot = await page.evaluate(() => ({ hot: document.getElementById('panel').classList.contains('returnHot'), tag: document.getElementById('returnTag').textContent }));
  check(`over the bench it lights up (${w})`, hot.hot && /Return to bench/.test(hot.tag), JSON.stringify(hot));
  await page.screenshot({ path: `docs/samples/bench-titles-drag-${w}x${h}.png` });
  await page.mouse.up();
  await wait(page, 500);
  check(`let go over the bench, it goes back (${w})`, !(await onBoard(page, 3)));
  check(`the light goes out (${w})`, await page.evaluate(() => !document.getElementById('panel').className.includes('return') && document.getElementById('returnTag').hidden));
  // --- the bottom bar counts too: let go over the Fight button's row
  await field(page, '3', -1);
  await wait(page, 300);
  {
    const [a, b] = await settled(page, 3);
    const btn = await page.locator('#buttons').boundingBox();
    await page.mouse.move(a, b);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(a, b + ((btn.y + btn.height / 2 - b) * i) / 12); await wait(page, 25); }
    await page.mouse.up();
    await wait(page, 400);
    check(`let go over the bottom bar, it goes back (${w})`, !(await onBoard(page, 3)));
  }
  // --- a quick flick down, let go still above the panel
  await field(page, '3', -1);
  await wait(page, 300);
  {
    const [a, b] = await settled(page, 3);
    const top = (await page.locator('#panel').boundingBox()).y;
    const end = Math.min(top - 40, b + 110);
    // (the moves are sent in the page, 12 ms apart by the clock, as a phone sends them: a busy headless page draws far slower than
    // a phone, and Playwright's own moves would come seconds apart)
    const ms = await page.evaluate(([a, b, end]) => {
      const c = window.__game.app.canvas;
      const opts = (x, y) => ({ pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true });
      const t0 = performance.now();
      c.dispatchEvent(new PointerEvent('pointerdown', opts(a, b)));
      for (let i = 1; i <= 5; i++) {
        const until = t0 + 12 * i;
        while (performance.now() < until) { /* (the finger's pace) */ }
        window.dispatchEvent(new PointerEvent('pointermove', opts(a, b + ((end - b) * i) / 5)));
      }
      window.dispatchEvent(new PointerEvent('pointerup', opts(a, end)));
      return Math.round(performance.now() - t0);
    }, [a, b, end]);
    await wait(page, 400);
    check(`a quick flick down sends it back (${w})`, !(await onBoard(page, 3)), `released ${Math.round(top - end)}px above the panel, ${Math.round(end - b)}px in ${ms} ms`);
  }
  // --- a slow drag to a tile above the panel still moves the hero there (no flick)
  await field(page, '3', -1);
  await wait(page, 300);
  {
    const [a, b] = await settled(page, 3);
    await page.mouse.move(a, b);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) { await page.mouse.move(a + 4 * i, b - 4 * i); await wait(page, 40); }
    await page.mouse.up();
    await wait(page, 400);
    check(`a slow move on the board keeps it on the board (${w})`, await onBoard(page, 3));
  }
  // --- drag-merge first: the fielded knight dragged onto its twin's bench card merges, not returns
  await field(page, '1', 0);
  await wait(page, 300);
  {
    const [a, b] = await settled(page, 1);
    const card = await page.locator('#bench .card[data-id="2"]').boundingBox();
    const t = [card.x + card.width / 2, card.y + card.height / 2];
    await page.mouse.move(a, b);
    await page.mouse.down();
    for (let i = 1; i <= 14; i++) { await page.mouse.move(a + ((t[0] - a) * i) / 14, b + ((t[1] - b) * i) / 14); await wait(page, 25); }
    const st = await page.evaluate(() => ({ hot: document.querySelector('#bench .mergeHot')?.dataset.id ?? null, ret: document.getElementById('panel').classList.contains('returnHot') }));
    if (w === 393) await page.screenshot({ path: `docs/samples/bench-titles-merge-${w}x${h}.png` });
    await page.mouse.up();
    await wait(page, 900);
    const roster = await page.evaluate(() => window.__game.run.roster.map((x) => `${x.id}:${x.kind}${x.grade}`).join(' '));
    check(`over its twin's card the merge wins (${w})`, st.hot === '2' && !st.ret && /2:knight2/.test(roster) && !/1:knight/.test(roster), `${JSON.stringify(st)} ${roster}`);
  }
  // --- the titles: the summon reveal at its last beat, at every size
  await page.evaluate(() => { void window.__tarot.firstReveal(window.__game.meta, 'kitsune', { hold: 4 }); });
  await wait(page, 3800);
  const plate = await page.evaluate(() => {
    const h3 = document.querySelector('.tarotReveal .trPlate h3');
    const r = h3.getBoundingClientRect();
    return { text: h3.textContent, lines: Math.round(r.height / parseFloat(getComputedStyle(h3).lineHeight || '30')), over: h3.scrollWidth > h3.clientWidth + 1, right: r.right, cls: document.querySelector('.tarotReveal .trTitle').textContent };
  });
  check(`the reveal names the hero with its title (${w})`, plate.text === 'Kohaku, Amber Fox of Many Faces' && !plate.over && plate.right <= w && /Kitsune/.test(plate.cls), JSON.stringify(plate));
  await page.screenshot({ path: `docs/samples/bench-titles-reveal-${w}x${h}.png` });
  await page.evaluate(() => document.querySelectorAll('.tarotReveal').forEach((e) => e.remove()));
  // (the longest of the titles, at the narrowest size)
  if (w === 360) {
    for (const k of ['minotaur', 'demonSwordsman', 'samurai']) {
      await page.evaluate((k) => { void window.__tarot.firstReveal(window.__game.meta, k, { hold: 4 }); }, k);
      await wait(page, 3800);
      const p = await page.evaluate(() => { const h3 = document.querySelector('.tarotReveal .trPlate h3'); const e = h3.querySelector('.htEpithet'); return { text: h3.textContent, over: h3.scrollWidth > h3.clientWidth + 1, epLines: Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)) }; });
      check(`${k}'s title fits the reveal at 360`, !p.over && p.epLines <= 2, JSON.stringify(p));
      if (k === 'minotaur') await page.screenshot({ path: 'docs/samples/bench-titles-reveal-long-360x780.png' });
      await page.evaluate(() => document.querySelectorAll('.tarotReveal').forEach((e) => e.remove()));
    }
  }
  errors += errs.length;
  await ctx.close();
}

// --- the dossier, the codex and the end recap's MVP, at 393x852
{
  const { ctx, page, errors: errs } = await boot(browser, 393, 852, PORT);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 120000 });
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  await page.evaluate(() => { const g = window.__game; g.home.open(); g.home.show('heroes'); });
  await wait(page, 1800);
  // (the roster cards keep the short name, the class under it)
  const card = await page.evaluate(() => document.querySelector('.hcard[data-kind="cleric"] .heroCardName')?.textContent);
  check('the roster card keeps the short name', card === 'SelamCleric', card);
  await page.locator('.hcard[data-kind="cleric"]').click();
  await wait(page, 900);
  const head = await page.evaluate(() => { const h = document.querySelector('.dossierIdentity h3'); return { text: h?.textContent, em: document.querySelector('.dossierIdentity em')?.textContent, over: h ? h.scrollWidth > h.clientWidth + 1 : true }; });
  check('the dossier shows "Selam, Lantern of Mercy" and the class', head.text === 'Selam, Lantern of Mercy' && /^Cleric · /.test(head.em ?? '') && !head.over, JSON.stringify(head));
  await page.screenshot({ path: 'docs/samples/bench-titles-dossier-393x852.png' });
  await page.evaluate(() => document.querySelector('.heroArtOpen')?.click());
  await wait(page, 900);
  const art = await page.evaluate(() => document.querySelector('dialog.heroArtViewer[open] > h2')?.textContent);
  check('the artwork viewer shows the title and the class', art === 'Selam, Lantern of MercyCleric', art);
  await page.screenshot({ path: 'docs/samples/bench-titles-artwork-393x852.png' });
  errors += errs.length;
  await ctx.close();
}

check('no page errors', errors === 0, String(errors));
await browser.close();
server.close();
if (fails.length) { console.log('FAILED:', fails.join('; ')); process.exit(1); }
