// Screenshots for the fight camera, the boss intro and the skill labels, at both phone sizes:
//   node tools/camera/shots.mjs <web dir> <name prefix> [fight|intro|labels|all]
// The web dir is a build (out/web, or an older build for the "before" shots). Writes docs/samples/<prefix>-<scene>-<upright|sideways>.png
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [root, prefix, what = 'all'] = process.argv.slice(2);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8131);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const want = (s) => what === 'all' || what === s;
for (const [tag, w, h] of [['upright', 393, 852], ['sideways', 852, 393]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto('http://localhost:8131/?seed=7');
  await page.waitForTimeout(2500);
  await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  const shot = (name) => page.screenshot({ path: `docs/samples/${prefix}-${name}-${tag}.png` });
  // a stage (a boss stage when asked) with the squad placed; the intro, if any, is let run or skipped
  const stage = async (n, skip) => {
    await page.evaluate((n) => { const g = window.__game; g.run.stage = n; g.newBattle(); }, n);
    await page.waitForTimeout(100);
    if (skip) await page.evaluate(() => window.__game.endIntro());
  };
  if (want('fight')) {
    await stage(2, true);
    await page.waitForTimeout(300);
    await shot('fight-0-deploy');
    await page.evaluate(() => window.__game.begin());
    for (let i = 1; i <= 6; i++) { await page.waitForTimeout(i === 1 ? 600 : 1500); await shot(`fight-${i}`); }
  }
  if (want('intro')) {
    await stage(5, false);
    for (const [i, ms] of [[1, 250], [2, 450], [3, 400], [4, 500], [5, 700]]) { await page.waitForTimeout(ms); await shot(`intro-${i}`); }
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__game.begin());
    await page.waitForTimeout(1500);
    await shot('intro-6-fight');
  }
  if (want('labels')) {
    await stage(2, true);
    await page.evaluate(() => window.__game.begin());
    await page.waitForTimeout(800);
    // three skill names from the same hero in quick succession, plus one a bit later while the first fade
    await page.evaluate(() => {
      const fx = window.__game.fx;
      const id = [...fx.sprites.keys()].find((k) => fx.sprites.get(k).unit.side === 'hero');
      for (const n of ['Whirlwind', 'Shield Bash', 'Iaido', 'Volley']) fx.skillName(id, n, 400);
      setTimeout(() => fx.skillName(id, 'Meteor', 400), 300);
    });
    await page.waitForTimeout(150);
    await shot('labels-1');
    await page.waitForTimeout(600);
    await shot('labels-2');
  }
  await ctx.close();
}
await browser.close(); srv.close();
