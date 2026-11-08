// Screenshots of the Nemesis War, phase 2: node tools/nemesis/shots2.mjs  (builds with `npm run web` first; SIZES=393,360,412 by default all three)
// Writes docs/samples/nemesis-2/<scene>-<w>.png: the camp's Council place with the Muster's mark, the board's four tabs (the pyramid, the
// News, the Fallen, the Spoils), a nemesis's card (a blood-oath, its loyalty), and the Muster's last wave (deploy, and the warchief in the fight).
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch, SIZES } from '../calmap/lib.mjs';
const OUT = 'docs/samples/nemesis-2';
mkdirSync(OUT, { recursive: true });
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/nemesis/saves2.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/nemsaves2.mjs', logLevel: 'error', loader: { '.png': 'empty' } });
const S = await import('../../out/shots/nemsaves2.mjs');
const TIPS = ['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay'];
const srv = serve();
const browser = await launch();
const sizes = process.env.SIZES ? SIZES.filter(([w]) => process.env.SIZES.split(',').includes(String(w))) : SIZES;
const only = process.argv.slice(2);
const want = (name) => !only.length || only.includes(name);

async function open(w, h, muster) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto('http://localhost:8139/?x=' + Math.random());
  await page.evaluate(([m, r, tips]) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('legends.tips', JSON.stringify(tips));
    localStorage.setItem('lotf-tips-off', '1');
    if (r) localStorage.setItem('legends.muster', JSON.stringify(r));
  }, [S.meta(), muster ?? null, TIPS]);
  await page.goto('http://localhost:8139/');
  await page.waitForTimeout(2500);
  return { ctx, page };
}

/** The board's body scrolled to the top, or to an element in it. */
const shoot = async (page, path) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path });
};

for (const [w, h] of sizes) {
  if (want('camp') || want('council') || want('news') || want('fallen') || want('spoils') || want('card')) {
    const { ctx, page } = await open(w, h);
    if (want('camp')) await shoot(page, `${OUT}/camp-${w}.png`);
    await page.click('#hmCouncil');
    await page.waitForTimeout(700);
    if (want('council')) {
      await shoot(page, `${OUT}/council-${w}.png`);
      await page.evaluate(() => (document.querySelector('#nemesisBoard .omBody').scrollTop = 9999));
      await shoot(page, `${OUT}/council-foot-${w}.png`);
      await page.evaluate(() => (document.querySelector('#nemesisBoard .omBody').scrollTop = 0));
    }
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
    if (want('spoils')) {
      await tab(4);
      await shoot(page, `${OUT}/spoils-${w}.png`);
    }
    if (want('card')) {
      await tab(1);
      await page.click('#nemesisBoard .nmCap.captain:nth-child(3)');
      await page.waitForTimeout(600);
      await shoot(page, `${OUT}/card-${w}.png`);
    }
    await ctx.close();
  }
  if (want('muster')) {
    const { ctx, page } = await open(w, h, S.muster(3));
    await page.click('#hmCouncil');
    await page.waitForTimeout(700);
    await page.click('#nemesisBoard .omPrimary');
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.__game.autoArrange(true));
    await page.waitForTimeout(800);
    await shoot(page, `${OUT}/muster-deploy-${w}.png`);
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(3500);
    await shoot(page, `${OUT}/muster-fight-${w}.png`);
    await ctx.close();
  }
}
await browser.close();
srv.close();
