// ROUND4-WIRE (docs/notes/round4-wire.md): round 4's art in the game at 393 x 852, into docs/samples/round4-wire/: Duchess in the camp with
// each free cosmetic, the quest guests in a fight (front and back), the Machine's sentry turrets and the Pirate's Broadside with its ghost
// ship. Voltara's aftermath is filmed by tools/eidolon-call-2/shots.mjs. Fails on a page error.
//
//   npm run web && node tools/round4-wire/shots.mjs
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { serve } from '../audit/lib.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const exe = ['/opt/pw-browsers/chromium'].find((p) => existsSync(p));
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const dir = 'docs/samples/round4-wire';
mkdirSync(dir, { recursive: true });
const srv = serve('out/web');
const base = `http://localhost:${srv.address().port}/`;
const errors = [];
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'rifleBot', 'arcBlade', 'siegeBot', 'juggernaut', 'buccaneer', 'kraken', 'corsairSurgeon', 'harpooner'];

async function open(settings = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(([heroes, settings]) => {
    try {
      localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 4000, stones: 0, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 5, barracks: 5, armoury: 5, mageTower: 4, stable: 5, library: 5 }, shards: {}, stars: {}, xp: Object.fromEntries(heroes.map((k) => [k, 60000])), bestStage: 30, tower: 0, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], tutorials: ['shop', 'recruit', 'pause','autoMerge','traitPerks','spellSlots','daily','eidolons','castle','autoRunes','nemesis','chapel','talents','secondSkill','duels','warHorn','ultimates','autoPlace','tavern','summoning','council','hunts','spare','tiers','shop'], scenes: ['opening'], duchessTaps: 5, duchessLucky: true, duchessHay: true }));
      localStorage.setItem('lotf-tips-off', '1');
      localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, quips: false, music: 0, effects: 0, ...settings }));
    } catch {}
  }, [HEROES, settings]);
  await page.goto(base);
  await page.waitForSelector('#home:not([hidden])', { timeout: 30000 });
  await page.waitForTimeout(2500);
  await clear(page);
  return { ctx, page };
}
/** Clears any card still up (a tutorial, a notice): its primary button, a few times. */
async function clear(page) {
  for (let i = 0; i < 6; i++) {
    const b = page.locator('.omVeil:not([hidden]) .omPrimary, #tutorialCard .omPrimary').first();
    if (!(await b.isVisible().catch(() => false))) break;
    await b.click().catch(() => {});
    await page.waitForTimeout(300);
  }
}
const shot = (page, name, clip) => page.screenshot({ path: `${dir}/${name}.png`, ...(clip ? { clip } : {}) });

/** A fight against the orcs with this party, deployed; `fight` starts it. */
async function fight(page, party) {
  await page.evaluate((party) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'orcs' }, stage: 1, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, party);
  await page.waitForTimeout(900);
  await clear(page);
}
/** A close crop round the units matching `pick` (their sprites' places on the screen). */
async function around(page, pick, pad = 60) {
  const box = await page.evaluate((pick) => {
    const g = window.__game;
    const c = document.querySelector('canvas').getBoundingClientRect();
    const pts = g.b.units.filter((u) => u.alive && new Function('u', `return ${pick}`)(u)).map((u) => g.sprites.get(u.id)?.root?.getGlobalPosition()).filter(Boolean);
    if (!pts.length) return null;
    const xs = pts.map((p) => p.x + c.left), ys = pts.map((p) => p.y + c.top);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }, pick);
  if (!box) return undefined;
  const x = Math.max(0, Math.floor(box.x0 - pad)), y = Math.max(0, Math.floor(box.y0 - pad * 1.5));
  return { x, y, width: Math.min(393 - x, Math.ceil(box.x1 - box.x0 + pad * 2)), height: Math.min(852 - y, Math.ceil(box.y1 - box.y0 + pad * 2)) };
}

// 1. Duchess in the camp with each free cosmetic (the crown still drawn by hand), and a close crop of her
for (const hat of ['wizard', 'quiver', 'crown', 'none']) {
  const { ctx, page } = await open({ duchessHat: hat });
  await shot(page, `camp-${hat}`);
  await ctx.close();
}

// 2. The quest guests in a fight: deployed (the deploy shows the party from behind), then a moment into it
{
  const { ctx, page } = await open();
  await fight(page, ['guestCarter', 'guestPilgrim', 'guestBosun', 'guestEnvoy', 'guestPrisoner']);
  await shot(page, 'guests-deploy');
  const c1 = await around(page, "u.side === 'hero'");
  if (c1) await shot(page, 'guests-deploy-close', c1);
  await page.evaluate(() => document.getElementById('fight').click());
  await clear(page);
  await page.waitForTimeout(2200);
  const c2 = await around(page, "u.side === 'hero'");
  await shot(page, 'guests-fight');
  if (c2) await shot(page, 'guests-fight-close', c2);
  await ctx.close();
}

// 3. The Machine's sentry turrets (four Machines), as they unfold and as they fire
{
  const { ctx, page } = await open();
  await fight(page, ['rifleBot', 'arcBlade', 'siegeBot', 'juggernaut', 'knight']);
  await page.evaluate(() => document.getElementById('fight').click());
  await clear(page);
  for (const [ms, name] of [[700, 'sentry-1'], [2500, 'sentry-2']]) {
    await page.waitForTimeout(ms);
    const c = await around(page, "u.pk?.raised === 'sentry'", 70);
    await shot(page, name);
    if (c) await shot(page, `${name}-close`, c);
  }
  console.log('sentries', await page.evaluate(() => window.__game.b.units.filter((u) => u.pk?.raised === 'sentry').length));
  await ctx.close();
}

// 4. The Pirates' Broadside (four Pirates): 5 seconds into the wave, the ghost ship over the raked file, at rest and then firing
{
  const { ctx, page } = await open();
  await fight(page, ['buccaneer', 'kraken', 'corsairSurgeon', 'harpooner', 'knight']);
  // (the moment the beat shows the ship: its drawer is watched)
  await page.evaluate(() => { const g = window.__game; const f = g.fx.showProp.bind(g.fx); window.__ship = 0; g.fx.showProp = (art, x, y, o) => { if (String(art).startsWith('pirate-ghost-ship')) window.__ship = performance.now(); return f(art, x, y, o); }; });
  await page.evaluate(() => document.getElementById('fight').click());
  await clear(page);
  await page.waitForFunction(() => window.__ship > 0, null, { timeout: 30000 });
  await shot(page, 'broadside-rest');
  await page.waitForFunction(() => performance.now() - window.__ship > 900, null, { timeout: 5000 });
  await shot(page, 'broadside-fire');
  await ctx.close();
}

await browser.close();
srv.close();
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
if (errors.length) process.exit(1);
