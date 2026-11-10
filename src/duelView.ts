// The Nemesis War, phase 4: the challenge's card (`docs/notes/nemesis-4.md`; its words are `duelRules.ts`, its rules `sim/duel.ts`). A
// standard ornate card over the deploy: who calls out whom and why, the nemesis's face, rank and Might, the champion (or, for an open
// challenge, a one-row strip of the squad to pick from), what winning, losing, the time and refusing each mean, and Refuse and Accept. It
// changes nothing itself: the page acts on the answer.
//
// Art: the commissioned duel banner as the crest above the two (expansionArt.ts), the sprites' portraits in the Council's frames.

import { face } from './nemesisView';
import { menuFoot, menuPick, menuSection, menuWell, ornateMenu, type OrnateMenu } from './ornateMenu';
import { championWords, clockWords, duelWords } from './duelRules';
import { portrait } from './render/sheets';
import { duelMs, type DuelOffer } from './sim/duel';
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

/** Open the challenge's card. `answer` is told once: the champion's roster id (Accept), or null (Refuse, or the card closed). */
export function openDuelCard(o: DuelOffer, s: NemSnap, squad: readonly { id: number; kind: string }[], answer: (heroId: number | null) => void): OrnateMenu {
  const w = duelWords(o, s);
  let told = false;
  const tell = (id: number | null) => {
    if (told) return;
    told = true;
    answer(id);
  };
  const menu = ornateMenu({ id: 'duelCard', eyebrow: 'Single combat · The Nemesis War', title: w.title, sub: w.why, label: `${w.title}. ${w.why}.`, onClose: () => tell(null) });
  menu.card.classList.add('nmCard', 'dcCard');
  // (the two: the nemesis on the left, the champion it names on the right)
  const crest = el('img', 'dcCrest');
  crest.src = DUEL_CREST;
  crest.alt = '';
  crest.setAttribute('aria-hidden', 'true');
  menu.body.append(crest);
  const top = menuWell(menu.body);
  top.classList.add('dcTop');
  const foe = el('div', 'dcSide');
  foe.append(face(s, 64), el('b', '', s.name), el('small', '', `${rankWord(s.rank)} · Might ${s.might}`));
  top.append(foe, el('span', 'dcVs', 'vs'));
  const champ = el('div', 'dcSide');
  if (o.kind) {
    const f = el('span', 'nmFace dcHero');
    const sheet = UNITS[o.kind]?.sheet;
    if (sheet) f.append(portrait(sheet, 64));
    champ.append(f, el('b', '', heroName(o.kind)), el('small', '', UNITS[o.kind]?.name ?? o.kind));
  } else champ.append(el('span', 'nmFace dcHero dcOpen', '?'), el('b', '', 'Your champion'), el('small', '', 'pick one below'));
  top.append(champ);
  menuWell(menu.body).append(el('p', 'nmMemory', `Alone in the ring of stones for ${clockWords(duelMs())}: its escorts stand back and the king’s spells are held. It fights at a fraction of its wave strength; your hero keeps its skills, ultimate and gear.`));
  // (an open challenge: the squad in a strip, its first picked to start)
  let picked = o.hero ?? squad[0]?.id ?? null;
  if (!o.kind && squad.length) {
    // (one row: the squad's faces and names side by side, as the design's strip)
    const grid = menuSection(menu.body, 'Your champion', 'one hero, alone', 4);
    grid.classList.add('dcStrip');
    grid.style.setProperty('--n', String(squad.length));
    const rows = menuPick(grid, squad, squad.find((h) => h.id === picked), (h) => ({ title: heroName(h.kind) }), (h) => (picked = h.id));
    rows.forEach((b, i) => {
      const sheet = UNITS[squad[i].kind]?.sheet;
      if (!sheet) return;
      const chip = el('span', 'dcChip');
      chip.append(portrait(sheet, 32));
      b.prepend(chip);
      b.setAttribute('aria-label', championWords(squad[i].kind));
    });
  }
  // (what each answer means)
  const grid = menuSection(menu.body, 'What it means', 'win, lose, the time, or refuse', 2);
  const sec = grid.parentElement!;
  grid.remove();
  const well = menuWell(sec);
  for (const [k, text] of [['Win', w.win], ['Lose', w.lose], ['Time', w.time], ['Refuse', w.refuse]] as const) {
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
