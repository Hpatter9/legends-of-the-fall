// STORE-READY / STORE-KIT (docs/notes/store-readiness.md): the Google Play listing's pictures from the built game (`npm run web` first), into
// docs/store/: phone screenshots at 1080x1920 (a 360x640 page at 3x: Play takes 9:16 to 2:1, 320 to 3840 px, and asks 1080 px or more of a
// game's screenshots to show them large), with the version line hidden; and the 512x512 icon, checked. The scenes are the ones that sell
// the game: an Eidolon's strike in a big fight, a hero's ultimate, the War Room with an army's weaknesses, the Hall of Heroes, a ten-summon's
// reveal, the Weekly Trial's card, a hero's page and the Nemesis War's Council. Each is written as store-<scene>.png; the eight chosen for
// the listing are copied to phone-1.png to phone-8.png (`PICKS`). Fails on a page error.
//
//   npm run web && node tools/store-ready/shots.mjs [scene ...]
import * as esbuild from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { serve } from '../audit/lib.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const exe = ['/opt/pw-browsers/chromium'].find((p) => existsSync(p));
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/store-ready/saves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/storeSaves.mjs', logLevel: 'error', loader: { '.png': 'empty', '.webp': 'empty' } });
const S = await import('../../out/shots/storeSaves.mjs');

const dir = 'docs/store';
mkdirSync(dir, { recursive: true });
const srv = serve('out/web');
const base = `http://localhost:${srv.address().port}/`;
const errors = [];
const only = process.argv.slice(2);
const want = (n) => !only.length || only.includes(n);
/** The listing's eight, in order (the first two are what a store page shows before a swipe). */
// (each a scene's picture, by its file: the frame of a strike or a reveal that reads best, chosen by eye; the first three are gameplay, as a
//  store shows them before a swipe. The Hall of Heroes, `store-hall.png`, is the ninth, for a swap)
const PICKS = [
  ['battle', 'store-battle-autumn-5200'],
  ['eidolon', 'store-eidolonboss-2600'],
  ['deploy', 'store-deploy'],
  ['summon', 'store-summon-c'],
  ['warroom', 'store-warroom'],
  ['trial', 'store-trial'],
  ['hero', 'store-hero'],
  ['council', 'store-council'],
];
/** A Wednesday morning in Denver: the Weekly Trial's week of Powder and String against the Golem Forge. */
const WEEK = new Date(Date.UTC(2026, 9, 21, 16, 0));

