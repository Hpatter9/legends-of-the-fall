// Shard rewards use tarot cards. New allies get a chamber charge, an arrival impact and a full-art reveal,
// with the real battle sprite performing one attack in front before settling into idle.
// The existing seen-hero queue covers stone pulls, earned heroes and interrupted reveals.
// Atlas effects are from the credited Pixel Effects pack; reduced motion uses a calm fade.

import { ALL_HEROES, UNITS } from './sim/units';
import { RANK_SHARDS, rankOf, saveMeta, type Meta, type Pull } from './sim/meta';
import { heroSeen, markHeroSeen, unseenHeroes } from './sim/heroesSeen';
import { traitsOf, TRAITS } from './sim/traits';
import { CLASS_OF, type StarterClass } from './sim/starter';
import { auraOf } from './render/auraStyles';
import { portrait } from './render/sheets';
import { revealSprite } from './render/revealSprite';
import { heroArtwork } from './heroArtwork';
import { duck, hushSummon, play as playSfx } from './render/sound';
import { SKIP_GUARD_MS } from './render/summonRules';
import arcanaUrl from './art/tarot/arcana.png';
import sanctumUrl from './art/hall/sanctum.png';
import { summoner } from './summoner';
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

/** Reveal beats (ms): casting, flash and eye shield, hero arrival, then name and return to idle. */
export const BEATS = [0, 1400, 1900, 3100] as const;
/** With reduced motion: casting pose, then a calm fade to the hero and its name. */
export const CALM_BEATS = [0, 900, 900, 900] as const;

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

/** The look of a hero's card: its class trait, colour, sigil row, arcana number and class icon. */
export function arcanaOf(kind: string): { trait: string; title: string; colour: string; row: number; numeral: string; icon: string } {
  const trait = traitsOf(kind)[1] ?? 'guardian';
  const origin = traitsOf(kind)[0];
  const row = ELEMENTS.indexOf(TRAIT_ELEMENT[trait] ?? 'light');
  const title = [origin && TRAITS[origin]?.name, TRAITS[trait]?.name].filter(Boolean).join(' · ');
  return { trait, title, colour: hex(auraOf(kind).colour), row, numeral: roman(ALL_HEROES.indexOf(kind) + 1), icon: CLASS_ICON[CLASS_OF[kind] ?? 'front'] };
}

/** An animated strip of the atlas (`part` of the element `row`), `size` square. */
function strip(row: number, part: keyof typeof PART, size: string, cls: string): HTMLElement {
  const s = el('i', `tarotStrip ${cls}`);
  // (in shares of the atlas, 24 frames across and 12 rows down, so a strip scales with its box)
  const c = PART[part] * 6;
  const pc = (col: number) => `${(col / 23) * 100}%`;
  s.style.cssText = `width:${size};height:${size};background-size:2400% 1200%;--sx:${pc(c)};--ex:${pc(c + 6)};--lx:${pc(c + 3)};background-position-y:${(row / 11) * 100}%`;
  return s;
}

/** The face of a hero's tarot card: its silhouette behind its class sigil, never its figure. `px` is about the card's width. */
export function tarotFace(kind: string, px: number): HTMLElement {
  const a = arcanaOf(kind);
  const card = el('div', 'tarotCard');
  card.style.setProperty('--cls', a.colour);
  card.append(el('span', 'tarotNum', a.numeral));
  const heart = el('div', 'tarotHeart');
  const sil = portrait(UNITS[kind].sheet, Math.max(48, Math.round(px * 0.9)));
  sil.className = 'tarotShadow';
  heart.append(sil, strip(a.row, 'glyph', '72cqw', 'glyph'));
  const icon = el('img', 'tarotIcon');
  icon.src = a.icon;
  icon.alt = '';
  heart.append(icon);
  card.append(heart, el('span', 'tarotTrait', TRAITS[a.trait]?.name ?? ''));
  return card;
}

/** The back every card shows before it turns. */
export function tarotBack(): HTMLElement {
  const card = el('div', 'tarotCard back');
  card.style.setProperty('--cls', '#e9c46a');
  const heart = el('div', 'tarotHeart');
  heart.append(strip(0, 'glyph', '72cqw', 'glyph'), el('b', 'tarotQ', '?'));
  card.append(heart);
  return card;
}

