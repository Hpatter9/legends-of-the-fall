// MERGE-TWO's browser check (`docs/notes/merge-two.md`): an army run with pairs ready on the bench and on the board, a drag-merge, the
// Auto merge button, and a rank-4 hero's look, at the three upright phone sizes. Writes docs/samples/merge-two-*.png.
//   npm run web && node tools/merge-two/shots.mjs
import { serve, boot, launch } from '../battle-ui/lib.mjs';

const PORT = 8661;
const server = serve('out/web', PORT);
const browser = await launch();
const wait = (page, ms) => page.waitForTimeout(ms);
let errors = 0;

/** Into a fresh army run whose roster is `heroes` ([kind, grade]); the first `field` are placed by Auto. */
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

for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const { ctx, page, errors: errs } = await boot(browser, w, h, PORT);
  await setUp(page, [['knight', 1], ['knight', 1], ['archer', 2], ['archer', 2], ['cleric', 1], ['paladin', 3], ['paladin', 3], ['wizard', 1]]);
  // (two heroes on the field: a knight and an archer, whose twins wait on the bench)
  await page.evaluate(() => {
    const g = window.__game;
    for (const id of ['1', '3']) {
      const spots = [];
      for (let v = g.b.board.d - 3; v < g.b.board.d; v++) for (let u = 1; u < g.b.board.w - 1; u++) if (g.canPut(id, [u, v])) spots.push([u, v]);
      g.put(id, spots[Math.floor(spots.length / 2) + (id === '1' ? -2 : 2)] ?? spots[0]);
    }
    g.refresh();
    g.markTiles();
  });
  await wait(page, 900);
  await page.screenshot({ path: `docs/samples/merge-two-ready-${w}x${h}.png` });
  // (drag the bench's knight onto the fielded one: the merge)
  const card = await page.locator('#bench .card[data-id="2"]').boundingBox();
  const target = await page.evaluate(() => {
    const g = window.__game;
    const sp = g.sprites.get(g.b.units.find((u) => u.tag === 1).id);
    const p = sp.root.getGlobalPosition();
    const c = g.app.canvas.getBoundingClientRect();
    return [c.left + p.x, c.top + p.y - 6 + 24];
  });
  await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(card.x + card.width / 2 + ((target[0] - card.x - card.width / 2) * i) / 12, card.y + card.height / 2 + ((target[1] - card.y - card.height / 2) * i) / 12);
  await wait(page, 300);
  if (w === 393) await page.screenshot({ path: `docs/samples/merge-two-drag-${w}x${h}.png` });
  await page.mouse.up();
  await wait(page, 700);
  const afterDrag = await page.evaluate(() => window.__game.run.roster.map((x) => `${x.id}:${x.kind}${x.grade}`).join(' '));
  if (w === 393) await page.screenshot({ path: `docs/samples/merge-two-dragged-${w}x${h}.png` });
  const btn = await page.evaluate(() => { const b = document.getElementById('mergeAll'); return b.hidden ? 'hidden' : b.textContent; });
  await page.evaluate(() => document.getElementById('mergeAll').click());
  await wait(page, 1200);
  const afterAuto = await page.evaluate(() => window.__game.run.roster.map((x) => `${x.id}:${x.kind}${x.grade}`).join(' '));
  await page.screenshot({ path: `docs/samples/merge-two-auto-${w}x${h}.png` });
  const btn2 = await page.evaluate(() => (document.getElementById('mergeAll').hidden ? 'hidden' : 'shown'));
  // (a rank-4 hero: the merged paladin, placed on the field)
  await page.evaluate(() => {
    const g = window.__game;
    const p = g.run.roster.find((x) => x.grade === 4);
    const spots = [];
    for (let v = g.b.board.d - 3; v < g.b.board.d; v++) for (let u = 0; u < g.b.board.w; u++) if (g.canPut(String(p.id), [u, v])) spots.push([u, v]);
    g.put(String(p.id), spots[Math.floor(spots.length / 2)]);
    g.refresh();
  });
  // (after the promotion's banner and the hero's line have gone)
  await wait(page, 7000);
  await page.screenshot({ path: `docs/samples/merge-two-rank4-${w}x${h}.png` });
  if (w === 393) {
    const box = await page.evaluate(() => {
      const g = window.__game;
      const u = g.b.units.find((x) => x.grade === 4);
      const p = g.sprites.get(u.id).root.getGlobalPosition();
      const c = g.app.canvas.getBoundingClientRect();
      return { x: Math.max(0, c.left + p.x - 90), y: Math.max(0, c.top + p.y - 120), width: 180, height: 150 };
    });
    await page.screenshot({ path: `docs/samples/merge-two-rank4-close-${w}x${h}.png`, clip: box });
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log(`${w}x${h}: after drag ${afterDrag} · button ${btn} · after auto ${afterAuto} · button then ${btn2} · sideways scroll ${overflow} · page errors ${errs.length}`);
  errors += errs.length;
  await ctx.close();
}
await browser.close();
server.close();
console.log(`page errors: ${errors}`);
