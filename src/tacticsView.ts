// The party's tactics on the page (docs/notes/tactics.md, docs/notes/tactics-overview.md; the rules are `sim/tactics.ts`, the pick
// `sim/tacticPick.ts`). Two parts:
//
// - **The tactic button** in the fight, at the right just above the hero rows (COMBAT-HUD): the tactic's icon. A tap cycles to the next tactic (Advance
//   together, Hold the line, Charge, and back) and it takes effect in the running fight, through the sim's own order (`orderTactic`). A small
//   word pops up beside it with the mode's name ("Advance", "Hold", "Charge") and fades. The pick is kept in the save for this mode or army,
//   so the next fight begins with it. (It took the place of the prep screen's tactic chip and the fight's Charge! call: TACTICS-OVERVIEW.)
// - **The Formation button** on the prep screen, at the side of the board, once the formations are open (with Auto place): the shape the
//   heroes stand in, and a tap opens a sheet of the four shapes; a tap on one sets the placed heroes out in it.
//
// It never changes the battle except through `setTactic` (before the fight, from the page), `orderTactic` and the page's Arrange.

import type { Battle } from './sim/battle';
import { canChangeTactic, fightTactic, nextTactic, orderTactic, type Tactic } from './sim/tactics';
import { FORMATION_WORDS, TACTIC_WORDS } from './sim/tacticPick';
import { FORMATIONS_LIST, type Formation } from './sim/formations';
import { openScreen } from './screens';

export interface TacticsViewOpts {
  /** A new pick in the fight: the page keeps it in the save for the run's mode (or army). */
  pick: (t: Tactic) => void;
  /** Whether the formations are open (with Auto place), and the shape the heroes stand in now (undefined: Loose). */
  formationsOpen: () => boolean;
  formation: () => Formation | undefined;
  /** The shape picked on the sheet for this mode or army, which Auto place sets the heroes out in (undefined: none, Auto places as before). */
  picked: () => Formation | undefined;
  /** Set the placed heroes out in a shape and keep it as the pick; undefined (Loose) forgets the pick and moves nobody. */
  arrange: (f: Formation | undefined) => void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** Each tactic's small icon, drawn as the Auto button's star is: a pennant flying forward, a shield, two crossed blades. */
const ICONS: Record<Tactic, string> = {
  advance: '<path d="M1.5 0.5h1v9h-1zM2.5 1h6.5l-2 2.2 2 2.3h-6.5z" fill="currentColor"/>',
  hold: '<path d="M5 0.6l3.8 1.4v3c0 2.3-1.6 3.7-3.8 4.5-2.2-0.8-3.8-2.2-3.8-4.5v-3z" fill="currentColor"/><path d="M5 2v6.2" stroke="#0008" stroke-width="0.9"/>',
  charge: '<path d="M1 1.2l1.1-0.7 6.9 7.1-0.8 0.9zM9 1.2l-1.1-0.7-6.9 7.1 0.8 0.9z" fill="currentColor"/><path d="M0.6 8.1l1.3 1.3M9.4 8.1l-1.3 1.3" stroke="currentColor" stroke-width="1.2"/>',
};
/** The tactics with a painted icon in the build (UI-STANDARD: ui/tactics/<id>.png, docs/notes/ui-standard.md); the drawn icon stands in for any
 *  not painted yet. (A build without the list, as the tests', has none.) */
const PAINTED: readonly string[] = typeof __TACTIC_ART__ !== 'undefined' ? __TACTIC_ART__ : [];
const icon = (t: Tactic) =>
  PAINTED.includes(t) ? `<img class="fhTacticArt" src="ui/tactics/${t}.png" alt="" draggable="false">` : `<svg viewBox="0 0 10 10" width="22" height="22" aria-hidden="true">${ICONS[t]}</svg>`;

/** How long the mode's word stays beside the button (ms), fading over its last part. */
const WORD_MS = 1600;

export class TacticsView {
  readonly button: HTMLButtonElement;
  readonly word: HTMLDivElement;
  readonly formBtn: HTMLButtonElement;
  private sheet: HTMLDivElement;
  private closer?: () => void;
  private b?: Battle;
  private shown?: Tactic;
  private wordTimer?: ReturnType<typeof setTimeout>;

  constructor(private opts: TacticsViewOpts) {
    // (the fight's tactic button: at the right, just above the hero rows (COMBAT-HUD, the owner: "down on the right side, above the heroes'
    // bars, not at the top"); it rides on the panel's top edge, so it stays just above the rows however many heroes there are)
    this.button = el('button', 'fhTactic');
    this.button.id = 'tacticBtn';
    this.button.type = 'button';
    this.button.addEventListener('click', () => this.cycle());
    this.word = el('div', 'fhTacticWord');
    this.word.id = 'tacticWord';
    this.word.setAttribute('role', 'status');
    this.word.setAttribute('aria-live', 'polite');
    document.getElementById('panel')!.append(this.button, this.word);

    // (the prep screen's Formation button, at the side of the board)
    this.formBtn = el('button');
    this.formBtn.id = 'formBtn';
    this.formBtn.type = 'button';
    this.formBtn.hidden = true;
    this.formBtn.title = 'Set the heroes out in a formation';
    this.formBtn.addEventListener('click', () => this.openForms());
    document.body.appendChild(this.formBtn);

    this.sheet = el('div');
    this.sheet.id = 'tacticSheet';
    this.sheet.hidden = true;
    this.sheet.addEventListener('click', (e) => {
      if (e.target === this.sheet) this.close();
    });
    document.body.appendChild(this.sheet);
  }

