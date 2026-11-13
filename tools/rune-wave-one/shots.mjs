// RUNE-WAVE-ONE photographs (docs/notes/rune-wave-one.md) at the three upright phone sizes: an army run's first wave won, its wave card
// listing the rune the wave gave, and the rune bench before wave 2 holding it. Checks that the rune is there, no sideways scroll and no
// page errors. Writes docs/samples/rune-wave-one/*.png.   npm run web && node tools/rune-wave-one/shots.mjs [out dir]
import { mkdirSync } from 'node:fs';
import { serve, boot, launch } from '../battle-ui/lib.mjs';

const PORT = 8673;
const server = serve('out/web', PORT);
const browser = await launch();
const dir = process.argv[2] ?? 'docs/samples/rune-wave-one';
mkdirSync(dir, { recursive: true });
const PARTY = ['knight', 'samurai', 'wizard', 'archer', 'cleric'];
let bad = 0;

for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const { ctx, page, errors } = await boot(browser, w, h, PORT);
  const tag = `${w}x${h}`;
  await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('legends.settings') ?? '{}');
    localStorage.setItem('legends.settings', JSON.stringify({ ...st, cinematics: false }));
  });
  // (an army run, the Orc Warband on Normal, the party fielded)
  await page.evaluate(() => { const g = window.__game; g.home.go(() => g.home.hooks.onArmy('orcs', 0)); });
  await page.locator('#ptGo').waitFor({ state: 'visible' });
  await page.click('#ptGo');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(400);
    await page.evaluate(() => { document.querySelector('.csSkip')?.click(); document.getElementById('tipSkip')?.click(); });
  }
  await page.evaluate((party) => {
    const g = window.__game;
    g.run.gold = 300;
    g.run.roster = party.map((kind, i) => ({ id: i + 1, kind, grade: 1, paid: 5 }));
    g.run.squad = party.map((_, i) => i + 1);
    g.run.nextId = 6;
    g.newBattle();
    g.refresh();
  }, PARTY);
  const before = await page.evaluate(() => window.__game.run.runes?.bag.length ?? -1);
  if (before !== 0) (bad++, console.log(tag, 'the bag was not empty before wave 1:', before));
  // (wave 1 fought and won at once)
  await page.click('#fight');
  await page.waitForTimeout(600);
  await page.evaluate(() => { for (const u of window.__game.b.units) if (u.side === 'foe') u.hp = 0; });
  await page.waitForFunction(() => !document.getElementById('result').hidden && document.getElementById('result').classList.contains('passing'), null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  const card = await page.evaluate(() => document.getElementById('result').textContent ?? '');
  const rune = await page.evaluate(() => window.__game.run.runes?.bag[0]);
  if (!rune || !/rune I\b/.test(card)) (bad++, console.log(tag, 'wave 1 gave no rune on its card:', JSON.stringify(rune), card.slice(0, 200)));
  await page.screenshot({ path: `${dir}/1-wave-one-card-${tag}.png` });
  // (on to wave 2's deploy: the rune bench holds it)
  await page.click('#banner');
  await page.waitForFunction(() => document.getElementById('result').hidden && document.body.dataset.phase === 'deploy', null, { timeout: 15000 });
  if (await page.locator('#events').isVisible()) await page.evaluate(() => { const g = window.__game; g.run.event = undefined; document.getElementById('events').hidden = true; g.refresh(); });
  await page.waitForTimeout(600);
  await page.click('#benchGrip');
  await page.waitForTimeout(800);
  const tiles = await page.locator('#runeBench .rbTile:not(.empty)').count();
  if (tiles !== 1) (bad++, console.log(tag, 'the rune bench does not hold the one rune:', tiles));
  await page.screenshot({ path: `${dir}/2-bench-wave-two-${tag}.png` });
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (wide) (bad++, console.log(tag, 'side scroll'));
  bad += errors.length;
  console.log(tag, 'rune', rune ? `${rune.kind} ${rune.lv}` : 'none', 'tiles', tiles, 'errors', errors.length);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