/** A hero's card once its figure has been revealed (a join, after its scene). */
export function heroCard(kind: string, px: number): HTMLElement {
  const fig = el('div', 'tarotFig');
  fig.style.setProperty('--cls', arcanaOf(kind).colour);
  fig.append(portrait(UNITS[kind].sheet, Math.max(64, Math.round(px * 1.2))));
  return fig;
}

/** What a pull's card says under it: the name, what it gave, and its bar (green to join, gold to the next rank). */
export function pullInfo(m: Meta, p: Pull): HTMLElement {
  const info = el('div', 'tarotInfo');
  info.append(el('b', 'tarotName', UNITS[p.kind].name));
  const n = p.unlock ?? p.shards;
  const gain = p.isNew ? (p.lucky ? 'Lucky! Joined at once' : 'Joined your company') : p.crowns ? `+${p.crowns} crowns` : `${p.lucky ? 'Lucky! ' : ''}+${n} shard${n === 1 ? '' : 's'}`;
  info.append(el('em', 'tarotGain', gain));
  if (p.isNew) return info;
  const bar = el('span', 'tarotBar');
  const fill = el('i');
  let part: number;
  let label: string;
  if (p.unlock && p.need) {
    part = p.have! / p.need;
    label = `${p.have}/${p.need} to join`;
    bar.setAttribute('aria-label', `${UNITS[p.kind].name} recruitment`);
  } else {
    // (a hero owned: its shards towards the next rank, as they stand now)
    const rank = rankOf(m, p.kind);
    const got = m.shards[p.kind] ?? 0;
    const from = rank ? RANK_SHARDS[rank - 1] : 0;
    const to = RANK_SHARDS[rank];
    part = to ? (got - from) / (to - from) : 1;
    label = to ? `rank ${rank + 1}: ${got}/${to}` : 'top rank';
    info.classList.add('rankShard');
  }
  fill.style.width = `${Math.max(0, Math.min(1, part)) * 100}%`;
  bar.append(fill);
  info.append(bar, el('small', 'tarotBarLabel', label));
  return info;
}

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The first-time reveal of a hero: a full-screen scene over everything but a cinematic. A tap (after the first moments, so a
 *  double tap cannot pass it) goes to the hero in full view with its name; a tap then closes it, and the hero is marked seen.
 *  `hold` (the screenshot tools) stops the scene at a beat. */
