// CODEX-TOPBAR's browser check (docs/notes/codex-topbar.md). The owner: "The top bar doesn't stay where it needs to on the codex and
// achievements screen": the Castle tab's sticky header showed through the Codex and the Achievements pages. After `npm run web`:
//   node tools/codex-topbar/check.mjs [before|after]
// At 393x852, 360x780 and 412x915 (`SIZES=412x915` for one) it opens every full page and card that goes over a tab, from every tab (the
// Castle at its top, scrolled part-way, and on its Buildings view), and fails if
//   - anything of the tab beneath (the pages, the top bar, the tab bar) can be seen or tapped inside the open page's box: every point of
//     a grid over it must hit-test into the page itself (the Castle's header, `.crNavigation`, is named when it is the one showing);
//   - the Codex's or the Achievements' own head ("‹ Back" and its title) moves as the page's content scrolls, or is not at the top;
//   - a Codex tab's label breaks over two lines or is cut;
//   - the page's own "‹ Back" does not close it, or the Castle's header is not back in its place, and tappable, once it has.
// Writes docs/samples/codex-topbar/<prefix>-<scene>-<w>.png for the owner's scenes. Exits 1 on a failed check.
import { serve, launch, open, wait, saveOf, SIZES, out } from '../sweep-1110/lib.mjs';
const prefix = process.argv[2] ?? 'after';
const PORT = 8957;
const server = serve(PORT);
const browser = await launch();
const dir = out('docs/samples/codex-topbar');
let bad = 0;
const check = (ok, what, more = '') => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${more ? `  ${more}` : ''}`); };

const TABS = ['recruit', 'heroes', 'battle', 'castle', 'spells'];
const goTab = async (page, tab) => {
  await page.evaluate((i) => document.querySelectorAll('.hmTab')[i].click(), TABS.indexOf(tab));
  await wait(page, 900);
};
/** The Castle as the player may have left it: at its top, scrolled part-way, or on its Buildings view (scrolled too). */
const castleAt = async (page, how) => {
  await goTab(page, 'castle');
  await page.evaluate((how) => {
    if (how === 'buildings') document.getElementById('castleTab-buildings')?.click();
    const sc = document.querySelector('.crScroll');
    if (sc && how !== 'top') sc.scrollTop = 300;
  }, how);
  await wait(page, 400);
};
const click = (page, sel) => sel.startsWith('js:') ? page.evaluate(sel.slice(3)).then(() => true, () => false) : page.evaluate((sel) => { const e = [...document.querySelectorAll(sel)].find((x) => x.offsetParent); e?.click(); return !!e; }, sel);

/** What is open on top, and whether the tab beneath shows inside its box. The open page is the outermost box under the screen's centre
 *  that is not the home screen's own pages or bars; every 10 px point of its box must hit-test clear of those. */
const probe = (page) => page.evaluate(() => {
  const home = (e) => !!e?.closest('#hmPages, #hmTop, #hmTabs');
  let top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  // (a card a tab keeps inside its own page, such as the Castle's Trophies wall: the outermost fixed box round the centre)
  let inTab = null;
  for (let e = top; e && home(e); e = e.parentElement) if (e.closest('#hmPages') && getComputedStyle(e).position === 'fixed') inTab = e;
  if (inTab) top = inTab;
  else {
    if (!top || home(top)) return { root: null };
    while (top.parentElement && top.parentElement !== document.body && top.parentElement.id !== 'home') top = top.parentElement;
  }
  const under = (e) => home(e) && !top.contains(e) && (full || !!e.closest('#hmPages'));
  const r = top.getBoundingClientRect();
  // (a page that fills only the space between the bars, as the armies do, is weighed against the pages alone: the bars' edges meet it)
  const full = r.top <= 1 && r.bottom >= innerHeight - 1;
  const leaks = new Map();
  for (let y = Math.max(0, r.top) + 3; y < Math.min(innerHeight, r.bottom) - 1; y += 10)
    for (let x = Math.max(0, r.left) + 3; x < Math.min(innerWidth, r.right) - 1; x += 10) {
      const e = document.elementFromPoint(x, y);
      if (!under(e)) continue;
      const who = e.closest('.crNavigation') ? '.crNavigation (the Castle header)' : `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${[...e.classList].join('.')}`;
      const at = leaks.get(who) ?? { n: 0, y0: y, y1: y };
      at.n++; at.y1 = y;
      leaks.set(who, at);
    }
  const nav = [...document.querySelectorAll('.crNavigation')].find((n) => n.offsetParent && getComputedStyle(n).visibility !== 'hidden');
  const nr = nav?.getBoundingClientRect();
  const navSeen = !!nr && !!document.elementFromPoint(nr.left + nr.width / 2, nr.top + nr.height / 2)?.closest('.crNavigation');
  return { root: `${top.tagName.toLowerCase()}${top.id ? '#' + top.id : ''}${top.classList.length ? '.' + [...top.classList].join('.') : ''}`, box: [Math.round(r.top), Math.round(r.bottom)], leaks: [...leaks].map(([who, at]) => `${who} x${at.n} y${at.y0}-${at.y1}`), navSeen };
});
const covered = async (page, what) => {
  const p = await probe(page);
  if (!p.root) return check(false, `${what}: a page opened over the tab`, 'nothing on top');
  check(!p.leaks.length && !p.navSeen, `${what}: nothing of the tab beneath shows or takes a tap in ${p.root}`, p.leaks.slice(0, 4).join('; '));
  return p;
};

/** The Codex's or the Achievements' own head: at the top, the same place when the content is scrolled, and the content does scroll. */
const headStays = async (page, what) => {
  const head = () => page.evaluate(() => {
    const h = document.querySelector('#hmSub > header').getBoundingClientRect();
    const b = document.getElementById('hmSubBack').getBoundingClientRect();
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    const body = document.getElementById('hmSubBody');
    return { top: Math.round(h.top), bottom: Math.round(h.bottom), backHit: hit?.id === 'hmSubBack' || !!hit?.closest('#hmSubBack'), scroll: body.scrollTop, room: body.scrollHeight - body.clientHeight };
  });
  const a = await head();
  await page.evaluate(() => { const b = document.getElementById('hmSubBody'); b.scrollTop = Math.min(420, b.scrollHeight); });
  await wait(page, 250);
  const b = await head();
  check(a.top >= 0 && a.top < 40 && a.backHit, `${what}: its own head is at the top, "‹ Back" tappable`, `top ${a.top}`);
  check(b.top === a.top && b.bottom === a.bottom && b.backHit && (a.room < 8 || b.scroll > 0), `${what}: the head stays put while the content scrolls under it`, `scrolled ${b.scroll}, head ${a.top} -> ${b.top}`);
};
/** The page's own "‹ Back": it closes, and on the Castle tab the header is back at the top of the tab, tappable. */
const closes = async (page, what, castle) => {
  await click(page, '#hmSubBack');
  await wait(page, 400);
  const s = await page.evaluate(() => {
    const nav = [...document.querySelectorAll('.crNavigation')].find((n) => n.offsetParent);
    const nr = nav?.getBoundingClientRect();
    const pr = document.getElementById('hmPages').getBoundingClientRect();
    return { shut: document.getElementById('hmSub').hidden, navTop: nr ? Math.round(nr.top - pr.top) : null, navHit: !!nr && !!document.elementFromPoint(nr.left + 20, nr.top + 20)?.closest('.crNavigation') };
  });
  check(s.shut, `${what}: "‹ Back" closes it`);
  if (castle) check(s.navTop === 0 && s.navHit, `${what}: the Castle header is back at the top of the tab`, `top ${s.navTop}`);
};
/** A Codex tab's label is on one line and whole. */
const tabsFit = async (page, what) => {
  const broken = await page.evaluate(() => [...document.querySelectorAll('.cxTab')].filter((t) => {
    const r = document.createRange();
    r.selectNodeContents(t);
    const lines = new Set([...r.getClientRects()].map((q) => Math.round(q.top)));
    return lines.size > 1 || t.scrollWidth > t.clientWidth + 1;
  }).map((t) => t.textContent));
  const tr = await page.evaluate(() => { const t = document.querySelector('.cxTabs'); return t ? t.scrollWidth - t.clientWidth : 0; });
  check(!broken.length && tr <= 1, `${what}: every Codex tab's label is on one line and whole`, broken.join(', '));
};

