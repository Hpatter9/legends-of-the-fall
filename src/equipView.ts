// The Equipment panel of the hero sheet: three slots (weapon, armour, trinket) showing the worn item's icon or an empty
// frame. A tap on a slot opens a picker in its place: what is worn, then the spare items for that slot with what each
// would change (green for better, red for worse) and the buttons Equip, Unequip, Sell and Repair (SHOP-BOOKS-GEAR). Reads and changes the meta
// only through `equipment.ts`.

import { EQUIP_BASES, describeAbility, hasAbility, EQUIP_SLOTS, SLOT_NAMES, callingOf, equipAll, equipBest, equipItem, equipStats, itemName, RARITY_NAMES, itemStats, spareEquipment, statLines, unequipItem, wornIn, STAT_KEYS, type EquipSlot, type EquipStats, type Equipment } from './sim/equipment';
import { combineAll, combineGroup, combineGroups, combinePreview, COMBINE_COUNT } from './sim/equipment';
import { GEAR_SETS, SET_OF_BASE, activeTiers, setCounts, type GearSet } from './sim/gearSets';
import { saveMeta, type Meta } from './sim/meta';
import { UNITS } from './sim/units';
import { EQUIP_ICONS } from './equipArt';
import { paintGearIcon } from './gearIcons';
import { shopArt } from './bookArt';
import { durabilityOf, maxDurability, repairCost, wearState } from './sim/wear';
import { sellAsks, sellPiece, stallRepair } from './sim/stall';
import { sellPrice } from './sim/equipment';
import { todayKey } from './modes';
import { icon } from './menuArt';
import { play } from './render/sound';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** An item's icon: its painting in its grade's frame and glow (`gearIcons.ts`), or the old pixel icon on a rarity-coloured
 *  frame for a base the painted atlas does not hold. */
export function itemIcon(it: Equipment | undefined, slot: EquipSlot, size: 'big' | 'small' = 'big'): HTMLElement {
  const frame = el('span', `eqIcon ${size}${it ? ` r${it.rarity}` : ' empty'}`);
  const base = it ? it.base : { weapon: 'ironSword', armour: 'plateCuirass', trinket: 'ironRing' }[slot];
  if (paintGearIcon(frame, base, it ? it.rarity : 0, size === 'big' ? 64 : 44)) return wearMarks(frame, it);
  const img = el('img');
  img.alt = '';
  img.draggable = false;
  img.decoding = 'sync';
  img.src = EQUIP_ICONS[it ? EQUIP_BASES[it.base].icon : { weapon: 'sword', armour: 'plate', trinket: 'ring' }[slot]];
  frame.append(img);
  return wearMarks(frame, it);
}

/** A piece that has lost durability shows it (SHOP-BOOKS-GEAR, `wear.ts`): a slim bar along the foot (green, amber when worn, red
 *  when broken), the worn or broken badge, and a broken piece greyed under its cracks. A full piece shows nothing new. */
export function wearMarks(frame: HTMLElement, it: Equipment | undefined): HTMLElement {
  if (!it || !(it.wear ?? 0)) return frame;
  const state = wearState(it);
  frame.classList.add(`wear-${state}`);
  if (state === 'broken') {
    const cracks = el('i', 'eqCracks');
    cracks.style.backgroundImage = `url(${shopArt('wear-broken')})`;
    frame.append(cracks);
  }
  if (state !== 'good') {
    const badge = el('img', 'eqBadge');
    badge.src = shopArt(state === 'broken' ? 'badge-broken' : 'badge-worn');
    badge.alt = state === 'broken' ? 'Broken' : 'Worn';
    frame.append(badge);
  }
  const bar = el('i', 'eqDur');
  const fill = el('b');
  fill.style.width = `${Math.round((durabilityOf(it) / maxDurability(it)) * 100)}%`;
  bar.append(fill);
  frame.append(bar);
  return frame;
}

const CALLING_NAMES = { melee: 'melee fighters', shooter: 'shooters', caster: 'casters' } as const;

