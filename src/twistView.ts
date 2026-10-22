// How a floor's twist shows (`sim/twists.ts`): a small corner badge on a map node, its name and line for the node's info, and
// the banner over a fight's board. Curses read red, blessings green, mixed ones gold (`twists.css`). Icons are DawnLike tiles
// cut by `tools/twist-icons.py` and bundled into game.js, so it all plays offline.

import { TWISTS, type Tone } from './sim/twists';
import { playAll } from './render/sound';
import { twistCues } from './render/audioRules';
import fog from './art/twists/fog.png';
import holy from './art/twists/holy.png';
import lava from './art/twists/lava.png';
import gale from './art/twists/gale.png';
import bloodmoon from './art/twists/bloodmoon.png';
import narrow from './art/twists/narrow.png';
import treasure from './art/twists/treasure.png';
import haste from './art/twists/haste.png';
import frost from './art/twists/frost.png';
import mana from './art/twists/mana.png';
import cursed from './art/twists/cursed.png';
import ambush from './art/twists/ambush.png';
import glory from './art/twists/glory.png';
import fortified from './art/twists/fortified.png';

const ICONS: Record<string, string> = { fog, holy, lava, gale, bloodmoon, narrow, treasure, haste, frost, mana, cursed, ambush, glory, fortified };

export const TONE_NAMES: Record<Tone, string> = { curse: 'Curse', blessing: 'Blessing', mixed: 'Mixed' };

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** The twist's icon as a picture (a 16px tile, drawn crisp). */
function pic(id: string, cls: string): HTMLImageElement {
  const img = document.createElement('img');
  img.src = ICONS[id] ?? '';
  img.alt = '';
  img.draggable = false;
  img.className = cls;
  return img;
}

/** A map node's corner badge, or null when the twist is unknown (an id from a newer save). */
export function twistBadge(id: string | undefined): HTMLElement | null {
  const tw = id ? TWISTS[id] : undefined;
  if (!tw) return null;
  const b = el('i', `twBadge ${tw.tone}`);
  b.append(pic(tw.id, 'twIco'));
  b.title = `${tw.name}: ${tw.text}`;
  return b;
}

/** The line a node's info adds: "Twist · Fog: a thick mist...", or '' when there is none. */
export function twistLine(id: string | undefined): string {
  const tw = id ? TWISTS[id] : undefined;
  return tw ? ` ${TONE_NAMES[tw.tone]} twist, ${tw.name}: ${tw.text}` : '';
}

/** The reveal's sound: a dark tone for a curse, a bright one for a blessing (nothing for an id that is not known). */
export function playTwist(id: string | undefined): void {
  const tw = id ? TWISTS[id] : undefined;
  if (tw) playAll(twistCues(tw.tone));
}

/** The banner over a fight's board (`#twistBanner`): shown for a fight with a twist, hidden otherwise. */
export function showTwistBanner(id: string | undefined): void {
  const box = document.getElementById('twistBanner');
  if (!box) return;
  const tw = id ? TWISTS[id] : undefined;
  box.hidden = !tw;
  box.replaceChildren();
  if (!tw) return;
  box.className = tw.tone;
  playTwist(tw.id);
  const words = el('span');
  words.append(el('b', '', `${tw.name} · ${TONE_NAMES[tw.tone]}`), el('small', '', tw.text));
  box.append(pic(tw.id, 'twIco'), words);
}
