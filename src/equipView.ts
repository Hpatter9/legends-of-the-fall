// The Equipment panel of the hero sheet: three slots (weapon, armour, trinket) showing the worn item's icon or an empty
// frame. A tap on a slot opens a picker in its place: what is worn, then the spare items for that slot with what each
// would change (green for better, red for worse) and the buttons Equip, Unequip and Salvage. Reads and changes the meta
// only through `equipment.ts`.

import { AFFIXES, EQUIP_BASES, EQUIP_SLOTS, SALVAGE_CROWNS, SLOT_NAMES, callingOf, equipItem, equipStats, itemName, itemStats, salvageItem, spareEquipment, statLines, unequipItem, wornIn, STAT_KEYS, type EquipSlot, type EquipStats, type Equipment, type StatKey } from './sim/equipment';
import { RARITY_NAMES, saveMeta, type Meta } from './sim/meta';
import { UNITS } from './sim/units';
import { EQUIP_ICONS } from './equipArt';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** An item's icon on a rarity-coloured frame. */
export function itemIcon(it: Equipment | undefined, slot: EquipSlot, size: 'big' | 'small' = 'big'): HTMLElement {
  const frame = el('span', `eqIcon ${size}${it ? ` r${it.rarity}` : ' empty'}`);
  const img = el('img');
  img.alt = '';
  img.draggable = false;
  img.src = EQUIP_ICONS[it ? EQUIP_BASES[it.base].icon : { weapon: 'sword', armour: 'plate', trinket: 'ring' }[slot]];
  frame.append(img);
  return frame;
}

/** The stats the affixes give; they are shown as their own lines, not as rows. */
const AFFIX_STATS = new Set<StatKey>(Object.values(AFFIXES).map((a) => a.stat));
const CALLING_NAMES = { melee: 'melee fighters', shooter: 'shooters', caster: 'casters' } as const;

/** The stat changes `next` makes against `cur` (either may be missing): a row per stat either has. */
function compareRows(next: EquipStats, cur: EquipStats | undefined): HTMLElement[] {
  const rows: HTMLElement[] = [];
  const lines = new Map(statLines(next).map((l) => [l.key, l]));
  const was = new Map(statLines(cur ?? ({} as EquipStats)).map((l) => [l.key, l]));
  for (const key of STAT_KEYS.filter((k) => !AFFIX_STATS.has(k))) {
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
  for (const a of it.affixes) card.append(el('p', 'eqAffix', `${affixName(a)}: ${affixText(a, stats)}`));
  if (base.calling && base.calling === callingOf(kind)) card.append(el('p', 'eqSuit', `Suits ${CALLING_NAMES[base.calling]}: more of its stats`));
  else if (base.calling) card.append(el('small', 'eqDim', `Made for ${CALLING_NAMES[base.calling]}`));
  return card;
}

const affixName = (a: keyof typeof AFFIXES) => AFFIXES[a].name;
const affixText = (a: keyof typeof AFFIXES, s: EquipStats) => AFFIXES[a].text(s[AFFIXES[a].stat]);

/** The panel for a hero kind. `changed` is told after anything is equipped, unequipped or salvaged (so the page can refresh). */
export function drawEquipment(meta: Meta, kind: string, changed: () => void = () => {}): HTMLElement {
  const panel = el('div', 'eqPanel');
  const commit = () => {
    saveMeta(meta);
    changed();
  };

  const overview = () => {
    panel.replaceChildren(el('h4', '', 'Equipment'));
    const slots = el('div', 'eqSlots');
    for (const slot of EQUIP_SLOTS) {
      const it = wornIn(meta, kind, slot);
      const b = el('button', 'eqSlot');
      b.type = 'button';
      b.append(itemIcon(it, slot), el('small', '', it ? itemName(it) : SLOT_NAMES[slot]));
      b.addEventListener('click', () => picker(slot));
      slots.append(b);
    }
    panel.append(slots);
    const s = equipStats(meta, kind);
    const lines = s ? statLines(s).filter((l) => ['atk', 'hp', 'def', 'atkSpeed', 'moveSpeed', 'crit', 'range'].includes(l.key)).map((l) => `${l.text} ${l.label.toLowerCase()}`) : [];
    panel.append(el('p', 'eqSum', lines.length ? lines.join(' · ') : 'Nothing worn. Chests hold equipment for any hero.'));
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
      panel.append(worn);
    }
    const spare = spareEquipment(meta, slot).sort((x, y) => y.rarity - x.rarity || y.level - x.level || x.id - y.id);
    if (!spare.length) panel.append(el('p', 'eqSum', cur ? 'No other pieces for this slot.' : 'No pieces for this slot yet. Chests hold them.'));
    const list = el('div', 'eqList');
    for (const it of spare) {
      const row = el('div', `eqRow r${it.rarity}`);
      row.append(itemCard(it, kind, cur));
      const btns = el('div', 'eqBtns');
      const on = el('button', 'primary', cur ? 'Swap' : 'Equip');
      on.type = 'button';
      on.addEventListener('click', () => {
        equipItem(meta, kind, it.id);
        commit();
        overview();
      });
      const sell = el('button', '', `Salvage +${SALVAGE_CROWNS[it.rarity] + it.level - 1}`);
      sell.type = 'button';
      sell.addEventListener('click', () => {
        salvageItem(meta, it.id);
        commit();
        picker(slot);
      });
      btns.append(on, sell);
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