export function firstReveal(meta: Meta, kind: string, opts: { lucky?: boolean; hold?: 1 | 2 | 3 | 4 } = {}): Promise<void> {
  const def = UNITS[kind];
  const a = arcanaOf(kind);
  const reduced = reducedMotion();
  const root = el('div', `tarotReveal${reduced ? ' calm' : ''}`);
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', `${def.name} joins your company`);
  root.style.setProperty('--cls', a.colour);
  root.style.background = `linear-gradient(#02080588, #02080566 46%, #020906ed 90%), url("${sanctumUrl}") center / cover`;
  const heading = el('div', 'trHeading', 'The summoning');
  const charge = el('div', 'trCharge');
  const beam = el('div', 'trBeam');
  const impact = el('div', 'trImpact');
  const rays = el('div', 'trRays');
  const stage = el('div', 'trStage');
  const actor = summoner();
  const flash = el('div', 'trFlash');
  const burst = strip(a.row, 'burst', '240px', 'trBurst once');
  const ring = strip(a.row, 'circle', '200px', 'trRing');
  const halo = strip(a.row, 'glyph', '210px', 'trHalo');
  const artwork = heroArtwork(kind, true);
  artwork.className = 'trArtwork';
  // The art decodes during the charge; the battle sprite remains available if the illustration cannot load.
  void artwork.decode().catch(() => { artwork.hidden = true; });
  const showcase = revealSprite(def.sheet, reduced);
  const sparks = el('div', 'trSparks');
  for (let i = 0; i < 18; i++) {
    const spark = el('i');
    spark.style.cssText = `--x:${8 + (i * 37) % 84}%;--y:${8 + (i * 23) % 75}%;--delay:${-(i % 7) * .4}s`;
    sparks.append(spark);
  }
  const plate = el('div', 'trPlate');
  plate.append(
    el('small', 'trKicker', opts.lucky ? 'A lucky summon' : 'A new ally answers'),
    el('h3', '', def.name),
    el('span', 'trTitle', `${a.numeral} · ${a.title}`),
    el('p', 'trRole', def.role),
    el('span', 'trJoin', 'Joins your company'),
  );
  const lead = el('p', 'trLead', opts.lucky ? 'The stone burns gold…' : 'The summoner calls an ally…');
  const hint = el('small', 'trHint', 'Tap to skip');
  stage.append(charge, beam, halo, artwork, ring, impact, showcase.canvas, burst, sparks);
  root.append(rays, actor, heading, lead, stage, plate, flash, hint);
  document.body.append(root);
  duck(true, 'reveal');
  let at = performance.now();
  const set = (n: number) => {
    root.dataset.stage = `${n}`;
    actor.dataset.pose = n === 1 ? 'cast' : n < 4 ? 'shield' : 'idle';
    if (n >= 3) showcase.start(n === 3);
    if (n === 4) {
      hint.textContent = 'Tap to continue';
      at = performance.now();
    }
  };
  const beats = reduced ? CALM_BEATS : BEATS;
  const timers: number[] = [];
  set(1);
  if (!reduced) playSfx('riseSummon');
  for (let n = 2; n <= 4; n++) {
    if (opts.hold && n > opts.hold) break;
    timers.push(window.setTimeout(() => {
      set(n);
      if (n === 2) playSfx('stingSummon');
      if (n === 3 && !reduced) playSfx('slam');
    }, beats[n - 1]));
  }
  return new Promise((done) => {
    root.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      // (the first moments of the scene, and of its last beat, let a tap go: a double tap cannot skip the hero)
      if (performance.now() - at < SKIP_GUARD_MS) return;
      if (root.dataset.stage !== '4') {
        timers.forEach((t) => window.clearTimeout(t));
        hushSummon();
        if (root.dataset.stage === '1') playSfx('stingSummon');
        root.classList.add('skipped');
        set(4);
        return;
      }
      timers.forEach((t) => window.clearTimeout(t));
      hushSummon();
      markHeroSeen(meta, kind);
      saveMeta(meta);
      duck(false, 'reveal');
      showcase.stop();
      root.remove();
      done();
    });
  });
}

// The reveals wait in one line, one after another; a hero already waiting (or seen) is not queued twice.
let line: Promise<void> = Promise.resolve();
const waiting = new Set<string>();
let playing = 0;

/** Queue a hero's first reveal. `force`: a pull's join plays whatever the list says (it has just joined). Resolves when it has played. */
export function queueReveal(meta: Meta, kind: string, opts: { lucky?: boolean; force?: boolean } = {}): Promise<void> {
  if (waiting.has(kind) || (!opts.force && heroSeen(meta, kind)) || !UNITS[kind]) return line;
  waiting.add(kind);
  line = line.then(async () => {
    playing++;
    try {
      if (opts.force || !heroSeen(meta, kind)) await firstReveal(meta, kind, { lucky: opts.lucky });
    } finally {
      playing--;
      waiting.delete(kind);
    }
  });
  return line;
}

/** Play the reveal of every hero owned and not yet seen (one that joined in play, or one whose reveal was missed). */
export function revealUnseen(meta: Meta): Promise<void> {
  for (const kind of unseenHeroes(meta)) void queueReveal(meta, kind);
  return line;
}

/** Whether a reveal is showing or waiting. */
export const revealing = (): boolean => playing > 0 || waiting.size > 0;

