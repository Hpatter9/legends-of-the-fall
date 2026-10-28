// STAND-004: idle heroes go to help (docs/notes/stand-help.md). At the three phone sizes, a wave played on until all its foes are in and
// heroes have left their posts to help; the camera is put between the king and the helpers, and the screen taken
// (docs/samples/stand-help-WxH.png). Checks for page errors. `npm run web` first.
import { serve, launch, boot, enter, SIZES } from './lib.mjs';
const PORT = 8220;
const server = serve('out/web', PORT);
const browser = await launch();
let bad = 0;
for (const [w, h] of SIZES) {
  const b = await boot(browser, w, h, 40, PORT, 2);
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
  await b.page.waitForTimeout(1000);
  await b.page.addStyleTag({ content: '#quip { display: none !important; } #stand .stBanner, .stVignette { animation: none !important; } .stPlate { display: none !important; }' });
  await b.page.evaluate(() => { const st = window.__game.stand; st.debugHall('hall'); });
  await b.page.waitForTimeout(600);
  await b.page.evaluate(() => { const st = window.__game.stand; st.debugJump(8, 30); document.querySelector('.stStart').click(); });
  await b.page.waitForTimeout(500);
  // (play on until the wave is all in and at least two heroes have gone to help, and walked a way)
  const seen = await b.page.evaluate(() => {
    const st = window.__game.stand;
    // (a run of ticks with helpers out: two or more for two seconds, or one for four)
    let two = 0;
    let one = 0;
    for (let i = 0; i < 3000 && st.state.phase !== "over"; i++) {
      st.debugRun(100);
      const n = Object.keys(st.state.b.stand.help ?? {}).length;
      two = n >= 2 ? two + 1 : 0;
      one = n >= 1 ? one + 1 : 0;
      if (two > 8 || one > 8) break;
    }
    // (held still from here, so the moment found is the one shot; the page still draws)
    st.paused = true;
    const s = st.state;
    const help = s.b.stand.help ?? {};
    return { help: Object.keys(help).length, wave: s.run.wave, queue: s.queue.length, ids: Object.keys(help).map(Number) };
  });
  console.log(w, h, JSON.stringify(seen));
  // (the camera between the king and the helpers)
  await b.page.evaluate((ids) => {
    const st = window.__game.stand;
    const sp = ids.map((id) => st.sprites.get(id)).filter(Boolean);
    st.parts.banner.hidden = true;
    // (a step closer than the wide start, so the pointers show)
    const steps = st.steps();
    st.scale = st.tscale = steps[Math.min(1, steps.length - 1)];
    // (the helpers and the foes they went for)
    const help = st.state.b.stand.help ?? {};
    const all = [...sp, ...ids.map((id) => st.sprites.get(help[id])).filter(Boolean)];
    st.tx = st.cx = all.reduce((n, x) => n + x.x, 0) / all.length;
    st.ty = st.cy = all.reduce((n, x) => n + x.y, 0) / all.length;
  }, seen.ids);
  await b.page.waitForTimeout(800);
  await b.page.screenshot({ path: `docs/samples/stand-help-${w}x${h}.png` });
  if (!seen.help) (bad++, console.log('nobody was helping'));
  if (b.errors.length) (bad++, console.log(w, h, b.errors));
  await b.ctx.close();
}
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
