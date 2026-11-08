// The tactics' screenshots (docs/notes/tactics.md), on the BATTLE-HUD shots' set-up. After `npm run web`:
//   node tools/tactics/shots.mjs
// Scenes (TACTICS-OVERVIEW): deploy (the Formation button at the side of the board), forms (its sheet open), arranged (set out in a Shield
// Wall), fight (the fight's start: the tactic button under Auto), cycled (a tap: Hold, its word showing), mid (mid-fight, a second tap: Charge),
// at 393x852, 360x780 and 412x915. The save has the first four armies cleared, so Auto place and the formations are open.
// Writes docs/samples/tactics-overview/tactics-<scene>-<w>.png and prints the button's box and the word.
//
// Scenes: deploy, fight (mid-fight, one hero's ultimate full), sheet (a skill's sheet open, the fight paused), ult (the ultimate's sheet), cast (a
// cast moment frozen part way), spells (a king's spell armed on its orb), daily, calamity (ten heroes), stand (the Last Stand's eight), kits (a
// party of MP casters, a blood-cost hero, a monster hero and a summoner). Each at 393x852, 360x780 and 412x915 (`SIZES=393` for one size).
// Writes docs/samples/<prefix>-<scene>-<w>.png (prefix `battle-hud-final`) and prints the board's room (the panel's top, the top bar's bottom).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = Number(process.env.PORT ?? 8653);
const root = 'out/web';
const args = process.argv.slice(2);
// (the ultimate's moment, ULT-CUTIN: `node tools/battle-hud/shots.mjs ult-cutin slash name dim linger short`)
const ULT_SCENES = ['slash', 'name', 'dim', 'linger', 'short'];
const prefix = 'tactics';
const want = args.length ? args : SCENES();
function SCENES() { return ['deploy', 'forms', 'arranged', 'fight', 'cycled', 'mid']; }
const SIZES = (process.env.SIZES ?? '393,360,412').split(',').map((w) => ({ 393: [393, 852], 360: [360, 780], 412: [412, 915] })[w]);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const OUT = 'docs/samples/tactics-overview';
mkdirSync(OUT, { recursive: true });
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
let errors = 0;
const PARTY = ['knight', 'cleric', 'wizard', 'archer', 'samurai'];
// (MP casters (the Lightning Mage, the Warlock), a blood-cost hero (the Barbarian), a monster hero (the Werewolf) and a summoner (the Beastmaster))
const KITS = ['barbarian', 'lightningMage', 'warlock', 'werewolf', 'beastmaster'];
const STAND = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'ranger'];
const ALL = [...new Set([...PARTY, ...KITS, ...STAND])];

async function open(w, h, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([owned, party, xp, extra]) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('hud-set')) return;
    sessionStorage.setItem('hud-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'], ...extra }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, [ALL, PARTY, xpAt(32), extra]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  return { ctx, page };
}

async function army(page) {
  await page.evaluate((party) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'ogres' }, stage: 3, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, ['knight', 'minotaur', 'kunoichi', 'archer', 'cleric']);
  await page.waitForTimeout(700);
}

for (const [w, h] of SIZES) {
  for (const scene of want) {
    const cleared = { waves: 15, best: 15, won: 15, clears: 1, stars: {} };
    const { ctx, page } = await open(w, h, { armies: { orcs: cleared, undead: cleared, beasts: cleared, wildwood: cleared }, featuresTold: ['autoMerge', 'autoPlace'] });
    await army(page);
    if (scene === 'arranged' || scene === 'forms') {
      await page.evaluate(() => document.getElementById('formBtn').click());
      await page.waitForTimeout(300);
      if (scene === 'arranged') {
        await page.evaluate(() => document.querySelector('#tacticSheet .tacForm').click());
        await page.waitForTimeout(500);
      }
    }
    if (scene === 'fight' || scene === 'cycled' || scene === 'mid') {
      await page.evaluate(() => document.getElementById('fight').click());
      await page.waitForTimeout(1600);
      if (scene !== 'fight') {
        await page.tap('#tacticBtn');
        await page.waitForTimeout(scene === 'mid' ? 4000 : 300);
      }
      if (scene === 'mid') {
        await page.tap('#tacticBtn');
        await page.waitForTimeout(300);
      }
      const info = await page.evaluate(() => {
        const r = document.getElementById('tacticBtn').getBoundingClientRect();
        const a = document.querySelector('#hudSpells .fhAuto').getBoundingClientRect();
        return { btn: [r.left, r.top, r.width, r.height].map(Math.round), auto: [a.left, a.top, a.width, a.height].map(Math.round), word: document.getElementById('tacticWord').textContent, tactic: window.__game.b.tactic?.kind, saved: JSON.stringify(window.__game.meta.tactics ?? {}) };
      });
      console.log(`${w} ${scene}:`, JSON.stringify(info));
    }
    if (scene === 'deploy') console.log(`${w} deploy: Formation "${await page.evaluate(() => document.getElementById('formBtn').textContent)}", old chip ${await page.evaluate(() => !!document.getElementById('tactic'))}`);
    await page.screenshot({ path: `${OUT}/${prefix}-${scene}-${w}.png` });
    await ctx.close();
  }
}
await browser.close();
srv.close();
console.log(errors ? `${errors} page errors` : 'no page errors');
