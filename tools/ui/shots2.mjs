// Screenshots of every screen for the pixel UI: node tools/ui/shots2.mjs <outdir-of-build> <prefix>
// (serves the build itself; needs playwright and Chromium). Each screen starts from a fresh page.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/node-tools/node_modules/')('playwright');
const [root, prefix] = [process.argv[2] ?? 'out/web', process.argv[3] ?? 'shot'];
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8125);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const skipTips = (page) => page.evaluate(() => document.getElementById('tipSkip')?.click());
const wait = (page, ms = 400) => page.waitForTimeout(ms);
const home = async (page) => { await page.click('#homeBtn'); await wait(page, 1200); await skipTips(page); await wait(page); };
const tab = async (page, i) => { await home(page); await page.click(`.hmTab >> nth=${i}`); await wait(page, 700); await skipTips(page); await wait(page, 200); };
const SCREENS = {
  'tip': async () => {},
  'battle': async (page) => { await wait(page, 600); await skipTips(page); await wait(page, 300); },
  'home-battle': async (page) => { await tab(page, 2); },
  'home-recruit': async (page) => { await tab(page, 0); },
  'home-heroes': async (page) => { await tab(page, 1); },
  'home-castle': async (page) => { await tab(page, 3); },
  'home-spells': async (page) => { await tab(page, 4); },
  'gacha': async (page) => { await skipTips(page); await page.click('#recruit'); await wait(page, 600); },
  'party': async (page) => { await home(page); await page.click('.hmLink'); await wait(page, 600); },
  'settings': async (page) => { await home(page); await page.click('#hmGear'); await wait(page, 600); },
  'achievements': async (page) => { await tab(page, 3); await page.click('.hm-castle .hmCard >> nth=0'); await wait(page, 600); },
  'herosheet': async (page) => { await tab(page, 1); await page.click('.hcard >> nth=0'); await wait(page, 600); },
  'event-pack': async (page) => { await skipTips(page); await page.click('#pack'); await wait(page, 600); },
  'fight': async (page) => { await skipTips(page); await page.evaluate(() => { window.__game.speed = 1; }); await page.click('#fight'); await wait(page, 2500); await skipTips(page); },
  'result': async (page) => { await skipTips(page); await page.evaluate(() => { window.__game.speed = 40; }); await page.click('#fight'); await page.waitForSelector('#result:not([hidden])', { timeout: 60000 }); await wait(page, 2500); },
};
const only = process.argv[4]?.split(',');
for (const [tag, w, h] of [['upright', 393, 852], ['sideways', 852, 393]]) {
  for (const [name, run] of Object.entries(SCREENS)) {
    if (only && !only.includes(name)) continue;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    try {
      await page.goto('http://localhost:8125/?seed=7');
      await wait(page, 2200);
      await run(page);
      await page.screenshot({ path: `docs/samples/${prefix}-${name}-${tag}.png` });
    } catch (e) { console.log('FAILED', name, tag, e.message.split('\n')[0]); }
    await ctx.close();
  }
}
await browser.close(); srv.close();
