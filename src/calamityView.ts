// The small screens of the calamity and the tower's start-over: the choice of a starting hero, and a plain yes/no box. The map, the
// shops and the recruit camps are the tower's own view (`towerView.ts`). Like it, this only reads the meta and calls back.

import type { Meta } from './sim/meta';
import { CAL_MAPS } from './sim/calamity';
import { UNITS } from './sim/units';
import { portrait } from './render/sheets';
import { play } from './render/sound';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** A yes/no box over `parent`: `onYes` runs on the confirming button, anything else just closes it. */
export function confirmBox(parent: HTMLElement, title: string, text: string, yes: string, onYes: () => void): void {
  const wrap = el('div', 'cvVeil');
  const box = el('div', 'cvBox');
  const no = el('button', '', 'Keep going');
  const ok = el('button', 'primary danger', yes);
  const row = el('div', 'cvRow');
  row.append(no, ok);
  box.append(el('h2', '', title), el('p', '', text), row);
  wrap.append(box);
  const close = () => wrap.remove();
  no.addEventListener('click', close);
  wrap.addEventListener('click', (e) => e.target === wrap && close());
  ok.addEventListener('click', () => {
    close();
    onYes();
  });
  parent.append(wrap);
}

/** Roles that read as ranged, for the picker's one-line note. */
const reach = (kind: string): string => (UNITS[kind].shot || UNITS[kind].range > 1 ? 'ranged' : 'melee');

/** The choice of the hero a calamity starts with: every hero the player owns, one picked and begun. */
export function pickHero(meta: Meta, onPick: (kind: string) => void, onCancel: () => void): void {
  const kinds = meta.unlocked.filter((k) => UNITS[k]?.side === 'hero');
  let chosen = kinds.includes(meta.party[0]) ? meta.party[0] : kinds[0];
  const root = el('div', 'cvPick');
  const card = el('div', 'cvCard');
  const note = el('p', 'cvNote');
  const grid = el('div', 'cvGrid');
  const go = el('button', 'primary', 'Begin');
  const back = el('button', '', 'Back');
  const paint = () => {
    for (const b of grid.children as HTMLCollectionOf<HTMLElement>) b.classList.toggle('on', b.dataset.kind === chosen);
    const d = UNITS[chosen];
    note.replaceChildren(el('b', '', d.name), el('span', '', `${reach(chosen)} · ${d.role}`));
    go.textContent = `Begin with the ${d.name}`;
  };
  for (const kind of kinds) {
    const b = el('button', 'cvHero');
    b.dataset.kind = kind;
    const face = portrait(UNITS[kind].sheet, 48);
    b.append(face, el('small', '', UNITS[kind].name));
    b.addEventListener('click', () => {
      chosen = kind;
      play('summon');
      paint();
    });
    grid.append(b);
  }
  go.addEventListener('click', () => {
    root.remove();
    onPick(chosen);
  });
  back.addEventListener('click', () => {
    root.remove();
    onCancel();
  });
  card.append(
    el('h2', '', 'The Calamity'),
    el('p', 'cvLead', `Pick one hero, at level 1. Climb ${CAL_MAPS} short maps, hiring the heroes you meet (up to ten, none merge); every map ends in a boss, and optional mini-bosses guard the best rewards. Your party's levels and gear stay out of it.`),
    grid,
    note,
  );
  const row = el('div', 'cvRow');
  row.append(back, go);
  card.append(row);
  root.append(card);
  document.body.append(root);
  paint();
}
