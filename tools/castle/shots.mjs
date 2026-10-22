// Serves out/web and takes the Castle tab's samples at both phone sizes, with every upgrade at 0, part-built and maxed:
//   node tools/castle/shots.mjs [extra]      (PORT; DPR = device pixel ratio, default 3, a phone's; the pictures go to docs/samples/castle-<state>-<upright|sideways>.png,
//   with -dpr1 added for a ratio of 1)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const root = 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(Number(process.env.PORT ?? 8127));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'barbarian', 'paladin', 'druid'];
const STATES = { empty: { treasury: 0, barracks: 0, armoury: 0, mageTower: 0 }, part: { treasury: 1, barracks: 3, armoury: 2, mageTower: 1 }, maxed: { treasury: 5, barracks: 5, armoury: 5, mageTower: 4 } };
const DPR = Number(process.env.DPR ?? 3);
const TAG = DPR === 1 ? '-dpr1' : '';
const SIZES = { upright: { width: 393, height: 852 }, sideways: { width: 852, height: 393 }, ...(process.env.DESKTOP ? { desktop: { width: 1280, height: 800 } } : {}) };
mkdirSync('docs/samples', { recursive: true });
const only = (process.env.ONLY ?? '').split(',').filter(Boolean);
for (const [size, vp] of Object.entries(SIZES)) {
  if (process.env.SIZES && process.env.SIZES !== size) continue;
  for (const [state, castle] of Object.entries(STATES)) {
    if (only.length && !only.includes(state)) continue;
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: DPR, hasTouch: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
    page.on('console', (m) => m.type() === 'error' && console.log('console error', m.text()));
    await page.addInitScript(([castle, heroes]) => {
      try {
        localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 400, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle, shards: {}, stars: {}, xp: {}, bestStage: 3, tower: 0, daily: {}, bosses: [], achievements: [] }));
        localStorage.setItem('lotf-tips-off', '1');
      } catch {}
    }, [castle, HEROES]);
    await page.goto(`http://localhost:${srv.address().port}/`);
    await page.waitForTimeout(1200);
    await page.locator('.hmTab').nth(3).click();
    await page.waitForTimeout(Number(process.env.WAIT ?? 2500));
    await page.screenshot({ path: `docs/samples/castle-${state}-${size}${TAG}.png` });
    console.log('shot', state, size);
    if (process.env.FULL) await page.evaluate(() => document.querySelector('.ctRoom').toDataURL()).then((u) => import('node:fs').then((fs) => fs.writeFileSync(`${process.env.FULL}/castle-full-${state}.png`, Buffer.from(u.split(',')[1], 'base64'))));
    if (state === 'part' && process.env.CARD) {
      // (pan the tag into the middle of the view, then tap it like a finger would)
      const box = await page.evaluate(() => { const sc = document.querySelector('.ctScroll'); const t = document.querySelector('.ctTag'); const r = t.getBoundingClientRect(); const v = sc.getBoundingClientRect(); sc.scrollLeft += r.x + r.width / 2 - (v.x + v.width / 2); sc.scrollTop += r.y - (v.y + v.height / 2); const q = t.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2 }; });
      await page.waitForTimeout(200);
      await page.mouse.click(box.x, box.y);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `docs/samples/castle-card-${size}${TAG}.png` });
      await page.locator('.bcard .primary').click();
      if (DPR === 1) for (const [i, ms] of [150, 300, 400, 600, 900].entries()) { await page.waitForTimeout(ms); await page.screenshot({ path: `docs/samples/castle-build-${size}${TAG}-${i}.png` }); }
    }
    await ctx.close();
  }
}
await browser.close();
srv.close();
