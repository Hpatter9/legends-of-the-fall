// ASSAULT-SKILLS's photographs (`docs/notes/assault-skills.md`): a real assault (Settings, Developer, Try an Assault: Bloodtusk Hold, "As
// expected", the balance party), on Auto, the camera following the Wizard's platoon zoomed in, its ultimate fired by hand when full, at
// 393 x 852 (and `SIZES` for more); each photograph with a 2x crop of the middle. Run on a build of main for "before".
//   npm run web && node tools/assault-skills/shots.mjs <before|after> [--army orcs] [--platoon 3] [--every 2500] [--n 6]
import { serve, launch, open, out, wait } from '../sweep-1110/lib.mjs';
const args = process.argv.slice(2);
const tag = args[0] || 'after';
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const ARMY = opt('--army', 'orcs');
const K = Number(opt('--platoon', 3));
const EVERY = Number(opt('--every', 2500));
const N = Number(opt('--n', 6));
const dir = out('docs/samples/assault-skills');
const PORT = 8918;
const server = serve(PORT);
const browser = await launch();
for (const [w, h] of (process.env.SIZES ?? '393x852').split(',').map((s) => s.split('x').map(Number))) {
  const { ctx, page, log } = await open(browser, w, h, PORT);
  await page.evaluate((army) => window.__game.tryAssault({ army, kind: 'hold', strength: 'expected', heroes: 'design' }), ARMY);
  await wait(page, 1500);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^March/.test(b.textContent.trim()) && b.offsetParent)?.click());
  await page.waitForFunction(() => document.querySelector('#assaultScene .asTop'), null, { timeout: 60000 });
  await wait(page, 2500);
  await page.evaluate(() => { const auto = [...document.querySelectorAll('.asTop button')].find((b) => b.textContent === 'Auto'); if (auto && !auto.classList.contains('on')) auto.click(); });
  // (choose the platoon, follow it, zoom right in)
  await page.evaluate((k) => { const p = document.querySelectorAll('.asPlatoons > *')[k]; p.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); p.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); }, K);
  await wait(page, 300);
  await page.evaluate(() => [...document.querySelectorAll('.asOrders button')].find((b) => /Follow/.test(b.textContent))?.click());
  const box = await page.evaluate(() => { const r = document.querySelector('#assaultScene canvas').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await page.mouse.move(box[0], box[1]);
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -100); await wait(page, 60); }
  // (the march to the fight: about forty seconds at x1)
  await wait(page, 40000);
  for (let n = 1; n <= N; n++) {
    await page.evaluate((k) => document.querySelectorAll('.asGem')[k]?.click(), K);
    await wait(page, n === 1 ? 600 : EVERY);
    if (!(await page.evaluate(() => !!document.querySelector('#assaultScene')))) break;
    await page.screenshot({ path: `${dir}/${tag}-battle-${n}-${w}.png` });
    await page.screenshot({ path: `${dir}/${tag}-battle-${n}-${w}-crop2x.png`, clip: { x: Math.round(w / 4), y: Math.round(h / 4), width: Math.round(w / 2), height: Math.round(h / 2) } });
  }
  console.log(`${tag} ${w}x${h}: ${await page.evaluate(() => document.querySelector('.asTop')?.textContent?.replace(/\s+/g, ' '))}; errors ${log.errors.length}`);
  await ctx.close();
}
await browser.close();
server.close();
