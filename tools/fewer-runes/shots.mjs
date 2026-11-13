// FEWER-RUNES screenshots (docs/notes/fewer-runes.md) at the three upright phone sizes: the rune bench, two kinds of one level dragged
// together and merged, a rune's card (its numbers, its signature, the merge rule), the Keystone's card, and a hero wearing three runes.
// Writes docs/samples/fewer-runes/*.png.   npm run web && node tools/fewer-runes/shots.mjs [out dir]
import { serve, boot, launch } from '../battle-ui/lib.mjs';

const PORT = 8671;
const server = serve('out/web', PORT);
const browser = await launch();
const wait = (page, ms) => page.waitForTimeout(ms);
const dir = process.argv[2] ?? 'docs/samples/fewer-runes';
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
  await page.click('#benchGrip');
  await wait(page, 700);
  const side = await page.evaluate(() => document.body.dataset.bench);
  if (side !== 'runes') (bad++, console.log(tag, 'the tap did not open the runes:', side));
  await page.screenshot({ path: `${dir}/1-bench-${tag}.png` });
  // (a Gale I dragged onto a Warding I: two kinds of one level merge into the kind landed on)
  await drag(page, await box(page, '.rbTile[data-id="13"]'), await box(page, '.rbTile[data-id="15"]'), `${dir}/2-merge-drag-${tag}.png`);
  await wait(page, 300);
  const merged = await page.evaluate(() => window.__game.run.runes.bag.some((r) => r.id === 15 && r.kind === 'warding' && r.lv === 2) && !window.__game.run.runes.bag.some((r) => r.id === 13));
  if (!merged) (bad++, console.log(tag, 'no merge of two kinds'));
  await page.screenshot({ path: `${dir}/3-merged-${tag}.png` });
  // (a rest on the Ember I: its card, with its numbers, its signature and the merge rule)
  const t = await box(page, '.rbTile[data-id="10"]');
  await page.mouse.move(t.x, t.y);
  await page.mouse.down();
  await wait(page, 650);
  await page.mouse.up();
  await wait(page, 300);
  const card = await page.evaluate(() => document.querySelector('#runeInfo')?.textContent ?? '');
  if (!/attack/.test(card) || !/kill bursts/.test(card) || !/takes the kind/.test(card)) (bad++, console.log(tag, 'the card lacks its words:', card));
  await page.screenshot({ path: `${dir}/4-rune-card-${tag}.png` });
  await page.evaluate(() => document.querySelector('#runeInfo .omBack')?.click());
  await wait(page, 300);
  // (the Keystone's card)
  const k = await box(page, '.rbTile[data-id="12"]');
  await page.mouse.move(k.x, k.y);
  await page.mouse.down();
  await wait(page, 650);
  await page.mouse.up();
  await wait(page, 300);
  await page.screenshot({ path: `${dir}/5-keystone-card-${tag}.png` });
  await page.evaluate(() => document.querySelector('#runeInfo .omBack')?.click());
  await wait(page, 300);
  // (a tap on the wizard, three runes worn: its sockets)
  const wz = await heroPoint(page, 'wizard');
  await page.mouse.click(wz.x, wz.y - 34);
  await wait(page, 500);
  const sockets = await page.evaluate(() => document.querySelector('#runeSockets')?.textContent ?? '');
  if (!/Arcana rune III/.test(sockets)) (bad++, console.log(tag, 'the sockets did not open:', sockets.slice(0, 80)));
  await page.screenshot({ path: `${dir}/6-three-runes-${tag}.png` });
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) (bad++, console.log(tag, 'side scroll'));
  bad += errors.length;
  for (const e of errors) console.log(tag, e);
  console.log(tag, 'merged', merged, 'errors', errors.length);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
