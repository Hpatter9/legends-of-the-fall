// The royal arcane sanctum: a painted chamber with live ritual light and hero arrivals.
// Artwork and controls only; recruiting and saving remain in the gacha.

import { ALL_HEROES, UNITS } from './sim/units';
import { heroTitle } from './sim/heroNames';
import { stoneCost, stonesOf, type Meta, type Pull } from './sim/meta';
import { luckyLine, pityLine } from './gacha';
import { closest, haveOf, needOf } from './sim/unlock';
import { ICONS, icon } from './menuArt';
import { awakenedStep, heroRig } from './render/awakenRig';
import { drawAura, drawAuraGlow } from './render/auraCanvas';
import { auraParts, type AuraPart } from './render/auraStyles';
import { loadImage } from './render/loadImage';
import { onSettings, settings } from './settings';
import { beamKind, fanSpots, hallLayout, MIN_H, ROOM_W, type BeamKind, type HallLayout, type Timeline } from './render/hallSpots';
import { cardAt, dimAt, shakeAt, showcaseAt, skipAction, summonPlan, type ShowPlan } from './render/summonRules';
import { duck, hushSummon, play as playSfx } from './render/sound';
import sanctumUrl from './art/hall/sanctum.png';
import { summoner } from './summoner';
import lightPillarUrl from './art/hall/fx_light-pillar.png';

const ART: Record<string, string> = { sanctum: sanctumUrl, lightPillar: lightPillarUrl };
let art: Record<string, HTMLImageElement> | null = null;
async function loadArt(): Promise<Record<string, HTMLImageElement>> {
  if (art) return art;
  const got: Record<string, HTMLImageElement> = {};
  await Promise.all(Object.entries(ART).map(async ([k, url]) => (got[k] = await loadImage(url))));
  return (art = got);
}

