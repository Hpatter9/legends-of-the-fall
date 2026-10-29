// SUMMON-TAROT, phase A (a rough prototype for the owner's mock-ups, not the finished look): a shard from a summoning stone is
// shown as a tarot card (the hero's class sigil in its class colour, its name, "+1 shard" and its bar) rather than the hero's
// figure, and a hero that joins is revealed the first time with its own scene: the card turns, light breaks from it, the
// class aura rises and the hero steps out with its name and title. Page only: it reads the pull and the Meta, changes nothing.
//
// Art: the card frame is `ui/tarot-frame.png` (one PixelLab generation); the sigils, bursts, rings and auras are strips of the
// 5000 Pixel Effects pack packed into `art/tarot/arcana.png` (12 elements a row; glyph, burst, circle, aura, six 32px frames each).

import { ALL_HEROES, UNITS } from './sim/units';
import type { Meta, Pull } from './sim/meta';
import { RANK_SHARDS, rankOf } from './sim/meta';
import { traitsOf, TRAITS } from './sim/traits';
import { CLASS_OF, type StarterClass } from './sim/starter';
import { auraOf } from './render/auraStyles';
import { portrait } from './render/sheets';
import { play as playSfx } from './render/sound';
import arcanaUrl from './art/tarot/arcana.png';
import sanctumUrl from './art/hall/sanctum.png';
import swordIcon from './art/talent/sword.png';
import shieldIcon from './art/talent/shield.png';
import flameIcon from './art/talent/blast.png';
import targetIcon from './art/talent/target.png';
import haloIcon from './art/talent/halo.png';

/** The rows of the arcana atlas, by the Pixel Effects element. */
const ELEMENTS = ['light', 'earth', 'blood', 'wind', 'lightning', 'crystal', 'star', 'fire', 'dark', 'moon', 'forest', 'sand'] as const;
/** Which element's sigil each class trait wears (nearest in colour to its aura). */
const TRAIT_ELEMENT: Record<string, (typeof ELEMENTS)[number]> = {
  guardian: 'light', bulwark: 'earth', blade: 'blood', marksman: 'wind', gunner: 'lightning', caster: 'crystal', arcanist: 'star',
  support: 'light', beast: 'fire', assassin: 'dark', trickster: 'moon', warden: 'forest', vanguard: 'sand',
};
const PART = { glyph: 0, burst: 1, circle: 2, aura: 3 } as const;
const CLASS_ICON: Record<StarterClass, string> = { front: shieldIcon, striker: swordIcon, caster: flameIcon, shooter: targetIcon, support: haloIcon };

const roman = (n: number): string => {
  const R: [number, string][] = [[40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, r] of R) while (n >= v) { s += r; n -= v; }
  return s;
};
const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** The look of a hero's card: its class trait, colour, sigil row and arcana number. */
export function arcanaOf(kind: string): { trait: string; title: string; colour: string; row: number; numeral: string; icon: string } {
  const trait = traitsOf(kind)[1] ?? 'guardian';
  const origin = traitsOf(kind)[0];
  const row = ELEMENTS.indexOf(TRAIT_ELEMENT[trait] ?? 'light');
  const title = [origin && TRAITS[origin]?.name, TRAITS[trait]?.name].filter(Boolean).join(' · ');
  return { trait, title, colour: hex(auraOf(kind).colour), row, numeral: roman(ALL_HEROES.indexOf(kind) + 1), icon: CLASS_ICON[CLASS_OF[kind] ?? 'front'] };
}

/** An animated strip of the atlas (`part` of the element `row`), `px` css pixels square. */
function strip(row: number, part: keyof typeof PART, size: string, cls: string): HTMLElement {
  const s = el('i', `tarotStrip ${cls}`);
  // (in shares of the atlas, 24 frames across and 12 rows down, so a strip scales with its box)
  const c = PART[part] * 6;
  const pc = (col: number) => `${(col / 23) * 100}%`;
  s.style.cssText = `width:${size};height:${size};background-size:2400% 1200%;--sx:${pc(c)};--ex:${pc(c + 6)};--lx:${pc(c + 3)};background-position-y:${(row / 11) * 100}%`;
  return s;
}

