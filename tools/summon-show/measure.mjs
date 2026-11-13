// SUMMON-SHOW: what the Blender show costs on a slow phone: the page's CPU throttled four times, the sanctum opened, then the sheets'
// load (fetch and off-thread decode), their decoded bytes, and the time from a new hero's reveal being called to its first frame of the
// show on the screen (the scene built, the first piece drawn, and the frame after painted). Three reveals, each timed.
//   npm run web && node tools/summon-show/measure.mjs [port]
import { serve, HEROES, saveScript } from '../audit/lib.mjs';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const port = Number(process.argv[2] ?? 8263);
const srv = serve('out/web', port);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true });
const page = await ctx.newPage();
await page.addInitScript(saveScript(), [HEROES.slice(0, 8), { stones: 10, heroesSeen: HEROES.slice(0, 8) }]);
await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => [...document.querySelectorAll('.hmTab')].some((b) => b.offsetWidth), {}, { timeout: 120000 });
await page.waitForTimeout(1500);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.evaluate(() => document.getElementById('tipSkip')?.click());
await page.evaluate(() => { for (const b of document.querySelectorAll('.hmTab')) if (b.textContent.includes('Recruit')) b.click(); });
await page.waitForFunction(() => window.__summonFx?.stats.ready, {}, { timeout: 60000 });
const stats = await page.evaluate(() => ({ ...window.__summonFx.stats }));
const reveals = [];
for (const kind of ['kitsune', 'werewolf', 'gorgon']) {
  reveals.push(await page.evaluate(async (kind) => {
    const t0 = performance.now();
    void window.__tarot.firstReveal(window.__game.meta, kind, {});
    const built = performance.now() - t0;
    // (the show draws in the first animation frame after the scene is up; the frame after that is on the screen)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const first = performance.now() - t0;
    const drawn = !!document.querySelector('.tarotReveal.bfx .sfxHero');
    await new Promise((r) => setTimeout(r, 4200));
    document.querySelectorAll('.tarotReveal').forEach((e) => e.remove());
    return { kind, built: Math.round(built), firstFrame: Math.round(first), drawn };
  }, kind));
}
console.log(JSON.stringify({ throttle: 4, decodedBytes: stats.bytes, loadMs: stats.loadMs, reveals }, null, 1));
await browser.close();
srv.close();
