// Run after npm run web, with out/web served at GAME_URL (default localhost:8000).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
await esbuild.build({ entryPoints: ['tools/fxlab/lab.ts'], outfile: 'out/polish-lab.js', bundle: true, format: 'iife', platform: 'browser' });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const dir = 'out/fx-polish';
mkdirSync(dir, { recursive: true });
const results = [];
try {
  for (const [width, height, reduced, saver] of [[393,852,false,false], [360,780,false,false], [412,915,false,false], [393,852,true,false], [393,852,false,true]]) {
    const tag = `${width}x${height}${reduced ? '-reduced' : saver ? '-saver' : ''}`;
    if (process.env.FX_CASE && process.env.FX_CASE !== tag) continue;
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => { errors.push(e.message); console.error('PAGE ERROR', e.message); });
    page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE ERROR', m.text()); });
    await page.addInitScript(saver => localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false, saver })), saver);
    await page.goto(`${process.env.GAME_URL || 'http://localhost:8000'}/?seed=7`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.__game || document.getElementById('loading')?.textContent?.startsWith('Could not start:'), null, { timeout: 180000 });
    if (!await page.evaluate(() => !!window.__game)) {
      await page.screenshot({ path: `${dir}/startup-failure.png` });
      throw Error(await page.locator('#loading').textContent());
    }
    await page.addScriptTag({ path: 'out/polish-lab.js' });
    await page.evaluate(() => {
      window.__lab.setup({ heroes: ['knight','samurai','wizard'], band: 'skeletons', seed: 7 });
      window.__lab.speed(0);
      window.__lab.go();
      // The renderer interpolates one tick behind; move past its initial negative time.
      window.__lab.advance(300);
      window.__lab.look(1.5);
    });
    const report = await page.evaluate(() => {
      const g = window.__game;
      const hero = g.b.units.find(u => u.side === 'hero');
      const before = JSON.stringify(g.b);
      const from = { u: hero.u, v: hero.v };
      const to = { u: hero.u + 2, v: hero.v };
      g.fx.show(g.b, [{ kind: 'dash', by: hero.id, from, to }]);
      const ghosts = g.fx.items.filter(i => i.view.tint === 0x82d9ed).length;
      g.fx.step(65);
      return { ghosts, simulationUnchanged: before === JSON.stringify(g.b) };
    });
    assert.equal(report.ghosts, reduced ? 0 : saver ? 2 : 4);
    assert.ok(report.simulationUnchanged);
    await page.screenshot({ path: `${dir}/dash-${tag}.png` });
    await page.evaluate(() => {
      const g = window.__game;
      g.fx.clear();
      const hero = g.b.units.find(u => u.side === 'hero');
      g.fx.levelUp(hero.id, 16);
      g.fx.step(140);
    });
    await page.screenshot({ path: `${dir}/level-${tag}.png` });
    await page.evaluate(() => {
      const g = window.__game;
      g.fx.clear();
      const hero = g.b.units.find(u => u.side === 'hero');
      const foe = g.b.units.find(u => u.side === 'foe');
      hero.swing = { at: g.b.t, ms: 400 };
      g.b.t += 160;
      g.fx.show(g.b, [{ kind: 'swing', by: hero.id, to: foe.id }, { kind: 'hit', by: hero.id, to: foe.id, dmg: 10, src: 'blow', heavy: true, killed: false }]);
      g.fx.step(50);
      window.__lab.lookBetween(1.8, 'knight');
    });
    await page.screenshot({ path: `${dir}/impact-${tag}.png` });
    await page.evaluate(() => {
      window.__lab.setup({ heroes: ['wizard','knight'], band: 'skeletons', seed: 7, charged: true, level: 30 });
      window.__lab.go();
      for (let i = 0; i < 100; i++) if (window.__lab.advance(100).some(e => e[1] === 'skill')) break;
      window.__lab.look(1.5, true);
    });
    await page.screenshot({ path: `${dir}/cast-${tag}.png` });
    await page.evaluate(() => {
      const g = window.__game;
      g.fx.clear();
      g.fx.step(16);
      if (g.fx.items.length || g.fx.particles.live.length) throw Error('Effects leaked after clear');
    });
    assert.deepEqual(errors, []);
    results.push({ width, height, reduced, saver, ...report, errors });
    await context.close();
    console.log('passed', tag);
  }
} finally { await browser.close(); }
writeFileSync(`${dir}/${process.env.FX_CASE ? `results-${process.env.FX_CASE}` : 'results'}.json`, JSON.stringify(results, null, 2));
