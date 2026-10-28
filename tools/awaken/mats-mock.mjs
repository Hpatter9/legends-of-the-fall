// AWAKEN-MATS phase A: mock-ups of the rift ores on the real game's screens (the awakening panel, a Calamity map's recap, the
// victory screen and the Calamity's start), at an upright phone size. The ores are not in the game yet: each screen is the
// real one with the proposed parts laid over it by the page's DOM, and every shot carries a MOCK-UP label. After `npm run web`:
//   node tools/awaken/mats-mock.mjs        (SIZES=393x852,360x780,412x915; pictures go to docs/samples/awaken-mats-mock-*.png)
import * as esbuild from 'esbuild';
import { mkdirSync, readFileSync } from 'node:fs';
import { serve } from '../battle-ui/lib.mjs';
import { launch } from '../stand/lib.mjs';

const PORT = 8186;
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['tools/calmap/map-saves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/map-saves-mats.mjs', logLevel: 'error', loader: { '.png': 'empty' } });
await esbuild.build({ entryPoints: ['src/sim/awakenMats.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/awaken-mats.mjs', logLevel: 'error' });
const S = await import('../../out/shots/map-saves-mats.mjs');
const { ORES, AWAKEN_ORES, cacheOres } = await import('../../out/shots/awaken-mats.mjs');
const ores = Object.values(ORES).map((o) => ({ ...o, src: `data:image/png;base64,${readFileSync(`src/art/ui/ore/${o.icon}`).toString('base64')}`, hex: `#${o.colour.toString(16).padStart(6, '0')}` }));
// (a Rift Cache is drawn with the game's own bronze chest)
const CHEST = `data:image/png;base64,${readFileSync('src/art/ui/chest-bronze.png').toString('base64')}`;
const ORE = Object.fromEntries(ores.map((o) => [o.trait, o]));
const srv = serve('out/web', PORT);
const br = await launch();
const ALL = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'werewolf', 'peasant', 'druid'];
const meta = {
  seed: 7, crowns: 2000, unlocked: ALL, party: ALL.slice(0, 5), pulls: 0, sinceNew: 0, dry: 0, dryMythic: 0,
  castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 },
  shards: { knight: 17, paladin: 26, samurai: 12 }, awakened: { paladin: 1 }, stars: {}, xp: Object.fromEntries(ALL.map((k) => [k, 60000])),
  bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['tower', 'castle', 'calamity'],
};
// (the player's ores in the mock: a few of each, the Guardian's seven)
const held = { guardian: 7, bulwark: 0, blade: 12, marksman: 4, gunner: 2, caster: 9, arcanist: 0, support: 3, beast: 6, assassin: 2, trickster: 5, warden: 14, vanguard: 1 };
const sizes = (process.env.SIZES ?? '393x852,360x780,412x915').split(',');
const CSS = `
#mockTag { position: fixed; z-index: 99999; top: 6px; left: 50%; transform: translateX(-50%); padding: 2px 10px; background: #c0283a; color: #fff; font: 700 13px/18px sans-serif; letter-spacing: 2px; border: 2px solid #000; pointer-events: none; }
#tip, #tipBox, .tip, #quip, .duchess { display: none !important; }
.oreLine { display: grid; grid-template-columns: 40px 1fr auto; gap: 2px 8px; align-items: center; padding: 8px 10px; border: 1px solid var(--ore); background: linear-gradient(120deg, color-mix(in srgb, var(--ore) 18%, #141018), #141018); border-radius: 3px; }
.oreLine img { grid-row: span 2; width: 40px; height: 40px; image-rendering: pixelated; filter: drop-shadow(0 0 6px var(--ore)); }
.oreLine b { font: 700 16px var(--display); color: var(--ore); } .oreLine em { font: 700 16px var(--display); color: #fff; font-style: normal; grid-row: span 2; }
.oreLine small { font: italic 12px/1.35 var(--body); color: #b9b2c4; }
.oreCache { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border: 1px dashed #cbb477; background: #221d14; border-radius: 3px; font: 13px/1.3 var(--body); color: #e8dcb4; }
.oreCache img { width: 34px; height: 32px; object-fit: cover; object-position: left center; image-rendering: pixelated; }
.oreCache button { margin-left: auto; min-height: 32px !important; font-size: 12px !important; padding: 0 10px; }
.oreCost { display: inline-flex; align-items: center; gap: 3px; color: var(--ore) !important; font-weight: 700; }
.oreCost img, .oreChipImg { width: 18px; height: 18px; image-rendering: pixelated; vertical-align: middle; }
.orePouch { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 8px; margin: 8px 0; background: rgb(0 0 0 / 0.45); border: 2px solid #5b4f36; }
.orePouch h3 { grid-column: 1 / -1; margin: 0 0 2px; font: 700 13px var(--display); color: #e8c86a; }
.orePouch span { display: flex; flex-direction: column; align-items: center; font: 700 11px var(--body); color: #fff; }
.orePouch img { width: 30px; height: 30px; image-rendering: pixelated; }
.orePouch span.none { opacity: 0.4; }
.ccChip.ore { border-color: var(--ore); box-shadow: 0 0 8px color-mix(in srgb, var(--ore) 55%, transparent) inset; }
.ccChip.ore img { width: 28px !important; height: 28px !important; object-fit: contain; } .ccChip.ore img.chest { object-fit: cover; object-position: left center; }
`;
async function open(w, h) {
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
  await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
  await page.waitForTimeout(2200);
  await page.addStyleTag({ content: CSS });
  await page.evaluate(() => { document.getElementById('tipSkip')?.click(); const t = document.createElement('div'); t.id = 'mockTag'; t.textContent = 'MOCK-UP'; document.body.append(t); });
  return { ctx, page, errors };
}
let errorsAll = 0;
for (const size of sizes) {
  const [w, h] = size.split('x').map(Number);
  const sfx = size === '393x852' ? '' : `-${w}`;
  const shot = (page, name) => page.screenshot({ path: `docs/samples/awaken-mats-mock-${name}${sfx}.png` }).then(() => console.log(size, name));
  // --- 1 and 2: the Knight's awakening panel, short of Oathgold and then with enough
  {
    const { ctx, page, errors } = await open(w, h);
    await page.evaluate(() => window.__game.home.openRoster());
    await page.waitForTimeout(600);
    await page.locator('.hcard[data-kind="knight"]').click();
    await page.waitForTimeout(900);
    await page.getByRole('tab', { name: 'Progression', exact: true }).click();
    await page.waitForTimeout(400);
    const dress = (have) => page.evaluate(([o, have, costs, cache, chest]) => {
      const panel = document.querySelector('.awPanel');
      panel.style.setProperty('--ore', o.hex);
      panel.querySelectorAll('.oreLine, .oreCache').forEach((e) => e.remove());
      const line = document.createElement('div');
      line.className = 'oreLine';
      line.innerHTML = `<img src="${o.src}" alt=""><b>${o.name}</b><em>${have} / ${costs[0]}</em><small>${o.line}</small>`;
      panel.querySelector('h4').after(line);
      const box = document.createElement('div');
      box.className = 'oreCache';
      box.innerHTML = `<img src="${chest}" alt=""><span>Rift Cache ×1<br><small>From a Calamity clear</small></span><button type="button" class="primary">Open: +${cache} ${o.name}</button>`;
      line.after(box);
      panel.querySelectorAll('.awStep').forEach((s, i) => {
        const sm = s.querySelector('.awHead small');
        if (sm && !sm.dataset.ore) { sm.dataset.ore = '1'; sm.insertAdjacentHTML('beforeend', ` <span class="oreCost">+ <img src="${o.src}" alt="">${costs[i]} ${o.name}</span>`); }
      });
      const go = panel.querySelector(':scope > button.primary');
      const ok = have >= costs[0];
      go.disabled = !ok;
      go.innerHTML = ok ? `Awaken · uses 6 shards + ${costs[0]} ${o.name}` : `Shards ready · ${have} / ${costs[0]} ${o.name}`;
      const bar = panel.querySelector('.awBar span');
      if (bar) { bar.style.width = `${Math.min(1, have / costs[0]) * 100}%`; bar.style.background = o.hex; }
      panel.scrollIntoView({ block: 'start' });
      // (clear of the sheet's tabs, so the panel's heading shows)
      let sc = panel.parentElement;
      while (sc && sc.scrollHeight <= sc.clientHeight + 2) sc = sc.parentElement;
      sc?.scrollBy(0, -78);
    }, [ORE.guardian, have, AWAKEN_ORES, cacheOres(0), CHEST]);
    await dress(held.guardian);
    await page.waitForTimeout(300);
    await shot(page, 'panel-short');
    await dress(held.guardian + cacheOres(0));
    await page.evaluate(() => document.querySelector('.oreCache')?.remove());
    await page.waitForTimeout(300);
    await shot(page, 'panel-ready');
    errorsAll += errors.length;
    await ctx.close();
  }
  // --- 3: a map's recap after its boss: the boss paid three Whetblood Ore, the mini-boss two Mossjade
  {
    const { ctx, page, errors } = await open(w, h);
    await page.evaluate((j) => localStorage.setItem('legends.calamity', j), JSON.stringify(S.afterBoss(9)));
    await page.reload();
    await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
    await page.waitForTimeout(2200);
    await page.addStyleTag({ content: CSS });
    await page.evaluate(() => { document.getElementById('tipSkip')?.click(); const t = document.createElement('div'); t.id = 'mockTag'; t.textContent = 'MOCK-UP'; document.body.append(t); window.__game.home.show('battle'); });
    await page.waitForTimeout(800);
    await page.evaluate(() => document.getElementById('hmCalamity').click());
    await page.waitForTimeout(2600);
    await page.evaluate(([a, b]) => {
      const card = document.querySelector('.rtCard.ccCard');
      const stats = card.querySelector('.ccStats');
      const g = document.createElement('div');
      g.className = 'ccGroup';
      const chip = (o, n, why) => `<span class="ccChip ore" style="--ore:${o.hex}"><img src="${o.src}" alt=""><small><b style="color:${o.hex}">+${n} ${o.name}</b><br>${why}</small></span>`;
      g.innerHTML = `<h3>Rift ores</h3><div class="ccList">${chip(a, 3, 'the boss · for Blades')}${chip(b, 2, 'the mini-boss · for Wardens')}</div>`;
      stats.after(g);
    }, [ORE.blade, ORE.warden]);
    await page.waitForTimeout(300);
    await shot(page, 'recap');
    errorsAll += errors.length;
    await ctx.close();
  }
  // --- 4: the victory screen of a whole clear: the run's ores and the Rift Cache
  {
    const { ctx, page, errors } = await open(w, h);
    const v = S.victory(3);
    await page.evaluate(([run, s]) => window.__game.towerView.showSummary(run, s, () => {}), [v.run, v.summary]);
    await page.waitForTimeout(2000);
    await page.evaluate(([list, cache, chest]) => {
      const card = document.querySelector('.rtCard.victory');
      const groups = card.querySelectorAll('.ccGroup');
      const g = document.createElement('div');
      g.className = 'ccGroup';
      const chip = (o, n) => `<span class="ccChip ore" style="--ore:${o.hex}"><img src="${o.src}" alt=""><small><b style="color:${o.hex}">+${n}</b> ${o.name}</small></span>`;
      g.innerHTML = `<h3>Rift ores</h3><div class="ccList">${list.map(([o, n]) => chip(o, n)).join('')}<span class="ccChip ore" style="--ore:#e8c86a"><img class="chest" src="${chest}" alt=""><small><b>Rift Cache</b> ×1: ${cache} ores of any class, opened on a hero's awakening panel</small></span></div>`;
      (groups[0] ?? card.lastElementChild).before(g);
      g.scrollIntoView({ block: 'center' });
    }, [[[ORE.blade, 5], [ORE.guardian, 3], [ORE.caster, 4], [ORE.marksman, 3], [ORE.warden, 7], [ORE.trickster, 2]], cacheOres(3), CHEST]);
    await page.waitForTimeout(300);
    await shot(page, 'victory');
    errorsAll += errors.length;
    await ctx.close();
  }
  // --- 5: the Calamity's start: the ore pouch (every class's ores held)
  {
    const { ctx, page, errors } = await open(w, h);
    await page.evaluate(() => window.__game.home.show('battle'));
    await page.waitForTimeout(800);
    await page.evaluate(() => document.getElementById('hmCalamity').click());
    await page.waitForTimeout(1800);
    await page.evaluate(([list]) => {
      const box = document.querySelector('.cvCard') ?? document.body;
      const pouch = document.createElement('div');
      pouch.className = 'orePouch';
      pouch.innerHTML = `<h3>Rift ores · for awakening</h3>${list.map(([o, n]) => `<span class="${n ? '' : 'none'}"><img src="${o.src}" alt="${o.name}">${n}</span>`).join('')}`;
      (box.querySelector('.cvAsc') ?? box.firstElementChild).after(pouch);
    }, [ores.map((o) => [o, held[o.trait]])]);
    await page.waitForTimeout(300);
    await shot(page, 'pouch');
    errorsAll += errors.length;
    await ctx.close();
  }
}
await br.close();
srv.close();
console.log(errorsAll ? `${errorsAll} page errors` : 'no page errors');
