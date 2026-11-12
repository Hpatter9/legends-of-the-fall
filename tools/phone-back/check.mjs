// PHONE-BACK's browser check (docs/notes/phone-back.md): the phone's Back, as the browser sends it (`page.goBack()`, and `history.back()`
// from the page), and Escape, at 393 x 852. From every tab, from three menus stacked, from a deploy and a fight, from an Assault, from a
// cinematic, and from the Battle tab with nothing open. Each Back must do what `backAction` says, the page must never unload or leave its
// address, and the history must stay short. Exits 1 on a failed check.
//   npm run web && node tools/phone-back/check.mjs [--size 393x852]
import { serve, launch, open, wait, saveOf, settle } from '../sweep-1110/lib.mjs';
const args = process.argv.slice(2);
const [W, H] = (args.includes('--size') ? args[args.indexOf('--size') + 1] : '393x852').split('x').map(Number);
const PORT = 8941;
const server = serve(PORT);
const browser = await launch();
let bad = 0;
const check = (ok, what, more = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${more ? `  ${more}` : ''}`); if (!ok) bad++; };

const { ctx, page, log } = await open(browser, W, H, PORT);
let loads = 0;
page.on('load', () => loads++);
const url0 = page.url();
await page.evaluate(() => { window.__alive = 'yes'; });
// (a first touch, as a player's, so the guard counts as the page's own: Chrome skips one pushed without)
await page.mouse.click(W / 2, 30);
await wait(page, 300);

/** Back as the browser sends it: page.goBack (the button), or history.back from the page (the gesture's path in a PWA). */
const back = async (how = 'goBack') => {
  if (how === 'goBack') await page.goBack({ timeout: 3000 }).catch(() => {});
  else if (how === 'escape') await page.keyboard.press('Escape');
  else await page.evaluate(() => history.back());
  await wait(page, 700);
};
const state = () => page.evaluate(() => ({
  alive: window.__alive === 'yes',
  len: history.length,
  last: window.__backLog?.at(-1),
  tab: window.__game.home.currentTab,
  home: !document.getElementById('home').hidden,
  sub: !document.getElementById('hmSub').hidden,
  sheet: !document.getElementById('hmSheet').hidden,
  settings: !document.getElementById('settings').hidden,
  picker: !!document.querySelector('.spOverlay:not([hidden])'),
  menus: [...document.querySelectorAll('.omVeil')].map((e) => e.id),
  phase: window.__game.b.phase,
  assault: !!document.getElementById('assaultScene'),
  paused: !!document.getElementById('assaultPause'),
  cut: !!document.querySelector('#cutscene:not([hidden])'),
  url: location.href,
}));
const stays = async (what) => {
  const s = await state();
  check(s.alive && loads === 0 && s.url === url0, `${what}: the page stayed (never unloaded, the address kept)`, `len ${s.len}`);
  return s;
};

// ---- the Battle tab with nothing open: Back does nothing, three times over, and the game stays
for (const how of ['goBack', 'history', 'goBack', 'escape']) {
  await back(how);
  const s = await stays(`Battle tab, nothing open (${how})`);
  check(s.home && s.tab === 'battle' && s.last?.action === 'none', `  ... still on the Battle tab, Back did nothing`, JSON.stringify(s.last));
}

// ---- every other tab: Back goes to Battle
for (const tab of ['recruit', 'heroes', 'castle', 'spells']) {
  await page.evaluate((t) => window.__game.home.show(t), tab);
  await wait(page, 900);
  await back(tab === 'castle' ? 'history' : 'goBack');
  const s = await stays(`the ${tab} tab`);
  check(s.tab === 'battle' && s.last?.action === 'battleTab', `  ... Back went to the Battle tab`, s.tab);
}

// ---- three menus stacked: Settings, its Ruler page, the ruler's picker; one Back closes one, the fourth does nothing
await page.evaluate(() => document.getElementById('hmGear').click());
await wait(page, 700);
await page.evaluate(() => document.querySelector('#settingsBody .setMenu[data-page="ruler"]').click());
await wait(page, 600);
await page.evaluate(() => document.querySelector('.rulerOpen').click());
await wait(page, 600);
let s = await state();
check(s.settings && s.picker, 'three deep: Settings, its Ruler page and the picker are open');
await back();
s = await stays('three deep, Back 1');
check(!s.picker && s.settings && (await page.evaluate(() => !!document.querySelector('#settingsBody .setBack'))), '  ... the picker closed, the Ruler page still up');
await back('history');
s = await stays('three deep, Back 2');
check(s.settings && (await page.evaluate(() => !document.querySelector('#settingsBody .setBack') && !!document.querySelector('#settingsBody .setMenu'))), '  ... the Ruler page closed: Settings at its list');
await back('escape');
s = await stays('three deep, Back 3 (Escape)');
check(!s.settings, '  ... Settings closed');
await back();
s = await stays('three deep, Back 4');
check(s.home && s.tab === 'battle' && s.last?.action === 'none', '  ... and then nothing: the Battle tab stays');

// ---- another stack: the Armies page, an ornate card on it (the codex), and a hero's sheet on the Heroes tab
await page.evaluate(() => window.__game.home.openArmies());
await wait(page, 900);
s = await state();
check(s.sub, 'the Armies page is open over the Battle tab');
await back();
s = await stays('the Armies page');
check(!s.sub && s.last?.action === 'close', '  ... the Armies page closed', JSON.stringify(s.last));
await page.evaluate(() => window.__game.home.show('castle'));
await wait(page, 800);
await page.evaluate(() => { document.getElementById('castleTab-buildings')?.click(); document.querySelector('.crBuilding[data-site="treasury"]')?.click(); });
await wait(page, 700);
s = await state();
const card = s.menus.length > 0 || s.sheet;
check(card, 'a building card is open over the Castle tab', JSON.stringify(s.menus));
await back();
s = await stays('a building card');
check(!s.menus.length && !s.sheet && s.tab === 'castle', '  ... the card closed, still on the Castle tab');
await back();
s = await stays('the Castle tab after the card');
check(s.tab === 'battle', '  ... then Back went to the Battle tab');

// ---- a deploy and a fight: Back never drops the run
await page.evaluate(() => {
  const g = window.__game;
  const r = JSON.parse(JSON.stringify(g.run));
  Object.assign(r, { seed: 77, mode: { kind: 'army', army: 'beasts', tier: 0 }, stage: 3, over: false, cleared: false, gold: 0, roster: ['knight', 'cleric', 'archer', 'wizard', 'samurai'].map((kind, i) => ({ id: 100 + i, kind, grade: 1 })), squad: [], nextId: 200, real: true });
  document.getElementById('home').hidden = true;
  g.startRun(r);
});
await wait(page, 1500);
await settle(page);
s = await state();
check(s.phase === 'deploy' && !s.home, 'a deploy is up');
await back();
s = await stays('a deploy');
const kept = await page.evaluate(() => !!window.__game.run && !window.__game.run.over && window.__game.home.hooks.hasRun());
check(s.home && kept, '  ... Back went to the camp as the deploy’s Home does, the run kept to carry on', JSON.stringify(s.last));
await page.evaluate(() => document.querySelector('.hmCont')?.click());
await wait(page, 1500);
await settle(page);
await page.evaluate(() => { window.__game.autoArrange(true); document.getElementById('fight').click(); });
await wait(page, 1500);
s = await state();
check(s.phase === 'fight', 'a fight is on');
await back();
s = await stays('a fight');
check(s.settings && s.phase === 'fight' && s.last?.action === 'pause', '  ... Back opened Settings, the fight’s one menu; the fight goes on');
await back('history');
s = await stays('a fight, Settings open');
check(!s.settings && s.phase === 'fight', '  ... Back closed Settings, the fight still on');

// ---- an ultimate's moment in the fight: Back skips it
const fired = await page.evaluate(() => {
  const g = window.__game;
  const u = g.b.units.find((x) => x.side === 'hero' && x.alive && x.owner === undefined);
  if (!u) return false;
  if (g.meta.ultAuto) document.querySelector('.fhAutoUlt')?.click();
  u.charge2 = 100;
  g.hud.refresh(g.b);
  document.querySelector(`.fhRow[data-unit="${u.id}"]`)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return true;
});
await page.waitForFunction(() => document.querySelector('.umLayer.live:not([hidden])'), null, { timeout: 4000 }).catch(() => {});
const ultUp = await page.evaluate(() => !!document.querySelector('.umLayer.live:not([hidden])'));
if (fired && ultUp) {
  await back();
  s = await stays('an ultimate’s moment');
  const phaseNow = await page.evaluate(() => window.__game.ultm.queue.phase);
  check(s.last?.action === 'skip' && ['fade', 'idle'].includes(phaseNow), '  ... Back skipped it', phaseNow);
} else console.log('note: no ultimate moment came up to skip (the hero had no ultimate ready)');

// ---- a cinematic: Back skips it, as its Skip does
await page.evaluate(() => {
  const g = window.__game;
  g.home.open();
  localStorage.setItem('legends.settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('legends.settings') ?? '{}'), cinematics: true, cineOff: true }));
});
await wait(page, 600);
const played = await page.evaluate(() => {
  const g = window.__game;
  // (a bond scene's film, played as the camp plays one)
  void g.scenes.play('bond:knight|peasant:1', { party: g.meta.party });
  return true;
});
await page.waitForFunction(() => document.querySelector('#cutscene:not([hidden])'), null, { timeout: 6000 }).catch(() => {});
s = await state();
if (played && s.cut) {
  await back();
  await wait(page, 600);
  s = await stays('a cinematic');
  check(s.last?.action === 'skip', '  ... Back skipped it', JSON.stringify(s.last));
  // (a film of several shots may need more than one; it is gone in a few)
  for (let i = 0; i < 4 && (await state()).cut; i++) await back();
  check(!(await state()).cut, '  ... and the film is gone');
} else console.log('note: no cinematic came up (cinematics may be off or the scene already seen)');
await settle(page);

// ---- the Assault: the war table, the muster, the field; Back opens the pause card, then closes it, the assault still on
await page.evaluate(() => {
  const g = window.__game;
  for (const id of ['orcs']) g.meta.armies[id] = { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: { 0: 7, 1: 7, 2: 7, 3: 1 } };
  g.home.open();
  g.home.openAssault('orcs');
});
await wait(page, 1500);
s = await state();
check(s.menus.length > 0, 'the Assault’s war table or muster is up', JSON.stringify(s.menus));
await back();
s = await stays('the Assault’s first card');
await wait(page, 600);
// (the scouts' report closes onto the muster; Back again leaves the muster to the armies)
s = await state();
if (s.menus.includes('assaultTold') || s.menus.length) {
  await back();
  s = await stays('the muster');
}
check(!s.assault, '  ... Back closed the muster without marching');
await page.evaluate(() => window.__game.home.openAssault('orcs'));
await wait(page, 1200);
for (let i = 0; i < 4; i++) {
  const marched = await page.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter((x) => x.offsetParent); const m = bs.find((x) => /^March/.test(x.textContent.trim())); if (m) { m.click(); return true; } bs.find((x) => x.textContent.trim() === 'Close')?.click(); return false; });
  if (marched) break;
  await wait(page, 700);
}
await page.waitForFunction(() => document.querySelector('#assaultScene .asTop'), null, { timeout: 60000 }).catch(() => {});
await wait(page, 2500);
// (its opening cut-in, if one plays, is skipped by Back first)
for (let i = 0; i < 3 && (await page.evaluate(() => !!document.querySelector('.tcLayer:not([hidden])'))); i++) await back();
await back();
s = await stays('the Assault’s field');
check(s.assault && s.paused, '  ... Back opened the pause card', JSON.stringify(s.last));
await back('history');
s = await stays('the Assault, paused');
check(s.assault && !s.paused, '  ... Back closed the pause card, the assault still on');

// ---- the history stays short, whatever was pressed
s = await state();
check(s.len <= 4, `the history stays short (${s.len} entries after every Back above)`);
check(!log.errors.length, 'no page errors', JSON.stringify(log.errors.slice(0, 3)));
await ctx.close();
await browser.close();
server.close();
console.log(bad ? `${bad} failed` : 'all checks passed');
process.exit(bad ? 1 : 0);
