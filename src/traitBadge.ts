// The trait badge, drawn the same on every screen: a small coloured shape with the trait's two letters. The shape says the
// kind (origins round, classes a shield) and the colour says the trait (`traitColours.ts`). Flat, crisp, 12px text, never bold,
// and nothing moves. A `+` corner marks a trait a hero would wake or raise; `dim` and `lit` are used for a picked trait.

import { colourOf } from './traitColours';
import { TRAITS } from './sim/traits';

const CSS = `
.tbw { position: relative; display: inline-block; flex: none; width: 24px; height: 24px; vertical-align: middle; cursor: pointer; }
.tbw.sm { width: 20px; height: 20px; }
.tb { display: block; box-sizing: border-box; width: 100%; height: 100%; background: var(--tb); color: var(--tbi); font: 400 12px/24px var(--body, monospace); letter-spacing: 0; text-align: center; text-shadow: none; text-indent: 0; overflow: hidden; }
.tbw.sm .tb { line-height: 20px; }
.tb.origin { border-radius: 50%; }
.tb.class { clip-path: polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%); }
.tbw .tbp { position: absolute; top: -4px; right: -4px; width: 12px; height: 12px; background: var(--e6); color: var(--s0); font: 400 12px/12px var(--body, monospace); text-align: center; letter-spacing: 0; text-indent: 0; }
.tbw.dim { opacity: 0.4; }
.tbw.lit .tb { outline: 2px solid var(--e10); outline-offset: 1px; }
`;

let styled = false;

export interface BadgeOptions {
  /** A small (20px) badge, for the chips and plates that keep their sizes. */
  small?: boolean;
  /** Mark the badge with a "+" corner: this hero would wake or raise the trait. */
  plus?: boolean;
  /** Dim the badge (a trait not wanted just now). */
  dim?: boolean;
  /** Draw a rim round it (the trait picked to find its heroes). */
  lit?: boolean;
}

/** A badge for a trait, as a span (handlers are the caller's). */
export function traitBadge(id: string, opts: BadgeOptions = {}): HTMLSpanElement {
  if (!styled) {
    styled = true;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);
  }
  const t = TRAITS[id];
  const col = colourOf(t);
  const wrap = document.createElement('span');
  wrap.className = `tbw${opts.small ? ' sm' : ''}${opts.dim ? ' dim' : ''}${opts.lit ? ' lit' : ''}`;
  wrap.dataset.trait = id;
  wrap.title = t.name;
  const shape = document.createElement('span');
  shape.className = `tb ${t.kind}`;
  shape.style.setProperty('--tb', `var(--${col.fill})`);
  shape.style.setProperty('--tbi', `var(--${col.ink})`);
  shape.textContent = t.short;
  wrap.append(shape);
  if (opts.plus) {
    const p = document.createElement('span');
    p.className = 'tbp';
    p.textContent = '+';
    wrap.append(p);
  }
  return wrap;
}
