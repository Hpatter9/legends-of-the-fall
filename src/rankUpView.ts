// The Rank up card: the hero and its look before and after (when it changes: an awakening equips its legendary gear), the rank's stars
// old to new, what the step gives, the stats before and after (one row each, `statRows.ts`), what earned it, and the button that takes
// the step. A standard ornate menu (RANKUP-LAYOUT, docs/notes/rankup-layout.md). A rank is the player's choice, never automatic
// (`sim/rankUp.ts`); the awakening steps above the top rank use the same card (`sim/awaken.ts`). `openRankUp` puts the card over the page and calls `done` with what
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
import { menuFoot, menuNote, menuSection, menuWell, ornateMenu } from './ornateMenu';
import { statRows, type StatRow } from './statRows';
import { signed } from './sim/statLines';
import { MAX_AWAKEN } from './sim/awakenRules';
import heartUrl from './art/ui/combat-heart.png';
import swordsUrl from './art/ui/combat-icon-swords.png';

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
/** A rank as its marks: the stars taken of `MAX_RANK`, then the awakening's gems. */
const marks = (rank: number, awakened: number): string => `${'★'.repeat(rank)}${'☆'.repeat(MAX_RANK - rank)} ${'◆'.repeat(awakened)}${'◇'.repeat(MAX_AWAKEN - awakened)}`;

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
  const level = levelOfKind(meta, kind);
  // (RANKUP-LAYOUT: the standard ornate menu; top to bottom: the hero and its look, the rank's stars old to new, what the step gives,
  // then the stats, each on one row)
  let timer = 0;
  // (CLOSE-SCREENS: a moment over the hero's sheet (a place, which stays))
  const leave = openScreen('rankUp', () => undefined, { kind: 'moment' });
  const menu = ornateMenu({
    id: 'rankUp', eyebrow: rp ? 'Rank up' : 'Awakening', title: heroName(kind), sub: `${UNITS[kind].name} · Level ${level}`,
    label: `${heroName(kind)}: ${rp ? 'Rank up' : 'Awakening'}`,
    onClose: () => {
      clearInterval(timer);
      leave();
    },
  });
  menu.card.classList.add('ruCard');
  const close = menu.close;
  // (a tap outside the card closes it and changes nothing, as before)
  menu.root.addEventListener('click', (e) => {
    if (e.target === menu.root) close();
  });
  // the look, before and after (one picture when the look does not change)
  const looks = el('div', 'ruLooks');
  const before = pic(kind, now);
  const after = pic(kind, next);
  const changes = lookSheet(kind, now, 1) !== lookSheet(kind, next, 1);
  looks.append(before.box);
  if (changes) {
    after.box.classList.add('new');
    looks.append(el('span', 'ruArrow', '→'), after.box);
    looks.classList.add('two');
  }
  // the rank, old to new: its stars, and the awakening's gems beside them
  const ranks = el('div', 'ruRanks');
  ranks.setAttribute('aria-label', rp ? `Rank ${taken} to ${rp.to}` : `Awakening ${steps} to ${steps + 1}`);
  ranks.append(el('span', 'ruRankOld', marks(taken, steps)), el('span', 'ruArrow', '→'), el('span', 'ruRankNew', rp ? marks(rp.to, steps) : marks(taken, steps + 1)));
  menu.body.append(looks, ranks);
  // what the step gives, and what earned it
  const plan = stepPlan(kind, level, now, next, heroStats(meta, kind)?.scores);
  const gives = el('ul', 'ruGives');
  const give = (text: string, cls = ''): void => void gives.append(el('li', cls, text));
  const p = PASSIVES[kind];
  if (!rp && p) give(steps === 0 ? `Wakes ${p.name}: ${p.text}.` : `${p.name} grows stronger.`, 'ruGift');
  if (changes) give('It takes on a new look.', 'ruGift');
  // (what each raised score's new modifier does: "CON +5 → +6: health +5%")
  for (const sc of plan?.scores ?? []) if (sc.mod) give(`${sc.short} ${sc.mod}${sc.effects.length ? `: ${sc.effects.join(', ')}` : ''}`);
  if (gives.childElementCount) menu.body.append(gives);
  // the stats, before and after, each on one row
  // (every number is the fight's own, with the score steps: `sim/rankStep.ts`)
  if (plan) {
    const num = (n: number): string => String(n);
    const rows: StatRow[] = [
      { name: 'Health', from: num(plan.hp[0]), to: num(plan.hp[1]), gain: `+${plan.hp[1] - plan.hp[0]}`, icon: heartUrl },
      { name: 'Attack', from: num(plan.atk[0]), to: num(plan.atk[1]), gain: `+${plan.atk[1] - plan.atk[0]}`, icon: swordsUrl },
      ...plan.scores.map((sc) => ({ name: sc.short, from: num(sc.from), to: num(sc.to), gain: `+${sc.to - sc.from}` })),
      ...plan.figureSteps.map((f) => ({ name: f.label, from: f.signed ? signed(f.from) : num(f.from), to: f.signed ? signed(f.to) : num(f.to), gain: `+${f.to - f.from}` })),
    ];
    // (a section's heading over a slate well, in place of its grid of choices)
    const sec = menuSection(menu.body, 'Stats', 'before and after').parentElement!;
    sec.querySelector('.omGrid')?.remove();
    const well = menuWell(sec);
    well.classList.add('ruStats');
    well.append(statRows(rows));
  }
  const have = meta.shards[kind] ?? 0;
  menuNote(menu.body, rp ? `Earned with ${RANK_SHARDS[rp.to - 1]} shards (you have ${have}).` : `${AWAKEN_SHARDS[steps]} shards in all, and ${AWAKEN_COSTS[steps]} of them are used up${ap?.ore && ORES[ap.ore] ? `, with ${ap.oreCost} ${ORES[ap.ore].name}` : ''} (you have ${have}).`).classList.add('ruEarned');
  menuFoot(menu, {
    back: { word: 'close' },
    primary: {
      label: rp ? 'Rank up' : 'Awaken',
      onClick: () => {
        const got = rp ? rankUp(meta, kind) : awaken(meta, kind);
        if (!got) return close();
        saveMeta(meta);
        close();
        play('levelUp');
        done({ what: rp ? 'rank' : 'awaken', n: got });
      },
    },
  });
  let n = 0;
  timer = window.setInterval(() => {
    n++;
    before.tick(n);
    after.tick(n);
  }, 140);
}
