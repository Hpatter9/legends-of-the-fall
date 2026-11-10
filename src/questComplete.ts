// The Quest complete card (QUEST-COMPLETE, `docs/notes/quest-complete.md`): shown when a quest is handed in. A standard ornate menu,
// as a card: "Quest complete" over the quest's name and its stars, the giver's face and name, the story's close where the quest has
// one (else the giver's thanks), the recap of what was done, and the rewards, which arrive one by one with a count and a cue each
// (all at once, with one cue, for reduced motion). What it says is worked out in `questCompleteRules.ts`; this file only draws it.

import { chestPicture } from './chestStash';
import { ICONS } from './menuArt';
import { ORE_ICON } from './oreView';
import { menuFoot, menuSection, menuWell, ornateMenu, type OrnateMenu } from './ornateMenu';
import { faceOf, giverName, giverWords } from './questCard';
import type { CompleteView, RewardRow } from './questCompleteRules';
import { play } from './render/sound';
import { bookCoverUrl } from './bookArt';
import { bookById } from './sim/bookData';
import type { ChestKind } from './sim/armyStars';
import type { QuestDef } from './sim/questData';
import type { TomeSize } from './sim/tomes';
import { TOME_ICON } from './tomeArt';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const still = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const img = (src: string): HTMLImageElement => {
  const i = el('img');
  i.src = src;
  i.alt = '';
  i.draggable = false;
  return i;
};

/** A reward's picture: the packs' and the paintings' own (the crown, the stone, the chest, the ore, the tome, the hero's portrait, the
 *  book's cover). A hero who joins is a plain crest, so the join reveal that follows the card is still a reveal. */
function rewardPicture(r: RewardRow): HTMLElement {
  const box = el('span', `qxIco ${r.kind}`);
  if (r.kind === 'crowns') box.append(img(ICONS.crowns));
  else if (r.kind === 'stones') box.append(img(ICONS.stones));
  else if (r.kind === 'chest') box.append(chestPicture((r.ref ?? 'bronze') as ChestKind, 0.85).root);
  else if (r.kind === 'ore' && r.ref && ORE_ICON[r.ref]) box.append(img(ORE_ICON[r.ref]));
  else if (r.kind === 'tome' && r.ref) box.append(img(TOME_ICON[r.ref as TomeSize]));
  else if (r.kind === 'shards' && r.ref) box.append(img(`heroes/${r.ref}-portrait.webp`));
  else if (r.kind === 'book' && r.ref && bookById(r.ref)) box.append(img(bookCoverUrl(bookById(r.ref)!)));
  else if (r.kind === 'hero') box.append(img(ICONS.heroes));
  else box.append(img(ICONS.trophy));
  return box;
}

/** The cue a reward arrives with (the page's own reward cues: a claim's coins, a sparkle, a star). */
const cueOf = (r: RewardRow): 'coinClaim' | 'sparkle' | 'star' => (r.kind === 'crowns' ? 'coinClaim' : r.kind === 'chest' || r.kind === 'hero' || r.kind === 'book' ? 'star' : 'sparkle');

/** The gap between two rewards arriving, and how long an amount counts up (ms). */
const ARRIVE_MS = 380;
const COUNT_MS = 520;

export interface CompleteHooks {
  /** The quest's own definition, where the card is for a quest (the ruler's lines are said in the chosen ruler's words). */
  quest?: QuestDef;
  /** A picture for the giver's place where the giver has no painted face of their own (an Eidolon chain's part: its piece's sigil). */
  face?: HTMLElement;
  /** The card has gone, however it went (the join reveal of a hero the quest brought plays from here). */
  onClose?: () => void;
  /** The primary button was pressed (the card has closed): go where `view.next` says. */
  onNext?: () => void;
}

let open: OrnateMenu | null = null;
/** Whether the Quest complete card is up. */
export const questCompleteOpen = (): boolean => !!open;

