// The achievements page (from the home screen) and the toast that pops up when one is earned. Only reads the meta and
// the achievement list; the rules are in `src/sim/achievements.ts`.

import { ACHIEVEMENTS, type Achievement } from './sim/achievements';
import type { Meta } from './sim/meta';

/** The Achievements page: every achievement, the earned ones marked, the counting ones with a bar. */
export function drawAchievements(body: HTMLElement, m: Meta): void {
  const got = ACHIEVEMENTS.filter((a) => m.achievements.includes(a.id)).length;
  const count = document.createElement('p');
  count.className = 'hint';
  count.textContent = `${got} of ${ACHIEVEMENTS.length} achievements. Each one pays crowns the first time.`;
  body.append(count);
  for (const a of ACHIEVEMENTS) body.append(row(a, m));
}

function row(a: Achievement, m: Meta): HTMLElement {
  const done = m.achievements.includes(a.id);
  const el = document.createElement('div');
  el.className = `brow ach${done ? ' done' : ''}`;
  const text = document.createElement('div');
  const name = document.createElement('b');
  name.textContent = `${done ? '★ ' : '☆ '}${a.name}`;
  const what = document.createElement('em');
  what.textContent = `${a.text} · ${a.crowns} crowns`;
  text.append(name, what);
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
  return el;
}

/** Pop up a toast for each achievement just earned, one after another. */
export function toastAchievements(list: readonly Achievement[]): void {
  list.forEach((a, i) => setTimeout(() => toast(`Achievement: ${a.name} · +${a.crowns} crowns`), i * 2800));
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
