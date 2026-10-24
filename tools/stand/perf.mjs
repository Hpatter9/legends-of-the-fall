// The performance check: a wave-30 field (about 50 foes, ten heroes) in the page, and where a frame's time goes (headless Chromium, software GL: the
// drawing is slower here than on a phone; the JavaScript time is what this measures). `node tools/stand/perf.mjs [wave] [heroLevel]`
import { serve, launch, boot, enter } from './lib.mjs';
const wave = Number(process.argv[2] ?? 30);
const level = Number(process.argv[3] ?? 60);
const server = serve();
const browser = await launch();
const { page, errors } = await boot(browser, 393, 852, level);
await enter(page);
await page.evaluate(([wave, level]) => {
  const st = window.__game.stand;
  st.debugJump(wave, level);
  const s = st.state;
  s.run.gold = 100000;
  window.__game.stand.s.run.gold = 100000;
}, [wave, level]);
// ten heroes: five more hired
for (let i = 0; i < 5; i++) await page.evaluate(() => document.querySelector('.stBuy.hire').click());
await page.evaluate(() => document.querySelector('.stStart').click());
await page.waitForTimeout(9000);
await page.evaluate(() => Object.assign(window.__game.stand.perf, { frames: 0, sim: 0, sprites: 0, total: 0, worst: 0 }));
await page.screenshot({ path: 'out/shots/stand-perf.png' });
const peak = [];
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(1000);
  peak.push(await page.evaluate(() => window.__game.stand.state.b.units.filter((u) => u.alive && u.side === 'foe').length));
}
const r = await page.evaluate(() => { const p = window.__game.stand.perf; const s = window.__game.stand.state; return { ...p, wave: s.run.wave, heroes: s.b.units.filter((u) => u.tag !== undefined && u.alive).length, units: s.b.units.length, sprites: window.__game.stand.sprites.size }; });
console.log(`wave ${r.wave}: foes alive ${peak.join(',')} heroes ${r.heroes}, units ${r.units}, sprites ${r.sprites}`);
console.log(`frames ${r.frames}: mean ${(r.total / r.frames).toFixed(2)} ms (sim ${(r.sim / r.frames).toFixed(2)}, sprites ${(r.sprites / r.frames).toFixed(2)}), worst ${r.worst.toFixed(1)} ms`);
console.log('errors', errors);
await browser.close();
server.close();
