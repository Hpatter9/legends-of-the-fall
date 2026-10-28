// Controlled renderer fixtures for the painted battle effects. Serve npm run web on :8000 first.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
await esbuild.build({ entryPoints: ['tools/fxlab/lab.ts'], outfile: 'out/cinematic-lab.js', bundle: true, format: 'iife', platform: 'browser' });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const dir = 'out/fx-cinematic';
mkdirSync(dir, { recursive: true });
const results = [];
const heroes = JSON.parse(readFileSync('tools/fxlab/heroes.json', 'utf8'));
try {
  for (const [width, height, reduced, saver] of [[393,852,false,false], [360,780,false,false], [412,915,false,false], [393,852,true,false], [393,852,false,true]]) {
    const tag = `${width}x${height}${reduced ? '-reduced' : saver ? '-saver' : ''}`;
    if (process.env.FX_CASE && process.env.FX_CASE !== tag) continue;
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(saver => localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false, saver })), saver);
    await page.goto(`${process.env.GAME_URL || 'http://localhost:8000'}/?seed=7`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.__game, null, { timeout: 180000 });
    await page.addScriptTag({ path: 'out/cinematic-lab.js' });
    await page.evaluate(() => {
      window.__lab.setup({ heroes: ['knight', 'wizard', 'cleric'], band: 'skeletons', seed: 7 });
      window.__lab.speed(0);
      window.__lab.go();
      window.__lab.advance(300);
      window.__lab.lookBetween(1.8, 'knight');
    });
    const materials = await page.evaluate(() => {
      const g = window.__game;
      const before = JSON.stringify(g.b);
      const names = ['bloodExplosion','darkCircle','darkSlash','earthBurst','earthExplosion','earthShield','earthWave','fireCircle','fireExplosion','goldBurst','iceShield','lightCircle','lightGather','lightNova','lightningBurst','lightningStrike','moonSlash','pinkHeart','whiteBurst','windBurst','windVortex','windWave'];
      const reports = names.map(sheet => {
        const sp = g.fx.effect({ sheet, scale: 2 }, 0, 0);
        const tex = sp.texture;
        return { sheet, logical: tex.orig.width, pixels: tex.source.width, filtering: tex.source.style.scaleMode };
      });
      g.fx.clear();
      return { reports, unchanged: before === JSON.stringify(g.b) };
    });
    assert.ok(materials.unchanged);
    for (const m of materials.reports) {
      assert.equal(m.logical, 32, m.sheet);
      assert.equal(m.pixels, 128, m.sheet);
      assert.equal(m.filtering, 'linear', m.sheet);
    }
    for (const scene of ['weapons', 'fire', 'lightning', 'healing', 'frost', 'ultimate']) {
      await page.evaluate(scene => {
        const g = window.__game;
        g.fx.clear();
        const hero = g.b.units.find(u => u.side === 'hero');
        const wizard = g.b.units.find(u => u.def === 'wizard');
        const foe = g.b.units.find(u => u.side === 'foe');
        const hs = g.sprites.get(hero.id);
        const fs = g.sprites.get(foe.id);
        const x = fs.x;
        const y = fs.y - fs.tall * 0.4;
        if (scene === 'weapons') {
          g.fx.show(g.b, [{ kind: 'swing', by: hero.id, to: foe.id }, { kind: 'hit', by: hero.id, to: foe.id, dmg: 28, src: 'blow', heavy: true, killed: false }]);
        } else if (scene === 'fire') {
          g.fx.effect({ sheet: 'fireExplosion', scale: 3 }, x, y);
          g.fx.show(g.b, [{ kind: 'shot', by: wizard.id, to: foe.id, shot: 'fire', ms: 480 }]);
        } else if (scene === 'lightning') {
          g.fx.effect({ sheet: 'lightningStrike', scale: 2.4 }, x, y);
          g.fx.arc(hero.id, foe.id);
        } else if (scene === 'healing') {
          g.fx.effect({ sheet: 'lightGather', scale: 2.6 }, hs.x, hs.y - hs.tall * 0.3);
          g.fx.effect({ sheet: 'earthShield', scale: 2.6, tint: 0xffedbb }, hs.x, hs.y - hs.tall * 0.35);
          g.fx.show(g.b, [{ kind: 'heal', to: hero.id, amount: 35 }]);
        } else if (scene === 'frost') {
          g.fx.show(g.b, [{ kind: 'spell', id: 'frost', u: foe.u, v: foe.v }]);
          g.fx.spellFx({ kind: 'spellfx', id: 'poison', to: foe.id });
        } else {
          g.fx.skillName(wizard.id, 'Armageddon', 900);
          g.fx.effect({ sheet: 'fireExplosion', scale: 3.8 }, x, y);
          g.fx.effect({ sheet: 'darkCircle', scale: 3.8 }, x, fs.y);
        }
        g.fx.step(110);
      }, scene);
      await page.screenshot({ path: `${dir}/${scene}-${tag}.png` });
    }
    const lifecycle = await page.evaluate(() => {
      const g = window.__game;
      g.fx.clear();
      const hero = g.b.units.find(u => u.side === 'hero');
      const foe = g.b.units.find(u => u.side === 'foe');
      const sp = g.sprites.get(foe.id);
      // A reused particle must have its own size immediately, before the next ticker step.
      g.fx.show(g.b, [{ kind: 'swing', by: hero.id, to: foe.id }]);
      const live = g.fx.particles.live[0];
      const spawnScale = live.sp.scale.x;
      g.fx.step(30);
      const first = { alpha: live.sp.alpha, scale: live.sp.scale.x, rotation: live.sp.rotation };
      g.fx.step(90);
      const next = { alpha: live.sp.alpha, scale: live.sp.scale.x, rotation: live.sp.rotation };
      const source = live.sp.texture.source;
      g.fx.step(1000);
      const expired = g.fx.particles.live.length === 0;
      // A delayed effect stays hidden until due, then retires on its own clock.
      g.fx.particles.spawn({ frames: live.b.frames, x: sp.x, y: sp.y, scale: 0.4, delay: 120, life: 300 });
      const delayed = g.fx.particles.live[0];
      const hidden = !delayed.sp.visible;
      g.fx.step(150);
      const appeared = delayed.sp.visible;
      g.fx.step(500);
      g.fx.clear();
      return { spawnScale, first, next, expired, hidden, appeared, cleared: !g.fx.items.length && !g.fx.particles.live.length, sourceAlive: !source.destroyed, density: g.fx.particles.density };
    });
    assert.ok(lifecycle.spawnScale > 0);
    assert.ok(lifecycle.expired && lifecycle.hidden && lifecycle.appeared && lifecycle.cleared && lifecycle.sourceAlive);
    assert.equal(lifecycle.density, saver ? 0.5 : 1);
    if (reduced) {
      assert.equal(lifecycle.first.scale, lifecycle.next.scale);
      assert.equal(lifecycle.first.rotation, lifecycle.next.rotation);
    } else assert.notEqual(lifecycle.first.scale, lifecycle.next.scale);
    let catalogue = null;
    if (width === 393 && !reduced && !saver) {
      catalogue = await page.evaluate(heroes => {
        const ids = Object.keys(heroes);
        let cues = 0;
        for (let start = 0; start < ids.length; start += 5) {
          const group = ids.slice(start, start + 5);
          window.__lab.setup({ heroes: group, band: 'skeletons', seed: 7, level: 30 });
          window.__lab.go();
          window.__lab.advance(300);
          const g = window.__game;
          for (const id of group) {
            const hero = g.b.units.find(u => u.side === 'hero' && u.def === id);
            for (const name of [heroes[id].skill, heroes[id].ult]) {
              if (!name) continue;
              const before = JSON.stringify(g.b);
              g.fx.show(g.b, [{ kind: 'skill', by: hero.id, name, ms: 600 }]);
              for (let t = 0; t < 1800; t += 30) g.fx.step(30);
              if (before !== JSON.stringify(g.b)) throw Error(`Renderer changed battle for ${name}`);
              g.fx.clear();
              cues++;
            }
          }
        }
        const g = window.__game;
        const foe = g.b.units.find(u => u.side === 'foe');
        const spells = ['heal','haste','shield','smite','chain','frost','rally','quake','resurrect','poison','cleanse','blink','hex','lance','renewal','deepfreeze','warcry','bulwark','wolves','starfall','meteor'];
        for (const id of spells) {
          const before = JSON.stringify(g.b);
          g.fx.show(g.b, [{ kind: 'spell', id, u: foe.u, v: foe.v }, { kind: 'spellfx', id, to: foe.id }]);
          if (id === 'meteor' || id === 'starfall') g.fx.show(g.b, [{ kind: 'area', id: 'meteor', by: 0, u: foe.u, v: foe.v, ms: 600 }]);
          for (let t = 0; t < 2200; t += 30) g.fx.step(30);
          if (before !== JSON.stringify(g.b)) throw Error(`Renderer changed battle for ${id}`);
          g.fx.clear();
        }
        return { heroes: ids.length, skillCues: cues, spells: spells.length };
      }, heroes);
      assert.equal(catalogue.heroes, 45);
      assert.equal(catalogue.skillCues, 90);
      assert.equal(catalogue.spells, 21);
    }
    assert.deepEqual(errors, []);
    results.push({ width, height, reduced, saver, materials, lifecycle, catalogue, errors });
    await context.close();
    console.log('passed painted effects', tag);
  }
} finally { await browser.close(); }
writeFileSync(`${dir}/results${process.env.FX_CASE ? `-${process.env.FX_CASE}` : ''}.json`, JSON.stringify(results, null, 2));
