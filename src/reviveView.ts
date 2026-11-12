// The line that says lives were spent (TEN-LIVES: "The whole party fell · 5 lives spent, 4 left. The party rises."; it was the burning
// heart's line, and the heart's flame went with the hearts). Plain DOM and the Web Animations API, one-shot only.

/** Whether the phone asks for less motion. */
export const reducedMotion = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** The line that says what happened ("The whole party fell · 5 lives spent, 4 left. The party rises."): it fades in, holds, and fades out over `ms`, then goes (`.dismiss()` sends it
 *  away early; a tap no longer does, POPUP-GUARD). */
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
