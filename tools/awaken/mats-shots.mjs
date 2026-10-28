// AWAKEN-MATS phase B: the rift ores on the real screens, on an upright phone. After `npm run web`:
//   node tools/awaken/mats-shots.mjs     (SIZES=393x852,360x780,412x915; PORT 8186; pictures go to docs/samples/awaken-mats-<name>[-<w>].png)
// The awakening panel short of ores and ready, a Rift Cache to open, the Calamity's start (the pouch), a map's recap, the
// victory screen, an army's card (what it drops), an army's first clear (its result screen), and a gold chest holding ores.
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';
import { serve } from '../battle-ui/lib.mjs';
import { launch } from '../stand/lib.mjs';

const PORT = Number(process.env.PORT ?? 8186);
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/calmap/map-saves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/map-saves-mats.mjs', logLevel: 'error', loader: { '.png': 'empty' } });
const S = await import('../../out/shots/map-saves-mats.mjs');
const srv = serve('out/web', PORT);
const br = await launch();
const ALL = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'werewolf', 'peasant', 'druid'];
const base = (extra = {}) => ({
  seed: 7, crowns: 2000, unlocked: ALL, party: ALL.slice(0, 5), pulls: 0, sinceNew: 0, dry: 0, dryMythic: 0,
  castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 },
  shards: { knight: 17, paladin: 26, samurai: 12 }, awakened: { paladin: 1 }, stars: {}, xp: Object.fromEntries(ALL.map((k) => [k, 60000])),
  bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['tower', 'castle', 'calamity'],
  ores: { guardian: 7, blade: 12, marksman: 4, gunner: 2, caster: 9, support: 3, beast: 6, assassin: 2, trickster: 5, warden: 14, vanguard: 1 }, caches: 1,
  ...extra,
});
const only = process.env.ONLY?.split(',');
const want = (n) => !only || only.includes(n);
const sizes = (process.env.SIZES ?? '393x852,360x780,412x915').split(',');
const hide = '#tip, #tipBox, .tip, #quip, .duchess { display: none !important; }';
let errorsAll = 0;
async function open(w, h, meta) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([m]) => {
    if (sessionStorage.getItem('mats-booted')) return;
    sessionStorage.setItem('mats-booted', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
  }, [meta]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(2200);
  await page.addStyleTag({ content: hide });
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page, errors };
}
for (const size of sizes) {
  const [w, h] = size.split('x').map(Number);
  const sfx = size === '393x852' ? '' : `-${w}`;
  const shot = (page, name) => page.screenshot({ path: `docs/samples/awaken-mats-${name}${sfx}.png` }).then(() => console.log(size, name));
  const done = async (o) => { errorsAll += o.errors.length; await o.ctx.close(); };
  const scrollPanel = (page) => page.evaluate(() => {
    const panel = document.querySelector('.awPanel');
    panel.scrollIntoView({ block: 'start' });
    let sc = panel.parentElement;
    while (sc && sc.scrollHeight <= sc.clientHeight + 2) sc = sc.parentElement;
    sc?.scrollBy(0, -78);
  });
  // --- 1, 2, 3: the Knight's awakening panel: short of Oathgold with a cache waiting; the cache opened; ready
  if (want('panel')) {
    const o = await open(w, h, base());
    const { page } = o;
    await page.evaluate(() => window.__game.home.openRoster());
    await page.waitForTimeout(600);
    await page.locator('.hcard[data-kind="knight"]').click();
    await page.waitForTimeout(900);
    await page.getByRole('tab', { name: 'Progression', exact: true }).click();
    await page.waitForTimeout(400);
    await scrollPanel(page);
    await page.waitForTimeout(200);
    await shot(page, 'panel-short');
    await page.locator('.oreCache button').click();
    await page.waitForTimeout(600);
    await page.getByRole('tab', { name: 'Progression', exact: true }).click().catch(() => {});
    await page.waitForTimeout(300);
    await scrollPanel(page);
    await page.waitForTimeout(200);
    await shot(page, 'panel-ready');
    const held = await page.evaluate(() => ({ ores: window.__game.meta.ores.guardian, caches: window.__game.meta.caches }));
    console.log(size, 'after the cache:', JSON.stringify(held));
    await page.evaluate(() => document.querySelector('.orePouch')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(200);
    await shot(page, 'panel-pouch');
    await done(o);
  }
  // --- 4: the Calamity's start: the ore pouch
  if (want('pouch')) {
    const o = await open(w, h, base());
    const { page } = o;
    await page.evaluate(() => window.__game.home.show('battle'));
    await page.waitForTimeout(800);
    await page.evaluate(() => document.getElementById('hmCalamity').click());
    await page.waitForTimeout(1800);
    await shot(page, 'pouch');
    await done(o);
  }
  // --- 5: a map's recap after its boss (the run's own drop)
  if (want('recap')) {
    const o = await open(w, h, base());
    const { page } = o;
    await page.evaluate((j) => localStorage.setItem('legends.calamity', j), JSON.stringify(S.afterBoss(9)));
    await page.reload();
    await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
    await page.waitForTimeout(2200);
    await page.addStyleTag({ content: hide });
    await page.evaluate(() => { document.getElementById('tipSkip')?.click(); window.__game.home.show('battle'); });
    await page.waitForTimeout(800);
    await page.evaluate(() => document.getElementById('hmCalamity').click());
    await page.waitForTimeout(2600);
    await shot(page, 'recap');
    await done(o);
  }
  // --- 6: the victory screen of a whole clear (the run's ores, as its bosses and mini-bosses would drop them, and the cache)
  if (want('victory')) {
    const o = await open(w, h, base());
    const { page } = o;
    const v = S.victory(3);
    v.summary.ores = [{ trait: 'blade', n: 3 }, { trait: 'vanguard', n: 2 }, { trait: 'beast', n: 2 }, { trait: 'caster', n: 4 }, { trait: 'support', n: 2 }, { trait: 'guardian', n: 3 }, { trait: 'gunner', n: 5 }, { trait: 'arcanist', n: 5 }];
    await page.evaluate(([run, s]) => window.__game.towerView.showSummary(run, s, () => {}), [v.run, v.summary]);
    await page.waitForTimeout(2000);
    await page.evaluate(() => document.querySelector('.rtCard.victory .oreChip')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    await shot(page, 'victory');
    await done(o);
  }
  // --- 7: an army's card: what it drops
  if (want('army-card')) {
    const o = await open(w, h, base({ armies: { orcs: { waves: 15, best: 15, won: 15, clears: 1, stars: {} } }, armySeen: ['orcs', 'undead'] }));
    const { page } = o;
    await page.evaluate(() => window.__game.home.openArmies());
    await page.waitForTimeout(900);
    await page.evaluate(() => document.querySelector('.asOres')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    await shot(page, 'army-card');
    await done(o);
  }
  // --- 8: an army's first clear: the Orc Warband's last wave won, its result screen
  if (want('army-result')) {
    const o = await open(w, h, base({ armies: { orcs: { waves: 15, best: 14, won: 14, clears: 0, stars: {} } } }));
    const { page } = o;
    await page.evaluate(() => {
      const g = window.__game;
      const r = JSON.parse(JSON.stringify(g.run));
      Object.assign(r, { mode: { kind: 'army', army: 'orcs' }, stage: 15, over: false, cleared: false, gold: 500, event: undefined, roster: [], squad: [] });
      document.getElementById('home').hidden = true;
      g.startRun(r);
      for (let i = 0; i < 4; i++) document.getElementById('summon').click();
      for (const hh of g.run.roster.slice(0, 5)) {
        if (g.b.units.some((u) => u.tag === hh.id)) continue;
        const t = g.freeTile();
        if (t) g.put(String(hh.id), t);
      }
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => { window.__game.endIntro?.(); window.__game.begin(); setInterval(() => { for (const u of window.__game.b.units) if (u.side === 'foe' && u.hp > 1) u.hp = 1; }, 300); });
    await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 150000 }).catch(() => console.log('no result'));
    await page.waitForTimeout(1800);
    await page.evaluate(() => document.getElementById('oreDrop')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    await shot(page, 'army-result');
    await done(o);
  }
  // --- 9: a gold chest that holds ores (its seed found by the same rule the game uses)
  if (want('chest')) {
    const o = await open(w, h, base({ stash: [{ army: 'golems', at: 10, tier: 0, seed: Number(process.env.CHEST_SEED ?? 3) }], armies: { orcs: { waves: 15, best: 15, won: 15, clears: 1, stars: {} } } }));
    const { page } = o;
    await page.evaluate(() => window.__game.home.show('battle'));
    await page.waitForTimeout(900);
    await page.evaluate(() => document.querySelector('.csChest')?.click());
    await page.waitForTimeout(4500);
    await shot(page, 'chest');
    await done(o);
  }
}
await br.close();
srv.close();
console.log(errorsAll ? `${errorsAll} page errors` : 'no page errors');
