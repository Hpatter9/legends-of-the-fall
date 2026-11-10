// CALLOUT-ONCE: counts the call-out cut-ins a nemesis's wave shows (`docs/notes/callout-twice.md`). The owner: "When an enemy calls out a
// hero, the call out plays twice." Plays phase 4's challenge wave (tools/nemesis/saves4.ts: Hask, a captain met before, who challenges Natsu
// on wave 5) on a resumed run, with the cut-ins let run by themselves, at each size and each Nemesis cut-in setting, x1 and x3, and
// counts each cut-in opened, by nemesis: every nemesis must call out once. Run `npm run web` first, then: node tools/callout/count.mjs
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve, launch, SIZES } from '../calmap/lib.mjs';
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/nemesis/saves4.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/nemsaves4.mjs', logLevel: 'error', loader: { '.png': 'empty' } });
const S = await import('../../out/shots/nemsaves4.mjs');
const TIPS = ['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay'];
const srv = serve();
const browser = await launch();
let bad = 0;
const cases = [];
for (const [w, h] of SIZES) for (const cut of ['full', 'short']) for (const speed of [1, 3]) cases.push({ w, h, cut, speed, cine: speed === 1 });
for (const c of cases) {
  const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => (bad++, console.log('PAGE ERROR', e.message)));
  await page.goto('http://localhost:8139/?x=' + Math.random());
  await page.evaluate(([m, r, tips, s]) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('legends.tips', JSON.stringify(tips));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify(s));
    localStorage.setItem('legends.run', JSON.stringify(r));
  }, [S.meta(), S.run(5), TIPS, { cinematics: c.cine, nemesisCut: c.cut }]);
  await page.goto('http://localhost:8139/');
  await page.waitForTimeout(2500);
  // (every cut-in opened is counted, by the nemesis's name on its plate, and every line said)
  await page.evaluate(() => {
    window.__cuts = [];
    new MutationObserver(() => {
      for (const cut of document.querySelectorAll('.tcLayer .tcCut:not([data-counted])')) {
        cut.dataset.counted = '1';
        window.__cuts.push({ name: cut.querySelector('.tcName')?.textContent, line: cut.querySelector('.tcLine')?.textContent ?? '', reply: cut.querySelector('.tcReply')?.textContent ?? '' });
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  await page.click('.hmCont');
  await page.evaluate((s) => window.__game.setSpeed?.(s), c.speed);
  // (left to run by themselves until the challenge's card, or the screen is clear)
  await page.waitForFunction(() => document.querySelector('#duelCard') || (window.__cuts.length && !window.__game.taunts.busy), null, { timeout: 20000 }).catch(() => undefined);
  await page.waitForTimeout(600);
  const cuts = await page.evaluate(() => window.__cuts);
  const card = await page.evaluate(() => !!document.querySelector('#duelCard'));
  const per = {};
  for (const x of cuts) per[x.name] = (per[x.name] ?? 0) + 1;
  const twice = Object.entries(per).filter(([, n]) => n > 1);
  const lines = cuts.flatMap((x) => [x.line, x.reply]).filter(Boolean);
  const said = lines.length !== new Set(lines).size;
  if (twice.length || said || !cuts.length) bad++;
  console.log(`${c.w}x${c.h} cut-ins ${c.cut} x${c.speed} cinematics ${c.cine ? 'on' : 'off'}: ${cuts.length} cut-ins ${JSON.stringify(per)}${card ? ', the challenge card' : ''}${twice.length ? '  TWICE' : ''}${said ? '  A LINE SAID TWICE' : ''}`);
  await ctx.close();
}
await browser.close();
srv.close();
console.log(bad ? `${bad} problem(s)` : 'every nemesis called out once');
process.exit(bad ? 1 : 0);
