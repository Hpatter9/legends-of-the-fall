// Screenshots for docs/notes/starter-king.md: the starter pick with the two fixed packs on upright phones, a pack chosen, and an old
// save that was mid-pick on three seeded packs (it is offered the two fixed packs).
//   npm run web && PORT=8262 node tools/starter-packs/shots.mjs      (pictures go to docs/samples/starter-king-*.png)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = 'out/web';
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', opus: 'audio/ogg' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(Number(process.env.PORT ?? 8262));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
mkdirSync('docs/samples', { recursive: true });
const url = `http://localhost:${srv.address().port}/`;
const errors = [];
const open = async (size, meta) => {
  const [width, height] = size.split('x').map(Number);
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([m]) => {
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, music: 0, effects: 0 }));
    if (m && !localStorage.getItem('legends.meta')) localStorage.setItem('legends.meta', JSON.stringify(m));
  }, [meta]);
  await page.goto(url);
  return { ctx, page };
};
const fits = (page) => page.evaluate(() => {
  const r = document.getElementById('starter');
  const go = r.querySelector('.stGo').getBoundingClientRect();
  return { packs: r.querySelectorAll('.stPack').length, scrolls: r.scrollHeight > r.clientHeight, goBottom: Math.round(go.bottom), names: [...r.querySelectorAll('.stHead span')].map((s) => s.textContent) };
});

for (const size of ['393x852', '360x780', '412x915']) {
  const { ctx, page } = await open(size, null);
  await page.waitForSelector('#starter .stPack', { timeout: 60000 });
  await page.waitForTimeout(600);
  console.log(size, JSON.stringify(await fits(page)));
  await page.screenshot({ path: `docs/samples/starter-king-pick-${size}.png` });
  if (size === '393x852') {
    await page.locator('#starter .stPack').nth(0).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'docs/samples/starter-king-chosen-393x852.png' });
    await page.locator('#starter .stGo').click();
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta')));
    console.log('picked', m.starter.pick, 'unlocked', m.unlocked.join(','), 'party', m.party.join(','));
  }
  await ctx.close();
}

// an old save that was mid-pick on three seeded packs: offered the fixed two
{
  const castle = { treasury: 0, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 };
  const old = { seed: 9, crowns: 0, stones: 0, unlocked: [], party: [], starter: { packs: [['paladin', 'barbarian', 'ranger'], ['knight', 'ninjaMonk', 'warlock'], ['mummy', 'lancer', 'priestess']], pick: null }, pulls: 0, sinceNew: 0, shards: {}, stars: {}, xp: {}, castle, bestStage: 1, tower: 0, daily: {}, bosses: [], achievements: [] };
  const { ctx, page } = await open('393x852', old);
  await page.waitForSelector('#starter .stPack', { timeout: 60000 });
  await page.waitForTimeout(600);
  console.log('old mid-pick save', JSON.stringify(await fits(page)));
  await page.screenshot({ path: 'docs/samples/starter-king-old-midpick-393x852.png' });
  await ctx.close();
}
console.log(errors.length ? `PAGE ERRORS ${errors.length}` : 'no page errors');
await browser.close();
srv.close();
