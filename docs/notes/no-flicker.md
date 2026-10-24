# No flicker

The owner's rule: no flashing. No looping blink, pulse or strobe; a full-screen flash is one-shot, at most 0.5 alpha, about 120 ms. A slow sway or drift that never changes brightness is fine.

## What was found, and what was done

| Where | Flicker | Fix |
| --- | --- | --- |
| `camp.ts` firelight | glow alpha swung 0.46 to 0.98 (sines at 8, 2.4 and 21 Hz) | steady 0.8 |
| `camp.ts` stars | each star's brightness twinkled | steady |
| `camp.ts` campfire flame | rows waved and the height "breathed" at about 16 Hz | slow lean only (period about 4 s), height holds still |
| `tavern.ts` lamps and fire | same fast sine flicker | steady 0.55 |
| `castle.ts` window, forge, lantern glows | pulse 0.22 to 0.88 | steady 0.6; rune motes no longer shimmer |
| `hall.ts` braziers, crystals, circle, star glow | flicker and breathing | steady; the brazier flame is held on one frame of the six |
| `render/fx.ts` target tiles, poison patch, trap | pulsing alpha | steady alpha |
| `calmap.css` `.cmGlow` | 6 s opacity breathe | steady |
| `calmap.css` / `campPlaces.css` portal | stepped glow strip | held on one frame |
| `rogue.css` `.tbTorch` (tower torches), `.rtFlame` | stepped flame frames, brightness 1.2 flicker | steady; dead `rtFlicker` and `rtGlowText` keyframes removed |
| `index.html` loading screen | looping impact bursts, slash, sparks | removed (the two fighters and the embers stay) |
| `index.html` `glow`, `pulse`, `twinkle`, `shimmer`, `armed` | looping brightness, shadow and badge pulses (already switched off by `pixel.css` on most) | animations and keyframes removed at the source |
| `pixel.css` | unused `pxBlink` and `pxArmyGlow` keyframes | removed |
| `main.ts` boss bar | `hidden` written about 25 times a second even when unchanged | written only on change |
| `menuArt.ts` `icon()` | a rebuilt menu made new `<img>` elements that decoded late (an empty box for a frame) | icons are warmed as the page loads and set to decode synchronously |

Left as they are (one-shots or movement, not brightness): the 120 ms combo-bar blink, the boss card flash (0.45 alpha, 120 ms), the Calamity clear flash (0.4, 120 ms), the awakening flash, bobbing and swaying items, falling leaves and embers, the chest shake. The lightning bolt's re-drawn path in `fx.ts` is a spell effect (another worker's area), so it is untouched.

## How it was measured

`npm run web`, served, Playwright at 393x852 on a fresh save (past the opening and starter pick). For each screen, 24 screenshots 60 ms apart; a pixel counts when its brightness swings by more than 12 levels up and then down (two reversals or more). This counts moving sprites too (heroes idling, patrons walking, the rune ring turning), so it is an upper bound.

| Screen | Before (px) | After (px) | What is left |
| --- | --- | --- | --- |
| camp | 8025 to 9962 | 4079 to 6175 | the five heroes idling, clouds, the flame's slow lean |
| recruit | 1916 to 5721 | 1380 to 1936 | the runes turning on the circle's rim, the summoner |
| heroes (tavern) | 1638 | 0 to 1709 | walking patrons |
| castle, settings, achievements, party, armies | 0 | 0 | |
| spells | 48 | 8 | the floating motes over the book |
| deploy | 345 | 288 | the foes' idle frames |

A DOM mutation probe (4 s idle per screen) found no menu rebuilding on a timer; the only repeated write was the boss bar's `hidden`, now guarded.

## Guard

`test/no-flicker.test.ts` fails if any looping css animation changes opacity, filter, shadow or colour, or if a camp, tavern, castle or hall light level is set from a sine.
