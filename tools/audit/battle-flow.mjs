// Screenshots for docs/samples/battle-flow-*.png: the bench at 10 heroes, the drag-to-recycle area, the fight bar with only the fielded units,
// the retry prompt, the after-wave report faces and the full run recap, at the three upright phones. Run `npm run web` first.
import { serve, launch, HEROES, saveScript } from './lib.mjs';
const srv = serve();
const browser = await launch();
const base = `http://localhost:${srv.address().port}/`;
const only = process.argv[2];
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  if (only && String(w) !== only) continue;
  const size = w === 393 ? '' : `-${w}x${h}`;
  const shot = (name) => page.screenshot({ path: `docs/samples/battle-flow-${name}${size}.png` });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: false });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.addInitScript(saveScript(), [HEROES, {}]);
  await page.goto(`${base}?seed=11`);
  await page.waitForTimeout(2500);
  if (await page.locator('#tipSkip').isVisible()) await page.locator('#tipSkip').click();
  const g = (fn, arg) => page.evaluate(fn, arg);
  // a full bench: ten heroes waiting
  await g(() => { window.__game.run.gold = 99999; });
  for (let i = 0; i < 40; i++) {
    if (await page.locator('#summon:disabled').count()) break;
    await page.locator('#summon').click();
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(900);
  console.log(w, 'bench', await g(() => { const r = window.__game.run; return [r.roster.length, r.squad.length, document.querySelectorAll('#bench .card:not(.placed)').length, document.getElementById('bench').scrollHeight, document.getElementById('bench').clientHeight, document.getElementById('summon').textContent]; }));
  await shot('bench');
  // drag a card: the recycle area shows
  const card = page.locator('#bench .card:not(.placed)').nth(3);
  const box = await card.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 10, box.y + 6, { steps: 4 });
  await page.waitForTimeout(200);
  await page.mouse.move(40, box.y + 30, { steps: 6 });
  await page.waitForTimeout(250);
  await shot('recycle');
  await page.mouse.up();
  await page.waitForTimeout(700);
  console.log(w, 'after drop', await g(() => window.__game.run.roster.length));
  // the fight: only the fielded units show on the bar
  await page.locator('#auto').click();
  await page.waitForTimeout(500);
  // the pack lists only the heroes on the field, and "Equip best" dresses them
  await g(() => { window.__game.run.items = [['weapon', 1], ['weapon', 3], ['armour', 2], ['armour', 1], ['charm', 2], ['weapon', 2]].map(([slot, tier], i) => ({ id: 900 + i, slot, tier, name: `${slot} ${tier}`, hp: slot === 'armour' ? 0.08 * tier : 0.03 * tier, atk: slot === 'weapon' ? 0.08 * tier : 0.03 * tier })); });
  await page.locator('#pack').click();
  await page.waitForTimeout(500);
  console.log(w, 'pack heroes', await g(() => document.querySelectorAll('.evcard.pack .heroes .pick').length));
  await shot('pack');
  await page.locator('.equipBest').click();
  await page.waitForTimeout(600);
  await shot('pack-equipped');
  console.log(w, 'items left', await g(() => window.__game.run.items.length));
  await page.locator('.evcard.pack header button').click();
  await page.waitForTimeout(600);
  await page.locator('#fight').click();
  await page.waitForTimeout(3500);
  console.log(w, 'fight bar', await g(() => [...document.querySelectorAll('#bench .card')].filter((c) => getComputedStyle(c).display !== 'none').length));
  await shot('fight');
  // (the first wave won: its report, with the heroes' faces)
  await g(() => { const G = window.__game; G.setSpeed(3); for (const u of G.b.units) if (u.side === 'foe') u.hp = 1; });
  await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 60000 });
  await page.waitForTimeout(1800);
  await shot('xp');
  await page.locator('#next').click();
  await page.waitForTimeout(800);
  if (await page.locator('#tipSkip').isVisible()) await page.locator('#tipSkip').click();
  await page.locator('#auto').click();
  await page.waitForTimeout(400);
  await page.locator('#fight').click();
  await page.waitForTimeout(1500);
  // the party falls: after the two seconds' wait the retry prompt shows
  await g(() => { const G = window.__game; G.setSpeed(3); for (const u of G.b.units) { if (u.side === 'hero') u.hp = 1; else u.power = 1e5; } });
  await page.waitForFunction(() => window.__game.b.phase !== 'fight', null, { timeout: 60000 });
  const t0 = Date.now();
  await page.waitForTimeout(900);
  console.log(w, 'result hidden at 0.9s', await g(() => document.getElementById('result').hidden));
  await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 8000 });
  console.log(w, 'result shown after', Date.now() - t0, 'ms');
  await page.waitForTimeout(600);
  await shot('retry');
  // retry twice (the count goes down, the wave stays), then the third loss has no retry
  const lose = async () => {
    await page.waitForTimeout(500);
    await page.locator('#fight').click();
    await page.waitForTimeout(800);
    await g(() => { const G = window.__game; G.setSpeed(3); for (const u of G.b.units) { if (u.side === 'hero') u.hp = 1; else u.power = 1e5; } });
    await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 60000 });
    await page.waitForTimeout(400);
  };
  for (let i = 0; i < 2; i++) {
    await page.locator('#retry').click();
    await page.waitForTimeout(800);
    console.log(w, 'retry', i + 1, await g(() => [window.__game.run.stage, window.__game.run.retries, window.__game.run.gold]));
    if (await page.locator('#tipSkip').isVisible()) await page.locator('#tipSkip').click();
    await lose();
    console.log(w, 'prompt', await g(() => [document.getElementById('retry').hidden, document.getElementById('retry').textContent, document.getElementById('next').textContent]));
    if (i === 0) await shot('retry-1');
  }
  await page.locator('#next').click();
  await page.waitForTimeout(600);
  console.log(w, 'recap hidden?', await g(() => document.getElementById('recap').hidden));
  await shot('recap');
  await g(() => { document.querySelector('.rcSheet').scrollTop = 99999; });
  await page.waitForTimeout(300);
  await shot('recap-end');
  await page.locator('.rcFoot button').click();
  await page.waitForTimeout(800);
  console.log(w, 'home up', await g(() => !document.getElementById('home').hidden));
  await ctx.close();
}
await browser.close();
srv.close();
