// FX-CLEAR screenshots (docs/notes/fx-clear.md). After `npm run web`:
//   node tools/fx-clear/shots.mjs before|after      a busy fight at 393x852: a hero burning, one frozen, a foe burning, and two big
//                                                    skill casts and a frost hit on heroes, held still at the same moment
//   node tools/fx-clear/shots.mjs bar               the hero bar of a level-1 party (skill 2 locked) at 393x852, 360x780, 412x915
// The fight is staged on the page (ailments written on the fighters, the effects played through `Fx.show`), then the ticker is
// stopped and one frame drawn, so before and after show the same moment.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = 8681;
const root = 'out/web';
const what = process.argv[2] ?? 'after';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync('docs/samples', { recursive: true });
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
let errors = 0;

async function open(w, h, party, level, dsf = 1) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, hasTouch: false });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  const owned = [...new Set([...party, 'knight', 'archer'])];
  await page.addInitScript(([owned, party, xp]) => {
    // (the page's own randomness seeded, so before and after stage the same fight and the same jitter)
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('fxc-set')) return;
    sessionStorage.setItem('fxc-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, [owned, party, xpAt(level)]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  return { ctx, page };
}

async function armyWave(page, army, wave, party) {
  await page.evaluate(([army, wave, party]) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army }, stage: wave, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, [army, wave, party]);
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById('fight').click());
}

const engaged = (page) => page.waitForFunction(() => {
  const u = window.__game.b.units.filter((x) => x.alive);
  return u.some((h) => h.side === 'hero' && u.some((f) => f.side === 'foe' && Math.max(Math.abs(f.u - h.u), Math.abs(f.v - h.v)) <= 2));
}, null, { timeout: 25000, polling: 200 }).catch(() => {});

const PARTY = ['knight', 'samurai', 'wizard', 'archer', 'shambler'];
if (what === 'bar') {
  for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
    const { ctx, page } = await open(w, h, PARTY, 1, 2);
    await armyWave(page, 'undead', 1, PARTY);
    // (a little way into the fight, so a skill 1 pip can light beside the greyed 2)
    await page.waitForTimeout(4000);
    // (held, with every pool full: pip 1 lit, pip 2 still greyed, never lit while locked)
    await page.evaluate(() => { const g = window.__game; g.sceneHold = 1; for (const u of g.b.units) if (u.side === 'hero') u.charge = 100; g.heroBar.refresh(g.b); });
    await page.waitForTimeout(300);
    const pips = await page.evaluate(() => [...document.querySelectorAll('.hbPips b')].map((b) => `${b.textContent}${b.classList.contains('shut') ? '(shut)' : ''}${b.classList.contains('lit') ? '(lit)' : ''}`).join(' '));
    console.log(`${w}x${h}`, 'pips:', pips);
    const bar = await page.$('.heroBar');
    const box = await bar.boundingBox();
    await page.screenshot({ path: `docs/samples/fx-clear-bar-${w}x${h}.png`, clip: { x: 0, y: box.y - 4, width: w, height: box.height + 8 } });
    await ctx.close();
  }
} else {
  const { ctx, page } = await open(393, 852, PARTY, 30);
  await armyWave(page, 'beasts', 3, PARTY);
  await engaged(page);
  await page.waitForTimeout(600);
  const staged = await page.evaluate(() => {
    const g = window.__game;
    g.sceneHold = 1;
    const b = g.b;
    const heroes = b.units.filter((u) => u.alive && u.side === 'hero');
    const foes = b.units.filter((u) => u.alive && u.side === 'foe');
    const lay = (u, kind) => { u.ail = [...(u.ail ?? []), { kind, until: b.t + 60000, by: u.id }]; if (kind === 'freeze') u.stunUntil = b.t + 60000; };
    lay(heroes[0], 'burn');
    lay(heroes[1], 'freeze');
    lay(heroes[2], 'burn');
    lay(heroes[2], 'poison');
    if (foes[0]) lay(foes[0], 'burn');
    if (foes[1]) lay(foes[1], 'freeze');
    // (the camera close on the heroes)
    const live = heroes.map((u) => g.sprites.get(u.id));
    g.manualCam = true;
    g.tx = g.cx = live.reduce((n, s) => n + s.x, 0) / live.length;
    g.ty = g.cy = live.reduce((n, s) => n + s.y, 0) / live.length - 20;
    g.zoom = g.tzoom = 3;
    return heroes.map((u) => u.def).join(',');
  });
  console.log('heroes', staged);
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const g = window.__game;
    const b = g.b;
    const heroes = b.units.filter((u) => u.alive && u.side === 'hero');
    const foe = b.units.find((u) => u.alive && u.side === 'foe');
    g.app.ticker.stop();
    g.fx.show(b, [
      { kind: 'skill', by: heroes[3].id, name: 'Furnace Blast', ms: 500 },
      { kind: 'skill', by: heroes[4].id, name: 'Shard Storm', ms: 500 },
      { kind: 'hit', by: foe.id, to: heroes[1].id, dmg: 40, heavy: true, splash: false, killed: false, src: 'skill', ail: 'freeze' },
      { kind: 'heal', by: heroes[2].id, to: heroes[0].id, amount: 30 },
    ]);
    // (and two big painted cues laid right on heroes: a frost ward round one, a fire blast on another, as skills play them)
    const at = (u) => g.sprites.get(u.id);
    g.fx.effect({ sheet: 'iceShield', scale: 2.2 }, at(heroes[4]).x, at(heroes[4]).y - 4);
    g.fx.effect({ sheet: 'fireExplosion', scale: 1.6 }, at(heroes[3]).x, at(heroes[3]).y - at(heroes[3]).tall * 0.45);
  });
  // (the fight is held, so its effects are stepped by hand to the same moment, then one frame drawn)
  await page.evaluate((ms) => { const g = window.__game; g.app.ticker.stop(); for (let t = 0; t < ms; t += 20) g.fx.step(20); g.app.render(); }, Number(process.env.WAIT ?? 160));
  // (DEBUG=1: the effects' alphas and the heroes' places, to check the thinning took)
  if (process.env.DEBUG) console.log(await page.evaluate(() => { const g = window.__game; return g.fx.root.children.map((c) => `${c.constructor.name}:${c.alpha.toFixed(2)}@${Math.round(c.x)},${Math.round(c.y)} s${c.scale?.x?.toFixed(2)}`).join(' | ') + ' heroes ' + g.b.units.filter((u) => u.side === 'hero').map((u) => { const s = g.sprites.get(u.id); return `${u.def}@${Math.round(s.x)},${Math.round(s.y)} t${Math.round(s.tall)}`; }).join(' '); }));
  await page.screenshot({ path: `docs/samples/fx-clear-${what}.png` });
  await ctx.close();
}
console.log('page errors', errors);
await browser.close();
srv.close();
