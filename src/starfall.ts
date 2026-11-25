// COSMETICS (docs/notes/cosmetics.md): Starfall summons, bought in the Shop and chosen in Settings, Ruler and Duchess ("Summoning look"):
// every summoning card shows the Starfall back before it turns, and a burst of violet and gold stars goes off as a card turns and as a new
// hero arrives. The art is the owner's round 2 (`tools/cosmetics/starfall.py`). Looks only; with it off, or not owned, the classic look.

import backUrl from './art/starfall/cardback.webp';
import burstUrl from './art/starfall/burst.webp';
import { entitledHere } from './iapRules';
import { settings } from './settings';

export const STARFALL_ENTITLEMENT = 'starfall_summons';

/** Whether the summoning wears Starfall now: chosen, and owned (a refund takes it off by itself). */
export const starfallWorn = (): boolean => settings().starfall === true && entitledHere(STARFALL_ENTITLEMENT);

const reduced = (): boolean => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A card's back in Starfall's look (the card back itself; the classic glyph and "?" are hidden by the class). */
export function starfallBack(card: HTMLElement): void {
  card.classList.add('starfall');
}

/** The burst over `parent` (a turning card, in place of the classic flourish; or the reveal's stage), played once and taken away. None
 *  under reduced motion. */
export function starfallBurst(parent: HTMLElement, cls = 'sfBurstCard'): void {
  if (reduced()) return;
  const b = document.createElement('div');
  b.className = `sfBurst ${cls}`;
  b.addEventListener('animationend', () => b.remove(), { once: true });
  // (taken away anyway, should the animation not run: a page hidden mid-burst)
  setTimeout(() => b.remove(), 1600);
  parent.append(b);
}

const style = document.createElement('style');
style.textContent = `
.tarotCard.back.starfall { background: url("${backUrl}") center / 100% 100% no-repeat; }
.tarotCard.back.starfall::after, .tarotCard.back.starfall .tarotHeart { display: none; }
.sfBurst { position: absolute; pointer-events: none; z-index: 4; aspect-ratio: 1; background: url("${burstUrl}") 0 0 / 800% 100% no-repeat; animation: sfBurst .72s steps(7) forwards; mix-blend-mode: screen; }
@keyframes sfBurst { from { background-position-x: 0; } to { background-position-x: 100%; } }
/* (a turning card's burst stays on its card: a little past its sides, never down over the name under it) */
.sfBurstCard { left: -8%; width: 116%; top: 50%; transform: translateY(-50%); }
.sfBurstHero { left: 50%; bottom: 18%; width: min(90vw, 360px); transform: translateX(-50%); z-index: 6; }
`;
if (typeof document !== 'undefined') document.head.append(style);
