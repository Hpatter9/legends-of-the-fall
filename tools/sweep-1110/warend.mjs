// SWEEP-1110, the War's end: a save whose Last Hold has fallen (`War.end` written, every hold conquered), cinematics on. The camp opens
// and the scene should play once; then the Dark Council's board and its record of the end. At the three upright sizes.
//   npm run web && node tools/sweep-1110/warend.mjs
import { serve, launch, open, SIZES, out, wait, overflow, saveOf, ARMY_IDS, settle } from './lib.mjs';
const PORT = 8917;
const dir = out('out/sweep-1110/warend');
const server = serve(PORT);
const browser = await launch();
const end = { day: 20261109, turn: 12, army: 'yokai', chief: { name: 'Grashnak the Unbowed', base: 'orcWarlord', warchief: true }, slain: ['Vorga Ironhide', 'Skreel the Quick'], scattered: ['Mordak Bonecrown'], tries: 2 };
const war = { v: 1, turn: 12, members: [], fallen: [], nextId: 9, news: [], musterSince: 0, trophies: 40, end };
for (const [w, h] of SIZES) {
  const save = { ...saveOf({ conquered: ARMY_IDS }), war };
  const { ctx, page, log } = await open(browser, w, h, PORT, { save });
  await page.evaluate(() => localStorage.setItem('legends.settings', JSON.stringify({ cinematics: true, speed: 1 })));
  await page.reload();
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await wait(page, 4000);
  await page.screenshot({ path: `${dir}/scene-${w}.png` });
  const scene = await page.evaluate(() => ({ screens: window.__screens?.(), cs: !!document.querySelector('.csSkip, #cutscene:not([hidden]), .cs') }));
  console.log(w, 'scene up', JSON.stringify(scene));
  await settle(page);
  await wait(page, 1500);
  await settle(page);
  // (a second visit: the scene should not play again)
  await page.reload();
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await wait(page, 4000);
  const again = await page.evaluate(() => !!document.querySelector('.csSkip'));
  console.log(w, 'scene again on the next visit', again);
  await settle(page);
  await page.evaluate(() => window.__game.home.openCouncil());
  await wait(page, 1200);
  await page.screenshot({ path: `${dir}/council-${w}.png` });
  const o = await overflow(page);
  if (o.scroll || o.bad.length) console.log(w, 'council overflow', JSON.stringify(o));
  console.log(w, 'council', await page.evaluate(() => document.querySelector('.om, [class*=ornate]')?.textContent?.replace(/\s+/g, ' ').slice(0, 300)));
  console.log(w, 'errors', log.errors.length, log.errors.slice(0, 3), '404', log.missing.length);
  await ctx.close();
}
await browser.close();
server.close();
