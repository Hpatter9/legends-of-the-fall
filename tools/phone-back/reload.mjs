// PHONE-BACK: Back after the page has reloaded (a new version's reload, a pull-to-refresh) must still stay on the page; and with the service
// worker on, a reload and a Back fight it in no way. 393 x 852.   npm run web && node tools/phone-back/reload.mjs
import { serve, launch, open, wait } from '../sweep-1110/lib.mjs';
const PORT = 8942;
const server = serve(PORT);
const browser = await launch();
let bad = 0;
const check = (ok, what, more = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${more ? `  ${more}` : ''}`); if (!ok) bad++; };
const { ctx, page, log } = await open(browser, 393, 852, PORT, { offline: true });
await page.mouse.click(196, 30);
let loads = 0;
page.on('load', () => loads++);
for (let round = 1; round <= 3; round++) {
  await page.reload();
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await wait(page, 1500);
  await page.evaluate(() => (window.__alive = 'yes'));
  const before = loads;
  await page.mouse.click(196, 30);
  await page.evaluate(() => window.__game.home.show('castle'));
  await wait(page, 500);
  await page.goBack({ timeout: 3000 }).catch(() => {});
  await wait(page, 900);
  const s = await page.evaluate(() => ({ alive: window.__alive === 'yes', tab: window.__game.home.currentTab, len: history.length, guard: history.state?.lotfBack }));
  check(s.alive && loads === before && s.tab === 'battle', `after reload ${round}: Back stayed on the page and went to the Battle tab`, JSON.stringify(s));
  await page.goBack({ timeout: 3000 }).catch(() => {});
  await wait(page, 900);
  const t = await page.evaluate(() => ({ alive: window.__alive === 'yes', len: history.length }));
  check(t.alive && loads === before, `after reload ${round}: a second Back on the Battle tab stayed too`, JSON.stringify(t));
}
const sw = await page.evaluate(async () => !!(await navigator.serviceWorker?.getRegistration()));
check(sw, 'the service worker is registered as before');
check(!log.errors.length, 'no page errors', JSON.stringify(log.errors.slice(0, 2)));
await ctx.close();
await browser.close();
server.close();
console.log(bad ? `${bad} failed` : 'all checks passed');
process.exit(bad ? 1 : 0);
