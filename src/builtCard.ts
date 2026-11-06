// A finished build's popup (UI batch 1, in place of the castle cinematic): a small card naming the building and what it gives; a tap
// anywhere closes it. It is put up over whatever screen is showing and holds nothing up: no film, no waiting.
// A standard ornate menu (`ornateMenu.ts`, docs/notes/ui-standard.md; INT-386): "Built" over the title, the building's picture and what it
// gives in a slate well, Close in the footer.

import { builtWords } from './render/castleSpots';
import { lookPicture } from './castle';
import type { BuildSite } from './sim/castle';
import { play } from './render/sound';
import { menuFoot, menuWell, ornateMenu } from './ornateMenu';

/** Put the popup up for a build just finished (`level` is the building's new level). A second one waiting replaces the first. */
export function showBuilt(site: BuildSite, level: number): void {
  const w = builtWords(site, level);
  const menu = ornateMenu({ id: 'builtPop', eyebrow: 'Built', title: w.title, sub: w.level, label: `${w.title} ${w.level}` });
  const pic = document.createElement('img');
  pic.className = 'bpPic';
  pic.src = lookPicture(site, level);
  pic.alt = '';
  pic.draggable = false;
  const gives = document.createElement('p');
  gives.textContent = w.gives;
  const well = menuWell(menu.body);
  well.classList.add('bpWell');
  well.append(pic, gives);
  menuFoot(menu, { back: { word: 'close' } });
  // (a tap anywhere closes it, as before)
  menu.root.addEventListener('click', () => menu.close());
  play('coinClaim');
}
