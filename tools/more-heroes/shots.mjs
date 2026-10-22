// Screenshots for docs/samples/new-heroes-*.png of the second wave of heroes, at 393x852 and 360x780 (the heroes tab and a hero sheet
// also at 412x915). Builds the fx lab, serves out/web (run `npm run web` first) and drives the page. Run: node tools/more-heroes/shots.mjs
import * as esbuild from 'esbuild';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { HEROES, saveScript } from '../audit/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

await esbuild.build({ entryPoints: ['tools/fxlab/lab.ts'], outfile: 'out/lab.js', bundle: true, format: 'iife', platform: 'browser', target: 'es2022', logLevel: 'warning' });
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg' };
const PORT = Number(process.env.PORT ?? 8127);
const srv = createServer((q, r) => {
  const p = 'out/web/' + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync('docs/samples', { recursive: true });
const SIZES = [[393, 852], [360, 780]];
const wait = (page, ms) => page.waitForTimeout(ms);

/** Fights of the new heroes, skills and ultimates charged; a frame when the first skill goes off, one a moment later and one a few seconds in. */
const FIGHTS = {
  a: { heroes: ['juggernaut', 'priestess', 'arcBlade', 'rifleBot', 'sage'], band: 'skeletons' },
  b: { heroes: ['tyrant', 'demonSwordsman', 'dragoon', 'kraken', 'timeWitch'], band: 'werewolves' },
  c: { heroes: ['beastmaster', 'lancer', 'reaper', 'siegeBot', 'dreadPirate'], band: 'orcs' },
  d: { heroes: ['mercenary', 'mummy', 'buccaneer', 'wolfBard', 'shambler'], band: 'skeletons' },
};
for (const [w, h] of SIZES) {
  for (const [name, sc] of Object.entries(FIGHTS)) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('PAGE ERROR', e.message.split('\n')[0]));
    await page.goto(`http://localhost:${PORT}/?seed=7`);
    await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
    await page.addScriptTag({ path: 'out/lab.js' });
    await wait(page, 800);
    await page.evaluate((s) => { window.__lab.setup(s); window.__lab.speed(0); }, { ...sc, seed: 7, charged: true });
    await wait(page, 300);
    await page.evaluate(() => window.__lab.go());
    const adv = (ms) => page.evaluate((ms) => window.__lab.advance(ms), ms);
    let found = false;
    for (let k = 0; k < 300 && !found; k++) found = (await adv(100)).some((e) => e[1] === 'skill');
    await page.evaluate(() => window.__lab.pin());
    for (const [i, ms] of [[1, 0], [2, 600], [3, 2400]]) {
      await adv(ms);
      await page.evaluate((z) => window.__lab.look(z, true), i === 3 ? 1.1 : 1.8);
      await wait(page, 60);
      await page.screenshot({ path: `docs/samples/new-heroes-fight-${name}${i}-${w}x${h}.png` });
    }
    console.log('fight', name, w, h);
    await ctx.close();
  }
}

/** The heroes tab with every hero recruited, and a hero sheet. */
async function home(w, h, sheet, kind) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  const xp = { [kind]: 30 * 19 * 20 };
  await page.addInitScript(saveScript(), [HEROES, { xp, shards: { [kind]: 9 } }]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForTimeout(2000);
  await page.locator('.hmTab').nth(1).click();
  await page.waitForTimeout(1500);
  if (!sheet) await page.screenshot({ path: `docs/samples/new-heroes-tavern-${w}x${h}.png` });
  else {
    await page.evaluate((k) => window.__game.home.openSheet(k), kind);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `docs/samples/new-heroes-sheet-${kind}-${w}x${h}.png` });
  }
  await ctx.close();
}
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  await home(w, h, false, 'sage');
  await home(w, h, true, 'sage');
}
await browser.close();
srv.close();
