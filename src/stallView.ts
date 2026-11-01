// Hester's Stall on the page (SHOP-BOOKS-GEAR, docs/notes/shop-books-gear.md): a full-screen view that opens from the stall at the
// camp. At the top the close-up, Hester at her shelf with her line of the day; under it the tabs (Books, Gear, Tomes, Chests, Sell,
// Repair) and the shelf of the tab chosen. A tap on a ware brings its page up from the bottom, with Buy. The rules are in
// `src/sim/stall.ts`, `books.ts` and `wear.ts`; this only reads and changes the meta through them.

import { bookIcon, shopArt } from './bookArt';
import { classWord, oreIcon } from './oreView';
import { itemIcon } from './equipView';
import { ICONS, icon } from './menuArt';
import { todayKey } from './modes';
import { chestShopCards } from './shopView';
import { TOME_ICON } from './tomeArt';
import { play } from './render/sound';
import { ORES } from './sim/awakenMats';
import { showWhenPainted } from './paintReady';
import { BOOKS, KIND_NAMES, RARITY_WORDS, bookById, type BookDef } from './sim/bookData';
import { canRead, copiesOf, knowsBook, slotFor, studyLength, suitedTo } from './sim/books';
import { EQUIP_BASES, RARITY_NAMES, describeAbility, hasAbility, itemName, itemStats, sellPrice, spareEquipment, statLines, wearerOf, type Equipment } from './sim/equipment';
import { heroName } from './sim/heroNames';
import { saveMeta, type Meta } from './sim/meta';
import {
  STANDINGS, STANDING_LINES, bookSellPrice, bulkCommons, buyBack, buyWare, copiesLeft, hesterLine, markSeen, sellAllCommons, sellAsks, sellBook, sellPiece, soldToday, stallRepair,
  stallRepairAll, standingOf, stockOf, toNextStanding, whyNotBuy, type StallTab, type Ware,
} from './sim/stall';
import { TOMES } from './sim/tomes';
import { TRADER_NAMES, buyFromTrader, caravanHere, gloamingHere, oreWareName, stockOfTrader, tradeLeft, traderLine, whyNotBuyFrom, type TradeWare, type Trader } from './sim/traders';
import { durabilityOf, maxDurability, needingRepair, repairAllCost, repairCost, wearState } from './sim/wear';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const img = (src: string, cls = '', alt = ''): HTMLImageElement => {
  const i = el('img', cls);
  i.src = src;
  i.alt = alt;
  i.draggable = false;
  return i;
};

type AnyTab = StallTab | Trader;
const TAB_NAMES: Record<AnyTab, string> = { books: 'Books', gear: 'Gear', tomes: 'Tomes', chests: 'Chests', sell: 'Sell', repair: 'Repair', caravan: TRADER_NAMES.caravan.tab, gloaming: TRADER_NAMES.gloaming.tab };
const TAB_ICON: Record<AnyTab, () => string> = {
  caravan: () => shopArt('caravan-master'),
  gloaming: () => shopArt('gloaming-dealer'),
  books: () => shopArt('book-manual-common'),
  gear: () => 'gear/gear-64.webp',
  tomes: () => TOME_ICON.small,
  chests: () => shopArt('coin-purse'),
  sell: () => shopArt('sell'),
  repair: () => shopArt('repair'),
};
/** Repair all asks first above this many crowns. */
const ASK_OVER = 500;

const STALL_TAB_LIST: readonly StallTab[] = ['books', 'gear', 'tomes', 'chests', 'sell', 'repair'];
const KIND_PLURAL: Record<BookDef['kind'], string> = { manual: 'Manuals', grimoire: 'Grimoires', hymnal: 'Hymnals', bestiary: 'Bestiaries', universal: 'Universal books' };

type SellFilter = 'all' | 'common' | 'rare' | 'epic' | 'books';