/** Show the card for a quest just handed in (or an Eidolon chain's part just done). */
export function openQuestComplete(view: CompleteView, hooks: CompleteHooks = {}): OrnateMenu {
  const timers: number[] = [];
  let next = false;
  const menu = ornateMenu({
    id: 'questComplete',
    eyebrow: 'Quest complete',
    title: view.title,
    sub: view.starLine,
    label: `Quest complete: ${view.title}`,
    onClose: () => {
      for (const t of timers) clearTimeout(t);
      open = null;
      hooks.onClose?.();
      if (next) hooks.onNext?.();
    },
  });
  open = menu;
  menu.root.classList.add('qxVeil');
  const say = (line: string): string => (hooks.quest ? giverWords(hooks.quest, line) : line);

  // the giver: their painted face, name and the line under it
  const who = view.giver.key ? giverName(view.giver.key) : { name: view.giver.name ?? '', title: view.giver.title ?? '' };
  const giver = el('div', 'qxGiver');
  if (view.giver.key) giver.append(faceOf(view.giver.key, 'qFace big'));
  else if (hooks.face) {
    const frame = el('span', 'qxFace');
    frame.append(hooks.face);
    giver.append(frame);
  }
  const names = el('div', 'qxWho');
  names.append(el('b', '', who.name), el('small', '', who.title));
  giver.append(names);
  menu.body.append(giver);
  // (a quest with no story: the giver's thanks, as their own words)
  for (const line of view.thanks ?? []) menu.body.append(el('p', 'qxThanks', `“${say(line)}”`));

  // the story's close: what it was, then the giver's words
  if (view.story) {
    menuSection(menu.body, 'The story').remove();
    const well = menuWell(menu.body);
    well.classList.add('qxStory');
    for (const line of view.story.told) well.append(el('p', '', line));
    view.story.said.forEach((line, i) => {
      const q = el('p', 'qxSaid', `“${say(line)}”`);
      if (i === view.story!.said.length - 1 && who.name) q.append(el('cite', '', ` ${who.name}`));
      well.append(q);
    });
  }

  // the recap
  if (view.recap.length) {
    menuSection(menu.body, 'What you did').remove();
    const well = menuWell(menu.body);
    well.classList.add('qxRecap');
    for (const l of view.recap) {
      const row = el('p', `qxLine ${l.kind}`);
      row.append(el('span', '', l.text));
      if (l.count) row.append(el('b', '', l.count));
      well.append(row);
    }
  }

  // the rewards, arriving one by one
  if (view.rewards.length) {
    menuSection(menu.body, 'Rewards').remove();
    const list = el('div', 'qxRewards');
    list.setAttribute('role', 'list');
    menu.body.append(list);
    const calm = still();
    const arrive: (() => void)[] = [];
    view.rewards.forEach((r, i) => {
      const row = el('div', `qxReward ${r.kind}${calm ? ' in' : ''}`);
      row.setAttribute('role', 'listitem');
      row.setAttribute('aria-label', r.n !== undefined ? `${r.n} ${r.text}` : r.text);
      const words = el('span', 'qxWords');
      const amount = r.n !== undefined ? el('b', 'qxN', calm ? r.n.toLocaleString('en-GB') : '0') : null;
      if (amount) words.append(amount, ' ');
      words.append(r.text);
      row.append(rewardPicture(r), words);
      list.append(row);
      if (calm) return;
      arrive.push(() =>
        timers.push(
          window.setTimeout(() => {
          row.classList.add('in');
          play(cueOf(r));
          if (!amount || r.n === undefined) return;
          const t0 = performance.now();
          const tick = (): void => {
            if (open !== menu) return;
            const k = Math.min(1, (performance.now() - t0) / COUNT_MS);
            amount.textContent = Math.round(r.n! * (1 - (1 - k) ** 3)).toLocaleString('en-GB');
            if (k < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          }, 250 + i * ARRIVE_MS),
        ),
      );
    });
    // (QUEST-COMPLETE 2, found by playing one: on a long card the rewards are below the fold while the story is being read. They wait
    // until the list is in view, so none arrives unseen and the card is never pulled down under the reader.)
    const start = (): void => {
      for (const go of arrive.splice(0)) go();
    };
    if (!calm && 'IntersectionObserver' in window) {
      const seen = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          seen.disconnect();
          start();
        },
        { root: menu.body, threshold: 0.15 },
      );
      seen.observe(list);
      timers.push(window.setTimeout(() => seen.disconnect(), 600_000));
    } else start();
    // (reduced motion: everything is there at once, with one cue)
    if (calm) play('coinClaim');
  }

  menuFoot(menu, {
    back: { word: 'close' },
    ...(view.next && hooks.onNext
      ? {
          primary: {
            label: view.next.label,
            onClick: () => {
              next = true;
              menu.close();
            },
          },
        }
      : {}),
  });
  return menu;
}