/** The face of a shard's tarot card: no figure, the class sigil (and, in the `shadow` variant, the hero's silhouette behind it). */
export function tarotFace(kind: string, px: number, variant: 'sigil' | 'shadow' = 'sigil'): HTMLElement {
  const a = arcanaOf(kind);
  const card = el('div', `tarotCard ${variant}`);
  card.style.setProperty('--cls', a.colour);
  card.append(el('span', 'tarotNum', a.numeral));
  const heart = el('div', 'tarotHeart');
  if (variant === 'shadow') {
    const sil = portrait(UNITS[kind].sheet, Math.round(px * 0.9));
    sil.className = 'tarotShadow';
    heart.append(sil);
  }
  heart.append(strip(a.row, 'glyph', '72cqw', 'glyph'));
  const icon = el('img', 'tarotIcon');
  icon.src = a.icon;
  icon.alt = '';
  heart.append(icon);
  card.append(heart, el('span', 'tarotTrait', TRAITS[a.trait]?.name ?? ''));
  return card;
}

/** The back of every card before it turns. */
export function tarotBack(): HTMLElement {
  const card = el('div', 'tarotCard back');
  card.style.setProperty('--cls', '#e9c46a');
  const heart = el('div', 'tarotHeart');
  heart.append(strip(0, 'glyph', '72cqw', 'glyph'), el('b', 'tarotQ', '?'));
  card.append(heart);
  return card;
}

/** A shard's whole result: the card and, under it, the name, the shard and its bar. */
export function shardResult(m: Meta, p: Pull, px: number, variant: 'sigil' | 'shadow' = 'sigil'): HTMLElement {
  const def = UNITS[p.kind];
  const box = el('div', 'tarotResult');
  box.append(tarotFace(p.kind, px, variant));
  box.append(el('b', 'tarotName', def.name));
  const n = p.unlock ?? p.shards;
  box.append(el('em', 'tarotGain', p.crowns ? `+${p.crowns} crowns` : `+${n} shard${n === 1 ? '' : 's'}`));
  const bar = el('span', 'tarotBar');
  const fill = el('i');
  let part = 1;
  let label = '';
  if (p.unlock && p.need) {
    part = p.have! / p.need;
    label = `${p.have}/${p.need} to join`;
  } else {
    const rank = rankOf(m, p.kind);
    const got = m.shards[p.kind] ?? 0;
    const from = rank ? RANK_SHARDS[rank - 1] : 0;
    const to = RANK_SHARDS[rank];
    part = to ? (got - from) / (to - from) : 1;
    label = to ? `rank ${rank + 1}: ${got}/${to}` : 'rank full';
    box.classList.add('rankShard');
  }
  fill.style.width = `${Math.max(0, Math.min(1, part)) * 100}%`;
  bar.append(fill);
  box.append(bar, el('small', 'tarotBarLabel', label));
  return box;
}

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The first-time reveal of a hero who joins: a full-screen scene, a tap skips to its end and a tap at the end closes it.
 *  `hold` (for the mock-up shots) stops the scene at a stage instead of running on. */
