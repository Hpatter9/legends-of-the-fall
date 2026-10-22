// A CPU profile of one scene (4x slowed): the functions with the most self time.   node tools/audit/profile.mjs fight|tavern|castle
import { serve, launch, HEROES, saveScript } from './lib.mjs';
const name = process.argv[2] ?? 'fight';
const srv = serve(process.env.ROOT ?? 'out/web');
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true });
const page = await ctx.newPage();
await page.addInitScript(saveScript(), [HEROES, {}]);
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForTimeout(1500);
if (name === 'tavern') await page.locator('.hmTab').nth(1).click();
if (name === 'castle') await page.locator('.hmTab').nth(3).click();
if (name === 'fight') await page.evaluate(() => {
  const g = window.__game; g.run.gold = 99999;
  for (let i = 0; i < 40; i++) document.getElementById('summon')?.click();
  g.run.stage = 8; g.run.squad = [...g.run.roster].sort((a, b) => b.grade - a.grade).slice(0, 5).map((h) => h.id);
  document.getElementById('home').hidden = true; g.newBattle(); document.getElementById('fight').click();
});
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.waitForTimeout(800);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.start');
for (let i = 0; i < 4; i++) { await page.waitForTimeout(2000); await page.evaluate(() => { const g = window.__game; if (g.b.phase === 'fight') { g.b.spells.mana = 100; document.querySelectorAll('#spells .spell').forEach((c) => c.click()); } }); }
const { profile } = await cdp.send('Profiler.stop');
const self = new Map();
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const dt = profile.timeDeltas;
profile.samples.forEach((id, i) => { const n = byId.get(id); const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber + 1}`; self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0)); });
const total = [...self.values()].reduce((a, b) => a + b, 0);
for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22)) console.log(((v / total) * 100).toFixed(1).padStart(5), '%', k);
if (process.env.CALLERS) {
  const parent = new Map();
  profile.nodes.forEach((n) => (n.children ?? []).forEach((c) => parent.set(c, n.id)));
  const out = new Map();
  profile.samples.forEach((id, i) => {
    const n = byId.get(id);
    if (n.callFrame.functionName !== process.env.CALLERS) return;
    const chain = []; let p = parent.get(id);
    for (let d = 0; p && d < 4; d++, p = parent.get(p)) chain.push(`${byId.get(p).callFrame.functionName || '(anon)'}:${byId.get(p).callFrame.lineNumber + 1}`);
    const k = chain.join(' < '); out.set(k, (out.get(k) ?? 0) + (dt[i] ?? 0));
  });
  for (const [k, v] of [...out.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(((v / total) * 100).toFixed(2), '%', k);
}
await browser.close(); srv.close();
