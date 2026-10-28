// Actual game review: every hero, all four facings/eight walk frames, portraits,
// transformations, party art, reduced motion and a controlled offline reload.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
await (await import('esbuild')).build({ entryPoints: ['tools/resonance/fixture.ts'], outfile: 'out/web/art-fixture.js', bundle: true, platform: 'browser', format: 'iife', globalName: 'ART_FIXTURE', logLevel: 'silent' });
const out = 'docs/samples/resonance-roster/browser';
mkdirSync(out, { recursive: true });
const mime = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', json: 'application/json', webmanifest: 'application/manifest+json', woff2: 'font/woff2', opus: 'audio/ogg' };
const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
  try {
    const path = `out/web${pathname === '/' ? '/index.html' : pathname}`;
    res.setHeader('Content-Type', mime[path.split('.').pop()] || 'application/octet-stream');
    res.end(readFileSync(path));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://localhost:${server.address().port}`;
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const [width, height] of [[393, 852], [360, 780], [412, 915]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, serviceWorkers: 'allow' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 400)); });
    await page.addInitScript(() => {
      localStorage.setItem('lotf-tips-off', '1');
      localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false }));
    });
    await page.goto(`${url}/?seed=7`, { timeout: 120000 });
    await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await page.addScriptTag({ url: `${url}/art-fixture.js` });
    const all = await page.evaluate(() => window.ART_FIXTURE.ALL_HEROES);
    const representative = ['knight', 'archer', 'wizard', 'minotaur', 'gorgon', 'lancer', 'rifleBot', 'reaper', 'dragoon'];
    const portraits = width === 393 ? all : representative;
    await page.evaluate(() => {
      const g = window.__game;
      document.getElementById('tipSkip')?.click();
      g.meta.unlocked = [...window.ART_FIXTURE.ALL_HEROES];
      g.meta.awakened = {};
      g.home.open(); g.home.show('heroes');
    });
    await page.screenshot({ path: `${out}/roster-${width}.png` });
    for (const id of portraits) {
      await page.evaluate(id => window.__game.home.openSheet(id), id);
      await page.waitForTimeout(40);
      assert.equal(await page.locator('.heroDetail').evaluate(e => e.scrollWidth <= e.clientWidth + 1), true, `${id} dossier fits`);
      assert.ok(await page.locator('.heroDetail canvas').count(), `${id}: art canvas`);
      if (representative.includes(id)) await page.screenshot({ path: `${out}/portrait-${id}-${width}.png` });
      await page.locator('.heroBack').click();
    }
    await page.evaluate(() => localStorage.setItem('legends.meta', JSON.stringify(window.__game.meta)));
    await page.reload();
    await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await page.addScriptTag({ url: `${url}/art-fixture.js` });
    const groups = width === 393 ? Array.from({ length: 9 }, (_, i) => all.slice(i * 5, i * 5 + 5)) : [representative.slice(0, 5)];
    let frameChecks = 0;
    for (const [groupIndex, kinds] of groups.entries()) {
      await page.evaluate(kinds => {
        const g = window.__game, a = window.ART_FIXTURE;
        document.getElementById('tipSkip')?.click();
        g.meta.awakened = {}; g.meta.party = kinds;
        g.run = a.newRun(7, kinds, g.meta.castle, 0, 999);
        g.run.roster = kinds.map((kind, i) => ({ id: i + 1, kind, grade: 1 }));
        g.run.squad = kinds.map((_, i) => i + 1); g.run.nextId = 6;
        g.newBattle(); g.endIntro?.(); g.app.ticker.start();
      }, kinds);
      await page.waitForTimeout(150);
      const checked = await page.evaluate(() => {
        const g = window.__game, a = window.ART_FIXTURE;
        g.app.ticker.stop();
        const heroes = g.b.units.filter(u => u.side === 'hero');
        if (heroes.length !== 5) throw Error(`Expected five deployed heroes, got ${heroes.length}`);
        let n = 0;
        for (let dir = 0; dir < 4; dir++) for (let frame = 0; frame < 8; frame++) {
          for (const u of heroes) {
            const s = g.sprites.get(u.id), def = a.UNITS[u.def], front = def.sheet;
            u.facing = dir; delete u.swing; delete u.cast; delete u.look;
            const [du, dv] = [[1, 0], [0, 1], [-1, 0], [0, -1]][dir];
            u.step = { u: u.u - du, v: u.v - dv, h: a.tileAt(g.b.board, u.u, u.v).h, at: 1000 - ((frame + .25) / 8) * 650, ms: 650 };
            s.update(g.b.board, 1000, true);
            const want = dir >= 2 ? a.layout[front].rear : front, l = a.layout[want], rect = s.body.texture.frame;
            if (s.sheet !== want) throw Error(`${u.def}: facing ${dir} chose ${s.sheet}, wanted ${want}`);
            if (Math.sign(s.body.scale.x) !== ([0, 3].includes(dir) ? 1 : -1)) throw Error(`${u.def}: mirror ${dir}`);
            const x = frame % l.perRow * l.w, y = (l.rows.indexOf('walk') + Math.floor(frame / l.perRow)) * l.h;
            if (rect.x !== x || rect.y !== y || rect.width !== l.w || rect.height !== l.h) throw Error(`${u.def}: frame ${frame} ${dir} does not use the full stride`);
            n++;
          }
        }
        g.app.renderer.render({ container: g.app.stage });
        for (const u of heroes) delete u.step;
        return n;
      });
      frameChecks += checked;
      if (groupIndex === 0) await page.screenshot({ path: `${out}/four-facing-fixture-${width}.png` });
    }
    let forms = [];
    if (width === 393) forms = await page.evaluate(() => {
      const g = window.__game, a = window.ART_FIXTURE;
      g.app.ticker.stop();
      const result = [], unit = g.b.units.find(u => u.side === 'hero'), s = g.sprites.get(unit.id);
      for (const [kind, look, expected] of [
        ['werewolf', 'werewolf_white', 'hero_res_werewolf'], ['werewolf', 'werewolf_black', 'hero_res_werewolf_brute'],
        ['druid', 'cls_treant', 'hero_res_treant'], ['druid', 'cls_treant_2', 'hero_res_treant2'], ['druid', 'cls_treant_3', 'hero_res_treant3'],
      ]) {
        unit.def = kind; unit.look = look; unit.facing = 3;
        s.update(g.b.board, 1000, false);
        if (s.sheet !== a.layout[expected].rear) throw Error(`${kind}: transformed rear view`);
        result.push(look);
      }
      return result;
    });
    // A genuine fight, with the simulation controlling movement and facing.
    await page.evaluate(() => {
      const g = window.__game, a = window.ART_FIXTURE, kinds = ['knight', 'archer', 'wizard', 'minotaur', 'cleric'];
      g.meta.party = kinds; g.run = a.newRun(7, kinds, g.meta.castle, 0, 999);
      g.run.roster = kinds.map((kind, i) => ({ id: i + 1, kind, grade: 1 }));
      g.run.squad = [1, 2, 3, 4, 5]; g.run.nextId = 6;
      g.newBattle(); g.endIntro?.(); g.app.ticker.start(); g.begin();
    });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${out}/combat-${width}.png` });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${out}/reduced-${width}.png` });
    await page.evaluate(() => window.__game.party.open('edit', () => {}));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/party-${width}.png` });
    let offline = false;
    if (width === 393) {
      await page.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(Error('Service worker ready timeout')), 45000))]));
      await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 45000 });
      await context.setOffline(true); await page.reload();
      await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
      await page.screenshot({ path: `${out}/offline-${width}.png` });
      offline = true;
    }
    assert.deepEqual(errors, [], errors.join('\n'));
    results.push({ width, height, portraits: portraits.length, frameChecks, forms, reducedMotion: true, offline, errors });
    await context.close();
  }
} finally {
  await browser.close(); server.close();
  writeFileSync(`${out}/checks.json`, JSON.stringify(results, null, 2) + '\n');
}
console.log(JSON.stringify(results, null, 2));
