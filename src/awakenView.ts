// The Awakening panel of the hero sheet: the two steps above the top rank, what each costs and gives (a stronger body, a
// new look and the hero's own passive), and the button that takes the next one. Reads and changes the meta only through
// `awaken.ts`. `playAwakenShow` is the one-shot burst on the hero's picture when a step is taken.

import { AWAKEN_COSTS, AWAKEN_MULT, AWAKEN_SHARDS, MAX_AWAKEN, PASSIVES, PASSIVE_STRENGTH, awakenPlan, awakenedOf } from './sim/awaken';
import { ABILITIES } from './sim/equipBases';
import { describeAbility } from './sim/equipment';
import { MAX_RANK, takenRank, type Meta } from './sim/meta';
import { openRankUp, type Taken } from './rankUpView';
import { isRecoloured } from './render/awakenLook';
import { play } from './render/sound';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const ROMAN = ['', 'I', 'II'];

/** The gems after a hero's stars: a lit one for each step taken, a dark one for each still to take. */
export const gems = (steps: number): string => '◆'.repeat(steps) + '◇'.repeat(MAX_AWAKEN - steps);

/** A one-shot burst on a picture: a ring, a flash and the word "Awakened", gone when it ends (still, with reduced motion). */
export function playAwakenShow(pic: HTMLElement, step: number, label?: string): void {
  const show = el('div', `awakeShow s${step}`);
  show.append(el('i', 'ring'), el('i', 'ring r2'), el('b', '', label ?? (step >= MAX_AWAKEN ? 'Fully awakened' : 'Awakened')));
  pic.append(show);
  show.addEventListener('animationend', (e) => {
    if ((e.target as HTMLElement).tagName === 'B') show.remove();
  });
  setTimeout(() => show.remove(), 2600);
  play('levelUp');
}

/** Told after a hero takes a step of awakening (the page plays its cinematic): the kind and the step reached. */
let awakened: ((kind: string, step: number) => void) | null = null;
export const onAwakened = (f: (kind: string, step: number) => void): void => {
  awakened = f;
};

/** The panel for a hero kind. `changed` is told after a step is taken (so the sheet can draw again, with the show). */
export function drawAwaken(meta: Meta, kind: string, changed: (taken: Taken) => void): HTMLElement {
  const panel = el('div', 'awPanel');
  const done = awakenedOf(meta, kind);
  const plan = awakenPlan(meta, kind);
  const passive = PASSIVES[kind];
  panel.append(el('h4', '', `Awakening  ${gems(done)}`));
  if (takenRank(meta, kind) < MAX_RANK) panel.append(el('p', 'awNote', `Awakening opens at the top rank (${MAX_RANK} stars). Further shards then raise the hero twice more.`));
  for (let step = 1; step <= MAX_AWAKEN; step++) {
    const row = el('div', `awStep${step <= done ? ' got' : step === done + 1 ? ' next' : ''}`);
    const head = el('div', 'awHead');
    head.append(el('b', '', `${step <= done ? '◆' : '◇'} Awakening ${ROMAN[step]}`), el('small', '', step <= done ? 'awakened' : `${AWAKEN_SHARDS[step - 1]} shards in all · uses ${AWAKEN_COSTS[step - 1]}`));
    row.append(head);
    const lines = [`+${Math.round((AWAKEN_MULT - 1) * 100)}% hp and attack`, step === 1 ? 'A new look' + (isRecoloured(kind) ? ' (recoloured)' : '') : 'A brighter, golden look'];
    row.append(el('small', 'awGives', lines.join(' · ')));
    if (passive && ABILITIES[passive.ability]) {
      const text = step === 1 ? `${passive.name}: ${passive.text}` : `${passive.name} grows stronger (${describeAbility(ABILITIES[passive.ability], PASSIVE_STRENGTH[1])})`;
      row.append(el('p', 'awPassive', text));
    }
    panel.append(row);
  }
  if (plan.step) {
    const have = Math.min(plan.have, plan.need);
    const bar = el('div', 'awBar');
    const fill = el('span');
    fill.style.width = `${(have / plan.need) * 100}%`;
    bar.append(fill);
    const go = el('button', 'primary', plan.can ? `Awaken · uses ${plan.cost} shards` : `${plan.have} / ${plan.need} shards`);
    go.type = 'button';
    go.disabled = !plan.can;
    // (the card shows the look and the stats before and after; the step is taken there)
    go.addEventListener('click', () =>
      openRankUp(meta, kind, (t) => {
        if (t.what === 'awaken') awakened?.(kind, t.n);
        changed(t);
      }),
    );
    panel.append(bar, go);
  } else panel.append(el('small', 'awNote', 'Fully awakened. Repeat pulls of this hero pay crowns once its shards have nothing left to buy.'));
  return panel;
}