  /** Each refresh of the page: the fight's button shows the tactic playing (or waiting for the next tick), and the prep screen's Formation
   *  button the shape the heroes stand in. */
  refresh(b: Battle): void {
    this.b = b;
    const on = canChangeTactic(b);
    this.button.hidden = !on;
    if (on) this.show(fightTactic(b));
    if (!on) this.word.classList.remove('up');
    const forms = b.phase === 'deploy' && this.opts.formationsOpen();
    this.formBtn.hidden = !forms;
    if (forms) {
      const shape = this.opts.formation();
      const words = shape ? FORMATION_WORDS[shape].short : 'Loose';
      if (this.formBtn.dataset.words !== words) {
        this.formBtn.dataset.words = words;
        this.formBtn.replaceChildren(el('small', '', 'Formation'), el('b', '', words));
      }
    }
  }

  private show(t: Tactic): void {
    if (this.shown === t) return;
    this.shown = t;
    const w = TACTIC_WORDS[t];
    this.button.innerHTML = `<span class="fhTacticFace">${icon(t)}</span><small>${w.short}</small>`;
    this.button.dataset.tactic = t;
    this.button.setAttribute('aria-label', `Tactic: ${w.name}. Tap for the next`);
    this.button.title = `${w.name}: ${w.line} Tap for the next tactic.`;
  }

  /** A tap: the next tactic, ordered in the fight, kept in the save, and its word shown beside the button. */
  private cycle(): void {
    const b = this.b;
    if (!b || !canChangeTactic(b)) return;
    const to = nextTactic(fightTactic(b));
    if (!orderTactic(b, to)) return;
    this.opts.pick(to);
    this.show(to);
    this.flash(TACTIC_WORDS[to].short);
  }

  /** The mode's word beside the button: it pops up, stays readable, then fades (with reduced motion it shows and goes, no movement). */
  private flash(text: string): void {
    this.word.textContent = text;
    this.word.classList.remove('up');
    void this.word.offsetWidth;
    this.word.classList.add('up');
    if (this.wordTimer) clearTimeout(this.wordTimer);
    this.wordTimer = setTimeout(() => this.word.classList.remove('up'), WORD_MS);
  }

  private openForms(): void {
    if (!this.sheet.hidden || !this.opts.formationsOpen()) return;
    const card = el('div', 'tacCard');
    const shape = this.opts.formation();
    card.append(el('h2', '', 'Formation'));
    const picked = this.opts.picked();
    card.append(el('p', 'tacAdvice', shape ? `The heroes stand in a ${FORMATION_WORDS[shape].name}. Tap a shape to set them out in it.` : 'The heroes stand in no shape. Tap one to set them out in it.'));
    card.append(el('p', 'tacAdvice', picked ? `Auto place sets them out in a ${FORMATION_WORDS[picked].name}.` : 'Auto place sets them out by their roles. Pick a shape and it uses that.'));
    const grid = el('div', 'tacForms');
    for (const f of FORMATIONS_LIST) {
      const w = FORMATION_WORDS[f];
      const b = el('button', `tacForm${f === picked ? ' on' : ''}`);
      b.type = 'button';
      b.append(el('b', '', w.name), el('span', '', w.line));
      b.addEventListener('click', () => {
        this.opts.arrange(f);
        this.close();
      });
      grid.append(b);
    }
    // (Loose: forget the pick, so Auto place sets the heroes out by their roles again; nobody moves)
    const loose = el('button', `tacForm${!picked ? ' on' : ''}`);
    loose.type = 'button';
    loose.append(el('b', '', 'Loose'), el('span', '', 'No shape: Auto place sets them out by their roles.'));
    loose.addEventListener('click', () => {
      this.opts.arrange(undefined);
      this.close();
    });
    grid.append(loose);
    card.append(grid);
    const shut = el('button', 'tacClose', 'Close');
    shut.type = 'button';
    shut.addEventListener('click', () => this.close());
    card.append(shut);
    this.sheet.replaceChildren(card);
    this.sheet.hidden = false;
    this.closer = openScreen('tactic', () => {
      this.sheet.hidden = true;
      this.sheet.replaceChildren();
      this.closer = undefined;
    });
  }

  private close(): void {
    this.closer?.();
  }
}
