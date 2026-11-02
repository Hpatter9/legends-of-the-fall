// The arrival of a hero earned by a deed (RECAP-REVEAL, `sim/heroArrival.ts`): no summoner and no chamber. The keep's overlook at
// dusk (the camp's own painting), the deed that earned the hero named at the top, then the hero walks in along the rampart, its
// painted art rises behind it as it plants its feet and strikes once, and the plate gives its name, title and "Joins your company".
// It keeps the summoning reveal's manners: the same skip guard, a tap to the end and a tap to close, the hero marked seen on the
// close, the music ducked while it shows, and with reduced motion a calm fade with no walk.

import { UNITS } from './sim/units';
import { heroTitle } from './sim/heroNames';
import { saveMeta, type Meta } from './sim/meta';
import { markHeroSeen } from './sim/heroesSeen';
import { traitsOf, TRAITS } from './sim/traits';
import { deedLine } from './sim/heroArrival';
import { auraOf } from './render/auraStyles';
import { revealSprite } from './render/revealSprite';
import { heroArtwork } from './heroArtwork';
import { titleLine } from './heroTitleView';
import { duck, play as playSfx } from './render/sound';
import { SKIP_GUARD_MS } from './render/summonRules';
import overlookUrl from './art/camp/overlook.png';
import { openScreen } from './screens';

/** The arrival's beats (ms): the deed and the road, the hero walking in, the hero arriving (its art, one strike), the plate. */
export const ARRIVAL_BEATS = [0, 600, 2300, 3100] as const;
/** With reduced motion: no walk, a calm fade to the hero and its name. */
export const CALM_ARRIVAL_BEATS = [0, 0, 700, 700] as const;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;
const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** An earned hero's first reveal, full screen. Resolves when it is closed (and the hero is marked seen). `hold` (the screenshot
 *  tools) stops the scene at a beat. */
export function earnedArrival(meta: Meta, kind: string, opts: { hold?: 1 | 2 | 3 | 4 } = {}): Promise<void> {
  const def = UNITS[kind];
  const reduced = reducedMotion();
  const colour = hex(auraOf(kind).colour);
  const [origin, trait] = traitsOf(kind);
  const title = [origin && TRAITS[origin]?.name, trait && TRAITS[trait]?.name].filter(Boolean).join(' · ');
  const root = el('div', `earnedArrival${reduced ? ' calm' : ''}`);
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', `${heroTitle(kind)} joins your company`);
  root.style.setProperty('--cls', colour);
  root.style.backgroundImage = `linear-gradient(#020805aa, #02080522 34%, #02080511 55%, #020906f0 92%), url("${overlookUrl}")`;
  const deed = el('div', 'eaDeed');
  deed.append(el('small', '', 'A deed done'), el('b', '', deedLine(kind) ?? 'Earned in the field'));
  const lead = el('p', 'eaLead', 'Word of the deed has reached the road…');
  const stage = el('div', 'eaStage');
  const light = el('div', 'eaLight');
  const artwork = heroArtwork(kind, true);
  artwork.className = 'eaArtwork';
  // (the art decodes while the hero walks; the battle sprite stays if the illustration cannot load)
  void artwork.decode().catch(() => { artwork.hidden = true; });
  const showcase = revealSprite(def.sheet, reduced, { walk: true });
  const walker = el('div', `eaWalker${showcase.facesRight ? '' : ' flip'}`);
  walker.append(showcase.canvas);
  const dust = el('div', 'eaDust');
  stage.append(light, artwork, dust, walker);
  const plate = el('div', 'eaPlate');
  // (the name with its title under it, and the calling, as the summoning's plate has them: BENCH-TITLES)
  plate.append(el('small', 'eaKicker', 'A new ally rides in'), titleLine(kind, 'h3', '', true), el('span', 'eaTitle', [def.name, title].filter(Boolean).join(' · ')), el('p', 'eaRole', def.role), el('span', 'eaJoin', 'Joins your company'));
  const hint = el('small', 'eaHint', 'Tap to skip');
  root.append(deed, lead, stage, plate, hint);
  // (CLOSE-SCREENS: a moment, laid over whatever is up; it is the player's to dismiss)
  const leave = openScreen('earned', () => undefined, { kind: 'moment' });
  document.body.append(root);
  duck(true, 'reveal');
  let at = performance.now();
  const set = (n: number) => {
    root.dataset.stage = `${n}`;
    if (n === 2) showcase.walk();
    if (n >= 3) showcase.start(n === 3);
    if (n === 4) {
      hint.textContent = 'Tap to continue';
      at = performance.now();
    }
  };
  const beats = reduced ? CALM_ARRIVAL_BEATS : ARRIVAL_BEATS;
  const timers: number[] = [];
  set(1);
  for (let n = 2; n <= 4; n++) {
    if (opts.hold && n > opts.hold) break;
    timers.push(window.setTimeout(() => {
      set(n);
      if (n === 2 && !reduced) playSfx('steps');
      if (n === 3) playSfx('eliteSting');
    }, beats[n - 1]));
  }
  return new Promise((done) => {
    root.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      // (the first moments of the scene, and of its last beat, let a tap go: a double tap cannot skip the hero)
      if (performance.now() - at < SKIP_GUARD_MS) return;
      if (root.dataset.stage !== '4') {
        timers.forEach((t) => window.clearTimeout(t));
        root.classList.add('skipped');
        set(4);
        return;
      }
      timers.forEach((t) => window.clearTimeout(t));
      markHeroSeen(meta, kind);
      saveMeta(meta);
      duck(false, 'reveal');
      showcase.stop();
      root.remove();
      leave();
      done();
    });
  });
}

