// Plays each way back to the camp from a fight in the real page and logs what the music is doing on the home screen
// (`__audioDebug()`): the track asked for, the loops sounding and any sting. Run after `npm run web`:
// `node tools/music-camp/probe.mjs [port]`. The rule it checks: off the board (the camp, any tab, or a map) no battle
// track and no victory music, whatever happened before.
import { createRequire } from 'node:module';
import { serve, calamityFight } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const port = Number(process.argv[2] ?? 8741);
const server = serve('out/web', port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'werewolf'];
// (the places' own tracks: anything else heard at the camp is a battle's, the triumph's or a scene's)
const PLACE_TRACKS = ['camp', 'tavern', 'deploy', 'tower', 'calmap'];
const results = [];
// (a list of the numbered paths below to run only those: `node tools/music-camp/probe.mjs 8741 1,4`)
const only = process.argv[3]?.split(',').map(Number);
const want = (n) => !only || only.includes(n);

async function boot() {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(300000);
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto(`http://localhost:${port}/?x=1`);
  await page.evaluate((heroes) => {
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: { knight: 5000, samurai: 5000 }, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['tower', 'castle', 'calamity'] }));
    localStorage.setItem('lotf-tips-off', '1');
    // (no cinematics: their own score is separate and would hold the fights)
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
    localStorage.setItem('legends.tips', JSON.stringify(['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'retry', 'recycle', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'autoReplay']));
  }, HEROES);
  await page.goto(`http://localhost:${port}/?seed=42`);
  await page.waitForFunction(() => window.__game && window.__game.b && !document.getElementById('loading')?.offsetParent, {}, { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await party(page);
  await page.mouse.click(5, 5);
  await page.waitForTimeout(300);
  return { ctx, page };
}
const music = (page) => page.evaluate(() => {
  const d = window.__audioDebug();
  return { homeUp: !document.getElementById('home').hidden, phase: window.__game.b.phase, track: d.track, level: Math.round(d.level * 100) / 100, sounding: d.sounding, sting: d.sting, place: d.place, battle: d.battle, fighting: d.fighting, victory: d.victory };
});
/** The party of five on the run's roster and the board (as the other shot scripts do). */
async function party(page) {
  await page.evaluate((party) => {
    const g = window.__game;
    g.run.roster = party.map((kind, i) => ({ id: i + 1, kind, grade: 1 }));
    g.run.nextId = party.length + 1;
    g.run.squad = party.map((_, i) => i + 1);
    g.newBattle();
    g.refresh();
  }, HEROES.slice(0, 5));
  await page.waitForTimeout(400);
}
async function fightNow(page) {
  if (await page.evaluate(() => document.getElementById('fight').disabled)) await party(page);
  await page.waitForFunction(() => !document.getElementById('fight').disabled);
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForFunction(() => window.__game.b.phase === 'fight');
  await page.waitForTimeout(300);
}
const weaken = (page) => page.evaluate(() => { for (const u of window.__game.b.units) if (u.side === 'foe') u.hp = 1; });
const strengthen = (page) => page.evaluate(() => { for (const u of window.__game.b.units) if (u.side === 'hero') u.hp = 1; else { u.hp = 99999; u.maxHp = 99999; } });
async function untilEnd(page, ms = 300000) {
  await page.waitForFunction(() => ['won', 'lost'].includes(window.__game.b.phase), {}, { timeout: ms });
}
function verdict(name, m) {
  const bad = m.homeUp && (!PLACE_TRACKS.includes(m.track) || m.sounding.some((t) => !PLACE_TRACKS.includes(t)) || m.sting === 'victory' || m.victory);
  results.push({ name, ok: !bad, reached: m.homeUp, ...m });
  // ('not home': the driver did not get back to the home screen, so the path says nothing either way)
  console.log(bad ? 'WRONG' : m.homeUp ? 'ok   ' : 'not home', name, JSON.stringify(m));
}
async function settle(page, ms = 4000) { await page.waitForTimeout(ms); }

/** Taps the visible button whose text matches, if any. */
const tap = (page, re) => page.evaluate((src) => { const b = [...document.querySelectorAll('button')].filter((x) => new RegExp(src).test(x.textContent.trim()) && x.offsetWidth > 0).pop(); b?.click(); return b?.textContent ?? null; }, re.source);
const homeNow = (page) => page.evaluate(() => document.getElementById('homeBtn').click());
/** Wins the run: straight to its last wave (the army's count of waves read from the home screen's run line), the foes
 *  weakened, stopping on the won battle's results. */
async function winRun(page) {
  await page.evaluate(() => {
    const g = window.__game;
    localStorage.setItem('legends.run', JSON.stringify(g.run));
    const info = g.home.hooks.runInfo();
    const last = Number(/wave \d+\/(\d+)/.exec(info?.label ?? '')?.[1] ?? 1);
    g.run.stage = last;
    g.newBattle();
    g.refresh();
  });
  await party(page);
  await fightNow(page);
  await weaken(page);
  await untilEnd(page);
  await page.waitForFunction(() => window.__audioDebug().victory || window.__audioDebug().sting === 'victory', {}, { timeout: 30000 }).catch(() => {});
  await page.waitForFunction(() => !document.getElementById('result').hidden, {}, { timeout: 30000 }).catch(() => {});
}
/** Taps on through the result screens until the home screen is up: the result's own button, then the run recap's way on
 *  (called straight: its hero reveals are taps of their own, and the music only hears what `afterResult` does). */
async function onHome(page) {
  await page.waitForFunction(() => !document.getElementById('result').hidden || !document.getElementById('home').hidden, {}, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log('      the result', JSON.stringify(await music(page)));
  await page.evaluate(() => document.getElementById('next').click());
  await page.waitForTimeout(2000);
  if (!(await music(page)).homeUp && !(await page.evaluate(() => document.getElementById('recap').hidden))) {
    console.log('      the run recap', JSON.stringify(await music(page)));
    await page.evaluate(() => { document.getElementById('recap').hidden = true; window.__game.afterResult(); });
    await page.waitForTimeout(1500);
  }
}

// 1. Home mid-fight (the fight runs on behind the camp), then the wave won behind the camp
if (want(1)) {
  const { ctx, page } = await boot();
  await fightNow(page);
  await page.waitForTimeout(1500);
  await homeNow(page);
  await settle(page);
  verdict('army wave: Home mid-fight', await music(page));
  await weaken(page);
  await untilEnd(page);
  await settle(page, 3000);
  verdict('army wave: Home mid-fight, the wave ends behind the camp', await music(page));
  await ctx.close();
}
// 3. A wave won, Home from its result
if (want(3)) {
  const { ctx, page } = await boot();
  await fightNow(page);
  await weaken(page);
  await untilEnd(page);
  await settle(page, 2500);
  await homeNow(page);
  await settle(page);
  verdict('army wave won: Home from the result', await music(page));
  await ctx.close();
}
// 4. The whole run won: the results' own button home; and Home straight from the results
if (want(4)) for (const via of ['results', 'homeBtn']) {
  const { ctx, page } = await boot();
  await winRun(page);
  console.log('      run won, the results', JSON.stringify(await music(page)));
  if (via === 'homeBtn') await homeNow(page);
  else await onHome(page);
  await settle(page);
  verdict(`army run won: home via ${via}`, await music(page));
  await ctx.close();
}
// 5. A run lost (no heart left), then home
if (want(5)) {
  const { ctx, page } = await boot();
  await page.evaluate(() => { window.__game.run.retries = 2; });
  await fightNow(page);
  await strengthen(page);
  await untilEnd(page);
  await settle(page, 2500);
  await onHome(page);
  await settle(page);
  verdict('army run lost: home', await music(page));
  await ctx.close();
}
// 6. Auto-replay: Home while its fight runs
if (want(6)) {
  const { ctx, page } = await boot();
  await page.evaluate(() => {
    const g = window.__game;
    const id = g.run.mode.army;
    const waves = Number(/wave \d+\/(\d+)/.exec(g.home.hooks.runInfo()?.label ?? '')?.[1] ?? 10);
    g.meta.armies[id] = { ...(g.meta.armies[id] ?? { stars: {} }), waves, best: waves, won: waves, clears: 1 };
    g.beginAuto(id, g.run.mode.tier ?? 0, 3);
  });
  await page.waitForFunction(() => window.__game.b.phase === 'fight', {}, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);
  console.log('      auto-replay fighting', JSON.stringify(await music(page)));
  await homeNow(page);
  await settle(page);
  verdict('auto-replay: Home mid-fight', await music(page));
  await ctx.close();
}
// 7. The daily: Home mid-fight
if (want(7)) {
  const { ctx, page } = await boot();
  await homeNow(page);
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__game.home.hooks.onDaily());
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('.dayCard button.primary')?.click());
  await page.waitForTimeout(1200);
  await fightNow(page);
  await page.waitForTimeout(1200);
  console.log('      daily fighting', JSON.stringify(await music(page)));
  await homeNow(page);
  await settle(page);
  verdict('daily: Home mid-fight', await music(page));
  await ctx.close();
}
// 8. The Last Stand: leave mid-wave; and the king's fall, then Home from its end card
if (want(8)) for (const how of ['leave', 'fall']) {
  const { ctx, page } = await boot();
  await homeNow(page);
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('hmTower')?.click());
  await page.waitForTimeout(2500);
  await tap(page, /^Auto fill$/);
  await page.waitForTimeout(300);
  await tap(page, /^To the keep$/);
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.querySelector('.stStart')?.click());
  await page.waitForTimeout(3000);
  console.log('      Last Stand on', JSON.stringify(await music(page)));
  if (how === 'leave') {
    await page.evaluate(() => document.querySelector('.stLeave')?.click());
    await page.waitForTimeout(500);
    await tap(page, /^Leave$/);
  } else {
    await page.evaluate(() => document.querySelector('.stLeave')?.click());
    await page.waitForTimeout(500);
    await tap(page, /^Give up$/);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((x) => x.textContent.trim() === 'Stand again' && x.offsetWidth > 0), {}, { timeout: 90000 }).catch(() => {});
    console.log('      Last Stand over', JSON.stringify(await music(page)));
    await page.evaluate(() => { const again = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Stand again'); [...(again?.parentElement?.children ?? [])].find((x) => x.textContent.trim() === 'Home')?.click(); });
  }
  await settle(page);
  verdict(`Last Stand: ${how === 'leave' ? 'left mid-wave' : 'given up, Home from the end card'}`, await music(page));
  await ctx.close();
}
// 9. A Calamity spot: Home mid-fight, and the map
if (want(9)) {
  const { ctx, page } = await boot();
  await calamityFight(page).catch((e) => console.log('      the Calamity could not be entered:', e.message));
  await party(page).catch(() => {});
  await fightNow(page);
  await page.waitForTimeout(1500);
  console.log('      Calamity fighting', JSON.stringify(await music(page)));
  await homeNow(page);
  await settle(page);
  verdict('Calamity: Home mid-fight', await music(page));
  await ctx.close();
}
console.log(JSON.stringify(results.map((r) => [r.name, r.ok])));
await browser.close();
server.close();
