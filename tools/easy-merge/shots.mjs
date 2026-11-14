// EASY-MERGE's browser check (`docs/notes/easy-merge.md`): a bench copy dragged a little off its match (onto the empty tile beside it,
// a match standing on the highest ground of the near rows) still merges; a drop clearly away still places; a bench-to-bench drop a few
// px off a card merges. At the three upright phone sizes, with photographs of the drag (the "Merge ⇧" label and the lit match) and, at
// 393x852, a strip of frames of the off-tile drop. Writes docs/samples/easy-merge-*.png.
//   npm run web && node tools/easy-merge/shots.mjs
import { serve, boot, launch } from '../battle-ui/lib.mjs';

const PORT = 8662;
const server = serve('out/web', PORT);
const browser = await launch();
const wait = (page, ms) => page.waitForTimeout(ms);
let errors = 0;
let fails = 0;

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
}

/** The roster as "id:kind grade" words. */
const roster = (page) => page.evaluate(() => window.__game.run.roster.map((x) => `${x.id}:${x.kind}${x.grade}`).join(' '));

/** A fielded hero's screen spot: its feet, its drawn height, and the tile it stands on. */
const spotOf = (page, tag) => page.evaluate((tag) => {
  const g = window.__game;
  const u = g.b.units.find((x) => x.tag === tag);
  const sp = g.sprites.get(u.id);
  const p = sp.root.getGlobalPosition();
  const c = g.app.canvas.getBoundingClientRect();
  const k = g.world.scale.x;
  return { x: c.left + p.x, y: c.top + p.y, tall: sp.tall * k, half: 16 * k, tile: [u.u, u.v], h: g.b.board.tiles[u.v * g.b.board.w + u.u].h };
}, tag);

/** Drag from (x0, y0) to (x1, y1) in `n` steps, calling `each` after every step. */
async function drag(page, x0, y0, x1, y1, n, each) {
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= n; i++) {
    await page.mouse.move(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
    if (each) await each(i);
  }
}

