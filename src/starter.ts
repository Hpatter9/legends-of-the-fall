// The starter pick (#starter): a brand-new save, and one after Start over, offers two packs of three heroes on a
// full-screen page; the player taps a pack, then confirms it, and its heroes become the unlocked heroes and the party.
// The packs come from the save (`meta.starter`, the fixed packs of `sim/starter.ts`); this only shows them, with the
// pack's name, line and chips, and the synergy it wakes, and calls the sim's `pickStarter`. Nothing on it moves or flashes. It is the
// standard ornate menu (FIRST-FIVE).

import { UNITS } from './sim/units';
import { heroClassLabel } from './sim/heroNames';
import { pickStarter, saveMeta, type Meta } from './sim/meta';
import { CLASS_NAMES, CLASS_OF, packNamed } from './sim/starter';
import { countTraits } from './sim/traits';
import { portrait } from './render/sheets';
import { hideQuip } from './quipView';
import { menuChoice, menuFoot, menuNote, menuSection, ornateMenu } from './ornateMenu';
import backdropUrl from './art/release/starter-backdrop.webp';

const CSS = `
#starter.omVeil { background-color: #0b1513; background-position: center top; background-size: cover; background-repeat: no-repeat; }
#starter .om { max-height: 84%; }
#starter .stPacks { grid-template-columns: minmax(0, 1fr); gap: 8px; }
#starter .stPack { align-items: stretch; gap: 5px; padding: 9px 10px 10px; cursor: pointer; }
#starter .stPack > b { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: 17px; }
#starter .stPack > b i { font: 400 12px var(--body); font-style: normal; color: #b5ac97; }
#starter .stPack.on > b i { color: #9fe39a; }
#starter .stChips { display: flex; flex-wrap: wrap; gap: 4px; }
#starter .stChips span { padding: 1px 7px; border: 1px solid #6b5c40; border-radius: 8px; font: 700 10px var(--body); letter-spacing: 0.5px; text-transform: uppercase; color: #d8c08a; background: #1a1d15; }
#starter .stChips span.syn { border-color: #9fe39a99; color: #9fe39a; }
#starter .stHero { display: flex; align-items: center; gap: 9px; min-width: 0; }
#starter .stHero canvas { flex: none; width: 48px; height: 48px; border: 1px solid #6b5c40; border-radius: 3px; background: radial-gradient(#2b3024, #0d100b); image-rendering: pixelated; }
#starter .stHero div { display: flex; flex-direction: column; gap: 1px; min-width: 0; text-align: left; }
#starter .stHero b { font: 400 14px/1.2 var(--display); color: #f1ead9; overflow-wrap: anywhere; }
#starter .stHero b em { margin-left: 6px; font: 700 10px var(--body); font-style: normal; letter-spacing: 0.5px; text-transform: uppercase; color: var(--ornate-brass); white-space: nowrap; }
#starter .stHero span { font: 400 12px/1.3 var(--body); color: #c4ba9f; overflow-wrap: anywhere; }
#starter .omFoot .stGo { flex: 1; }
@media (max-height: 800px) { #starter .stPack { padding: 7px 9px 8px; gap: 4px; } #starter .stHero canvas { width: 40px; height: 40px; } }
`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** Show the pick and wait for it: resolves once a pack is taken (the meta is changed and saved by then). FIRST-FIVE (the release audit's
 *  finding 1): the first screen of the game is the standard ornate menu now, the sheet kind, over the gatehouse painted for it
 *  (RELEASE-ART, `docs/notes/release-audit-art-prompts.md` A1); each pack is one of its gilded choices. */
export function chooseStarter(meta: Meta): Promise<void> {
  if (!document.getElementById('starterStyle')) {
    const st = el('style');
    st.id = 'starterStyle';
    st.textContent = CSS;
    document.head.append(st);
  }
  const packs = meta.starter?.packs ?? [];
  const menu = ornateMenu({
    id: 'starter',
    kind: 'sheet',
    eyebrow: 'The Last Keep',
    title: 'Choose your first heroes',
    sub: 'Three heroes join you now. Pick the band you like the look of: more heroes come from the summoning hall.',
    label: 'Choose your first heroes',
  });
  // (the gatehouse looks out through its arch at the top; its quiet middle and floor lie under the sheet)
  menu.root.style.backgroundImage = `linear-gradient(#0b151300, #0b151366 60%, #0b1513aa), url(${backdropUrl})`;
  // (the pick has no way out but a pack: Escape, which closes any other standard menu, is kept from this one)
  const holdEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') e.stopPropagation();
  };
  window.addEventListener('keydown', holdEscape, true);
  let chosen = -1;
  const list = menuSection(menu.body, 'Two bands', 'tap one to choose it', 2);
  list.classList.add('stPacks');
  const { primary: go } = menuFoot(menu, { primary: { label: 'Choose a pack', disabled: true, onClick: () => undefined } });
  go!.classList.add('stGo');
  const cards = packs.map((pack, i) => {
    // (a fixed pack is named, with its line and chips; an old save's seeded pack is just numbered)
    const named = packNamed(pack);
    const card = menuChoice(list, { title: named?.name ?? `Pack ${i + 1}`, lines: named ? [named.line] : [] });
    card.classList.add('stPack');
    card.setAttribute('aria-pressed', 'false');
    const state = el('i', '', 'tap to pick');
    card.querySelector('b')!.append(state);
    const chips = el('div', 'stChips');
    for (const c of named?.chips ?? []) chips.append(el('span', '', c));
    // (the synergies the three wake together, as the party screen counts them)
    for (const t of countTraits(pack).filter((x) => x.active)) {
      const chip = el('span', 'syn', t.trait.name);
      chip.title = `${t.trait.name}: ${t.trait.tiers[t.tier].text}`;
      chips.append(chip);
    }
    if (chips.childElementCount) card.append(chips);
    for (const kind of pack) {
      const def = UNITS[kind];
      const row = el('div', 'stHero');
      const text = el('div');
      const name = el('b', '', heroClassLabel(kind));
      name.append(el('em', '', CLASS_NAMES[CLASS_OF[kind]]));
      text.append(name, el('span', '', def.role));
      row.append(portrait(def.sheet, 52), text);
      card.append(row);
    }
    card.addEventListener('click', () => {
      chosen = i;
      cards.forEach((c, n) => {
        c.classList.toggle('on', n === i);
        c.querySelector('b > i')!.textContent = n === i ? 'chosen' : 'tap to pick';
        c.setAttribute('aria-pressed', String(n === i));
      });
      go!.disabled = false;
      go!.textContent = 'Start with this pack';
      // (no hello bubble here: the director's rule, a bubble never lies over a hero's row on a list, and a pack is all hero rows)
    });
    return card;
  });
  menuNote(menu.body, 'Every hero is as strong as any other. They only fight differently.');
  return new Promise((done) => {
    go!.addEventListener('click', () => {
      if (chosen < 0 || !pickStarter(meta, chosen)) return;
      saveMeta(meta);
      window.removeEventListener('keydown', holdEscape, true);
      hideQuip();
      menu.close();
      done();
    });
  });
}
