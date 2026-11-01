// The relic card (RELICS-2): what one relic is, as the run holds it now. Its icon, name and rarity; its line of the keep's history (always
// shown, the owner's choice); what it does; its price in red; a growing relic's size now; and its Chapter: the four pieces (the held ones
// lit), the two bonuses and the chapter's line of story. Opened by a tap on a relic on the wave-prep screen (`events.ts`), in the Pack, and
// on the tower's map (`towerElites.ts`). It only reads the run.

import { burntOut, grownBy, relicEffects, relicName, RELICS, PHOENIX_RISES, type RelicMarks } from './sim/relics';
import { setCount, setOf, tiersOn } from './sim/relicSets';
import { iconImg, relicIcon } from './render/items';

/** What the card reads: the run's relics, its tally and its purse. */
export interface RelicHolder {
  relics?: readonly string[];
  relicMarks?: RelicMarks;
  gold?: number;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const RARITY = { common: 'Common', rare: 'Rare', eidolon: 'Eidolon', storied: 'Storied' } as const;
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
const STATS = { atk: 'attack', crit: 'crit chance', charge: 'skill charge' } as const;

/** A growing relic's line: how big it is now, and how big it can grow (or the Phoenix's rises so far). */
export function growthLine(h: RelicHolder, id: string): string | null {
  const ctx = { marks: h.relicMarks, gold: h.gold };
  if (id === 'phoenix') return burntOut(id, ctx) ? `Burnt out after ${PHOENIX_RISES} rises: +5% attack` : `Rises so far: ${h.relicMarks?.rises ?? 0} of ${PHOENIX_RISES}`;
  if (id === 'luckyCoin') return `Now: +${relicEffects([id], ctx).gold ?? 0} gold for each win`;
  const v = grownBy(id, ctx);
  const g = RELICS[id]?.grow;
  if (v === undefined || !g) return null;
  return `Now: +${Math.round(v * 100)}% ${STATS[g.stat]} (at most +${Math.round(g.max * 100)}%)`;
}

/** The card's body for one relic. */
export function relicCard(h: RelicHolder, id: string): HTMLElement {
  const r = RELICS[id];
  const ctx = { marks: h.relicMarks, gold: h.gold };
  const card = el('div', `rlCard ${r?.rarity ?? 'common'}`);
  if (!r) return card;
  const head = el('div', 'rlHead');
  const pic = relicIcon(id) ? iconImg(relicIcon(id), r.name) : el('i', 'rlBlank');
  const words = el('span');
  words.append(el('b', '', relicName(id, ctx)), el('small', `rlRarity ${r.rarity}`, RARITY[r.rarity]));
  head.append(pic, words);
  card.append(head);
  if (r.lore) card.append(el('p', 'rlLore', r.lore));
  card.append(el('p', 'rlRule', r.text.charAt(0).toUpperCase() + r.text.slice(1) + '.'));
  if (r.price) card.append(el('p', 'rlPrice', `Price: ${r.price}.`));
  const grow = growthLine(h, id);
  if (grow) card.append(el('p', 'rlGrow', grow));
  const set = setOf(id);
  if (set) {
    const owned = h.relics ?? [];
    const n = setCount(set, owned);
    const box = el('div', 'rlSet');
    box.style.setProperty('--set', set.colour);
    box.append(el('h3', '', `${set.chapter ? `Chapter ${ROMAN[set.chapter]}: ` : ''}${set.name} · ${n}/${set.relics.length}`));
    if (set.story) box.append(el('p', 'rlStory', set.story));
    const pieces = el('div', 'rlPieces');
    for (const p of set.relics) {
      const piece = el('span', `rlPiece${owned.includes(p) ? ' held' : ''}${p === id ? ' me' : ''}`);
      piece.append(relicIcon(p) ? iconImg(relicIcon(p), RELICS[p].name) : el('i', 'rlBlank'), el('small', '', RELICS[p].name.replace(/^The /, '')));
      pieces.append(piece);
    }
    box.append(pieces);
    const on = tiersOn(set, n);
    for (const [need, tier] of [[2, set.two], [3, set.three]] as const) {
      const row = el('p', `rlTier${on.includes(tier) ? ' on' : ''}`);
      row.append(el('b', '', `${need} of ${set.relics.length}`), el('span', '', tier.text));
      box.append(row);
    }
    card.append(box);
  }
  return card;
}

/** The card over the screen, with a Close button; a tap anywhere closes it. */
export function openRelicCard(h: RelicHolder, id: string, root: HTMLElement = document.body, onClose?: () => void): void {
  root.querySelector(':scope > .rlWrap')?.remove();
  const wrap = el('div', 'rlWrap');
  const card = relicCard(h, id);
  card.append(el('button', 'rlClose', 'Close'));
  wrap.append(card);
  wrap.addEventListener('click', () => {
    wrap.remove();
    onClose?.();
  });
  root.append(wrap);
}
