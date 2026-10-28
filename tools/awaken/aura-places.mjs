// AWAKEN-002 phase B: every place an awakened hero is drawn, with its class aura, on an upright phone. After `npm run web`:
//   node tools/awaken/aura-places.mjs            (SIZES=393x852,360x780,412x915; REDUCED=1 or SAVER=1 for those checks)
// Writes out/aura-places/<size>/<place>.png and prints a line a place; tools/awaken/aura-places-sheet.py lays them out.
import { serve } from '../battle-ui/lib.mjs';
import { launch } from '../stand/lib.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const PORT = 8151;
const s = serve('out/web', PORT);
const br = await launch();
const ALL = ['archer', 'knight', 'kunoichi', 'samurai', 'wizard', 'peasant', 'ninjaMonk', 'yamabushi', 'wanderer', 'lightningMage', 'gorgon', 'paladin', 'cleric', 'barbarian', 'ranger', 'mercenary', 'mummy', 'buccaneer', 'rifleBot', 'illusionist', 'gunslinger', 'satyr', 'druid', 'warlock', 'samuraiCommander', 'shambler', 'kitsune', 'werewolf', 'karasu', 'minotaur', 'dragoon', 'lancer', 'dreadPirate', 'sage', 'demonSwordsman', 'tyrant', 'siegeBot', 'juggernaut', 'priestess', 'wolfBard', 'timeWitch', 'arcBlade', 'reaper', 'kraken', 'beastmaster'];
// (twelve classes awakened, some once and some twice; the Samurai is at the top rank with the shards for its first step)
const AWAKE = { knight: 2, wizard: 2, werewolf: 2, ranger: 1, priestess: 2, reaper: 1, druid: 1, lancer: 2, kitsune: 1, juggernaut: 2, timeWitch: 1, rifleBot: 2 };
const PARTY = ['knight', 'wizard', 'werewolf', 'ranger', 'priestess'];
const meta = {
  seed: 7, crowns: 2000, unlocked: ALL, party: PARTY, pulls: 0, sinceNew: 0, dry: 0, dryMythic: 0,
  castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 },
  shards: { ...Object.fromEntries(Object.entries(AWAKE).map(([k, n]) => [k, n > 1 ? 26 : 16])), samurai: 16 },
  awakened: AWAKE, stars: {}, xp: Object.fromEntries(ALL.map((k) => [k, 60000])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [],
  armies: {}, armySeen: [], stash: [], opened: ['tower', 'castle', 'calamity'],
};
const sizes = (process.env.SIZES ?? '393x852,360x780,412x915').split(',');
const places = process.env.PLACES?.split(',');
const want = (p) => !places || places.includes(p);
const hide = '#tip, #tipBox, .tip, #quip, .duchess { display: none !important; }';
let errorsAll = 0;
async function open(w, h, cine = false) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([m, cine, saver]) => {
    if (sessionStorage.getItem('aura-booted')) return;
    sessionStorage.setItem('aura-booted', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: cine, saver }));
  }, [meta, cine, !!process.env.SAVER]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
  await page.waitForTimeout(2200);
  await page.addStyleTag({ content: hide });
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page, errors };
}
for (const size of sizes) {
  const [w, h] = size.split('x').map(Number);
  const dir = `out/aura-places/${size}${process.env.REDUCED ? '-reduced' : ''}${process.env.SAVER ? '-saver' : ''}`;
  mkdirSync(dir, { recursive: true });
  const shot = (page, name) => page.screenshot({ path: `${dir}/${name}.png` }).then(() => console.log(size, name));
  // --- the menus and the camp
  {
    const { ctx, page, errors } = await open(w, h);
    if (want('camp')) {
      await page.evaluate(() => window.__game.home.show('battle'));
      await page.waitForTimeout(1800);
      await shot(page, 'camp');
    }
    if (want('tavern')) {
      await page.evaluate(() => window.__game.home.show('heroes'));
      await page.waitForTimeout(400);
      // (the roster opens over the tavern: closed to see the room)
      await page.evaluate(() => window.__game.home.closeSheet?.());
      await page.evaluate(() => document.querySelector('.heroRoster .primary, #rosterClose')?.click());
      await page.waitForTimeout(1600);
      await shot(page, 'tavern');
    }
    if (want('roster')) {
      await page.evaluate(() => window.__game.home.openRoster());
      await page.waitForTimeout(1500);
      await shot(page, 'roster');
    }
    if (want('dossier')) {
      await page.evaluate(() => window.__game.home.openRoster());
      await page.waitForTimeout(600);
      await page.locator('.hcard[data-kind="wizard"]').click();
      await page.waitForTimeout(1500);
      await shot(page, 'dossier');
    }
    if (want('party')) {
      await page.evaluate(() => { window.__game.home.closeSheet?.(); window.__game.party.open('edit', () => {}); });
      await page.waitForTimeout(1800);
      await shot(page, 'party');
    }
    if (want('hall')) {
      await page.evaluate(() => { document.getElementById('party')?.setAttribute('hidden', ''); window.__game.home.open(); window.__game.home.show('recruit'); });
      await page.waitForTimeout(1500);
      // (the summoning show for a hero: only new heroes are summoned, so one is played here wearing an awakened step)
      await page.evaluate(() => { void window.__game.home.hall.play([{ kind: 'werewolf', isNew: true }]); });
      await page.waitForTimeout(4200);
      await shot(page, 'hall');
    }
    errorsAll += errors.length;
    await ctx.close();
  }
  // --- the Rank up card, the awakening burst and its cinematic (the Samurai's first step)
  if (want('rankup')) {
    const { ctx, page, errors } = await open(w, h, true);
    await page.evaluate(() => window.__game.home.openRoster());
    await page.waitForTimeout(600);
    await page.locator('.hcard[data-kind="samurai"]').click();
    await page.waitForTimeout(800);
    await page.getByRole('tab', { name: 'Progression', exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator('.awPanel button.primary').click();
    await page.waitForTimeout(1200);
    await shot(page, 'rankup');
    await page.locator('.ruCard button.primary').click();
    await page.waitForTimeout(350);
    await page.getByRole('tab', { name: 'Overview', exact: true }).click().catch(() => {});
    await shot(page, 'awaken-burst');
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(1500);
      await shot(page, `scene${i}`);
    }
    errorsAll += errors.length;
    await ctx.close();
  }
  // --- a fight: hire, place and fight
  if (want('fight')) {
    const { ctx, page, errors } = await open(w, h);
    await page.evaluate(() => document.getElementById('hmBattle')?.click());
    await page.waitForTimeout(1500);
    await page.locator('button.asFight.primary').first().click();
    await page.waitForTimeout(1500);
    // (the war council comes first: march with the party as it is)
    await page.getByRole('button', { name: /March to battle/ }).click().catch(() => {});
    await page.waitForTimeout(2500);
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => { window.__game.run.gold = 500; document.getElementById('summon').click(); });
      await page.waitForTimeout(250);
    }
    await page.evaluate(() => document.getElementById('auto').click());
    await page.waitForTimeout(900);
    await shot(page, 'deploy');
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(4500);
    await shot(page, 'fight');
    console.log('fight heroes', await page.evaluate(() => JSON.stringify(window.__game.b.units.filter((u) => u.side === 'hero').map((u) => [u.def, u.awaken ?? 0]))));
    errorsAll += errors.length;
    await ctx.close();
  }
  // --- the Calamity: its map, then a fight
  if (want('calamity')) {
    const { ctx, page, errors } = await open(w, h);
    const esbuild = await import('esbuild');
    await esbuild.build({ entryPoints: ['tools/battle-ui/saves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/bu-saves.mjs', logLevel: 'error' });
    const S = await import('../../out/shots/bu-saves.mjs');
    const cal = S.big(11);
    // (every hero of the Calamity's roster awakened, once or twice)
    const kinds = [...new Set(JSON.stringify(cal).match(/"kind":"(\w+)"/g).map((m) => m.slice(8, -1)))];
    await page.evaluate(([json, kinds]) => {
      localStorage.setItem('legends.calamity', json);
      // (the game keeps its own meta and saves it as the page goes: both are changed)
      for (const m of [JSON.parse(localStorage.getItem('legends.meta')), window.__game.meta]) {
        kinds.filter((k) => m.unlocked.includes(k)).forEach((k, i) => { m.awakened[k] = 1 + (i % 2); m.shards[k] = i % 2 ? 26 : 16; });
        if (m !== window.__game.meta) localStorage.setItem('legends.meta', JSON.stringify(m));
      }
    }, [JSON.stringify(cal), kinds]);
    await page.reload();
    await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
    await page.waitForTimeout(2200);
    await page.addStyleTag({ content: hide });
    await page.evaluate(() => document.getElementById('hmCalamity')?.click());
    await page.waitForTimeout(2500);
    await shot(page, 'calmap');
    await page.evaluate(() => document.querySelector('.cmSpot.open .cmHit')?.click());
    await page.waitForTimeout(400);
    await page.evaluate(() => document.querySelector('.rtGo')?.click());
    await page.waitForTimeout(2500);
    await page.evaluate(() => document.getElementById('auto')?.click());
    await page.waitForTimeout(600);
    await page.evaluate(() => document.getElementById('fight')?.click());
    await page.waitForTimeout(4000);
    await shot(page, 'calamity');
    console.log('calamity heroes', await page.evaluate(() => JSON.stringify(window.__game.b.units.filter((u) => u.side === 'hero').map((u) => [u.def, u.awaken ?? 0]))));
    errorsAll += errors.length;
    await ctx.close();
  }
  // --- the Last Stand
  if (want('stand')) {
    const { ctx, page, errors } = await open(w, h);
    await page.evaluate(() => document.getElementById('hmTower')?.click());
    await page.waitForTimeout(1200);
    if (await page.evaluate(() => !!document.querySelector('.stPick:not([hidden])'))) {
      await page.evaluate(() => [...document.querySelectorAll('.stPick button')].find((b) => b.textContent === 'Auto fill')?.click());
      await page.evaluate(() => document.querySelector('.stPick .primary').click());
      await page.waitForTimeout(800);
    }
    await page.evaluate(() => document.querySelector('.stStart')?.click());
    await page.waitForTimeout(5000);
    await shot(page, 'stand');
    errorsAll += errors.length;
    await ctx.close();
  }
}
writeFileSync('out/aura-places/errors.txt', String(errorsAll));
console.log('page errors', errorsAll);
await br.close();
s.close();
