// The Awakening panel of the hero sheet: the two steps above the top rank, what each costs and gives (a stronger body, a
// new look and the hero's own passive), and the button that takes the next one. Reads and changes the meta only through
// `awaken.ts`. `playAwakenShow` is the one-shot burst on the hero's picture when a step is taken.

import { AWAKEN_COSTS, AWAKEN_MULT, AWAKEN_SHARDS, MAX_AWAKEN, PASSIVES, PASSIVE_STRENGTH, awakenPlan, awakenedOf } from './sim/awaken';
import { ABILITIES } from './sim/equipBases';
import { describeAbility } from './sim/equipment';
import { MAX_RANK, saveMeta, takenRank, type Meta } from './sim/meta';
import { openRankUp, type Taken } from './rankUpView';
import { auraOf } from './render/auraStyles';
import { play } from './render/sound';
import { AWAKEN_ORES, CACHE_ORES, ORES, cachesOf, openCache } from './sim/awakenMats';
import { cacheIcon, oreHex, oreIcon, orePouch } from './oreView';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const ROMAN = ['', 'I', 'II'];

/** The gems after a hero's stars: a lit one for each step taken, a dark one for each still to take. */
export const gems = (steps: number): string => '◆'.repeat(steps) + '◇'.repeat(MAX_AWAKEN - steps);

/** A one-shot burst on a picture: a ring, a flash and the word "Awakened" (in the class's aura colour when `kind` is given), gone when it ends (still, with reduced motion). */
export function playAwakenShow(pic: HTMLElement, step: number, label?: string, kind?: string): void {
  const show = el('div', `awakeShow s${step}`);
  // (an awakening's rings and word glow in the hero's aura colour)
  if (kind) show.style.setProperty('--aw', `#${auraOf(kind).colour.toString(16).padStart(6, '0')}`);
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
  // (the class's rift ore: held against the next step's need, its line, and a Rift Cache to open here when one waits)
  const ore = ORES[plan.ore];
  if (ore) {
    panel.style.setProperty('--ore', oreHex(ore.trait));
    const line = el('div', 'oreLine');
    const want = plan.step ? plan.oreCost : 0;
    line.append(oreIcon(ore.trait), el('b', '', ore.name), el('em', want && plan.oreHave < want ? 'short' : '', want ? `${plan.oreHave} / ${want}` : String(plan.oreHave)), el('small', '', ore.line));
    panel.append(line);
    if (cachesOf(meta) > 0 && plan.step) {
      const box = el('div', 'oreCache');
      const words = el('span');
      words.append(`Rift Cache ×${cachesOf(meta)}`, el('br'), el('small', '', 'Choose a class: it opens here'));
      const open = el('button', 'primary', `Open: +${CACHE_ORES} ${ore.name}`);
      open.type = 'button';
      open.addEventListener('click', () => {
        if (!openCache(meta, kind)) return;
        saveMeta(meta);
        play('levelUp');
        changed({ what: 'cache', n: CACHE_ORES });
      });
      box.append(cacheIcon(), words, open);
      panel.append(box);
    }
  }
  if (takenRank(meta, kind) < MAX_RANK) panel.append(el('p', 'awNote', `Awakening opens at the top rank (${MAX_RANK} stars). Further shards then raise the hero twice more.`));
  for (let step = 1; step <= MAX_AWAKEN; step++) {
    const row = el('div', `awStep${step <= done ? ' got' : step === done + 1 ? ' next' : ''}`);
    const head = el('div', 'awHead');
    const cost = el('small', '', step <= done ? 'awakened' : `${AWAKEN_SHARDS[step - 1]} shards in all · uses ${AWAKEN_COSTS[step - 1]}`);
    if (step > done && ore) {
      const c = el('span', 'oreCost');
      c.append('+', oreIcon(ore.trait), `${AWAKEN_ORES[step - 1]} ${ore.name}`);
      cost.append(c);
    }
    head.append(el('b', '', `${step <= done ? '◆' : '◇'} Awakening ${ROMAN[step]}`), cost);
    row.append(head);
    const lines = [`+${Math.round((AWAKEN_MULT - 1) * 100)}% hp and attack`, step === 1 ? `An aura: ${auraOf(kind).name.toLowerCase()}` : 'A bigger, brighter aura'];
    row.append(el('small', 'awGives', lines.join(' · ')));
    if (passive && ABILITIES[passive.ability]) {
      const text = step === 1 ? `${passive.name}: ${passive.text}` : `${passive.name} grows stronger (${describeAbility(ABILITIES[passive.ability], PASSIVE_STRENGTH[1])})`;
      row.append(el('p', 'awPassive', text));
    }
    panel.append(row);
  }
  if (plan.step) {
    // (the bar fills with the shards first, then, once they are ready, with the class's ores)
    const bar = el('div', 'awBar');
    const fill = el('span');
    const share = plan.shardsReady && ore ? Math.min(1, plan.oreHave / plan.oreCost) : Math.min(plan.have, plan.need) / plan.need;
    fill.style.width = `${share * 100}%`;
    if (plan.shardsReady && ore) fill.style.background = oreHex(ore.trait);
    bar.append(fill);
    const words = plan.can ? `Awaken · uses ${plan.cost} shards + ${plan.oreCost} ${ore!.name}` : !plan.shardsReady ? `${plan.have} / ${plan.need} shards` : ore ? `Shards ready · ${plan.oreHave} / ${plan.oreCost} ${ore.name}` : `${plan.have} / ${plan.need} shards`;
    const go = el('button', 'primary', words);
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
    if (plan.shardsReady && ore && !plan.can) panel.append(el('small', 'awNote', `${ore.name} drops in the Calamity (its bosses and mini-bosses) and from some armies' boss waves: see each army's card.`));
  } else panel.append(el('small', 'awNote', 'Fully awakened. More shards of this hero pay crowns once they have nothing left to buy.'));
  // (every class's ores held, so the player sees what else waits)
  if (ore) panel.append(orePouch(meta));
  return panel;
}
