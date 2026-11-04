// The party's tactics on the page (docs/notes/tactics.md; the rules are `sim/tactics.ts`, the pick `sim/tacticPick.ts`). Two parts:
//
// - **The chip** on the prep screen, beside Auto: the tactic picked for this mode or army ("Advance"). A tap opens the sheet: the three
//   tactics as large buttons, each with its one line, the picked one lit. A pick is kept in the save at once.
// - **The Charge! button** in the fight, while the party is held (Advance or Hold, before the line meets the foe): a tap lets everyone go,
//   once a fight, through the sim's own order (`orderCharge`).
//
// It never changes the battle except through `setTactic` (before the fight, from the page) and `orderCharge`.

import type { Battle } from './sim/battle';
import { canCharge, orderCharge, TACTICS_LIST, type Tactic } from './sim/tactics';
import { FORMATION_WORDS, TACTIC_WORDS } from './sim/tacticPick';
import { FORMATIONS_LIST, type Formation } from './sim/formations';
import { openScreen } from './screens';

export interface TacticsViewOpts {
  /** The tactic picked for the run's mode (or army). */
  picked: () => Tactic;
  /** A new pick: the page keeps it in the save. */
  pick: (t: Tactic) => void;
  /** Whether the formations are open (with Auto place), and the shape the heroes stand in now (undefined: Loose). */
  formationsOpen: () => boolean;
  formation: () => Formation | undefined;
  /** Set the placed heroes out in a shape. */
  arrange: (f: Formation) => void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

export class TacticsView {
  readonly chip: HTMLButtonElement;
  readonly charge: HTMLButtonElement;
  private sheet: HTMLDivElement;
  private closer?: () => void;
  private b?: Battle;

  constructor(private opts: TacticsViewOpts) {
    this.chip = el('button');
    this.chip.id = 'tactic';
    this.chip.type = 'button';
    this.chip.title = 'The party’s tactic';
    this.chip.addEventListener('click', () => this.open());
    const buttons = document.getElementById('buttons')!;
    buttons.insertBefore(this.chip, document.getElementById('homeBtn'));

    this.sheet = el('div');
    this.sheet.id = 'tacticSheet';
    this.sheet.hidden = true;
    this.sheet.addEventListener('click', (e) => {
      if (e.target === this.sheet) this.close();
    });
    document.body.appendChild(this.sheet);

    this.charge = el('button', '', 'Charge!');
    this.charge.id = 'chargeBtn';
    this.charge.type = 'button';
    this.charge.hidden = true;
    this.charge.title = 'Let everyone go at once (once a fight)';
    this.charge.addEventListener('click', () => {
      if (this.b && orderCharge(this.b)) this.charge.hidden = true;
    });
    document.body.appendChild(this.charge);
  }

  /** Each refresh of the page: the chip's words, and the Charge! button while the party is held. */
  refresh(b: Battle): void {
    this.b = b;
    const shape = this.opts.formationsOpen() ? this.opts.formation() : undefined;
    const words = `${TACTIC_WORDS[this.opts.picked()].short}|${shape ? FORMATION_WORDS[shape].short : ''}`;
    if (this.chip.dataset.words !== words) {
      this.chip.dataset.words = words;
      // (a small pennant, drawn as the Auto button's star is; the formation the heroes stand in, if any, a small line under the tactic)
      this.chip.innerHTML = '<svg viewBox="0 0 10 10" width="12" height="12" aria-hidden="true"><path d="M1.5 0.5h1v9h-1zM2.5 1h6.5l-2 2.2 2 2.3h-6.5z" fill="currentColor"/></svg>';
      const text = el('span', 'tacWords');
      text.append(el('b', '', TACTIC_WORDS[this.opts.picked()].short));
      if (shape) text.append(el('small', '', FORMATION_WORDS[shape].short));
      this.chip.append(text);
    }
    this.charge.hidden = !canCharge(b);
  }

  private open(): void {
    if (!this.sheet.hidden) return;
    const card = el('div', 'tacCard');
    card.append(el('h2', '', 'Party tactic'));
    const now = this.opts.picked();
    for (const t of TACTICS_LIST) {
      const w = TACTIC_WORDS[t];
      const b = el('button', `tacOpt${t === now ? ' on' : ''}`);
      b.type = 'button';
      b.append(el('b', '', w.name), el('span', '', w.line));
      b.addEventListener('click', () => {
        this.opts.pick(t);
        this.close();
      });
      card.append(b);
    }
    // (the formations, once Auto place is open: the shape the heroes stand in, and a tap sets them out in another)
    if (this.opts.formationsOpen()) {
      const shape = this.opts.formation();
      card.append(el('h3', '', shape ? `Formation: ${FORMATION_WORDS[shape].name}` : 'Formation: none (place the heroes in a shape)'));
      const grid = el('div', 'tacForms');
      for (const f of FORMATIONS_LIST) {
        const w = FORMATION_WORDS[f];
        const b = el('button', `tacForm${f === shape ? ' on' : ''}`);
        b.type = 'button';
        b.append(el('b', '', w.name), el('span', '', w.line));
        b.addEventListener('click', () => {
          this.opts.arrange(f);
          this.close();
        });
        grid.append(b);
      }
      card.append(grid);
    }
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
