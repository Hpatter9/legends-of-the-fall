// Screenshots of the daily goal (docs/notes/daily-goal.md): the camp's notice board, the start card, a wave going, the boss intro,
// "Daily cleared!" with the chest, opening the daily chest, and a loss.
//   node tools/daily/shots-daily.mjs <build dir> [WxH] [scene,...]
// Writes docs/samples/daily-goal-<scene>[-WxH].png (a fresh save: the starting five, no castle).
import { serve, launch, HEROES, saveScript } from '../audit/lib.mjs';
const [root = 'out/web', size = '393x852', want] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
const only = want?.split(',');
const tag = W === 393 && H === 852 ? '' : `-${W}x${H}`;
const srv = serve(root);
const browser = await launch();
const base = `http://localhost:${srv.address().port}/`;
const out = process.env.OUT ?? 'docs/samples';
const failed = [];
async function open(extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
  await page.addInitScript(saveScript(), [HEROES.slice(0, 5), { castle: {}, bestStage: 1, crowns: 120, ...extra }]);
  await page.goto(`${base}?seed=7`);
  await page.waitForTimeout(2300);
  await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  // (the page opens on a first battle: Home goes to the camp)
  await page.evaluate(() => document.getElementById('homeBtn').click());
  await page.waitForTimeout(1300);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page };
}
const ev = (page, fn, ...a) => page.evaluate(fn, ...a);
const shot = async (page, name, wait = 450) => {
  if (only && !only.includes(name)) return;
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}/daily-goal-${name}${tag}.png` });
};
const group = async (label, fn, extra) => {
  let c;
  try { c = await open(extra); await fn(c.page); } catch (e) { failed.push(`${label}: ${String(e.message).split('\n')[0]}`); } finally { await c?.ctx.close(); }
};
const today = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
/** Start today's daily from the camp: the notice board, then Fight! on its card. */
const startDaily = async (page) => {
  await ev(page, () => document.getElementById('hmDaily').click());
  await page.waitForTimeout(500);
  await ev(page, () => document.querySelector('.dayBtns .primary').click());
  await page.waitForTimeout(1200);
};

await group('board', async (page) => {
  await page.waitForTimeout(600);
  await shot(page, 'board');
});
await group('start', async (page) => {
  await ev(page, () => document.getElementById('hmDaily').click());
  await shot(page, 'start', 700);
});
await group('wave', async (page) => {
  await startDaily(page);
  await ev(page, () => { const g = window.__game; g.run.stage = 4; g.run.gold = 140; g.newBattle(); document.getElementById('auto').click(); });
  await shot(page, 'wave', 900);
  await ev(page, () => document.getElementById('fight').click());
  await shot(page, 'wave-fight', 3500);
});
await group('boss', async (page) => {
  await startDaily(page);
  await ev(page, () => { const g = window.__game; g.run.stage = 10; g.newBattle(); });
  await shot(page, 'boss', 1100);
});
await group('cleared', async (page) => {
  await startDaily(page);
  await ev(page, () => { const g = window.__game; g.run.stage = 10; g.newBattle(); });
  await page.waitForTimeout(4200);
  await ev(page, () => { const g = window.__game; g.b.phase = 'won'; g.endWait = 99999; g.refresh(); });
  await shot(page, 'cleared', 5200);
  // (on to the recap and home, then the chest cart: tap it to open)
  await ev(page, () => document.getElementById('next').click());
  await page.waitForTimeout(800);
  await shot(page, 'recap', 300);
  await ev(page, () => document.querySelector('#recap button')?.click());
  await page.waitForTimeout(1200);
  await shot(page, 'camp-chest', 300);
  await ev(page, () => document.querySelector('.csChest').click());
  await page.waitForTimeout(1300);
  await shot(page, 'chest-open', 100);
  await page.waitForTimeout(4200);
  await shot(page, 'chest', 100);
});
await group('loss', async (page) => {
  await startDaily(page);
  await ev(page, () => { const g = window.__game; g.run.stage = 6; g.run.retries = 2; g.newBattle(); });
  await page.waitForTimeout(500);
  await ev(page, () => { const g = window.__game; g.b.phase = 'lost'; g.endWait = 99999; g.refresh(); });
  await shot(page, 'loss', 5200);
  await ev(page, () => document.getElementById('next').click());
  await page.waitForTimeout(800);
  await shot(page, 'loss-recap', 300);
});
console.log(failed.length ? `FAILED\n${failed.join('\n')}` : 'ok');
srv.close();
await browser.close();
