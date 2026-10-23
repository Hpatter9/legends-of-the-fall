// The opening before the starter pick, the Skip button at 360 wide, and the Cinematics setting off.  node tools/ui/hero-progress-cine.mjs
import { serve, launch } from './hp-lib.mjs';
const srv = serve(); const browser = await launch();
const base = `http://localhost:${srv.address().port}/`;
const errors = [];
async function open(w, h, settings) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((s) => { localStorage.setItem('lotf-tips-off', '1'); if (s) localStorage.setItem('legends.settings', JSON.stringify(s)); }, settings);
  await page.goto(base);
  return [ctx, page];
}
{
  const [ctx, page] = await open(360, 780);
  await page.waitForTimeout(3500);
  const cut = await page.evaluate(() => !!document.querySelector('#cutscene:not([hidden])'));
  const picking = await page.evaluate(() => !!document.querySelector('#starter:not([hidden])') || document.body.innerText.includes('Choose'));
  const skip = await page.locator('.csSkip').boundingBox();
  console.log('opening up before the pick:', cut, 'skip box:', JSON.stringify(skip), 'visible in 360:', skip && skip.x + skip.width <= 360 && skip.width >= 44 && skip.height >= 44);
  await page.screenshot({ path: 'docs/samples/hero-progress-opening-360.png' });
  await page.locator('.csSkip').click();
  await page.waitForTimeout(1500);
  console.log('after Skip the starter pick shows:', await page.evaluate(() => document.body.innerText.includes('Choose') || !!document.querySelector('.starter')), 'cutscene gone:', !(await page.evaluate(() => !!document.querySelector('#cutscene:not([hidden])'))));
  await ctx.close();
}
{
  const [ctx, page] = await open(393, 852, { cinematics: false });
  await page.waitForTimeout(3500);
  console.log('cinematics off: opening up:', await page.evaluate(() => !!document.querySelector('#cutscene:not([hidden])')), 'seen kept:', await page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta')).scenes));
  await ctx.close();
}
console.log('page errors:', errors.length ? errors : 'none');
await browser.close(); srv.close();
