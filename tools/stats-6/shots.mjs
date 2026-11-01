// STATS batch 6 shots (docs/notes/stats-6.md): the hero sheet's Stats panel with every figure live (crit, initiative, the pool, the
// ultimate's fill) and a score's tap line (the Knight's CON: health and his stamina pool; the Wizard's INT: skills sooner and his mana),
// at 393x852, 360x780 and 412x915.
//   npm run web && node tools/stats-6/shots.mjs      (writes docs/samples/stats-6-*.png)
import { serve, launch, boot } from '../battle-ui/lib.mjs';
const PORT = 8776;
const srv = serve('out/web', PORT);
const br = await launch();
const xpFor = (lv) => Math.round(30 * (lv - 1) * lv * (lv > 20 ? 4 : 1));
const skip = async (page) => { for (let i = 0; i < 6; i++) { await page.evaluate(() => { const c = document.getElementById('cutscene'); [...(c?.querySelectorAll('button') ?? [])].find((b) => /skip/i.test(b.textContent))?.click(); }); await page.waitForTimeout(500); } };
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const name = (n) => `docs/samples/stats-6-${n}-${w}.png`;
  for (const [kind, tile, shot] of [['knight', 2, 'knight'], ['wizard', 3, 'wizard']]) {
    const { ctx, page, errors } = await boot(br, w, h, PORT);
    await page.waitForFunction(() => window.__game?.meta, null, { timeout: 60000 });
    await skip(page);
    await page.evaluate(([k, xp]) => { if (!window.__game.meta.unlocked.includes(k)) window.__game.meta.unlocked.push(k); window.__game.meta.xp[k] = xp; window.__game.home.openSheet(k); }, [kind, xpFor(12)]);
    await page.waitForTimeout(1200);
    await page.evaluate(() => document.querySelector('.stPanel')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    await page.locator('.stTile').nth(tile).click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: name(shot) });
    const box = await page.evaluate(() => { const r = document.querySelector('.stPanel').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), document.documentElement.scrollWidth, document.querySelector('.stWhy')?.textContent, [...document.querySelectorAll('.stFig')].map((f) => f.textContent).join(' | ')]; });
    console.log(w, kind, 'panel l/r/scrollWidth', box.join(' / '), errors.length ? errors : '');
    await ctx.close();
  }
}
await br.close();
srv.close();
