// The Last Stand's screenshots (docs/samples/last-stand-*.png): deploy, a fight at wave 3 and at wave 25, the break with the shop bar, a boss wave, the end screen, at the three phone sizes.
import { serve, launch, boot, enter, SIZES } from './lib.mjs';
const server = serve();
const browser = await launch();
const out = (name, w, h) => `docs/samples/last-stand-${name}-${w}x${h}.png`;
for (const [w, h] of SIZES) {
  const jump = (page, wave, level, gold = 400) => page.evaluate(([wave, level, gold]) => { const st = window.__game.stand; st.debugJump(wave, level); st.state.run.gold = gold; }, [wave, level, gold]);
  const begin = (page) => page.evaluate(() => document.querySelector('.stStart').click());
  const fresh = async (level) => { const b = await boot(browser, w, h, level, 8139, 3); await enter(b.page); return b; };
  let b = await fresh(30);
  await b.page.screenshot({ path: out('deploy', w, h) });
  await jump(b.page, 3, 5);
  await begin(b.page);
  await b.page.waitForTimeout(8000);
  await b.page.screenshot({ path: out('wave3', w, h) });
  await b.ctx.close();
  b = await fresh(60);
  await jump(b.page, 25, 25, 3000);
  for (let i = 0; i < 5; i++) await b.page.evaluate(() => document.querySelector('.stBuy.hire').click());
  await begin(b.page);
  await b.page.waitForTimeout(9000);
  await b.page.screenshot({ path: out('wave25', w, h) });
  await b.ctx.close();
  b = await fresh(60);
  await jump(b.page, 5, 8, 300);
  await begin(b.page);
  await b.page.waitForTimeout(900);
  await b.page.screenshot({ path: out('boss-banner', w, h) });
  await b.page.waitForTimeout(7000);
  await b.page.screenshot({ path: out('boss', w, h) });
  await b.ctx.close();
  b = await fresh(40);
  await jump(b.page, 2, 10, 300);
  await begin(b.page);
  for (let i = 0; i < 90; i++) {
    await b.page.waitForTimeout(1000);
    if (await b.page.evaluate(() => window.__game.stand.state.phase === 'break')) break;
  }
  await b.page.waitForTimeout(1500);
  await b.page.screenshot({ path: out('break', w, h) });
  await b.page.evaluate(() => { const s = window.__game.stand.state; s.king.hp = 5; for (const u of s.b.units) if (u.tag !== undefined) { u.alive = false; u.hp = 0; } });
  await b.page.waitForTimeout(1000);
  await b.page.evaluate(() => document.querySelector('.stGo')?.click());
  await b.page.waitForTimeout(25000);
  await b.page.screenshot({ path: out('end', w, h) });
  console.log(w, h, b.errors);
  await b.ctx.close();
}
await browser.close();
server.close();
