// The achievements page (from the home screen) and the toast that pops up when one is earned. Only reads the meta and
// the achievement list; the rules are in `src/sim/achievements.ts`.

import { AWARD_JOKES } from './quipData';
import { shownAchievements, claimable, stonesOfAchievement, unclaimed, type Achievement } from './sim/achievements';
import type { Meta } from './sim/meta';
import { SPELLS, type SpellId } from './sim/spells';
import { fightToastTop } from './hudClear';
import { reclearQuip } from './quipView';

/** The Achievements page: every achievement, the earned ones marked, the counting ones with a bar. One earned and not yet
 *  claimed has a Claim button (they come first), and `claim` takes its crowns and stones (or every waiting one's, for Claim all). */
export function drawAchievements(body: HTMLElement, m: Meta, claim: (ids: string[]) => void = () => {}): void {
  const shown = shownAchievements(m);
  const got = shown.filter((a) => m.achievements.includes(a.id)).length;
  const count = document.createElement('p');
  count.className = 'hint';
  count.textContent = `${got} of ${shown.length} achievements. Each one pays crowns and summoning stones once: tap Claim to take them.`;
  body.append(count);
  const waiting = unclaimed(m);
  if (waiting.length > 1) {
    const all = document.createElement('button');
    all.className = 'primary claimAll';
    all.textContent = `Claim all · +${waiting.reduce((n, a) => n + a.crowns, 0)} crowns, +${waiting.reduce((n, a) => n + stonesOfAchievement(a), 0)} stones`;
    all.addEventListener('click', () => claim(waiting.map((a) => a.id)));
    body.append(all);
  }
  const order = [...waiting, ...shown.filter((a) => !claimable(m, a.id))];
  for (const a of order) body.append(row(a, m, claim));
}

/** "1 stone", "3 stones" */
const stoneWord = (n: number): string => `${n} stone${n === 1 ? '' : 's'}`;

function row(a: Achievement, m: Meta, claim: (ids: string[]) => void): HTMLElement {
  const done = m.achievements.includes(a.id);
  const ready = claimable(m, a.id);
  const el = document.createElement('div');
  el.className = `brow ach${done ? ' done' : ''}${ready ? ' ready' : ''}`;
  const text = document.createElement('div');
  const name = document.createElement('b');
  name.textContent = `${done ? '★ ' : '☆ '}${a.name}`;
  const what = document.createElement('em');
  what.textContent = `${a.text} · ${a.crowns} crowns, ${stoneWord(stonesOfAchievement(a))}`;
  text.append(name, what);
  const joke = AWARD_JOKES[a.id];
  if (joke) text.append(Object.assign(document.createElement('small'), { className: 'achJoke', textContent: joke }));
  const meter = a.meter?.(m);
  if (meter && !done) {
    const bar = document.createElement('div');
    bar.className = 'xpbar';
    const fill = document.createElement('span');
    fill.style.width = `${(meter.now / meter.need) * 100}%`;
    bar.append(fill);
    const p = document.createElement('span');
    p.textContent = `${meter.now} of ${meter.need}`;
    text.append(bar, p);
  }
  el.append(text);
  if (ready) {
    const take = document.createElement('button');
    take.className = 'primary';
    take.textContent = `Claim +${a.crowns} · ${stoneWord(stonesOfAchievement(a))}`;
    take.addEventListener('click', () => claim([a.id]));
    el.append(take);
  }
  return el;
}

/** Pop up a toast for each achievement just earned, one after another. */
export function toastAchievements(list: readonly Achievement[]): void {
  for (const a of list) toast(`Achievement: ${a.name} · claim ${a.crowns} crowns and ${stoneWord(stonesOfAchievement(a))}`);
}

/** A toast for each spell a milestone or the Mage Tower has just taught (`grantSpells`), after `after` toasts already queued. */
export function toastSpells(ids: readonly SpellId[], after = 0): void {
  void after;
  for (const id of ids) toast(`Spell learnt: ${SPELLS[id].name} · equip it in the spellbook`);
}

/** The one-time toast for a save from before the summoning stones: the stones it was given so it is not set back. */
export function toastStones(n: number): void {
  toast(`${n} summoning stones for your trouble: crowns now buy chests, and chests hold stones`);
}

/** Toasts for these lines, one after another (DEPLOY-ZOOM: an earned deploy helper's unlocking). */
export function toastLines(lines: readonly string[]): void {
  for (const line of lines) toast(line);
}

/** UX-FIXES: toasts wait in one queue and show one at a time in one lane under the top bar (they covered the crowns, the gear and the version line). */
const waiting: string[] = [];
let showing = false;

function toast(line: string): void {
  waiting.push(line);
  if (!showing) next();
}

/** SWEEP-1110 (the director's call): a toast never covers an open card or sheet. While one is open (an ornate card, the hero sheet, a
 *  skill's sheet in a fight, Settings) the toasts wait in their queue, and show once it closes. */
// (FIRST-HOUR: the wave's result card counts too: the first win's achievement toast sat on its gold, crowns and stars)
const CARDS = '.om, #hmSheet:not([hidden]), .fhSheet:not([hidden]), #settings:not([hidden]), #result:not([hidden])';
const cardOpen = (): boolean => [...document.querySelectorAll<HTMLElement>(CARDS)].some((e) => e.offsetParent !== null || (getComputedStyle(e).position === 'fixed' && getComputedStyle(e).display !== 'none'));
const CARD_POLL_MS = 300;

function next(): void {
  if (waiting.length && cardOpen()) {
    showing = true;
    setTimeout(next, CARD_POLL_MS);
    return;
  }
  const line = waiting.shift();
  if (line === undefined) {
    showing = false;
    return;
  }
  showing = true;
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = line;
  // (COMBAT-HUD: in a fight the lane is under the spell row and the boss's bar, and the toast fades in there rather than sliding down
  // over them)
  const lane = fightToastTop();
  if (lane !== undefined) {
    el.classList.add('lane');
    el.style.top = `${Math.round(lane)}px`;
  }
  document.body.append(el);
  // (a quip's bubble already up steps out of the toast's lane)
  if (lane !== undefined) reclearQuip();
  requestAnimationFrame(() => el.classList.add('show'));
  // (a card opened while it shows: it steps aside at once, and its line goes back to the front of the queue for when the card closes)
  const watch = setInterval(() => {
    if (!cardOpen()) return;
    clearInterval(watch);
    clearTimeout(done);
    el.remove();
    waiting.unshift(line);
    next();
  }, CARD_POLL_MS / 3);
  const done = setTimeout(() => {
    clearInterval(watch);
    el.classList.remove('show');
    setTimeout(() => {
      el.remove();
      next();
    }, 450);
  }, 2400);
}
