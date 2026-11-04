// Screenshots of the rune page (SEVEN-SLOT GEAR batch 5, docs/notes/gear-build.md) at the three upright phone sizes: the bench's
// sockets on the deploy screen, the rune tray, and a rune picked with the places it can go lit. Writes docs/samples/gear-build-runes-*.png.
//   npm run web && node tools/gear-build/rune-shots.mjs
import { serve, boot, launch } from '../battle-ui/lib.mjs';

const PORT = 8662;
const server = serve('out/web', PORT);
const browser = await launch();
const wait = (page, ms) => page.waitForTimeout(ms);
let errors = 0;

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
      bag: [{ id: 10, kind: 'ember', lv: 1 }, { id: 11, kind: 'hawk', lv: 2 }, { id: 12, kind: 'keystone', lv: 1 }, { id: 13, kind: 'gale', lv: 1 }],
      worn: { knight: [{ id: 1, kind: 'bulwark', lv: 2 }, { id: 2, kind: 'ember', lv: 1 }], archer: [{ id: 3, kind: 'hawk', lv: 2 }], wizard: [{ id: 4, kind: 'arcana', lv: 3 }, { id: 5, kind: 'warding', lv: 1 }, { id: 6, kind: 'wellspring', lv: 5 }] },
      next: 20,
    };
    localStorage.setItem('legends.run', JSON.stringify(r));
    // (no cinematics over the deploy screen)
    const st = JSON.parse(localStorage.getItem('legends.settings') ?? '{}');
    localStorage.setItem('legends.settings', JSON.stringify({ ...st, cinematics: false }));
    g.home.go(() => g.resume());
  });
  await wait(page, 1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());

  await page.evaluate(() => document.querySelectorAll('.cutscene, #scene').forEach((e) => e.remove?.()));
}

for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const { ctx, page, errors: errs } = await boot(browser, w, h, PORT);
  await setUp(page);
  // (skip any cinematic that plays as the wave opens)
  for (let i = 0; i < 6; i++) {
    await wait(page, 700);
    await page.evaluate(() => document.querySelector('.csSkip')?.click());
  }
  await wait(page, 800);
  await page.evaluate(() => document.getElementById('auto')?.click());
  await wait(page, 900);
  await page.screenshot({ path: `docs/samples/gear-build-runes-bench-${w}x${h}.png` });
  const label = await page.evaluate(() => document.getElementById('pack').textContent);
  await page.evaluate(() => document.getElementById('pack').click());
  await wait(page, 600);
  await page.screenshot({ path: `docs/samples/gear-build-runes-tray-${w}x${h}.png` });
  await page.evaluate(() => document.querySelector('.rnBag .rnCell .k-ember')?.closest('button')?.click());
  await wait(page, 300);
  await page.screenshot({ path: `docs/samples/gear-build-runes-pick-${w}x${h}.png` });
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log(`${w}x${h}`, 'pack button:', label, '· side scroll', wide);
  errors += errs.length;
  for (const e of errs) console.log('page error:', e);
  await ctx.close();
}
await browser.close();
server.close();
console.log(errors ? `${errors} page errors` : 'no page errors');
