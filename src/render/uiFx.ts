// The page's own little effects, outside the board: a summoned card's burst of light, and the gold and crowns a result
// pays out rising off the result screen. Plain DOM and the Web Animations API, so they cost nothing while idle.

/** A card just summoned: it springs in, and a ring of light opens under it. */
export function summonBurst(card: HTMLElement): void {
  card.animate(
    [{ transform: 'scale(0.3)', opacity: 0, filter: 'brightness(3)' }, { transform: 'scale(1.12)', opacity: 1, filter: 'none', offset: 0.6 }, { transform: 'scale(1)' }],
    { duration: 520, easing: 'ease-out' },
  );
  const r = card.getBoundingClientRect();
  const ring = document.createElement('div');
  Object.assign(ring.style, {
    position: 'fixed',
    left: `${r.left + r.width / 2 - 20}px`,
    top: `${r.top + r.height / 2 - 20}px`,
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid #ffe27a',
    boxShadow: '0 0 14px #ffe27a',
    pointerEvents: 'none',
    zIndex: '5',
  });
  document.body.append(ring);
  ring.animate([{ transform: 'scale(0.5)', opacity: 1 }, { transform: 'scale(3)', opacity: 0 }], { duration: 600, easing: 'ease-out' }).onfinish = () => ring.remove();
}

/** A label that rises off `from` and fades; with `to`, it flies on to that element (the gold, to the top bar). */
export function flyUp(text: string, from: Element, to?: Element): void {
  const r = from.getBoundingClientRect();
  const el = document.createElement('div');
  el.textContent = text;
  Object.assign(el.style, {
    position: 'fixed',
    left: `${r.left + r.width / 2}px`,
    top: `${r.top}px`,
    font: 'bold 14px "Trebuchet MS", Verdana, sans-serif',
    color: '#ffe27a',
    textShadow: '0 1px 0 #1a1008, 0 0 8px rgba(255, 200, 80, 0.6)',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: '9',
  });
  document.body.append(el);
  const d = to?.getBoundingClientRect();
  const dx = d ? d.left + d.width / 2 - (r.left + r.width / 2) : 0;
  const dy = d ? d.top + d.height / 2 - r.top : -60;
  const lift = 'translate(-50%, -100%)';
  el.animate(
    [
      { transform: lift, opacity: 0 },
      { transform: lift, opacity: 1, offset: 0.2 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-100% + ${dy}px))`, opacity: 0 },
    ],
    { duration: 900, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' },
  ).onfinish = () => el.remove();
}
