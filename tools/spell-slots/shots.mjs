// SPELL-SLOTS shots and checks (docs/notes/spell-slots.md). For each upright size:
//   fight-<n>      a fight with one, two, three and four slots open: only the open slots' orbs show, spread evenly (`spellRowGap`),
//   book-<n>       the spellbook with that many open: the shut slots wear the painted lock and the stars they open at,
//   notice         the second slot's unlock notice for a save that has just reached three stars,
//   tab-mark       the Spells tab's mark while an open slot stands empty,
//   refused        a spell refused because every open slot is full.
// Exits 1 on a failed check.
//
//   npm run web && node tools/spell-slots/shots.mjs          (SIZES=393 for one size)
import { mkdirSync } from 'node:fs';
import { serve, launch } from '../calmap/lib.mjs';

const ROOT = process.env.ROOT ?? 'out/web';
const OUT = process.env.OUT ?? 'docs/samples/spell-slots';
const PORT = 8143;
const ALL = [[393, 852], [360, 780], [412, 915]];
const SIZES = process.env.SIZES ? ALL.filter(([w]) => process.env.SIZES.split(',').includes(String(w))) : ALL;
mkdirSync(OUT, { recursive: true });
const PARTY = ['knight', 'cleric', 'archer', 'wizard', 'samurai'];
const QUIET = '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }';
const ARMIES = ['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal'];

/** A save with this many army stars (three an army), the new rule's loadout unless one is given. */
function metaOf(stars, o = {}) {
  const armies = {};
  let left = stars;
  for (const id of ARMIES) {
    if (left <= 0) break;
    const got = Math.min(3, left);
    armies[id] = { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: { 0: (1 << got) - 1 } };
    left -= got;
  }
  return { seed: 7, crowns: 0, stones: 0, unlocked: PARTY, party: PARTY, chapel: false, castle: {}, xp: {}, armies, featuresTold: ['autoMerge', 'autoRunes', 'autoPlace'], bestStage: 1, slotsTold: 1,
    spellbook: { owned: ['heal', 'meteor', 'haste', 'rally', 'shield', 'bulwark'], equipped: [], open: 'heal', school: 'iron_stag' }, ...o };
}

const srv = serve(ROOT, PORT);
const browser = await launch();
let bad = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) bad++; };

async function open(w, h, meta, wait = 1200) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { bad++; console.log('PAGE ERROR', e.message); });
  await page.goto(`http://localhost:${PORT}/?x=1`);
  await page.evaluate((items) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(items)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  }, { 'lotf-tips-off': '1', 'legends.settings': { cinematics: false, speed: 1 }, 'legends.meta': meta });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(wait);
  await page.addStyleTag({ content: QUIET });
  return { ctx, page };
}

/** Start an Orc Warband wave with the five placed. */
const deploy = (page) => page.evaluate(async (party) => {
  const g = window.__game;
  const r = JSON.parse(JSON.stringify(g.run));
  Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'orcs' }, stage: 3, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
  document.getElementById('home').hidden = true;
  g.startRun(r);
  await new Promise((res) => setTimeout(res, 600));
  g.autoArrange(true);
  await new Promise((res) => setTimeout(res, 500));
}, PARTY);

/** The spell row's pieces, left to right. */
const row = (page) => page.evaluate(() => {
  const shown = (e) => {
    if (!e || e.hidden || e.closest('[hidden]')) return null;
    const b = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return b.width > 0 && b.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' ? b : null;
  };
  const pieces = [...document.querySelectorAll('#hudSpells #mana, #hudSpells #spellCards > .spell, #hudSpells .fhAuto')].map(shown).filter(Boolean).sort((a, b) => a.left - b.left);
  return { W: innerWidth, orbs: [...document.querySelectorAll('#spellCards > .spell')].filter(shown).map((e) => e.dataset.id), holes: document.querySelectorAll('#spellCards > :not(.spell)').length, pieces: pieces.map((b) => [b.left, b.right]) };
});

// (the stars that open one, two, three and four slots; from ten stars the Chapel stands and the player has filled the slots)
const CASES = [
  [1, 0, {}],
  [2, 3, { slotsTold: 2, spellbook: { owned: ['heal', 'meteor', 'haste', 'rally', 'shield', 'bulwark'], equipped: ['rally'], open: 'heal', school: 'iron_stag' } }],
  [3, 10, { slotsTold: 3, chapel: true, spellbook: { owned: ['heal', 'meteor', 'haste', 'rally', 'shield', 'bulwark'], equipped: ['rally', 'shield'], open: 'heal', school: 'iron_stag' } }],
  [4, 20, { slotsTold: 4, chapel: true, spellbook: { owned: ['heal', 'meteor', 'haste', 'rally', 'shield', 'bulwark'], equipped: ['rally', 'shield', 'bulwark'], open: 'heal', school: 'iron_stag' } }],
];