export function firstReveal(p: Pull, hold?: 1 | 2 | 3 | 4): Promise<void> {
  const def = UNITS[p.kind];
  const a = arcanaOf(p.kind);
  const reduced = reducedMotion();
  const root = el('div', `tarotReveal${reduced ? ' calm' : ''}`);
  root.style.setProperty('--cls', a.colour);
  root.style.background = `linear-gradient(#030a07e6, #030a07f2), url("${sanctumUrl}") center / cover`;
  const rays = el('div', 'trRays');
  const stage = el('div', 'trStage');
  const card = el('div', 'trCard');
  card.append(tarotFace(p.kind, 210));
  const burst = strip(a.row, 'burst', '240px', 'trBurst once');
  const ring = strip(a.row, 'circle', '200px', 'trRing');
  const halo = strip(a.row, 'glyph', '210px', 'trHalo');
  const fig = portrait(def.sheet, 250);
  fig.className = 'trFigure';
  const plate = el('div', 'trPlate');
  plate.append(
    el('small', 'trKicker', p.lucky ? 'A lucky summon' : 'A new ally answers'),
    el('h3', '', def.name),
    el('span', 'trTitle', `${a.numeral} · ${a.title}`),
    el('p', 'trRole', def.role),
    el('span', 'trJoin', 'Joins your company'),
  );
  const lead = el('p', 'trLead', p.lucky ? 'The stone burns gold…' : 'The shards are whole…');
  const hint = el('small', 'trHint', 'Tap to skip');
  stage.append(halo, ring, fig, card, burst);
  root.append(rays, lead, stage, plate, hint);
  document.body.append(root);
  const set = (n: number) => {
    root.dataset.stage = `${n}`;
    if (n === 4) hint.textContent = 'Tap to continue';
  };
  const times = reduced ? [0, 900, 900, 1500] : [0, 1000, 1700, 2900];
  const timers: number[] = [];
  set(1);
  if (!hold || hold > 1)
    times.slice(1).forEach((t, i) => {
      if (hold && i + 2 > hold) return;
      timers.push(window.setTimeout(() => {
        set(i + 2);
        if (i + 2 === 2) playSfx('stingSummon');
      }, t));
    });
  return new Promise((done) => {
    root.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (root.dataset.stage !== '4') {
        timers.forEach((t) => window.clearTimeout(t));
        root.classList.add('skipped');
        set(4);
        return;
      }
      root.remove();
      done();
    });
  });
}

/** Play the reveals of every hero who joined in a batch, one after another. */
export async function revealJoins(got: readonly Pull[]): Promise<void> {
  for (const p of got) if (p.isNew) await firstReveal(p);
}

