// The Spellbook: the king's loadout. Three slots, a power-budget meter, and every spell with its mana cost, power,
// cooldown and text; a locked one shows its crown price. Tap a spell to equip it, unequip it or unlock it. Self-contained:
// `spellbookView()` builds the book's body (the Spells tab's library puts it on a lectern) and `openSpellbook()` still shows it as an overlay. `bindSpellbook` gives it the Meta once (and
// a callback for when something changed, to save and refresh the crowns shown). All the rules are in `sim/spells.ts`.

import { spellIconHtml } from './spellIcons';
import { budgetOf, equipBlock, equipSpell, LOADOUT_SIZE, powerOf, SPELLS, SPELL_IDS, unequipSpell, unlockSpell, type SpellId, type SpellMeta } from './sim/spells';

const CSS = `
#spellbook { position: fixed; inset: 0; z-index: 8; display: flex; flex-direction: column; gap: 10px; padding: calc(env(safe-area-inset-top) + 10px) 12px calc(env(safe-area-inset-bottom) + 10px); background: rgba(24, 12, 8, 0.97); overflow-y: auto; touch-action: pan-y; color: #f3e6d0; }
#spellbook[hidden] { display: none; }
#spellbook header { display: flex; align-items: center; gap: 10px; }
#spellbook h2 { margin: 0; flex: 1; font-size: 20px; color: var(--gold, #f0c060); }
.sbBody { display: flex; flex-direction: column; gap: 8px; max-width: 480px; width: 100%; margin: 0 auto; }
.sbMeter { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.sbMeter i { flex: 1; height: 10px; background: #2a1a10; border: 1px solid #5a3a22; border-radius: 5px; overflow: hidden; }
.sbMeter i span { display: block; height: 100%; background: linear-gradient(#ffd27a, #d6903a); }
.sbMeter.full i span { background: linear-gradient(#ff9a7a, #d6523a); }
.sbSlots { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.sbSlot { min-height: 44px; padding: 6px; border: 1px dashed #5a3a22; border-radius: 6px; background: #2a1a10; color: inherit; font: inherit; font-size: 12px; }
.sbSlot.on { border-style: solid; border-color: var(--gold, #f0c060); }
.sbSlot em { display: block; font-style: normal; color: #7cc0ff; font-size: 11px; }
.sbCard { display: flex; flex-direction: column; gap: 3px; padding: 8px; border: 1px solid #5a3a22; border-radius: 6px; background: #2a1a10; font-size: 12px; }
.sbCard.on { border-color: var(--gold, #f0c060); }
.sbCard.locked { opacity: 0.8; }
.sbCard .top { display: flex; align-items: baseline; gap: 8px; }
.sbCard .top b { flex: 1; font-size: 14px; }
.sbCard .stats { color: #7cc0ff; font-size: 11px; }
.sbCard .text { color: #cdb99a; }
.sbCard button { align-self: flex-end; min-height: 36px; }
.sbNote { min-height: 15px; font-size: 12px; text-align: center; color: #ff9a7a; }
`;

let meta: SpellMeta | null = null;
let changed: () => void = () => {};
let root: HTMLElement | null = null;
let styled = false;

/** Give the spellbook the Meta to read and change, and what to call after a change (save, redraw the crowns). */
export function bindSpellbook(m: SpellMeta, onChange: () => void): void {
  meta = m;
  changed = onChange;
}

const pips = (n: number) => '●'.repeat(n) + '○'.repeat(5 - n);

function addStyle(): void {
  if (styled) return;
  styled = true;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
}

const el = (tag: string, cls = '', html = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.innerHTML = html;
  return e;
};

/** The book's body: the power meter, the three slots and a card for every spell. `redraw()` rebuilds it from the Meta (after a change anywhere). */
export function spellbookView(onDraw: () => void = () => {}): { root: HTMLElement; redraw(): void; crowns(): string } {
  addStyle();
  const body = el('div', 'sbBody');
  let note = '';
  const act = (fn: () => boolean, refusal: string): void => {
    note = fn() ? '' : refusal;
    if (!note) changed();
    redraw();
  };
  function redraw(): void {
    if (!meta) return;
    const m = meta;
    const l = m.spellbook;
    body.replaceChildren();
    const used = powerOf(l.equipped);
    const budget = budgetOf(m);
    body.append(el('div', `sbMeter${used >= budget ? ' full' : ''}`, `<span>Power</span><i><span style="width:${Math.min(100, (used / budget) * 100)}%"></span></i><b>${used}/${budget}</b>`));

    const slots = el('div', 'sbSlots');
    for (let i = 0; i < LOADOUT_SIZE; i++) {
      const id = l.equipped[i];
      const slot = el('button', `sbSlot${id ? ' on' : ''}`, id ? `${spellIconHtml(id)}<b>${SPELLS[id].name}</b><em>${SPELLS[id].cost} mana · power ${SPELLS[id].power}</em>` : '<span>Empty</span>');
      if (id) slot.addEventListener('click', () => act(() => unequipSpell(m, id), ''));
      slots.append(slot);
    }
    body.append(slots, el('div', 'sbNote', note));

    // equipped first, then the owned, then the locked (cheapest first)
    const rank = (id: SpellId) => (l.equipped.includes(id) ? 0 : l.owned.includes(id) ? 1 : 2);
    const order = [...SPELL_IDS].sort((a, b) => rank(a) - rank(b) || SPELLS[a].price - SPELLS[b].price);
    for (const id of order) {
      const sp = SPELLS[id];
      const owned = l.owned.includes(id);
      const on = l.equipped.includes(id);
      const card = el('div', `sbCard${on ? ' on' : ''}${owned ? '' : ' locked'}`);
      card.append(el('div', 'top', `${spellIconHtml(id)}<b>${sp.name}</b><span>${pips(sp.power)}</span>`));
      card.append(el('div', 'stats', `${sp.cost} mana · power ${sp.power} · ${sp.cooldownMs / 1000}s cooldown`));
      card.append(el('div', 'text', sp.text));
      const btn = el('button') as HTMLButtonElement;
      if (on) {
        btn.textContent = 'Unequip';
        btn.addEventListener('click', () => act(() => unequipSpell(m, id), ''));
      } else if (owned) {
        btn.textContent = 'Equip';
        const block = equipBlock(m, id);
        btn.addEventListener('click', () => act(() => equipSpell(m, id), block ?? ''));
      } else {
        btn.textContent = `Unlock · ${sp.price} crowns`;
        btn.disabled = m.crowns < sp.price;
        btn.addEventListener('click', () => act(() => unlockSpell(m, id), 'Not enough crowns'));
      }
      card.append(btn);
      body.append(card);
    }
    onDraw();
  }
  redraw();
  return { root: body, redraw, crowns: () => `${meta?.crowns ?? 0} crowns` };
}

/** Show the spellbook over whatever is on screen. */
export function openSpellbook(): void {
  if (!meta) return;
  addStyle();
  root?.remove();
  root = el('div');
  root.id = 'spellbook';
  root.innerHTML = '<header><h2>Spellbook</h2><span id="sbCrowns"></span><button id="sbClose">Close</button></header>';
  const view = spellbookView(() => {
    const c = root?.querySelector('#sbCrowns');
    if (c) c.textContent = `${meta?.crowns ?? 0} crowns`;
  });
  view.root.id = 'sbBody';
  root.append(view.root);
  view.redraw();
  document.body.append(root);
  root.querySelector('#sbClose')!.addEventListener('click', () => root!.remove());
}
