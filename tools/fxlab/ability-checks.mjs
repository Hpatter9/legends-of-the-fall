// Audit the actual emitted material for every named ability, then capture its source and representative live releases.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const catalogue = JSON.parse(readFileSync('src/art/fx/abilities/catalogue.json', 'utf8'));
await esbuild.build({ entryPoints: ['tools/fxlab/lab.ts'], outfile: 'out/ability-lab.js', bundle: true, format: 'iife', platform: 'browser' });
const dir = 'out/ability-fx';
mkdirSync(`${dir}/materials`, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const [width,height,reduced,saver] of [[393,852,false,false],[360,780,false,false],[412,915,false,false],[393,852,true,false],[393,852,false,true]]) {
    const tag = `${width}x${height}${reduced ? '-reduced' : saver ? '-saver' : ''}`;
    if (process.env.FX_CASE && process.env.FX_CASE !== tag) continue;
    const context = await browser.newContext({ viewport: { width,height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(saver => localStorage.setItem('legends.settings', JSON.stringify({ music:0,effects:0,cinematics:false,quips:false,saver })), saver);
    await page.goto(`${process.env.GAME_URL || 'http://localhost:8000'}/?seed=7`, { waitUntil:'domcontentloaded',timeout:180000 });
    await page.waitForFunction(() => window.__game, null, { timeout:180000 });
    await page.addScriptTag({ path:'out/ability-lab.js' });
    await page.evaluate(() => {
      window.__lab.setup({ heroes:['knight','wizard','cleric','priestess','ranger'],band:'skeletons',seed:7,level:30 });
      window.__lab.speed(0); window.__lab.go(); window.__lab.advance(300); window.__lab.look(1.5);
    });
    const samples = await page.evaluate(catalogue => {
      const g = window.__game;
      const hero = g.b.units.find(u => u.side === 'hero');
      const foe = g.b.units.find(u => u.side === 'foe');
      const rows = [];
      for (const row of catalogue) {
        g.fx.clear();
        const before = JSON.stringify(g.b);
        if (row.id.startsWith('skill:')) g.fx.show(g.b, [{ kind:'skill',by:hero.id,name:row.name,ms:100 }]);
        else {
          const id = row.id.slice(6);
          const friendly = ['heal','haste','shield','rally','resurrect','cleanse','blink','renewal','warcry','bulwark','wolves'].includes(id);
          const target = friendly ? hero : foe;
          const events = [{ kind:'spell',id,u:target.u,v:target.v },{ kind:'spellfx',id,to:target.id }];
          if (id === 'meteor' || id === 'starfall') events.push({ kind:'area',id:'meteor',by:0,u:target.u,v:target.v,ms:900 });
          g.fx.show(g.b, events);
        }
        let found;
        for (let t=0;t<1800;t+=20) {
          g.fx.step(20);
          found = g.fx.particles.live.find(p => p.b.art === row.id && p.t >= 0 && p.t < p.span);
          if (found) break;
        }
        if (!found) throw Error(`No individual material emitted for ${row.id}`);
        if (before !== JSON.stringify(g.b)) throw Error(`Renderer changed battle for ${row.id}`);
        const source = found.sp.texture.source;
        const canvas = source.resource;
        const data = canvas.getContext('2d').getImageData(0,0,128,128).data;
        let visible = 0, light = 0, edge = 0;
        for (let i=0;i<data.length;i+=4) {
          if (data[i+3] > 24) { visible++; light += Math.max(data[i],data[i+1],data[i+2]); }
          const x=(i/4)%128,y=Math.floor(i/4/128);
          if (x===0||y===0||x===127||y===127) edge=Math.max(edge,data[i+3]);
        }
        rows.push({ id:row.id,source:canvas.toDataURL(),pixels:source.width,logical:found.sp.texture.orig.width,filter:source.style.scaleMode,visible,light,edge,calm:g.fx.particles.calm });
      }
      g.fx.clear(); g.fx.step(3000);
      if (g.fx.items.length || g.fx.particles.live.length) throw Error('Individual effects leaked after clearing');
      return rows;
    }, catalogue);
    const hashes = new Set();
    for (const [i,sample] of samples.entries()) {
      assert.equal(sample.pixels,128,sample.id); assert.equal(sample.logical,32,sample.id); assert.equal(sample.filter,'linear',sample.id);
      assert.ok(sample.visible>120 && sample.light>10000,sample.id); assert.equal(sample.edge,0,sample.id);
      const bytes = Buffer.from(sample.source.split(',')[1], 'base64');
      const hash = createHash('sha256').update(bytes).digest('hex');
      assert.ok(!hashes.has(hash), `Duplicated resolved artwork: ${sample.id}`); hashes.add(hash);
      if (!reduced && !saver && width===393) writeFileSync(`${dir}/materials/${String(i).padStart(3,'0')}.png`,bytes);
      delete sample.source; sample.hash=hash;
    }
    assert.equal(hashes.size,129);
    for (const [label,heroId,name,spell] of [
      ['shield-wall','knight','Shield Wall'], ['last-bastion','knight','Last Bastion'],
      ['benediction','cleric','Benediction'], ['holy-light','priestess','Holy Light'],
      ['heal','knight',null,'heal'], ['renewal','knight',null,'renewal'],
      ['frost','knight',null,'frost'], ['deepfreeze','knight',null,'deepfreeze'],
      ['hero-meteor','wizard','Meteor'], ['king-meteor','wizard',null,'meteor'],
    ]) {
      await page.evaluate(({heroId,name,spell}) => {
        const g=window.__game; g.fx.clear();
        const hero=g.b.units.find(u=>u.def===heroId),foe=g.b.units.find(u=>u.side==='foe');
        if (spell) {
          const target=['heal','renewal'].includes(spell)?hero:foe;
          const events=[{kind:'spell',id:spell,u:target.u,v:target.v},{kind:'spellfx',id:spell,to:target.id}];
          if (spell==='meteor') events.push({kind:'area',id:'meteor',by:0,u:target.u,v:target.v,ms:900});
          g.fx.show(g.b,events);
          for (let t=0;t<(spell==='meteor'?1040:160);t+=20) g.fx.step(20);
        } else {
          g.fx.show(g.b,[{kind:'skill',by:hero.id,name,ms:200}]);
          for (let t=0;t<340;t+=20) g.fx.step(20);
        }
        window.__lab.lookBetween(1.7,heroId);
      }, {heroId,name,spell});
      await page.screenshot({ path:`${dir}/${label}-${tag}.png` });
    }
    assert.deepEqual(errors,[]);
    results.push({ width,height,reduced,saver,individualMaterials:hashes.size,simulationUnchanged:true,cleanup:true,errors,samples });
    await context.close(); console.log('passed individual ability materials',tag);
  }
} finally { await browser.close(); }
writeFileSync(`${dir}/results${process.env.FX_CASE?`-${process.env.FX_CASE}`:''}.json`,JSON.stringify(results,null,2));
