// The heart that burns when the party falls (an army's or the daily's hearts): the heart is drawn with a flame over it that
// plays once, and a short line says what happened. Plain DOM and the Web Animations API, one-shot only (no looping, no flashing).
// The flame is the Pixel Effects `flame_fire` strip (six 32px frames), credited in CREDITS.md.

import flameUrl from './art/fx/vfx/flame_fire.png';

/** Whether the phone asks for less motion: the burn is then a quiet fade, with no flame. */
export const reducedMotion = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const FRAME = 48;
const FRAMES = 6;

/** A heart shown burning: the flame plays through its six frames once over `ms`, and the heart blackens and thins away under it. */
export function burnHeart(box: HTMLElement, heart: HTMLImageElement, ms: number): void {
  heart.animate(
    [{ filter: 'none', opacity: 1, transform: 'scale(1)' }, { filter: 'sepia(1) saturate(3) brightness(1.1)', opacity: 1, transform: 'scale(1.15)', offset: 0.35 }, { filter: 'grayscale(1) brightness(0.3)', opacity: 0.2, transform: 'scale(0.8)' }],
    { duration: ms, easing: 'ease-in', fill: 'forwards' },
  );
  if (reducedMotion()) return;
  const flame = document.createElement('span');
  flame.className = 'flame';
  Object.assign(flame.style, { backgroundImage: `url(${flameUrl})`, backgroundSize: `${FRAME * FRAMES}px ${FRAME}px` });
  box.append(flame);
  flame.animate([{ backgroundPosition: '0 0' }, { backgroundPosition: `${-FRAME * (FRAMES - 1)}px 0` }], { duration: ms, easing: `steps(${FRAMES}, jump-none)`, fill: 'forwards' });
  flame.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
}

/** The line that says what happened ("A heart burns. The party rises."): it fades in, holds, and fades out over `ms`, then goes. A tap sends it away early (`.dismiss()`). */
export function reviveLine(text: string, ms: number): { dismiss: () => void } {
  const line = document.createElement('div');
  line.className = 'reviveLine';
  line.textContent = text;
  document.body.append(line);
  const a = line.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none', offset: 0.15 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
  a.onfinish = () => line.remove();
  return {
    dismiss: () => {
      if (!line.isConnected) return;
      line.animate([{ opacity: Number(getComputedStyle(line).opacity) }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).onfinish = () => line.remove();
    },
  };
}
