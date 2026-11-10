// DUEL-SHOW frames (docs/notes/duel-show.md): a duel's whole show, frame by frame on a clock of our own (the Pixi ticker stopped, the page's
// frame stepped by hand, the CSS animations moved with it), at the three upright sizes and once with reduced motion. Phase 4's saves: an
// Undead run on Hask's wave, Hask calling Natsu out; Accept; then:
//   walk-<ms>   the walk-in (the ring empty, the two walking in from their sides, the beat with the names),
//   fight-<ms>  the fight with the crowd round the ring and the one tug-of-war bar,
//   end-<ms>    Hask brought low by hand, the party erupting, the wave slumping, before the outcome.
// Checks: no page error; the crowd stood (the sprites outside the battle); the bar's two ends and meeting point; the walk-in held the fight
// (no tick before it ended); a tap skips it. Exits 1 on a failed check.
//   npm run web && node tools/duel-show/shots.mjs [out dir]     (SIZES=393 for one size)
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch } from '../calmap/lib.mjs';
const OUT = process.argv[2] ?? 'docs/samples/duel-show';
mkdirSync(OUT, { recursive: true });
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/nemesis/saves4.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/nemsaves4.mjs', logLevel: 'error', loader: { '.png': 'empty' } });
const S = await import('../../out/shots/nemsaves4.mjs');
const TIPS = ['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay'];
const ALL = [[393, 852], [360, 780], [412, 915]];
const SIZES = process.env.SIZES ? ALL.filter(([w]) => process.env.SIZES.split(',').includes(String(w))) : ALL;
const srv = serve();
const browser = await launch();
let bad = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) bad++; };

async function open(w, h, motion = 'no-preference') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: motion });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  await page.addInitScript(() => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
  });
  await page.goto('http://localhost:8139/?x=1');
  await page.evaluate(([m, r, tips]) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('legends.tips', JSON.stringify(tips));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
    localStorage.setItem('legends.run', JSON.stringify(r));
  }, [S.meta(), S.run(5), TIPS]);
  await page.goto('http://localhost:8139/');
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess { display: none !important; }' });
  return { ctx, page, errors };
}

/** Carry on the run, place the five, play the taunts through, open the challenge's card and Accept; then the page's clock is ours. */
async function accept(page) {
  await page.click('.hmCont');
  await page.waitForFunction(() => document.querySelector('.tcLayer:not([hidden]) .tcCut'), null, { timeout: 15000 });
  await page.evaluate(() => window.__game.autoArrange(true));
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__game.taunts.end());
    await page.waitForTimeout(200);
    if (await page.$('#duelCard')) break;
  }
  await page.waitForSelector('#duelCard', { timeout: 8000 });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const g = window.__game;
    g.app.ticker.stop();
    const seen = new Map();
    window.__step = (ms) => {
      for (let t = 0; t < ms; t += 16) {
        g.frame(16, 16);
        for (const a of document.getAnimations()) {
          const at = (seen.get(a) ?? 0) + 16;
          seen.set(a, at);
          if (a.playbackRate !== 0) a.playbackRate = 0;
          a.currentTime = at;
        }
      }
      g.app.render();
    };
    document.querySelector('#duelCard .omPrimary').click();
  });
}

const state = (page) => page.evaluate(() => {
  const g = window.__game;
  const b = g.b;
  const bar = document.querySelector('#bossBar .dsTug');
  const r = (e) => { if (!e) return null; const x = e.getBoundingClientRect(); return [Math.round(x.left), Math.round(x.top), Math.round(x.right), Math.round(x.bottom)]; };
  return {
    t: b.t, phase: b.phase, holding: g.duelShow.holding, crowd: g.duelShow.crowd.length, units: b.units.length,
    bar: r(bar), faces: [...document.querySelectorAll('#bossBar .dsFace canvas')].length, green: bar?.querySelector('.dsGreen')?.style.width,
    W: innerWidth, veil: !!document.querySelector('.dsVeil'),
  };
});

