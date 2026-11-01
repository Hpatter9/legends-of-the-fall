// STATS batch 3: the gear compare (docs/samples/stats-3-gear-393.png): a knight wearing a Rare sword with a Legendary one spare.
//   npm run web && node tools/stats-3/gear.mjs
import { serve, launch, boot } from '../battle-ui/lib.mjs';
const PORT = 8772;
const srv = serve('out/web', PORT);
const br = await launch();
const [w, h] = [393, 852];
const { ctx, page, errors } = await boot(br, w, h, PORT);
await page.waitForFunction(() => window.__game?.meta, null, { timeout: 60000 });
for (let i = 0; i < 6; i++) { await page.evaluate(() => { const c = document.getElementById('cutscene'); [...(c?.querySelectorAll('button') ?? [])].find((b) => /skip/i.test(b.textContent))?.click(); }); await page.waitForTimeout(400); }
await page.evaluate(() => {
  const g = window.__game;
  g.meta.xp.knight = 30 * 11 * 12;
  g.meta.equipment = [{ id: 1, base: 'ironSword', rarity: 2, level: 5 }, { id: 2, base: 'ironSword', rarity: 4, level: 8 }];
  g.meta.equipped = { knight: { weapon: 1 } };
  g.home.openSheet('knight');
});
await page.waitForTimeout(1000);
await page.getByRole('tab', { name: 'Equipment' }).click();
await page.waitForTimeout(400);
await page.locator('.eqSlot').first().click();
await page.waitForTimeout(500);
await page.evaluate(() => document.querySelector('.eqList')?.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(300);
console.log('lines', await page.evaluate(() => [...document.querySelectorAll('.eqScore')].map((e) => e.textContent)), errors);
await page.screenshot({ path: 'docs/samples/stats-3-gear-393.png' });
await ctx.close(); srv.close(); await br.close();
