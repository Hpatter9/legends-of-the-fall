// Screenshots of the visiting traders at 393x852 (docs/samples/shop-caravan.png, shop-gloaming.png). Run after `npm run web`.
// The save's seed is chosen so the caravan comes today, and a guardian has just fallen so the Dealer is here too.
//   node tools/shop/shots-traders.mjs [port]
import { serve, boot } from './lib.mjs';
const port = Number(process.argv[2] ?? 8943);
const srv = serve('out/web', port);
const browser = await (await import('/opt/node-tools/node_modules/playwright/index.mjs')).chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const fmix = (h) => { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
const mix = (base, s) => fmix((base >>> 0) ^ Math.imul((s | 0) + 0x9e3779b9, 0x85ebca6b));
const now = new Date();
const wd = (Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000) + 3) % 7;
let seed = 1;
while (mix(seed, 0xca7a1) % 7 !== wd) seed++;
const click = async (page, sel, text) => {
  await page.evaluate(([sel, text]) => { const e = [...document.querySelectorAll(sel)].find((x) => !text || x.textContent.includes(text)); e?.click(); }, [sel, text]);
  await page.waitForTimeout(900);
};
const { page, errors } = await boot(browser, port, 393, 852, { seed, stall: { day: 0, sold: {}, spent: 4600, guardians: 1, dealerDue: true } });
await page.screenshot({ path: 'docs/samples/shop-traders-camp.png' });
await click(page, '#hmStall');
await click(page, '.hsTab', 'Caravan');
await page.screenshot({ path: 'docs/samples/shop-caravan.png' });
await click(page, '.hsTab', 'Gloaming');
await page.screenshot({ path: 'docs/samples/shop-gloaming.png' });
await click(page, '.hsWare');
await page.screenshot({ path: 'docs/samples/shop-gloaming-page.png' });
console.log('errors', errors);
await browser.close();
srv.close?.();
process.exit(0);
