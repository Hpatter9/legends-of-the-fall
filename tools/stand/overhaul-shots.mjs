// STAND-003 phase B: the Last Stand's castle screens at the three phone sizes (docs/samples/stand-overhaul-*-WxH.png, at 2x): the deploy tray,
// each of the four rooms in a wave, a boss wave's banner, the pause sheet, the end card; and a fight with reduced motion at 393x852. Checks the
// page for errors as it goes. `npm run web` first.
import { serve, launch, boot, enter, SIZES } from './lib.mjs';
const server = serve('out/web', 8151);
const browser = await launch();
const only = process.argv.slice(2);
const out = (name, w, h) => `docs/samples/stand-overhaul-${name}-${w}x${h}.png`;
let bad = 0;
async function fresh(w, h, level = 30, reduced = false) {
  const b = await boot(browser, w, h, level, 8151, 2);
  if (reduced) await b.page.emulateMedia({ reducedMotion: 'reduce' });
  // (no cinematics or tips in the way)
  await b.page.evaluate(() => {
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('legends.settings') ?? '{}'), cinematics: false }));
  });
  await b.page.reload();
  await b.page.waitForTimeout(2200);
  await b.page.evaluate(() => document.getElementById('tipSkip')?.click());
  await b.page.waitForSelector('#hmTower', { state: 'attached', timeout: 15000 });
  await enter(b.page);
  await b.page.evaluate(() => document.getElementById('tipSkip')?.click());
  await b.page.waitForTimeout(1200);
  return b;
}
const hideQuips = (page) => page.addStyleTag({ content: '#quip { display: none !important; } #stand .stBanner, .stVignette { animation: none !important; }' });
for (const [w, h] of SIZES) {
  if (only.length && !only.includes(`${w}`)) continue;
  let b = await fresh(w, h);
  await hideQuips(b.page);
  await b.page.screenshot({ path: out('deploy', w, h) });
  // (the four rooms, each a few seconds into wave 3)
  for (const kind of ['hall', 'chapel', 'library', 'courtyard']) {
    await b.page.evaluate((kind) => window.__game.stand.debugHall(kind), kind);
    await b.page.waitForTimeout(700);
    await b.page.evaluate(() => { const st = window.__game.stand; st.debugJump(3, 4); document.querySelector('.stStart').click(); });
    await b.page.waitForTimeout(1300);
    await b.page.screenshot({ path: out(`${kind}-banner`, w, h) });
    await b.page.waitForTimeout(5500);
    await b.page.screenshot({ path: out(kind, w, h) });
  }
  // (the pause sheet, over the courtyard's fight)
  await b.page.evaluate(() => document.querySelector('.stPause').click());
  await b.page.waitForTimeout(400);
  await b.page.screenshot({ path: out('pause', w, h) });
  await b.page.evaluate(() => document.querySelector('.stResume').click());
  if (b.errors.length) (bad++, console.log(w, h, b.errors));
  await b.ctx.close();
  // (a boss wave's banner and flourish)
  b = await fresh(w, h, 60);
  await hideQuips(b.page);
  await b.page.evaluate(() => { const st = window.__game.stand; st.debugJump(5, 8); document.querySelector('.stStart').click(); });
  await b.page.waitForTimeout(700);
  await b.page.screenshot({ path: out('boss', w, h) });
  // (the end: the king falls)
  await b.page.evaluate(() => { const s = window.__game.stand.state; s.king.hp = 1; for (const u of s.b.units) if (u.tag !== undefined) { u.alive = false; u.hp = 0; } });
  for (let i = 0; i < 60 && !(await b.page.evaluate(() => !document.querySelector('.stEnd').hidden)); i++) await b.page.waitForTimeout(1000);
  await b.page.waitForTimeout(600);
  await b.page.screenshot({ path: out('end', w, h) });
  if (b.errors.length) (bad++, console.log(w, h, b.errors));
  await b.ctx.close();
  console.log('done', w, h);
}
if (!only.length || only.includes('reduced')) {
  const b = await fresh(393, 852, 30, true);
  await hideQuips(b.page);
  await b.page.evaluate(() => { const st = window.__game.stand; st.debugJump(3, 4); document.querySelector('.stStart').click(); });
  await b.page.waitForTimeout(6000);
  await b.page.screenshot({ path: out('reduced', 393, 852) });
  if (b.errors.length) (bad++, console.log('reduced', b.errors));
  await b.ctx.close();
}
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
