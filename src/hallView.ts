// HALL-OF-HEROES's page (docs/notes/hall-of-heroes.md): the Hall of Heroes, opened from the Heroes tab's roster. A standard ornate page
// ("‹ Back"): what the Hall lends now and each stat's cap, every hero with what it lends (owned or not), and every trait set with its
// progress, its title and its reward, claimed here once. The rows are `hallRules.ts`'s.

import { heroRows, setRows, statRows, titlesOf } from './hallRules';
import { menuFoot, menuSection, menuWell, ornateMenu } from './ornateMenu';
import { portrait } from './render/sheets';
import { claimSet, hallBonus, hallLine, HALL_RANK_MAX } from './sim/hall';
import { heroName } from './sim/heroNames';
import type { Meta } from './sim/meta';
import { UNITS } from './sim/units';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** Open the Hall. `save` keeps the save after a set is claimed. */
export function openHall(m: Meta, save: () => void, onClose?: () => void): void {
  const menu = ornateMenu({ id: 'hallOfHeroes', eyebrow: 'The Last Keep', title: 'Hall of Heroes', sub: hallLine(hallBonus(m)), kind: 'sheet', asked: true, onClose });
  // (a section's heading over a well that spans it: the grid it makes for choice rows is not wanted here, as the trait card's)
  const section = (title: string, line?: string): HTMLElement => {
    const grid = menuSection(menu.body, title, line, 2);
    const sec = grid.parentElement!;
    grid.remove();
    return menuWell(sec);
  };
  const draw = (): void => {
    menu.body.replaceChildren();
    const titles = titlesOf(m);
    // (the four stats: what each holds now, its cap, and who lends it)
    const stats = section('What your Hall lends');
    stats.classList.add('hallStats');
    stats.append(el('p', 'hallIntro', 'Every hero you own lends all your heroes a little of its class’s strength for each rank it has. Rank them all: the Hall counts in every fight but the Calamity’s.'));
    if (titles.length) stats.append(el('p', 'hallTitles', `Your titles: ${titles.join(' · ')}`));
    for (const r of statRows(m)) {
      const row = el('div', `hallStat${r.full ? ' full' : ''}`);
      row.append(el('b', '', r.name), el('strong', '', r.now), el('small', '', `of ${r.cap}${r.full ? ' · full' : ''}`), el('em', '', r.classes));
      stats.append(row);
    }
    // (the trait sets, the nearest to done first)
    const sets = section('Trait sets', 'own every hero of a trait for its title and reward, once');
    sets.classList.add('hallSets');
    for (const s of setRows(m, heroName)) {
      const row = el('div', `hallSet${s.done ? ' done' : ''}${s.paid ? ' paid' : ''}`);
      row.dataset.trait = s.trait;
      const bar = el('i', 'hallBar');
      bar.style.setProperty('--p', String(s.have / Math.max(1, s.of)));
      const head = el('div', 'hallSetHead');
      head.append(el('b', '', s.progress), bar);
      row.append(head, el('small', '', s.paid ? `${s.title} · claimed` : s.done ? `${s.title} · ${s.reward}` : `Missing: ${s.missing}`));
      if (s.done && !s.paid) {
        const claim = el('button', 'hallClaim', 'Claim');
        claim.type = 'button';
        claim.addEventListener('click', () => {
          if (claimSet(m, s.trait)) save();
          draw();
        });
        row.append(claim);
      }
      sets.append(row);
    }
    // (every hero, owned first, by what it lends)
    const grid = section('Every hero');
    grid.classList.add('hallHeroes');
    for (const r of heroRows(m, heroName)) {
      const cell = el('div', `hallHero${r.owned ? '' : ' shut'}`);
      cell.dataset.kind = r.kind;
      const pic = portrait(UNITS[r.kind].sheet, 40);
      pic.classList.add('hallPic');
      const pips = el('i', 'hallPips', r.owned ? '◆'.repeat(Math.min(HALL_RANK_MAX, r.rank)) + '◇'.repeat(Math.max(0, HALL_RANK_MAX - r.rank)) : '');
      cell.append(pic, el('b', '', r.name), el('small', '', `${r.cls}${r.owned ? ` · rank ${r.rank}` : ''}`), pips, el('em', '', r.lends));
      grid.append(cell);
    }
    const sub = menu.card.querySelector('.omSub');
    if (sub) sub.textContent = hallLine(hallBonus(m));
  };
  draw();
  menuFoot(menu, { back: { word: 'back' } });
}
