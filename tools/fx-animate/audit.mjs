// Motion audit: feeds every kind of battle effect to `__game.fx`, steps it by hand and records how each little sprite behaves over its
// life: does it travel, scale, turn, change frame?  A sprite that does none of that (it only fades) is "still".
//   node tools/fx-animate/audit.mjs <out.json>   (needs `npm run dev` on :8000; REDUCED=1 for reduced motion)
import * as esbuild from 'esbuild';
import { writeFileSync } from 'node:fs';
import { boot, setup } from './harness.mjs';
await esbuild.build({ entryPoints: ['tools/fx-animate/lists.ts'], outfile: 'out/fx-lists.js', bundle: true, format: 'iife', platform: 'browser', target: 'es2022', loader: { '.png': 'dataurl', '.webp': 'dataurl' }, logLevel: 'warning' });
const { browser, page } = await boot({ reduced: !!process.env.REDUCED });
await page.addScriptTag({ path: 'out/fx-lists.js' });
await setup(page, { heroes: ['knight', 'wizard', 'cleric', 'archer', 'samurai'], band: 'skeletons' });
const rows = await page.evaluate(() => {
  const g = window.__game, L = window.__lists, rows = [];
  const hero = () => g.b.units.find((u) => u.side === 'hero' && u.alive);
  const foe = () => g.b.units.find((u) => u.side === 'foe' && u.alive);
  const spread = (a) => Math.max(...a) - Math.min(...a);
  function run(name, group, events) {
    g.fx.clear();
    const seen = new Map(), items = new Map();
    try { g.fx.show(g.b, events(hero(), foe())); } catch (e) { rows.push({ name, group, error: String(e.message).slice(0, 80) }); return; }
    for (let t = 0; t < 2400; t += 40) {
      for (const p of g.fx.particles.live) {
        if (p.t < 0) continue;
        let s = seen.get(p);
        if (!s) seen.set(p, (s = { n: 0, x: [], y: [], sx: [], sy: [], r: [], a: [], tex: new Set(), size: 32 * Math.abs(p.sp.scale.x || 1), art: p.b.art ?? '', span: p.span }));
        s.n++; s.x.push(p.sp.x); s.y.push(p.sp.y); s.sx.push(p.sp.scale.x); s.sy.push(p.sp.scale.y); s.r.push(p.sp.rotation); s.a.push(p.sp.alpha); s.tex.add(p.sp.texture);
      }
      for (const it of g.fx.items) {
        let s = items.get(it);
        if (!s) items.set(it, (s = { n: 0, x: [], y: [], w: [], h: [], a: [], r: [], k: [] }));
        const v = it.view; if (!v || !v.getLocalBounds) continue; const bb = v.getLocalBounds();
        s.n++; s.x.push(v.x + bb.x); s.y.push(v.y + bb.y); s.w.push(bb.width * v.scale.x); s.h.push(bb.height * v.scale.y); s.a.push(v.alpha); s.r.push(v.rotation); s.k.push(v.children?.length ?? 0);
      }
      g.fx.step(40);
    }
    // A sprite "sits" when, over a stretch of its life, it neither travels, scales, turns nor changes frame (a fade does not count).
    let still = 0, moving = 0, total = 0, holdMs = 0, lifeMs = 0; const stillArts = [];
    for (const s of seen.values()) {
      if (s.n < 9) continue; // lived under ~350 ms
      total++;
      const sz = Math.max(8, s.size);
      let hold = 0;
      for (let i = 1; i < s.n; i++) {
        const d = Math.max(Math.abs(s.x[i] - s.x[i - 1]), Math.abs(s.y[i] - s.y[i - 1])) / sz + Math.abs(s.sx[i] - s.sx[i - 1]) / Math.max(0.05, Math.abs(s.sx[i - 1])) + Math.abs(s.sy[i] - s.sy[i - 1]) / Math.max(0.05, Math.abs(s.sy[i - 1])) + Math.abs(s.r[i] - s.r[i - 1]) * 0.5;
        if (d < 0.012) hold++;
      }
      holdMs += hold * 40; lifeMs += (s.n - 1) * 40;
      if (hold / (s.n - 1) > 0.4 && hold >= 8) { still++; stillArts.push(s.art || '-'); } else moving++;
    }
    let iStill = 0, iAll = 0;
    for (const s of items.values()) {
      if (s.n < 7) continue;
      iAll++;
      if (!(spread(s.x) > 3 || spread(s.y) > 3 || spread(s.w) > 3 || spread(s.h) > 3 || spread(s.r) > 0.05 || spread(s.a) > 0.15 || spread(s.k) > 0)) iStill++;
    }
    rows.push({ name, group, particles: total, moving, still, holdMs, lifeMs, stillArts: [...new Set(stillArts)].slice(0, 3), items: iAll, itemStill: iStill });
  }
  for (const n of L.skills) run(n, 'skill', (h, f) => [{ kind: 'skill', by: h.id, name: n, ms: 600 }, { kind: 'hit', by: h.id, to: f.id, dmg: 30, heavy: false, splash: false, killed: false, src: 'skill' }]);
  for (const id of ['heal', 'haste', 'shield', 'chain', 'frost', 'rally', 'quake', 'smite', 'resurrect', 'poison', 'cleanse', 'blink', 'hex', 'lance', 'renewal', 'deepfreeze', 'warcry', 'bulwark', 'wolves', 'starfall', 'meteor'])
    run(id, 'spell', (h, f) => { const t = ['heal', 'haste', 'shield', 'rally', 'resurrect', 'cleanse', 'blink', 'renewal', 'warcry', 'bulwark', 'wolves'].includes(id) ? h : f; const ev = [{ kind: 'spell', id, u: t.u, v: t.v }, { kind: 'spellfx', id, to: t.id }]; if (id === 'meteor' || id === 'starfall') ev.push({ kind: 'area', id: 'meteor', by: 0, u: f.u, v: f.v, ms: 700 }); return ev; });
  run('volley', 'area', (h, f) => [{ kind: 'area', id: 'volley', by: h.id, u: f.u, v: f.v, ms: 700 }]);
  for (const id of L.eidolons) { run('eidolon ' + id, 'eidolon', (h, f) => [{ kind: 'eidolon', id, phase: 'call' }]); run('eidolon strike ' + id, 'eidolon', (h, f) => [{ kind: 'eidolon', id, phase: 'done' }, { kind: 'hit', by: 0, to: f.id, dmg: 80, heavy: true, splash: false, killed: false, src: 'skill', eidolon: true }]); }
  for (const what of L.hazards) { run('hazard ' + what, 'hazard', () => [{ kind: 'hazard', id: 1, what, phase: 'tell', tiles: [30, 31, 38, 39], ms: 900 }, { kind: 'hazard', id: 1, what, phase: 'go', tiles: [30, 31, 38, 39], ms: 600 }]); }
  for (const el of ['fire', 'ice', 'lightning', 'light', 'dark', 'forest', 'poison', 'earth', 'wind', 'blood'])
    run('boss ' + el, 'boss', (h, f) => [{ kind: 'bossSig', phase: 'warn', by: f.id, n: 1, key: 'x', name: 'Big Blow', el, tiles: [30, 31, 38, 39], ms: 900, rage: false }, { kind: 'bossSig', phase: 'land', by: f.id, n: 1, key: 'x', name: 'Big Blow', el, tiles: [30, 31, 38, 39], ms: 0, rage: false }]);
  const hit = (o) => (h, f) => [{ kind: 'hit', by: h.id, to: f.id, dmg: 20, heavy: false, splash: false, killed: false, src: 'blow', ...o }];
  run('hit', 'hit', hit({})); run('hit heavy', 'hit', hit({ heavy: true, dmg: 90 })); run('hit kill', 'hit', hit({ killed: true }));
  for (const ail of ['burn', 'poison', 'freeze', 'bleed', 'chill', 'shock', 'stun', 'weak', 'curse', 'silence', 'fear']) { run('ail hit ' + ail, 'ailment', hit({ ail })); run('ail tick ' + ail, 'ailment', hit({ ail, src: 'dot' })); }
  for (const shot of ['arrow', 'bone', 'bullet', 'fire', 'bolt', 'curse', 'leaf']) run('shot ' + shot, 'shot', (h, f) => [{ kind: 'shot', by: h.id, to: f.id, shot, ms: 300 }, { kind: 'hit', by: h.id, to: f.id, dmg: 12, heavy: false, splash: false, killed: false, src: 'blow' }]);
  run('swing', 'hit', (h, f) => [{ kind: 'swing', by: h.id, to: f.id }]);
  run('boom', 'misc', (h, f) => [{ kind: 'boom', u: f.u, v: f.v }]);
  run('arc', 'misc', (h, f) => [{ kind: 'arc', from: h.id, to: f.id }]); run('arc shock', 'misc', (h, f) => [{ kind: 'arc', from: h.id, to: f.id, ail: 'shock' }]);
  run('zone', 'misc', (h, f) => [{ kind: 'zone', u: f.u, v: f.v, ms: 2000 }]); run('zone spikes', 'misc', (h, f) => [{ kind: 'zone', u: f.u, v: f.v, ms: 2000, what: 'spikes' }]);
  run('trap', 'misc', (h, f) => [{ kind: 'trap', u: f.u, v: f.v, ms: 2000 }]); run('wisp', 'misc', (h, f) => [{ kind: 'wisp', by: h.id, u: f.u, v: f.v, ms: 2000 }]);
  run('heal event', 'misc', (h) => [{ kind: 'heal', to: h.id, amount: 20, by: h.id }]);
  run('gaze', 'misc', (h, f) => [{ kind: 'gaze', by: f.id, to: h.id }]); run('song', 'misc', (h) => [{ kind: 'song', by: h.id, ms: 1000 }]); run('banner', 'misc', (h) => [{ kind: 'banner', by: h.id, ms: 1000 }]);
  run('haste', 'misc', (h) => [{ kind: 'haste', to: h.id, ms: 3000 }]); run('burst tier', 'misc', (h) => [{ kind: 'burst', by: h.id, reach: 3, tone: 'tier' }]); run('burst combo', 'misc', (h) => [{ kind: 'burst', by: h.id, reach: 3, tone: 'combo' }]);
  run('promote', 'misc', (h) => [{ kind: 'promote', to: h.id, grade: 2 }]); run('relic', 'misc', (h) => [{ kind: 'relic', to: h.id, id: 'ember' }]);
  run('shatter', 'misc', (h, f) => [{ kind: 'shatter', to: f.id }]); run('dodge', 'misc', (h, f) => [{ kind: 'dodge', to: f.id }]);
  run('immune', 'misc', (h, f) => [{ kind: 'immune', to: f.id, what: 'burn' }]); run('saved', 'misc', (h, f) => [{ kind: 'saved', to: f.id, what: 'burn' }]);
  run('dash', 'misc', (h, f) => [{ kind: 'dash', by: h.id, from: [h.u, h.v], to: [f.u, f.v] }]); run('blink', 'misc', (h, f) => [{ kind: 'blink', by: h.id, from: [h.u, h.v], to: [f.u, f.v] }]);
  for (const what of ['mine', 'fire', 'ice', 'wall', 'spikes']) run('terrain ' + what, 'misc', (h, f) => [{ kind: 'terrain', u: f.u, v: f.v, what, ms: 1500 }]);
  run('slam', 'misc', (h, f) => [{ kind: 'slam', to: f.id, at: [f.u, f.v], what: 'wall' }]); run('wallBreak', 'misc', (h, f) => [{ kind: 'wallBreak', u: f.u, v: f.v }]);
  run('revive', 'misc', (h) => [{ kind: 'revive', by: h.id, to: h.id, hp: 50 }]); run('aura', 'misc', (h) => [{ kind: 'aura', by: h.id, at: null, reach: 2, what: 'aegis', ms: 2000 }]);
  run('mark', 'misc', (h, f) => [{ kind: 'mark', to: f.id, by: h.id, what: 'hunter', ms: 2000 }]);
  return rows;
});
const bad = rows.filter((r) => r.error);
const still = rows.filter((r) => !r.error && r.still > 0);
console.log(rows.length, 'cases;', bad.length, 'errors;', still.length, 'with still parts');
for (const r of still) console.log(r.group.padEnd(8), r.name.padEnd(28), `particles ${r.moving}/${r.particles} move; still arts: ${r.stillArts.join(',')}; hold ${Math.round(100 * r.holdMs / Math.max(1, r.lifeMs))}%`);
for (const r of bad) console.log('ERR', r.group, r.name, r.error);
writeFileSync(process.argv[2] ?? 'out/fx-audit.json', JSON.stringify(rows, null, 1));
await browser.close();
