// OVERLOOK-STAND: the way into the Last Stand from the overlook, as the Calamity has its own moment. A tap on the watchtower
// sounds the horn, the camera flies in to the tower as the dusk closes round it, the Stand's name rises with its record,
// and the screen goes dark into the Stand. About a second; a tap skips it; reduced motion keeps a short fade without the zoom.
import { play } from './render/sound';

/** How long the moment runs before the Stand opens (ms), with and without motion. */
export const GATE_MS = 1000;
export const GATE_MS_STILL = 350;

/** Play the entry over the overlook (`root` is the camp's `.cpWrap`, `focus` the tower's middle inside it, in css pixels).
 *  Resolves when the screen is dark; the returned `done` takes the moment away again (call it once the Stand has opened). */
export function playStandGate(root: HTMLElement, focus: { x: number; y: number } | null, words: { line: string }, reduced: boolean): Promise<() => void> {
  const f = focus ?? { x: root.clientWidth * 0.1, y: root.clientHeight * 0.13 };
  root.style.setProperty('--sgX', `${Math.round(f.x)}px`);
  root.style.setProperty('--sgY', `${Math.round(f.y)}px`);
  root.style.setProperty('--sgW', `${root.clientWidth}px`);
  root.style.setProperty('--sgH', `${root.clientHeight}px`);
  const veil = document.createElement('div');
  veil.className = 'sgVeil';
  veil.setAttribute('role', 'status');
  const card = document.createElement('div');
  card.className = 'sgCard';
  const eyebrow = document.createElement('span');
  eyebrow.textContent = 'HOLD THE KEEP';
  const title = document.createElement('b');
  title.textContent = 'The Last Stand';
  const line = document.createElement('small');
  line.textContent = words.line;
  card.append(eyebrow, title, line);
  veil.append(card);
  root.append(veil);
  root.classList.add('sgGo');
  if (reduced) root.classList.add('sgStill');
  play('horn');
  const done = () => {
    root.classList.remove('sgGo', 'sgStill');
    veil.remove();
  };
  return new Promise((resolve) => {
    let over = false;
    const end = () => {
      if (over) return;
      over = true;
      clearTimeout(timer);
      resolve(done);
    };
    const timer = setTimeout(end, reduced ? GATE_MS_STILL : GATE_MS);
    // (a tap goes straight in)
    veil.addEventListener('pointerdown', end, { once: true });
  });
}