// The styles (the page's palette: brass, emerald, parchment).
const css = `
.tarotReveal .trFlash { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: radial-gradient(ellipse at 54% 52%, #fffef1, #fff4bbcc 25%, #ffeaa000 75%); }
.tarotReveal[data-stage="2"] .trFlash { animation: summonFlash .7s ease-out both; }
@keyframes summonFlash { 0% { opacity: 0; } 12% { opacity: .95; } 100% { opacity: 0; } }
.tarotReveal.calm .trFlash, .tarotReveal.skipped .trFlash { display: none; }
.tarotReveal .summonerActor { z-index: 1; }
.tarotReveal .trStage, .tarotReveal .trPlate { z-index: 2; }

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
.tarotCard .tarotIcon { image-rendering: pixelated; filter: drop-shadow(0 0 3px var(--cls)) drop-shadow(0 1px 0 #000); }
.tarotCard .tarotShadow { width: 92cqw; height: auto; image-rendering: pixelated; filter: brightness(0) drop-shadow(0 0 3px var(--cls)); opacity: .75; }
.tarotCard .glyph { opacity: .55; }
.tarotCard .tarotIcon { width: 20cqw; height: 20cqw; align-self: end; margin-bottom: 6%; }
.tarotCard.back .glyph { opacity: 1; }
.tarotCard .tarotTrait { position: absolute; bottom: 12.5%; left: 12%; right: 12%; text-align: center; font: 700 8cqw/1 var(--display); color: #f1d38c; letter-spacing: .5px; text-transform: uppercase; z-index: 2; }
.tarotCard.back { background: radial-gradient(ellipse at 50% 46%, #2b6a4a, #0a1d15 65%); }
.tarotCard .tarotQ { font: 900 26cqw/1 var(--display); color: #ffe39a; text-shadow: 0 0 8px #e9c46a; }
.tarotResult { display: flex; flex-direction: column; align-items: center; min-width: 0; text-align: center; }
.tarotTurn { position: relative; width: 100%; aspect-ratio: 2 / 3; perspective: 700px; cursor: pointer; }
.tarotTurn > .tarotSide { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; transition: transform .5s ease; }
.tarotTurn > .tarotSide.front { transform: rotateY(180deg); }
.tarotResult.up .tarotTurn > .tarotSide.back { transform: rotateY(-180deg); }
.tarotResult.up .tarotTurn > .tarotSide.front { transform: rotateY(0); }
.tarotTurn:focus-visible { outline: 2px solid #c1ffd1; outline-offset: 2px; }
.tarotInfo { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 100%; visibility: hidden; }
.tarotResult.up .tarotInfo { visibility: visible; }
.tarotInfo .tarotName { margin-top: 3px; color: #ffe4a4; font: 900 11px/1.1 var(--display); overflow-wrap: anywhere; min-height: 2.2em; display: flex; align-items: center; justify-content: center; }
.tarotInfo .tarotGain { color: #b8eac2; font: 700 11px var(--body); font-style: normal; }
.tarotInfo .tarotBar { display: block; width: 92%; height: 5px; background: #06120d; border: 1px solid #6c7749; }
.tarotInfo .tarotBar i { display: block; height: 100%; background: linear-gradient(#ceefab, #4f9e70); }
.tarotInfo.rankShard .tarotBar i { background: linear-gradient(#ffe39a, #b8862f); }
.tarotInfo .tarotBarLabel { color: #c9d4c4; font: 10px var(--body); }
.tarotResult.joined .tarotName { color: #fff2c4; }
.tarotResult.joined .tarotGain { color: #ffd76a; }
.tarotFig { position: relative; width: 100%; height: 100%; display: grid; place-items: end center; overflow: hidden; background: radial-gradient(ellipse at 50% 70%, color-mix(in srgb, var(--cls) 45%, transparent), transparent 65%), linear-gradient(#15382a, #08170f); border: 2px solid #e8c56c; border-radius: 4px; box-shadow: 0 0 10px #e8c56c88; }
.tarotFig canvas { width: 118%; image-rendering: pixelated; margin-bottom: 8%; }
#gacha #reveal.tarotSpread { display: grid !important; grid-template-columns: repeat(5, minmax(0, 1fr)) !important; gap: 12px 6px; padding: 4px 0 8px; }
#gacha #reveal.tarotSingle { display: flex !important; justify-content: center; padding: 4px 0 8px; }
#gacha #reveal.tarotSingle .tarotResult { width: min(230px, 62vw); }
#gacha #reveal.tarotSingle .tarotName { font-size: 20px; min-height: 0; margin-top: 8px; }
#gacha #reveal.tarotSingle .tarotGain { font-size: 16px; }
#gacha #reveal.tarotSingle .tarotBar { height: 7px; }
#gacha #reveal.tarotSingle .tarotBarLabel { font-size: 13px; }
@media (prefers-reduced-motion: reduce) {
  .tarotTurn > .tarotSide { transition: opacity .3s; transform: none !important; }
  .tarotTurn > .tarotSide.front { opacity: 0; }
  .tarotResult.up .tarotTurn > .tarotSide.front { opacity: 1; }
  .tarotResult.up .tarotTurn > .tarotSide.back { opacity: 0; }
}

/* The chamber charges before the full illustration and the real battle sprite arrive together. */
.tarotReveal { position: fixed; inset: 0; z-index: 44; display: flex; flex-direction: column; align-items: center; overflow: hidden; touch-action: none; background: #030a07; color: #ffe4a4; }
.tarotReveal::after { content: ''; position: absolute; inset: 0; box-shadow: inset 0 0 90px 24px #0008; pointer-events: none; }
.tarotReveal .trHeading { position: absolute; top: max(30px, 5%); z-index: 3; text-align: center; font: 700 12px var(--display); letter-spacing: 4px; text-transform: uppercase; color: #e6ca87; }
.tarotReveal .trHeading::after { content: ''; display: block; width: 110px; height: 1px; margin: 14px auto; background: linear-gradient(90deg, transparent, #edca77, transparent); }
.tarotReveal .trRays { position: absolute; inset: -40%; background: repeating-conic-gradient(from 7deg at 50% 45%, #fff1ac20 0deg 4deg, transparent 4deg 19deg); opacity: 0; transition: opacity .6s; mask-image: radial-gradient(ellipse at 50% 45%, #000, transparent 60%); }
.tarotReveal .trLead { position: absolute; top: 21%; z-index: 3; margin: 0; font: italic 700 18px var(--display); color: #e9d6a5; transition: opacity .3s; text-align: center; padding: 0 24px; }
.tarotReveal .trStage { position: absolute; top: 12%; bottom: 26%; width: min(100%, 440px); display: grid; place-items: center; }
.tarotReveal .trStage > * { position: absolute; pointer-events: none; }
.tarotReveal .trArtwork { top: 0; height: 94%; width: 86%; object-fit: contain; opacity: 0; transform: translateY(20px) scale(.93); filter: brightness(2); transition: opacity .5s, transform 1.1s cubic-bezier(.16,1,.3,1), filter 1s; mask-image: linear-gradient(#000 85%, transparent); }
.tarotReveal .trCharge { width: 220px; height: 220px; bottom: 8%; border-radius: 50%; background: radial-gradient(ellipse, #fff7d799, color-mix(in srgb, var(--cls) 45%, transparent) 35%, transparent 70%); animation: trGather 1.4s ease-in both; }
@keyframes trGather { from { transform: scale(.3); opacity: .15; } to { transform: scale(1.5); opacity: 1; } }
.tarotReveal .trBeam { width: 16%; inset-block: -5% 4%; background: linear-gradient(90deg, transparent, #fffbe8cc, transparent); filter: blur(6px); opacity: 0; transform-origin: 50% 100%; }
.tarotReveal .trImpact { width: 80%; height: 15%; bottom: -1%; border: 2px solid #ffe9b3; border-radius: 50%; opacity: 0; box-shadow: 0 0 22px #f5c66a80; }
.tarotReveal .trBurst { opacity: 0; bottom: 1%; pointer-events: none; filter: drop-shadow(0 0 12px var(--cls)); }
.tarotReveal .trRing { bottom: -5%; opacity: 0; transform: scaleY(.4) scaleX(1.4); transition: opacity .5s; }
.tarotReveal .trHalo { top: 20%; opacity: 0; transition: opacity .8s; filter: drop-shadow(0 0 25px var(--cls)); }
.tarotReveal .trFigure { bottom: 0; left: 50%; image-rendering: pixelated; opacity: 0; translate: -50% 0; transform: translateY(20px); filter: drop-shadow(0 0 7px var(--cls)) drop-shadow(0 5px 3px #000); transition: opacity .3s, transform .5s cubic-bezier(.2,.9,.3,1.2); z-index: 2; }
.tarotReveal .trSparks { inset: 0; opacity: 0; transition: opacity .5s; }
.tarotReveal .trSparks i { position: absolute; left: var(--x); top: var(--y); width: 2px; height: 5px; background: #ffe7a6; box-shadow: 0 0 6px #edc05c; border-radius: 50%; animation: trEmber 3.2s var(--delay) linear infinite; }
@keyframes trEmber { from { transform: translateY(35px); } to { transform: translateY(-35px); } }
.tarotReveal .trPlate { position: absolute; bottom: max(7%, calc(env(safe-area-inset-bottom) + 44px)); width: calc(100% - 32px); max-width: 400px; padding: 14px 10px; text-align: center; opacity: 0; transform: translateY(12px); transition: opacity .4s, transform .6s cubic-bezier(.16,1,.3,1); border: 0; border-top: 1px solid #d5b56c90; border-bottom: 1px solid #d5b56c60; background: linear-gradient(90deg, #05130fd9, #05130ff5 50%, #05130fd9); box-shadow: 0 8px 28px #0006; }
.tarotReveal .trPlate h3 { margin: 8px 0 5px; font: 900 clamp(25px, 8vw, 36px)/1.1 var(--display); color: #ffe7a6; text-wrap: balance; text-shadow: 0 2px 0 #3a2410, 0 0 18px #f1cc6750; }
.tarotReveal .trKicker { display: block; font: 700 10px var(--display); letter-spacing: 2px; text-transform: uppercase; color: #e9c578; }
.tarotReveal .trTitle { display: block; font: 700 12px var(--body); color: #b8cabe; letter-spacing: 1px; }
.tarotReveal .trRole { margin: 6px 8px 0; font: 13px/1.2 var(--body); color: #c9d8c5; }
.tarotReveal .trJoin { display: block; margin-top: 9px; font: italic 14px var(--display); color: #f2deb0; }
.tarotReveal .trHint { position: absolute; bottom: calc(env(safe-area-inset-bottom) + 20px); z-index: 3; color: #a7b4a8; font: 11px var(--body); letter-spacing: 2px; text-transform: uppercase; }
.tarotReveal[data-stage="2"] .trRays, .tarotReveal[data-stage="3"] .trRays, .tarotReveal[data-stage="4"] .trRays { opacity: 1; animation: trSpin 32s linear infinite; }
@keyframes trSpin { to { rotate: 360deg; } }
.tarotReveal[data-stage="2"] .trBeam { animation: trBeam .8s ease-out both; }
@keyframes trBeam { 0% { opacity: 0; transform: scaleX(.2); } 20% { opacity: 1; transform: scaleX(2); } 100% { opacity: 0; transform: scaleX(.4); } }
.tarotReveal[data-stage="2"] .trBurst { opacity: 1; }
.tarotReveal:not([data-stage="1"]) .trCharge { display: none; }
.tarotReveal:is([data-stage="3"], [data-stage="4"]) .trArtwork { opacity: 1; transform: none; filter: brightness(1); }
.tarotReveal[data-stage="3"] .trStage { animation: trLand .35s ease-out; }
@keyframes trLand { 0%, 100% { transform: translateY(0); } 22% { transform: translateY(4px); } 55% { transform: translateY(-2px); } }
.tarotReveal[data-stage="3"] .trImpact { animation: trShock .65s ease-out both; }
@keyframes trShock { from { opacity: .9; transform: scale(.3); } to { opacity: 0; transform: scale(1.6); } }
.tarotReveal:is([data-stage="3"], [data-stage="4"]) .trRing { opacity: .85; }
.tarotReveal:is([data-stage="3"], [data-stage="4"]) .trHalo { opacity: .35; }
.tarotReveal:is([data-stage="3"], [data-stage="4"]) .trFigure { opacity: 1; transform: none; }
.tarotReveal:is([data-stage="3"], [data-stage="4"]) .trSparks { opacity: .75; }
.tarotReveal:is([data-stage="3"], [data-stage="4"]) .trLead { opacity: 0; }
.tarotReveal:is([data-stage="3"], [data-stage="4"]) .trBurst { opacity: 0; transition: opacity .4s; }
.tarotReveal[data-stage="4"] .trPlate { opacity: 1; transform: none; }
.tarotReveal.calm *, .tarotReveal.skipped * { animation: none !important; transition-duration: .35s !important; transition-delay: 0s !important; }
.tarotReveal.calm :is(.trRays, .trBurst, .trCharge, .trBeam, .trImpact, .trSparks), .tarotReveal.skipped :is(.trCharge, .trBeam, .trImpact) { display: none; }
.tarotReveal.calm .trFigure, .tarotReveal.calm .trArtwork, .tarotReveal.calm .trPlate { transform: none !important; }

`;
const style = document.createElement('style');
style.textContent = css;
document.head.append(style);

// (the screenshot tools reach the reveal here, as they reach the hall by `__hall`)
(window as unknown as { __tarot?: object }).__tarot = { firstReveal, queueReveal, revealUnseen };
