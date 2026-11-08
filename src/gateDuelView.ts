// The Iron Gate's challenge card (phase 3, `docs/notes/assault-3.md`; its rules are `sim/assault/gateDuel.ts`). A standard ornate card over
// the assault, the battle held while it is open: the Vain captain who calls out, the heroes standing to pick the champion from, what winning,
// losing, the time and refusing each mean, and Refuse and Accept. It changes nothing itself: the page acts on the answer. It wears the run's
// duel card's look (`duelView.ts`'s classes, the commissioned duel crest), so the two challenges read as one.

import { face } from './nemesisView';
import { menuFoot, menuPick, menuSection, menuWell, ornateMenu, type OrnateMenu } from './ornateMenu';
import { portrait } from './render/sheets';
import { heroName } from './sim/heroNames';
import { rankWord, type NemSnap } from './sim/nemesis';
import { UNITS } from './sim/units';
import { DUEL_CREST } from './expansionArt';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** The card's words (pure, for the card and its test). */
export const GATE_DUEL_WORDS = {
  eyebrow: 'Single combat · The Iron Gate',
  ring: 'A ring of stakes before the Iron Gate, sixty seconds, the two alone in it: the battle goes on round them, and nobody outside may strike in. Your champion keeps its skills and ultimate.',
  win: 'He falls for good, his band at the gate breaks and runs, and every hero of yours heals a fifth.',
  lose: 'Your champion falls and rises at the rally flag, as any fallen hero does; he goes back to the gate.',
  time: 'He goes back to the gate, hurt as he was hurt in the ring.',
  refuse: 'No ring. He is Mocking for the rest of the battle: his blows land 5% harder.',
} as const;

/** Open the challenge's card. `answer` is told once: the champion's unit id (Accept), or null (Refuse, or the card closed). */
export function openGateDuelCard(s: NemSnap, heroes: readonly { id: number; kind: string }[], answer: (heroId: number | null) => void): OrnateMenu {
  const W = GATE_DUEL_WORDS;
  let told = false;
  const tell = (id: number | null) => {
    if (told) return;
    told = true;
    answer(id);
  };
  const name = `${s.name} ${s.epithet}`.trim();
  const menu = ornateMenu({ id: 'gateDuelCard', eyebrow: W.eyebrow, title: `${s.name} calls out a champion`, sub: 'Vain: he must be seen to win', label: `${name} calls out a champion at the Iron Gate.`, onClose: () => tell(null) });
  menu.card.classList.add('nmCard', 'dcCard');
  const crest = el('img', 'dcCrest');
  crest.src = DUEL_CREST;
  crest.alt = '';
  crest.setAttribute('aria-hidden', 'true');
  menu.body.append(crest);
  const top = menuWell(menu.body);
  top.classList.add('dcTop');
  const foe = el('div', 'dcSide');
  foe.append(face(s, 64), el('b', '', name), el('small', '', `${rankWord(s.rank)} · Might ${s.might}`));
  top.append(foe, el('span', 'dcVs', 'vs'));
  const champ = el('div', 'dcSide');
  champ.append(el('span', 'nmFace dcHero dcOpen', '?'), el('b', '', 'Your champion'), el('small', '', 'pick one below'));
  top.append(champ);
  menuWell(menu.body).append(el('p', 'nmMemory', W.ring));
  let picked: number | null = heroes[0]?.id ?? null;
  if (heroes.length) {
    const grid = menuSection(menu.body, 'Your champion', 'one hero, alone', 4);
    grid.classList.add('dcStrip');
    grid.style.setProperty('--n', String(heroes.length));
    const rows = menuPick(grid, heroes, heroes[0], (h) => ({ title: heroName(h.kind) }), (h) => (picked = h.id));
    rows.forEach((b, i) => {
      const sheet = UNITS[heroes[i].kind]?.sheet;
      if (!sheet) return;
      const chip = el('span', 'dcChip');
      chip.append(portrait(sheet, 32));
      b.prepend(chip);
      b.setAttribute('aria-label', `${heroName(heroes[i].kind)} as your champion`);
    });
  }
  const grid = menuSection(menu.body, 'What it means', 'win, lose, the time, or refuse', 2);
  const sec = grid.parentElement!;
  grid.remove();
  const well = menuWell(sec);
  for (const [k, text] of [['Win', W.win], ['Lose', W.lose], ['Time', W.time], ['Refuse', W.refuse]] as const) {
    const p = el('p', 'dcStake');
    p.append(el('b', '', k), el('small', '', text));
    well.append(p);
  }
  menuFoot(menu, {
    back: { word: 'Refuse', onClick: () => { tell(null); menu.close(); } },
    primary: { label: 'Accept', disabled: picked === null, onClick: () => { tell(picked); menu.close(); } },
  });
  return menu;
}