// The prototype's styles (the page's palette: brass, emerald, parchment).
const css = `
.tarotStrip { display: block; background-image: url("${arcanaUrl}"); background-repeat: no-repeat; image-rendering: pixelated; background-position-x: var(--sx); animation: tarotStrip 0.9s steps(6) infinite; }
.tarotStrip.once { animation: none; background-position-x: var(--sx); }
.tarotReveal[data-stage="2"] .tarotStrip.once { animation: tarotOnce 0.5s steps(4, jump-none) forwards; }
@keyframes tarotOnce { from { background-position-x: var(--sx); } to { background-position-x: var(--lx); } }
@keyframes tarotStrip { from { background-position-x: var(--sx); } to { background-position-x: var(--ex); } }
.tarotCard { position: relative; aspect-ratio: 2 / 3; width: 100%; background: radial-gradient(ellipse at 50% 46%, color-mix(in srgb, var(--cls) 34%, transparent), transparent 62%), linear-gradient(#10261d, #07140f); border-radius: 4px; overflow: hidden; container-type: inline-size; }
.tarotCard::after { content: ''; position: absolute; inset: 0; background: url(ui/tarot-frame.png) center / 100% 100% no-repeat; image-rendering: pixelated; pointer-events: none; }
.tarotCard .tarotNum { position: absolute; top: 13.5%; left: 0; right: 0; text-align: center; font: 900 9cqw/1 var(--display); color: #f1d38c; text-shadow: 0 1px 0 #000; z-index: 2; }
.tarotCard .tarotHeart { position: absolute; inset: 18% 10% 22%; display: grid; place-items: center; }
.tarotCard .tarotHeart > * { grid-area: 1 / 1; }
.tarotCard .glyph { filter: drop-shadow(0 0 4px var(--cls)); }
.tarotCard .tarotIcon { width: 30cqw; height: 30cqw; image-rendering: pixelated; filter: drop-shadow(0 0 3px var(--cls)) drop-shadow(0 1px 0 #000); }
.tarotCard .tarotShadow { width: 92cqw; height: auto; image-rendering: pixelated; filter: brightness(0) drop-shadow(0 0 3px var(--cls)); opacity: .75; }
.tarotCard.shadow .glyph { opacity: .55; }
.tarotCard.shadow .tarotIcon { width: 20cqw; height: 20cqw; align-self: end; margin-bottom: 6%; }
.tarotCard .tarotTrait { position: absolute; bottom: 12.5%; left: 12%; right: 12%; text-align: center; font: 700 8cqw/1 var(--display); color: #f1d38c; letter-spacing: .5px; text-transform: uppercase; z-index: 2; }
.tarotCard.back { background: radial-gradient(ellipse at 50% 46%, #2b6a4a, #0a1d15 65%); }
.tarotCard .tarotQ { font: 900 26cqw/1 var(--display); color: #ffe39a; text-shadow: 0 0 8px #e9c46a; }
.tarotResult { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 0; text-align: center; }
.tarotResult .tarotName { margin-top: 3px; color: #ffe4a4; font: 900 11px/1.1 var(--display); overflow-wrap: anywhere; min-height: 2.2em; display: flex; align-items: center; }
.tarotResult .tarotGain { color: #b8eac2; font: 700 11px var(--body); font-style: normal; }
.tarotResult .tarotBar { display: block; width: 92%; height: 5px; background: #06120d; border: 1px solid #6c7749; }
.tarotResult .tarotBar i { display: block; height: 100%; background: linear-gradient(#ceefab, #4f9e70); }
.tarotResult.rankShard .tarotBar i { background: linear-gradient(#ffe39a, #b8862f); }
.tarotResult .tarotBarLabel { color: #c9d4c4; font: 10px var(--body); }
#gacha #reveal.tarotSpread { display: grid !important; grid-template-columns: repeat(5, minmax(0, 1fr)) !important; gap: 12px 6px; padding: 4px 0 8px; }
#gacha #reveal.tarotSingle { display: flex !important; justify-content: center; padding: 4px 0 8px; }
#gacha #reveal.tarotSingle .tarotResult { width: 230px; }
#gacha #reveal.tarotSingle .tarotName { font-size: 20px; min-height: 0; margin-top: 8px; }
#gacha #reveal.tarotSingle .tarotGain { font-size: 16px; }
#gacha #reveal.tarotSingle .tarotBar { height: 7px; }
#gacha #reveal.tarotSingle .tarotBarLabel { font-size: 13px; }
#gacha #reveal .tarotResult.joined .tarotName { color: #fff2c4; }
#gacha #reveal .tarotResult.joined .tarotGain { color: #ffd76a; }
#gacha #reveal .tarotFig { width: 100%; aspect-ratio: 2 / 3; display: grid; place-items: end center; background: radial-gradient(ellipse at 50% 70%, color-mix(in srgb, var(--cls) 45%, transparent), transparent 65%), linear-gradient(#15382a, #08170f); border: 2px solid #e8c56c; border-radius: 4px; box-shadow: 0 0 10px #e8c56c88; }
#gacha #reveal .tarotFig canvas { width: 118%; image-rendering: pixelated; margin-bottom: 8%; }

.tarotReveal { position: fixed; inset: 0; z-index: 40; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; touch-action: none; background: #030a07; color: #ffe4a4; }
.tarotReveal .trRays { position: absolute; inset: -40%; background: repeating-conic-gradient(from 0deg at 50% 50%, color-mix(in srgb, var(--cls) 30%, transparent) 0deg 7deg, transparent 7deg 18deg); opacity: 0; transition: opacity .6s; mask-image: radial-gradient(circle at 50% 50%, #000 0 18%, transparent 46%); }
.tarotReveal .trLead { position: absolute; top: 9%; margin: 0; font: italic 700 18px var(--display); color: #e9d6a5; transition: opacity .4s; }
.tarotReveal .trStage { position: relative; width: 320px; height: 360px; display: grid; place-items: center; }
.tarotReveal .trStage > * { position: absolute; }
.tarotReveal .trCard { width: 210px; perspective: 900px; transition: transform .7s ease-in, opacity .3s .5s; filter: drop-shadow(0 0 18px var(--cls)); animation: trFloat 2s ease-in-out infinite alternate; }
@keyframes trFloat { from { translate: 0 -4px; } to { translate: 0 4px; } }
.tarotReveal .trBurst { opacity: 0; pointer-events: none; filter: drop-shadow(0 0 12px var(--cls)); }
.tarotReveal .trRing { bottom: -30px; opacity: 0; transform: scaleY(.9); transition: opacity .5s; }
.tarotReveal .trHalo { top: 40px; opacity: 0; transition: opacity .8s; filter: drop-shadow(0 0 12px var(--cls)); }
.tarotReveal .trFigure { bottom: 52px; width: 250px; height: 250px; image-rendering: pixelated; opacity: 0; transform: translateY(40px); filter: brightness(4) drop-shadow(0 0 14px var(--cls)); transition: opacity .5s, transform .9s cubic-bezier(.2,.9,.3,1.2), filter 1.2s .3s; }
.tarotReveal .trPlate { position: relative; margin-top: 22px; text-align: center; opacity: 0; transform: scale(1.25); transition: opacity .35s, transform .45s cubic-bezier(.2,.9,.3,1.3); }
.tarotReveal .trPlate h3 { margin: 4px 0 2px; font: 900 32px/1.05 var(--display); color: #ffe7a6; text-shadow: 0 2px 0 #3a2410, 0 0 14px var(--cls); }
.tarotReveal .trKicker { display: inline-block; padding: 3px 12px; font: 900 12px var(--display); letter-spacing: 2px; text-transform: uppercase; color: #1d1205; background: linear-gradient(#ffe8a8, #d7a446); border: 1px solid #fff2c4; }
.tarotReveal .trTitle { display: block; font: 700 14px var(--body); color: var(--cls); text-shadow: 0 1px 0 #000; letter-spacing: 1px; }
.tarotReveal .trRole { margin: 6px 24px 0; font: 13px/1.3 var(--body); color: #c9d8c5; }
.tarotReveal .trJoin { display: block; margin-top: 8px; font: 700 13px var(--body); color: #b8eac2; }
.tarotReveal .trHint { position: absolute; bottom: calc(env(safe-area-inset-bottom) + 22px); color: #c9c09e; font: 12px var(--body); }
.tarotReveal[data-stage="2"] .trCard { transform: rotateY(90deg) scale(1.08); }
.tarotReveal[data-stage="2"] .trRays, .tarotReveal[data-stage="3"] .trRays, .tarotReveal[data-stage="4"] .trRays { opacity: 1; animation: trSpin 24s linear infinite; }
@keyframes trSpin { to { rotate: 360deg; } }
.tarotReveal[data-stage="2"] .trBurst { opacity: 1; }
.tarotReveal[data-stage="3"] .trBurst { opacity: 0; transition: opacity .5s; }
.tarotReveal[data-stage="3"] .trCard, .tarotReveal[data-stage="4"] .trCard { opacity: 0; transform: rotateY(90deg); transition: opacity .15s; }
.tarotReveal[data-stage="3"] .trRing, .tarotReveal[data-stage="4"] .trRing { opacity: 1; }
.tarotReveal[data-stage="3"] .trHalo { opacity: .7; }
.tarotReveal[data-stage="4"] .trHalo { opacity: .35; }
.tarotReveal[data-stage="3"] .trFigure { opacity: 1; transform: none; filter: brightness(1.6) drop-shadow(0 0 12px var(--cls)); }
.tarotReveal[data-stage="4"] .trFigure { opacity: 1; transform: none; filter: drop-shadow(0 0 8px var(--cls)) drop-shadow(0 3px 2px #000); }
.tarotReveal[data-stage="3"] .trLead, .tarotReveal[data-stage="4"] .trLead { opacity: 0; }
.tarotReveal[data-stage="4"] .trBurst { opacity: 0; transition: opacity .4s; }
.tarotReveal[data-stage="4"] .trPlate { opacity: 1; transform: none; }
.tarotReveal.calm *, .tarotReveal.skipped * { animation-duration: 0s !important; transition-duration: .35s !important; transition-delay: 0s !important; }
.tarotReveal.calm .trRays { display: none; }
`;
const style = document.createElement('style');
style.textContent = css;
document.head.append(style);

// (the mock-up shots reach the prototype here)
(window as unknown as { __tarot?: object }).__tarot = { firstReveal, tarotFace, shardResult };