/** The stat changes `next` makes against `cur` (either may be missing): a row per stat either has. */
function compareRows(next: EquipStats, cur: EquipStats | undefined): HTMLElement[] {
  const rows: HTMLElement[] = [];
  const lines = new Map(statLines(next).map((l) => [l.key, l]));
  const was = new Map(statLines(cur ?? ({} as EquipStats)).map((l) => [l.key, l]));
  for (const key of STAT_KEYS) {
    const a = lines.get(key);
    const b = was.get(key);
    if (!a && !b) continue;
    const row = el('div', 'eqStat');
    row.append(el('span', '', (a ?? b)!.label), el('b', '', a ? a.text : '–'));
    if (cur) {
      const d = Math.round((next[key] - cur[key]) * 1000) / 1000;
      if (d !== 0) {
        const unit = key === 'def' || key === 'range' ? '' : '%';
        const v = key === 'def' ? Math.round(d * 10) / 10 : key === 'range' ? d : Math.round(d * 100);
        row.append(el('em', d > 0 ? 'up' : 'down', `${d > 0 ? '▲' : '▼'}${Math.abs(v)}${unit}`));
      }
    }
    rows.push(row);
  }
  return rows;
}

/** What the picker shows for one item: its icon and name, the stat rows (against `against` when given), the affixes. */
function itemCard(it: Equipment, kind: string, against?: Equipment): HTMLElement {
  const base = EQUIP_BASES[it.base];
  const card = el('div', 'eqCard');
  const head = el('div', 'eqHead');
  const title = el('div');
  title.append(el('b', '', itemName(it)), el('small', '', `${RARITY_NAMES[it.rarity]} · Lv ${it.level}`));
  head.append(itemIcon(it, base.slot, 'small'), title);
  card.append(head);
  const stats = itemStats(it, kind);
  card.append(...compareRows(stats, against ? itemStats(against, kind) : undefined));
  // (its durability: SHOP-BOOKS-GEAR, `wear.ts`)
  const state = wearState(it);
  card.append(el('small', `eqDurLine ${state}`, `Durability ${Math.ceil(durabilityOf(it))}/${maxDurability(it)}${state === 'broken' ? ' · Broken: gives nothing until mended' : state === 'worn' ? ' · Worn' : ''}`));
  const sig = stats.abilities[0];
  if (sig) card.append(el('p', 'eqAffix', `${sig.name}: ${describeAbility(base.ability, sig.s)}`));
  else if (!hasAbility(it.rarity)) card.append(el('small', 'eqDim', `Epic and up: ${base.ability.name}`));
  if (base.calling && base.calling === callingOf(kind)) card.append(el('p', 'eqSuit', `Suits ${CALLING_NAMES[base.calling]}: more of its stats`));
  else if (base.calling) card.append(el('small', 'eqDim', `Made for ${CALLING_NAMES[base.calling]}`));
  return card;
}


/** The bases a kind wears now, optionally with `swap` in place of its piece in that slot's. */
function wornBases(meta: Meta, kind: string, swap?: Equipment): string[] {
  const out: string[] = [];
  for (const slot of EQUIP_SLOTS) {
    const it = swap && EQUIP_BASES[swap.base].slot === slot ? swap : wornIn(meta, kind, slot);
    if (it) out.push(it.base);
  }
  return out;
}

/** One gear set's progress: its name and count, its pieces (worn ones lit) and each tier (lit when on). */
function setCard(set: GearSet, worn: ReadonlySet<string>): HTMLElement {
  const n = set.pieces.filter((p) => worn.has(p)).length;
  const on = activeTiers(set, n).length;
  const card = el('div', `eqSet${on ? ' on' : ''}`);
  card.style.setProperty('--sc', set.colour);
  const head = el('div', 'eqSetHead');
  head.append(el('b', '', set.name), el('small', '', `${n} / ${set.pieces.length}`));
  card.append(head);
  const pieces = el('div', 'eqSetPieces');
  for (const p of set.pieces) pieces.append(el('span', worn.has(p) ? 'got' : '', EQUIP_BASES[p].name));
  card.append(pieces);
  card.append(el('small', `eqTier${n >= 2 ? ' on' : ''}`, `2 pieces: ${set.two.text}`));
  if (set.three) card.append(el('small', `eqTier${n >= 3 ? ' on' : ''}`, `3 pieces: ${set.three.text}`));
  return card;
}

