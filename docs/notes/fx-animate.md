# Effects that move (FX-ANIMATE)

The owner's note: the fire the Meteor leaves "just sits there"; every effect should look animated. Presentation only: the sim, the events and the
identity hashes are untouched.

## What was wrong

Every painted combat strip (`PACK`, `VFX`, the ability art: `materialFrames`) is **six copies of one still picture**; its life is meant to come from
a pose (`paintedPose`: scale, turn, fade). So:

* anything that fades through a pose got one slow grow-and-fade and then *held* (a burst, a ball, a ring, a ward, a flame);
* anything that just cycled `sprite.texture = frames[i]` showed **nothing moving at all**: the burning ground (the fire a Meteor or a
  Wizard's skill leaves), `lookLoop` (every pack loop a look held on a fighter or tile), the Ranger's Spike Field fallback;
* a few hand-drawn pieces had a constant size or opacity: the meteor's tile marks, its falling ball, its crater.

The painted *spell sheets* (`src/art/fx/spells`, the status atlas: real frames) were fine; a check of the status atlas showed all 35 parts
with six genuinely different frames, and the sheet effects were seen moving in the audit.

## How it was checked

`tools/fx-animate/audit.mjs` (needs `npm run dev`) feeds 319 effects to `__game.fx` in a real lab fight and steps it by hand: every skill name
(202: the catalogue, signatures, kit looks, move and area paints), all 21 king's spells, the volley, the Eidolons' calls and strikes, the land's
hazards, ten boss signatures, hits (blow, heavy, kill), each of the 11 ailments (hit and tick), each shot, and the swings, arcs, zones, traps,
bursts, terrain, revives and auras. For every sprite that lived 350 ms or more it records position, scale, turn and frame, and counts how long it
**holds** (does none of them; fading does not count). `skill.mjs`, `meteor.mjs` and `ailment.mjs` make frame strips.

| | sprites | held still | share of their life held |
|---|---|---|---|
| before | 4403 | 475 | 15% |
| after | 4455 | 162 | 4% |

By group, sprites that sat (before -> after): hero skills and ultimates 435 -> 156, king's spells 30 -> 1, hazards 4 -> 0, misc 6 -> 5 (the
rest was already moving: boss signatures, Eidolons, hits, shots, ailments). What remains are slow tails of eased motion (a ward settling) and a
few one-sprite holds, each under a third of its life. Reduced motion holds every pose still on purpose (`calm`), as before.

### The static ones (before)

| Effect | Why it sat | Now |
|---|---|---|
| Burning ground (Meteor, Wildfire, Inferno Breath, any `zone`) | six identical frames cycled | each flame leans, stretches and sways to its own beat (`paintHeld`), and sparks and smoke lift off it |
| Pack loops held on a fighter or tile (`lookLoop`) | same | posed the same way |
| Fire/blood/dust bursts, hits, novas (every `explosion`/`hit` family: the Meteor's blast) | grew once, then held | slams out fast, keeps swelling as it fades; fiery ones billow upward, twist and lick |
| Rune, circle, aura rings | fixed | turn slowly and breathe (never when drawn squashed on the ground) |
| Shields and wards | near fixed | breathe, sway, float; opacity stays steady |
| Held flames and ailment-style stills | small wobble | height, lean and lift wander (three sines that never line up); smooth, never blinking |
| Orbs and fire balls | fixed | pulse, and fire ones sputter |
| Sparkles and crosses | spin only | twinkle in size and drift up |
| Smoke and puffs | grew | also rise and drift |
| Bolts and pillars (`strike`, `pillar`) | grew | drop into place from above, then shimmer |
| Spikes | grew from the middle | jab up out of the ground with their foot fixed |
| Meteor: tile marks | constant opacity | breathe, quicker as it nears (steady in reduced motion) |
| Meteor: falling ball | fixed size, no flicker | swells as it comes, sputters, its tail lashes |
| Meteor: crater | a still ellipse | embers glow and waver, cool, shed sparks and smoke |
| Spike Field fallback runes | fixed | each bristles on its own beat |

Nothing blinks: poses only change scale, lean, lift and turn (`flicker` is a smooth sum of sines); opacity stays on the old fade, and the held
families keep it constant (`test/cinematic-fx.test.ts` still checks that).

## What changed in the code

* `cinematicRules.ts`: `paintedPose` now takes the art's form and returns a lift (`dx`, `dy`, in frame widths) as well as scale, turn and fade;
  `flicker`.
* `cinematicArt.ts`: materials remember their form; `paintSprite` returns the pose (and takes `flat`, so squashed ground rings never turn);
  `paintHeld` poses a still that is simply held.
* `particles.ts`: a bit keeps its own drift apart from the pose's lift.
* `fx.ts`: burning ground, `lookLoop`, the meteor's marks, ball and crater, the Spike Field fallback.
* `test/fx-animate.test.ts`: each family moves, nothing dims out, reduced motion is still.

## Samples (`docs/samples/`)

`fx-animate-before-meteor.png` / `fx-animate-after-meteor.png` (the King's Meteor, 393x852; 360x780 and 412x915 alongside),
`fx-animate-before-meteor-burning.png` / `fx-animate-after-meteor-burning.png` (the Wizard's Meteor and the fire it leaves, ten frames 110 ms apart).