const CSS = `
.hm-recruit, .hm-spells { padding: 0; overflow: hidden; }
.hlWrap { position: absolute; inset: 0; overflow: hidden; background: #140c1c; }
.hlRoom { position: absolute; top: 0; image-rendering: pixelated; }
.hlHead { position: absolute; top: 10px; left: 14px; right: 14px; text-align: center; }
.hlTitle { position: relative; margin: 0 8px; padding: 9px 3px; font: 900 clamp(16px, 4.5vw, 21px) var(--display); letter-spacing: 1px; color: #ffdf95; text-shadow: 0 2px #080e0d; background: linear-gradient(110deg, #10251e, #204b36 50%, #10251e); border: 2px solid #d3a34d; outline: 2px solid #21190e; box-shadow: inset 0 0 0 2px #614721, 0 4px 12px #000b; }
.hlTitle::before, .hlTitle::after { content: '◆'; position: absolute; top: 50%; transform: translateY(-50%); color: #ffdb86; font-size: 18px; text-shadow: 0 0 8px #d9a745; }
.hlTitle::before { left: -12px; } .hlTitle::after { right: -12px; }
.hlHead::before { content: '◆'; display: block; position: absolute; left: calc(50% - 9px); top: -12px; z-index: 1; color: #b1efc6; font-size: 19px; text-shadow: -2px 0 #b28a45, 2px 0 #b28a45, 0 -2px #b28a45, 0 2px #b28a45; }
.hlLedger { display: flex; align-items: center; justify-content: space-between; margin: 7px 16px 0; padding: 3px 8px; background: #0b1719eb; border: 1px solid #9a773d; box-shadow: 0 2px 5px #000a; }
.hlCount { color: #f4d993; font: 700 12px var(--body); }
.hlOdds { min-height: 32px; padding: 4px 6px; font: 700 12px var(--body); color: #e8e1cc; background: transparent; border: 0; box-shadow: none; }
.hlLow { position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 0 14px 12px; background: linear-gradient(transparent, #080e10cc 40%); pointer-events: none; }
.hlLow > * { pointer-events: auto; }
.hlScroll { position: relative; width: 100%; max-width: 390px; padding: 10px 12px; text-align: center; color: #ece6d4; background: linear-gradient(110deg, #0c171c, #15292b, #0b161b); border: 2px solid #b28a45; box-shadow: inset 0 0 0 2px #3d3323, 0 0 0 2px #16150f, 0 4px 8px #0009; }
.hlScroll::before { content: '◆'; position: absolute; top: -12px; left: calc(50% - 9px); color: #92edbd; text-shadow: -2px 0 #b28a45, 2px 0 #b28a45, 0 -2px #b28a45, 0 2px #b28a45; }
.hlScroll b { display: block; font: 900 17px var(--display); letter-spacing: 2px; color: #f4d993; }
.hlScroll .hlHint { display: block; margin: 3px 0 7px; font: 12px var(--body); color: #ccd6cf; }
.hlProgressLabel { display: flex; justify-content: space-between; gap: 8px; font: 700 12px var(--body); }
.hlProgress { height: 7px; margin: 5px 0; padding: 1px; background: #060e13; border: 1px solid #756a46; }
.hlProgress i { display: block; height: 100%; background: linear-gradient(#c1f3b4, #409b6c); box-shadow: 0 0 6px #77c99566; }
.hlScroll .odds { display: block; font: 10px/1.3 var(--body); color: #bfc9be; }
.hlShop { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; max-width: 390px; min-height: 40px; padding: 4px 8px; font: 400 12px var(--body); color: #ffe3a2; border: 1px solid #b28a45; border-radius: 3px; background: linear-gradient(#244e3a, #122b22); }
.hlShop:disabled { opacity: .5; }
.hlShopIco { width: 24px; height: 24px; image-rendering: pixelated; }
.hlScroll .odds.lucky { margin-top: 2px; font-size: 12px; color: #ffe3a2; }
.hlBar { display: flex; gap: 10px; width: 100%; max-width: 390px; }
.hlBar button { flex: 1; min-height: 59px; padding: 7px 3px; font: 900 17px var(--display); color: #ffe3a2; border: 2px solid #d0a452; border-radius: 3px; background: linear-gradient(135deg, #684b2b, #382a1d); box-shadow: inset 0 0 0 2px #846638, inset 0 0 0 4px #2e251c, 0 3px 0 #080e10; }
.hlBar button.primary { background: linear-gradient(135deg, #286846, #103e30); box-shadow: inset 0 0 0 2px #a38b43, inset 0 0 0 4px #173c2b, 0 3px 0 #080e10; }
.hlBar button:disabled { filter: saturate(0.35); color: #b5b6a6; opacity: 0.72; }
.hlBar button:not(:disabled):active { transform: translateY(2px); }
.hlBar button small { display: block; margin-top: 3px; font: 700 12px var(--body); }
.hlWrap button:focus-visible { outline: 3px solid #c2ffe0; outline-offset: 3px; }
.hlWrap.isCasting .hlHead, .hlWrap.isCasting .hlLow { visibility: hidden; }
@media (max-height: 800px) { .hlHead { top: 7px; } .hlTitle { padding: 6px 2px; } .hlLedger { margin-top: 5px; } .hlScroll { padding: 7px 10px; } .hlScroll .hlHint { margin: 2px 0 5px; } .hlLow { gap: 7px; padding-bottom: 8px; } .hlBar button { min-height: 54px; font-size: 15px; } }
.hlSkip { position: absolute; inset: 0; z-index: 6; display: none; touch-action: manipulation; }
.hlSkip.on { display: block; }
.hlOver { position: absolute; left: 14px; right: 14px; top: 26px; z-index: 5; display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: none; text-align: center; }
.hlRibbon { width: 100%; padding: 5px 0 6px; font: 700 24px var(--display); letter-spacing: 6px; text-indent: 6px; color: var(--btn-ink); text-shadow: 0 1px 0 rgb(var(--white-rgb) / 0.5); background: linear-gradient(var(--e9), var(--e6) 55%, var(--e3)); box-shadow: 0 -3px 0 var(--s3), 0 3px 0 var(--s3), 0 0 22px rgb(var(--e7-rgb) / 0.7); }
.hlBanner { padding: 2px 10px 3px; font: 700 13px var(--display); letter-spacing: 3px; text-indent: 3px; background: #174a35; border: 2px solid #d3a34d; color: #ffe3a2; box-shadow: 0 0 0 2px var(--g0), 0 0 14px rgb(var(--g5-rgb) / 0.7); }
.hlCard { padding: 4px 14px 5px; background: #0b211ced; border: 2px solid #b28a45; box-shadow: 0 0 0 2px var(--p4), 0 0 0 4px var(--s2); }
.hlCard b { display: block; font: 700 18px var(--display); color: var(--white); text-shadow: 0 1px 0 var(--black); }
.hlCard em { display: block; font: 400 11px var(--body); font-style: normal; color: var(--p5); }
.hlCard small { display: block; margin-top: 2px; font: 700 12px var(--body); color: var(--g5); }
#gacha:not([hidden]) ~ #version { display: none; }
#gacha { padding: calc(env(safe-area-inset-top) + 10px) 12px calc(env(safe-area-inset-bottom) + 8px); gap: 0; overflow: hidden; background: linear-gradient(#06110db3, #06110deb), url("${sanctumUrl}") center / cover; color: #e8e5d4; }
#gacha header { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 0 3px 12px; gap: 8px; border-bottom: 1px solid #aa8745; box-shadow: 0 2px 0 #070f0b; }
#gacha .summonHeading { min-width: 0; }
#gacha .summonHeading > small { font: 700 10px var(--body); letter-spacing: 2px; color: #bfa978; }
#gacha h2 { margin: 5px 0 0; padding: 0; border: none; box-shadow: none; background: none; color: #ffe0a1; font: 900 clamp(18px, 5vw, 23px)/1.2 var(--display); letter-spacing: .5px; }
#gacha #crowns { flex: none; padding: 7px 8px; background: #10231cd9; border: 1px solid #8b733e; color: #f4d69a; font: 700 12px var(--body); white-space: nowrap; }
#gacha .gachaBody { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 0 2px 12px; scrollbar-width: thin; scrollbar-color: #9a7c45 #0b1b15; touch-action: pan-y; }
#gacha #resultIntro { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; padding: 6px 0; }
#gacha #resultIntro[hidden] { display: none; }
#gacha #resultSummary { margin: 0; font: 14px/1.3 var(--body); color: #d9e4d8; text-align: center; }
#gacha button { border-image: none; border: 1px solid #b28a45; border-radius: 2px; background: linear-gradient(#244e3a, #122b22); color: #ffe3a2; }
#gacha button:disabled { opacity: .5; }
#gacha #revealAll { flex: none; padding: 5px 10px; min-height: 36px; font: 700 12px var(--body); }
#gacha .gachaActions { flex: none; padding: 9px 2px 0; border-top: 1px solid #ad8948; background: linear-gradient(#081710df, #081710); box-shadow: 0 -9px 15px #05100ca6; }
#gacha #gachaClose { display: block; width: 100%; min-height: 48px; margin-bottom: 8px; border: 2px solid #d4ad5f; box-shadow: inset 0 0 0 2px #5b6434, 0 2px 0 #010b06; font: 900 19px var(--display); letter-spacing: 1px; background: linear-gradient(110deg, #17452f, #326648 50%, #17452f); }
#gacha .pulls { gap: 8px; }
#gacha .pulls button { min-height: 46px; padding: 5px; font: 700 14px var(--display); background: linear-gradient(#4e402a, #29271c); }
#gacha .pulls button small { margin-top: 3px; color: #c6cdbb; font: 12px var(--body); }
#gacha #rates { color: #c3cec5; font: 13px/1.45 var(--body); padding: 0 8px; }
#gacha #pity { margin-top: 12px; padding: 9px 10px; background: #10251edb; border: 1px solid #8e733e; color: #c9d8c5; font: 13px/1.35 var(--body); }
#gacha summary { padding: 12px 8px; color: #e7ce95; font: 700 14px var(--body); cursor: pointer; border-bottom: 1px solid #6b5c35; }
#gacha details[open] summary { margin-bottom: 10px; }
#gacha #reveal:empty { display: none; }
#gacha #reveal:not(:empty) { display: grid; padding: 2px 0 6px; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 8px; }
#gacha #reveal.single { grid-template-columns: minmax(0, 310px); justify-content: center; }
#gacha .flip { position: relative; min-height: 0; height: auto; aspect-ratio: .5; cursor: pointer; perspective: 900px; }
#gacha .flip .back, #gacha .flip .face { position: absolute; inset: 0 0 76px; border: 0; border-radius: 0; box-shadow: none; background: none; backface-visibility: hidden; transition: transform .55s ease; }
#gacha .flip .face { display: block; padding: 0; transform: rotateY(180deg); }
#gacha .flip .face::before { content: ''; position: absolute; inset: 13% 18% 13%; background: radial-gradient(ellipse at 50% 62%, #3a99634d, #09231999 70%), linear-gradient(#0c241a80, #0a1e1599), url("${sanctumUrl}") 54% 47% / auto 155%; }
#gacha .flip .back::after, #gacha .flip .face::after { content: ''; position: absolute; inset: 0; z-index: 2; pointer-events: none; background: url(ui/summon-reveal-frame.png) center / 100% 100% no-repeat; }
#gacha .flip .back { display: flex; flex-direction: column; justify-content: center; align-items: center; background: radial-gradient(ellipse, #215536, #0a1f16 65%); }
#gacha .flip .back > span { color: #e4bd6b; font: 50px var(--display); text-shadow: 0 0 22px #75de9b66; }
#gacha .flip .back small { color: #dcc795; font: 12px var(--body); }
#gacha .flip.up .back { transform: rotateY(-180deg); }
#gacha .flip.up .face { transform: rotateY(0); }
#gacha .resultSeal { position: absolute; z-index: 3; top: 9.3%; left: 24%; right: 24%; height: 4.8%; display: grid; place-items: center; font: 900 10px/1 var(--display); color: #ffe4a4; text-transform: uppercase; }
#gacha .summonPortrait { position: absolute; z-index: 1; inset: 19% 20% 23%; display: flex; align-items: flex-end; justify-content: center; }
#gacha .summonPortrait::before { content: ''; position: absolute; bottom: 1%; left: 6%; right: 6%; height: 13%; border: 1px solid #b4e3a2aa; border-radius: 50%; background: radial-gradient(ellipse, #98efb666, #33664444); box-shadow: 0 0 14px #71d19566, inset 0 0 0 3px #bbdb8c22; }
#gacha .flip .face canvas { position: relative; z-index: 1; flex: none; width: 135%; max-width: none; height: auto; margin: 0 0 2%; image-rendering: pixelated; filter: drop-shadow(0 3px 3px #000b); }
#gacha .summonCaption { position: absolute; z-index: 3; left: 21%; right: 21%; bottom: 7.7%; height: 10.2%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
#gacha .flip .face b { width: 100%; color: #ffe4a4; white-space: normal; overflow-wrap: anywhere; font: 900 11px/1 var(--display); }
#gacha .flip.longName .summonCaption b { font-size: 9px; }
#gacha .summonCaption .rtag { display: none; }
#gacha .resultReward { position: absolute; top: 100%; left: 4%; right: 4%; padding: 6px 3px; min-height: 67px; text-align: center; background: linear-gradient(#0b211be6, #0a1915e6); border-bottom: 1px solid #8f7746; }
#gacha .resultReward em { display: block; color: #b8eac2; font: 700 13px/1.3 var(--body); font-style: normal; white-space: normal; }
#gacha .resultReward .xpbar { width: 94%; height: 6px; margin: 5px auto 3px; background: #06120d; border: 1px solid #6c7749; }
#gacha .resultReward .xpbar span { background: linear-gradient(#ceefab, #4f9e70); }
#gacha .resultProgressLabel { display: block; color: #ccd7c6; font: 12px var(--body); }
#gacha .flip.new .face { box-shadow: none; }
#gacha .flip.new.up { transform: none; }
#gacha .flip.new .summonPortrait::before { box-shadow: 0 0 19px #dfc36c88, inset 0 0 0 3px #dfc36c44; border-color: #f6dca0; }
#gacha #reveal.single .flip { min-height: 0; height: min(63dvh, 580px); aspect-ratio: auto; }
#gacha #reveal.single .flip .face { padding: 0; }
#gacha #reveal.single .resultSeal { font-size: 16px; }
#gacha #reveal.single .summonCaption b { font-size: 19px; }
#gacha #reveal.single .longName .summonCaption b { font-size: 15px; }
#gacha #reveal.single .summonPortrait canvas { width: min(130%, 220px); }
#gacha #reveal.single .resultReward { min-height: 76px; padding-top: 8px; }
#gacha #reveal.single .resultReward em { font-size: 16px; }
#gacha .resultDescription { display: block; margin: 5px 3px 0; color: #b9c9ba; font: 12px/1.25 var(--body); }
#gacha #collection { gap: 8px; }
#gacha #collection .hero { border: 1px solid #8c7442; border-radius: 2px; background: linear-gradient(#1c3028e8, #0a1816); padding: 6px 2px; }
#gacha .flip:focus-visible, #gacha button:focus-visible, #gacha summary:focus-visible { outline: 2px solid #c1ffd1; outline-offset: 2px; }
/* Shard rewards are quiet illustrated tarot cards; the griffin stage belongs to new allies. */
#gacha #reveal .flip.tarot { aspect-ratio: .62; }
#gacha #reveal .tarot .back, #gacha #reveal .tarot .face { inset: 0; border: 1px solid #9c8453; border-radius: 5px; overflow: hidden; box-shadow: inset 0 0 0 3px #101c18, inset 0 0 0 4px #71623f, 0 3px 7px #0007; }
#gacha #reveal .tarot .face { background: #17221c url(ui/hero-brass-frame.png) center / 100% 100%; }
#gacha #reveal .tarot .face::before { inset: 15% 9% 34%; border: 1px solid #a69771; background: linear-gradient(#d7ccab, #8b957c); }
#gacha #reveal .tarot .face::after { display: none; }
#gacha #reveal .tarot .back { background: repeating-linear-gradient(45deg, #25372c 0 3px, #203027 3px 6px); }
#gacha #reveal .tarot .back::after { inset: 12px; background: none; border: 1px solid #8f8058; }
#gacha #reveal .tarot .back > span { font-size: 30px; color: #bda97a; text-shadow: none; }
#gacha #reveal .tarot .resultSeal { top: 5%; left: 9%; right: 9%; height: 8%; color: #d6c69e; font: 700 10px var(--body); letter-spacing: 1px; }
#gacha #reveal .tarot .summonPortrait { inset: 18% 10% 35%; align-items: center; }
#gacha #reveal .tarot .summonPortrait::before { display: none; }
#gacha #reveal .tarot .summonPortrait canvas { width: 96%; max-height: 100%; object-fit: contain; filter: saturate(.65) drop-shadow(0 2px 1px #18291b55); }
#gacha #reveal .tarot .summonCaption { bottom: 23%; left: 9%; right: 9%; height: 10%; }
#gacha #reveal .tarot .summonCaption b { font-size: 12px; color: #ddcea8; }
#gacha #reveal .tarot.longName .summonCaption b { font-size: 11px; }
#gacha #reveal .tarot .resultReward { top: auto; bottom: 9%; left: 9%; right: 9%; padding: 3px 0 0; min-height: 0; height: 14%; background: none; border: none; border-top: 1px solid #8c795144; }
#gacha #reveal .tarot .resultReward em { font-size: 12px; color: #c8d1b8; }
#gacha #reveal .tarot .resultProgressLabel { font-size: 10px; }
#gacha #reveal .tarot .resultReward .xpbar { margin: 4px auto 2px; height: 4px; border-width: 0; }
#gacha #reveal .tarot .resultDescription { display: none; }
#gacha #reveal.single:has(.tarot) { grid-template-columns: minmax(0, 252px); padding: 14px 0; }
#gacha #reveal.single .tarot { height: min(48dvh, 390px); }
#gacha #reveal.single .tarot .summonCaption b { font-size: 17px; }
#gacha #reveal.single .tarot.longName .summonCaption b { font-size: 15px; }
#gacha #reveal.single .tarot .resultSeal { font-size: 12px; }
#gacha #reveal.single .tarot .resultReward em { font-size: 15px; }
#gacha #reveal.single .tarot .resultProgressLabel { font-size: 12px; }
#gacha #reveal .flip.new { grid-column: 1 / -1; width: min(100%, 310px); height: min(63dvh, 580px); aspect-ratio: auto; justify-self: center; }
#gacha #reveal .new .resultSeal { font-size: 16px; }
#gacha #reveal .new .summonCaption b { font-size: 19px; }
#gacha #reveal .new.longName .summonCaption b { font-size: 15px; }
#gacha #reveal .new .summonPortrait canvas { width: min(130%, 220px); }
#gacha .summonCelebration { position: absolute; z-index: 0; inset: 18% 13% 20%; border-radius: 50%; background: repeating-conic-gradient(from 15deg, transparent 0deg 23deg, #e2c97525 24deg 27deg, transparent 28deg 30deg), radial-gradient(ellipse, #c9e09155, transparent 70%); pointer-events: none; }
#gacha .new.up .summonCelebration { animation: summonCoronation 1.2s ease-out both; }
#gacha .new.up .summonPortrait { animation: summonArrival .8s cubic-bezier(.18,.8,.25,1) both; }
/* The lucky summon: a gold frame that stays, and one burst of light when the card turns (played once, never looped). */
#gacha .flip.lucky .face { box-shadow: inset 0 0 0 3px #f6dca0, inset 0 0 0 6px #8a6a22, 0 0 24px #e2c975b3; border: 2px solid #f6dca0; }
#gacha .flip.lucky .resultSeal { color: #fff1c4; text-shadow: 0 0 8px #e2c975; }
#gacha .luckyBurst { position: absolute; z-index: 4; inset: 22% 8% 30%; border: 4px solid #ffe9a8; border-radius: 50%; background: radial-gradient(circle, #fff3c8cc, #e2c97566 45%, transparent 70%); opacity: 0; pointer-events: none; }
#gacha .lucky.up .luckyBurst { animation: luckyBurst 1.1s ease-out 1 both; }
@keyframes luckyBurst { from { transform: scale(.2); opacity: .95; } to { transform: scale(2.4); opacity: 0; } }
@keyframes summonCoronation { from { transform: scale(.4) rotate(-18deg); } to { transform: scale(1) rotate(0); } }
@keyframes summonArrival { from { transform: translateY(28px) scale(.75); } to { transform: translateY(0) scale(1); } }

@media (max-height: 800px) { #gacha .summonHeading > small { font-size: 9px; letter-spacing: 1px; } #gacha #gachaClose { min-height: 44px; margin-bottom: 6px; } #gacha .gachaActions { padding-top: 7px; } #gacha .summonHeading h2 { font-size: 18px; } }
@media (prefers-reduced-motion: reduce) { #gacha .flip, #gacha .flip .face, #gacha .flip .back { transition: none; } #gacha .new.up .summonCelebration, #gacha .new.up .summonPortrait { animation: none; } #gacha .lucky.up .luckyBurst { animation: none; } }

`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** The beam's two colours (the outer haze, the bright core) by kind. */
const BEAM: Record<BeamKind, [string, string]> = {
  star: ['#4fc78d', '#ddffe9'],
  light: ['#f0b44a', '#fff6cc'],
};