for (const [w, h] of SIZES) {
  for (const [n, stars, o] of CASES) {
    // the fight
    let s = await open(w, h, metaOf(stars, o));
    await deploy(s.page);
    await s.page.evaluate(() => document.getElementById('fight').click());
    await s.page.waitForTimeout(1500);
    const r = await row(s.page);
    check(r.orbs.length === n, `fight-${n}-${w}: ${n} orb${n > 1 ? 's' : ''} for ${n} open slot${n > 1 ? 's' : ''} (${r.orbs.join(', ')})`);
    check(r.holes === 0, `fight-${n}-${w}: no empty hole in the row`);
    const gaps = r.pieces.slice(1).map((p, i) => Math.round((p[0] - r.pieces[i][1]) * 10) / 10);
    const left = Math.round(r.pieces[0][0] * 10) / 10;
    const right = Math.round((r.W - r.pieces[r.pieces.length - 1][1]) * 10) / 10;
    check(Math.max(...gaps) - Math.min(...gaps) <= 1, `fight-${n}-${w}: even gaps (${gaps.join(' ')})`);
    check(Math.abs(left - right) <= 1.5 && left >= 0, `fight-${n}-${w}: the same margin at both sides (${left}, ${right})`);
    await s.page.screenshot({ path: `${OUT}/fight-${n}-${w}.png` });
    await s.ctx.close();

    // the spellbook (the Chapel standing in every case, so the book is open; a save may hold the Chapel from before the stars)
    s = await open(w, h, metaOf(n === 2 ? 6 : stars, { ...o, chapel: true }));
    await s.page.evaluate(() => window.__game.home.show('spells'));
    await s.page.waitForTimeout(900);
    const book = await s.page.evaluate(() => ({
      slots: document.querySelectorAll('.lbPage .sbSlot').length,
      shut: [...document.querySelectorAll('.lbPage .sbSlot.sbShut')].map((e) => ({ words: e.querySelector('em').textContent, lock: !!e.querySelector('img.sbLock')?.naturalWidth, fits: e.scrollWidth <= e.clientWidth + 1 && e.scrollHeight <= e.clientHeight + 1 })),
      wide: document.documentElement.scrollWidth > innerWidth,
    }));
    check(book.slots === 4, `book-${n}-${w}: four slots drawn`);
    check(book.shut.length === 4 - n, `book-${n}-${w}: ${4 - n} shut (${book.shut.map((x) => x.words).join(' | ')})`);
    check(book.shut.every((x) => x.lock && x.fits && /^Opens at \d+ ★ \(you have \d+\)$/.test(x.words)), `book-${n}-${w}: each shut slot has the painted lock and its words, and they fit`);
    check(!book.wide, `book-${n}-${w}: no sideways scroll`);
    await s.page.screenshot({ path: `${OUT}/book-${n}-${w}.png` });
    if (n === 1) {
      // (every open slot full: a second spell is refused, with the reason on its card)
      const why = await s.page.evaluate(() => {
        const b = document.querySelector('.lbPage .sbCard[data-spell="rally"] .sbEquip');
        b?.scrollIntoView({ block: 'center' });
        return { off: b?.disabled, why: document.querySelector('.lbPage .sbCard[data-spell="rally"] .sbBlocked')?.textContent };
      });
      check(why.off === true && /one open slot is full/.test(why.why ?? ''), `refused-${w}: Rally is refused (${why.why})`);
      await s.page.waitForTimeout(300);
      await s.page.screenshot({ path: `${OUT}/refused-${w}.png` });
    }
    await s.ctx.close();
  }

  // the notice: three stars just won, the second slot not yet told; the Chapel not standing, so Rally joins on its own. The page tells it
  // as soon as it is up (and, in play, on the recap of the run that won the stars)
  let s = await open(w, h, metaOf(3), 500);
  const toast = await s.page.evaluate(() => [...document.querySelectorAll('.toast')].map((e) => e.textContent).join(' / '));
  check(/Second spell slot unlocked · Rally joins your spells/.test(toast), `notice-${w}: the unlock notice ("${toast}")`);
  await s.page.screenshot({ path: `${OUT}/notice-${w}.png` });
  await deploy(s.page);
  const told = await s.page.evaluate(() => ({ cast: [...document.querySelectorAll('#spellCards > .spell')].map((e) => e.dataset.id), told: window.__game.meta.slotsTold }));
  check(told.cast.join() === 'rally,heal' && told.told === 2, `notice-${w}: Rally is in the row (${told.cast.join(', ')}), told once`);
  await s.ctx.close();

  // the tab's mark: ten stars, the Chapel standing, the third slot open and empty
  s = await open(w, h, metaOf(10, { chapel: true, slotsTold: 3, spellbook: { owned: ['heal', 'meteor', 'haste', 'rally', 'shield'], equipped: ['rally'], open: 'heal', school: 'iron_stag' } }));
  await s.page.waitForTimeout(400);
  const mark = await s.page.evaluate(() => {
    const t = [...document.querySelectorAll('.hmTab')].find((e) => /Spells/.test(e.getAttribute('aria-label') ?? e.textContent));
    const b = t?.querySelector('i.badge');
    return { on: t?.classList.contains('new'), seen: !!b && getComputedStyle(b).display !== 'none', label: t?.getAttribute('aria-label') };
  });
  check(mark.on && mark.seen, `tab-mark-${w}: the Spells tab wears its mark (${mark.label})`);
  await s.page.screenshot({ path: `${OUT}/tab-mark-${w}.png` });
  await s.page.evaluate(() => window.__game.home.show('spells'));
  await s.page.waitForTimeout(700);
  await s.page.evaluate(() => document.querySelector('.lbPage .sbCard[data-spell="shield"] .sbEquip').click());
  await s.page.waitForTimeout(400);
  const after = await s.page.evaluate(() => [...document.querySelectorAll('.hmTab')].find((e) => /Spells/.test(e.getAttribute('aria-label') ?? e.textContent))?.classList.contains('new'));
  check(after === false, `tab-mark-${w}: the mark goes once the slot is filled`);
  await s.ctx.close();
}
await browser.close();
srv.close();
console.log(bad ? `${bad} check(s) failed` : 'all checks passed');
process.exit(bad ? 1 : 0);
