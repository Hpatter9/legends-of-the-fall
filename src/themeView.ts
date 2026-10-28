// How a daily's build theme shows (DAILY-BUILDS, `sim/dailyThemes.ts`): its block on the start card (the idea, the featured trait,
// the goal and the day's heroes) and its banner over the deploy board, with the goal counted as heroes are placed. The trait chips
// and the bench marks of the featured trait are lit by `main.ts` (the class `featured`). This only draws; the rules are the sim's.

import { FEATURED_MULT, featuredCount, themeGoalText, traitPlural, type DailyTheme } from './sim/dailyThemes';
import { TRAITS, traitsOf } from './sim/traits';
import { UNITS } from './sim/units';
import { portrait } from './render/sheets';
import { traitBadge } from './traitBadge';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** "Beast bonus x2". */
const boostText = (t: DailyTheme): string => `${TRAITS[t.trait].name} bonus x${FEATURED_MULT}`;

/** The start card's theme block: the theme's name and idea, the featured trait, the goal, and the day's heroes (the featured ones lit). */
export function themeBlock(t: DailyTheme): HTMLElement {
  const box = el('div', 'dayTheme');
  const head = el('div', 'dtHead');
  head.append(traitBadge(t.trait, { lit: true }), el('b', '', t.name), el('small', '', boostText(t)));
  const idea = el('p', 'dtIdea', t.idea);
  const goal = el('p', 'dtGoal');
  goal.append(el('span', 'dtStar', '★'), document.createTextNode(`${themeGoalText(t)} for a bonus star`));
  const heroes = el('div', 'dtHeroes');
  const face = (kind: string, more: boolean) => {
    const f = el('span', `dtHero${traitsOf(kind).includes(t.trait) ? ' feat' : ''}${more ? ' more' : ''}`);
    const pic = portrait(UNITS[kind].sheet, 30);
    f.append(pic);
    f.title = UNITS[kind].name;
    return f;
  };
  for (const k of t.five) heroes.append(face(k, false));
  heroes.append(el('i', 'dtPlus', '+'));
  for (const k of t.more) heroes.append(face(k, true));
  box.append(head, idea, goal, heroes);
  return box;
}

/** The deploy banner's words for a theme: its name and boost, and the goal with how many of the featured trait are placed. */
export function showThemeBanner(t: DailyTheme | null, placed: Iterable<string>, boss: boolean): void {
  const box = document.getElementById('twistBanner');
  if (!box || !t) return;
  box.hidden = false;
  box.className = 'theme';
  box.replaceChildren();
  const have = featuredCount(t, placed);
  const words = el('span');
  words.append(el('b', '', `${t.name} · ${boostText(t)}`), el('small', '', `${boss ? 'Goal' : 'Goal at the boss'}: ${t.need} ${traitPlural(t.trait)} · ${Math.min(have, t.need)}/${t.need} placed${have >= t.need ? ' ✓' : ''}`));
  box.append(traitBadge(t.trait, { lit: have >= 2 }), words);
}
