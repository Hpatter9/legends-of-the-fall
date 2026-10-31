// AUTO-CAST's shots: an army wave on the page with the Auto switch on, run until the king's first spell is cast on its own (nothing
// forced), then the switch and the cast; and the Last Stand with Auto on, the same. At the three upright sizes. Run after `npm run web`:
//   node tools/auto-cast/shots.mjs        writes docs/samples/auto-cast-*.png
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { serve } from '../battle-ui/lib.mjs';

const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = Number(process.env.PORT ?? 9031);
const srv = serve('out/web', PORT);
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const PARTY = ['knight', 'samurai', 'archer', 'wizard', 'cleric'];
const TIPS = ['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'retry', 'recycle', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'autoReplay', 'stand'];
const out = [];
try {
  for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://localhost:${PORT}/?x=${Math.random()}`);
    await page.evaluate(([party, tips]) => {
      localStorage.clear();
      // (an old save: `ultAuto` on, the key Auto has always been kept under)
      localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: party, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], ultAuto: true }));
      localStorage.setItem('lotf-tips-off', '1');
      localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
      localStorage.setItem('legends.tips', JSON.stringify(tips));
    }, [PARTY, TIPS]);
    await page.goto(`http://localhost:${PORT}/?seed=5`);
    await page.waitForFunction(() => window.__game?.run, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.getElementById('tipSkip')?.click());
    await page.evaluate((party) => {
      const g = window.__game;
      g.run.roster = party.map((kind, i) => ({ id: i + 1, kind, grade: 1 }));
      g.run.nextId = party.length + 1;
      g.run.squad = party.map((_, i) => i + 1);
      g.newBattle();
      g.refresh();
    }, PARTY);
    await page.waitForTimeout(600);
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(400);
    const sw = await page.evaluate(() => {
      const a = document.querySelector('#hudSpells .fhAuto');
      const r = a.getBoundingClientRect();
      return { on: a.classList.contains('on'), label: a.getAttribute('aria-label'), text: a.textContent, auto: window.__game.b.autoSpells, r: [r.left, r.top, r.right, r.bottom], vw: innerWidth };
    });
    assert.ok(sw.on && sw.auto?.length, JSON.stringify(sw));
    assert.ok(sw.r[2] <= sw.vw, 'the switch is on screen');
    await page.screenshot({ path: `docs/samples/auto-cast-toggle-${w}.png` });
    // (the first spell the chooser casts by itself)
    await page.waitForFunction(() => window.__game.b.log?.some((e) => e.kind === 'spell') || window.__game.b.phase !== 'fight', null, { timeout: 60000, polling: 50 });
    await page.waitForTimeout(250);
    const cast = await page.evaluate(() => {
      const b = window.__game.b;
      window.__game.sceneHold = 1;
      return { t: b.t, phase: b.phase, spells: (b.log ?? []).filter((e) => e.kind === 'spell').map((e) => `${e.id}@${e.u},${e.v} t${e.t}`) };
    });
    await page.screenshot({ path: `docs/samples/auto-cast-fight-${w}.png` });
    await page.evaluate(() => { window.__game.sceneHold = 0; });
    // (the Last Stand: Auto on there too)
    await page.evaluate(() => { const g = window.__game; g.meta.opened = [...new Set([...(g.meta.opened ?? []), 'castle', 'tower'])]; g.home.go(() => g.openStand()); });
    await page.locator('.stPick').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('button', { name: 'Auto fill', exact: true }).click();
    await page.locator('.stPick .primary').click();
    await page.locator('.stStart').waitFor({ state: 'visible' });
    await page.click('.stStart');
    await page.waitForFunction(() => { const s = window.__game.stand.state; return s?.b.log?.some((e) => e.kind === 'spell'); }, null, { timeout: 90000, polling: 50 }).catch(() => {});
    await page.waitForTimeout(250);
    const stand = await page.evaluate(() => {
      const s = window.__game.stand.state;
      const a = document.querySelector('#stand .fhAuto');
      return { auto: s.b.autoSpells, on: a?.classList.contains('on'), spells: (s.b.log ?? []).filter((e) => e.kind === 'spell').map((e) => `${e.id}@${e.u},${e.v} t${e.t}`) };
    });
    await page.screenshot({ path: `docs/samples/auto-cast-stand-${w}.png` });
    const scroll = await page.evaluate(() => document.body.scrollWidth <= innerWidth);
    out.push({ w, h, sw, cast, stand, scroll, errors });
    await ctx.close();
  }
} finally {
  await br.close();
  srv.close();
}
console.log(JSON.stringify(out, null, 1));