for (const [w, h] of SIZES) {
  console.log(`---- ${w} x ${h}`);
  const { ctx, page, log } = await open(browser, w, h, PORT);
  const shot = (scene) => page.screenshot({ path: `${dir}/${prefix}-${scene}-${w}.png` });

  // ---- the Codex, from the Castle (its only door): at the top, scrolled part-way, and from the Buildings view
  for (const how of ['top', 'scrolled', 'buildings']) {
    const what = `Codex from the Castle (${how})`;
    await castleAt(page, how);
    await click(page, '.crCodex');
    await wait(page, 700);
    await covered(page, what);
    if (how !== 'buildings') await shot(`codex-${how}`);
    await tabsFit(page, what);
    await headStays(page, what);
    await covered(page, `${what}, scrolled`);
    if (how === 'top') await shot('codex-scrolled-page');
    // (each tab of the Codex, and an entry's sheet over it)
    if (how === 'top') {
      const n = await page.evaluate(() => document.querySelectorAll('.cxTab').length);
      for (let i = 0; i < n; i++) {
        const name = await page.evaluate((i) => { const t = document.querySelectorAll('.cxTab')[i]; t.click(); return t.textContent; }, i);
        await wait(page, 300);
        await covered(page, `Codex tab ${name}`);
        await tabsFit(page, `Codex tab ${name}`);
      }
      await page.evaluate(() => { document.querySelectorAll('.cxTab')[0].click(); });
      await wait(page, 300);
      await click(page, '.cxCard');
      await wait(page, 500);
      await covered(page, 'Codex entry sheet');
      await page.evaluate(() => document.querySelector('.cxOverlay')?.click());
      await wait(page, 300);
    }
    await closes(page, what, true);
  }

  // ---- the Achievements (the trophy in the top bar), from every tab; the Castle scrolled too
  for (const from of ['castle top', 'castle scrolled', 'castle buildings', 'battle', 'recruit', 'heroes', 'spells']) {
    const what = `Achievements from ${from}`;
    if (from.startsWith('castle')) await castleAt(page, from.split(' ')[1]);
    else await goTab(page, from);
    await click(page, '#hmTrophy');
    await wait(page, 700);
    await covered(page, what);
    if (from === 'castle top' || from === 'castle scrolled' || from === 'battle') await shot(`achievements-${from.replace(' ', '-')}`);
    await headStays(page, what);
    await covered(page, `${what}, scrolled`);
    await closes(page, what, from.startsWith('castle'));
  }

  // ---- the Castle's Trophies wall (a card of its own)
  for (const how of ['top', 'scrolled']) {
    await castleAt(page, how);
    await click(page, '.crTrophies');
    await wait(page, 700);
    await covered(page, `Trophies wall from the Castle (${how})`);
    if (how === 'top') await shot('trophies');
    await page.evaluate(() => [...document.querySelectorAll('.twOverlay button')].find((b) => /Close|✕|×/.test(b.textContent))?.click());
    await wait(page, 300);
    if (await page.evaluate(() => !!document.querySelector('.twOverlay:not([hidden])'))) await page.keyboard.press('Escape');
    await wait(page, 300);
  }

  // ---- every other full page and card over a tab: Settings from each tab, and each tab's own doors
  const doors = [
    ...TABS.map((t) => [t, '#hmGear', 'Settings']),
    ['castle', '.crWorks', 'the builders card'], ['castle', '.crBuilding', 'a building card'],
    ['heroes', '.ptHeroPick', 'the hero sheet'], ['heroes', '.ptRoster', 'All heroes'], ['heroes', '.ptRise', 'Upgrade'], ['heroes', '#ptTab1', 'Tavern services'],
    ['battle', '#hmBattle', 'the armies page'], ['battle', '#hmCouncil', 'the Council board'], ['battle', '#hmDaily', 'the Daily'], ['battle', '.cpPlate', 'the enemy plate'], ...TABS.map((t) => [t, 'js:window.__game.home.openQuests()', 'the quest log']),
    ['recruit', '.hlOdds', 'View heroes'], ['recruit', '.hlShop', 'the stall'], ['recruit', '.hlGallery', 'Pacts'], ['recruit', '.hlFold', 'Hero shards'], ['recruit', '.hlChain', 'the Summoner'],
    ['spells', '.rankUp', 'a spell rank up'],
  ];
  for (const [tab, sel, name] of doors) {
    // (whatever the last door left open is closed first, as the phone's Back closes it: Escape, layer by layer)
    for (let i = 0; i < 8 && (await probe(page)).root; i++) { await page.keyboard.press('Escape'); await wait(page, 450); }
    if ((await probe(page)).root || !(await page.evaluate(() => !document.getElementById('home').hidden))) {
      await page.goto(page.url().split('#')[0], { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
      await wait(page, 1200);
    }
    if (tab === 'castle') await castleAt(page, sel === '.crBuilding' ? 'buildings' : 'scrolled');
    else await goTab(page, tab);
    if (!(await click(page, sel))) { console.log(`skip ${name} from ${tab}: no ${sel} on this save`); continue; }
    await wait(page, 900);
    const p = await probe(page);
    if (!p.root) { console.log(`note ${name} from ${tab}: opens in the tab itself, nothing over it`); continue; }
    check(!p.leaks.length && !p.navSeen, `${name} from ${tab}: nothing of the tab beneath shows or takes a tap in ${p.root}`, p.leaks.slice(0, 4).join('; '));
  }
  check(!log.errors.length, `no page errors at ${w}`, log.errors.slice(0, 2).join(' | '));
  await ctx.close();

  // ---- the owner's Codex: six tabs (no Assault yet, so no Holds tab), each tab in turn
  const six = await open(browser, w, h, PORT, { save: { ...saveOf(), armies: {}, assault: undefined } });
  await castleAt(six.page, 'top');
  await click(six.page, '.crCodex');
  await wait(six.page, 700);
  const n = await six.page.evaluate(() => document.querySelectorAll('.cxTab').length);
  check(n === 6, 'the Codex without the Assault has six tabs', `${n}`);
  for (let i = 0; i < n; i++) {
    await six.page.evaluate((i) => document.querySelectorAll('.cxTab')[i].click(), i);
    await wait(six.page, 250);
    await tabsFit(six.page, `six tabs, tab ${i + 1}`);
  }
  await six.page.evaluate(() => document.querySelectorAll('.cxTab')[0].click());
  await covered(six.page, 'Codex with six tabs');
  await six.page.screenshot({ path: `${dir}/${prefix}-codex-six-tabs-${w}.png` });
  await headStays(six.page, 'Codex with six tabs');
  await six.ctx.close();
}
console.log(bad ? `${bad} check(s) FAILED` : 'all checks passed');
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