interface Spark {
  x: number;
  y: number;
  vy: number;
  life: number;
  max: number;
  col: string;
}

/** A pooled bit of the show: a spark or a gold coin, thrown with gravity. */
interface Bit {
  kind: 'spark' | 'coin';
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  col: string;
}

/** The grand show's colours: the main light, the bright core, and the rgb of its glow. */
const ACCENT = { main: '#f0b44a', core: '#fff6cc', rgb: '255, 200, 80' };
/** The ring of light under an arriving hero's feet. */
const RING_LIGHT = '#ffe27a';
/** The most bits alive at once (phones draw them one fillRect each). */
const MAX_BITS = 240;

interface Arrival {
  idx: number;
  /** The figure's height in room pixels in the fan (the showcase draws it larger). */
  fig: number;
  kind: string;
  img: HTMLImageElement;
  w: number;
  h: number;
  row: number;
  frames: number;
  k: number;
  facesRight: boolean;
  x: number;
  y: number;
  face: 1 | -1;
  /** Its awakened step, and the parts of its class's aura (none below the first step). */
  step: number;
  aura: readonly AuraPart[];
}

interface Show {
  t0: number;
  plan: ShowPlan;
  tl: Timeline;
  arrivals: Arrival[];
  resolve: () => void;
  got: Pull[];
  /** The next of the plan's sounds to play, and whether the flare's burst and the shown card have happened. */
  cueI: number;
  burst: boolean;
  cardKey: string;
}