// The styles (the page's palette: brass, emerald, parchment), the plate as the summoning's so the two read as one family.
const css = `
.earnedArrival { position: fixed; inset: 0; z-index: 44; display: flex; flex-direction: column; align-items: center; overflow: hidden; touch-action: none; color: #ffe4a4; background-color: #030a07; background-size: cover; background-position: 50% 100%; }
.earnedArrival::after { content: ''; position: absolute; inset: 0; box-shadow: inset 0 0 90px 24px #0008; pointer-events: none; }
.earnedArrival .eaDeed { position: absolute; top: calc(env(safe-area-inset-top) + max(26px, 4%)); z-index: 3; width: calc(100% - 32px); max-width: 400px; padding: 9px 12px; text-align: center; border-top: 1px solid #d5b56c90; border-bottom: 1px solid #d5b56c60; background: linear-gradient(90deg, #05130f00, #05130fd9 18%, #05130fd9 82%, #05130f00); animation: eaDrop .6s cubic-bezier(.16,1,.3,1) both; }
.earnedArrival .eaDeed small { display: block; font: 700 10px var(--display); letter-spacing: 3px; text-transform: uppercase; color: #e6ca87; }
.earnedArrival .eaDeed b { display: block; margin-top: 5px; font: 700 15px/1.25 var(--display); color: #fff0c4; text-wrap: balance; text-shadow: 0 1px 0 #000; }
.earnedArrival .eaDeed b::first-letter { text-transform: uppercase; }
@keyframes eaDrop { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
.earnedArrival .eaLead { position: absolute; top: 24%; z-index: 3; margin: 0; padding: 0 24px; text-align: center; font: italic 700 17px var(--display); color: #f0dfb4; text-shadow: 0 2px 6px #000; transition: opacity .4s; }
.earnedArrival .eaStage { position: absolute; top: 14%; bottom: 25%; width: min(100%, 440px); display: grid; place-items: center; }
.earnedArrival .eaStage > * { position: absolute; pointer-events: none; }
.earnedArrival .eaLight { width: 130%; height: 60%; bottom: -12%; border-radius: 50%; background: radial-gradient(ellipse, color-mix(in srgb, var(--cls) 40%, #ffe9b366), transparent 66%); opacity: 0; transition: opacity .8s; }
.earnedArrival .eaArtwork { top: 0; height: 94%; width: 86%; object-fit: contain; opacity: 0; transform: translateY(18px) scale(.95); transition: opacity .7s, transform 1.1s cubic-bezier(.16,1,.3,1); mask-image: linear-gradient(#000 85%, transparent); }
.earnedArrival .eaWalker { bottom: 0; left: 50%; translate: -50% 0; transform: translateX(-62vw); transition: transform 1.7s linear; z-index: 2; }
.earnedArrival .eaWalker.flip { scale: -1 1; }
.earnedArrival .eaWalker .trFigure { display: block; image-rendering: pixelated; filter: drop-shadow(0 0 7px var(--cls)) drop-shadow(0 5px 3px #000); }
.earnedArrival .eaDust { width: 200px; height: 26px; bottom: -6px; border-radius: 50%; background: radial-gradient(ellipse, #e8d3a088, transparent 70%); opacity: 0; }
.earnedArrival .eaPlate { position: absolute; bottom: max(7%, calc(env(safe-area-inset-bottom) + 44px)); z-index: 3; width: calc(100% - 32px); max-width: 400px; padding: 14px 10px; text-align: center; opacity: 0; transform: translateY(12px); transition: opacity .4s, transform .6s cubic-bezier(.16,1,.3,1); border-top: 1px solid #d5b56c90; border-bottom: 1px solid #d5b56c60; background: linear-gradient(90deg, #05130fd9, #05130ff5 50%, #05130fd9); box-shadow: 0 8px 28px #0006; }
.earnedArrival .eaPlate h3 { margin: 8px 0 5px; font: 900 clamp(25px, 8vw, 36px)/1.1 var(--display); color: #ffe7a6; text-wrap: balance; text-shadow: 0 2px 0 #3a2410, 0 0 18px #f1cc6750; }
.earnedArrival .eaKicker { display: block; font: 700 10px var(--display); letter-spacing: 2px; text-transform: uppercase; color: #e9c578; }
.earnedArrival .eaTitle { display: block; font: 700 12px var(--body); color: #b8cabe; letter-spacing: 1px; }
.earnedArrival .eaRole { margin: 6px 8px 0; font: 13px/1.2 var(--body); color: #c9d8c5; }
.earnedArrival .eaJoin { display: block; margin-top: 9px; font: italic 14px var(--display); color: #f2deb0; }
.earnedArrival .eaHint { position: absolute; bottom: calc(env(safe-area-inset-bottom) + 20px); z-index: 3; color: #c4cdc2; font: 11px var(--body); letter-spacing: 2px; text-transform: uppercase; text-shadow: 0 1px 3px #000; }
.earnedArrival:not([data-stage="1"]) .eaWalker { transform: none; }
.earnedArrival:is([data-stage="3"], [data-stage="4"]) .eaArtwork { opacity: 1; transform: none; }
.earnedArrival:is([data-stage="3"], [data-stage="4"]) .eaLight { opacity: .8; }
.earnedArrival:is([data-stage="3"], [data-stage="4"]) .eaLead { opacity: 0; }
.earnedArrival[data-stage="3"] .eaDust { animation: eaDust .7s ease-out both; }
@keyframes eaDust { from { opacity: .9; transform: scale(.4); } to { opacity: 0; transform: scale(1.5); } }
.earnedArrival[data-stage="4"] .eaPlate { opacity: 1; transform: none; }
.earnedArrival.calm *, .earnedArrival.skipped * { animation: none !important; transition-duration: .35s !important; transition-delay: 0s !important; }
.earnedArrival.calm .eaWalker, .earnedArrival.skipped .eaWalker { transform: none !important; transition: none !important; }
.earnedArrival.calm :is(.eaDust, .eaLead) { display: none; }
.earnedArrival.calm :is(.eaArtwork, .eaPlate) { transform: none !important; }
`;
const style = document.createElement('style');
style.textContent = css;
document.head.append(style);

// (the screenshot tools reach the arrival here, as they reach the summoning's by `__tarot`)
(window as unknown as { __earned?: object }).__earned = { earnedArrival };
