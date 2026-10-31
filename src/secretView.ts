// The look of a secret hero (SECRET-HEROES, `sim/secretHeroes.ts`): one dark figure with a brass "?" for every one of them, so no list
// gives away a hero's shape, colours, class or name. Its picture is no hero's: the same frame for all ten.

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** The dark figure a secret hero shows in place of its picture (`size` in px for a fixed square; left out, it fills its box). */
export function secretFigure(size?: number, cls = ''): HTMLElement {
  const box = el('span', `secretFigure${cls ? ` ${cls}` : ''}`);
  box.setAttribute('role', 'img');
  box.setAttribute('aria-label', 'A secret hero');
  if (size) box.style.setProperty('--sf', `${size}px`);
  box.append(el('b', '', '?'));
  return box;
}
