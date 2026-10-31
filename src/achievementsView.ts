// The achievements page (from the home screen) and the toast that pops up when one is earned. Only reads the meta and
// the achievement list; the rules are in `src/sim/achievements.ts`.

import { AWARD_JOKES } from './quipData';
import { ACHIEVEMENTS, claimable, stonesOfAchievement, unclaimed, type Achievement } from './sim/achievements';
import type { Meta } from './sim/meta';
import { SPELLS, type SpellId } from './sim/spells';

/** The Achievements page: every achievement, the earned ones marked, the counting ones with a bar. One earned and not yet
 *  claimed has a Claim button (they come first), and `claim` takes its crowns and stones (or every waiting one's, for Claim all). */
export function drawAchievements(body: HTMLElement, m: Meta, claim: (ids: string[]) => void = () => {}): void {
  const got = ACHIEVEMENTS.filter((a) => m.achievements.includes(a.id)).length;
  const count = document.createElement('p');
  count.className = 'hint';
  count.textContent = `${got} of ${ACHIEVEMENTS.length} achievements. Each one pays crowns and summoning stones once: tap Claim to take them.`;
  body.append(count);
  const waiting = unclaimed(m);
  if (waiting.length > 1) {
    const all = document.createElement('button');
    all.className = 'primary claimAll';
    all.textContent = `Claim all · +${waiting.reduce((n, a) => n + a.crowns, 0)} crowns, +${waiting.reduce((n, a) => n + stonesOfAchievement(a), 0)} stones`;
    all.addEventListener('click', () => claim(waiting.map((a) => a.id)));
    body.append(all);
  }
  const order = [...waiting, ...ACHIEVEMENTS.filter((a) => !claimable(m, a.id))];
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
  list.forEach((a, i) => setTimeout(() => toast(`Achievement: ${a.name} · claim ${a.crowns} crowns and ${stoneWord(stonesOfAchievement(a))}`), i * 2800));
}

/** A toast for each spell a milestone or the Mage Tower has just taught (`grantSpells`), after `after` toasts already queued. */
export function toastSpells(ids: readonly SpellId[], after = 0): void {
  ids.forEach((id, i) => setTimeout(() => toast(`Spell learnt: ${SPELLS[id].name} · equip it in the spellbook`), (after + i) * 2800));
}

/** The one-time toast for a save from before the summoning stones: the stones it was given so it is not set back. */
export function toastStones(n: number): void {
  toast(`${n} summoning stones for your trouble: crowns now buy chests, and chests hold stones`);
}

/** Toasts for these lines, one after another (DEPLOY-ZOOM: an earned deploy helper's unlocking). */
export function toastLines(lines: readonly string[]): void {
  lines.forEach((line, i) => setTimeout(() => toast(line), i * 2800));
}

function toast(line: string): void {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = line;
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, 2400);
}
