// Frame times on a phone-sized page with the CPU slowed 4x (about a mid-range phone), for the busiest fight, the tavern with 25
// heroes and the castle square:   node tools/audit/perf.mjs [scene ...]     (RATE=4, SECONDS=10, SAVER=1 turns the battery saver on)
import { serve, launch, HEROES, saveScript } from './lib.mjs';
const RATE = Number(process.env.RATE ?? 4);
const SECONDS = Number(process.env.SECONDS ?? 10);
const want = process.argv.slice(2);
const srv = serve(process.env.ROOT ?? 'out/web');
const browser = await launch();
const stats = (t) => {
  const a = [...t].sort((x, y) => x - y);
  const avg = t.reduce((s, x) => s + x, 0) / t.length;
  return { frames: t.length, avg: +avg.toFixed(1), p95: +a[Math.floor(a.length * 0.95)].toFixed(1), worst: +a[a.length - 1].toFixed(1) };
};
async function scene(name, setup) {
  if (want.length && !want.includes(name)) return;
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: Number(process.env.DPR ?? 2), hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.addInitScript(saveScript(), [HEROES, {}]);
  if (process.env.SAVER) await page.addInitScript(() => localStorage.setItem('legends.settings', JSON.stringify({ saver: true })));
  await page.goto(`http://localhost:${srv.address().port}/`);
  await page.waitForTimeout(1500);
  await setup(page);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
  await page.waitForTimeout(1000);
  await cdp.send('Performance.enable');
  const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  await page.evaluate(() => { window.__ft = []; let last = performance.now(); const f = (n) => { window.__ft.push(n - last); last = n; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  for (let s = 0; s < SECONDS; s += 2) {
    await page.waitForTimeout(2000);
    await page.evaluate(() => { const g = window.__game; if (g.b.phase === 'fight') { g.b.spells.mana = 100; document.querySelectorAll('#spells .spell').forEach((c) => c.click()); } });
  }
  const t = await page.evaluate(() => window.__ft.slice(5));
  const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const per = (k) => +(((m1[k] - m0[k]) * 1000) / (t.length + 5)).toFixed(1);
  console.log(name, JSON.stringify({ ...stats(t), mainMsPerFrame: per('TaskDuration'), scriptMsPerFrame: per('ScriptDuration'), cpuMsPerFrame: +(per('ScriptDuration') + per('LayoutDuration') + per('RecalcStyleDuration')).toFixed(1) }));
  await ctx.close();
}
await scene('fight', async (page) => {
  await page.evaluate(() => {
    const g = window.__game;
    g.run.gold = 99999;
    for (let i = 0; i < 40; i++) document.getElementById('summon')?.click();
    g.run.stage = 8;
    g.run.squad = [...g.run.roster].sort((a, b) => b.grade - a.grade).slice(0, 5).map((h) => h.id);
    document.getElementById('home').hidden = true;
    g.newBattle();
    document.getElementById('fight').click();
  });
  // (NOFILTERS=1: the hero colour-grade and rim filters off, to see what they cost)
  if (process.env.NOFILTERS) await page.evaluate(() => { const g = window.__game; const f = () => { for (const s of g.sprites.values()) { s.rim.filters = null; s.body.filters = null; } requestAnimationFrame(f); }; f(); });
});
await scene('deploy', async (page) => {
  await page.evaluate(() => {
    const g = window.__game;
    g.run.gold = 99999;
    for (let i = 0; i < 40; i++) document.getElementById('summon')?.click();
    g.run.stage = 8;
    g.run.squad = [...g.run.roster].sort((a, b) => b.grade - a.grade).slice(0, 5).map((h) => h.id);
    document.getElementById('home').hidden = true;
    g.newBattle();
  });
});
await scene('tavern', async (page) => { await page.locator('.hmTab').nth(1).click(); });
await scene('castle', async (page) => { await page.locator('.hmTab').nth(3).click(); });
await scene('home', async () => {});
await browser.close(); srv.close();
