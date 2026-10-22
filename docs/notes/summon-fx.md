# Summoning FX: a flashier summon for higher ranks

Renderer and sound only; the gacha rules, odds, pity and costs are untouched (`Gacha.summon` still pulls first and saves, then the hall plays it).

## How the show is chosen (`src/render/summonRules.ts`, pure and tested)
- `summonPlan(got, reduced)` gives the staging of a pull: tier by the best rarity (`showTier`: plain for Common and Rare, then Epic, Legendary, Mythic),
  the **star** (`starOf`: best rarity, a new hero before a repeat, then the first), timings, showcases, name cards and a script of sounds.
- **New hero of Epic or better** = the full show: darkness, build-up, flare, the star steps out last, a ribbon (Legendary, Mythic), a green
  **NEW HERO** banner and a **showcase** (the hero walks onto the circle drawn about 2.5x larger, the room dims, a card gives name, rarity stars,
  rarity and role). **A repeat** gets about half the charge, beam and rise, no showcase, and its name card shows `+N shards`.
- **Ten-pulls** play for the best result. Other *new* Legendary or Mythic heroes get a quick showcase each, in turn (900 ms, at most 4),
  with their own ribbon colour. Repeats of those just step out with the rest.
- Times (new hero, ms): Epic charge 1400, Legendary 1900, Mythic 2300; the Mythic hero is revealed at about 3.5 s (a 3 to 4 s build) and its showcase follows.

## What each tier draws (`src/hall.ts`)
- **Common and Rare**: as before (the old charge, flare, beam, fan of heroes).
- **Epic**: longer charge, 14 purple runes spinning faster, a thicker violet beam with the pack's crystal-pillar sheet over it and more flecks, a short 350 ms shake.
- **Legendary**: the room darkens to 55%, braziers flare gold (a second, gold glow layer), 16 runes race; at the flare a gold pillar (the pack's light-pillar sheet, drawn 2x wide
  and tiled up the shaft) erupts with 12 turning light rays, two shockwave rings, a burst of gold coins and sparks (coins keep tumbling down the beam), a 7 px shake and
  a white flash; the hero steps out with a glow and a halo ring; the LEGENDARY ribbon slams in.
- **Mythic**: the room dims to 88%, the circle cracks with crimson light (8 jagged cracks spreading over the charge), a heartbeat thump five times (each dips the darkness,
  pulses the circle and gives a 2 px shake); then a crimson-and-gold pillar (fire-pillar sheet), alternating crimson and gold rays, three shockwave rings, a rain of embers
  that lasts to the end, a crimson colour shift that lingers, a 9 px shake and a crimson-white flash. The hero rises slowly as a black silhouette (painted through a side canvas),
  then melts into full colour with its aura, halo and rising embers while the MYTHIC ribbon, NEW HERO banner and name card slam in.
- **Card flip** (`gacha.ts`): the cards still flip one after another but now in order of rarity, the best last. An Epic or better glows in its colour before it flips (`.tease`),
  a Legendary or Mythic trembles too. A tap on a card still flips it at once.
- Art: the pack's `fx_crystal-pillar`, `fx_light-pillar` and `fx_fire-pillar` sheets (already in `src/art/hall/`, credited in `CREDITS.md`) and the flame sheet. Coins, sparks, embers, rays and cracks
  are small code-drawn pixels in a pool capped at 240 (one `fillRect` each); there are no filters per frame. PixelLab was not called.

## Sound (`src/render/sound.ts`, cues in `soundRules.ts`)
New cues, all through the existing synth: `riseEpic` (climbing chimes), `riseLegend` (a choir-like swell of detuned pads), `riseMythic` (a deep rising drone and rumble),
`stingEpic`, `stingLegend` (pad chord, bell, a low hit), `stingMythic` (a huge low hit, a minor chord and bells), `heartbeat` and `slam` (a ribbon landing). They come
from the plan's `cues` list, so they follow its times. Mute and the effects volume are honoured (they go through `sfxBus`). They run through their own `showBus`, so a tap that skips the show
hushes whatever is still ringing (`hushSummon`).

## Skipping, reduced motion, settings
- A tap anywhere on the hall during a show skips it straight to the card reveal (`.hlSkip` over the page). Leaving the tab does the same, as before.
- **Reduced motion**: a calm fade (short charge, the hero fades in, ribbons and cards fade in) with no shake, flash, darkness, thumps, silhouette, rays or particles.
- **Screen shake setting off**: no shake and no white flash (the flare tint stays, much fainter). `rarityFlash` (the card flip's flash) now also honours the setting and reduced motion.
- Battery saver keeps the 30 fps cap.

## Tests and samples
- `test/summon-fx.test.ts`: tiers, the star, plain pulls unchanged, the show growing with rarity, the Mythic's 3 to 4 s, new vs repeat, ten-pulls with extras (capped), lookups, cues in order, reduced motion, determinism.
  The gacha and scenes tests are unchanged.
- `node tools/scenes/summon-shots.mjs` (after `npm run web`; `ONLY=`, `SIZE=360x780`, `REDUCED=1`) plays made-up pulls with the hall's `window.__hall.play(...)` hook and writes contact sheets:
  `docs/samples/summon-epic.png`, `summon-legendary.png`, `summon-mythic.png`, `summon-mythic-dup.png`, `summon-tenpull.png` (Mythic and Legendary new), `summon-reveal.png` (a skipped show into the flip with its tease),
  plus `summon-mythic-360x780.png` and `summon-mythic-reduced.png`.
