// The battle music in the real page through an army run's fights (docs/notes/sound-pass.md): every quarter second of a plain wave
// and of the boss's wave, what the music is doing (`__audioDebug()`): the track, its level, the music bus, the ducker's gain and
// low-pass, the player's own low-pass. Prints the samples' averages and extremes for each fight. Run after `npm run web`:
// `node tools/sound-pass/fight-probe.mjs [port] [root]` (Chromium at 393x852; `root` is the built page, out/web by default).
import { createRequire } from 'node:module';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const port = Number(process.argv[2] ?? 8743);
const server = serve(process.argv[3] ?? 'out/web', port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'];
const page = await (await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true })).newPage();
page.setDefaultTimeout(120000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${port}/?x=1`);
await page.evaluate((heroes) => {
  localStorage.clear();
  localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['tower', 'castle', 'calamity'] }));
  localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
  localStorage.setItem('legends.tips', JSON.stringify(['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'retry', 'recycle', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'autoReplay']));
}, HEROES);
await page.goto(`http://localhost:${port}/?seed=42`);
await page.waitForFunction(() => window.__game && window.__game.b && !document.getElementById('loading')?.offsetParent, {}, { timeout: 60000 });
await page.waitForTimeout(800);
await page.evaluate(() => document.getElementById('tipSkip')?.click());
await page.mouse.click(5, 5);
await page.waitForTimeout(3000);
const camp = await page.evaluate(() => window.__audioDebug());
async function toWave(w) {
  await page.evaluate(([w, party]) => {
    const g = window.__game;
    g.run.stage = w;
    g.run.roster = party.map((kind, i) => ({ id: i + 1, kind, grade: 1 }));
    g.run.nextId = party.length + 1;
    g.run.squad = party.map((_, i) => i + 1);
    g.newBattle();
    g.refresh();
  }, [w, HEROES]);
  await page.waitForTimeout(500);
}
const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
async function fightWave(label, secs) {
  await page.waitForFunction(() => !document.getElementById('fight').disabled);
  await page.evaluate(() => document.getElementById('fight').click());
  const samples = [];
  for (let i = 0; i < secs * 4; i++) {
    samples.push(await page.evaluate(() => window.__audioDebug()));
    await page.waitForTimeout(250);
  }
  // (the music's gain at the speakers, before its file's trim: the bus, the player's level for the track, the ducker)
  const gain = samples.map((d) => d.buses.music * d.level * d.duckGain);
  const duck = samples.map((d) => d.duckGain);
  const hz = samples.map((d) => d.duckHz ?? (d.duckGain < 0.99 ? 1400 : 20000));
  const avgDb = (xs) => db(xs.reduce((a, b) => a + b * b, 0) / xs.length) / 2;
  console.log(`${label}: track ${[...new Set(samples.map((d) => d.track))].join('/')}; music gain avg ${avgDb(gain).toFixed(1)} dB (min ${db(Math.min(...gain)).toFixed(1)}); duck avg ${avgDb(duck).toFixed(1)} dB, ducked ${(100 * duck.filter((x) => x < 0.99).length / duck.length).toFixed(0)} % of the time, lowest ${db(Math.min(...duck)).toFixed(1)} dB; duck low-pass min ${Math.round(Math.min(...hz))} Hz; player low-pass min ${Math.round(Math.min(...samples.map((d) => d.cutoff ?? 20000)))} Hz; reasons ${[...new Set(samples.flatMap((d) => d.ducked))].join(',') || 'none'}; fallback ${[...new Set(samples.flatMap((d) => d.fallback ?? []))].join(',') || 'none'}`);
  await page.evaluate(() => { for (const u of window.__game.b.units) if (u.side === 'foe') u.hp = 1; });
  await page.waitForFunction(() => ['won', 'lost'].includes(window.__game.b.phase), {}, { timeout: 120000 });
}
console.log(`deploy (no fight): music gain ${db(camp.buses.music * camp.level * camp.duckGain).toFixed(1)} dB, track ${camp.track}`);
await toWave(7);
await fightWave('wave 7', 8);
await toWave(8);
await fightWave('wave 8 (boss, its card)', 8);
console.log(errors.length ? `page errors: ${errors.slice(0, 3).join(' || ')}` : 'no page errors');
await browser.close();
server.close();
