// RUNE-BENCH screenshots (docs/notes/rune-bench.md) at the three upright phone sizes: the heroes' bench with the pull bar, the bar
// mid-slide, the rune bench, a rune dragged onto its twin and the merge, a rune dragged onto a hero and set, and a refused drop.
// Writes docs/samples/rune-bench/*.png.   npm run web && node tools/rune-bench/shots.mjs [out dir]
import { serve, boot, launch } from '../battle-ui/lib.mjs';

const PORT = 8663;
const server = serve('out/web', PORT);
const browser = await launch();
const wait = (page, ms) => page.waitForTimeout(ms);
const dir = process.argv[2] ?? 'docs/samples/rune-bench';
import { mkdirSync } from 'node:fs';
mkdirSync(dir, { recursive: true });
let bad = 0;

async function setUp(page) {
  await page.evaluate(() => {
    const g = window.__game;
    const r = g.run;
    r.roster = [['knight', 1], ['archer', 1], ['wizard', 1], ['cleric', 1], ['samurai', 1]].map(([kind, grade], i) => ({ id: i + 1, kind, grade }));
    r.nextId = 6;
    r.squad = [];
    r.gold = 400;
    r.real = true;
    r.runes = {
      bag: [{ id: 10, kind: 'ember', lv: 1 }, { id: 11, kind: 'ember', lv: 1 }, { id: 12, kind: 'keystone', lv: 2 }, { id: 13, kind: 'gale', lv: 1 }, { id: 14, kind: 'hawk', lv: 2 }, { id: 15, kind: 'warding', lv: 1 }],
      worn: { knight: [{ id: 1, kind: 'bulwark', lv: 2 }], wizard: [{ id: 4, kind: 'arcana', lv: 3 }, { id: 5, kind: 'warding', lv: 1 }, { id: 6, kind: 'wellspring', lv: 5 }] },
      next: 20,
    };
    localStorage.setItem('legends.run', JSON.stringify(r));
    const st = JSON.parse(localStorage.getItem('legends.settings') ?? '{}');
    localStorage.setItem('legends.settings', JSON.stringify({ ...st, cinematics: false }));
    g.home.go(() => g.resume());
  });
  await wait(page, 1500);
  for (let i = 0; i < 6; i++) {
    await wait(page, 500);
    await page.evaluate(() => { document.querySelector('.csSkip')?.click(); document.getElementById('tipSkip')?.click(); });
  }
  // (three heroes on the field, two left on the bench)
  await page.evaluate(() => {
    const g = window.__game;
    g.autoArrange(true);
    for (const id of [4, 5]) if (g.b.units.some((u) => u.tag === id)) g.takeBack(String(id));
    g.refresh();
  });
  await wait(page, 900);
}

/** The screen point of a hero kind on the field (its middle). */
const heroPoint = (page, kind) =>
  page.evaluate((kind) => {
    const g = window.__game;
    const u = g.b.units.find((x) => x.side === 'hero' && g.run.roster.find((h) => h.id === x.tag)?.kind === kind);
    const s = g.sprites.get(u.id);
    const r = g.app.canvas.getBoundingClientRect();
    const k = r.width / g.app.screen.width;
    const w = g.world;
    return { x: r.left + (w.x + s.x * w.scale.x) * k, y: r.top + (w.y + (s.y - s.tall * 0.5) * w.scale.y) * k + 34 };
  }, kind);
const box = (page, sel) => page.evaluate((sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);

async function drag(page, from, to, shot) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const n = 12;
  for (let i = 1; i <= n; i++) await page.mouse.move(from.x + ((to.x - from.x) * i) / n, from.y + ((to.y - from.y) * i) / n);
  await wait(page, 150);
  if (shot) await page.screenshot({ path: shot });
  await page.mouse.up();
}

for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const { ctx, page, errors } = await boot(browser, w, h, PORT);
  await setUp(page);
  const tag = `${w}x${h}`;
  await page.screenshot({ path: `${dir}/1-heroes-${tag}.png` });
  // (the bar pulled halfway, held)
  const g0 = await box(page, '#benchGrip');
  const width = await page.evaluate(() => document.getElementById('benchView').clientWidth);
  await page.mouse.move(g0.x, g0.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(g0.x - (width * 0.45 * i) / 10, g0.y);
  await wait(page, 100);
  await page.screenshot({ path: `${dir}/2-slide-${tag}.png` });
  for (let i = 1; i <= 5; i++) await page.mouse.move(g0.x - width * 0.45 - (width * 0.2 * i) / 5, g0.y);
  await page.mouse.up();
  await wait(page, 600);
  const side = await page.evaluate(() => document.body.dataset.bench);
  if (side !== 'runes') (bad++, console.log(tag, 'the pull did not land on the runes:', side));
  await page.screenshot({ path: `${dir}/3-runes-${tag}.png` });
  // (an Ember I dragged onto its twin: the twin lit, then merged)
  await drag(page, await box(page, '.rbTile[data-id="10"]'), await box(page, '.rbTile[data-id="11"]'), `${dir}/4-merge-drag-${tag}.png`);
  await wait(page, 250);
  await page.screenshot({ path: `${dir}/5-merged-${tag}.png` });
  const merged = await page.evaluate(() => window.__game.run.runes.bag.some((r) => r.kind === 'ember' && r.lv === 2));
  if (!merged) (bad++, console.log(tag, 'no merge'));
  // (a Gale I dragged onto the archer: the heroes that can take it lit, then set)
  await drag(page, await box(page, '.rbTile[data-id="13"]'), await heroPoint(page, 'archer'), `${dir}/6-drop-drag-${tag}.png`);
  await wait(page, 400);
  await page.screenshot({ path: `${dir}/7-dropped-${tag}.png` });
  const set = await page.evaluate(() => window.__game.run.runes.worn.archer?.some((r) => r.id === 13));
  if (!set) (bad++, console.log(tag, 'no socket'));
  // (the Keystone dragged onto a hero: refused, with the note)
  await drag(page, await box(page, '.rbTile[data-id="12"]'), await heroPoint(page, 'knight'), null);
  await wait(page, 120);
  await page.screenshot({ path: `${dir}/8-refused-${tag}.png` });
  await wait(page, 600);
  // (a rest on a tile: the rune's card)
  const t = await box(page, '.rbTile[data-id="14"]');
  await page.mouse.move(t.x, t.y);
  await page.mouse.down();
  await wait(page, 650);
  await page.mouse.up();
  await wait(page, 300);
  await page.screenshot({ path: `${dir}/9-rune-card-${tag}.png` });
  await page.evaluate(() => document.querySelector('#runeInfo .omBack')?.click());
  // (the bar tapped back to the heroes)
  await page.click('#benchGrip');
  await wait(page, 600);
  const back = await page.evaluate(() => document.body.dataset.bench);
  if (back !== 'heroes') (bad++, console.log(tag, 'the tap did not bring the heroes back'));
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) (bad++, console.log(tag, 'side scroll'));
  bad += errors.length;
  console.log(tag, 'merged', merged, 'socketed', set, 'errors', errors.length);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
