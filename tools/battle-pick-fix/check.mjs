// BATTLE-PICK-FIX (docs/notes/battle-pick-fix.md): the Battle tab's way to choose a battle, checked in the states the owner meets it in.
// The owner's save is the model: three armies cleared, the Wildwood next, the War open (the Council over the Daily), a quest tracked.
// Each state is opened at each size and checked:
// - the bar under the scene and the "Choose your battle" button inside it, whole and above the nav bar;
// - the quest's chip and Continue whole too;
// - the Council's and the Daily's labels clear of their medallions;
// - the enemy's plaque with no line cut short.
// States: a first visit (the new army's banner up), a visit after (no banner), with a quest tracked or none, with a run going (Continue),
// back from another tab, back from a fight, and with reduced motion.
//   npm run web && node tools/battle-pick-fix/check.mjs [out dir] [--sizes 393x852,...]
// Writes <out>/<state>-<w>x<h>.png; exits 1 on a failed check.
import { serve, launch, wait, out, saveOf } from '../sweep-1110/lib.mjs';
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const SIZES = opt('--sizes', '393x852,360x780,412x915,412x780,412x1000,360x640').split(',').map((s) => s.split('x').map(Number));
const dir = out(args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) ?? 'out/battle-pick-fix');
const PORT = 8931;
const server = serve(PORT);
const browser = await launch();
let bad = 0;
const fails = [];

/** The owner's save: three armies cleared (the Wildwood next), 15 stars, the War open, a quest tracked (or none). */
function ownerSave({ quest = true } = {}) {
  const s = saveOf();
  const cleared = { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: { 0: 7, 1: 7, 2: 1 } };
  s.armies = { orcs: cleared, undead: cleared, beasts: { ...cleared, met: { 0: 7, 1: 1 } } };
  s.armySeen = ['orcs', 'undead', 'beasts', 'wildwood'];
  s.assault = { v: 1, troops: {}, conquered: {}, tries: {} };
  s.war = { v: 1, turn: 6, members: [], fallen: [], nextId: 1, news: [], musterSince: 0, trophies: 0 };
  if (quest) s.quests = { active: [{ id: 'lostHungerWood', progress: 0, took: 20261110 }], tracked: 'lostHungerWood', done: [] };
  return s;
}

/** Everything the check reads off the Battle page. */
const measure = (page) => page.evaluate(() => {
  const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
  const nav = r(document.getElementById('hmTabs'));
  const page = document.querySelector('.hm-battle');
  const front = page?.querySelector(':scope > .hmFront');
  const overlap = (a, b) => a && b && Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 1;
  const label = (slot, img) => {
    const p = document.querySelector(`.hm-battle ${slot} .cpPlace`);
    if (!p || !p.offsetParent) return null;
    const b = r(p.querySelector('.cpTag b'));
    const i = r(p.querySelector(img));
    return { place: r(p), label: b, icon: i, overlap: !!overlap(b, i), outside: !!(b && (b.b > r(p).b + 1 || b.t < r(p).t - 1)) };
  };
  const plate = document.querySelector('.hm-battle .cpPlate');
  const cut = plate ? [...plate.querySelectorAll('b, small, span')].filter((e) => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent.trim()) : null;
  return {
    W: innerWidth, H: innerHeight, nav,
    front: r(front), frontScroll: front ? front.scrollHeight - front.clientHeight : null,
    battle: r(document.getElementById('hmBattle')),
    quest: r(document.getElementById('hmQuest')),
    cont: r(page?.querySelector('.hmCont')),
    banner: !!page?.querySelector('.hmBanner'),
    plate: r(plate), plateText: plate?.textContent.replace(/\s+/g, ' ').trim(), cut,
    council: label('.cpCouncilSlot', '.cpCouncilBadge'),
    daily: label('.cpDailySlot', '.cpDailyIcon'),
  };
});

function judge(tag, m) {
  const no = (why) => { bad++; fails.push(`${tag}: ${why}`); console.log(`FAIL ${tag}: ${why}`); };
  const above = (x, name) => {
    if (!x) return no(`${name} missing`);
    if (x.h < 20) no(`${name} squashed to ${Math.round(x.h)} px`);
    if (x.b > m.nav.t + 0.5) no(`${name} runs ${Math.round(x.b - m.nav.t)} px under the nav bar`);
    if (x.l < -0.5 || x.r > m.W + 0.5) no(`${name} past the screen's edge`);
    if (m.front && (x.b > m.front.b + 0.5 || x.t < m.front.t - 0.5)) no(`${name} spills out of its bar (${Math.round(x.t)}..${Math.round(x.b)} in ${Math.round(m.front.t)}..${Math.round(m.front.b)})`);
  };
  above(m.front, 'the bar');
  above(m.battle, 'Choose your battle');
  if (m.quest) above(m.quest, 'the quest chip');
  if (m.cont) above(m.cont, 'Continue');
  if (m.frontScroll > 1) no(`the bar's content is ${m.frontScroll} px taller than the bar`);
  for (const [k, x] of [['Council', m.council], ['Daily', m.daily]]) {
    if (!x) continue;
    if (x.overlap) no(`${k}'s label sits under its medallion`);
    if (x.outside) no(`${k}'s label runs out of its button`);
  }
  if (m.cut?.length) no(`the plaque cuts short: ${JSON.stringify(m.cut)}`);
}

