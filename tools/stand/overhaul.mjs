// STAND-003 phase A checks in the page: the free camera (a pan stays where it was put, the crown button goes back to the king), the pause
// (the battle's clock stops, the sheet lists the eight and the king, Resume carries on) and no page errors, at the three phone sizes.
import { serve, launch, boot, enter, SIZES } from './lib.mjs';
const server = serve('out/web', 8152);
const browser = await launch();
let bad = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) bad++;
};
for (const [w, h] of SIZES) {
  const { page, errors, ctx } = await boot(browser, w, h, 20, 8152);
  await page.waitForSelector('#hmTower', { state: 'attached', timeout: 15000 });
  await enter(page);
  await page.evaluate(() => document.querySelector('.stStart').click());
  await page.waitForTimeout(3000);
  const cam = () => page.evaluate(() => { const v = window.__game.stand; return [Math.round(v.cx), Math.round(v.cy)]; });
  const c0 = await cam();
  // (a drag on empty ground pans the camera)
  // (from a spot with no hero under it)
  const from = await page.evaluate(([w, h]) => {
    const v = window.__game.stand;
    for (const [x, y] of [[0.15, 0.3], [0.85, 0.3], [0.15, 0.55], [0.85, 0.55], [0.5, 0.3], [0.3, 0.45], [0.7, 0.45]])
      if (v.heroAt(w * x, h * y) === null && document.elementFromPoint(w * x, h * y)?.classList.contains('stInput')) return [w * x, h * y];
    return [w * 0.15, h * 0.3];
  }, [w, h]);
  console.log('  drag from', from.map(Math.round), await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? `${e.tagName}.${e.className} ${e.textContent.slice(0, 30)}` : 'none'; }, from));
  await page.mouse.move(from[0], from[1]);
  await page.mouse.down();
  await page.mouse.move(from[0] - 80, from[1] + 90, { steps: 8 });
  await page.mouse.up();
  const c1 = await cam();
  await page.waitForTimeout(6000);
  const c2 = await cam();
  check(Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) > 40, `${w}x${h} the drag panned (${c0} -> ${c1})`);
  check(Math.hypot(c2[0] - c1[0], c2[1] - c1[1]) < 2, `${w}x${h} the camera stayed put for 6 s (${c1} -> ${c2})`);
  await page.evaluate(() => document.querySelector('.stCentre').click());
  await page.waitForTimeout(1500);
  const c3 = await cam();
  check(Math.hypot(c3[0] - c0[0], c3[1] - c0[1]) < 4, `${w}x${h} the crown button went back to the king (${c3})`);
  // (the pause)
  await page.evaluate(() => document.querySelector('.stPause').click());
  const t0 = await page.evaluate(() => window.__game.stand.state.b.t);
  await page.waitForTimeout(1500);
  const t1 = await page.evaluate(() => window.__game.stand.state.b.t);
  check(t0 === t1, `${w}x${h} paused: the clock stood at ${t0}`);
  const rows = await page.evaluate(() => document.querySelectorAll('.stSheet:not([hidden]) .stSheetRow').length);
  check(rows === 8, `${w}x${h} the sheet lists ${rows} heroes`);
  await page.screenshot({ path: `out/shots/stand-pause-${w}x${h}.png` });
  await page.evaluate(() => [...document.querySelectorAll('.stSheet button')].find((b) => b.textContent === 'Resume').click());
  await page.waitForTimeout(1000);
  const t2 = await page.evaluate(() => window.__game.stand.state.b.t);
  check(t2 > t1, `${w}x${h} resumed: the clock runs again (${t2})`);
  await page.screenshot({ path: `out/shots/stand-free-${w}x${h}.png` });
  check(!errors.length, `${w}x${h} no page errors ${errors.join('; ')}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