/** Open Hester's Stall over the page, on a tab. `onChange` runs after anything is bought, sold or mended, and when the stall is shut. */
export function openStall(m: Meta, onChange: () => void, first: AnyTab = 'books'): void {
  document.getElementById('stall')?.remove();
  const root = el('div', 'stallView');
  root.id = 'stall';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Hester’s Stall');
  const day0 = todayKey();
  // (a trader who is not here today cannot be the first tab)
  let tab: AnyTab = (first === 'caravan' && !caravanHere(m, day0)) || (first === 'gloaming' && !gloamingHere(m, day0)) ? 'books' : first;
  let filter: SellFilter = 'all';
  let said = tab === 'caravan' || tab === 'gloaming' ? traderLine(m, tab, day0) : hesterLine(m, day0, tab === 'books' ? undefined : tab);
  let sure = '';
  const standingWas = standingOf(m);
  markSeen(m, todayKey());
  saveMeta(m);

  const changed = (): void => {
    saveMeta(m);
    onChange();
  };
  /** After a purchase or repair: a new standing has its beat (Hester's line), then everything is drawn again. */
  const after = (line?: string): void => {
    const now = standingOf(m);
    if (now > standingWas && now >= 2) said = STANDING_LINES[now as 2 | 3];
    else if (line) said = line;
    changed();
    draw();
  };

  const draw = (): void => {
    const day = todayKey();
    const standing = standingOf(m);
    // (the head: back, the name, the standing's seal, the purse)
    const head = el('div', 'hsHead');
    const back = el('button', 'hsBack', '‹');
    back.setAttribute('aria-label', 'Back to the camp');
    back.addEventListener('click', () => {
      root.remove();
      onChange();
    });
    const title = el('div', 'hsTitle');
    title.append(el('h2', '', 'Hester’s Stall'));
    const next = toNextStanding(m);
    title.append(el('small', '', `${STANDINGS[standing - 1].name}${next !== undefined ? ` · ${next} to the next` : ''}`));
    const seal = img(shopArt(`standing-${standing}`), 'hsSeal', `Standing ${standing}: ${STANDINGS[standing - 1].name}`);
    const purse = el('span', 'hsPurse');
    purse.append(icon(ICONS.crowns, ''), String(m.crowns));
    head.append(back, title, seal, purse);
    // (the close-up: her shelf, the better one from standing 2; Hester leaning in; her line)
    const trader: Trader | null = tab === 'caravan' || tab === 'gloaming' ? tab : null;
    const scene = el('div', `hsScene${standing >= 2 ? ' rare' : ''}${trader ? ` ${trader}` : ''}`);
    scene.style.backgroundImage = `url(${shopArt(standing >= 2 || trader === 'gloaming' ? 'shelf-rare' : 'shelf')})`;
    scene.append(img(shopArt(trader === 'caravan' ? 'caravan-master' : trader === 'gloaming' ? 'gloaming-dealer' : 'hester'), 'hsHester', trader ? TRADER_NAMES[trader].name : 'Hester Vane'));
    const say = el('p', 'hsSay');
    say.append(el('b', '', trader ? TRADER_NAMES[trader].name : 'Hester'), el('span', '', said));
    scene.append(say);
    // (the tabs)
    const tabs = el('div', 'hsTabs');
    tabs.setAttribute('role', 'tablist');
    const here: AnyTab[] = [...STALL_TAB_LIST, ...(caravanHere(m, day) ? (['caravan'] as const) : []), ...(gloamingHere(m, day) ? (['gloaming'] as const) : [])];
    tabs.style.gridTemplateColumns = `repeat(${here.length}, 1fr)`;
    tabs.classList.toggle('many', here.length > 6);
    for (const t of here) {
      const b = el('button', `hsTab${t === tab ? ' on' : ''}`);
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(t === tab));
      const ico = el('i', `hsTabIco ${t}`);
      ico.style.backgroundImage = `url(${TAB_ICON[t]()})`;
      b.append(ico, el('span', '', TAB_NAMES[t]));
      if (t === 'repair' && needingRepair(m).some((x) => wearerOf(m, x.id) !== undefined && wearState(x) !== 'good')) b.append(el('i', 'badge'));
      b.addEventListener('click', () => {
        if (tab === t) return;
        tab = t;
        sure = '';
        said = t === 'caravan' || t === 'gloaming' ? traderLine(m, t, day) : hesterLine(m, day, t);
        play('tap');
        draw();
      });
      tabs.append(b);
    }
    const body = el('div', 'hsBody');
    if (tab === 'caravan' || tab === 'gloaming') traderTab(body, tab, day);
    else if (tab === 'books' || tab === 'gear' || tab === 'tomes') shelfTab(body, day);
    else if (tab === 'chests') body.append(...chestShopCards(m, changed, draw));
    else if (tab === 'sell') sellTab(body, day);
    else repairTab(body, day);
    root.replaceChildren(head, scene, tabs, body);
  };

  // ---- the shelves ----

  const wareArt = (w: Ware | TradeWare, px: number): HTMLElement => {
    if (w.type === 'ore') {
      const box = el('span', 'hsTome');
      box.append(oreIcon(w.trait, 'hsOre'));
      box.style.width = box.style.height = `${px}px`;
      return box;
    }
    if (w.type === 'book') return bookIcon(bookById(w.book)!, px);
    if (w.type === 'gear') {
      const i = itemIcon({ id: 0, ...w.item }, EQUIP_BASES[w.item.base].slot, 'big');
      i.style.width = i.style.height = `${px}px`;
      return i;
    }
    const box = el('span', 'hsTome');
    box.append(img(TOME_ICON[w.size]));
    box.style.width = box.style.height = `${px}px`;
    return box;
  };
  const wareName = (w: Ware | TradeWare): string => (w.type === 'ore' ? oreWareName(w) : w.type === 'book' ? bookById(w.book)!.title : w.type === 'gear' ? itemName(w.item) : TOMES[w.size].name);

  const shelfTab = (body: HTMLElement, day: number): void => {
    const st = stockOf(m, day);
    const wares = tab === 'books' ? st.books : tab === 'gear' ? st.gear : st.tomes;
    const grid = el('div', 'hsShelf');
    for (const w of wares) {
      const left = copiesLeft(m, w, day);
      const locked = standingOf(m) < w.standing;
      const card = el('button', `hsWare${left <= 0 ? ' out' : ''}${locked ? ' locked' : ''}`);
      card.setAttribute('aria-label', `${wareName(w)}, ${w.price} crowns${left <= 0 ? ', sold out' : locked ? `, standing ${w.standing}` : `, ${left} left`}`);
      card.append(wareArt(w, 72), el('b', 'hsWareName', wareName(w)));
      const tag = el('span', 'hsTag');
      tag.style.backgroundImage = `url(${shopArt('price-tag')})`;
      tag.append(el('span', '', String(w.price)));
      card.append(tag);
      if (left <= 0) card.append(img(shopArt('sold-out'), 'hsSold', 'Sold out'));
      else if (locked) card.append(el('small', 'hsLeft', `Standing ${w.standing}`));
      else card.append(el('small', 'hsLeft', `${left} left`));
      card.addEventListener('click', () => warePage(w));
      grid.append(card);
    }
    body.append(grid);
    if (tab === 'books') {
      const held = BOOKS.filter((b) => copiesOf(m, b.id) > 0);
      body.append(el('p', 'hsNote', held.length ? `In your bag: ${held.map((b) => `${b.title}${copiesOf(m, b.id) > 1 ? ` ×${copiesOf(m, b.id)}` : ''}`).join(', ')}. A hero reads one from its page, under its skills.` : 'Books teach a hero a new skill. A hero reads one from its page, under its skills; each fight it fights in is a fight of study. Rare books are found in chests.'));
    } else if (tab === 'gear') body.append(el('p', 'hsNote', 'Fresh stock every morning, at the level your armies have reached. Gear wears a little with every wave it is fought in: mend it on the Repair tab.'));
    else body.append(el('p', 'hsNote', 'A tome is read to a hero from its page, for XP.'));
  };

  /** A visiting trader's shelf: the same planks, a ware a copy (no standing locks on the Dealer's). */
  const traderTab = (body: HTMLElement, trader: Trader, day: number): void => {
    const grid = el('div', 'hsShelf');
    for (const w of stockOfTrader(m, trader, day)) {
      const left = tradeLeft(m, trader, w, day);
      const locked = standingOf(m) < w.standing;
      const card = el('button', `hsWare${left <= 0 ? ' out' : ''}${locked ? ' locked' : ''}`);
      card.setAttribute('aria-label', `${wareName(w)}, ${w.price} crowns${left <= 0 ? ', sold out' : locked ? `, Hester's standing ${w.standing}` : ''}`);
      card.append(wareArt(w, 72), el('b', 'hsWareName', wareName(w)));
      const tag = el('span', 'hsTag');
      tag.style.backgroundImage = `url(${shopArt('price-tag')})`;
      tag.append(el('span', '', String(w.price)));
      card.append(tag);
      if (left <= 0) card.append(img(shopArt('sold-out'), 'hsSold', 'Sold out'));
      else if (locked) card.append(el('small', 'hsLeft', `Standing ${w.standing}`));
      else card.append(el('small', 'hsLeft', 'one only'));
      card.addEventListener('click', () => warePage(w, trader));
      grid.append(card);
    }
    body.append(grid);
    body.append(el('p', 'hsNote', trader === 'caravan' ? 'The caravan comes one day a week, with one of each and no more. Hester’s regulars may buy the better wares (her standing).' : 'The Dealer stands here for the rest of the day a Calamity guardian falls. What he sells is dear, and what is bought here does not count towards Hester’s standing.'));
  };

  /** A ware's page, up from the bottom: the art large, what it is, and Buy. */
  const warePage = (w: Ware | TradeWare, trader?: Trader): void => {
    play('tap');
    document.getElementById('stallSheet')?.remove();
    const veil = el('div', 'hsVeil');
    veil.id = 'stallSheet';
    const sheet = el('div', 'hsSheet');
    sheet.setAttribute('role', 'dialog');
    const close = (): void => veil.remove();
    veil.addEventListener('click', (e) => e.target === veil && close());
    const top = el('div', 'hsSheetTop');
    const words = el('div');
    words.append(el('h3', '', wareName(w)));
    if (w.type === 'book') {
      const b = bookById(w.book)!;
      words.append(el('small', '', `${RARITY_WORDS[b.rarity]} ${KIND_NAMES[b.kind]}`));
    } else if (w.type === 'gear') words.append(el('small', '', `${RARITY_NAMES[w.item.rarity]} ${EQUIP_BASES[w.item.base].slot} · Lv ${w.item.level}`));
    top.append(wareArt(w, 112), words);
    sheet.append(top);
    if (w.type === 'ore') sheet.append(el('p', 'hsLine', `${w.n} ${ORES[w.trait]?.name ?? w.trait}, the awakening ore of ${classWord(w.trait)}s, for any hero of that class on its awakening panel.`));
    else if (w.type === 'book') bookDetail(sheet, bookById(w.book)!);
    else if (w.type === 'gear') {
      const it: Equipment = { id: 0, ...w.item };
      const stats = itemStats(it);
      for (const l of statLines(stats)) {
        const row = el('div', 'hsStat');
        row.append(el('span', '', l.label), el('b', '', l.text));
        sheet.append(row);
      }
      const base = EQUIP_BASES[it.base];
      sheet.append(el('p', 'hsLine', hasAbility(it.rarity) ? `${stats.abilities[0]?.name}: ${describeAbility(base.ability, stats.abilities[0]?.s ?? 1)}` : `Epic and up: ${base.ability.name}`));
      sheet.append(el('p', 'hsLine', `Durability ${maxDurability(it)}: it loses a point for each wave it is worn in.`));
    } else if (w.type === 'tome') sheet.append(el('p', 'hsLine', `${TOMES[w.size].xp.toLocaleString('en-GB')} XP for one hero, read from its page.`));
    const why = trader ? whyNotBuyFrom(m, trader, w as TradeWare, todayKey()) : whyNotBuy(m, w as Ware, todayKey());
    const buy = el('button', 'hsBuy');
    buy.append(icon(ICONS.crowns, ''), `Buy · ${w.price}`);
    if (why) buy.append(el('small', '', ` · ${why}`));
    buy.disabled = !!why;
    buy.addEventListener('click', () => {
      if (trader) {
        if (!buyFromTrader(m, trader, w.key, todayKey())) return;
        play('coin');
        close();
        after(traderLine(m, trader, todayKey(), true));
        return;
      }
      const got = buyWare(m, w.key, todayKey());
      if (!got) return;
      play('coin');
      close();
      after(got.type === 'book' ? 'Mind the spine. It bites.' : got.type === 'gear' ? 'Sharp end goes at the enemy. You’d be amazed.' : 'Don’t read it all at once.');
    });
    const shut = el('button', 'hsShut', 'Close');
    shut.addEventListener('click', close);
    sheet.append(buy, shut);
    veil.append(sheet);
    root.append(veil);
  };

  /** A book's page: its history, the skill it teaches, the study, and the owned heroes who could read it. */
  const bookDetail = (sheet: HTMLElement, b: BookDef): void => {
    sheet.append(el('p', 'hsHistory', b.history));
    const slot = slotFor(b.from.hero, b.from.slot === 1 ? 'own1' : 'own2');
    if (slot) sheet.append(el('p', 'hsLine', `Teaches ${slot.skill.name}: ${slot.skill.text}`));
    const len = studyLength(b, m.castle.library);
    sheet.append(el('p', 'hsLine', `Study: ${len} fight${len === 1 ? '' : 's'}${m.castle.library ? ' (with the library)' : ''}. A hero studies one fight for each wave it fights in.`));
    const suited = m.unlocked.filter((k) => suitedTo(k, b));
    if (!suited.length) {
      sheet.append(el('p', 'hsLine', `No hero of yours can read ${KIND_PLURAL[b.kind]} yet.`));
      return;
    }
    const strip = el('div', 'hsReaders');
    for (const k of suited) {
      const face = el('span', `hsFace${canRead(m, k, b) ? '' : ' knows'}`);
      face.append(img(`heroes/${k}-portrait.webp`, '', heroName(k)));
      if (knowsBook(m, k, b)) face.append(el('small', '', 'knows it'));
      strip.append(face);
    }
    sheet.append(el('small', 'hsSmall', b.kind === 'universal' ? 'Any hero can read it:' : `${KIND_PLURAL[b.kind]} are read by:`), strip);
  };

  // ---- selling ----

  const sellTab = (body: HTMLElement, day: number): void => {
    const pills = el('div', 'hsPills');
    for (const [f, name] of [['all', 'All'], ['common', 'Common'], ['rare', 'Rare'], ['epic', 'Epic+'], ['books', 'Books']] as [SellFilter, string][]) {
      const p = el('button', `hsPill${filter === f ? ' on' : ''}`, name);
      p.addEventListener('click', () => {
        filter = f;
        sure = '';
        draw();
      });
      pills.append(p);
    }
    body.append(pills);
    const spare = spareEquipment(m).sort((a, b) => a.rarity - b.rarity || a.level - b.level || a.id - b.id);
    body.append(el('p', 'hsNote', `Spare gear: ${spare.length} piece${spare.length === 1 ? '' : 's'}. What a hero wears is never offered.`));
    const list = el('div', 'hsList');
    if (filter !== 'books')
      for (const it of spare.filter((x) => filter === 'all' || (filter === 'common' ? x.rarity === 1 : filter === 'rare' ? x.rarity === 2 : x.rarity >= 3))) {
        const row = el('div', `hsRow r${it.rarity}`);
        const words = el('div', 'hsRowWords');
        const state = wearState(it);
        words.append(el('b', '', itemName(it)), el('small', '', `${RARITY_NAMES[it.rarity]} · Lv ${it.level} · ${state === 'good' ? 'Good' : state === 'worn' ? 'Worn' : 'Broken'} · ${Math.ceil(durabilityOf(it))}/${maxDurability(it)}`));
        const key = `piece:${it.id}`;
        const asks = sellAsks(m, it) && sure !== key;
        const b = el('button', `hsSell${sure === key ? ' sure' : ''}`, asks ? `Sell · ${sellPrice(it)}` : sure === key ? `Sell for ${sellPrice(it)}?` : `Sell · ${sellPrice(it)}`);
        b.addEventListener('click', () => {
          if (asks) {
            sure = key;
            draw();
            return;
          }
          sellPiece(m, it.id, day);
          sure = '';
          play('coin');
          after(hesterLine(m, day + it.id, 'sell'));
        });
        row.append(itemIcon(it, EQUIP_BASES[it.base].slot, 'small'), words, b);
        list.append(row);
      }
    if (filter === 'all' || filter === 'books')
      for (const book of BOOKS.filter((x) => copiesOf(m, x.id) > 0)) {
        const price = bookSellPrice(m, book);
        const row = el('div', 'hsRow');
        const words = el('div', 'hsRowWords');
        words.append(el('b', '', book.title), el('small', '', `${RARITY_WORDS[book.rarity]} ${KIND_NAMES[book.kind]} · ×${copiesOf(m, book.id)} unread`));
        const b = el('button', 'hsSell', price ? `Sell · ${price}` : 'Not for sale');
        b.disabled = !price;
        b.addEventListener('click', () => {
          if (!sellBook(m, book.id)) return;
          play('coin');
          after('Every one of these was somebody’s whole life. I’ll find it a good home.');
        });
        row.append(bookIcon(book, 48), words, b);
        list.append(row);
      }
    if (!list.childElementCount) list.append(el('p', 'hsNote', 'Nothing to sell here.'));
    body.append(list);
    // (the bulk sale: the spare Commons, never the last of a base nor a piece of a worn set)
    const bulk = bulkCommons(m);
    if (bulk.length && filter !== 'books') {
      const total = bulk.reduce((n, x) => n + sellPrice(x), 0);
      const b = el('button', `hsBulk${sure === 'bulk' ? ' sure' : ''}`);
      b.append(img(shopArt('sell'), 'hsBtnIco'), sure === 'bulk' ? `Sell ${bulk.length} Commons for ${total}?` : `Sell all Commons · ${bulk.length} · ${total}`);
      b.addEventListener('click', () => {
        if (sure !== 'bulk') {
          sure = 'bulk';
          draw();
          return;
        }
        sellAllCommons(m, day);
        sure = '';
        play('coin');
        after('Let’s see what the cat dragged in. Ah. Cats.');
      });
      body.append(b);
    }
    // (the Sold today shelf: buy back at the price paid, until midnight)
    const sold = soldToday(m, day);
    if (sold.length) {
      const shelf = el('div', 'hsSoldToday');
      const h = el('h4');
      h.append(img(shopArt('buy-back'), 'hsBtnIco'), 'Sold today: buy back at the price paid');
      shelf.append(h);
      const row = el('div', 'hsBackRow');
      sold.forEach((e, i) => {
        const b = el('button', 'hsBack1');
        b.setAttribute('aria-label', `Buy back ${itemName(e.item)} for ${e.price}`);
        b.append(itemIcon(e.item, EQUIP_BASES[e.item.base].slot, 'small'), el('small', '', String(e.price)));
        b.disabled = m.crowns < e.price;
        b.addEventListener('click', () => {
          if (!buyBack(m, i, day)) return;
          play('coin');
          after('Changed your mind? It happens. Mostly to other people.');
        });
        row.append(b);
      });
      shelf.append(row);
      body.append(shelf);
    }
  };

  // ---- mending ----

  const repairTab = (body: HTMLElement, day: number): void => {
    const all = needingRepair(m);
    if (!all.length) {
      body.append(el('p', 'hsEmpty', '“Nothing’s broken. Go and break something.”'));
      return;
    }
    const { items, cost } = repairAllCost(m);
    if (items.length) {
      const b = el('button', `hsBulk${sure === 'repairAll' ? ' sure' : ''}`);
      b.append(img(shopArt('repair-all'), 'hsBtnIco'), sure === 'repairAll' ? `Mend ${items.length} pieces for ${cost}?` : `Repair all worn by heroes · ${cost}`);
      b.disabled = m.crowns < cost;
      b.addEventListener('click', () => {
        if (cost > ASK_OVER && sure !== 'repairAll') {
          sure = 'repairAll';
          draw();
          return;
        }
        sure = '';
        if (!stallRepairAll(m, day)) return;
        play('coin');
        after('Good as new. Better, actually. Don’t tell the smith.');
      });
      body.append(b);
    }
    if (m.castle.armoury) body.append(el('p', 'hsNote', `The Armoury takes ${Math.min(7, m.castle.armoury) * 4}% off every repair.`));
    const list = el('div', 'hsList');
    for (const it of all) {
      const who = wearerOf(m, it.id);
      const row = el('div', `hsRow r${it.rarity}`);
      const face = el('span', 'hsWho');
      if (who) face.append(img(`heroes/${who}-portrait.webp`, '', heroName(who)));
      else face.append(el('small', '', 'spare'));
      const words = el('div', 'hsRowWords');
      const state = wearState(it);
      words.append(el('b', '', itemName(it)), el('small', `hsCond ${state}`, `${who ? `${heroName(who)} · ` : ''}${state === 'broken' ? 'Broken' : state === 'worn' ? 'Worn' : 'Good'} · ${Math.ceil(durabilityOf(it))}/${maxDurability(it)}`));
      const price = repairCost(it, m.castle.armoury);
      const b = el('button', 'hsSell');
      b.append(img(shopArt('repair'), 'hsBtnIco'), `Repair · ${price}`);
      b.disabled = m.crowns < price;
      b.addEventListener('click', () => {
        if (!stallRepair(m, it.id, day)) return;
        play('coin');
        after(hesterLine(m, day + it.id, 'repair'));
      });
      row.append(face, itemIcon(it, EQUIP_BASES[it.base].slot, 'small'), words, b);
      list.append(row);
    }
    body.append(list);
  };

  draw();
  document.body.append(root);
  // (MENU-GLITCH: the stall shows once its shelf, Hester and the wares are decoded, not filling in picture by picture)
  void showWhenPainted(root);
}
