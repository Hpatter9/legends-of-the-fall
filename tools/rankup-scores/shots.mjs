// Rank up card shots (docs/notes/rankup-scores.md): a rank and an awakening step, at 393x852, 360x780 and 412x915.
//   npm run web && node tools/rankup-scores/shots.mjs      (writes docs/samples/rankup-scores-*.png)
import { serve, launch, boot } from '../battle-ui/lib.mjs';
const PORT = 8772;
const srv = serve('out/web', PORT);
const br = await launch();
const skip = async (page) => { for (let i = 0; i < 6; i++) { await page.evaluate(() => { const c = document.getElementById('cutscene'); [...(c?.querySelectorAll('button') ?? [])].find((b) => /skip/i.test(b.textContent))?.click(); }); await page.waitForTimeout(500); } };
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  for (const [label, shards, ranked] of [['rank', 3, 1], ['awaken', 99, 4]]) {
    const { ctx, page, errors } = await boot(br, w, h, PORT);
    await page.waitForFunction(() => window.__game?.meta, null, { timeout: 60000 });
    await skip(page);
    await page.evaluate(([s, r]) => {
      const m = window.__game.meta;
      if (!m.unlocked.includes('knight')) m.unlocked.push('knight');
      m.shards.knight = s; m.ores = new Proxy({}, { get: () => 99, has: () => true }); (m.ranked ??= {}).knight = r; m.xp.knight = 12000;
      window.__game.home.openSheet('knight');
    }, [shards, ranked]);
    await page.waitForTimeout(1000);
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^(Rank up|Awaken)/i.test(x.textContent.trim())); b?.click(); });
    await page.waitForTimeout(1500);
    const card = await page.evaluate(() => { const c = document.querySelector('.ruCard'); if (!c) return null; const r = c.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), document.documentElement.scrollWidth, c.innerText.replace(/\n+/g, ' | ')]; });
    console.log(w, label, card, errors.length ? errors : '');
    await page.screenshot({ path: `docs/samples/rankup-scores-${label}-${w}.png` });
    await ctx.close();
  }
}
await br.close(); srv.close();