/** The panel for a hero kind. `changed` is told after anything is equipped, unequipped or salvaged (so the page can refresh). */
export function drawEquipment(meta: Meta, kind: string, changed: () => void = () => {}): HTMLElement {
  const panel = el('div', 'eqPanel');
  const commit = () => {
    saveMeta(meta);
    changed();
  };

  let takeOthers = false;
  const overview = () => {
    panel.replaceChildren(el('h4', '', 'Equipment'));
    const slots = el('div', 'eqSlots');
    for (const slot of EQUIP_SLOTS) {
      const it = wornIn(meta, kind, slot);
      const b = el('button', 'eqSlot');
      b.type = 'button';
      b.setAttribute('aria-label', `${SLOT_NAMES[slot]}: ${it ? itemName(it) : 'empty'}. Choose equipment`);
      b.append(el('span', 'eqSlotLabel', SLOT_NAMES[slot]), itemIcon(it, slot), el('small', '', it ? itemName(it) : 'Empty slot'));
      if (it) b.append(el('span', 'eqSlotLevel', `Lv ${it.level}`));
      b.addEventListener('click', () => picker(slot));
      slots.append(b);
    }
    panel.append(slots);
    const s = equipStats(meta, kind);
    const lines = s ? statLines(s).filter((l) => ['atk', 'hp', 'def', 'atkSpeed', 'moveSpeed', 'crit', 'range'].includes(l.key)).map((l) => `${l.text} ${l.label.toLowerCase()}`) : [];
    panel.append(el('p', 'eqSum', lines.length ? lines.join(' · ') : 'Nothing worn. Chests hold equipment for any hero.'));
    // the best pieces: for this hero or for everyone (strongest first); by default only from the bag
    const auto = el('div', 'eqAuto');
    const best = el('button', 'primary', 'Equip best');
    const all = el('button', '', 'Equip all heroes');
    const toggle = el('button', 'eqTake', takeOthers ? 'Taking from other heroes' : 'From the bag only');
    const note = el('small', 'eqDim', takeOthers ? 'Pieces other heroes wear may be moved to a stronger fit.' : 'Pieces other heroes wear stay where they are.');
    for (const b of [best, all, toggle]) b.type = 'button';
    best.addEventListener('click', () => done(`${equipBest(meta, kind, takeOthers)} slot(s) changed`));
    all.addEventListener('click', () => done(`${equipAll(meta, takeOthers)} slot(s) changed across the heroes`));
    toggle.addEventListener('click', () => {
      takeOthers = !takeOthers;
      overview();
    });
    const done = (what: string) => {
      commit();
      overview();
      panel.append(el('small', 'eqUp', what));
    };
    auto.append(best, all, toggle);
    panel.append(auto, note);
    // the gear sets: the ones this hero wears a piece of, with how far each is
    const worn = new Set(wornBases(meta, kind));
    const mine = [...setCounts([...worn]).keys()];
    if (mine.length) {
      panel.append(el('h4', 'eqSub', 'Gear sets'));
      for (const set of mine) panel.append(setCard(set, worn));
    }
    const more = el('div', 'eqAuto');
    const sets = el('button', '', 'All sets');
    const spares = combineGroups(meta).length;
    const comb = el('button', '', spares ? `Combine (${spares})` : 'Combine');
    for (const b of [sets, comb]) b.type = 'button';
    sets.addEventListener('click', allSets);
    comb.addEventListener('click', () => combineView());
    more.append(sets, comb);
    panel.append(more);
  };

  const allSets = () => {
    panel.replaceChildren(el('h4', '', 'Gear sets'));
    panel.append(el('p', 'eqSum', 'Wear 2 or 3 pieces of a set, of any grade, for its bonus.'));
    const worn = new Set(wornBases(meta, kind));
    const list = el('div', 'eqList');
    for (const set of GEAR_SETS) list.append(setCard(set, worn));
    panel.append(list);
    const back = el('button', '', 'Back');
    back.type = 'button';
    back.addEventListener('click', overview);
    panel.append(back);
  };

  const combineView = (said = '') => {
    panel.replaceChildren(el('h4', '', 'Combine'));
    panel.append(el('p', 'eqSum', `${COMBINE_COUNT} spare pieces of one kind and grade make 1 of the next grade, at the best item level of the three. Worn pieces are never used.`));
    if (said) panel.append(el('small', 'eqUp', said));
    const groups = combineGroups(meta);
    const list = el('div', 'eqList');
    for (const g of groups) {
      const made = combinePreview(g);
      const row = el('div', `eqRow r${made.rarity}`);
      const card = el('div', 'eqCard');
      const head = el('div', 'eqHead');
      const title = el('div');
      title.append(el('b', '', `${EQUIP_BASES[g.base].name}`), el('small', '', `${g.items.length} ${RARITY_NAMES[g.rarity]} → ${RARITY_NAMES[made.rarity]} · Lv ${made.level}`));
      head.append(itemIcon({ id: 0, ...made }, EQUIP_BASES[g.base].slot, 'small'), title);
      card.append(head);
      if (SET_OF_BASE[g.base]) card.append(el('small', 'eqDim', `Part of ${SET_OF_BASE[g.base].name}`));
      row.append(card);
      const go = el('button', 'primary', 'Combine');
      go.type = 'button';
      go.addEventListener('click', () => {
        const it = combineGroup(meta, g.base, g.rarity);
        commit();
        combineView(it ? `Made ${itemName(it)} (${RARITY_NAMES[it.rarity]}, Lv ${it.level})` : '');
      });
      row.append(go);
      list.append(row);
    }
    if (!groups.length) panel.append(el('p', 'eqSum', 'Nothing to combine yet. Chests give more.'));
    panel.append(list);
    const btns = el('div', 'eqAuto');
    const everything = el('button', 'primary', 'Auto-combine all');
    everything.type = 'button';
    everything.disabled = !groups.length;
    everything.addEventListener('click', () => {
      const made = combineAll(meta);
      commit();
      combineView(made.length ? `Made ${made.length} piece(s)` : '');
    });
    const back = el('button', '', 'Back');
    back.type = 'button';
    back.addEventListener('click', overview);
    btns.append(everything, back);
    panel.append(btns);
  };

  /** Mend a piece here, at the stall's price (it counts for standing as a repair at the stall does). */
  const repairButton = (it: Equipment, then: () => void): HTMLButtonElement => {
    const cost = repairCost(it, meta.castle.armoury);
    const b = el('button', 'eqRepair');
    b.type = 'button';
    b.append(icon(shopArt('repair'), 'eqRepairIco'), `Repair · ${cost}`);
    b.disabled = meta.crowns < cost;
    b.addEventListener('click', () => {
      if (!stallRepair(meta, it.id, todayKey())) return;
      play('coin');
      commit();
      then();
    });
    return b;
  };

  const picker = (slot: EquipSlot) => {
    const cur = wornIn(meta, kind, slot);
    panel.replaceChildren(el('h4', '', `${SLOT_NAMES[slot]} · ${UNITS[kind].name}`));
    if (cur) {
      const worn = el('div', `eqRow worn r${cur.rarity}`);
      worn.append(el('small', 'eqTag', 'Worn'), itemCard(cur, kind));
      const off = el('button', '', 'Unequip');
      off.type = 'button';
      off.addEventListener('click', () => {
        unequipItem(meta, kind, slot);
        commit();
        picker(slot);
      });
      worn.append(off);
      if (cur.wear) worn.append(repairButton(cur, () => picker(slot)));
      panel.append(worn);
    }
    const spare = spareEquipment(meta, slot).sort((x, y) => y.rarity - x.rarity || y.level - x.level || x.id - y.id);
    if (!spare.length) panel.append(el('p', 'eqSum', cur ? 'No other pieces for this slot.' : 'No pieces for this slot yet. Chests hold them.'));
    const list = el('div', 'eqList');
    for (const it of spare) {
      const row = el('div', `eqRow r${it.rarity}`);
      row.append(itemCard(it, kind, cur));
      const set = SET_OF_BASE[it.base];
      if (set) {
        const before = set.pieces.filter((p) => wornBases(meta, kind).includes(p)).length;
        const after = set.pieces.filter((p) => wornBases(meta, kind, it).includes(p)).length;
        row.append(el('small', `eqSetHint${after > before ? ' up' : after < before ? ' down' : ''}`, `${set.name} set: ${before} → ${after} of ${set.pieces.length}`));
      }
      const btns = el('div', 'eqBtns');
      const on = el('button', 'primary', cur ? 'Swap' : 'Equip');
      on.type = 'button';
      on.addEventListener('click', () => {
        equipItem(meta, kind, it.id);
        commit();
        overview();
      });
      // (Sell took Salvage's place: the same crowns for a full piece, less for a worn one; an Epic or the last of a base asks first, by a
      // second tap; the piece waits on the stall's Sold today shelf until midnight)
      const sell = el('button', '', `Sell +${sellPrice(it)}`);
      sell.type = 'button';
      let sure = !sellAsks(meta, it);
      sell.addEventListener('click', () => {
        if (!sure) {
          sure = true;
          sell.textContent = `Sell for ${sellPrice(it)}? Tap again`;
          sell.classList.add('eqSure');
          return;
        }
        sellPiece(meta, it.id, todayKey());
        play('coin');
        commit();
        picker(slot);
      });
      btns.append(on, sell);
      if (it.wear) btns.append(repairButton(it, () => picker(slot)));
      row.append(btns);
      list.append(row);
    }
    panel.append(list);
    const back = el('button', '', 'Back');
    back.type = 'button';
    back.addEventListener('click', overview);
    panel.append(back);
  };

  overview();
  return panel;
}
