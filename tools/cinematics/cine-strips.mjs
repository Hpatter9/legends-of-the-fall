// CINE-001: frame strips of the films, as played (cut into shots by the director), by seeking the player to each line once typed:
//   node tools/cinematics/cine-strips.mjs [web dir] [raw out dir] [--sizes=393,360,412] [--only=quest:bridgeBlades,arrive:orcWarlord] [--calm]
// Writes <raw>/<id>-<n>-<w>.png; tools/cinematics/cine-strip.py lays each scene's frames out as docs/samples/cine-<name>.png.
// Ids are the Scenes table's, or a film made on the spot (`quest:<battle>`, `questAfter:<battle>`, `arrive:<boss>`, `act:<1-3>`).
// Checks as it goes: no page errors, nothing wider than the page, Skip ends the scene, a held finger skips it.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = Number(process.env.PORT ?? 8843);
const [root = 'out/web', out = 'out/cine-raw'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
mkdirSync(out, { recursive: true });
const arg = (k) => process.argv.filter((a) => a.startsWith(`--${k}=`)).map((a) => a.slice(k.length + 3))[0];
const sizes = (arg('sizes') ?? '393').split(',').map(Number);
const DEFAULT = ['quest:bridgeBlades', 'quest:cellarTenant', 'arrive:orcWarlord', 'act:1', 'act:3', 'intro:orcs', 'gorvak', 'opening', 'awaken:knight', 'clear:orcs'];
const ids = arg('only')?.split(',') ?? DEFAULT;
const calm = process.argv.includes('--calm');
const H = { 393: 852, 360: 780, 412: 915 };
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const safe = (id) => id.replace(/[^\w-]/g, '_');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let problems = 0;
for (const w of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: H[w] ?? 852 }, deviceScaleFactor: 1, reducedMotion: calm ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => (problems++, console.log('PAGE ERROR', e.message)));
  await page.goto(`http://localhost:${PORT}/?seed=7`);
  await page.evaluate(() => localStorage.setItem('lotf-tips-off', '1'));
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  for (const id of ids) {
    // (whatever the page queued by itself first, an army's first march say, is skipped out of the way)
    for (let k = 0; k < 20 && !(await page.evaluate(() => document.getElementById('cutscene')?.hidden ?? true)); k++) {
      await page.evaluate(() => document.querySelector('.csSkip')?.click());
      await page.waitForTimeout(400);
    }
    const frames = await page.evaluate((id) => window.__game.sceneFrames(id), id);
    if (!frames.length) { console.log(w, id, 'NO FRAMES'); problems++; continue; }
    await page.evaluate((id) => void window.__game.playScene(id), id);
    await page.waitForTimeout(1600);
    let n = 0;
    for (const [s, b, t] of frames) {
      await page.evaluate(([s, b, t]) => window.__game.scenes.seek(s, b, t), [s, b, t]);
      await page.waitForTimeout(450);
      const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      if (wide) (problems++, console.log(w, id, 'WIDER THAN THE PAGE'));
      await page.screenshot({ path: `${out}/${safe(id)}${calm ? '-calm' : ''}-${++n}-${w}.png` });
    }
    // (a finger held on the picture skips the scene)
    const box = await page.locator('#cutscene').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(900);
    await page.mouse.up();
    await page.waitForTimeout(300);
    let gone = await page.evaluate(() => document.getElementById('cutscene').hidden);
    if (!gone) {
      await page.click('.csSkip');
      await page.waitForTimeout(300);
      console.log(w, id, 'a held finger did not skip');
      problems++;
      gone = await page.evaluate(() => document.getElementById('cutscene').hidden);
    }
    if (!gone) (problems++, console.log(w, id, 'STILL UP after Skip'));
    console.log(w, id, n, 'frames');
  }
  await ctx.close();
}
await browser.close();
srv.close();
console.log(problems ? `${problems} problem(s)` : 'no problems');
