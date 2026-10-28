// "Use tome" on a hero's page: the hero's face, level badge and XP bar, and a button for each size of XP tome held. A tap reads
// one tome to the hero (`useTome`), and the bar fills; a new level plays the after-fight level-up (the "Level up!" stamp, the
// badge ticking over, the HP and attack gains, a sweep of light, a burst of sparks and the chime), once, nothing looping. A tome
// that would go past the level cap says so on its button first ("1,000 XP lost at the cap"). The rules are in `src/sim/tomes.ts`.

import { ULT_LEVEL } from './sim/abilities';
import { levelGain, progressOf, xpOf } from './sim/levels';
import { saveMeta, type Meta } from './sim/meta';
import { canUseTome, roomOf, TOME_SIZES, TOMES, tomeGain, tomesOf, tomeTotal, useTome, type TomeSize } from './sim/tomes';
import { UNITS } from './sim/units';
import { compactXp, levelBadge } from './levelBadge';
import { portrait } from './render/sheets';
import { play } from './render/sound';
import { TOME_ICON } from './tomeArt';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** The hero page's tome line: the tomes held by size, and a "Use tome" button that opens the sheet. Nothing when none is held. */
export function tomeControl(m: Meta, kind: string, after: () => void): HTMLElement | null {
  if (tomeTotal(m) <= 0) return null;
  const box = el('div', 'tomeLine');
  const held = el('span', 'tomeHeld');
  for (const size of TOME_SIZES) {
    const n = tomesOf(m, size);
    if (!n) continue;
    const chip = el('span', `tomeChip ${size}`);
    const img = el('img');
    img.src = TOME_ICON[size];
    img.alt = '';
    chip.append(img, `×${n}`);
    chip.title = `${TOMES[size].name}: ${n}`;
    held.append(chip);
  }
  const use = el('button', 'tomeUse', 'Use tome');
  use.type = 'button';
  use.disabled = roomOf(m, kind) <= 0;
  use.setAttribute('aria-label', roomOf(m, kind) <= 0 ? 'Use tome: this hero is at the level cap' : `Use an XP tome on ${UNITS[kind].name}`);
  use.addEventListener('click', () => openTomeSheet(m, kind, after));
  box.append(held, use);
  return box;
}

