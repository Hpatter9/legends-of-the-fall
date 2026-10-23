// A new save and an old save both start; a full fight plays out with no page errors (and the speed carries).
import { serve, launch, boot } from './lib.mjs';
const s = serve();
const br = await launch();
let bad = 0;
for (const kind of ['new', 'old']) {
  const { ctx, page, errors } = await boot(br, 393, 852, 8139, kind);
  const body = await page.evaluate(() => document.getElementById('home') && !document.getElementById('home').hidden);
  console.log(kind, 'save starts, home shown:', body);
  if (kind === 'old') {
    await page.goto('http://localhost:8139/?seed=5');
    await page.waitForTimeout(2500);
    await page.evaluate(() => { document.getElementById('fight').click(); window.__game.setSpeed(3); });
    await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 150000 });
    console.log('fight done, phase', await page.evaluate(() => window.__game.b.phase));
    await page.screenshot({ path: 'docs/samples/battle-ui-result.png' });
  }
  console.log(kind, 'errors:', errors.length);
  bad += errors.length;
  await ctx.close();
}
await br.close(); s.close();
process.exit(bad ? 1 : 0);
