// A finished build's popup (UI batch 1, in place of the castle cinematic): a small card naming the building and what it gives; a tap
// anywhere closes it. It is put up over whatever screen is showing and holds nothing up: no film, no waiting.

import { builtWords } from './render/castleSpots';
import { lookPicture } from './castle';
import type { BuildSite } from './sim/castle';
import { play } from './render/sound';

const CSS = `
#builtPop { position: fixed; inset: 0; z-index: 90; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgb(8 12 10 / 0.55); cursor: pointer; -webkit-tap-highlight-color: transparent; animation: builtIn 0.18s ease-out; }
#builtPop .bpCard { box-sizing: border-box; width: min(300px, 100%); padding: 14px 14px 10px; text-align: center; border: 1px solid #ad8e50; border-radius: 4px; background: linear-gradient(135deg, #1b231df8, #10191df8); box-shadow: inset 0 0 0 3px #c4a15d15, 0 6px 22px #000c; color: #e4d6be; font: 400 13px/1.35 var(--body, sans-serif); }
#builtPop .bpEyebrow { display: block; font: 400 10px/1.4 var(--body, sans-serif); letter-spacing: 2px; color: #d2b775; }
#builtPop .bpPic { display: block; width: 72px; height: 72px; margin: 6px auto 4px; object-fit: contain; image-rendering: pixelated; }
#builtPop h3 { margin: 0; font: 700 17px/1.3 var(--display, serif); color: #e8cb86; }
#builtPop .bpLevel { display: block; margin: 1px 0 6px; font-size: 12px; color: #b8c9a5; }
#builtPop .bpGives { margin: 0 0 8px; }
#builtPop .bpTap { display: block; font-size: 11px; color: #9aa38f; }
@keyframes builtIn { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { #builtPop { animation: none; } }
`;

let styled = false;

/** Put the popup up for a build just finished (`level` is the building's new level). A second one waiting replaces the first. */
export function showBuilt(site: BuildSite, level: number): void {
  if (!styled) {
    styled = true;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);
  }
  document.getElementById('builtPop')?.remove();
  const w = builtWords(site, level);
  const pop = document.createElement('div');
  pop.id = 'builtPop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', `${w.title} ${w.level}`);
  const card = document.createElement('div');
  card.className = 'bpCard';
  const pic = document.createElement('img');
  pic.className = 'bpPic';
  pic.src = lookPicture(site, level);
  pic.alt = '';
  pic.draggable = false;
  const add = (tag: 'span' | 'h3' | 'p', cls: string, text: string): HTMLElement => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    e.textContent = text;
    return e;
  };
  card.append(add('span', 'bpEyebrow', 'BUILT'), pic, add('h3', '', w.title), add('span', 'bpLevel', w.level), add('p', 'bpGives', w.gives), add('span', 'bpTap', 'Tap to close'));
  pop.append(card);
  pop.addEventListener('click', () => pop.remove());
  document.body.append(pop);
  play('coinClaim');
}
