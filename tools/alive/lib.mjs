// Shared bits of the ALIVE samples: a static server for out/web, a Chromium, and the save the samples play from.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = createRequire('/opt/node-tools/node_modules/')('playwright'); }
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css', map: 'application/json' };
export function serve(root = process.env.ROOT ?? 'out/web', port = 0) {
  return createServer((q, r) => {
    const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
    if (!existsSync(p)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
    r.end(readFileSync(p));
  }).listen(port);
}
export const launch = () => pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
export const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'peasant', 'ninjaMonk', 'wanderer', 'lightningMage', 'kitsune'];
/** A save with ten heroes, a built castle and the tips off. */
export function saveScript() {
  return ([heroes]) => {
    try {
      localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 4000, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 5, barracks: 5, armoury: 5, mageTower: 4, stable: 5, library: 5 }, shards: {}, stars: {}, xp: {}, bestStage: 30, tower: 0, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], scenes: ['opening'], opened: ['castle', 'calamity', 'tower'] }));
      localStorage.setItem('lotf-tips-off', '1');
      localStorage.setItem('legends.tips', JSON.stringify(['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay']));
    } catch {}
  };
}
/** Skip any film and close any arrival card in the way. */
export async function clearWay(page) {
  for (let i = 0; i < 15; i++) {
    const n = await page.evaluate(() => {
      let did = 0;
      const b = [...document.querySelectorAll('#cutscene button')].find((b) => /Skip|Continue/.test(b.textContent));
      if (b && !document.getElementById('cutscene').hidden) { b.click(); did++; }
      const c = [...document.querySelectorAll('.rvCard button, .unlock button')].find((b) => /Continue/.test(b.textContent));
      if (c) { c.click(); did++; }
      return did + (window.__game?.sceneHold ?? 0);
    });
    if (!n) return;
    await page.waitForTimeout(600);
  }
}
