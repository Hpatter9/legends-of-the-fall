// The Shades on the page (Dynasties, phase 7: docs/design/legends-expansion.md section 3.6; docs/notes/dynasty-7.md; the rules are
// `sim/oath.ts`, the strike `sim/eidolons.ts`). Two parts:
//
// - **The Shades' card** (the standard ornate menu, "Close"), from the War Horn's card at the camp: every Shade of the Houses, the fallen of
//   the Oath and the elders honoured as Shades, each with its calling's gift and its slayer. A tap chooses the one that answers the horn in
//   the Eidolon's place; "The Eidolon answers" sends it back. A Shade that cannot answer yet (no horn held, or an honoured Shade's kind
//   below level 100) shows greyed, with what stands in its way.
// - **The short call**: the hero's own portrait rises over the board in a spectral tint and fades (an effect on its art, no new art),
//   with its name and gift. It holds nothing: the strike resolves on the next tick, as the fight runs on. Reduced motion: it fades in
//   and out, held still.
//
// It never changes the battle except through the sim's own order (`orderEidolon`, given by `eidolonCall.ts`).

import { menuChoice, menuFoot, menuNote, menuSection, ornateMenu, type OrnateMenu } from './ornateMenu';
import { bearerFace } from './housesView';
import { stageOf } from './sim/dynasty';
import type { Meta } from './sim/meta';
import { SHADE, SHADE_RIDER } from './sim/eidolons';
import { chooseShade, dismissShade, shadeChosen, shadesOf, whyNoShade, type Shade } from './sim/oath';
import { callingOf } from './sim/weakness';
import { UNITS } from './sim/units';
import { HERO_NAMES } from './sim/heroNames';
import { portrait } from './render/sheets';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const pct = (x: number): string => `${Math.round(x * 100)}%`;

/** A Shade's gift in one line: its calling's rider. */
export const shadeGift = (kind: string): string => SHADE_RIDER[callingOf(kind) ?? 'martial'];
/** "Kwame's Shade". */
export const shadeName = (s: Pick<Shade, 'bearer'>): string => `${s.bearer.name}’s Shade`;

/** The Shades' card: each Shade, its gift and its slayer; a tap chooses the one that answers the horn. */
export function openShades(m: Meta, save: () => void, done?: () => void): OrnateMenu {
  const menu = ornateMenu({ id: 'shadesCard', eyebrow: 'The War Horn', title: 'The Shades', sub: 'the fallen, and the elders who wait on the horn', onClose: done });
  menu.card.classList.add('hsCard', 'shCard');
  const list = shadesOf(m);
  const chosen = shadeChosen(m);
  menuNote(menu.body, `A Shade is a lesser Eidolon, on the same horn and once a fight: ordinary foes lose ${pct(SHADE.FIELD)}, elites and mid-bosses ${pct(SHADE.ELITE)}, last bosses ${pct(SHADE.BOSS)}. The nemesis that slew it loses ${pct(SHADE.SLAYER)} and cannot cheat death that fight. Auto never calls it.`);
  const g = menuSection(menu.body, 'Who answers the horn', chosen ? shadeName(chosen) : 'the Eidolon chosen', 2);
  g.classList.add('hsGenRow');
  const reopen = () => {
    menu.close();
    openShades(m, save, done);
  };
  const eid = menuChoice(g, { title: 'The Eidolon answers', lines: ['As chosen on the horn’s card'], on: !chosen, onPick: () => (dismissShade(m), save(), reopen()) });
  eid.classList.add('hsRow');
  for (const s of list) {
    const why = whyNoShade(m, s);
    const slain = s.fallen ? (s.bearer.slayer ? `Slain by ${s.bearer.slayer}` : 'Fallen under the Oath') : 'An elder’s honour';
    const row = menuChoice(g, {
      title: shadeName(s),
      lines: [`${UNITS[s.kind]?.name ?? s.kind} · the House of ${HERO_NAMES[s.kind]?.name ?? s.kind}`, slain, why ? [why, 'lock'] : [shadeGift(s.kind), 'pay']],
      disabled: !!why,
      on: chosen?.key === s.key,
      onPick: () => {
        if (!chooseShade(m, s.key)) return;
        save();
        reopen();
      },
    });
    row.classList.add('hsRow', 'shRow');
    row.prepend(bearerFace(s.kind, stageOf(s.bearer.served), s.bearer.gen, 40, s.bearer.look));
  }
  if (!list.length) menuNote(menu.body, 'No Shade yet. A bearer slain under the Legend Oath becomes one, and an elder of level 100 may take the Shade’s honour when the mantle passes.');
  menuFoot(menu, { back: { word: 'close' } });
  return menu;
}

/** The Shade's short call over the fight: its portrait in a spectral tint rises and fades, with its name and gift. Holds nothing. */
export function playShadeCall(kind: string, name: string, reduced: boolean): void {
  document.querySelector('.shCall')?.remove();
  const box = el('div', `shCall${reduced ? ' still' : ''}`);
  box.setAttribute('aria-live', 'polite');
  const sheet = UNITS[kind]?.sheet;
  if (sheet) {
    const c = portrait(sheet, 128);
    c.classList.add('shCallFace');
    box.append(c);
  }
  const words = el('div', 'shCallWords');
  words.append(el('b', '', `${name}’s Shade`), el('span', '', shadeGift(kind)));
  box.append(words);
  document.body.append(box);
  setTimeout(() => box.remove(), reduced ? 1400 : 1900);
}
