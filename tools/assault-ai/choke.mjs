// ASSAULT-AI's photographs of a chokepoint (`docs/notes/assault-skills.md`): a real assault on the Howling Den (Settings, Developer, Try an
// Assault: "As expected", the balance party, Auto), the camera held on its rope bridge, at 393 x 852, a photograph every `--every` ms into
// a folder to pick from. Run on a build of main for "before".
//   npm run web && node tools/assault-ai/choke.mjs <before|after> <dir> [--army beasts] [--at 78,84] [--n 40] [--every 1500] [--port 8919]
import { serve, launch, open, out, wait } from '../sweep-1110/lib.mjs';
const args = process.argv.slice(2);
const tag = args[0] || 'after';
const dir = out(args[1] || 'out/assault-ai/choke');
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const ARMY = opt('--army', 'beasts');
const [U, V] = opt('--at', '78,84').split(',').map(Number);
const N = Number(opt('--n', 40));
const EVERY = Number(opt('--every', 1500));
const PORT = Number(opt('--port', 8919));
const server = serve(PORT, opt('--root', 'out/web'));
const browser = await launch();
/** Tap the minimap at a tile: the camera goes there. */
const look = (page) => page.evaluate(([u, v]) => {
  const mini = document.querySelector('.asMini');
  if (!mini) return;
  const r = mini.getBoundingClientRect();
  const x = ((u - v) / 2) * (104 / 100) + 52;
  const y = ((u + v) / 2) * (104 / 100);
  const at = { clientX: r.left + (x / 104) * r.width, clientY: r.top + (y / 104) * r.height, bubbles: true, pointerId: 3 };
  mini.dispatchEvent(new PointerEvent('pointerdown', at));
  mini.dispatchEvent(new PointerEvent('pointerup', at));
}, [U, V]);
const { ctx, page, log } = await open(browser, 393, 852, PORT);
await page.evaluate((army) => window.__game.tryAssault({ army, kind: 'hold', strength: 'expected', heroes: 'design' }), ARMY);
await wait(page, 1500);
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^March/.test(b.textContent.trim()) && b.offsetParent)?.click());
await page.waitForFunction(() => document.querySelector('#assaultScene .asTop'), null, { timeout: 60000 });
await wait(page, 2000);
await page.evaluate(() => { const auto = [...document.querySelectorAll('.asTop button')].find((b) => b.textContent === 'Auto'); if (auto && !auto.classList.contains('on')) auto.click(); });
const box = await page.evaluate(() => { const r = document.querySelector('#assaultScene canvas').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
await page.mouse.move(box[0], box[1]);
for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, -100); await wait(page, 60); }
for (let n = 1; n <= N; n++) {
  await look(page);
  await wait(page, 400);
  await page.screenshot({ path: `${dir}/${tag}-${String(n).padStart(3, '0')}.png` });
  console.log(`${n} ${await page.evaluate(() => document.querySelector('.asTop')?.textContent?.replace(/\s+/g, ' '))}`);
  if (!(await page.evaluate(() => !!document.querySelector('#assaultScene')))) break;
  await wait(page, EVERY);
}
console.log(`${tag}: errors ${log.errors.length}`);
await ctx.close();
await browser.close();
server.close();
