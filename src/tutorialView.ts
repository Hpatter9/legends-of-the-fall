// PAUSE-TIPS (docs/notes/pause-tips.md): the unlock tutorials' cards, and the Tutorials page under Settings. Each card is the standard
// ornate menu (UI-STANDARD): the feature's picture, its few lines, and "Got it". A card the game raises is guarded (`popupGuardRules.ts`):
// its first moment is deaf to taps, and no tap outside it closes it. The rules (what is due, what is seen) are `tutorialRules.ts`.

import { menuChoice, menuFoot, menuNote, menuSection, menuWell, ornateMenu } from './ornateMenu';
import { dueOnPage, resetTutorials, tutorialOf, tutorialSeen, TUTORIALS, markTutorialSeen, type Tutorial, type TutorialId, type TutorialPage } from './tutorialRules';
import type { Meta } from './sim/meta';

let metaOf: (() => Meta) | null = null;
let saveIt: () => void = () => undefined;

/** The page tells the cards where the save is, once it is loaded. */
export function bindTutorials(meta: () => Meta, save: () => void): void {
  metaOf = meta;
  saveIt = save;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** The picture and the lines of one tutorial, into `parent`. */
function fill(parent: HTMLElement, t: Tutorial): void {
  if (t.art) {
    const img = el('img', 'tuArt');
    img.src = t.art;
    img.alt = '';
    parent.append(img);
  }
  const well = menuWell(parent);
  const list = el('ul', 'tuLines');
  for (const line of t.lines) list.append(el('li', '', line));
  well.append(list);
}

/** One tutorial's card: "Got it" closes it (as do Escape and the phone's Back) and calls `done`. `index` of `count` when several queue. */
export function showTutorial(id: TutorialId, at: { index: number; count: number }, done: () => void, asked = false): void {
  const t = tutorialOf(id);
  if (!t) return done();
  // (a deploy screen's tutorial lights what it talks about, while that is on show: the tips' own glow)
  const lit = t.point && !asked ? document.querySelector<HTMLElement>(t.point) : null;
  const lights = !!lit && lit.getClientRects().length > 0 && !lit.closest('[hidden]');
  if (lights) lit!.classList.add('tipLit');
  const menu = ornateMenu({
    id: 'tutorialCard',
    eyebrow: t.at === 'deploy' || t.at === 'fight' ? 'Before the wave' : 'A word of advice',
    title: t.title,
    asked,
    onClose: () => {
      if (lights) lit!.classList.remove('tipLit');
      done();
    },
  });
  if (lights) spotlight(menu.root, lit!);
  fill(menu.body, t);
  if (at.count > 1) menuNote(menu.body, `${at.index + 1} of ${at.count}`).classList.add('tuCount');
  menuFoot(menu, { primary: { label: at.index + 1 < at.count ? 'Got it · next' : 'Got it', onClick: () => menu.close() } });
}

/** The lit thing kept in sight: the veil's dim opens round it (a spotlight), and a thing in the lower half has the card set above it. */
function spotlight(veil: HTMLElement, lit: HTMLElement): void {
  const r = lit.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const rad = Math.max(r.width, r.height) / 2 + 14;
  veil.classList.add('tuSpot');
  veil.style.background = `radial-gradient(circle at ${cx}px ${cy}px, transparent 0 ${rad}px, rgba(5, 7, 5, 0.6) ${rad + 24}px)`;
  if (cy > window.innerHeight / 2) {
    veil.classList.add('tuAbove');
    veil.style.setProperty('--tu-room', `${Math.max(240, r.top - 10)}px`);
  }
}

/** A page's own tutorials, the first time it is opened with them due: one after another, each seen once it is closed. */
let pageBusy = false;
export function offerPageTutorials(page: TutorialPage): void {
  const m = metaOf?.();
  if (!m || pageBusy) return;
  const ids = dueOnPage(m, page);
  if (!ids.length) return;
  pageBusy = true;
  const next = (i: number): void => {
    if (i >= ids.length) {
      pageBusy = false;
      return;
    }
    // (after the page's own drawing, so the card is the one on top)
    setTimeout(
      () =>
        showTutorial(ids[i], { index: i, count: ids.length }, () => {
          markTutorialSeen(m, ids[i]);
          saveIt();
          next(i + 1);
        }),
      i ? 0 : 250,
    );
  };
  next(0);
}

/** Settings › Tutorials: every explanation, to read again, and "Show tips again". "‹ Back" returns to Settings. */
export function openTutorialsPage(onClose?: () => void): void {
  const m = metaOf?.();
  const menu = ornateMenu({ id: 'tutorials', eyebrow: 'Settings', title: 'Tutorials', sub: 'Every explanation the game gives, to read again', kind: 'sheet', asked: true, onClose });
  const groups: [string, (t: Tutorial) => boolean][] = [
    ['On the deploy screen', (t) => t.at === 'deploy'],
    ['As the fight begins', (t) => t.at === 'fight'],
    ['Around the keep', (t) => t.at !== 'deploy' && t.at !== 'fight'],
  ];
  for (const [name, pick] of groups) {
    const grid = menuSection(menu.body, name, 'tap one to read it', 2);
    for (const t of TUTORIALS.filter(pick)) {
      const seen = !m || tutorialSeen(m, t.id);
      const b = menuChoice(grid, { title: t.title, lines: [t.when], onPick: () => showTutorial(t.id, { index: 0, count: 1 }, () => undefined, true) });
      b.classList.add('tuRow');
      b.classList.toggle('unseen', !seen);
      if (t.art) {
        const ico = el('span', 'omIco');
        const img = el('img');
        img.src = t.art;
        img.alt = '';
        ico.append(img);
        b.prepend(ico);
      }
    }
  }
  const again = menuSection(menu.body, 'Start again', 'every tip and explanation shows once more, as its moment comes', 2);
  const reset = menuChoice(again, {
    title: 'Show tips again',
    onPick: () => {
      if (m) {
        resetTutorials(m);
        saveIt();
      }
      againHook();
      reset.querySelector('b')!.textContent = 'Tips will show again';
      for (const r of menu.body.querySelectorAll('.tuRow')) r.classList.add('unseen');
    },
  });
  menuFoot(menu, { back: { word: 'back' } });
}

/** The first-run tips' own reset, which "Show tips again" also does (`tips.ts`; kept apart so this file needs no tips). */
let againHook: () => void = () => undefined;
export function onShowTipsAgain(fn: () => void): void {
  againHook = fn;
}
