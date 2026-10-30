// A hero's name and title as page elements (docs/notes/bench-titles.md): "Kwame, Shield of the Dawn" for the big places (the
// dossier, the summon reveal, the tarot card of a new hero, the codex, the end recap's MVP). The name and the title are spans of
// their own, so a place can set the title on a line under the name, smaller, while the text still reads "Name, Title".
import { HERO_NAMES, heroTitle } from './sim/heroNames';

/** A `tag` element holding the hero's name, then ", " and its title (just the unit's name for anything that is not a hero).
 *  `.htName`, `.htSep` and `.htEpithet` are the parts; `.htStack` on it puts the title on a line of its own, smaller. */
export function titleLine<K extends keyof HTMLElementTagNameMap>(kind: string, tag: K, cls = '', stack = false): HTMLElementTagNameMap[K] {
  const box = document.createElement(tag);
  box.className = `heroTitled${stack ? ' htStack' : ''}${cls ? ` ${cls}` : ''}`;
  const n = HERO_NAMES[kind];
  if (!n) {
    box.textContent = heroTitle(kind);
    return box;
  }
  const name = document.createElement('span');
  name.className = 'htName';
  name.textContent = n.name;
  const sep = document.createElement('span');
  sep.className = 'htSep';
  sep.textContent = ', ';
  const epithet = document.createElement('span');
  epithet.className = 'htEpithet';
  epithet.textContent = n.title;
  box.append(name, sep, epithet);
  box.setAttribute('aria-label', heroTitle(kind));
  return box;
}

// (stacked: the name on its line, the title under it at a little over half its size, in a softer gold; the comma is dropped
// from sight as the line break stands for it)
const style = document.createElement('style');
style.textContent = `
.heroTitled .htEpithet { font-style: italic; }
.heroTitled.htStack .htSep { display: none; }
.heroTitled.htStack .htEpithet { display: block; margin-top: 2px; font-size: .58em; line-height: 1.15; letter-spacing: .02em; opacity: .9; }
`;
document.head.append(style);
