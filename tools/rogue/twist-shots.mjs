// Screenshots for the tower's floor twists and new mystery events, upright at 393x852 and 360x780:
//   node tools/rogue/twist-shots.mjs <web dir>
// Writes docs/samples/tower-twists-<scene>[-<w>].png: the map with twist badges (and a picked node's info), a twist banner on the deploy
// screen (a curse, a blessing and a mixed one), and two of the new events (the black altar and the gambling imp).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import * as esbuild from 'esbuild';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [root = 'out/web'] = process.argv.slice(2);
// (the sim's event draw, bundled here so the script can find the stage that draws a wanted card)
const built = await esbuild.build({ stdin: { contents: "export { drawEvent, TOWER_EVENT_KINDS } from './src/sim/events';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node', loader: { '.png': 'empty' }, logLevel: 'warning' });
const { drawEvent, TOWER_EVENT_KINDS } = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8138);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric'];
for (const [w, h] of [[393, 852], [360, 780]]) {
  const suffix = w === 393 ? '' : `-${w}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  const shot = (name) => page.screenshot({ path: `docs/samples/tower-twists-${name}${suffix}.png` });
  const load = async (seed) => {
    await page.goto('http://localhost:8138/?x=' + Math.random());
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(([heroes, seed]) => {
      localStorage.setItem('legends.meta', JSON.stringify({ seed, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
      localStorage.setItem('lotf-tips-off', '1');
    }, [HEROES, seed]);
    await page.goto('http://localhost:8138/');
    await page.waitForTimeout(2200);
    await page.evaluate(() => document.getElementById('tipSkip')?.click());
    await page.evaluate(() => { for (const b of document.querySelectorAll('.hmCard')) if (b.textContent.includes('Tower')) b.click(); });
    await page.waitForTimeout(900);
  };
  await load(7);
  // 1. the map: scroll to where the twisted nodes are thickest, and pick one for its info line
  await page.evaluate(() => {
    const g = window.__game;
    g.run.gold = 188;
    g.run.relics = ['banner', 'luckyCoin'];
    const t = g.run.tower;
    // (a curse, a blessing and a mixed twist on the first floors, so all three colours show)
    const first = t.map.filter((n) => n.row === 0);
    first.forEach((n, i) => { n.twist = ['cursed', 'treasure', 'lava', 'fog'][i % 4]; });
    g.towerView.open(g.run);
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const g = window.__game; const i = g.run.tower.map.findIndex((n) => n.row === 0 && n.twist); document.querySelectorAll('.rtNode')[i].click(); });
  await page.waitForTimeout(200);
  await shot('map');
  // 2. the deploy banner, for a curse, a blessing and a mixed twist
  for (const [name, twist] of [['banner-curse', 'ambush'], ['banner-blessing', 'holy'], ['banner-mixed', 'bloodmoon'], ['banner-narrow', 'narrow']]) {
    if (name !== 'banner-curse' && w !== 393) continue;
    await load(7);
    const id = await page.evaluate((twist) => {
      const g = window.__game;
      const n = g.run.tower.map.find((x) => x.row === 0);
      n.twist = twist;
      g.towerView.open(g.run);
      g.towerView.picked = n.id;
      g.towerView.go();
      return n.id;
    }, twist);
    await page.waitForTimeout(700);
    await page.evaluate(() => { const g = window.__game; for (const h of g.run.roster.slice(0, 5)) { if (g.b.units.some((u) => u.tag === h.id)) continue; const t = g.freeTile(); if (t) g.put(String(h.id), t); } });
    await page.waitForTimeout(400);
    await shot(name);
  }
  // 3. two of the new events: the stage is chosen (by drawing the card here, off the page's own run) so the mystery floor draws the one wanted
  for (const [name, title] of [['event-altar', 'A black altar'], ['event-imp', 'A gambling imp']]) {
    await load(7);
    await page.evaluate(() => { const g = window.__game; g.run.gold = 240; g.run.roster.push({ id: 90, kind: 'wizard', grade: 1 }); g.run.relics = ['banner']; });
    const run = await page.evaluate(() => JSON.parse(JSON.stringify(window.__game.run)));
    let stage = 3;
    while (stage < 600 && drawEvent(run, stage, TOWER_EVENT_KINDS).title !== title) stage++;
    await page.evaluate((stage) => {
      const g = window.__game;
      g.run.stage = stage;
      const n = g.run.tower.map.find((x) => x.row === 0);
      n.kind = 'mystery';
      g.towerView.open(g.run);
      g.towerView.picked = n.id;
      g.towerView.go();
    }, stage);
    // (the party's marker walks to the node first; the card opens when it arrives)
    await page.waitForFunction(() => !document.getElementById('events').hidden, null, { timeout: 15000 });
    await page.waitForTimeout(400);
    console.log(name, 'stage', stage, await page.evaluate(() => document.querySelector('#events .evcard h2')?.textContent));
    await shot(name);
  }
  await ctx.close();
}
await browser.close();
srv.close();
