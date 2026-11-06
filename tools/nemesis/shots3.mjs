// Screenshots of the Nemesis War, phase 3: node tools/nemesis/shots3.mjs  (builds with `npm run web` first; SIZES=393,360,412 by default all three)
// Writes docs/samples/nemesis-3/<scene>-<w>.png: the Council with an Avenger's chip and a member away, Morrow's card (his trophy, the Grudge
// and the Avenger), the News and the Fallen, the taunt cut-in at the deploy (Hask, wearing Natsu's sword, and Natsu's answer), the short
// cut-in, the cut-in under reduced motion, and Hask's name plate in the fight with the trophy beside it.
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch, SIZES } from '../calmap/lib.mjs';
const OUT = 'docs/samples/nemesis-3';
mkdirSync(OUT, { recursive: true });
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/nemesis/saves3.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/nemsaves3.mjs', logLevel: 'error', loader: { '.png': 'empty' } });
const S = await import('../../out/shots/nemsaves3.mjs');
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
/** Carry on the saved run, place the five and catch the cut-in at `at` ms into it. */
async function deploy(page, at = 1300) {
  await page.click('.hmCont');
  await page.waitForFunction(() => document.querySelector('.tcLayer:not([hidden]) .tcCut'), null, { timeout: 15000 });
  await page.evaluate(() => window.__game.autoArrange(true));
  await page.waitForTimeout(at);
  // (the cut-in's clock held for the shot, so a slow frame does not let it run out before the picture is taken)
  await page.evaluate(() => {
    const t = window.__game.taunts;
    t.held = t.frame;
    t.frame = () => {};
  });
}
/** Let the cut-in's clock run again. */
const release = (page) => page.evaluate(() => {
  const t = window.__game.taunts;
  if (t.held) t.frame = t.held;
});

for (const [w, h] of sizes) {
  if (want('council') || want('card') || want('news') || want('fallen')) {
    const { ctx, page } = await open(w, h);
    await page.click('#hmCouncil');
    await page.waitForTimeout(700);
    if (want('council')) await shoot(page, `${OUT}/council-${w}.png`);
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
    if (want('card')) {
      await tab(1);
      await page.evaluate(() => [...document.querySelectorAll('#nemesisBoard .nmCap')].find((b) => b.textContent.includes('Morrow'))?.click());
      await page.waitForTimeout(600);
      await shoot(page, `${OUT}/card-${w}.png`);
      await page.evaluate(() => (document.querySelector('#nemesisCard .omBody').scrollTop = 9999));
      await shoot(page, `${OUT}/card-foot-${w}.png`);
    }
    await ctx.close();
  }
  if (want('taunt')) {
    const { ctx, page } = await open(w, h, S.run(5));
    await deploy(page);
    await shoot(page, `${OUT}/taunt-${w}.png`);
    await release(page);
    // (a tap skips it, once 0.6 s have played; then the fight, with Hask's plate and Natsu's sword beside it)
    await page.mouse.click(w / 2, h * 0.42);
    await page.waitForTimeout(400);
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(2500);
    await shoot(page, `${OUT}/fight-plate-${w}.png`);
    await ctx.close();
  }
  if (want('short')) {
    const { ctx, page } = await open(w, h, S.run(5), { cinematics: false, nemesisCut: 'short' });
    await page.evaluate(() => {
      const m = JSON.parse(localStorage.getItem('legends.run'));
      m.nemesis.members.forEach((x) => (x.seen = true));
      localStorage.setItem('legends.run', JSON.stringify(m));
    });
    await page.reload();
    await page.waitForTimeout(2500);
    await deploy(page, 300);
    await shoot(page, `${OUT}/taunt-short-${w}.png`);
    await ctx.close();
  }
  if (want('still')) {
    const { ctx, page } = await open(w, h, S.run(5), { cinematics: false }, 'reduce');
    await deploy(page, 700);
    await shoot(page, `${OUT}/taunt-still-${w}.png`);
    await ctx.close();
  }
}
await browser.close();
srv.close();
