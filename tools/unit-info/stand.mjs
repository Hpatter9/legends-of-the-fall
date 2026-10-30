// The unit's info card in the Last Stand (UNIT-INFO, docs/notes/unit-info.md): a hold on a hero on the field and on a tray card in the deploy,
// and on a hero in a break, where the break's clock waits while the card is open.   node tools/unit-info/stand.mjs   (after `npm run web`)
import { createRequire } from 'node:module';
import { serve, HEROES } from '../battle-ui/lib.mjs';
import { enter } from '../stand/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = 8762;
const s = serve('out/web', PORT);
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const fails = [];
const check = (name, ok, info = '') => { console.log(ok ? 'ok  ' : 'FAIL', name, info); if (!ok) fails.push(name); };
const PARTY = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'ranger'];
const [w, h] = [393, 852];
const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
await page.goto(`http://localhost:${PORT}/?x=1`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.evaluate(([heroes]) => {
  localStorage.clear();
  const xp = Object.fromEntries(heroes.map((k) => [k, Math.round(30 * 34 * 35 * 4)]));
  localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), opened: ['tower', 'castle'], pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
  localStorage.setItem('lotf-tips-off', '1');
}, [PARTY]);
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => window.__game?.meta, {}, { timeout: 60000 });
await page.waitForTimeout(2000);
await page.evaluate(() => document.getElementById('tipSkip')?.click());
await enter(page);
await page.waitForTimeout(2500);
const open = () => page.evaluate(() => document.querySelector('.uiSheet:not([hidden]) .fsHead b')?.textContent ?? null);
const heroSpot = () => page.evaluate(([w, h]) => {
  const st = window.__game.stand;
  for (let y = 120; y < h - 220; y += 4) for (let x = 4; x < w; x += 4) { const u = st.unitAt(x, y); if (u && u.side === 'hero' && u.tag !== undefined) return { x, y, def: u.def }; }
  return null;
}, [w, h]);
const hold = async (p) => { await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(550); await page.mouse.up(); await page.waitForTimeout(250); };
const close = async () => { await page.mouse.click(w / 2, 20); await page.waitForTimeout(200); };
const st = () => page.evaluate(() => window.__game.stand.state.phase);
check('the Stand is at its deploy', (await st()) === 'deploy', await st());
let p = await heroSpot();
if (p) {
  await hold(p);
  check('a hold on a hero on the field opens its card', !!(await open()), String(await open()));
  await page.screenshot({ path: 'docs/samples/unit-info-stand-deploy.png' });
  await close();
}
const card = await page.evaluate(() => { const c = document.querySelector('.stMan'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
if (card) {
  await hold(card);
  check('a hold on a tray card opens its card', !!(await open()), String(await open()));
  await close();
}
// (on to a break: the first wave fought, at a high level)
await page.evaluate(() => { const s = window.__game.stand; s.debugJump(2, 30); });
await page.evaluate(() => document.querySelector('.stStart').click());
for (let i = 0; i < 120 && (await st()) !== 'break'; i++) await page.waitForTimeout(1000);
check('a break came', (await st()) === 'break', await st());
await page.waitForTimeout(1200);
p = await heroSpot();
if (p) {
  await hold(p);
  const t0 = await page.evaluate(() => window.__game.stand.state.b.t);
  await page.waitForTimeout(1500);
  const t1 = await page.evaluate(() => window.__game.stand.state.b.t);
  check('a hold on a hero in the break opens its card', !!(await open()), String(await open()));
  check('the break waits while the card is open', t0 === t1, `${t0} ${t1}`);
  await page.screenshot({ path: 'docs/samples/unit-info-stand-break.png' });
  await close();
  await page.waitForTimeout(600);
  const t2 = await page.evaluate(() => window.__game.stand.state.b.t);
  check('and runs again once it is closed', t2 > t1, `${t1} ${t2}`);
}
check('no page errors', errors.length === 0, errors.join(' | '));
await br.close();
s.close();
console.log(fails.length ? `${fails.length} failed` : 'all ok');
process.exit(fails.length ? 1 : 0);
