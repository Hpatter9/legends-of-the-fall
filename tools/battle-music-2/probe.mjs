// Plays an army run through its boss wave in the real page and logs what the music does each second (`__audioDebug()`): the
// battle track on the waves before, the boss track crossfading in for the boss's wave, the battle track back after it, and the
// victory fanfare at the end. Run after `npm run web`: `node tools/battle-music-2/probe.mjs [port]` (Chromium at 393x852).
import { createRequire } from 'node:module';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const port = Number(process.argv[2] ?? 8742);
const shots = process.argv[3] ?? null;
const server = serve('out/web', port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'];
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true });
const page = await ctx.newPage();
page.setDefaultTimeout(120000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
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
const t0 = Date.now();
const log = async (what) => {
  const m = await page.evaluate(() => {
    const d = window.__audioDebug();
    return { stage: window.__game.run.stage, phase: window.__game.b.phase, track: d.track, sounding: d.sounding, sting: d.sting, battle: d.battle };
  });
  console.log(`${String(Math.round((Date.now() - t0) / 1000)).padStart(3)}s ${what.padEnd(26)} ${JSON.stringify(m)}`);
  return m;
};
/** Puts the run on wave `w` with the party on the board. */
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
async function fightWave(label, secs = 4) {
  await page.waitForFunction(() => !document.getElementById('fight').disabled);
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForFunction(() => window.__game.b.phase === 'fight');
  for (let i = 0; i < secs; i++) { await page.waitForTimeout(1000); await log(`${label}: fighting`); }
  await page.evaluate(() => { for (const u of window.__game.b.units) if (u.side === 'foe') u.hp = 1; });
  await page.waitForFunction(() => ['won', 'lost'].includes(window.__game.b.phase), {}, { timeout: 120000 });
  for (let i = 0; i < 4; i++) { await page.waitForTimeout(1000); await log(`${label}: won`); }
}
// (the Orc Warband, the run this save starts on: 15 waves, its bosses on waves 8 and 15)
console.log('run', JSON.stringify(await page.evaluate(() => window.__game.run.mode)));
const waves = 15;
const bw = 8;
await toWave(bw - 1);
await log('deploy before');
await fightWave(`wave ${bw - 1}`);
await toWave(bw);
await log('deploy, boss wave');
if (shots) await page.screenshot({ path: `${shots}/boss-wave-393.png` });
await fightWave(`wave ${bw} (boss)`, 5);
if (bw < waves) {
  await toWave(bw + 1);
  await log('deploy after the boss');
  await fightWave(`wave ${bw + 1}`, 3);
}
await toWave(waves);
await fightWave(`wave ${waves} (last)`, 2);
for (let i = 0; i < 4; i++) { await page.waitForTimeout(1000); await log('the results'); }
const real = errors.filter((e) => !/outside nominal range/.test(e));
console.log(real.length ? `console: ${real.slice(0, 3).map((e) => e.slice(0, 400)).join(' || ')}` : 'no console errors (the cue synth\'s clamped-frequency warnings aside)');
await browser.close();
server.close();
