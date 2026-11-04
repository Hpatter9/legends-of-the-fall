// The Rank up card: what a hero has earned, the stats before and after, the look before and after (when it changes: an awakening
// equips its legendary gear), and the button that takes the step. A rank is the player's choice, never automatic (`sim/rankUp.ts`); the awakening
// steps above the top rank use the same card (`sim/awaken.ts`). `openRankUp` puts the card over the page and calls `done` with what
// was taken (a rank, or an awakened step) when the button is tapped; Back (or a tap outside) closes it and changes nothing.

import { UNITS } from './sim/units';
import { heroName } from './sim/heroNames';
import { MAX_RANK, RANK_SHARDS, saveMeta, takenRank, type Meta } from './sim/meta';
import { ORES } from './sim/awakenMats';
import { AWAKEN_COSTS, AWAKEN_SHARDS, PASSIVES, awaken, awakenPlan, awakenedOf } from './sim/awaken';
import { rankPlan, rankUp } from './sim/rankUp';
import { levelOfKind } from './sim/levels';
import { stepPlan } from './sim/rankStep';
import { heroStats } from './sim/talents';
import { lookSheet, stepOfRank } from './render/awakenLook';
import { loadAwakenedSheets, sprite } from './render/sheets';
import { play } from './render/sound';
import { openScreen } from './screens';

export interface Taken {
  /** `rank`: a shard rank taken (`n` is the new rank); `awaken`: an awakened step (`n` is the step, 1 or 2); `cache`: a Rift Cache opened on the awakening panel (`n` ores; no show). */
  what: 'rank' | 'awaken' | 'cache';
  n: number;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const stars = (n: number): string => '★'.repeat(n) + '☆'.repeat(MAX_RANK - n);

/** A hero's picture at a whole rank (its permanent equipment form); `tick` animates its idle. */
function pic(kind: string, full: number): { box: HTMLElement; tick: (n: number) => void } {
  const def = UNITS[kind];
  const step = stepOfRank(full);
  const sheet = step ? lookSheet(kind, full, 3) : def.sheet;
  const spr = sprite(sheet, 76);
  spr.canvas.style.transform = spr.faceRight ? 'translateX(-50%)' : 'translateX(-50%) scaleX(-1)';
  const box = el('div', 'ruPic');
  box.append(spr.canvas);
  return { box, tick: spr.tick };
}

/** Open the card for a hero's next step: its rank when one is waiting, else its awakening. Does nothing when neither is. */
let opening = false;
export function openRankUp(meta: Meta, kind: string, done: (t: Taken) => void): void {
  if (opening) return;
  opening = true;
  void loadAwakenedSheets([kind]).then(() => openReadyRankUp(meta, kind, done))
    .catch(error => console.error('Could not load the awakening preview', error))
    .finally(() => { opening = false; });
}

function openReadyRankUp(meta: Meta, kind: string, done: (t: Taken) => void): void {
  const rp = rankPlan(meta, kind);
  const ap = rp ? null : awakenPlan(meta, kind);
  if (!rp && !(ap && ap.can)) return;
  const taken = takenRank(meta, kind);
  const steps = awakenedOf(meta, kind);
  const now = taken + steps;
  const next = rp ? rp.to + steps : taken + steps + 1;
  const back = el('div', 'ruBack');
  const card = el('div', 'ruCard');
  card.append(el('h3', '', rp ? `${heroName(kind)} · Rank up` : `${heroName(kind)} · Awakening`));
  // the look, before and after (one picture when the look does not change)
  const looks = el('div', 'ruLooks');
  const before = pic(kind, now);
  const after = pic(kind, next);
  const changes = lookSheet(kind, now, 1) !== lookSheet(kind, next, 1);
  looks.append(before.box);
  if (changes) {
    const arrow = el('span', 'ruArrow', '→');
    after.box.classList.add('new');
    looks.append(arrow, after.box);
    looks.classList.add('two');
    card.append(looks, el('p', 'ruNote', 'It takes on a new look.'));
  } else card.append(looks);
  // what was earned
  const have = meta.shards[kind] ?? 0;
  card.append(el('p', 'ruEarned', rp ? `Earned with ${RANK_SHARDS[rp.to - 1]} shards (you have ${have}).` : `${AWAKEN_SHARDS[steps]} shards in all, and ${AWAKEN_COSTS[steps]} of them are used up${ap?.ore && ORES[ap.ore] ? `, with ${ap.oreCost} ${ORES[ap.ore].name}` : ''}.`));
  // the stats, before and after
  // (every number is the fight's own, with the score steps: `sim/rankStep.ts`)
  const plan = stepPlan(kind, levelOfKind(meta, kind), now, next, heroStats(meta, kind)?.scores);
  const table = el('div', 'ruStats');
  const row = (name: string, from: string, to: string): void => {
    table.append(el('span', 'k', name), el('span', 'v', from), el('span', 'a', '→'), el('span', 'v up', to));
  };
  if (rp) row('Rank', stars(taken), stars(rp.to));
  if (plan) {
    row('Hp', String(plan.hp[0]), String(plan.hp[1]));
    row('Attack', String(plan.atk[0]), String(plan.atk[1]));
  }
  card.append(table);
  if (plan) {
    if (plan.scores.length) card.append(el('p', 'ruScores', plan.scores.map((sc) => `${sc.short} ${sc.from} → ${sc.to}`).join(' · ')));
    const words = [...plan.scores.filter((sc) => sc.mod).map((sc) => `${sc.short} ${sc.mod}${sc.effects.length ? `: ${sc.effects.join(', ')}` : ''}`), ...plan.figures];
    if (words.length) card.append(el('p', 'ruNote ruWhy', words.join(' · ')));
  }
  const p = PASSIVES[kind];
  if (!rp && p) card.append(el('p', 'ruNote', steps === 0 ? `Wakes ${p.name}: ${p.text}.` : `${p.name} grows stronger.`));
  const btns = el('div', 'ruBtns');
  const go = el('button', 'primary', rp ? 'Rank up' : 'Awaken');
  go.type = 'button';
  const no = el('button', '', 'Back');
  no.type = 'button';
  btns.append(go, no);
  card.append(btns);
  back.append(card);
  let n = 0;
  const timer = setInterval(() => {
    n++;
    before.tick(n);
    after.tick(n);
  }, 140);
  // (CLOSE-SCREENS: a moment over the hero's sheet (a place, which stays))
  const leave = openScreen('rankUp', () => undefined, { kind: 'moment' });
  const close = (): void => {
    clearInterval(timer);
    back.remove();
    leave();
  };
  no.addEventListener('click', close);
  back.addEventListener('click', (e) => {
    if (e.target === back) close();
  });
  go.addEventListener('click', () => {
    const got = rp ? rankUp(meta, kind) : awaken(meta, kind);
    if (!got) return close();
    saveMeta(meta);
    close();
    play('levelUp');
    done({ what: rp ? 'rank' : 'awaken', n: got });
  });
  document.body.append(back);
}
