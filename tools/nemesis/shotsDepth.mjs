// Screenshots of NEMESIS-DEPTH: node tools/nemesis/shotsDepth.mjs  (run `npm run web` first; SIZES=393,360,412 by default all three)
// Writes docs/samples/nemesis-depth/<scene>-<w>.png: the Council with every seat's temperament and Morrow hunted (and the Hunt's line under
// it), Morrow's card (his temperament, the hunt, his remembered fights, once called), Throg's card with the Hunt button, and the taunt
// cut-in at the deploy (Hask, remembering Natsu's Volley, with a Trickster's tag).
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch, SIZES } from '../calmap/lib.mjs';
const OUT = process.env.OUT ?? 'docs/samples/nemesis-depth';
mkdirSync(OUT, { recursive: true });
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/nemesis/savesDepth.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/nemsavesDepth.mjs', logLevel: 'error', loader: { '.png': 'empty' } });
const S = await import('../../out/shots/nemsavesDepth.mjs');
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
  if (want('council') || want('card') || want('hunt')) {
    const { ctx, page } = await open(w, h);
    await page.click('#hmCouncil');
    await page.waitForTimeout(700);
    if (want('council')) {
      await shoot(page, `${OUT}/council-${w}.png`);
      await page.evaluate(() => (document.querySelector('#nemesisBoard .omBody').scrollTop = 9999));
      await shoot(page, `${OUT}/council-foot-${w}.png`);
      await page.evaluate(() => (document.querySelector('#nemesisBoard .omBody').scrollTop = 0));
    }
    const card = async (name) => {
      await page.evaluate((nm) => [...document.querySelectorAll('#nemesisBoard .nmSeat')].find((b) => b.textContent.includes(nm))?.click(), name);
      await page.waitForTimeout(600);
    };
    if (want('card')) {
      await card('Morrow');
      await shoot(page, `${OUT}/card-${w}.png`);
      await page.evaluate(() => (document.querySelector('#nemesisCard .omBody').scrollTop = 520));
      await shoot(page, `${OUT}/card-mid-${w}.png`);
      await page.evaluate(() => document.querySelector('#nemesisCard .omBack')?.click());
      await page.waitForTimeout(400);
    }
    if (want('hunt')) {
      await card('Throg');
      await page.evaluate(() => {
        const sec = [...document.querySelectorAll('#nemesisCard .omSection, #nemesisCard h3, #nemesisCard .omSecHead')].find((x) => /The Hunt/.test(x.textContent));
        sec?.scrollIntoView({ block: 'start' });
      });
      await shoot(page, `${OUT}/hunt-${w}.png`);
    }
    await ctx.close();
  }
  if (want('taunt')) {
    const { ctx, page } = await open(w, h, S.run(5));
    await deploy(page);
    await shoot(page, `${OUT}/taunt-${w}.png`);
    await ctx.close();
  }
}
await browser.close();
srv.close();