/** The tome sheet over the page. `after` runs when it is closed (the page redraws with the new level). */
export function openTomeSheet(m: Meta, kind: string, after: () => void): void {
  document.getElementById('tomeSheet')?.remove();
  const root = el('div', 'tomeSheet');
  root.id = 'tomeSheet';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', `Use an XP tome on ${UNITS[kind].name}`);
  const card = el('div', 'tomeCard');
  const title = el('h3', '', 'Use an XP tome');
  // (the hero's row, in the after-fight XP row's shape)
  const row = el('div', 'tomeRow');
  const face = el('div', 'tomeFace');
  let badge = levelBadge(progressOf(xpOf(m, kind)).level, 'tomeLv');
  face.append(portrait(UNITS[kind].sheet, 64), badge);
  const name = el('span', 'tomeName', UNITS[kind].name);
  const gainLine = el('em', 'tomeGain');
  const bar = el('i', 'tomeBar');
  const fill = el('span');
  bar.append(fill);
  const words = el('small', 'tomeXp');
  const note = el('p', 'tomeNote');
  row.append(face, name, gainLine, bar, words, note);
  const share = (xp: number) => {
    const p = progressOf(xp);
    return p.need ? (p.into / p.need) * 100 : 100;
  };
  const xpWords = () => {
    const p = progressOf(xpOf(m, kind));
    words.textContent = p.need ? `${compactXp(p.into)} / ${compactXp(p.need)} XP to level ${p.level + 1}` : 'At the level cap';
  };
  fill.style.width = `${share(xpOf(m, kind))}%`;
  xpWords();
  const buttons = el('div', 'tomeButtons');
  const close = el('button', 'tomeClose', 'Done');
  close.type = 'button';
  const timers: number[] = [];
  const drawButtons = () => {
    buttons.replaceChildren(
      ...TOME_SIZES.map((size) => {
        const b = el('button', `tomeBtn ${size}`);
        b.type = 'button';
        const img = el('img');
        img.src = TOME_ICON[size];
        img.alt = '';
        const { gain, lost } = tomeGain(m, kind, size);
        const text = el('span');
        text.append(el('span', 'tomeBtnName', `${size[0].toUpperCase()}${size.slice(1)} tome`), el('small', '', lost > 0 && gain > 0 ? `+${compactXp(gain)} XP, ${compactXp(lost)} lost at the cap` : `+${compactXp(TOMES[size].xp)} XP`));
        b.append(img, text, el('span', 'tomeHave', `×${tomesOf(m, size)}`));
        b.disabled = !canUseTome(m, kind, size);
        b.addEventListener('click', () => read(size));
        return b;
      }),
    );
  };
  const read = (size: TomeSize) => {
    const used = useTome(m, kind, size);
    if (!used) return;
    saveMeta(m);
    timers.forEach(clearTimeout);
    timers.length = 0;
    row.classList.remove('up');
    row.querySelectorAll('.xpStamp, .xpSparks, .xpWash').forEach((x) => x.remove());
    note.replaceChildren();
    gainLine.textContent = `+${used.gain.toLocaleString('en-GB')} XP${used.lost ? ` (${used.lost.toLocaleString('en-GB')} lost at the cap)` : ''}`;
    play('summon');
    drawButtons();
    xpWords();
    const after = share(used.before + used.gain);
    if (!used.up) {
      fill.style.transition = '';
      fill.style.width = `${after}%`;
      return;
    }
    // (a level-up: the bar fills to the end, then the stamp, the badge and the gains, as after a fight)
    fill.style.transition = '';
    fill.style.width = '100%';
    const up = used.up;
    timers.push(
      window.setTimeout(() => {
        const gained = levelGain(up.from, up.to);
        const stamp = el('span', 'xpStamp', up.to - up.from > 1 ? `+${up.to - up.from} levels!` : 'Level up!');
        const grown = levelBadge(up.to, 'tomeLv');
        badge.replaceWith(grown);
        badge = grown;
        note.replaceChildren(
          ...[`+${gained.hp}% HP`, `+${gained.atk}% Atk`, ...(up.from < ULT_LEVEL && up.to >= ULT_LEVEL ? ['Ultimate unlocked'] : [])].map((t, n) => {
            const c = el('span', '', t);
            c.style.animationDelay = `${0.25 + n * 0.15}s`;
            return c;
          }),
        );
        const sparks = el('span', 'xpSparks');
        for (let s = 0; s < 10; s++) {
          const dot = el('i');
          const ang = (s / 10) * Math.PI * 2;
          dot.style.setProperty('--dx', `${Math.round(Math.cos(ang) * (26 + (s % 3) * 8))}px`);
          dot.style.setProperty('--dy', `${Math.round(Math.sin(ang) * (20 + (s % 2) * 8)) - 10}px`);
          sparks.append(dot);
        }
        face.append(sparks);
        name.append(stamp);
        row.classList.add('up');
        row.append(el('span', 'xpWash'));
        fill.style.transition = 'none';
        fill.style.width = `${after}%`;
        play('levelUp');
      }, 700),
    );
  };
  drawButtons();
  const hint = el('p', 'tomeHint', 'A tome gives its XP to this hero. Tomes come from chests; a hero at the level cap cannot read one, and XP past the cap is lost.');
  card.append(title, row, buttons, hint, close);
  root.append(card);
  const shut = () => {
    timers.forEach(clearTimeout);
    root.remove();
    after();
  };
  close.addEventListener('click', shut);
  root.addEventListener('click', (e) => {
    if (e.target === root) shut();
  });
  document.body.append(root);
}
