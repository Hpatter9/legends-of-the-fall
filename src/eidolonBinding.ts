// The binding at the Summoner (EIDOLON-CHAINS, batch 5, `docs/notes/eidolon-chains.md`): a short cinematic over the Sanctum, played from
// the chain's beats (`ChainDef.binding`, plain data, so the general shot layer can take them over): the chamber darkens, the pieces float
// up onto the altar, the bell is rung and a summoning circle catches fire, the Eidolon rises behind the altar in its painted figure, its
// name stamps in, it speaks its line, and the seal reads "Bound". A tap moves on to the next beat; the last waits for Continue.
// HORN-GIFT: Askel's binding goes on past the seal: the Summoner hands over the War Horn of the first kings (its painting rises over the
// altar, `horn`) and the hound breathes his fire into it (its full painting and glow, `hornFull`); the page's end card follows.
// Reduced motion: no rises or drifts, everything fades in and out held still. It changes nothing in the save: the page binds the
// chain (`bindChain`) once it has played (a replay from the Pact Gallery binds nothing).

import sanctumUrl from './art/hall/sanctum.png';
import { figureUrl } from './eidolonCall';
import { pieceSigil } from './eidolonChainView';
import { eidolonById } from './sim/eidolons';
import type { ChainDef } from './sim/eidolonChainData';
import { duck, play } from './render/sound';
import { settings } from './settings';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** The sound of each beat as it begins. */
const BEAT_SOUND = { pieces: 'holyChime', circle: 'riseSummon', rise: 'fireWhoosh', name: 'stingSummon', bound: 'setChime3', horn: 'horn', hornFull: 'fireWhoosh' } as const;

/** Play a chain's binding. Resolves when the player taps Continue on its last beat. */
export function playBinding(chain: ChainDef, replay = false): Promise<void> {
  const e = eidolonById(chain.eidolon);
  const beats = chain.binding ?? [];
  if (!e || !beats.length) return Promise.resolve();
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layer = el('div', `ebLayer el-${e.element}${reduced ? ' still' : ''}${settings().saver ? ' saver' : ''}`);
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-label', `The binding of ${e.name}`);
  const room = el('div', 'ebRoom');
  room.style.backgroundImage = `url("${sanctumUrl}")`;
  const circle = el('i', 'ebCircle');
  const glow = el('i', 'ebGlow');
  const fig = el('div', 'ebFig');
  const figArt = el('img', 'ebFigArt');
  figArt.alt = '';
  figArt.src = figureUrl(e.id);
  fig.append(figArt);
  const altar = el('div', 'ebAltar');
  chain.parts.forEach((p, i) => {
    const s = pieceSigil(p.piece, 'ebPiece');
    s.style.setProperty('--i', String(i));
    s.style.setProperty('--n', String(chain.parts.length));
    altar.append(s);
  });
  const embers = el('div', 'ebEmbers');
  for (let i = 0; i < (settings().saver ? 6 : 14); i++) {
    const m = el('i');
    m.style.setProperty('--x', `${(i * 37) % 100}%`);
    m.style.setProperty('--d', `${(i * 0.37) % 2.4}s`);
    embers.append(m);
  }
  const name = el('div', 'ebName');
  name.append(el('b', '', e.name), el('small', '', e.title));
  const say = el('div', 'ebSay');
  const sayWho = el('b', 'ebWho');
  const sayText = el('p', 'ebText');
  say.append(sayWho, sayText);
  const seal = el('div', 'ebSeal');
  seal.append(el('b', '', 'Bound'), el('small', '', replay ? `${e.name}, as the pact was made` : `${e.name} answers the War Horn`));
  // (HORN-GIFT: the War Horn's paintings, the empty one and the full one over it, shown on the `horn` and `hornFull` beats)
  const horn = el('div', 'ebHorn');
  for (const [state, cls] of [['empty', 'ebHornEmpty'], ['ready', 'ebHornReady']] as const) {
    const h = el('img', cls);
    h.alt = '';
    h.draggable = false;
    h.src = `eidolons/horn-${state}.webp`;
    horn.append(h);
  }
  if (!beats.some((b) => b.beat === 'horn')) horn.hidden = true;
  const go = el('button', 'primary ebGo', 'Continue');
  const bars = el('div', 'ebBars');
  bars.append(el('i'), el('i'));
  room.append(glow, circle, fig, altar, embers);
  layer.append(room, bars, name, horn, say, seal, go);
  document.body.append(layer);
  duck(true, 'binding');

  return new Promise<void>((resolve) => {
    let i = -1;
    let timer = 0;
    // (a tap moves on a beat: the clock is pushed forward so the beats after keep their spacing)
    let skew = 0;
    const t0 = performance.now();
    const show = (n: number) => {
      if (n <= i || n >= beats.length) return;
      i = n;
      const b = beats[n];
      layer.dataset.beat = b.beat;
      // (every beat up to this one stays shown: the classes build the picture up)
      for (const x of beats.slice(0, n + 1)) layer.classList.add(`b-${x.beat}`);
      // (Continue shows on the last beat: the seal's, or the horn's after it)
      layer.classList.toggle('end', n === beats.length - 1);
      if (b.text) {
        sayWho.textContent = b.who === 'summoner' ? 'The Summoner' : b.who === 'eidolon' ? e.name : '';
        say.classList.toggle('narrator', b.who === 'narrator');
        sayText.textContent = b.text;
        say.classList.remove('on');
        void say.offsetWidth;
        say.classList.add('on');
      }
      const cue = BEAT_SOUND[b.beat as keyof typeof BEAT_SOUND];
      if (cue) play(cue);
      clearTimeout(timer);
      const next = beats[n + 1];
      if (next) timer = window.setTimeout(() => show(n + 1), Math.max(0, next.at - (performance.now() - t0 + skew)));
    };
    layer.addEventListener('click', (ev) => {
      if (ev.target === go || performance.now() - t0 < 700) return;
      const next = beats[i + 1];
      if (!next) return;
      skew += next.at - (performance.now() - t0 + skew);
      show(i + 1);
    });
    go.addEventListener('click', () => {
      clearTimeout(timer);
      duck(false, 'binding');
      layer.classList.add('out');
      setTimeout(() => layer.remove(), 400);
      resolve();
    });
    // (the figure decodes before the beats begin, so it never rises as an empty box)
    void (figArt.decode?.() ?? Promise.resolve()).catch(() => undefined).then(() => show(0));
  });
}