const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` });

for (const [w, h] of SIZES) {
  const { ctx, page, errors } = await open(w, h);
  await accept(page);
  const s0 = await state(page);
  console.log(w, JSON.stringify(s0));
  check(s0.holding && s0.t === 0, `${w}: the walk-in holds the fight before its first tick`);
  check(s0.crowd >= 4, `${w}: the crowd stands round the ring (${s0.crowd})`);
  check(s0.units === 2, `${w}: only the two are in the battle`);
  let t = 0;
  for (const ms of [0, 450, 900, 1400, 1900, 2300]) {
    await page.evaluate((d) => window.__step(d), ms - t);
    t = ms;
    await shot(page, `walk-${ms}-${w}`);
  }
  await page.evaluate((d) => window.__step(d), 3000 - t);
  const s1 = await state(page);
  check(!s1.holding && s1.t > 0 && !s1.veil, `${w}: the fight begins after the walk-in (t ${s1.t})`);
  check(!!s1.bar && s1.faces === 2 && s1.bar[0] >= 0 && s1.bar[2] <= w, `${w}: one bar with two faces, on the screen ${JSON.stringify(s1.bar)}`);
  // (Hask given more health for the pictures, so the level-30 Natsu does not end it first)
  await page.evaluate(() => {
    const b = window.__game.b;
    const n = b.units.find((u) => u.id === b.duel.nem);
    n.maxHp *= 6;
    n.hp = Math.round(n.maxHp * 0.7);
  });
  for (const ms of [1500, 4000]) {
    await page.evaluate((d) => window.__step(d), ms);
    await shot(page, `fight-${ms}-${w}`);
  }
  // (UI-ART-WIRE: a big swing's flare over the knot, the bar's swing set by hand and caught 150 ms in)
  await page.evaluate(() => { const t = document.querySelector('#bossBar .dsTug'); t?.classList.remove('swing'); void t?.offsetWidth; t?.classList.add('swing'); window.__step(150); });
  await shot(page, `swing-${w}`);
  const s2 = await state(page);
  console.log(w, 'fight', JSON.stringify(s2));
  check(parseFloat(s2.green) > 0 && parseFloat(s2.green) < 100, `${w}: the bar's meeting point moves (green ${s2.green})`);
  // (the end: Hask brought low by hand; the party erupts, the wave slumps, the outcome waits for it)
  await page.evaluate(() => {
    const b = window.__game.b;
    const n = b.units.find((u) => u.id === b.duel.nem);
    n.hp = 1;
  });
  let n = 0;
  while (n++ < 400 && !(await page.evaluate(() => window.__game.b.duel.ended))) await page.evaluate(() => window.__step(48));
  for (const ms of [200, 900, 1600]) {
    await page.evaluate((d) => window.__step(d), ms === 200 ? 200 : 700);
    await shot(page, `end-${ms}-${w}`);
  }
  const ending = await page.evaluate(() => window.__game.duelShow.ending);
  check(ending, `${w}: the end's show still plays before the outcome`);
  await page.evaluate(() => window.__step(4000));
  await shot(page, `after-${w}`);
  check(!errors.length, `${w}: no page errors`);
  await ctx.close();
}

// (reduced motion: no walk, the two stand in place; and a tap skips the walk-in)
{
  const [w, h] = SIZES[0];
  const { ctx, page, errors } = await open(w, h, 'reduce');
  await accept(page);
  await page.evaluate(() => window.__step(300));
  await shot(page, `still-300-${w}`);
  const s = await state(page);
  check(s.holding, `${w} reduced: a short beat holds the fight`);
  await page.evaluate(() => window.__step(1000));
  check(!(await state(page)).holding, `${w} reduced: then the fight begins`);
  await ctx.close();
  const two = await open(w, h);
  await accept(two.page);
  await two.page.evaluate(() => window.__step(400));
  await two.page.evaluate(() => document.querySelector('.dsVeil').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  await two.page.evaluate(() => window.__step(300));
  const k = await state(two.page);
  check(!k.holding && k.t > 0, `${w}: a tap skips the walk-in`);
  check(!errors.length && !two.errors.length, `${w}: no page errors`);
  await two.ctx.close();
}
await browser.close();
srv.close();
console.log(bad ? `${bad} failed` : 'all checks passed');
process.exit(bad ? 1 : 0);
