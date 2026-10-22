// Shared bits of the phone audit: a static server for out/web and a Chromium with the save the audit plays from.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', map: 'application/json' };
export function serve(root = 'out/web', port = 0) {
  const srv = createServer((q, r) => {
    const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
    if (!existsSync(p)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
    r.end(readFileSync(p));
  }).listen(port);
  return srv;
}
export const launch = () => chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
export const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'peasant', 'ninjaMonk', 'wanderer', 'lightningMage', 'kitsune', 'karasu', 'yamabushi', 'werewolf', 'minotaur', 'satyr', 'gorgon', 'samuraiCommander', 'paladin', 'cleric', 'druid', 'barbarian', 'ranger', 'warlock', 'illusionist', 'gunslinger', 'shambler', 'rifleBot', 'mercenary', 'mummy', 'buccaneer', 'wolfBard', 'beastmaster', 'kraken', 'lancer', 'reaper', 'timeWitch', 'arcBlade', 'dreadPirate', 'siegeBot', 'priestess', 'dragoon', 'juggernaut', 'sage', 'demonSwordsman', 'tyrant'];
/** A save with every hero, a maxed castle and plenty of crowns; the tips off. */
export function saveScript(extra = {}) {
  return ([heroes, extra]) => {
    try {
      localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 4000, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 5, barracks: 5, armoury: 5, mageTower: 4, stable: 5, library: 5 }, shards: {}, stars: {}, xp: {}, bestStage: 30, tower: 0, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], ...extra }));
      localStorage.setItem('lotf-tips-off', '1');
    } catch {}
  };
}