for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const { ctx, page, errors: errs } = await boot(browser, w, h, PORT);
  await setUp(page, [['knight', 1], ['knight', 1], ['archer', 1], ['archer', 1], ['cleric', 1], ['wizard', 1], ['wizard', 1]]);
  // (the knight on the highest standable tile of the near rows, the archer two tiles off on the same row)
  const placed = await page.evaluate(() => {
    const g = window.__game;
    const b = g.b.board;
    const spots = [];
    for (let v = b.d - 3; v < b.d; v++) for (let u = 1; u < b.w - 1; u++) if (g.canPut('1', [u, v])) spots.push([u, v, b.tiles[v * b.w + u].h]);
    spots.sort((a, c) => c[2] - a[2] || Math.abs(a[0] - 3.5) - Math.abs(c[0] - 3.5));
    const [ku, kv] = spots[0];
    g.put('1', [ku, kv]);
    const other = spots.find((s) => Math.abs(s[0] - ku) >= 3 && g.canPut('3', [s[0], s[1]]));
    if (other) g.put('3', [other[0], other[1]]);
    g.refresh();
    g.markTiles();
    return { knight: [ku, kv, spots[0][2]], archer: other, low: Math.min(...spots.map((s) => s[2])) };
  });
  await wait(page, 900);
  const k = await spotOf(page, 1);
  // (the drop point: past the right edge of the knight's drawn body, 22 px into the pad, and a little below its middle)
  const tx = k.x + k.half + 22;
  const ty = k.y - k.tall * 0.35 + 24;
  const under = await page.evaluate(([x, y]) => window.__game.tileAtScreen(x, y - 24), [tx, ty]);
  const offTile = !under || under[0] !== k.tile[0] || under[1] !== k.tile[1];
  const card = await page.locator('#bench .card[data-id="2"]').boundingBox();
  const frames = [];
  await drag(page, card.x + card.width / 2, card.y + card.height / 2, tx, ty, 10, async (i) => {
    if (w === 393 && i % 2 === 0) {
      const f = `docs/samples/easy-merge-strip-${i}-${w}x${h}.png`;
      await page.screenshot({ path: f, clip: { x: 0, y: Math.max(0, k.y - 260), width: w, height: 340 } });
      frames.push(f);
    }
  });
  await wait(page, 250);
  const label = await page.evaluate(() => { const t = document.getElementById('mergeTag'); return t.hidden ? 'hidden' : t.textContent; });
  const lit = await page.evaluate(() => { const g = window.__game; return [...g.sprites.values()].filter((s) => s.mergeLit).map((s) => `${s.unit.tag}:${s.mergeLit}`).join(' '); });
  await page.screenshot({ path: `docs/samples/easy-merge-drag-${w}x${h}.png` });
  await page.mouse.up();
  await wait(page, 700);
  if (w === 393) await page.screenshot({ path: `docs/samples/easy-merge-strip-z-${w}x${h}.png`, clip: { x: 0, y: Math.max(0, k.y - 260), width: w, height: 340 } });
  const afterOff = await roster(page);
  const mergedOff = afterOff.includes('1:knight2') && !afterOff.includes('2:knight');
  // (a drop clearly away from the fielded archer, on an empty tile: no merge (ONE-OF-EACH keeps the copy off the field, as before), then
  // the cleric, which has no match, dropped on that tile is placed there)
  const far = await page.evaluate(([ax]) => {
    const g = window.__game;
    const b = g.b.board;
    for (let v = b.d - 1; v >= b.d - 3; v--) for (let u = 0; u < b.w; u++) if (Math.abs(u - ax) >= 3 && g.canPut('5', [u, v])) return [u, v];
    return null;
  }, [placed.archer?.[0] ?? 0]);
  const farPt = await page.evaluate(([u, v]) => {
    const g = window.__game;
    // (the tile's middle on the screen, found by the page's own reading of the screen)
    for (let y = 0; y < innerHeight; y += 3) for (let x = 0; x < innerWidth; x += 3) { const t = g.tileAtScreen(x, y - 24); if (t && t[0] === u && t[1] === v) return [x + 6, y + 6]; }
    return null;
  }, far);
  const card4 = await page.locator('#bench .card[data-id="4"]').boundingBox();
  await drag(page, card4.x + card4.width / 2, card4.y + card4.height / 2, farPt[0], farPt[1], 8);
  const labelFar = await page.evaluate(() => (document.getElementById('mergeTag').hidden ? 'hidden' : 'shown'));
  await page.mouse.up();
  await wait(page, 500);
  const afterFar = await roster(page);
  const card5 = await page.locator('#bench .card[data-id="5"]').boundingBox();
  await drag(page, card5.x + card5.width / 2, card5.y + card5.height / 2, farPt[0], farPt[1], 8);
  await page.mouse.up();
  await wait(page, 500);
  const placedFar = afterFar.includes('4:archer1') && (await page.evaluate(() => window.__game.b.units.some((u) => u.tag === 5)));
  // (bench to bench: a wizard dropped 6 px past the other wizard card's edge merges)
  const c6 = await page.locator('#bench .card[data-id="6"]').boundingBox();
  const c7 = await page.locator('#bench .card[data-id="7"]').boundingBox();
  await drag(page, c6.x + c6.width / 2, c6.y + c6.height / 2, c7.x + c7.width + 12, c7.y + c7.height / 2, 8);
  await wait(page, 150);
  const benchLabel = await page.evaluate(() => (document.getElementById('mergeTag').hidden ? 'hidden' : 'shown'));
  await page.mouse.up();
  await wait(page, 500);
  const afterBench = await roster(page);
  const benchMerged = /7:wizard2/.test(afterBench) && !/6:wizard/.test(afterBench);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const ok = offTile && mergedOff && label.startsWith('Merge') && labelFar === 'hidden' && placedFar && benchMerged && !overflow;
  if (!ok) fails++;
  console.log(`${w}x${h}: knight on [${placed.knight}] (height ${k.h}, the near rows' lowest ${placed.low}) · drop over tile ${JSON.stringify(under)} (off its tile: ${offTile}) · label ${label} · lit ${lit} · merged ${mergedOff} · far drop placed ${placedFar}, label ${labelFar} · bench drop 12px off: label ${benchLabel}, merged ${benchMerged} · sideways scroll ${overflow} · errors ${errs.length} · ${ok ? 'OK' : 'FAIL'}`);
  console.log(`   rosters: ${afterOff} | ${afterFar} | ${afterBench}`);
  errors += errs.length;
  await ctx.close();
}
await browser.close();
server.close();
console.log(`page errors: ${errors} · fails: ${fails}`);
process.exit(fails ? 1 : 0);
