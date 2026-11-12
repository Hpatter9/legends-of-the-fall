// SWEEP-1110: the War's end scene, followed through the queue at the camp: each scene's title as it plays, skipped in turn, and whether
// `warEnd` is among the scenes seen at the end.   npm run web && node tools/sweep-1110/warend-seen.mjs
import { serve, launch, open, wait, saveOf, ARMY_IDS } from './lib.mjs';
const server = serve(8918);
const browser = await launch();
const end = { day: 20261109, turn: 12, army: 'yokai', chief: { name: 'Grashnak the Unbowed', base: 'orcWarlord', warchief: true }, slain: ['Vorga Ironhide'], scattered: [], tries: 2 };
const save = { ...saveOf({ conquered: ARMY_IDS }), war: { v: 1, turn: 12, members: [], fallen: [], nextId: 9, news: [], musterSince: 0, trophies: 40, end } };
const { ctx, page, log } = await open(browser, 393, 852, 8918, { save });
await page.evaluate(() => localStorage.setItem('legends.settings', JSON.stringify({ cinematics: true, cineOff: true, speed: 1 })));
await page.reload();
await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
for (let i = 0; i < 14; i++) {
  await wait(page, 2500);
  const t = await page.evaluate(() => { const s = document.querySelector('.csSkip'); const head = s ? s.parentElement?.textContent?.replace(/\s+/g, ' ').slice(0, 80) : null; s?.click(); return head; });
  if (t) { console.log('scene:', t); await page.screenshot({ path: `out/sweep-1110/warend/queue-${i}.png` }); }
}
console.log('seen', await page.evaluate(() => JSON.stringify(window.__game.meta.scenes)));
console.log('errors', log.errors);
await ctx.close(); await browser.close(); server.close();
