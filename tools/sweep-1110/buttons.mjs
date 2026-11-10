// SWEEP-1110, buttons that do nothing: on each home tab, every visible button is tapped in turn; a tap that changes nothing on the page (no
// element added, removed or changed within a second) is listed. After each tap the camp is put back as it was.
//   npm run web && node tools/sweep-1110/buttons.mjs
import { serve, launch, open, wait, SIZES, settle } from './lib.mjs';
const PORT = 8919;
const server = serve(PORT);
const browser = await launch();
const [w, h] = SIZES[0];
const { ctx, page, log } = await open(browser, w, h, PORT);
const reset = async (tab) => {
  await page.evaluate((tab) => {
    for (const s of document.querySelectorAll('.omClose, [data-close]')) if (s.offsetParent) s.click();
    window.__game.home.open();
    window.__game.home.show(tab);
  }, tab);
  await wait(page, 500);
  await page.keyboard.press('Escape');
  await settle(page);
};
for (const tab of ['battle', 'recruit', 'heroes', 'castle', 'spells']) {
  await reset(tab);
  await wait(page, 900);
  const n = await page.evaluate(() => [...document.querySelectorAll('#home button')].filter((b) => b.offsetParent && !b.disabled).length);
  const dead = [];
  for (let i = 0; i < n; i++) {
    const r = await page.evaluate(async (i) => {
      const bs = [...document.querySelectorAll('#home button')].filter((b) => b.offsetParent && !b.disabled);
      const b = bs[i];
      if (!b) return null;
      const name = `${b.id ? '#' + b.id : ''}.${[...b.classList].join('.')} "${(b.getAttribute('aria-label') ?? b.textContent ?? '').trim().slice(0, 30)}"`;
      let changed = 0;
      const mo = new MutationObserver((ms) => (changed += ms.length));
      mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
      b.click();
      await new Promise((r) => setTimeout(r, 900));
      mo.disconnect();
      return { name, changed, errors: 0 };
    }, i);
    if (r && !r.changed) dead.push(r.name);
    await reset(tab);
  }
  console.log(`${tab}: ${n} buttons; no change from: ${JSON.stringify(dead)}`);
}
console.log('errors', log.errors.length, log.errors.slice(0, 5));
await ctx.close();
await browser.close();
server.close();
