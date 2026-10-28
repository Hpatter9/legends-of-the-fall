// UX-002 browser checks and screenshots, at the three upright sizes: the Battle page on a reopen (the army ribbon only when the
// army is new), and a real defeat with no heart left reaching the run recap's "How to come back stronger" card, with a pointer
// tapped through to its screen. Serve out/web first:
//   node tools/ux-fixes/shots.mjs [port]
// Writes docs/samples/ux-fixes-<scene>-<w>x<h>.png and prints the checks (needs Playwright, as the other shot scripts).
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const port = process.argv[2] || '8000';
const url = `http://127.0.0.1:${port}`;
const TIPS = 'home,deploy,fight,mana,skill,summon,crowns,calamity,tower,talents,castle,spellbook,stash,equipment,recycle,retry,autoReplay'.split(',');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript((tips) => {
      localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false }));
      localStorage.setItem('legends.tips', JSON.stringify(tips));
    }, TIPS);
    const shot = (name) => page.screenshot({ path: `docs/samples/ux-fixes-${name}-${w}x${h}.png` });
    const ribbon = () => page.evaluate(() => document.querySelectorAll('.hmFront .hmBanner').length);
    // a save past the start with the Orc Warband cleared: the Undead Legion is the army in front
    await page.goto(`${url}/?seed=7`);
    await page.waitForFunction(() => window.__game);
    await page.evaluate(() => {
      const g = window.__game;
      g.meta.armies.orcs = { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: { 0: 7 } };
      g.meta.scenes = ['opening'];
      g.meta.crowns = 240;
      localStorage.setItem('legends.meta', JSON.stringify(g.meta));
      localStorage.removeItem('lotf-army-shown');
    });
    const open = async () => {
      await page.goto(`${url}/`);
      await page.waitForFunction(() => window.__game && !document.getElementById('home').hidden, null, { timeout: 90000 });
      await page.waitForTimeout(800);
    };
    await open();
    const first = await ribbon();
    await shot('home-first');
    await open();
    const again = await ribbon();
    await shot('home-reopen');
    assert.equal(first, 1, 'the army in front is named the first time');
    assert.equal(again, 0, 'and not on the next launch');

    // a real defeat: an Undead Legion run with no heart left, the party placed and the fight lost
    await page.evaluate(() => { const h = window.__game.home; h.go(() => h.hooks.onArmy('undead', 0)); });
    await page.click('#ptGo');
    await page.waitForTimeout(800);
    // (two heroes hired from the run's gold, as a player starts; no heart is left to burn)
    for (let i = 0; i < 2; i++) {
      await page.click('#summon');
      await page.waitForTimeout(300);
    }
    await page.click('#auto');
    await page.waitForTimeout(300);
    await page.click('#fight');
    await page.waitForTimeout(500);
    // (first a fall with a heart left: the heart burns and the fight goes on, with no result, recap or advice)
    await page.evaluate(() => { for (const u of window.__game.b.units) if (u.side === 'hero') u.hp = 0; });
    await page.waitForFunction(() => (window.__game.run.retries ?? 0) > 0, null, { timeout: 60000 });
    await page.waitForTimeout(2500);
    const revived = await page.evaluate(() => ({ result: !document.getElementById('result').hidden, recap: !document.getElementById('recap').hidden, advice: document.querySelectorAll('.rcAdvice').length, over: !!window.__game.run.over }));
    assert.deepEqual(revived, { result: false, recap: false, advice: 0, over: false }, 'a heart revives: no advice');
    // (then the last heart gone)
    await page.evaluate(() => { window.__game.run.retries = 2; });
    // (the heroes fall at once: the sim settles the loss as it would any other)
    await page.evaluate(() => { for (const u of window.__game.b.units) if (u.side === 'hero') u.hp = 0; });
    await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 60000 });
    assert.equal(await page.textContent('#next'), 'Run recap');
    await page.click('#next');
    await page.locator('.rcAdvice').waitFor();
    const tips = await page.$$eval('.rcTip', (rows) => rows.map((r) => ({ text: r.querySelector('p').textContent, button: r.querySelector('button')?.textContent ?? null })));
    assert.ok(tips.length >= 2 && tips.length <= 4, 'two to four pointers');
    assert.match(tips[0].text, /meant for level 8/);
    await shot('loss-advice');
    // (the card fits the width: nothing runs off the side)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    // a pointer goes to its screen: Train → the Heroes tab, past the recap, with the home screen open
    await page.getByRole('button', { name: 'Heroes', exact: true }).first().click();
    await page.waitForFunction(() => !document.getElementById('home').hidden && document.getElementById('recap').hidden);
    await page.waitForTimeout(600);
    const onHeroes = await page.evaluate(() => document.querySelector('.hmTab.on span')?.textContent);
    await shot('loss-to-heroes');
    assert.equal(onHeroes, 'Heroes');
    // the army just fought is new on the Battle page: its ribbon shows on this visit
    results.push({ size: `${w}x${h}`, ribbonFirst: first, ribbonReopen: again, revived, tips, onHeroes, errors });
    assert.deepEqual(errors, []);
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(results, null, 1));
