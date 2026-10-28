// The hero kits' shots and checks (COMBAT-002): the fight's hero bar at the three upright sizes, a glowing ready portrait, a tapped ultimate, Auto on,
// and a few signature kits in action; page errors are checked throughout. Run after `npm run web`: node tools/kits/shots.mjs [only]
// Writes docs/samples/hero-kits-*.png.
import { serve, launch, boot as plainBoot, calamityFight } from '../battle-ui/lib.mjs';
import { boot as standBoot, enter as standEnter } from '../stand/lib.mjs';
import { mkdirSync } from 'node:fs';
import * as esbuild from 'esbuild';

mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['src/sim/levels.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/kits-levels.mjs', logLevel: 'error' });
const { xpFor } = await import('../../out/shots/kits-levels.mjs');

const only = process.argv[2] ?? '';
const s = serve();
const br = await launch();
const fails = [];
const check = (name, ok, info = '') => { console.log(ok ? 'ok  ' : 'FAIL', name, info); if (!ok) fails.push(name); };
const SIZES = [[393, 852], [360, 780], [412, 915]];
const out = (n, w) => `docs/samples/hero-kits-${n}${w === 393 ? '' : `-${w}`}.png`;

/** A page on a save whose party (at `level`) is `party`, in a fight of the run's first wave (deploy phase). */
async function bootFight(w, h, party, level, seed = 5) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  await page.goto(`http://localhost:8139/?x=${Math.random()}`);
  await page.evaluate(() => localStorage.clear());
  const xp = Object.fromEntries(party.map((k) => [k, xpFor(level)]));
  await page.evaluate(([party, xp]) => {
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: party, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
    localStorage.setItem('legends.tips', JSON.stringify(['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'retry', 'recycle', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'autoReplay']));
  }, [party, xp]);
  await page.goto(`http://localhost:8139/?seed=${seed}`);
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  // (the run's roster is the party, all five in the squad, and the wave set up again)
  await page.evaluate((party) => {
    const g = window.__game;
    g.run.roster = party.map((kind, i) => ({ id: i + 1, kind, grade: 1 }));
    g.run.nextId = party.length + 1;
    g.run.squad = party.map((_, i) => i + 1);
    g.newBattle();
    g.refresh();
  }, party);
  await page.waitForTimeout(600);
  return { ctx, page, errors };
}
/** Start the fight and let it run `ms` (page time, at the normal speed). */
async function start(page, ms = 2500) {
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForTimeout(ms);
}
/** Hold the fight still (the page stops stepping it) for a steady screenshot. */
const hold = (page, on) => page.evaluate((on) => { window.__game.sceneHold = on ? 1 : 0; }, on);

const PARTY = ['knight', 'werewolf', 'beastmaster', 'wizard', 'cleric'];
if (!only || only === 'bar')
  for (const [w, h] of SIZES) {
    const { ctx, page, errors } = await bootFight(w, h, PARTY, 30);
    await start(page);
    await hold(page, true);
    await page.screenshot({ path: out('bar', w) });
    const bar = await page.evaluate(() => {
      const r = document.getElementById('heroBar').getBoundingClientRect();
      const tiles = [...document.querySelectorAll('#heroBar .hb')].map((t) => t.getBoundingClientRect());
      const panel = document.getElementById('panel').getBoundingClientRect();
      const texty = [...document.querySelectorAll('#heroBar *, #spellCards *')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
      const sizes = texty.filter((e) => parseFloat(getComputedStyle(e).fontSize) % 12).map((e) => `${e.tagName}.${e.className}:${getComputedStyle(e).fontSize}`);
      const bold = texty.filter((e) => Number(getComputedStyle(e).fontWeight) > 500).map((e) => `${e.tagName}.${e.className}`);
      return { h: r.height, w: r.width, tiles: tiles.length, minW: Math.min(...tiles.map((t) => t.width)), right: Math.max(...tiles.map((t) => t.right)), panelTop: panel.top, vw: innerWidth, sizes, bold, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    check(`five tiles and the switch fit (${w})`, bar.tiles === 5 && bar.right <= bar.vw && !bar.overflow && bar.minW >= 48, JSON.stringify(bar));
    check(`text 12px multiples, never bold (${w})`, bar.sizes.length === 0 && bar.bold.length === 0, JSON.stringify({ sizes: bar.sizes, bold: bar.bold }));
    check(`the field keeps most of the screen (${w})`, bar.panelTop > h * 0.6, `panel top ${bar.panelTop} of ${h}`);
    // a ready ultimate: the tile glows and says TAP
    await page.evaluate(() => { const b = window.__game.b; const u = b.units.find((x) => x.def === 'werewolf'); u.charge2 = 100; });
    await hold(page, false);
    await page.waitForTimeout(250);
    await hold(page, true);
    const ready = await page.evaluate(() => { const t = document.querySelector('#heroBar .hb.ready'); return { ready: !!t, plate: t?.querySelector('.hbPlate')?.textContent }; });
    check(`a full ring glows and says TAP (${w})`, ready.ready && ready.plate === 'TAP', JSON.stringify(ready));
    await page.screenshot({ path: out('ready', w) });
    // the tap: queued, then fired
    const tapped = await page.evaluate(() => { const g = window.__game; const u = g.b.units.find((x) => x.def === 'werewolf'); document.querySelector(`#heroBar .hb[data-unit="${u.id}"]`).click(); return { orders: g.b.orders?.length ?? 0, queued: !!document.querySelector('#heroBar .hb.queued') }; });
    check(`a tap queues the ultimate (${w})`, tapped.orders === 1 && tapped.queued, JSON.stringify(tapped));
    await hold(page, false);
    await page.waitForFunction(() => window.__game.b.units.find((x) => x.def === 'werewolf').charge2 < 100, null, { timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(300);
    await hold(page, true);
    const fired = await page.evaluate(() => { const g = window.__game; const u = g.b.units.find((x) => x.def === 'werewolf'); return { meter: u.charge2, moon: !!u.kx?.moon, log: (g.b.log ?? []).filter((e) => e.kind === 'ult').length }; });
    check(`the tapped ultimate fired (${w})`, fired.log === 1 && fired.meter < 100, JSON.stringify(fired));
    await page.screenshot({ path: out('tapped', w) });
    // Auto on
    await page.evaluate(() => document.querySelector('#heroBar .hbAuto').click());
    const auto = await page.evaluate(() => ({ on: document.querySelector('#heroBar .hbAuto').classList.contains('on'), sim: window.__game.b.autoUlt, saved: JSON.parse(localStorage.getItem('legends.meta')).ultAuto }));
    check(`the Auto switch turns on and is kept (${w})`, auto.on && auto.sim === true && auto.saved === true, JSON.stringify(auto));
    await page.evaluate(() => { const b = window.__game.b; for (const u of b.units) if (u.side === 'hero' && u.def === 'wizard') u.charge2 = 100; });
    await hold(page, false);
    await page.waitForTimeout(600);
    await hold(page, true);
    await page.screenshot({ path: out('auto', w) });
    check(`no page errors (${w})`, errors.length === 0, errors.join('|'));
    await ctx.close();
  }

// reduced motion: the ready ring is still (the glow stays), a queued ring does not turn
if (!only || only === 'reduced') {
  const { ctx, page, errors } = await bootFight(393, 852, PARTY, 30);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  await page.evaluate(() => { const u = window.__game.b.units.find((x) => x.def === 'werewolf'); u.charge2 = 100; });
  await page.waitForTimeout(300);
  await hold(page, true);
  const still = await page.evaluate(() => { const r = document.querySelector('#heroBar .hb.ready .hbRing'); const t = document.querySelector('#heroBar .hb.ready'); return { ring: r && getComputedStyle(r).animationName, glow: t && getComputedStyle(t).boxShadow !== 'none' }; });
  check('reduced motion: the ready ring is still and the glow stays', still.ring === 'none' && still.glow, JSON.stringify(still));
  await page.screenshot({ path: out('reduced', 393) });
  check('no page errors (reduced)', errors.length === 0, errors.join('|'));
  await ctx.close();
}

// a locked bar: level 12 (skill 2 open, the ultimate not): "Lv 30" plates
if (!only || only === 'locked') {
  const { ctx, page, errors } = await bootFight(393, 852, ['knight', 'samurai', 'archer', 'priestess', 'satyr'], 12);
  await start(page, 2000);
  await hold(page, true);
  const locked = await page.evaluate(() => [...document.querySelectorAll('#heroBar .hb')].map((t) => t.querySelector('.hbPlate').textContent));
  check('below level 30 every portrait says Lv 30', locked.length === 5 && locked.every((x) => x === 'Lv 30'), JSON.stringify(locked));
  await page.screenshot({ path: out('locked', 393) });
  check('no page errors (locked)', errors.length === 0, errors.join('|'));
  await ctx.close();
}

// the Calamity's fights carry the same bar
if (!only || only === 'calamity')
  for (const [w, h] of SIZES) {
    const { ctx, page, errors } = await plainBoot(br, w, h);
    // (no cinematic over the fight)
    await page.evaluate(() => localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false })));
    await calamityFight(page);
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(2500);
    await hold(page, true);
    const bar = await page.evaluate(() => ({ tiles: document.querySelectorAll('#heroBar .hb').length, h: document.getElementById('heroBar').getBoundingClientRect().height, overflow: document.documentElement.scrollWidth > innerWidth }));
    check(`the Calamity's fight has the hero bar (${w})`, bar.tiles >= 1 && bar.h > 0 && !bar.overflow, JSON.stringify(bar));
    await page.screenshot({ path: out('calamity', w) });
    check(`no page errors (calamity ${w})`, errors.length === 0, errors.join('|'));
    await ctx.close();
  }

// the Last Stand: eight heroes in two rows
if (!only || only === 'stand')
  for (const [w, h] of SIZES) {
    const { ctx, page, errors } = await standBoot(br, w, h, 30);
    await standEnter(page);
    await page.evaluate(() => document.querySelector('.stStart')?.click());
    await page.waitForTimeout(4000);
    const bar = await page.evaluate(() => {
      const r = document.querySelector('.stHeroes')?.getBoundingClientRect();
      const tiles = [...document.querySelectorAll('.stHeroes .hb')].map((t) => t.getBoundingClientRect());
      return { shown: !!r && r.height > 0, h: r?.height, tiles: tiles.length, right: Math.max(...tiles.map((t) => t.right)), rows: new Set(tiles.map((t) => Math.round(t.top))).size, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    check(`the Last Stand bar: eight heroes in two rows (${w})`, bar.shown && bar.tiles === 8 && bar.rows === 2 && bar.right <= w && !bar.overflow && bar.h < 110, JSON.stringify(bar));
    await page.screenshot({ path: out('stand', w) });
    check(`no page errors (stand ${w})`, errors.length === 0, errors.join('|'));
    await ctx.close();
  }

// signature kits in action: the hero's pool kept full and skill 2 owed its turn, until what the skill leaves on the field is seen
const KITS = [
  ['werewolf-shift', ['werewolf', 'knight', 'cleric', 'archer', 'wizard'], 'werewolf', "(b, me) => me.look === 'werewolf_white' || me.look === 'werewolf_black'"],
  ['beastmaster-pack', ['beastmaster', 'knight', 'cleric', 'archer', 'wizard'], 'beastmaster', "(b, me) => b.units.filter((u) => u.alive && u.owner === me.id && u.taunt && u.taunt.until > b.t).length >= 1"],
  ['reaper-wraiths', ['reaper', 'knight', 'cleric', 'archer', 'wizard'], 'reaper', "(b, me) => b.units.some((u) => u.alive && u.def === 'wraith')"],
  ['time-witch-rewind', ['timeWitch', 'knight', 'cleric', 'archer', 'wizard'], 'timeWitch', "(b, me) => b.units.some((u) => u.kx && u.kx.hist && u.kx.hist.length === 0 && u !== me && u.side === 'hero')"],
  ['dread-pirate-kegs', ['dreadPirate', 'knight', 'cleric', 'archer', 'wizard'], 'dreadPirate', "(b, me) => b.pending.some((p) => p.kind === 'keg')"],
];
for (const [name, party, hero, seen] of KITS) {
  if (only && only !== 'kits' && only !== name) continue;
  const { ctx, page, errors } = await bootFight(393, 852, party, 30, 9);
  await start(page, 1200);
  const got = await page.evaluate(async ([hero, seen]) => {
    const test = eval(seen);
    const g = window.__game;
    const { b } = g;
    const me = b.units.find((u) => u.def === hero);
    for (let i = 0; i < 300; i++) {
      if (b.phase !== 'fight') return false;
      me.charge = 100;
      me.ks = { ...me.ks, at1: b.t, idle2: undefined, at2: undefined };
      // (the Time Witch needs a friend that has lost a lot lately; the Reaper a fallen foe near him)
      if (hero === 'timeWitch') for (const u of b.units) if (u.side === 'hero' && u !== me && u.alive && u.kx?.hist?.length > 4 && u.hp > u.maxHp * 0.6) u.hp = Math.round(u.maxHp * 0.4);
      if (hero === 'reaper' && i === 20) { const f = b.units.filter((u) => u.side === 'foe' && u.alive).sort((x, y) => Math.abs(x.u - me.u) + Math.abs(x.v - me.v) - (Math.abs(y.u - me.u) + Math.abs(y.v - me.v)))[0]; if (f) f.hp = 1; }
      if (test(b, me)) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  }, [hero, seen]);
  await page.waitForTimeout(350);
  await hold(page, true);
  await page.screenshot({ path: `docs/samples/hero-kits-${name}.png` });
  check(`${name} seen in a fight`, got);
  check(`no page errors (${name})`, errors.length === 0, errors.join('|'));
  await ctx.close();
}
await br.close(); s.close();
if (fails.length) { console.log('FAILED:', fails); process.exit(1); }
console.log('all ok');
