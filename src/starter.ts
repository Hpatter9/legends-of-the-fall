// The starter pick (#starter): a brand-new save, and one after Start over, offers two packs of three heroes on a
// full-screen page; the player taps a pack, then confirms it, and its heroes become the unlocked heroes and the party.
// The packs come from the save (`meta.starter`, the fixed packs of `sim/starter.ts`); this only shows them, with the
// pack's name, line and chips, and the synergy it wakes, and calls the sim's `pickStarter`. Nothing on it moves or flashes.

import { UNITS } from './sim/units';
import { heroClassLabel } from './sim/heroNames';
import { pickStarter, saveMeta, type Meta } from './sim/meta';
import { CLASS_NAMES, CLASS_OF, packNamed } from './sim/starter';
import { countTraits } from './sim/traits';
import { portrait } from './render/sheets';
import { heroSays } from './quips';

const CSS = `
#starter { position: fixed; inset: 0; z-index: 40; display: flex; flex-direction: column; align-items: center; gap: 10px; box-sizing: border-box; padding: 14px 14px 12px;
  background: radial-gradient(ellipse at 50% 0%, var(--s6), var(--s2) 70%); color: var(--text); overflow-y: auto; image-rendering: pixelated; }
#starter[hidden] { display: none; }
#starter h1 { margin: 6px 0 0; font: 900 17px var(--display); letter-spacing: 1px; text-align: center; color: var(--gold-hi, var(--e8)); text-shadow: 0 2px 0 var(--black); }
#starter .stSub { margin: 0; font: 400 11px/1.5 var(--body); text-align: center; color: var(--s13); max-width: 330px; }
#starter .stPacks { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 380px; flex: 1 1 auto; }
#starter .stPack { position: relative; display: flex; flex-direction: column; gap: 4px; box-sizing: border-box; padding: 2px 4px 4px; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent;
  border-style: solid; border-width: 6px; border-radius: 0; background: none; border-image: url(ui/card.png) 3 fill / 6px stretch; }
#starter .stPack:focus-visible { outline: 2px solid var(--white); outline-offset: 2px; }
#starter .stPack.on { border-image-source: url(ui/card-r4.png); }
#starter .stHead { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin: 2px 2px 0; font: 700 12px var(--display); color: var(--gold-hi, var(--e8)); text-shadow: 0 2px 0 var(--black); }
#starter .stHead i { font-style: normal; font-size: 10px; color: var(--s11); }
#starter .stPack.on .stHead i { color: var(--g5); }
#starter .stLine { margin: 0 2px; font: 400 10px/1.4 var(--body); color: var(--s13); }
#starter .stChips { display: flex; flex-wrap: wrap; gap: 4px; margin: 0 2px 2px; }
#starter .stChips span { padding: 1px 6px; border: 1px solid var(--s8); border-radius: 8px; font: 700 9px var(--body); letter-spacing: 0.5px; text-transform: uppercase; color: var(--e6); background: var(--s3); }
#starter .stChips span.syn { border-color: var(--g5); color: var(--g5); }
#starter .stHero { display: flex; align-items: center; gap: 8px; min-width: 0; }
#starter .stHero canvas { flex: none; width: 52px; height: 52px; background: radial-gradient(var(--s8), var(--s1)); border: 2px solid var(--s1); image-rendering: pixelated; }
#starter .stHero div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
#starter .stHero b { font: 700 12px var(--display); color: var(--white); text-shadow: 0 2px 0 var(--black); overflow-wrap: anywhere; }
#starter .stHero b em { margin-left: 6px; font: 400 9px var(--body); font-style: normal; letter-spacing: 0.5px; text-transform: uppercase; color: var(--e6); white-space: nowrap; }
#starter .stHero span { font: 400 10px/1.35 var(--body); color: var(--s13); overflow-wrap: anywhere; }
#starter .stGo { width: 100%; max-width: 380px; flex: none; }
#starter .stNote { margin: 0; font: 400 9px/1.4 var(--body); text-align: center; color: var(--e5); }
@media (max-height: 800px) { #starter { gap: 6px; padding-top: 10px; } #starter .stPacks { gap: 7px; } #starter .stHero canvas { width: 44px; height: 44px; } }
`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** Show the pick and wait for it: resolves once a pack is taken (the meta is changed and saved by then). */
export function chooseStarter(meta: Meta): Promise<void> {
  if (!document.getElementById('starterStyle')) {
    const st = el('style');
    st.id = 'starterStyle';
    st.textContent = CSS;
    document.head.append(st);
  }
  const packs = meta.starter?.packs ?? [];
  const root = el('div');
  root.id = 'starter';
  const go = el('button', 'primary stGo', 'Choose a pack');
  go.disabled = true;
  let chosen = -1;
  const list = el('div', 'stPacks');
  const cards = packs.map((pack, i) => {
    const card = el('div', 'stPack');
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    const state = el('i', '', 'tap to pick');
    const head = el('div', 'stHead');
    // (a fixed pack is named, with its line and chips; an old save's seeded pack is just numbered)
    const named = packNamed(pack);
    head.append(el('span', '', named?.name ?? `Pack ${i + 1}`), state);
    card.append(head);
    const chips = el('div', 'stChips');
    for (const c of named?.chips ?? []) chips.append(el('span', '', c));
    // (the synergies the three wake together, as the party screen counts them)
    for (const t of countTraits(pack).filter((x) => x.active)) {
      const chip = el('span', 'syn', t.trait.name);
      chip.title = `${t.trait.name}: ${t.trait.tiers[t.tier].text}`;
      chips.append(chip);
    }
    if (named) card.append(el('p', 'stLine', named.line));
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
    const take = () => {
      chosen = i;
      cards.forEach((c, n) => {
        c.classList.toggle('on', n === i);
        c.querySelector('.stHead i')!.textContent = n === i ? 'chosen' : 'tap to pick';
        c.setAttribute('aria-pressed', String(n === i));
      });
      go.disabled = false;
      go.textContent = 'Start with this pack';
      // (one of the pack says hello)
      heroSays(pack[Math.floor(Math.random() * pack.length)], 'hired', () => {
        const r = card.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + 24 };
      });
    };
    card.addEventListener('click', take);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        take();
      }
    });
    list.append(card);
    return card;
  });
  root.append(
    el('h1', '', 'Choose your first heroes'),
    el('p', 'stSub', 'Three heroes join you now. Pick the band you like the look of: more heroes come from the summoning hall.'),
    list,
    go,
    el('p', 'stNote', 'Every hero is as strong as any other. They only fight differently.'),
  );
  document.body.append(root);
  return new Promise((done) => {
    go.addEventListener('click', () => {
      if (chosen < 0 || !pickStarter(meta, chosen)) return;
      saveMeta(meta);
      root.remove();
      done();
    });
  });
}
