// The short wave card's one-liners (WAVE-RECAP, `sim/waveCard.ts`): a level gained, gear found, a hero fallen, a heart burned.
// Each line fades in once; nothing loops. A quiet wave has none, and the list hides.

import type { WaveNote } from './sim/waveCard';

const MARKS: Record<WaveNote['kind'], string> = { level: '▲', ult: '✦', found: '◆', fell: '✝', heart: '♥' };

export function drawWaveNotes(root: HTMLElement, notes: readonly WaveNote[]): void {
  root.replaceChildren();
  root.hidden = !notes.length;
  notes.forEach((n, i) => {
    const line = document.createElement('p');
    line.className = `wn ${n.kind}`;
    line.style.setProperty('--i', String(Math.min(i, 6)));
    const mark = document.createElement('span');
    mark.textContent = MARKS[n.kind];
    mark.setAttribute('aria-hidden', 'true');
    line.append(mark, document.createTextNode(n.text));
    root.append(line);
  });
}
