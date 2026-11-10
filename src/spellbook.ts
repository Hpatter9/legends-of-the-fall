// The king's spell loadout and collection, shared by the painted study and the
// standard overlay. Rules and saves stay in the simulation; this is presentation.
import { spellIconHtml } from './spellIcons';
import { menuChoice, menuFoot, menuSection, menuWell, ornateMenu, type OrnateMenu } from './ornateMenu';
import type { Meta } from './sim/meta';
import { spellLock } from './sim/spellSources';
import { SPELLS, SPELL_IDS, RANK_MAX, RIDERS, type SpellId } from './sim/spells';
import { castList, equipBlock, equipSpell, fitSchool, schoolOf, schoolsOfSpell, SCHOOL_SLOTS, unequipSpell } from './sim/schools';
import { DECREES } from './sim/decrees';
import { marksEarned, marksFree, rankBlock, rankIn, rankUp } from './sim/spellRanks';
import { namesHiddenMode } from './sim/hiddenModes';

let meta: Meta | null = null;
let changed: () => void = () => {};
let rulerId: () => string = () => '';
let overlay: OrnateMenu | null = null;

export function bindSpellbook(m: Meta, onChange: () => void, ruler: () => string = () => ''): void {
  meta = m;
  changed = onChange;
  rulerId = ruler;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

type Filter = 'known' | 'school' | 'locked';

export function spellbookView(onDraw: () => void = () => {}): { root: HTMLElement; redraw(): void; known(): string } {
  const body = el('div', 'sbBody');
  let filter: Filter = 'known';
  let note = '';
  let schoolExpanded = false;
  const expanded = new Set<SpellId>();
  const act = (fn: () => boolean, refusal: string, success: string): void => {
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement.dataset.sbFocus : undefined;
    const ok = fn();
    note = ok ? success : refusal;
    if (ok) changed();
    redraw();
    if (focused) {
      const target = body.querySelector<HTMLElement>(`[data-sb-focus="${focused}"]`)
        ?? (focused.startsWith('rank-') ? body.querySelector<HTMLElement>(`[data-spell="${focused.slice(5)}"] .sbEquip`) : null);
      target?.focus({ preventScroll: true });
    }
  };

  function redraw(): void {
    if (!meta) return;
    const m = meta;
    const l = m.spellbook;
    const sc = schoolOf(rulerId());
    fitSchool(l, sc.id);
    const dc = DECREES[sc.decree];
    body.replaceChildren();

    const loadout = menuWell(body);
    loadout.classList.add('sbLoadout');
    const slots = menuSection(loadout, 'Battle loadout', '3 school slots + 1 open', 4);
    slots.classList.add('sbSlots');
    const slot = (id: SpellId | undefined, label: string, open: boolean, index: number) => {
      const b = menuChoice(slots, { title: id ? SPELLS[id].name : 'Empty', on: !!id });
      b.classList.add('sbSlot');
      b.classList.toggle('open', open);
      b.dataset.sbFocus = `slot-${index}`;
      b.innerHTML = `<small>${label}</small>${id ? spellIconHtml(id) : '<span class="sbEmpty" aria-hidden="true">+</span>'}<b>${id ? SPELLS[id].name : 'Empty slot'}</b><em>${id ? `${SPELLS[id].cost} mana` : open ? 'Any school' : sc.name}</em>`;
      b.setAttribute('aria-label', id ? `${label}: ${SPELLS[id].name}. Tap to unequip` : `${label}: empty. Choose a spell below`);
      b.addEventListener('click', () => {
        if (id) act(() => unequipSpell(l, id), '', `${SPELLS[id].name} unequipped.`);
        else {
          filter = open ? 'known' : 'school';
          redraw();
          body.querySelector<HTMLButtonElement>('.sbFilters button[aria-pressed="true"]')?.focus({ preventScroll: true });
          body.querySelector('.sbFilters')?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
        }
      });
    };
    for (let i = 0; i < SCHOOL_SLOTS; i++) slot(l.equipped[i], `School ${i + 1}`, false, i);
    slot(l.open, 'Open', true, SCHOOL_SLOTS);
    loadout.append(el('p', 'sbHint', 'Tap an equipped spell to free its slot.'));

    const school = el('details', 'sbSchool');
    school.open = schoolExpanded;
    school.append(el('summary', '', `School of ${sc.name} · ${dc.name}`));
    school.append(el('p', '', `Your ruler grants three ${sc.name} slots and one open slot for any known spell. Change ruler in Settings to change school.`));
    school.append(el('p', '', `Decree: ${dc.text}. Once a fight, tap the mana when the Decree meter is full.`));
    school.addEventListener('toggle', () => { schoolExpanded = school.open; });
    body.append(school);

    const filters = el('div', 'sbFilters');
    filters.setAttribute('role', 'group');
    filters.setAttribute('aria-label', 'Browse spells');
    const counts = {
      known: l.owned.length,
      school: sc.spells.length,
      locked: SPELL_IDS.filter(id => !l.owned.includes(id)).length,
    };
    for (const [key, label] of [['known', 'Known'], ['school', 'Your school'], ['locked', 'Locked']] as const) {
      const b = el('button', `sbFilter${filter === key ? ' on' : ''}`, `${label} · ${counts[key]}`);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(filter === key));
      b.dataset.sbFocus = `filter-${key}`;
      b.addEventListener('click', () => { filter = key; redraw(); body.querySelector<HTMLElement>(`[data-sb-focus="filter-${key}"]`)?.focus({ preventScroll: true }); });
      filters.append(b);
    }
    body.append(filters);
    const marks = el('details', 'sbMarks');
    marks.append(el('summary', '', `✦ ${marksFree(m)} school ${marksFree(m) === 1 ? 'mark' : 'marks'} available`));
    marks.append(el('p', '', `${marksEarned(m)} earned. Raise the Mage Tower or clear an army to earn marks. Each mark raises a spell one rank, up to rank ${RANK_MAX}.`));
    body.append(marks);
    const status = el('div', 'sbNote', note);
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    body.append(status);

    const on = castList(l);
    const priority = (id: SpellId) => on.includes(id) ? 0 : l.owned.includes(id) ? (sc.spells.includes(id) ? 1 : 2) : 3;
    const order = [...SPELL_IDS].filter(id => filter === 'known' ? l.owned.includes(id) : filter === 'school' ? sc.spells.includes(id) : !l.owned.includes(id))
      .sort((a, b) => priority(a) - priority(b) || (spellLock(m, a)?.rank ?? 0) - (spellLock(m, b)?.rank ?? 0));
    const list = el('div', 'sbCollection');
    list.setAttribute('aria-label', `${filter === 'school' ? sc.name : filter === 'known' ? 'Known' : 'Locked'} spells`);
    body.append(list);
    if (!order.length) list.append(el('p', 'sbHint sbComplete', 'Every spell has been learnt. Your collection is complete.'));
    if (filter === 'locked' && order.length) list.append(el('p', 'sbHint', 'Learn spells from the Mage Tower, battle milestones or scrolls in gold and Mythic chests.'));
    for (const id of order) {
      const sp = SPELLS[id];
      const owned = l.owned.includes(id);
      const isOn = on.includes(id);
      const rk = rankIn(l, id);
      const card = menuWell(list);
      card.classList.add('sbCard');
      card.classList.toggle('on', isOn);
      card.classList.toggle('locked', !owned);
      card.dataset.spell = id;
      const icon = el('div', 'sbArt');
      icon.innerHTML = spellIconHtml(id);
      icon.setAttribute('aria-hidden', 'true');
      const content = el('div', 'sbCopy');
      const top = el('div', 'sbTop');
      top.append(el('h3', '', sp.name));
      if (isOn) top.append(el('span', 'sbEquipped', 'Equipped'));
      else if (!owned) top.append(el('span', 'sbLocked', 'Locked'));
      content.append(top, el('div', 'stats', `${sp.cost} mana · ${sp.cooldownMs / 1000}s cooldown`), el('p', 'text', sp.text));
      const rank = el('div', 'rank');
      rank.append(el('span', '', `Rank ${rk} / ${RANK_MAX}`));
      const pips = el('i', '', `${'◆'.repeat(rk)}${'◇'.repeat(RANK_MAX - rk)}`);
      pips.setAttribute('aria-hidden', 'true');
      rank.append(pips);
      content.append(rank);
      card.append(icon, content);
      const details = el('details', 'sbDetails');
      details.open = expanded.has(id);
      details.append(el('summary', '', 'School & rank details'));
      const schools = schoolsOfSpell(id).map(x => x.name);
      details.append(el('p', 'tags', schools.length ? `School of ${schools.join(', ')}${sc.spells.includes(id) ? ' · Your school' : ''}` : 'Any school · Open slot only'));
      if (rk > 1) details.append(el('p', '', `${rk === 2 ? '20' : '40'}% stronger · ${rk === 2 ? '15' : '30'}% quicker to cool`));
      details.append(el('p', `rider${rk >= RANK_MAX ? ' on' : ''}`, `Rank ${RANK_MAX}: ${RIDERS[id]}`));
      details.addEventListener('toggle', () => { if (details.open) expanded.add(id); else expanded.delete(id); });
      card.append(details);
      // (FIRST-HOUR: a spell whose milestone is in a hidden mode shows its other way in, the chest scroll, while the mode is hidden)
      const milestone = owned ? undefined : spellLock(m, id);
      const lock = milestone && namesHiddenMode(milestone.line) ? undefined : milestone;
      if (!owned) {
        const how = el('div', 'how', lock ? `${lock.line}${lock.need > 1 ? ` · ${lock.now}/${lock.need}` : ''}` : 'Find a spell scroll in a gold or Mythic chest.');
        if (lock && lock.need > 1) {
          const progress = el('progress');
          progress.max = lock.need;
          progress.value = lock.now;
          progress.setAttribute('aria-label', `${sp.name} unlock progress`);
          how.append(progress);
        }
        card.append(how);
        continue;
      }
      const acts = el('div', 'acts');
      if (rk < RANK_MAX) {
        const up = el('button', 'rankUp', 'Rank up · 1 mark');
        const why = rankBlock(m, id);
        up.disabled = !!why;
        up.dataset.sbFocus = `rank-${id}`;
        up.setAttribute('aria-label', `Rank up ${sp.name} for 1 mark${why ? `. ${why}` : ''}`);
        if (why) up.title = why;
        up.addEventListener('click', () => act(() => rankUp(m, id), why ?? '', `${sp.name} raised to rank ${rk + 1}.`));
        acts.append(up);
      }
      const block = isOn ? null : equipBlock(l, id, sc.id);
      const btn = el('button', 'sbEquip', isOn ? 'Unequip' : sc.spells.includes(id) && l.equipped.length < SCHOOL_SLOTS ? 'Equip' : 'Equip · Open slot');
      btn.dataset.sbFocus = `equip-${id}`;
      btn.disabled = !!block;
      btn.setAttribute('aria-label', `${btn.textContent}: ${sp.name}${block ? `. ${block}` : ''}`);
      btn.addEventListener('click', () => isOn
        ? act(() => unequipSpell(l, id), '', `${sp.name} unequipped.`)
        : act(() => equipSpell(l, id, sc.id), block ?? '', `${sp.name} equipped.`));
      acts.append(btn);
      card.append(acts);
      if (block) card.append(el('p', 'sbBlocked', block));
    }
    onDraw();
  }
  redraw();
  return { root: body, redraw, known };
}

const known = (): string => `${meta?.spellbook.owned.length ?? 0} / ${SPELL_IDS.length} spells known`;

export function openSpellbook(): void {
  if (!meta) return;
  overlay?.close();
  const menu = ornateMenu({ id: 'spellbook', title: 'Spellbook', eyebrow: 'The royal library', sub: known(), kind: 'sheet' });
  overlay = menu;
  menu.root.classList.add('sbOverlay');
  const view = spellbookView(() => {
    const count = menu.card.querySelector('.omSub');
    if (count) count.textContent = known();
  });
  menu.body.append(view.root);
  menuFoot(menu, { back: { word: 'close' } });
}
