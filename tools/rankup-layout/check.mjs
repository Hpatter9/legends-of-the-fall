// RANKUP-LAYOUT's browser check (docs/notes/rankup-layout.md). The owner: "The rank up screen showing the stats increase needs to be
// fixed. It's stacked weird." After `npm run web`:
//   node tools/rankup-layout/check.mjs [before|after]
// At 412x915 (the owner's phone), 393x852 and 360x780 (`SIZES=412x915` for one) it opens the Rank up card (and the Awakening card, which
// is the same card) on heroes with a short and a long name, at level 1 and at a high level with four-digit stats, from rank 1 to 2, at
// the top rank and at an awakening, and the tavern's Upgrades list with its "Upgrade all" confirm. For each card it fails if
//   - a stat's row is not one line: its cells (the name, the old value, the arrow, the new value, the gain) must share a middle line,
//     stand left to right in that order, and none may wrap or be cut;
//   - the columns do not line up down the card: every row's name starts at the same left edge, and every row's old value, new value and
//     gain end at the same right edge (numbers right-aligned);
//   - the card runs past the screen, or anything in it runs past the card.
// The after-battle recap's level-up lines get the same checks, on the page's own stylesheet with the markup the recap builds.
// Writes docs/samples/rankup-layout/<prefix>-<scene>-<w>.png. Exits 1 on a failed check.
import { serve, launch, open, wait, saveOf, SIZES, out } from '../sweep-1110/lib.mjs';
const prefix = process.argv[2] ?? 'after';
const PORT = 8961;
const server = serve(PORT);
const browser = await launch();
const dir = out('docs/samples/rankup-layout');
let bad = 0;
const check = (ok, what, more = '') => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${more ? `  ${more}` : ''}`); };

// (the shards a rank is earned with are 1, 3, 6, 10: `RANK_SHARDS`; an awakening wants the top rank, more shards and the class's ore)
const SCENES = [
  { name: 'rank-1-2-short-l1', kind: 'werewolf', shards: 3, ranked: 1, xp: 0, what: 'rank 1 to 2, a short name (Vuk), level 1' },
  { name: 'rank-1-2-long-high', kind: 'karasu', shards: 3, ranked: 1, xp: 9_000_000, what: 'rank 1 to 2, a long name (Kurogane), a high level' },
  { name: 'rank-top-high', kind: 'minotaur', shards: 10, ranked: 3, xp: 9_000_000, what: 'the top rank (3 to 4), four-digit stats' },
  { name: 'rank-0-1-l1', kind: 'knight', shards: 1, ranked: 0, xp: 0, what: 'the first rank, level 1' },
  { name: 'awaken-high', kind: 'kitsune', shards: 99, ranked: 4, xp: 9_000_000, what: 'an awakening, four-digit stats' },
  { name: 'awaken-l1', kind: 'knight', shards: 99, ranked: 4, xp: 0, what: 'an awakening, level 1' },
];

/** Every stat row of the open card, as boxes: `.srRow` (the shared stat rows), or the old card's flat cells in fours. */
const rowsOf = (page) => page.evaluate(() => {
  const card = document.querySelector('#rankUp .om, .ruCard');
  if (!card) return null;
  const box = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, cut: e.scrollWidth > e.clientWidth + 1, lines: (() => { const g = document.createRange(); g.selectNodeContents(e); return new Set([...g.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top))).size; })(), text: e.textContent.trim(), cls: e.className }; };
  let rows = [...card.querySelectorAll('.srRow')].map((r) => ({ table: [...document.querySelectorAll('.srTable')].indexOf(r.closest('.srTable')), cells: [...r.children].filter((c) => c.getBoundingClientRect().width > 0).map((c) => box(c.matches('.srName') ? c.querySelector('span') : c)) }));
  if (!rows.length) {
    // (the old card: `.ruStats` holds flat cells, four to a stat: name, old, arrow, new)
    const flat = [...(card.querySelector('.ruStats')?.children ?? [])].map(box);
    for (let i = 0; i + 3 < flat.length + 3 && i < flat.length; i += 4) rows.push({ table: 0, cells: flat.slice(i, i + 4) });
  }
  const c = card.getBoundingClientRect();
  const past = [...card.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 1 && (r.right > c.right + 1 || r.left < c.left - 1) && !e.closest('canvas, .ruPic, .srPic'); }).map((e) => e.className || e.tagName).slice(0, 5);
  return { rows, card: { l: c.left, r: c.right, t: c.top, b: c.bottom }, past, w: innerWidth, h: innerHeight, scroll: document.documentElement.scrollWidth };
});

function judge(what, got) {
  if (!got) return check(false, `${what}: the card opened`);
  check(got.rows.length >= 2, `${what}: the card lists its stats`, `${got.rows.length} rows`);
  const stacked = [], order = [], wrapped = [];
  for (const row of got.rows) {
    const name = row.cells[0]?.text ?? '?';
    const mids = row.cells.map((c) => (c.t + c.b) / 2);
    if (Math.max(...mids) - Math.min(...mids) > 2.5) stacked.push(name);
    if (row.cells.some((c, i) => i > 0 && c.l < row.cells[i - 1].r - 1)) order.push(name);
    if (row.cells.some((c) => c.lines > 1 || c.cut)) wrapped.push(name);
  }
  check(!stacked.length, `${what}: each stat is one line (its cells share a middle line)`, stacked.join(', '));
  check(!order.length, `${what}: each row reads left to right: name, old, arrow, new, gain`, order.join(', '));
  check(!wrapped.length, `${what}: no cell wraps or is cut`, wrapped.join(', '));
  // (the columns: by cell index within each table)
  const off = [];
  for (const t of new Set(got.rows.map((r) => r.table))) {
    const rows = got.rows.filter((r) => r.table === t);
    const n = Math.min(...rows.map((r) => r.cells.length));
    for (let i = 0; i < n; i++) {
      const edge = rows.map((r) => (i === 0 ? r.cells[i].l : r.cells[i].r));
      if (Math.max(...edge) - Math.min(...edge) > 1.5) off.push(`column ${i + 1} (${i === 0 ? 'left' : 'right'} edges ${[...new Set(edge.map((e) => Math.round(e)))].join('/')})`);
    }
    if (rows.some((r) => r.cells.length !== rows[0].cells.length)) off.push('rows of unequal cells');
  }
  check(!off.length, `${what}: the columns line up down the card`, off.join('; '));
  check(got.card.l >= 0 && got.card.r <= got.w + 0.5 && got.card.t >= 0 && got.card.b <= got.h + 0.5 && got.scroll <= got.w + 1 && !got.past.length, `${what}: the card is inside the screen, and everything inside the card`, got.past.join(', '));
}

for (const [w, h] of SIZES) {
  console.log(`---- ${w} x ${h}`);
  const { ctx, page, log } = await open(browser, w, h, PORT, { save: { ...saveOf(), unlocked: [...new Set([...saveOf().unlocked, ...SCENES.map((s) => s.kind), 'samurai', 'archer'])] } });
  await page.addStyleTag({ content: '.toast, #quip, .duoToast { display: none !important; }' });
  for (const s of SCENES) {
    await page.evaluate((s) => {
      const m = window.__game.meta;
      m.shards[s.kind] = s.shards;
      (m.ranked ??= {})[s.kind] = s.ranked;
      if (m.awakened) delete m.awakened[s.kind];
      m.ores = new Proxy({}, { get: () => 99, has: () => true });
      m.xp[s.kind] = s.xp;
      window.__game.home.openSheet(s.kind);
    }, s);
    await wait(page, 900);
    await page.evaluate(() => [...document.querySelectorAll('#hmSheet button')].find((x) => /^(Rank up|Awaken)/i.test(x.textContent.trim()))?.click());
    await wait(page, 1300);
    judge(`${s.what}`, await rowsOf(page));
    await page.screenshot({ path: `${dir}/${prefix}-${s.name}-${w}.png` });
    // (out again: the card, then the sheet)
    for (let i = 0; i < 4; i++) { await page.keyboard.press('Escape'); await wait(page, 350); }
  }
  // ---- the tavern's Upgrades list and its "Upgrade all" confirm (several heroes ready)
  await page.evaluate(() => {
    const m = window.__game.meta;
    for (const k of ['samurai', 'archer', 'karasu', 'werewolf']) { m.shards[k] = 6; (m.ranked ??= {})[k] = 1; }
    window.__game.home.refresh?.();
  });
  await page.evaluate(() => document.querySelectorAll('.hmTab')[1].click());
  await wait(page, 900);
  await page.evaluate(() => { document.getElementById('ptTab1')?.click(); });
  await wait(page, 500);
  const opened = await page.evaluate(() => { const b = [...document.querySelectorAll('.hm-heroes button')].find((x) => x.offsetParent && /Upgrades/.test(x.textContent)); b?.click(); return !!b; });
  await wait(page, 900);
  if (opened && (await page.evaluate(() => !!document.querySelector('.ulBack')))) {
    await page.screenshot({ path: `${dir}/${prefix}-upgrades-list-${w}.png` });
    const list = await page.evaluate(() => {
      const c = document.querySelector('.ulCard').getBoundingClientRect();
      const rows = [...document.querySelectorAll('.ulRow')].map((r) => { const t = r.querySelector('.ulText').getBoundingClientRect(), g = r.querySelector('.ulGo').getBoundingClientRect(), p = r.querySelector('.ulPic').getBoundingClientRect(); return { ok: p.right <= t.left + 1 && t.right <= g.left + 1 && g.right <= c.right + 1, gr: Math.round(g.right), tl: Math.round(t.left) }; });
      return { rows, in: c.left >= 0 && c.right <= innerWidth + 0.5 && c.bottom <= innerHeight + 0.5 };
    });
    check(list.in && list.rows.every((r) => r.ok) && new Set(list.rows.map((r) => r.gr)).size <= 1 && new Set(list.rows.map((r) => r.tl)).size <= 1, 'the Upgrades list: each hero is one row (picture, words, button), the columns in line', JSON.stringify(list.rows.slice(0, 3)));
    await page.evaluate(() => document.querySelector('.ulAll')?.click());
    await wait(page, 600);
    await page.screenshot({ path: `${dir}/${prefix}-upgrade-all-ask-${w}.png` });
  } else console.log('note: the Upgrades list did not open on this save');
  // ---- the after-battle recap's level-up lines (`jrpgRecapView.ts`): the same rows, checked on the page's own stylesheet with the
  // markup the recap builds (a hero's box that has levelled: LV, the stats, two scores with their notes, what it learnt)
  await page.evaluate(() => {
    const el = (tag, cls = '', text = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
    const host = el('div');
    host.id = 'ruRecapFixture';
    host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0d1a13;display:flex;flex-direction:column;align-items:center;gap:10px;padding:12px;box-sizing:border-box;overflow:auto;';
    for (const compact of [false, true]) {
      const body = el('div', `jrBody won${compact ? ' compact' : ''}`);
      const party = el('div', 'jrParty');
      for (const [name, stats] of [
        ['Kurogane', [['LV', '70', '71', '+1'], ['HP', '2552', '2866', '+314'], ['ATK', '161', '174', '+13'], ['STR', '26', '27', '+1', 'blows and skills +5%'], ['TO HIT', '+11', '+12', '+1', 'proficiency']]],
        ['Vuk', [['LV', '1', '3', '+2'], ['HP', '227', '256', '+29'], ['ATK', '26', '29', '+3']]],
      ]) {
        const row = el('div', 'jrRow up');
        const face = el('div', 'jrFace');
        const main = el('div', 'jrMain');
        const nm = el('div', 'jrName');
        nm.append(el('b', '', name));
        main.append(nm);
        const up = el('div', 'jrGrowth');
        stats.forEach(([k, a, b, g, why], i) => {
          const line = el('span', `jrStat${i === 0 ? ' jrLevel' : why ? ' jrScore' : ''}`);
          line.append(el('small', '', k), el('b', '', a), el('i', '', '→'), el('b', 'to', b), el('em', '', g));
          if (why) line.append(el('small', 'jrWhy', why));
          up.append(line);
        });
        up.append(el('span', 'jrLearn skill', 'Learnt: Cleaving Blow'));
        row.append(face, main, up);
        party.append(row);
      }
      body.append(party);
      host.append(body);
    }
    document.body.append(host);
  });
  await wait(page, 700);
  const recap = await page.evaluate(() => {
    const box = (e) => { const r = e.getBoundingClientRect(); const g = document.createRange(); g.selectNodeContents(e); return { l: r.left, r: r.right, t: r.top, b: r.bottom, cut: e.scrollWidth > e.clientWidth + 1, lines: new Set([...g.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top))).size, text: e.textContent.trim() }; };
    const tables = [...document.querySelectorAll('#ruRecapFixture .jrGrowth')];
    // (the five cells of each stat; a score's note, the sixth, may take two lines and is not weighed)
    const rows = tables.flatMap((t, i) => [...t.querySelectorAll('.jrStat')].map((s) => ({ table: i, cells: [...s.children].slice(0, 5).map(box) })));
    const host = document.getElementById('ruRecapFixture').getBoundingClientRect();
    const past = [...document.querySelectorAll('#ruRecapFixture .jrRow *')].filter((e) => { const r = e.getBoundingClientRect(), c = e.closest('.jrRow').getBoundingClientRect(); return r.width > 1 && (r.right > c.right + 1 || r.left < c.left - 1); }).map((e) => e.className || e.tagName).slice(0, 5);
    return { rows, card: { l: host.left, r: host.right, t: 0, b: 0 }, past, w: innerWidth, h: innerHeight, scroll: document.documentElement.scrollWidth };
  });
  judge("the recap's level-up lines", recap);
  await page.screenshot({ path: `${dir}/${prefix}-recap-level-up-${w}.png` });
  await page.evaluate(() => document.getElementById('ruRecapFixture')?.remove());
  check(!log.errors.length, `no page errors at ${w}`, log.errors.slice(0, 2).join(' | '));
  await ctx.close();
}
console.log(bad ? `${bad} check(s) FAILED` : 'all checks passed');
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
