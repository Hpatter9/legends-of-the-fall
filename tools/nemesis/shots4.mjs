// Screenshots of the Nemesis War, phase 4: node tools/nemesis/shots4.mjs  (builds with `npm run web` first; SIZES=393,360,412 by default all three)
// Writes docs/samples/nemesis-4/<scene>-<w>.png: the challenge's cut-in at the deploy (Hask calls Natsu out, Natsu answers), the challenge's
// card (named, and an open one with the squad's strip), the duel's fight in its ring with the nemesis's bar and its seconds, the wave card
// after a duel won, the cut-in under reduced motion, and the Council's News and Fallen telling of duels.
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch, SIZES } from '../calmap/lib.mjs';
const OUT = 'docs/samples/nemesis-4';
mkdirSync(OUT, { recursive: true });
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/nemesis/saves4.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/nemsaves4.mjs', logLevel: 'error', loader: { '.png': 'empty' } });
const S = await import('../../out/shots/nemsaves4.mjs');
const TIPS = ['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay'];
const srv = serve();
const browser = await launch();
const sizes = process.env.SIZES ? SIZES.filter(([w]) => process.env.SIZES.split(',').includes(String(w))) : SIZES;
const only = process.argv.slice(2);
const want = (name) => !only.length || only.includes(name);

async function open(w, h, run, settings = { cinematics: false }, motion = 'no-preference') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, reducedMotion: motion });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto('http://localhost:8139/?x=' + Math.random());
  await page.evaluate(([m, r, tips, s]) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('legends.tips', JSON.stringify(tips));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify(s));
    if (r) localStorage.setItem('legends.run', JSON.stringify(r));
  }, [S.meta(), run ?? null, TIPS, settings]);
  await page.goto('http://localhost:8139/');
  await page.waitForTimeout(2500);
  return { ctx, page };
}
const shoot = async (page, path) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path });
};
/** Carry on the saved run, place the five, and wait for the challenge's cut-in (CALLOUT-ONCE: it takes the place of the nemesis's taunt). */
async function toChallenge(page) {
  await page.click('.hmCont');
  await page.waitForFunction(() => document.querySelector('.tcLayer:not([hidden]) .tcCut'), null, { timeout: 15000 });
  await page.evaluate(() => window.__game.autoArrange(true));
  await page.waitForTimeout(150);
}
/** Hold the cut-in's clock for a shot. */
const hold = (page) => page.evaluate(() => {
  const t = window.__game.taunts;
  t.held = t.frame;
  t.frame = () => {};
});
/** End the challenge's cut-in, so its card opens. */
async function toCard(page) {
  await page.evaluate(() => {
    const t = window.__game.taunts;
    if (t.held) t.frame = t.held;
    t.end();
  });
  await page.waitForSelector('#duelCard', { timeout: 5000 });
  await page.waitForTimeout(300);
}

for (const [w, h] of sizes) {
  if (want('cut') || want('card') || want('fight') || want('won')) {
    const { ctx, page } = await open(w, h, S.run(5));
    await toChallenge(page);
    await page.waitForTimeout(1200);
    await hold(page);
    if (want('cut')) await shoot(page, `${OUT}/duel-cut-${w}.png`);
    await toCard(page);
    if (want('card')) {
      await shoot(page, `${OUT}/duel-card-${w}.png`);
      await page.evaluate(() => (document.querySelector('#duelCard .omBody').scrollTop = 9999));
      await shoot(page, `${OUT}/duel-card-foot-${w}.png`);
    }
    // (Accept: the duel's fight in its ring)
    await page.click('#duelCard .omPrimary');
    // (staged for the shot: Hask is no match for a level-30 Natsu, so he is given more health to last until the picture is taken)
    await page.evaluate(() => {
      const b = window.__game.b;
      const n = b.units.find((u) => u.id === b.duel.nem);
      n.maxHp *= 8;
      n.hp = n.maxHp;
    });
    await page.waitForTimeout(2200);
    if (want('fight')) await shoot(page, `${OUT}/duel-fight-${w}.png`);
    if (want('won')) {
      // (the nemesis brought low by hand, so the duel ends in a win: the wave card after it)
      await page.evaluate(() => {
        const b = window.__game.b;
        const n = b.units.find((u) => u.id === b.duel.nem);
        n.hp = 1;
      });
      await page.waitForFunction(() => window.__game.b.phase === 'won', null, { timeout: 30000 });
      await page.waitForTimeout(4500);
      await shoot(page, `${OUT}/duel-won-${w}.png`);
    }
    await ctx.close();
  }
  if (want('open')) {
    const { ctx, page } = await open(w, h, S.openRun(5));
    await toChallenge(page);
    await toCard(page);
    await shoot(page, `${OUT}/duel-open-${w}.png`);
    await ctx.close();
  }
  if (want('still')) {
    const { ctx, page } = await open(w, h, S.run(5), { cinematics: false }, 'reduce');
    await toChallenge(page);
    await page.waitForTimeout(700);
    await hold(page);
    await shoot(page, `${OUT}/duel-cut-still-${w}.png`);
    await ctx.close();
  }
  if (want('news') || want('fallen')) {
    const { ctx, page } = await open(w, h);
    await page.click('#hmCouncil');
    await page.waitForTimeout(700);
    const tab = async (i) => {
      await page.click(`#nemesisBoard .nmTabs .omChoice:nth-child(${i})`);
      await page.waitForTimeout(400);
    };
    if (want('news')) {
      await tab(2);
      await shoot(page, `${OUT}/news-${w}.png`);
    }
    if (want('fallen')) {
      await tab(3);
      await shoot(page, `${OUT}/fallen-${w}.png`);
    }
    await ctx.close();
  }
}
await browser.close();
srv.close();
