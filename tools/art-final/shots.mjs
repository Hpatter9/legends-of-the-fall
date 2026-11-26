// ART-FINAL (docs/notes/art-final.md): the last of the art in the game at 393 x 852, into docs/samples/art-final/: awakened heroes of the
// twenty in a fight (front at the deploy, then fighting), Natsu's card, roster and a face crop, and the camp with the Weekly Trial's
// medallion. Duchess's cosmetics are shot by tools/round4-wire/shots.mjs (OUT=docs/samples/art-final). `npm run web` first.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { serve } from '../audit/lib.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const srv = serve('out/web');
const out = 'docs/samples/art-final';
mkdirSync(out, { recursive: true });
const errors = [];
const TUT = ['pause', 'autoMerge', 'traitPerks', 'spellSlots', 'daily', 'eidolons', 'castle', 'autoRunes', 'nemesis', 'chapel', 'talents', 'secondSkill', 'duels', 'warHorn', 'ultimates', 'autoPlace', 'tavern', 'summoning', 'council', 'hunts', 'spare', 'tiers', 'shop', 'recruit', 'weeklyTrial', 'armies'];
const AWAKE = ['vampireLord', 'seraph', 'astralSphinx', 'harpooner', 'plagueDoctor', 'nightstalker', 'inquisitor', 'warDrummer'];
const owned = ['archer', 'knight', 'samurai', 'kunoichi', 'wizard', ...AWAKE];

async function open() {
  const page = await (await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(([owned, awake, tut]) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 4000, unlocked: owned, party: owned.slice(0, 5), pulls: 0, castle: { treasury: 5, barracks: 5, armoury: 5, mageTower: 4, stable: 5, library: 5 },
      shards: Object.fromEntries(owned.map((k) => [k, 9999])), awakened: Object.fromEntries(awake.map((k) => [k, 2])), stars: {}, xp: Object.fromEntries(owned.map((k) => [k, 60000])), bestStage: 30, daily: {}, bosses: [], achievements: [], armies: { orcs: { clears: 1, best: 15, won: 15 } }, armySeen: [], stash: [], opened: ['undead'], scenes: ['opening'], tutorials: tut }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false }));
  }, [owned, AWAKE, TUT]);
  await page.goto(`http://localhost:${srv.address().port}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  return page;
}
const clear = async (page) => {
  for (let i = 0; i < 6; i++) {
    const b = page.locator('.omVeil:not([hidden]) .omPrimary, #tutorialCard .omPrimary').first();
    if (!(await b.isVisible().catch(() => false))) break;
    await b.click().catch(() => {});
    await page.waitForTimeout(300);
  }
};

// 1. The camp, with the Weekly Trial's medallion
{
  const page = await open();
  await page.evaluate(() => { document.getElementById('tipSkip')?.click(); window.__game.home.open(); });
  await page.waitForTimeout(1500);
  await clear(page);
  await page.screenshot({ path: `${out}/camp-trial.png` });
  // 2. Natsu: the roster, her card, and her face as the fight's rows crop it
  await page.evaluate(() => window.__game.home.show('heroes'));
  await page.waitForTimeout(1200);
  await clear(page);
  await page.getByRole('button', { name: 'All heroes' }).click({ timeout: 8000 });
  await page.locator('.hcard').first().waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/roster.png` });
  await page.locator('.hcard', { hasText: 'Natsu' }).first().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/natsu-card.png` });
  await page.context().close();
}

// 3. Awakened heroes of the twenty in a fight: deployed, then fighting (the HUD's rows show their faces)
for (const party of [AWAKE.slice(0, 4).concat('archer'), AWAKE.slice(4)]) {
  const page = await open();
  await page.evaluate((party) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'orcs' }, stage: 1, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, party);
  await page.waitForTimeout(1200);
  await clear(page);
  const tag = party[0];
  await page.screenshot({ path: `${out}/awakened-${tag}-deploy.png` });
  await page.evaluate(() => document.getElementById('fight').click());
  await clear(page);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/awakened-${tag}-fight.png` });
  console.log(tag, await page.evaluate(() => window.__game.b.units.filter((u) => u.side === 'hero').map((u) => window.__game.sprites.get(u.id)?.sheet ?? u.def).join(' ')));
  await page.context().close();
}
await browser.close();
srv.close();
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
