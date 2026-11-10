// QUEST-POSSIBLE, round 2: in the real page, a taken quest that bars spells and ultimates holds SPELL Auto and ULT Auto off for a fight it
// counts for, with a line saying why, and the player's own switches come back once nothing taken asks it. At the three phone sizes.
// `npm run web`, then `node tools/quest-audit/hold.mjs` (exits 1 if the hold or its line is wrong).
import { serve, launch, SIZES } from '../calmap/lib.mjs';
const srv = serve('out/web', 8139);
const browser = await launch();
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'];
let bad = 0;
for (const [w, h] of SIZES.slice(0, Number(process.env.N ?? 3))) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  // (every toast shown is kept, from the page's first moment: the hold is told once, as the first fight it counts for is set up)
  await page.addInitScript(() => {
    window.__toasts = [];
    new MutationObserver(() => {
      for (const e of document.querySelectorAll('.toast:not([data-seen])')) (e.dataset.seen = '1'), window.__toasts.push(e.textContent);
    }).observe(document, { childList: true, subtree: true });
  });
  page.on('pageerror', (e) => (bad++, console.log('PAGE ERROR', e.message)));
  await page.goto('http://localhost:8139/?x=' + Math.random());
  await page.evaluate((heroes) => {
    localStorage.clear();
    const m = { seed: 11, crowns: 900, stones: 0, unlocked: heroes, party: heroes, pulls: 0, castle: { treasury: 1, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(heroes.map((k) => [k, 90000])), bestStage: 1, tower: 0, daily: {}, bosses: [], achievements: [], armies: { orcs: { waves: 15, best: 15, won: 15, clears: 1, stars: {} } }, armySeen: ['orcs', 'undead'], stash: [], scenes: ['opening', 'intro:orcs', 'intro:undead'], heroesSeen: heroes, featuresTold: ['autoMerge', 'autoPlace'], spellAuto: true, ultAuto: true, quests: { day: 20261110, offers: [], active: [{ id: 'provHandsOffTheHorn', progress: 0, took: 20261110, v: 1 }], done: [] } };
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, quips: false }));
  }, HEROES);
  await page.goto('http://localhost:8139/');
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  const fightAt = async (army) => {
    await page.evaluate((army) => {
      const g = window.__game;
      const r = JSON.parse(JSON.stringify(g.run));
      Object.assign(r, { mode: { kind: 'army', army }, stage: 2, over: false, cleared: false, gold: 500, event: undefined });
      document.getElementById('home').hidden = true;
      g.startRun(r);
      g.autoArrange?.(true);
      g.begin();
    }, army);
    await page.waitForTimeout(900);
    return page.evaluate(() => ({ held: window.__game.autoHeld, spells: window.__game.spellAutoOn(), ults: window.__game.ultAutoOn(), phase: window.__game.b.phase, saved: [window.__game.meta.spellAuto, window.__game.meta.ultAuto], toast: window.__toasts.filter((t) => /held off/.test(t)) }));
  };
  const held = await fightAt('undead');
  await page.waitForFunction(() => window.__toasts.some((t) => /held off/.test(t)), null, { timeout: 15000 }).catch(() => undefined);
  held.toast = await page.evaluate(() => window.__toasts.filter((t) => /held off/.test(t)));
  // (the quest done: nothing asks it any more, and the player's switches are back for the next fight)
  await page.evaluate(() => { window.__game.meta.quests.active[0].progress = 999; });
  const back = await fightAt('undead');
  const okHeld = !held.spells && !held.ults && held.saved.every(Boolean) && held.toast.some((t) => t.startsWith('SPELL and ULT Auto are held off'));
  const okBack = back.spells && back.ults;
  if (!okHeld || !okBack) bad++;
  console.log(`${w}x${h}: held ${JSON.stringify(held)}; after ${JSON.stringify(back)}${okHeld && okBack ? '' : '  WRONG'}`);
  await ctx.close();
}
await browser.close();
srv.close();
process.exit(bad ? 1 : 0);
