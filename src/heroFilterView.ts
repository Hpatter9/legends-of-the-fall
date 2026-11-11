// HEROES-FILTER (docs/notes/heroes-filter.md): the roster's Sort and Filter sheets, each a standard ornate menu (`ornateMenu.ts`). The rules
// are in `heroFilterRules.ts`; a tap changes the choice at once (the list under the sheet redraws), and the roster keeps it with the settings.

import { menuChoice, menuFoot, menuNote, menuPick, menuSection, menuTitle, ornateMenu } from './ornateMenu';
import { CARD_CLASS_NAMES, CLASS_ORDER, ROSTER_SORTS, SORT_INFO, filterCount, mythicKnown, traitChoices, type RosterRow, type RosterSort, type RosterView } from './heroFilterRules';
import { TRAITS } from './sim/traits';

/** The Sort sheet: one sort of the set, and which way round it runs. `change` is told each new choice. */
export function openRosterSort(view: RosterView, change: (v: RosterView) => void): void {
  let v = { ...view };
  const menu = ornateMenu({ id: 'rosterSort', eyebrow: 'Your company', title: 'Sort heroes', kind: 'sheet' });
  const draw = (): void => {
    menu.body.replaceChildren();
    const sort = v.sort ?? 'default';
    const grid = menuSection(menu.body, 'Sort by', undefined, 2);
    menuPick<RosterSort>(grid, ROSTER_SORTS, sort, (s) => ({ title: SORT_INFO[s].name }), (s) => {
      v = { ...v, sort: s === 'default' ? undefined : s, flip: undefined };
      change(v);
      draw();
    });
    if (sort === 'default') menuNote(menu.body, 'The keep’s order is the list as it has always been.');
    else {
      const way = menuSection(menu.body, 'Order', undefined, 2);
      menuPick(way, [false, true], !!v.flip, (flip) => ({ title: flip ? SORT_INFO[sort].second : SORT_INFO[sort].first }), (flip) => {
        v = { ...v, flip: flip || undefined };
        change(v);
      });
    }
  };
  draw();
  menuFoot(menu, { back: { word: 'close' } });
}

/** The Filter sheet: several at once. `rows` are the save's heroes (which traits and whether Mythic are offered come from the ones it may
 *  name); `shown` says how many heroes the choice leaves, for the line under the title. */
export function openRosterFilter(rows: readonly RosterRow[], view: RosterView, change: (v: RosterView) => void, shown: (v: RosterView) => number): void {
  let v = { ...view };
  const menu = ornateMenu({ id: 'rosterFilter', eyebrow: 'Your company', title: 'Filter heroes', sub: ' ', kind: 'sheet' });
  const set = (next: RosterView): void => {
    v = next;
    change(v);
    draw();
  };
  const toggle = (list: readonly string[] | undefined, id: string): string[] | undefined => {
    const out = list?.includes(id) ? list.filter((x) => x !== id) : [...(list ?? []), id];
    return out.length ? out : undefined;
  };
  const draw = (): void => {
    const top = menu.body.scrollTop;
    menu.body.replaceChildren();
    const n = shown(v);
    menuTitle(menu, 'Filter heroes', `${n} ${n === 1 ? 'hero' : 'heroes'} shown`);
    const chip = (grid: HTMLElement, title: string, on: boolean, pick: () => void): void => {
      menuChoice(grid, { title, on, onPick: pick }).setAttribute('aria-pressed', String(on));
    };
    const own = menuSection(menu.body, 'Company', undefined, 2);
    chip(own, 'Owned', v.own === 'owned', () => set({ ...v, own: v.own === 'owned' ? undefined : 'owned' }));
    chip(own, 'Not yet owned', v.own === 'missing', () => set({ ...v, own: v.own === 'missing' ? undefined : 'missing' }));
    chip(own, 'In the party', v.party === 'in', () => set({ ...v, party: v.party === 'in' ? undefined : 'in' }));
    chip(own, 'Not in the party', v.party === 'out', () => set({ ...v, party: v.party === 'out' ? undefined : 'out' }));
    chip(own, 'Upgrade ready', !!v.ready, () => set({ ...v, ready: v.ready ? undefined : true }));
    if (mythicKnown(rows) || v.mythic) chip(own, 'Mythic', !!v.mythic, () => set({ ...v, mythic: v.mythic ? undefined : true }));
    const classes = menuSection(menu.body, 'Class', 'any of those chosen', 3);
    for (const c of CLASS_ORDER) chip(classes, CARD_CLASS_NAMES[c], !!v.classes?.includes(c), () => set({ ...v, classes: toggle(v.classes, c) }));
    const traits = menuSection(menu.body, 'Traits', 'any of those chosen', 3);
    for (const t of traitChoices(rows)) chip(traits, TRAITS[t].name, !!v.traits?.includes(t), () => set({ ...v, traits: toggle(v.traits, t) }));
    menu.body.scrollTop = top;
    menuFoot(menu, { back: { word: 'close' }, primary: { label: 'Clear filters', disabled: !filterCount(v), onClick: () => set({ sort: v.sort, flip: v.flip }) } });
  };
  draw();
}