export interface HallHooks {
  /** A pull button was pressed. */
  onSummon(count: 1 | 10): void;
  /** The collection control opens the heroes and summon rules. */
  onCollection(): void;
  /** The chest shop button: crowns buy chests, and chests hold stones. */
  onShop(): void;
}

export class SummoningHall {
  readonly root = el('div', 'hlWrap');
  private canvas = el('canvas', 'hlRoom');
  private actor = summoner();
  private ctx = this.canvas.getContext('2d')!;
  private count = el('div', 'hlCount');
  private scroll = el('div', 'hlScroll');
  private shop = el('button', 'hlShop');
  private pull1 = el('button', '');
  private pull10 = el('button', 'primary');
  private still: HTMLCanvasElement | null = null;
  private glow: HTMLCanvasElement | null = null;
  private lay: HallLayout = hallLayout(MIN_H);
  private scale = 2;
  private meta: Meta | null = null;
  private sparks: Spark[] = [];
  private bits: Bit[] = [];
  private glowTint: HTMLCanvasElement | null = null;
  private skipPad = el('div', 'hlSkip');
  private over = el('div', 'hlOver');
  private shakeOn = settings().shake;
  private shakeCss = '';
  private show: Show | null = null;
  private raf = 0;
  private last = 0;
  private now = 0;
  private running = false;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private saver = settings().saver;
  private watch: ResizeObserver;

