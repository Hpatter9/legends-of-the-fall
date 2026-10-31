// The binding played through from a ready save, then what the Sanctum shows (SANCTUM-TIDY's bug check). `node tools/sanctum-tidy/flow.mjs [port]`.
import { createRequire } from 'node:module';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const fails = [];
const port = Number(process.argv[2] ?? 9081);
const server = serve('out/web', port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const heroes = ['peasant', 'kunoichi', 'wizard'];
const m = { seed: 11, crowns: 900, stones: 0, unlocked: heroes, party: heroes, pulls: 0, castle: { treasury: 1, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(heroes.map((k) => [k, 3000])), bestStage: 1, tower: 0, daily: {}, bosses: ['orcChieftain', 'orcWarlord'], achievements: [], armies: { orcs: { waves: 15, best: 15, won: 15, clears: 1, stars: { 15: 3 } } }, armySeen: ['orcs', 'undead'], stash: [], scenes: ['opening'], heroesSeen: ['knight', 'samurai', 'archer', ...heroes], featuresTold: ['autoMerge', 'autoPlace'], quests: { chains: { askel: { part: 3, progress: 0 } }, pieces: ['emberHeart', 'kennelCollar', 'kennelBell'] }, eidolons: { horn: 640 } };
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(`http://localhost:${port}/?x=1`, { timeout: 180000 });
await page.evaluate((m) => { localStorage.clear(); localStorage.setItem('legends.meta', JSON.stringify(m)); localStorage.setItem('lotf-tips-off', '1'); localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, quips: false })); }, m);
await page.goto(`http://localhost:${port}/`, { timeout: 180000 });
await page.waitForFunction(() => document.getElementById("hmBattle"), {}, { timeout: 90000 });
await page.waitForTimeout(1500);
const state = async (what) => console.log(what, JSON.stringify(await page.evaluate(() => ({
  dot: [...document.querySelectorAll('.hmTab')].find((b) => b.textContent.includes('Recruit'))?.className,
  plaque: [...document.querySelectorAll('.hlChain')].filter((e) => e.checkVisibility()).map((e) => e.textContent),
  quests: JSON.parse(localStorage.getItem('legends.meta')).quests, eid: JSON.parse(localStorage.getItem('legends.meta')).eidolons, stones: JSON.parse(localStorage.getItem('legends.meta')).stones,
}))));
await page.evaluate(() => [...document.querySelectorAll('.hmTab')].find((b) => b.textContent.includes('Recruit')).click());
await page.waitForTimeout(1200);
await state('before');
await page.evaluate(() => document.querySelector('.hlChain').click());
for (let i = 0; i < 40 && !(await page.evaluate(() => document.querySelector('.ebLayer.end'))); i++) { await page.evaluate(() => document.querySelector('.ebLayer')?.click()); await page.waitForTimeout(800); }
await page.evaluate(() => document.querySelector('.ebGo').click());
await page.waitForTimeout(1500);
await page.evaluate(() => [...document.querySelectorAll('.rvCard button')].pop()?.click());
await page.waitForTimeout(1000);
await page.evaluate(() => document.querySelector('.ecnShut')?.click());
await page.waitForTimeout(1000);
await state('after bind');
await page.screenshot({ path: 'docs/samples/sanctum-after-bound-flow.png' });
await page.reload({ timeout: 180000 });
await page.waitForFunction(() => document.getElementById("hmBattle"), {}, { timeout: 90000 });
await page.waitForTimeout(1500);
await page.evaluate(() => [...document.querySelectorAll('.hmTab')].find((b) => b.textContent.includes('Recruit')).click());
await page.waitForTimeout(1500);
await state('after reload');
await page.screenshot({ path: '/dev/shm/sanctum-flow-reload.png' });
const last = await page.evaluate(() => ({ plaque: [...document.querySelectorAll('.hlChain')].filter((e) => e.checkVisibility()).length, dot: [...document.querySelectorAll('.hmTab')].find((b) => b.textContent.includes('Recruit')).classList.contains('new') }));
console.log(last.plaque || last.dot ? 'FAIL: something still waits at the Summoner after the binding' : 'ok   nothing waits at the Summoner after the binding');
await browser.close(); server.close();
