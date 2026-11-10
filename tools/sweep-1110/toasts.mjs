// SWEEP-1110, the toasts and the cards (the director's call: a toast never covers an open card or sheet). At the three upright sizes:
// toasts raised while a Castle card is open must not show until it closes, and then show; a toast showing when a card opens steps aside and
// comes back after. Writes out/sweep-1110/toasts/*.png; exits 1 on a failed check.   npm run web && node tools/sweep-1110/toasts.mjs
import { serve, launch, open, wait, SIZES, out } from './lib.mjs';
const server = serve(8922);
const browser = await launch();
const dir = out('out/sweep-1110/toasts');
let bad = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) bad++; };
const toastUp = (page) => page.evaluate(() => [...document.querySelectorAll('.toast')].some((t) => t.classList.contains('show')));
const raise = (page, lines) => page.evaluate((lines) => window.__toastLines(lines), lines);
for (const [w, h] of SIZES) {
  const { ctx, page, log } = await open(browser, w, h, 8922);
  // (let the save's own unlock toasts play out first)
  await page.waitForFunction(() => !document.querySelector('.toast'), null, { timeout: 30000, polling: 250 }).catch(() => {});
  const ok = await page.evaluate(() => typeof window.__toastLines === 'function');
  if (!ok) { console.log('no __toastLines hook'); process.exit(1); }
  await page.evaluate(() => { window.__game.home.show('castle'); document.getElementById('castleTab-buildings').click(); });
  await wait(page, 600);
  await page.evaluate(() => document.querySelector('.crBuilding[data-site="drillYard"]').click());
  await wait(page, 600);
  await raise(page, ['Auto place unlocked · set your heroes out with one tap', 'Rune Auto unlocked · socket your runes with one tap']);
  let seen = false;
  for (let i = 0; i < 12; i++) { await wait(page, 300); if (await toastUp(page)) seen = true; }
  await page.screenshot({ path: `${dir}/card-open-${w}.png` });
  check(!seen, `${w}: no toast over the open card (3.6 s)`);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.offsetParent && b.textContent.trim() === 'Close')?.click());
  let after = false;
  for (let i = 0; i < 10 && !after; i++) { await wait(page, 200); after = await toastUp(page); }
  await page.screenshot({ path: `${dir}/card-closed-${w}.png` });
  check(after, `${w}: the toast shows once the card closes`);
  // (a card opened over a toast showing: it steps aside at once)
  await page.evaluate(() => document.querySelector('.crBuilding[data-site="hall"]').click());
  await wait(page, 400);
  const gone = !(await toastUp(page)) && !(await page.evaluate(() => document.querySelector('.toast')));
  await page.screenshot({ path: `${dir}/card-over-toast-${w}.png` });
  check(gone, `${w}: a card opened over a toast sends it away`);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.offsetParent && b.textContent.trim() === 'Close')?.click());
  let back = false;
  for (let i = 0; i < 10 && !back; i++) { await wait(page, 200); back = await toastUp(page); }
  check(back, `${w}: and it comes back after`);
  check(!log.errors.length, `${w}: no page errors ${JSON.stringify(log.errors.slice(0, 2))}`);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
