// Shared harness for the effect audit: serves nothing itself (use `npm run dev` on :8000 or GAME_URL), builds the fx lab,
// opens the game with cinematics off, and lets a script feed events straight to `__game.fx` and step it by hand,
// taking a clipped screenshot each step.  Presentation only: the battle is never stepped.
import * as esbuild from 'esbuild';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
export async function boot({ w = 393, h = 852, reduced = false } = {}) {
  await esbuild.build({ entryPoints: ['tools/fxlab/lab.ts'], outfile: 'out/lab.js', bundle: true, format: 'iife', platform: 'browser', target: 'es2022', logLevel: 'warning' });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message.split('\n')[0]));
  await page.addInitScript(() => localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false })));
  await page.goto((process.env.GAME_URL ?? 'http://localhost:8000') + '/?seed=7', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await page.addScriptTag({ path: 'out/lab.js' });
  await page.waitForTimeout(800);
  return { browser, page };
}
/** A fight of heroes v band, held still; the camera on the middle of it. */
export async function setup(page, s, zoom = 2) {
  await page.evaluate((s) => { window.__lab.setup({ seed: 7, level: 30, ...s }); window.__lab.speed(0); window.__lab.go(); window.__lab.advance(200); }, s);
  await page.evaluate((z) => window.__lab.look(z), zoom);
}
/** Feed events, then take `n` clipped shots `step` ms apart; `at` picks the world point (a fn run in the page returning {x,y} screen px). */
export async function strip(page, run, { n = 9, step = 100, zoom = 2, clip = 170, centre = 'foe' } = {}) {
  await page.evaluate(() => { const g = window.__game; g.fx.clear(); });
  await page.evaluate(run);
  const shots = [];
  for (let i = 0; i < n; i++) {
    const c = await page.evaluate(({ zoom, centre }) => {
      const g = window.__game;
      const u = g.b.units.find((x) => x.side === (centre === 'hero' ? 'hero' : 'foe') && x.alive) ?? g.b.units[0];
      const sp = g.sprites.get(u.id);
      g.zoom = zoom; g.tx = g.cx = sp.x; g.ty = g.cy = sp.y - 30; g.clampCam(); g.place();
      return 0;
    }, { zoom, centre });
    await page.waitForTimeout(30);
    const p = await page.evaluate((centre) => {
      const g = window.__game;
      const u = g.b.units.find((x) => x.side === (centre === 'hero' ? 'hero' : 'foe') && x.alive) ?? g.b.units[0];
      const sp = g.sprites.get(u.id); const q = g.world.toGlobal({ x: sp.x, y: sp.y });
      return { x: q.x, y: q.y };
    }, centre);
    const cw = clip * 2, ch = Math.round(clip * 1.6);
    const x = Math.max(0, Math.min(page.viewportSize().width - cw, Math.round(p.x - clip))), y = Math.max(0, Math.min(page.viewportSize().height - ch, Math.round(p.y - ch * 0.6)));
    shots.push(await page.screenshot({ clip: { x, y, width: cw, height: ch } }));
    await page.evaluate((s) => { for (let k = 0; k < s; k += 20) window.__game.fx.step(20); }, step);
  }
  return shots;
}
export function sheet(out, files) { execFileSync('python3', ['-I', 'tools/fx-animate/sheet.py', out, ...files]); }
