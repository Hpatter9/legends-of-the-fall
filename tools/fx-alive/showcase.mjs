// FX-ALIVE-ART (docs/notes/fx-alive-art.md): each element's living patch laid over the heroes as they stand deployed, for the eye: a 3 x 3
// patch on the middle of the party and a cross beside it, three frames each, at each phone size; with reduced motion and the battery saver.
//
//   npm run web && node tools/fx-alive/showcase.mjs [--sizes 393x852,360x780,412x915] [--mode normal|calm|saver] [--out <dir>]
//
// It writes docs/samples/fx-alive-art/<mode>-<width>.jpg (a row an element) and prints the page's errors. A tool only: it calls the effects'
// own `alivePatch` on the page's game, and the battle is not started.
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { serve } from '../audit/lib.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const SIZES = opt('--sizes', '393x852,360x780,412x915').split(',').map((s) => s.split('x').map(Number));
const MODE = opt('--mode', 'normal');
const OUT = opt('--out', 'docs/samples/fx-alive-art');
const TMP = 'out/fx-alive-art';
const ELEMENTS = ['fire', 'ice', 'light', 'dark', 'poison', 'wind', 'earth', 'forest'];
const COLOURS = { fire: 0xff7a2a, ice: 0x8fd0ff, light: 0xffe9a8, dark: 0xa070ff, poison: 0x7cff6a, wind: 0xb8f0e0, earth: 0xd8a050, forest: 0x7ad860 };
mkdirSync(OUT, { recursive: true });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const party = ['knight', 'archer', 'cleric', 'paladin', 'wizard'];

const srv = serve();
await new Promise((r) => srv.once('listening', r));
const port = srv.address().port;
const browser = await chromium.launch();
const errors = [];
for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: MODE === 'calm' ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w}: ${e.message}`));
  await page.addInitScript(([owned, saver]) => {
    if (sessionStorage.getItem('fa-set')) return;
    sessionStorage.setItem('fa-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, stones: 30, unlocked: owned, party: owned, pulls: 0, dry: 0, dryMythic: 0, chapel: true, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, unlock: {}, stars: {}, xp: {}, bestStage: 30, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1, saver }));
  }, [party, MODE === 'saver']);
  await page.goto(`http://localhost:${port}/`, { timeout: 180000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  await page.evaluate((party) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'orcs' }, tier: 0, stage: 2, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
  }, party);
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__game.autoArrange(true));
  await page.waitForTimeout(500);
  // (before the fight the page does not step the effects: the tool steps them itself, each frame)
  await page.evaluate(() => {
    let last = performance.now();
    const tick = (now) => {
      window.__game.fx.step(Math.min(50, now - last));
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const shots = [];
  for (const el of ELEMENTS) {
    await page.evaluate(([el, colour]) => {
      const g = window.__game;
      const b = g.b;
      g.__alive?.forEach((p) => p.destroy());
      const heroes = b.units.filter((u) => u.side === 'hero' && u.alive);
      const mid = heroes[Math.floor(heroes.length / 2)];
      const tiles = [];
      for (let du = -1; du <= 1; du++) for (let dv = -1; dv <= 1; dv++) tiles.push({ u: mid.u + du, v: mid.v + dv });
      const far = heroes[0];
      const cross = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].map(([du, dv]) => ({ u: far.u + du, v: far.v + dv }));
      const ok = (t) => t.u >= 0 && t.v >= 0 && t.u < (b.board.w ?? 99) && t.v < (b.board.d ?? 99);
      g.__alive = [g.fx.alivePatch(b, tiles.filter(ok), colour, el), g.fx.alivePatch(b, cross.filter(ok), colour, el)];
    }, [el, COLOURS[el]]);
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(260);
      const p = `${TMP}/${el}-${w}-${i}.png`;
      await page.screenshot({ path: p });
      shots.push(p);
    }
  }
  const py = spawnSync('python3', ['-c', `
import sys
from PIL import Image, ImageDraw
paths = sys.argv[2:]
ims = [Image.open(p).convert('RGB') for p in paths]
w, h = ims[0].size
ims = [im.crop((int(w * 0.2), int(h * 0.24), w, int(h * 0.5))) for im in ims]
w, h = ims[0].size
s = 1
tw, th = int(w * s), int(h * s)
out = Image.new('RGB', (tw * 3, th * (len(ims) // 3)), (0, 0, 0))
names = ${JSON.stringify(ELEMENTS)}
d = ImageDraw.Draw(out)
for i, im in enumerate(ims):
    out.paste(im.resize((tw, th)), ((i % 3) * tw, (i // 3) * th))
for r, n in enumerate(names):
    d.text((6, r * th + 4), n, fill=(255, 255, 255))
out.save(sys.argv[1], quality=74)
`, `${OUT}/${MODE}-${w}.jpg`, ...shots], { stdio: 'inherit' });
  if (py.status) console.log('strip failed', w);
  await ctx.close();
}
console.log('page errors:', errors);
await browser.close();
srv.close();