async function open({ party, eidolons } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.setFixedTime(WEEK);
  const m = S.meta();
  if (party) m.party = party;
  if (eidolons) m.eidolons = eidolons;
  await page.addInitScript((m) => {
    // (the same pictures on every run: the page's own randomness from a fixed stream)
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('store-set')) return;
    sessionStorage.setItem('store-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.tips', JSON.stringify(['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay']));
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1, quips: false }));
  }, m);
  await page.goto(base);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 120000 });
  // (the version line is the page's, not the game's: left out of the listing's pictures)
  await page.addStyleTag({ content: '#version { display: none !important; }' });
  await page.waitForTimeout(1500);
  await clear(page);
  return { ctx, page };
}
/** Every card a new moment tells (a tutorial, a tip, an unlock) sent away, so none stands over the picture. */
async function clear(page) {
  for (let i = 0; i < 8; i++) {
    const had = await page.evaluate(() => {
      const b = document.getElementById('tipSkip')?.offsetParent ? document.getElementById('tipSkip') : [...document.querySelectorAll('#tutorialCard .omPrimary, button')].find((x) => /^(Got it|Skip)$/.test(x.textContent?.trim() ?? '') && x.offsetParent);
      b?.click();
      return !!b;
    });
    if (!had) break;
    await page.waitForTimeout(400);
  }
}
const shot = async (page, name) => {
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/store-${name}.png` });
  console.log(`${dir}/store-${name}.png`);
};
/** The fight stepped by hand: the page's ticker stopped and each frame drawn by us, so a strike is caught at the same moment every run. */
const stepper = (page) =>
  page.evaluate(() => {
    const g = window.__game;
    const seen = new Map();
    window.__step = (ms) => {
      for (let t = 0; t < ms; t += 16) {
        g.frame(16, 16);
        for (const a of new Set([...seen.keys(), ...document.getAnimations()])) {
          if (!a.effect?.target?.isConnected || a.playState === 'idle') continue;
          if (a.effect.target.closest?.('.ecLayer.stop')) { if (a.playbackRate !== 0) a.playbackRate = 0; continue; }
          const at = seen.has(a) ? seen.get(a) + 16 : 0;
          seen.set(a, at);
          if (a.playbackRate !== 0) a.playbackRate = 0;
          a.currentTime = at;
        }
      }
      g.app.render();
    };
  });
/** Into a fight of an army's wave with a party at level 70. */
async function fightOf(page, army, stage, party, tier = 0, land = undefined, deployOnly = false) {
  await page.evaluate(([army, stage, party, tier, land]) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, ...(land ? { area: land } : {}), mode: tier ? { kind: 'army', army, tier } : { kind: 'army', army }, stage, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 3, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, [army, stage, party, tier, land]);
  await page.waitForTimeout(1200);
  await clear(page);
  if (deployOnly) return;
  await stepper(page);
  await page.evaluate(() => { document.getElementById('fight').click(); window.__game.watchLoop = () => {}; window.__game.app.ticker.stop(); });
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.__step(64));
    await page.waitForTimeout(200);
    await clear(page);
  }
}

// 1. A big fight, an Eidolon's strike: Askel's fire over the Orc Warband's boss wave
if (want('eidolon')) {
  const party = ['knight', 'paladin', 'archer', 'wizard', 'cleric'];
  const { ctx, page } = await open({ party, eidolons: { horn: 1000, bound: ['askel'], chosen: 'askel', confirmed: true, seen: [] } });
  await fightOf(page, 'golems', 12, party, 2);
  await page.evaluate(() => window.__step(3500));
  await page.evaluate(() => document.querySelector('.ehFight')?.click());
  let at = 0;
  for (const t of [1200, 1800, 2400, 3000, 3600, 4200]) {
    await page.evaluate((ms) => window.__step(ms), t - at);
    at = t;
    await page.waitForTimeout(150);
    await shot(page, `eidolon-${String(t).padStart(4, '0')}`);
  }
  await ctx.close();
}

// 2. A hero's ultimate, mid-fight: the heroes' meters filled, the first one's ultimate fired by hand
if (want('ultimate')) {
  const party = ['samurai', 'knight', 'wizard', 'archer', 'priestess'];
  const { ctx, page } = await open({ party });
  await fightOf(page, 'golems', 12, party, 2);
  await page.evaluate(() => window.__step(3000));
  const fired = await page.evaluate(() => {
    const g = window.__game;
    const hs = g.b.units.filter((u) => u.side === 'hero' && u.owner === undefined && u.alive);
    for (const u of hs) u.charge2 = 0;
    const u = hs.find((h) => h.def === 'samurai') ?? hs[0];
    const tap = () => document.querySelector(`.fhRow[data-unit="${u.id}"]`)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    u.charge2 = 100;
    tap();
    for (let i = 0; i < 1600 && !g.ultm.queue.current && g.b.phase === 'fight'; i++) {
      window.__step(16);
      if (i % 200 === 199 && u.alive) { u.charge2 = 100; tap(); }
    }
    return { moment: !!g.ultm.queue.current, kind: u.def };
  });
  console.log('ultimate', JSON.stringify(fired));
  let at = 0;
  for (const t of [100, 200, 300, 450, 600, 1200, 1800, 2400]) {
    await page.evaluate((ms) => window.__step(ms), t - at);
    at = t;
    await page.waitForTimeout(150);
    await shot(page, `ultimate-${String(t).padStart(4, '0')}`);
  }
  await ctx.close();
}

// 2b. A clear mid-fight frame: five heroes and a wave of foes on a scenic land, numbers and skills going off, the HUD rows in sight (the
//     listing's first picture: gameplay at a glance). Each land a few moments in, to choose from.
if (want('battle')) {
  const party = ['knight', 'samurai', 'wizard', 'archer', 'priestess'];
  for (const [army, land, stage, tier] of [['beasts', 'autumn', 6, 3], ['yokai', 'shrine', 6, 3], ['wildwood', 'forest', 6, 3]]) {
    const { ctx, page } = await open({ party });
    await fightOf(page, army, stage, party, tier, land);
    let at = 0;
    for (const t of [1600, 2400, 3200, 4000, 5200]) {
      await page.evaluate((ms) => window.__step(ms), t - at);
      at = t;
      await page.waitForTimeout(150);
      await shot(page, `battle-${land}-${String(t).padStart(4, '0')}`);
    }
    await ctx.close();
  }
}

// 2c. An Eidolon's strike on a boss's wave, caught at its pillar and explosion, before the fire fills the screen
if (want('eidolonboss')) {
  const party = ['knight', 'paladin', 'archer', 'wizard', 'cleric'];
  const { ctx, page } = await open({ party, eidolons: { horn: 1000, bound: ['askel'], chosen: 'askel', confirmed: true, seen: [] } });
  await fightOf(page, 'golems', 15, party, 2, 'forge');
  await page.evaluate(() => window.__step(3500));
  await page.evaluate(() => document.querySelector('.ehFight')?.click());
  let at = 0;
  for (const t of [2000, 2200, 2400, 2600, 2800, 3000, 3200]) {
    await page.evaluate((ms) => window.__step(ms), t - at);
    at = t;
    await page.waitForTimeout(150);
    await shot(page, `eidolonboss-${String(t).padStart(4, '0')}`);
  }
  await ctx.close();
}

// 2d. The deploy screen: the heroes placed, the trait chips and the army's weakness chip
if (want('deploy')) {
  const party = ['knight', 'samurai', 'wizard', 'archer', 'priestess'];
  const { ctx, page } = await open({ party });
  await fightOf(page, 'golems', 6, party, 1, 'crystal', true);
  await page.waitForTimeout(800);
  await shot(page, 'deploy');
  await ctx.close();
}

// 3. The War Room: an army's card, its weaknesses and resistances
if (want('warroom')) {
  const { ctx, page } = await open();
  await page.evaluate(() => window.__game.home.openArmies('golems'));
  await page.waitForTimeout(1800);
  await clear(page);
  await shot(page, 'warroom');
  await ctx.close();
}

// 4. The Hall of Heroes, from the tavern's door
if (want('hall')) {
  const { ctx, page } = await open();
  await page.evaluate(() => window.__game.home.show('heroes'));
  await page.waitForTimeout(1500);
  await clear(page);
  await page.evaluate(() => document.querySelector('.hallDoor')?.scrollIntoView({ block: 'center' }));
  await page.click('.hallDoor');
  await page.waitForTimeout(1200);
  await clear(page);
  await shot(page, 'hall');
  await ctx.close();
}

// 5. A ten-summon's reveal (the lucky roll forced, so a new hero arrives among the shards)
if (want('summon')) {
  const { ctx, page } = await open();
  await page.evaluate(() => window.__game.home.show('recruit'));
  await page.waitForTimeout(1500);
  await clear(page);
  await page.evaluate(() => { window.__forceLucky = true; });
  await page.locator('.hlBar button').nth(1).click();
  for (const [t, n] of [[2600, 'a'], [1800, 'b'], [2500, 'c']]) {
    await page.waitForTimeout(t);
    await shot(page, `summon-${n}`);
  }
  await ctx.close();
}

// 6. The Weekly Trial's card
if (want('trial')) {
  const { ctx, page } = await open();
  await page.click('#hmTrial');
  await page.waitForTimeout(1200);
  await clear(page);
  await shot(page, 'trial');
  await ctx.close();
}

// 7. A hero's page, from the roster
if (want('hero')) {
  const { ctx, page } = await open();
  await page.evaluate(() => window.__game.home.show('heroes'));
  await page.waitForTimeout(1500);
  await clear(page);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /All heroes/.test(b.textContent ?? '') && b.offsetParent)?.click());
  await page.waitForTimeout(1200);
  await clear(page);
  await page.evaluate(() => document.querySelector('.hcard')?.click());
  await page.waitForTimeout(1500);
  await clear(page);
  await shot(page, 'hero');
  await ctx.close();
}

// 8. The Nemesis War's Council
if (want('council')) {
  const { ctx, page } = await open();
  await page.click('#hmCouncil');
  await page.waitForTimeout(1500);
  await clear(page);
  await shot(page, 'council');
  await ctx.close();
}

// 9. The camp, the Battle tab (for comparison)
if (want('camp')) {
  const { ctx, page } = await open();
  await shot(page, 'camp');
  await ctx.close();
}

// The icon: the 512x512 the listing takes, checked (its size, and that it is square and opaque, as Play asks: a 32-bit PNG, no alpha)
copyFileSync('src/art/icon-512.png', `${dir}/icon-512.png`);
const icon = await browser.newPage();
const info = await icon.evaluate(async (src) => {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let clear = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 255) clear++;
  return { w: img.width, h: img.height, clear };
}, `data:image/png;base64,${(await import('node:fs')).readFileSync('src/art/icon-512.png').toString('base64')}`);
console.log(`icon-512.png: ${info.w}x${info.h}, ${info.clear} pixels not fully opaque${info.w === 512 && info.h === 512 && !info.clear ? ' (ready for Play)' : ' (Play asks for 512x512 with no transparency)'}`);

// The listing's eight, numbered (the older names, phone-1-battle.png and so on, are replaced)
if (!only.length) {
  for (const f of readdirSync(dir)) if (/^phone-\d/.test(f)) rmSync(`${dir}/${f}`);
  PICKS.forEach(([n, from], i) => copyFileSync(`${dir}/${from}.png`, `${dir}/phone-${i + 1}-${n}.png`));
}
await browser.close();
srv.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
