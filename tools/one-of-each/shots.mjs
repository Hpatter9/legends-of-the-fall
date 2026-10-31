// ONE-OF-EACH's browser check (`docs/notes/one-of-each.md`): a knight and an archer on the field with copies on the bench; the bench marks
// the copy that cannot merge "On field"; a drop of it on another tile is refused with a note and the twin's tile lit; a drop on the twin
// swaps them; the archer's copy still merges into its twin. At the three upright phone sizes. Writes docs/samples/one-of-each-*.png.
//   npm run web && node tools/one-of-each/shots.mjs
import { createRequire } from 'node:module';
import { serve, HEROES } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const PORT = 8861;
const server = serve('out/web', PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader'] });
const wait = (page, ms) => page.waitForTimeout(ms);

/** As `boot` in tools/battle-ui/lib.mjs, with long timeouts (a busy machine loads the page slowly). */
async function boot(browser, w, h, port) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(240000);
  page.setDefaultNavigationTimeout(240000);
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.evaluate((heroes) => {
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: { knight: 5000, samurai: 5000 }, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
    localStorage.setItem('lotf-tips-off', '1');
  }, HEROES);
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.home, null, { timeout: 240000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page, errors };
}
let bad = 0;

async function setUp(page, heroes) {
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
  // (UNIT-INFO's press-and-hold is turned off for the check: on a busy machine the scripted drag's first move can come after its 400 ms)
  await page.evaluate(() => { window.__game.hold.start = () => {}; });
}

/** The screen point of a board tile (or of the unit tagged `tag`), a little below so the held hero (drawn 24px over the finger) lands on it. */
const tilePoint = (page, spec) => page.evaluate((spec) => {
  const g = window.__game;
  const c = g.app.canvas.getBoundingClientRect();
  if (spec.tag !== undefined) {
    const p = g.sprites.get(g.b.units.find((u) => u.tag === spec.tag).id).root.getGlobalPosition();
    return [c.left + p.x, c.top + p.y - 6 + 24];
  }
  for (let y = c.top; y < c.bottom; y += 3) for (let x = c.left; x < c.right; x += 3) {
    const t = g.tileAtScreen(x, y);
    if (t && t[0] === spec.u && t[1] === spec.v) return [x + 4, y + 10 + 24];
  }
  return null;
}, spec);

async function drag(page, from, to, shot, after) {
  const box = await page.locator(`#bench .card[data-id="${from}"]`).boundingBox();
  const [x0, y0] = [box.x + box.width / 2, box.y + box.height / 2];
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  // (a quick first step past the 8px slop, so a slow machine does not read the press as UNIT-INFO's hold)
  await page.mouse.move(x0, y0 - 20);
  for (let i = 1; i <= 12; i++) await page.mouse.move(x0 + ((to[0] - x0) * i) / 12, y0 + ((to[1] - y0) * i) / 12);
  await wait(page, 300);
  if (shot) await page.screenshot({ path: shot });
  await page.mouse.up();
  if (after) {
    await page.waitForFunction(() => document.getElementById('twinNote')?.hidden === false, null, { timeout: 5000 }).catch(() => {});
    await page.screenshot({ path: after });
  }
  await wait(page, 400);
}

const state = (page) => page.evaluate(() => {
  const g = window.__game;
  return { field: g.b.units.filter((u) => u.side === 'hero' && u.tag !== undefined).map((u) => `${u.tag}:${u.def}`).sort().join(' '), roster: g.run.roster.map((x) => `${x.id}:${x.kind}${x.grade}`).join(' '), twinOn: [...document.querySelectorAll('#bench .card.twinOn:not(.placed)')].map((c) => c.dataset.id).join(','), note: document.getElementById('twinNote')?.hidden === false ? document.getElementById('twinNote').textContent : '' };
});

for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const { ctx, page, errors } = await boot(browser, w, h, PORT);
  await setUp(page, [['knight', 1], ['knight', 2], ['archer', 1], ['archer', 1], ['cleric', 1], ['wizard', 1]]);
  // (the grade-1 knight and the first archer on the field; the grade-2 knight and the second archer wait on the bench)
  const spots = await page.evaluate(() => {
    const g = window.__game;
    const out = {};
    for (const id of ['1', '3']) {
      const s = [];
      for (let v = g.b.board.d - 3; v < g.b.board.d; v++) for (let u = 1; u < g.b.board.w - 1; u++) if (g.canPut(id, [u, v])) s.push([u, v]);
      out[id] = s[Math.floor(s.length / 2) + (id === '1' ? -2 : 2)] ?? s[0];
      g.put(id, out[id]);
    }
    // (a free tile for the refused drop)
    const free = [];
    for (let v = g.b.board.d - 3; v < g.b.board.d; v++) for (let u = 1; u < g.b.board.w - 1; u++) if (g.canPut('5', [u, v])) free.push([u, v]);
    g.refresh();
    g.markTiles();
    return { ...out, free: free[Math.floor(free.length / 2)] };
  });
  await wait(page, 900);
  const s0 = await state(page);
  await page.screenshot({ path: `docs/samples/one-of-each-bench-${w}x${h}.png` });
  // (the grade-2 knight onto a free tile: refused, a note, the fielded knight's tile lit)
  const free = await tilePoint(page, { u: spots.free[0], v: spots.free[1] });
  await drag(page, 2, free, w === 393 ? `docs/samples/one-of-each-held-${w}x${h}.png` : null, `docs/samples/one-of-each-refused-${w}x${h}.png`);
  const s1 = await state(page);
  await wait(page, 2000);
  // (the grade-2 knight onto the fielded knight: they swap)
  await drag(page, 2, await tilePoint(page, { tag: 1 }));
  await wait(page, 900);
  const s2 = await state(page);
  await page.screenshot({ path: `docs/samples/one-of-each-swap-${w}x${h}.png` });
  // (the bench archer onto the fielded archer: a merge, as before)
  await drag(page, 4, await tilePoint(page, { tag: 3 }));
  await wait(page, 1500);
  const s3 = await state(page);
  await page.screenshot({ path: `docs/samples/one-of-each-merge-${w}x${h}.png` });
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log(`${w}x${h}`, JSON.stringify({ s0, s1, s2, s3, wide, errors: errors.length }));
  const ok = s0.twinOn === '2' && s1.field === '1:knight 3:archer' && s1.note.includes('already on the field') && s2.field === '2:knight 3:archer' && s2.twinOn === '1' && !s3.roster.includes('4:archer') && s3.roster.includes('3:archer2') && !wide && !errors.length;
  if (!ok) bad++;
  console.log(ok ? 'ok' : 'FAILED');
  await ctx.close();
}
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
