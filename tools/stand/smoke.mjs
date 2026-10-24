import { serve, launch, boot, enter } from './lib.mjs';
const server = serve();
const browser = await launch();
const { page, errors } = await boot(browser, 393, 852, 20);
await enter(page);
await page.evaluate(() => document.querySelector('.stStart').click());
for (const [i, ms] of [[1, 9000], [2, 10000]]) {
  await page.waitForTimeout(ms);
  await page.screenshot({ path: `out/shots/stand-fight${i}.png` });
}
console.log('errors', errors);
console.log(await page.evaluate(() => { const s = window.__game.stand.state; return JSON.stringify({ phase: s.phase, wave: s.run.wave, foes: s.b.units.filter(u=>u.alive&&u.side==='foe').length, t: s.b.t }); }));
await browser.close();
server.close();
