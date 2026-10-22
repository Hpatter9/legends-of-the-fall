// The starter pick (#starter): a brand-new save, and one after Start over, offers three packs of three heroes on a
// full-screen page; the player taps a pack, then confirms it, and its heroes become the unlocked heroes and the party.
// The packs come from the save (`meta.starter`, drawn from its seed in `sim/starter.ts`); this only shows them and
// calls the sim's `pickStarter`. Nothing on it moves or flashes.

import { UNITS } from './sim/units';
import { pickStarter, saveMeta, type Meta } from './sim/meta';
import { CLASS_NAMES, CLASS_OF } from './sim/starter';
import { portrait } from './render/sheets';

const CSS = `
#starter { position: fixed; inset: 0; z-index: 40; display: flex; flex-direction: column; align-items: center; gap: 10px; box-sizing: border-box; padding: 14px 14px 12px;
  background: radial-gradient(ellipse at 50% 0%, #4a2c1c, #1c1410 70%); color: #f3e6c8; overflow-y: auto; image-rendering: pixelated; }
#starter[hidden] { display: none; }
#starter h1 { margin: 6px 0 0; font: 900 17px var(--display); letter-spacing: 1px; text-align: center; color: var(--gold-hi, #ffe27a); text-shadow: 0 2px 0 #000; }
#starter .stSub { margin: 0; font: 400 11px/1.5 var(--body); text-align: center; color: #d8c8a8; max-width: 330px; }
#starter .stPacks { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 380px; flex: 1 1 auto; }
#starter .stPack { position: relative; display: flex; flex-direction: column; gap: 4px; box-sizing: border-box; padding: 2px 4px 4px; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent;
  border-style: solid; border-width: 6px; border-radius: 0; background: none; border-image: url(ui/card.png) 3 fill / 6px stretch; }
#starter .stPack:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
#starter .stPack.on { border-image-source: url(ui/card-r4.png); }
#starter .stHead { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin: 2px 2px 0; font: 700 12px var(--display); color: var(--gold-hi, #ffe27a); text-shadow: 0 2px 0 #000; }
#starter .stHead i { font-style: normal; font-size: 10px; color: #8a7c6c; }
#starter .stPack.on .stHead i { color: #7cf07c; }
#starter .stHero { display: flex; align-items: center; gap: 8px; min-width: 0; }
#starter .stHero canvas { flex: none; width: 52px; height: 52px; background: radial-gradient(#6b4a2c, #1c1008); border: 2px solid #1a0d07; image-rendering: pixelated; }
#starter .stHero div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
#starter .stHero b { font: 700 12px var(--display); color: #fff; text-shadow: 0 2px 0 #000; overflow-wrap: anywhere; }
#starter .stHero b em { margin-left: 6px; font: 400 9px var(--body); font-style: normal; letter-spacing: 0.5px; text-transform: uppercase; color: #ffd24a; white-space: nowrap; }
#starter .stHero span { font: 400 10px/1.35 var(--body); color: #d8c8a8; overflow-wrap: anywhere; }
#starter .stGo { width: 100%; max-width: 380px; flex: none; }
#starter .stNote { margin: 0; font: 400 9px/1.4 var(--body); text-align: center; color: #a89878; }
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
    head.append(el('span', '', `Pack ${i + 1}`), state);
    card.append(head);
    for (const kind of pack) {
      const def = UNITS[kind];
      const row = el('div', 'stHero');
      const text = el('div');
      const name = el('b', '', def.name);
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
