// BATTLE-FEEL frame strips (docs/notes/battle-feel.md): plays army waves in the page at an upright phone size and takes a frame every
// `EVERY` ms of fight time, then lays them out as one strip per fight (docs/samples/battle-feel/<name>-<w>.jpg). The page's own
// fight: the same sim, the same effects; Auto spells and Auto ultimates on, as most players fight.
//
//   npm run web && node tools/battle-feel/frames.mjs [--sizes 393x852] [--only orcs-1,undead-20] [--every 400] [--frames 12]
//
// Each fight's log (hits, casts, deaths a second, the length) is printed, so a strip can be read against the numbers.
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { serve } from '../audit/lib.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const SIZES = opt('--sizes', '393x852').split(',').map((s) => s.split('x').map(Number));
const EVERY = Number(opt('--every', '400'));
const FRAMES = Number(opt('--frames', '12'));
const OUT = opt('--out', 'docs/samples/battle-feel');
const TMP = 'out/battle-feel-frames';
mkdirSync(OUT, { recursive: true });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

// A range of parties, levels, armies, tiers and speeds.
const FIGHTS = [
  { name: 'orcs-starters-lv1', army: 'orcs', stage: 2, level: 1, party: ['knight', 'archer', 'cleric', 'peasant', 'wizard'], speed: 1 },
  { name: 'undead-mixed-lv12', army: 'undead', stage: 4, level: 12, party: ['paladin', 'ranger', 'warlock', 'samurai', 'priestess'], speed: 1 },
  { name: 'beasts-melee-lv20', army: 'beasts', stage: 6, level: 20, party: ['barbarian', 'werewolf', 'minotaur', 'kunoichi', 'juggernaut'], speed: 2 },
  { name: 'ogres-casters-lv32', army: 'ogres', stage: 5, level: 32, party: ['knight', 'lightningMage', 'wizard', 'sage', 'cleric'], speed: 2 },
  { name: 'infernal-ults-lv40', army: 'infernal', stage: 8, level: 40, party: ['samurai', 'reaper', 'kraken', 'druid', 'gunslinger'], speed: 3, tier: 1 },
  { name: 'yokai-boss-lv46', army: 'yokai', stage: 15, level: 46, party: ['paladin', 'dragoon', 'demonSwordsman', 'illusionist', 'cleric'], speed: 1 },
  // (round 2: the daily's waves, a plain one and the boss of the day, on a fixed date)
  { name: 'daily-w4-lv10', mode: { kind: 'daily', date: 20261110, practice: true }, stage: 4, level: 10, party: ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'], speed: 1 },
  { name: 'daily-boss-lv20', mode: { kind: 'daily', date: 20261110, practice: true }, stage: 10, level: 20, party: ['knight', 'cleric', 'kunoichi', 'archer', 'wizard'], speed: 2 },
];
const ONLY = opt('--only', '').split(',').filter(Boolean);
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));

const srv = serve();
const port = srv.address().port;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let errors = 0;

for (const [w, h] of SIZES) {
  for (const f of FIGHTS) {
    if (ONLY.length && !ONLY.includes(f.name)) continue;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
    await page.addInitScript(([owned, xp, speed]) => {
      let z = 0x2545f491;
      Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
      if (sessionStorage.getItem('bf-set')) return;
      sessionStorage.setItem('bf-set', '1');
      localStorage.clear();
      localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, stones: 30, unlocked: owned, party: owned.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, chapel: true, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, unlock: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 30, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'] }));
      localStorage.setItem('lotf-tips-off', '1');
      localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed, autoUlt: true, autoSpells: true }));
    }, [f.party, xpAt(f.level), f.speed]);
    await page.goto(`http://localhost:${port}/`, { timeout: 180000 });
    await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.getElementById('tipSkip')?.click());
    await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
    await page.evaluate((f) => {
      const g = window.__game;
      const r = JSON.parse(JSON.stringify(g.run));
      Object.assign(r, { seed: 4242, mode: f.mode ?? { kind: 'army', army: f.army }, tier: f.tier ?? 0, stage: f.stage, over: false, cleared: false, gold: 0, event: undefined, roster: f.party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
      document.getElementById('home').hidden = true;
      g.startRun(r);
    }, f);
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__game.autoArrange(true));
    await page.waitForTimeout(400);
    // (a log of the fight from the page's own battle, read each frame)
    await page.evaluate(() => {
      const g = window.__game;
      window.__feel = { casts: 0, hits: 0, kills: 0 };
    });
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(800);
    const shots = [];
    let lastT = -1;
    for (let i = 0; i < FRAMES; i++) {
      // (wait for the fight's clock to move on `EVERY` ms, however fast it runs; a boss card or a moment holds it)
      const t0 = Date.now();
      while (Date.now() - t0 < 8000) {
        const t = await page.evaluate(() => window.__game.b?.t ?? 0);
        if (t >= lastT + EVERY) { lastT = t; break; }
        await page.waitForTimeout(60);
      }
      const p = `${TMP}/${f.name}-${w}-${String(i).padStart(2, '0')}.png`;
      await page.screenshot({ path: p });
      shots.push(p);
      const phase = await page.evaluate(() => window.__game.b?.phase);
      if (phase && phase !== 'fight') break;
    }
    const log = await page.evaluate(() => {
      const b = window.__game.b;
      return { t: b.t, phase: b.phase, heroes: b.units.filter((u) => u.side === 'hero').map((u) => `${u.def} ${u.alive ? Math.round((100 * u.hp) / u.maxHp) + '%' : 'down'}`), foesLeft: b.units.filter((u) => u.side === 'foe' && u.alive).length };
    });
    console.log(w, f.name, JSON.stringify(log));
    // (lay the frames out four across)
    const py = spawnSync('python3', ['-c', `
import sys
from PIL import Image
paths = sys.argv[2:]
ims = [Image.open(p).convert('RGB') for p in paths]
w, h = ims[0].size
# (the board only: under the top bar and above the hero rows)
ims = [im.crop((0, int(h * 0.1), w, int(h * 0.7))) for im in ims]
w, h = ims[0].size
s = 0.75
tw, th = int(w * s), int(h * s)
cols = 4
rows = (len(ims) + cols - 1) // cols
out = Image.new('RGB', (tw * cols, th * rows), (0, 0, 0))
for i, im in enumerate(ims):
    out.paste(im.resize((tw, th)), ((i % cols) * tw, (i // cols) * th))
out.save(sys.argv[1], quality=72)
`, `${OUT}/${f.name}-${w}.jpg`, ...shots], { stdio: 'inherit' });
    if (py.status) console.log('strip failed', f.name);
    await ctx.close();
  }
}
console.log('page errors:', errors);
await browser.close();
srv.close();
