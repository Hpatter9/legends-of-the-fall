// The daily challenge's start card (opened by the camp's notice board): the boss of the day, the land, what the run is, and what
// clearing it pays. The rules are in `src/sim/daily.ts` and `modes.ts`; this only draws them.

import { dailyBoss, DAILY_MID, DAILY_WAVES } from './sim/daily';
import { dailyStatus } from './sim/modes';
import { dailyArea } from './sim/dailySeed';
import { MAX_RETRIES } from './sim/run';
import type { Meta } from './sim/meta';
import { UNITS } from './sim/units';
import { portrait } from './render/sheets';
import { AREA_NAMES } from './menuArt';
import { chestPicture } from './chestStash';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** A date key as words: "Saturday 24 October". */
export function dayName(date: number): string {
  const d = new Date(Math.floor(date / 10000), (Math.floor(date / 100) % 100) - 1, date % 100);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Show the start card for a date: `go` starts the run (a replay of a played date is practice), `back` closes the card. */
export function showDailyStart(m: Meta, date: number, go: () => void, back: () => void): void {
  const played = (m.daily[String(date)]?.plays ?? 0) > 0;
  const boss = UNITS[dailyBoss(date)];
  const root = el('div', 'dayCard');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', `Daily challenge: ${boss.name}`);
  const head = el('div', 'dayHead');
  head.append(el('span', 'dayTitle', 'Daily challenge'), el('span', 'dayDate', dayName(date)));
  const face = portrait(boss.sheet, 144);
  face.className = 'dayFace';
  const name = el('div', 'dayBoss');
  name.append(el('small', '', 'Boss of the day'), el('span', '', boss.name));
  const facts = el('ul', 'dayFacts');
  for (const [k, v] of [
    ['Land', AREA_NAMES[dailyArea(date)]],
    ['Run', `${DAILY_WAVES} waves, a mid-boss at ${DAILY_MID}`],
    ['Squad', 'the starting five'],
    ['Hearts', `${MAX_RETRIES} retries`],
  ]) {
    const li = el('li');
    li.append(el('span', '', k), el('b', '', v));
    facts.append(li);
  }
  const prize = el('div', 'dayPrize');
  const chest = chestPicture('daily', 2).root;
  chest.classList.add('dayChest');
  prize.append(chest, el('span', '', played ? 'Practice: no reward this time' : 'Clear it for a daily chest: crowns, hero shards, maybe gear. No heart spent and a quick win add to it.'));
  const status = el('div', 'dayStatus', `Today: ${dailyStatus(m, date)}`);
  const row = el('div', 'dayBtns');
  const fight = el('button', 'primary', played ? 'Practice' : 'Fight!');
  const leave = el('button', '', 'Back');
  fight.addEventListener('click', () => {
    root.remove();
    go();
  });
  leave.addEventListener('click', () => {
    root.remove();
    back();
  });
  row.append(fight, leave);
  root.append(head, face, name, facts, prize, status, row);
  document.body.append(root);
}
