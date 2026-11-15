// Screenshots of NEMESIS-DEPTH's second batch: node tools/nemesis/shotsDepth2.mjs  (run `npm run web` first; SIZES=393,360,412 by default)
// Writes docs/samples/nemesis-depth-2/<scene>-<w>.png: the kneel card at the camp and the Council with Greymaw kneeling (Slay or Spare),
// the Council's rivalries and the plot afoot with its two hands, Morrow's card with the heroes he has studied, the plot's camp card and the
// Informant on the Council, and the duel's card with its new stakes.
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch, SIZES } from '../calmap/lib.mjs';
const OUT = process.env.OUT ?? 'docs/samples/nemesis-depth-2';
mkdirSync(OUT, { recursive: true });
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/nemesis/savesDepth2.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/nemsavesDepth2.mjs', logLevel: 'error', loader: { '.png': 'empty' } });
const S = await import('../../out/shots/nemsavesDepth2.mjs');
const TIPS = ['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay'];
const srv = serve();
const browser = await launch();
const sizes = process.env.SIZES ? SIZES.filter(([w]) => process.env.SIZES.split(',').includes(String(w))) : SIZES;
const only = process.argv.slice(2);
const want = (name) => !only.length || only.includes(name);

async function open(w, h, run, settings = { cinematics: false }, motion = 'no-preference', which = 'meta') {
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
  }, [S[which](), run ?? null, TIPS, settings]);
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

const card = async (page, name) => {
  await page.evaluate((nm) => [...document.querySelectorAll('#nemesisBoard .nmSeat')].find((b) => b.textContent.includes(nm))?.click(), name);
  await page.waitForTimeout(600);
};
const scrollTo = (page, sel, words) => page.evaluate(([s, wd]) => {
  const x = [...document.querySelectorAll(`${s} .omSection, ${s} .omSectionHead, ${s} h3, ${s} .omWell`)].find((e) => e.textContent.includes(wd));
  x?.scrollIntoView({ block: 'start' });
}, [sel, words]);
for (const [w, h] of sizes) {
  if (want('kneel') || want('council') || want('card')) {
    const { ctx, page } = await open(w, h);
    await page.waitForSelector('#kneelCard', { timeout: 8000 }).catch(() => {});
    if (want('kneel')) await shoot(page, `${OUT}/kneel-card-${w}.png`);
    await page.evaluate(() => document.querySelector('#kneelCard .omBack')?.click());
    await page.waitForTimeout(400);
    await page.click('#hmCouncil');
    await page.waitForTimeout(700);
    if (want('council')) {
      await shoot(page, `${OUT}/council-kneel-${w}.png`);
      await scrollTo(page, '#nemesisBoard', 'Rivalries');
      await shoot(page, `${OUT}/council-politics-${w}.png`);
      await page.evaluate(() => (document.querySelector('#nemesisBoard .omBody').scrollTop = 0));
    }
    if (want('card')) {
      await card(page, 'Morrow');
      await scrollTo(page, '#nemesisCard', 'Studied');
      await shoot(page, `${OUT}/card-studied-${w}.png`);
    }
    await ctx.close();
  }
  if (want('plot') || want('informant')) {
    const { ctx, page } = await open(w, h, undefined, { cinematics: false }, 'no-preference', 'metaInformant');
    await page.waitForSelector('#plotCard', { timeout: 8000 }).catch(() => {});
    if (want('plot')) await shoot(page, `${OUT}/plot-card-${w}.png`);
    await page.evaluate(() => document.querySelector('#plotCard .omBack')?.click());
    await page.waitForTimeout(400);
    await page.click('#hmCouncil');
    await page.waitForTimeout(700);
    if (want('informant')) await shoot(page, `${OUT}/council-informant-${w}.png`);
    await ctx.close();
  }
  if (want('duel')) {
    const { ctx, page } = await open(w, h, S.duelRun(5));
    // (the kneel card the camp opens with is closed first)
    await page.waitForSelector('#kneelCard', { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => document.querySelector('#kneelCard .omBack')?.click());
    await page.waitForTimeout(400);
    await page.click('.hmCont');
    await page.waitForFunction(() => document.querySelector('.tcLayer:not([hidden]) .tcCut'), null, { timeout: 15000 });
    await page.evaluate(() => window.__game.autoArrange(true));
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__game.taunts.end());
    await page.waitForSelector('#duelCard', { timeout: 8000 });
    await page.waitForTimeout(300);
    await page.evaluate(() => (document.querySelector('#duelCard .omBody').scrollTop = 9999));
    await shoot(page, `${OUT}/duel-card-${w}.png`);
    await ctx.close();
  }
}
await browser.close();
srv.close();