async function openAt(w, h, save, { reduced = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, serviceWorkers: 'block', reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((save) => {
    if (sessionStorage.getItem('bp-set')) return;
    sessionStorage.setItem('bp-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify(save));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, save);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await wait(page, 1800);
  await page.evaluate(() => { for (const s of ['#tipSkip', '.csSkip']) document.querySelector(s)?.click(); });
  return { ctx, page, errors };
}

const shot = async (page, tag) => { await page.screenshot({ path: `${dir}/${tag}.png` }); };

for (const [w, h] of SIZES) {
  const size = `${w}x${h}`;
  // (1) the first visit: the new army's banner is up
  let { ctx, page, errors } = await openAt(w, h, ownerSave());
  let m = await measure(page);
  console.log(`${size} first visit: banner ${m.banner}, bar ${Math.round(m.front?.t)}..${Math.round(m.front?.b)}, battle ${Math.round(m.battle?.t)}..${Math.round(m.battle?.b)}, nav ${Math.round(m.nav.t)}`);
  judge(`${size} first visit`, m);
  await shot(page, `1-first-${size}`);
  // (2) the next visit: the banner has been seen, the quest still tracked
  await page.reload();
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await wait(page, 1800);
  m = await measure(page);
  console.log(`${size} next visit: banner ${m.banner}, bar ${Math.round(m.front?.t)}..${Math.round(m.front?.b)}, battle ${Math.round(m.battle?.t)}..${Math.round(m.battle?.b)}, nav ${Math.round(m.nav.t)}`);
  judge(`${size} next visit`, m);
  await shot(page, `2-next-${size}`);
  // (3) back from another tab
  await page.evaluate(() => window.__game.home.show('castle'));
  await wait(page, 900);
  await page.evaluate(() => window.__game.home.show('battle'));
  await wait(page, 900);
  judge(`${size} back from a tab`, await measure(page));
  // (4) a run going: Continue beside it
  await page.evaluate(() => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 5, mode: { kind: 'army', army: 'wildwood', tier: 0 }, stage: 4, over: false, cleared: false, gold: 40, roster: ['knight', 'cleric', 'archer', 'wizard', 'samurai'].map((kind, i) => ({ id: 100 + i, kind, grade: 1 })), squad: [], nextId: 200, real: true });
    document.getElementById('home').hidden = true;
    g.startRun(r);
  });
  await wait(page, 1500);
  // (back home from the fight's deploy, the run kept)
  await page.evaluate(() => document.getElementById('homeBtn')?.click() ?? window.__game.home.open());
  await wait(page, 1500);
  await page.evaluate(() => window.__game.home.open());
  await wait(page, 1200);
  m = await measure(page);
  console.log(`${size} with a run: continue ${!!m.cont}, bar ${Math.round(m.front?.t)}..${Math.round(m.front?.b)}`);
  judge(`${size} with a run`, m);
  await shot(page, `3-run-${size}`);
  if (errors.length) { bad++; fails.push(`${size}: page errors ${errors.slice(0, 2)}`); }
  await ctx.close();
  // (5) no quest tracked, and (6) reduced motion with the quest
  ({ ctx, page, errors } = await openAt(w, h, ownerSave({ quest: false })));
  judge(`${size} no quest`, await measure(page));
  await ctx.close();
  ({ ctx, page, errors } = await openAt(w, h, ownerSave(), { reduced: true }));
  await page.reload();
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await wait(page, 1500);
  judge(`${size} reduced motion`, await measure(page));
  await shot(page, `4-reduced-${size}`);
  if (errors.length) { bad++; fails.push(`${size}: page errors ${errors.slice(0, 2)}`); }
  await ctx.close();
}
await browser.close();
server.close();
console.log(bad ? `\n${bad} failed:\n${fails.join('\n')}` : '\nall checks passed');
process.exit(bad ? 1 : 0);