  constructor(private hooks: HallHooks) {
    if (!document.getElementById('hallStyle')) {
      const st = el('style');
      st.id = 'hallStyle';
      st.textContent = CSS;
      document.head.append(st);
    }
    const head = el('div', 'hlHead');
    const title = el('h2', 'hlTitle', 'Summoning Sanctum');
    const ledger = el('div', 'hlLedger');
    const odds = el('button', 'small hlOdds', 'View heroes →');
    ledger.append(this.count, odds);
    head.append(title, ledger);
    odds.addEventListener('click', () => this.hooks.onCollection());
    const bar = el('div', 'hlBar');
    bar.append(this.pull1, this.pull10);
    const low = el('div', 'hlLow');
    this.shop.addEventListener('click', () => this.hooks.onShop());
    low.append(this.scroll, this.shop, bar);
    this.root.append(this.canvas, this.actor, head, low, this.over, this.skipPad);
    // (a tap anywhere skips the show: a new hero's show jumps to the moment it stands revealed, and only a tap after that goes on to the
    //  result; taps in the first moments, a double tap on the summon button, are let go. SUMMON-TAROT: a double tap used to skip a join's whole show)
    this.skipPad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const s = this.show;
      if (!s) return;
      const act = skipAction(s.plan, this.now - s.t0);
      if (act === 'ignore') return;
      if (act === 'end') return this.finish(true);
      hushSummon();
      s.t0 = this.now - s.plan.revealAt;
      // (the build-up's cues are passed over; the reveal's sting plays once)
      while (s.cueI < s.plan.cues.length && s.plan.cues[s.cueI].at < s.plan.revealAt) s.cueI++;
      playSfx('stingSummon');
    });
    this.pull1.addEventListener('click', () => this.hooks.onSummon(1));
    this.pull10.addEventListener('click', () => this.hooks.onSummon(10));
    this.ctx.imageSmoothingEnabled = false;
    onSettings((s) => {
      this.saver = s.saver;
      this.shakeOn = s.shake;
    });
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.reduced = e.matches));
    // (a test page reaches the hall as `window.__hall`, to play a made-up pull)
    (window as unknown as { __hall?: SummoningHall }).__hall = this;
    this.watch = new ResizeObserver(() => this.fit());
    this.watch.observe(this.root);
    document.addEventListener('visibilitychange', () => (document.hidden ? this.halt() : this.running && this.start()));
  }

  /** Redraw the plaques and the buttons for the meta (crowns, odds, heroes recruited). */
  update(meta: Meta): void {
    this.meta = meta;
    const have = ALL_HEROES.filter((k) => meta.unlocked.includes(k)).length;
    this.count.textContent = `${have} / ${ALL_HEROES.length} Heroes`;
    const busy = !!this.show;
    this.shop.replaceChildren(icon(ICONS.stones, 'hlShopIco'), `Chest shop · buy stones with crowns`);
    this.shop.disabled = busy;
    for (const [b, n] of [[this.pull1, 1], [this.pull10, 10]] as const) {
      b.replaceChildren(`Use ${stoneCost(n)} stone${n === 1 ? '' : 's'}`, el('small', '', `◆ ${stonesOf(meta)} held`));
      b.disabled = busy || stonesOf(meta) < stoneCost(n);
    }
    const line = el('b', '', 'Hero shards');
    const hint = el('span', 'hlHint', 'Each stone brings a hero closer');
    const near = closest(meta);
    const progress = el('div', 'hlProgress');
    const fill = el('i');
    const haveShards = near ? haveOf(meta, near) : 0;
    const need = needOf(meta);
    fill.style.width = `${near ? Math.min(100, haveShards / need * 100) : 100}%`;
    progress.append(fill);
    const label = el('div', 'hlProgressLabel');
    label.append(el('span', '', near ? `Nearest: ${heroTitle(near)}` : 'All summon heroes recruited'), el('span', '', near ? `${haveShards} / ${need}` : 'Complete'));
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-label', near ? `${heroTitle(near)} recruitment` : 'Recruitment complete');
    progress.setAttribute('aria-valuemin', '0');
    progress.setAttribute('aria-valuemax', `${near ? need : 1}`);
    progress.setAttribute('aria-valuenow', `${near ? haveShards : 1}`);
    this.scroll.replaceChildren(line, hint, label, progress, el('span', 'odds', pityLine(meta)), el('span', 'odds lucky', luckyLine()));

  }

  /** Play a pull in the hall: resolves when the heroes have stepped out and it is time for the card reveal. It plays every time (the hall is woken first if a page change or an earlier pull stopped it); `skip` (a tap on the summoning cinematic) goes straight to the reveal. */
  async play(got: Pull[], skip = false): Promise<void> {
    // Only a newly recruited character warrants the chamber ritual.
    if (skip || !got.some(p => p.isNew)) return;
    if (!this.show) await this.start();
    const a = art;
    const meta = this.meta;
    if (!this.running || !a || !this.still || !meta || this.show) return;
    const plan = summonPlan(got, this.reduced);
    const tl = plan.tl;
    const spots = fanSpots(got.length, this.lay.circle.x, this.lay.circle.y);
    const arrivals: Arrival[] = [];
    got.forEach((p, i) => {
      const def = UNITS[p.kind];
      const rig = heroRig(meta, p.kind);
      if (!rig) return;
      const spot = spots[i];
      const fig = Math.min(46, Math.max(30, rig.figure * def.scale * 0.9));
      arrivals.push({
        idx: i,
        fig,
        kind: p.kind,
        img: rig.img,
        w: rig.w,
        h: rig.h,
        row: Math.max(0, rig.rows.indexOf('idle')),
        frames: rig.counts.idle ?? 1,
        k: fig / rig.figure,
        facesRight: rig.facesRight,
        x: spot.x,
        y: spot.y,
        face: spot.x < this.lay.circle.x ? 1 : -1,
        step: awakenedStep(meta, p.kind),
        aura: auraParts(p.kind, awakenedStep(meta, p.kind), this.saver),
      });
    });
    this.pull1.disabled = this.pull10.disabled = true;
    await new Promise<void>((resolve) => {
      this.show = { t0: this.now, plan, tl, arrivals, resolve, got, cueI: 0, burst: false, cardKey: '' };
      this.skipPad.classList.add('on');
      this.root.classList.add('isCasting');
      duck(true, 'summon');
      // (the arrivals are drawn in the order of the pull, so the heroes appear one after another)
    });
  }

  /** Start drawing (the tab is showing); resolves once the room is drawn and moving. */
  start(): Promise<void> {
    this.running = true;
    if (this.raf || document.hidden) return Promise.resolve();
    return loadArt().then(() => {
      if (!this.running || this.raf) return;
      this.fit();
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this.frame(t));
    });
  }

  /** Stop drawing (another tab is showing). A pull in flight is finished at once so the reveal is not lost. */
  stop(): void {
    this.running = false;
    this.halt();
    this.finish(true);
  }

  private halt(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** The show is over (`cut`: skipped by a tap or the tab changing, so its sound is hushed). */
  private finish(cut = false): void {
    const s = this.show;
    if (!s) return;
    this.show = null;
    this.actor.dataset.pose = 'idle';
    if (cut) hushSummon();
    duck(false, 'summon');
    this.skipPad.classList.remove('on');
    this.root.classList.remove('isCasting');
    this.over.replaceChildren();
    this.bits = [];
    this.setShake(0, 0);
    if (this.meta) this.update(this.meta);
    s.resolve();
  }

  private fit(): void {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    if (!w || !h || !art) return;
    const s = w / ROOM_W;
    const lay = hallLayout(Math.floor(h / s));
    // Match the altar platform in the approved chamber artwork.
    lay.circle = { x: Math.round(ROOM_W * 0.54), y: Math.round(lay.h * 0.545) };
    if (s === this.scale && this.still && this.canvas.height === Math.floor(lay.h * s) && this.lay.h === lay.h) {
      this.canvas.style.left = `${Math.round((w - ROOM_W * s) / 2)}px`;
      return;
    }
    this.scale = s;
    this.lay = lay;
    this.canvas.width = ROOM_W * s;
    this.canvas.height = lay.h * s;
    this.canvas.style.width = `${ROOM_W * s}px`;
    this.canvas.style.height = `${lay.h * s}px`;
    this.canvas.style.left = `${Math.round((w - ROOM_W * s) / 2)}px`;
    this.ctx.imageSmoothingEnabled = false;
    this.still = this.paintStill(art, s);
    this.glow = this.paintGlow(s);
    this.glowTint = this.paintGlow(s, '255, 190, 60');
  }

  /** The approved chamber, priest and altar, painted once for this viewport. */
  private paintStill(a: Record<string, HTMLImageElement>, s: number): HTMLCanvasElement {
    const c = el('canvas');
    c.width = ROOM_W * s;
    c.height = this.lay.h * s;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.drawImage(a.sanctum, 0, 0, c.width, c.height);

    return c;
  }

  /** Soft brazier and crystal light; brightness stays steady at rest. */
  private paintGlow(s: number, tint?: string): HTMLCanvasElement {
    const { h, braziers, pillars } = this.lay;
    const c = el('canvas');
    c.width = ROOM_W * s;
    c.height = h * s;
    const g = c.getContext('2d')!;
    const lamp = (x: number, y: number, r: number, rgb: string, al: number) => {
      const rg = g.createRadialGradient(x * s, y * s, 0, x * s, y * s, r * s);
      rg.addColorStop(0, `rgba(${rgb}, ${al})`);
      rg.addColorStop(1, `rgba(${rgb}, 0)`);
      g.fillStyle = rg;
      g.fillRect(0, 0, c.width, c.height);
    };
    for (const b of braziers) lamp(b.x, b.y - 38, tint ? 64 : 46, tint ?? '255, 150, 60', tint ? 0.6 : 0.34);
    for (const p of pillars) lamp(p.x, p.y - 56, tint ? 44 : 30, tint ?? '65, 205, 139', tint ? 0.45 : 0.22);
    return c;
  }

  // ---- drawing ----

  private frame(t: number): void {
    this.raf = requestAnimationFrame((n) => this.frame(n));
    const gap = this.saver ? 33 : 0;
    if (t - this.last < gap) return;
    const dt = Math.min(100, t - this.last);
    this.last = t;
    this.now += dt;
    this.tick(dt);
    const show = this.show;
    const actorAt = show ? this.now - show.t0 : -1;
    this.actor.dataset.pose = !show ? 'idle' : actorAt >= show.tl.charge && actorAt < show.plan.revealAt + 500 ? 'shield' : actorAt < show.tl.charge ? 'cast' : 'idle';
    this.draw();
    const s = this.show;
    if (!s) return;
    const at = this.now - s.t0;
    // (the show's sounds, the flash and the cards go out as their times pass)
    while (s.cueI < s.plan.cues.length && at >= s.plan.cues[s.cueI].at) playSfx(s.plan.cues[s.cueI++].cue);
    this.syncOverlay(s, at);
    if (at >= s.tl.done) this.finish();
  }

  /** How charged the circle is (0 at rest, up to 1 while a pull builds), and how far into the pull we are. */
  private charge(): { c: number; t: number } {
    const s = this.show;
    if (!s) return { c: 0, t: -1 };
    const t = this.now - s.t0;
    return { c: Math.min(1, t / s.tl.charge) * (t < s.tl.beam ? 1 : Math.max(0, 1 - (t - s.tl.beam) / 600)), t };
  }

  private setShake(dx: number, dy: number): void {
    const css = dx || dy ? `translate(${dx}px, ${dy}px)` : '';
    if (css === this.shakeCss) return;
    this.shakeCss = css;
    this.canvas.style.transform = css;
  }

  private tick(dt: number): void {
    const show = this.show;
    const plan = show?.plan;
    const grand = plan?.tier === 'grand';
    const t = show ? this.now - show.t0 : -1;
    const { c } = this.charge();
    const cx = this.lay.circle.x;
    const cy = this.lay.circle.y;
    // (sparks lift off the circle: a few at rest, a shower while it charges, a bigger one for the grand show)
    if (!this.reduced || (show && !grand)) {
      const rate = (show ? 40 + 60 * c : 5) * (grand ? 2.2 : 1) * (dt / 1000);
      for (let n = rate; n > 0; n--) {
        if (n < 1 && Math.random() > n) break;
        const a = rand(0, Math.PI * 2);
        const r = Math.sqrt(Math.random());
        const col = grand ? (Math.random() < 0.5 ? ACCENT.main : ACCENT.core) : Math.random() < 0.5 ? '#ffd86a' : '#8cebb6';
        this.sparks.push({ x: cx + Math.cos(a) * 34 * r, y: cy + Math.sin(a) * 16 * r, vy: rand(14, 34), life: 0, max: rand(700, 1500), col });
      }
    }
    for (const p of this.sparks) {
      p.life += dt;
      p.y -= p.vy * (dt / 1000);
    }
    this.sparks = this.sparks.filter((p) => p.life < p.max).slice(-160);

    if (show && plan && grand && !this.reduced) {
      const k = dt / 1000;
      const spawn = (rate: number, make: () => Bit) => {
        for (let n = rate * k; n > 0; n--) {
          if (n < 1 && Math.random() > n) break;
          this.bits.push(make());
        }
      };
      if (!show.burst && t >= show.tl.flare) {
        show.burst = true;
        this.burst(cx, cy);
      }
      const star = show.arrivals.find((a) => a.idx === plan.star);
      if (t >= show.tl.flare && t < show.tl.done) {
        // (gold coins and sparks keep tumbling down the beam)
        if (t < show.tl.beam + 400) {
          spawn(22, () => ({ kind: Math.random() < 0.5 ? 'coin' : 'spark', x: cx + rand(-16, 16), y: cy - rand(20, 150), vx: rand(-20, 20), vy: rand(-30, 10), g: 110, life: 0, max: rand(700, 1300), col: Math.random() < 0.5 ? '#ffd86a' : '#fff6cc' }));
        }
        // (and the new arrival gives off gold flecks)
        if (star && t >= plan.revealAt) {
          spawn(12, () => ({ kind: 'spark', x: star.x + rand(-8, 8), y: star.y - rand(0, star.fig), vx: rand(-6, 6), vy: -rand(14, 34), g: 0, life: 0, max: rand(700, 1300), col: Math.random() < 0.5 ? ACCENT.main : ACCENT.core }));
        }
      }
    }
    for (const b of this.bits) {
      b.life += dt;
      b.x += b.vx * (dt / 1000);
      b.vy += b.g * (dt / 1000);
      b.y += b.vy * (dt / 1000);
    }
    this.bits = this.bits.filter((b) => b.life < b.max && b.y < this.lay.h + 4).slice(-MAX_BITS);

    // the screen shake: the flare's
    if (show && plan && this.shakeOn && !this.reduced) {
      const amp = shakeAt(plan, t) * plan.shakeAmp;
      if (amp > 0.3) return this.setShake(Math.round(rand(-1, 1) * amp), Math.round(rand(-1, 1) * amp));
    }
    this.setShake(0, 0);
  }

  /** The flare's burst of light, coins and sparks flying up and out of the circle. */
  private burst(cx: number, cy: number): void {
    for (let i = 0; i < 70; i++) {
      const ang = rand(-Math.PI * 0.95, -Math.PI * 0.05);
      const sp = rand(40, 150);
      const kind: Bit['kind'] = i % 2 ? 'coin' : 'spark';
      const col = kind === 'coin' ? '#ffd86a' : Math.random() < 0.5 ? ACCENT.main : ACCENT.core;
      this.bits.push({ kind, x: cx + rand(-8, 8), y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 150, life: 0, max: rand(900, 1700), col });
    }
  }

  /** The ribbon, the NEW HERO banner and the hero's card, put up as their times come. */
  private syncOverlay(s: Show, t: number): void {
    const plan = s.plan;
    if (plan.ribbonAt >= 0 && t >= plan.ribbonAt && !this.over.querySelector('.hlRibbon')) {
      const r = el('div', 'hlRibbon', 'SUMMONED');
      this.over.prepend(r);
      this.slam(r);
    }
    const card = cardAt(plan, t);
    const key = card ? `${card.idx}:${card.fresh}` : '';
    if (key === s.cardKey) return;
    s.cardKey = key;
    this.over.querySelectorAll('.hlBanner, .hlCard').forEach((n) => n.remove());
    if (!card) return;
    const p = s.got[card.idx];
    const def = UNITS[p.kind];
    if (card.fresh) {
      const banner = el('div', 'hlBanner', 'NEW HERO');
      this.over.append(banner);
      this.slam(banner);
    }
    const box = el('div', 'hlCard');
    box.append(el('b', '', heroTitle(p.kind)), el('em', '', def.role));
    if (!card.fresh) box.append(el('small', '', `+${p.shards} shard${p.shards === 1 ? '' : 's'}`));
    this.over.append(box);
    this.slam(box);
  }

  /** An element slamming in (a calm fade under reduced motion). */
  private slam(e: HTMLElement): void {
    if (this.reduced) e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, easing: 'ease-out' });
    else e.animate([{ transform: 'scale(2.6)', opacity: 0 }, { transform: 'scale(0.94)', opacity: 1, offset: 0.55 }, { transform: 'scale(1)', opacity: 1 }], { duration: 380, easing: 'ease-out' });
  }

  /** A filled ellipse made of whole-pixel rows (so it keeps hard pixel edges). */
  private ellipse(cx: number, cy: number, rx: number, ry: number): void {
    const g = this.ctx;
    const s = this.scale;
    for (let dy = -ry; dy <= ry; dy++) {
      const half = Math.round(rx * Math.sqrt(1 - (dy / ry) * (dy / ry)));
      g.fillRect((cx - half) * s, (cy + dy) * s, half * 2 * s, s);
    }
  }

  /** The outline of an ellipse, a row at a time. */
  private ring(cx: number, cy: number, rx: number, ry: number): void {
    const g = this.ctx;
    const s = this.scale;
    const half = (dy: number) => Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) * (dy / ry))));
    for (let dy = -ry; dy <= ry; dy++) {
      const h = half(dy);
      const run = Math.max(1, h - half(dy < 0 ? dy - 1 : dy + 1));
      g.fillRect((cx - h) * s, (cy + dy) * s, run * s, s);
      g.fillRect((cx + h - run) * s, (cy + dy) * s, run * s, s);
    }
  }

  private draw(): void {
    const g = this.ctx;
    const s = this.scale;
    const a = art;
    if (!a || !this.still) return;
    const { circle } = this.lay;
    const { c, t } = this.charge();
    const show = this.show;
    const plan = show?.plan ?? null;
    const grand = plan?.tier === 'grand';
    const W = this.canvas.width;
    const H = this.canvas.height;
    const sc = plan ? showcaseAt(plan, t) : null;
    g.globalAlpha = 1;
    g.drawImage(this.still, 0, 0);

    // A casting trail joins the priest's outstretched hand to the live altar light.
    if (show && c > 0 && !this.reduced) {
      g.save();
      g.strokeStyle = `rgba(155, 255, 201, ${0.35 + c * 0.45})`;
      g.lineWidth = s;
      g.beginPath();
      g.moveTo(W * 0.30, H * 0.48);
      g.bezierCurveTo(W * 0.38, H * 0.43, W * 0.46, H * 0.52, circle.x * s, circle.y * s);
      g.stroke();
      g.restore();
    }

    // the darkness (a grand show darkens the hall as it builds; a showcase dims it a little too)
    let dim = plan ? dimAt(plan, t) : 0;
    if (sc) dim = Math.max(dim, 0.5 * Math.min(1, (t - sc.at) / 300));
    if (dim > 0.005) {
      g.fillStyle = `rgba(4, 0, 10, ${dim})`;
      g.fillRect(0, 0, W, H);
    }

    // the circle's glow: steady at rest, ramping up while it charges (gold in the grand show)
    const charged = c;
    g.globalCompositeOperation = 'lighter';
    const breathe = 0.5;
    const grow = grand ? 1.6 : 1;
    g.fillStyle = `rgba(${grand ? ACCENT.rgb : '65, 205, 139'}, ${0.1 + 0.08 * breathe + 0.3 * charged})`;
    this.ellipse(circle.x, circle.y, 30 + Math.round(4 * charged * grow), 14 + Math.round(2 * charged * grow));
    g.fillStyle = `rgba(255, 220, 130, ${0.06 + 0.04 * breathe + 0.35 * charged})`;
    this.ellipse(circle.x, circle.y, 14 + Math.round(6 * charged * grow), 6 + Math.round(3 * charged * grow));
    // (runes orbit the rim: slowly at rest, faster as it charges; they race in the grand show)
    const race = grand ? 2.6 : 1;
    const spin = this.reduced && !show ? 0 : this.now / ((show ? 500 - 300 * c : 2600) / race);
    const runes = grand ? 16 : 10;
    g.fillStyle = grand ? `rgba(${ACCENT.rgb}, ${0.7 + 0.3 * c})` : `rgba(255, 224, 140, ${0.55 + 0.4 * c})`;
    for (let i = 0; i < runes; i++) {
      const ang = spin + (i * Math.PI * 2) / runes;
      g.fillRect((Math.round(circle.x + Math.cos(ang) * 36) - 1) * s, (Math.round(circle.y + Math.sin(ang) * 17) - 1) * s, 2 * s, 2 * s);
    }
    g.globalCompositeOperation = 'source-over';

    // the flare: rings of light opening across the floor (one for a plain pull, two for a grand one)
    if (show) {
      const [haze, core] = BEAM[beamKind(grand)];
      const waves = grand ? 2 : 1;
      const reach = grand ? 1.25 : 1;
      for (let k = 0; k < waves; k++) {
        const st = show.tl.charge + k * 220;
        const dur = k ? 800 : 450;
        if (t < st || t >= st + dur) continue;
        const p = (t - st) / dur;
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = (1 - p) * (k ? 0.7 : 1);
        g.fillStyle = core;
        this.ring(circle.x, circle.y, 20 + Math.round(70 * p * reach), 9 + Math.round(30 * p * reach));
        g.fillStyle = haze;
        this.ring(circle.x, circle.y, 14 + Math.round(60 * p * reach), 6 + Math.round(26 * p * reach));
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }
    }

    // the beam: columns of light stepping out from the circle, reaching the top of the room (the pack's pillar sheet over it in the grand show)
    if (show && t >= show.tl.charge - 40) {
      const rise = Math.min(1, (t - show.tl.charge) / (grand ? 200 : 280));
      const fade = t < show.tl.beam ? 1 : Math.max(0, 1 - (t - show.tl.beam) / 600);
      const top = Math.round(circle.y - (circle.y + 6) * rise);
      const [haze, core] = BEAM[beamKind(grand)];
      const wk = grand ? 1.8 : 1;
      const even = (n: number) => 2 * Math.round(n / 2);
      g.globalCompositeOperation = 'lighter';
      const col = (w: number, color: string, al: number) => {
        g.globalAlpha = al * fade;
        g.fillStyle = color;
        g.fillRect((circle.x - w / 2) * s, top * s, w * s, (circle.y - top) * s);
      };
      col(even(30 * wk), haze, 0.22);
      col(even(20 * wk), haze, 0.35);
      col(even(10 * wk), core, 0.8);
      if (grand && rise > 0.1 && !this.reduced) {
        // (gold rays fanning out of the pillar's foot)
        const n = 12;
        const spinR = this.now / 2400;
        for (let i = 0; i < n; i++) {
          const a0 = spinR + (i * Math.PI * 2) / n;
          g.globalAlpha = 0.14 * fade * rise;
          g.fillStyle = ACCENT.main;
          g.beginPath();
          g.moveTo(circle.x * s, (circle.y - 14) * s);
          g.lineTo((circle.x + Math.cos(a0 - 0.07) * 230) * s, (circle.y - 14 + Math.sin(a0 - 0.07) * 230) * s);
          g.lineTo((circle.x + Math.cos(a0 + 0.07) * 230) * s, (circle.y - 14 + Math.sin(a0 + 0.07) * 230) * s);
          g.fill();
        }
        if (rise >= 0.5) {
          const sp = a.lightPillar;
          const f = rise < 1 ? Math.min(5, Math.floor(rise * 6)) : 3 + (Math.floor(this.now / 90) % 3);
          g.save();
          g.beginPath();
          g.rect(0, top * s, W, (circle.y - top) * s);
          g.clip();
          g.globalAlpha = 0.85 * fade;
          for (let y = circle.y; y > top - 64; y -= 64) g.drawImage(sp, f * 32, 0, 32, 32, (circle.x - 32) * s, (y - 64) * s, 64 * s, 64 * s);
          g.restore();
        }
      }
      // (bright flecks climbing the shaft)
      g.fillStyle = core;
      const flecks = grand ? 24 : 9;
      for (let i = 0; i < flecks; i++) {
        const y = circle.y - ((this.now / 7 + i * 31) % (circle.y + 6));
        if (y < top) continue;
        g.globalAlpha = 0.9 * fade;
        g.fillRect((circle.x - 12 * wk + ((i * 7) % Math.round(24 * wk))) * s, Math.round(y) * s, 2 * s, 3 * s);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    // the arrivals, back to front (a showcase takes the stage alone and the rest fade away)
    if (show && plan) {
      const list: { depth: number; paint: () => void }[] = [];
      const away = sc ? 1 - Math.min(1, (t - sc.at) / 250) : 1;
      for (const ar of show.arrivals) {
        if (sc && ar.idx === sc.idx) continue;
        if (away < 0.03) continue;
        const rise = plan.rises[ar.idx];
        const star = ar.idx === plan.star && grand;
        list.push({ depth: ar.y, paint: () => this.arrive(ar, t - show.tl.heroAt[ar.idx], rise, { alpha: away, star }) });
      }
      list.sort((p, q) => p.depth - q.depth);
      for (const e of list) e.paint();
      if (sc) {
        const ar = show.arrivals.find((x) => x.idx === sc.idx);
        if (ar) {
          const e = 1 - (1 - Math.min(1, (t - sc.at) / 320)) ** 3;
          const big = (sc.mini ? 74 : 88) / ar.fig;
          const pose: Arrival = { ...ar, x: ar.x + (circle.x - ar.x) * e, y: ar.y + (circle.y + 18 - ar.y) * e, k: ar.k * (1 + (big - 1) * e), fig: ar.fig * (1 + (big - 1) * e) };
          this.arrive(pose, 1e6, 1, { alpha: 1, star: true, grown: 1 + (big - 1) * e });
        }
      }
    }

    // sparks, then the show's coins, sparks and embers, over everything
    for (const p of this.sparks) {
      const k = 1 - p.life / p.max;
      g.globalAlpha = Math.min(1, k * 1.6);
      g.fillStyle = p.col;
      g.fillRect(Math.round(p.x) * s, Math.round(p.y) * s, s, s);
    }
    for (const b of this.bits) {
      const k = 1 - b.life / b.max;
      g.globalAlpha = Math.min(1, k * 1.8);
      g.fillStyle = b.col;
      if (b.kind === 'coin') {
        // (a coin spins: it is one to three pixels wide, with a bright middle)
        const w = 1 + (Math.floor(b.life / 90) % 3);
        g.fillRect(Math.round(b.x) * s, Math.round(b.y) * s, w * s, 3 * s);
        g.fillStyle = '#fff6cc';
        g.fillRect(Math.round(b.x) * s, (Math.round(b.y) + 1) * s, s, s);
      } else {
        g.globalCompositeOperation = 'lighter';
        const sz = 2;
        g.fillRect(Math.round(b.x) * s, Math.round(b.y) * s, sz * s, sz * s);
        g.globalCompositeOperation = 'source-over';
      }
    }
    g.globalAlpha = 1;

    // the braziers and crystals glow steadily; in the grand show they flare gold
    if (this.glow) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.6;
      g.drawImage(this.glow, 0, 0);
      const tint = grand ? this.glowTint : null;
      if (tint && show) {
        const build = Math.min(1, t / show.tl.charge);
        const after = t < show.tl.beam ? 1 : Math.max(0, 1 - (t - show.tl.beam) / 800);
        g.globalAlpha = Math.min(1, 0.9 * build * after * 0.9);
        g.drawImage(tint, 0, 0);
      }
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }
    // the grand show leaves the room in gold
    if (show && plan && grand && t >= show.tl.flare) {
      const k = Math.min(1, (t - show.tl.flare) / 600);
      g.fillStyle = `rgba(200, 140, 20, ${0.07 * k * (t < show.tl.beam ? 1 : Math.max(0, 1 - (t - show.tl.beam) / 800))})`;
      g.fillRect(0, 0, W, H);
    }
    // a soft wash of the beam's light over the room as the circle flares (a slow swell and fade, never a flash)
    if (show && t >= show.tl.charge && t < show.tl.flare + 200) {
      const p = (t - show.tl.charge) / (show.tl.flare + 200 - show.tl.charge);
      g.globalAlpha = 0.08 * (1 - p);
      g.fillStyle = BEAM[beamKind(grand)][1];
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
  }

  /** One sprite frame, drawn into `g` (turned round when `flip`), its middle at `cx`. */
  private blit(g: CanvasRenderingContext2D, ar: Arrival, i: number, cx: number, dy: number, dw: number, dh: number, flip: boolean): void {
    if (flip) {
      g.save();
      g.translate(cx, 0);
      g.scale(-1, 1);
      g.drawImage(ar.img, i * ar.w, ar.row * ar.h, ar.w, ar.h, -dw / 2, dy, dw, dh);
      g.restore();
    } else g.drawImage(ar.img, i * ar.w, ar.row * ar.h, ar.w, ar.h, cx - dw / 2, dy, dw, dh);
  }

  /** One hero stepping out of the circle: it rises from the floor of the circle into its place, fading in, under a ring of light.
   *  `o.star`: the grand show's star, with its glow and halo;
   *  `o.grown`: how much larger than in the fan it is drawn (a showcase). */
  private arrive(ar: Arrival, since: number, rise: number, o: { alpha: number; star: boolean; grown?: number }): void {
    if (since < 0) return;
    const g = this.ctx;
    const s = this.scale;
    const p = Math.min(1, since / rise);
    const e = 1 - (1 - p) * (1 - p);
    const x = Math.round(ar.x);
    const y = ar.y;
    const gf = o.grown ?? 1;
    const dw = ar.w * ar.k * s;
    const dh = ar.h * ar.k * s;
    // (the grand show's star: a glow around the hero, and a halo ring over its head once it is in view)
    if (o.star) {
      const mid = (y - ar.fig / 2) * s;
      const rad = Math.max(ar.fig * 0.95, 30) * s;
      g.save();
      g.globalCompositeOperation = 'lighter';
      const rg = g.createRadialGradient(x * s, mid, 0, x * s, mid, rad);
      const al = 0.4 * e * o.alpha * 0.9;
      rg.addColorStop(0, `rgba(${ACCENT.rgb}, ${al})`);
      rg.addColorStop(1, `rgba(${ACCENT.rgb}, 0)`);
      g.fillStyle = rg;
      g.fillRect(x * s - rad, mid - rad, rad * 2, rad * 2);
      if (e > 0.8) {
        g.globalAlpha = o.alpha;
        g.fillStyle = ACCENT.core;
        this.ring(x, Math.round(y - ar.fig - 4), Math.round(8 * gf), Math.round(2 * gf) + 1);
        g.fillStyle = ACCENT.main;
        this.ring(x, Math.round(y - ar.fig - 4), Math.round(10 * gf), Math.round(3 * gf) + 1);
      }
      g.restore();
    }
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.5 * e * o.alpha;
    g.fillStyle = RING_LIGHT;
    this.ellipse(x, y, Math.round((o.star ? 13 : 11) * gf), Math.max(3, Math.round(3 * gf)));
    g.restore();
    g.fillStyle = `rgba(8, 3, 16, ${0.4 * o.alpha})`;
    g.fillRect((x - Math.round(6 * gf)) * s, y * s, Math.round(12 * gf) * s, 2 * s);
    const i = Math.floor(since / 150) % ar.frames;
    const lift = Math.round((1 - e) * 14);
    // (an awakened hero rises in its class's aura)
    if (ar.step) {
      g.globalAlpha = e * o.alpha;
      drawAuraGlow(g, ar.kind, ar.step, x * s, (y + lift) * s, ar.fig * s);
      drawAura(g, ar.aura, x * s, (y + lift) * s, ar.fig * s, this.now, 'back', ar.face, this.reduced);
      g.globalAlpha = 1;
    }
    g.save();
    g.globalAlpha = e * o.alpha;
    const flip = (ar.face === 1) !== ar.facesRight;
    const dy = (y + lift) * s - dh;
    // (while it rises the part below the circle's floor line is cut off, so it comes up out of the ground)
    g.beginPath();
    g.rect(0, 0, this.canvas.width, y * s + 2 * s);
    g.clip();
    this.blit(g, ar, i, x * s, dy, dw, dh, flip);
    g.restore();
    if (ar.step) {
      g.globalAlpha = e * o.alpha;
      drawAura(g, ar.aura, x * s, (y + lift) * s, ar.fig * s, this.now, 'front', ar.face, this.reduced);
      g.globalAlpha = 1;
    }
  }
}
