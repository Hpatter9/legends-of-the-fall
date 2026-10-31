# The Eidolons' strikes, made powerful (EIDOLON-FX)

The owner: "Make sure the effects are good for the Eidolons and powerful. Redraw effects if needed." Then, from the director: the owner made
Gemini sprite sheets for all six Eidolons; cut them into the game, replace the pack sprites and give Voltara hers. Branch
`claude/eidolon-fx` (from `claude/eidolon-call-2`). It changes the page only: the strike's rules and numbers (`sim/eidolons.ts`) and the
call's beats and times (`eidolonRules.ts`: about 4 s, the tap skipping to the strike) are untouched.

## What was weak (the review, frame by frame)

The strips (`docs/samples/eidolon-fx-<id>-before.png`: the sprite on, two build-up frames, the blow in the hit-stop, three impact frames,
the aftershock, two of the aftermath) showed:

- **Scale.** Everything on the foes was a 32 px pack strip blown up 2 to 2.6 times: one burst about 80 px across a foe, nothing near
  filling the foes' half. Blown up that far they turned to flat blobs: Askel's fire bursts were orange circles, Aurelan's pillars of light
  plain yellow bars, Voltara's bolts thin yellow zigzags, Gorm's and Vaelkhar's bursts ring outlines.
- **Layering.** One layer: a run to each foe, then one rise over it. No great burst, no shockwave, no debris, nothing after the first beat
  on our layer (the aftershocks were only the fight's own ultimate bursts, under the dim), and the aftermath was a tint and a few motes.
  (The drifting motes were in fact never seen: a strip inside a mover had no box of its own; fixed.)
- **Weight.** The hit-stop and the fight's shake were there, but the flash was a soft 0.55 glow, there was no bloom, no anticipation
  (the field did not darken or gather before the blow), and the cinematic's own layer did not shake with the board.
- **Readability.** The sprites were pack stand-ins (a silver Asian dragon for Nivra, a small walking lion, a black dragon hanging in front
  of the foes) and Voltara had none.

## What plays now

`src/eidolonFx.ts` (pure, tested) holds each Eidolon's layers; `eidolonCall.ts` lays the whole blow out at the strike, each strip with its
own delay, so it rolls on by itself and freezes with the rest in the hit-stop (a negative delay starts the great burst part-way, so the
frozen frame is already blazing):

1. **The charge** (the build-up): the field darkens more (`DIM` x 0.82) and a ring of the element closes on the foes' middle, brightening,
   arriving as the strike lands.
2. **The blow** (the strike, in the hit-stop): a hard white flash (0.8, gone in half a second; lighter for the light and the bolt, whose
   hearts are white already), a bloom of the element's light over the foes' half, the **shockwave ring** along the ground as wide as the
   screen, and **one great burst** on the foes' middle (the ultimate's element bursts, about 470 px).
3. **The pillars**: over each foe the Eidolon's own, rolling across them left to right 55 ms apart: Askel a wall of fire roaring up and
   breaking into embers, Nivra spears of ice bursting up and shattering, Aurelan a lance of gold light out of the sky (a shaft slammed down
   from the top of the screen, then the beam striking), Voltara a bolt out of the sky (a thin shaft and the storm cloud's bolt), Gorm stone
   spires bursting up and crumbling, Vaelkhar black and violet fire. Debris is flung from each (embers, ice, sparks, sand, violet embers).
4. **The aftershocks**: six secondary bursts (two on battery saver) spread over the foes' half (`extraSpots`: round the foes' spread, at
   least 70% of the screen across, by the golden angle), one every 95 ms after the blow; the fight's own ultimate bursts still play under
   them on the later beats.
5. **The shake**: the cinematic's board layer shakes with the board as the freeze lets go (the fight's camera shakes the board's picture).
6. **The aftermath**: the element left on their ground (fire burning, ice standing, a curtain of light, crackling sparks, the glowing
   fissure, violet fire), fading in with the aftermath and out as the fight runs again.

| Eidolon | Pillar | Great burst | Aftershocks | Lingers |
|---|---|---|---|---|
| Askel | `askel-pillar` (fire wall rise and break) | `fire-burst` | `fire-burst` | `askel-after` (fire wall) |
| Nivra | `nivra-pillar` (ice wall rise and break) | `ice-burst` | `ice-burst` | `nivra-after` (ice wall) |
| Aurelan | `aurelan-pillar` (orbital strike, gold) + shaft | `light-burst` | `aurelan-extra` (divine smite) | `aurelan-after` (wall of light) |
| Voltara | `voltara-pillar` (storm cloud bolt) + shaft | `lightning-burst` | `voltara-extra` (lightning storm) | `voltara-extra` |
| Gorm | `gorm-pillar` (stone wall rise and break) | `earth-burst` | `gorm-ring` (launch ring) | `gorm-after` (fissure) |
| Vaelkhar | `vaelkhar-pillar` (fire wall, black and violet) | `dark-burst` | `vaelkhar-extra` (reign of terror) | `vaelkhar-after` |

The build-up's trail flares and the runs' heads (the old 32 px strips) are drawn smaller, so they lead the eye without turning to blobs.

## The art

- **Redrawn from the game's own painted spell sheets** (`tools/eidolon-fx/cut_fx.py`, from `art-source/spell-fx/`, 256 px cells): cut to
  160 px frames as `src/art/eidolons/fx/<name>.webp`, Aurelan's beam recoloured gold and Vaelkhar's fire black and violet by brightness
  ramps. They load by URL and the service worker keeps them (`build.mjs` copies `src/art/eidolons/fx/` and adds it to `FILES`).
- **One generated sheet**, the shared impact ring (`impact-ring.png`): PixelLab's VFX artist (the 1.75 generations left on the account; one
  used), eight frames of 100 x 97 doubled by whole pixels, tinted per Eidolon by a CSS filter.
- **Not generated: Gemini.** The brief asked for Gemini effect sheets; every Gemini image model answered `429 RESOURCE_EXHAUSTED` (the key's
  free-tier image quota is 0), and the OpenAI image API had no credits. The thirteen prompts (a fire wall, a fire blast, ice spikes, a frost
  nova, a lance and a burst of light, a lightning bolt and burst, earth spikes, a rock burst, shadow flame, a shadow burst and the impact
  ring) are in `art-source/eidolons/fx/PROMPTS.md`, with `tools/eidolon-fx/gen.py` to make them once billing is on and how to cut them in.

## The sprites (the owner's Gemini sheets)

`tools/eidolon-fx/cut_gemini.py` cuts `art-source/eidolons/gemini/<id>-sheet.jpg` (from `art/gemini-eidolons`) the way Askel's was cut:
the magenta and its JPEG fringe keyed out (only where red and blue are near equal, so Vaelkhar's violet fire and Aurelan's rose mane stay,
and Aurelan's faint grid lines go), brought down by a whole factor (3 or 4) a block at a time with hard alpha, bits not joined to the
creature dropped (Voltara's dust puffs, Gorm's stray rock), every frame centred on its body and standing on one baseline. The walk frames
are found by the empty columns between them; the attack frames are given by their columns, as the breathing frames run into each other
(Aurelan's roar row is uneven, his leap row taller). Frames cropped by the breath before them (Nivra's last two) are made whole on the
wind-up frame, matched at the mouth and the feet. The breath, beam or bolt is cut off at the mouth or hands as its own strip
(`<id>-breath.png`; for Voltara and Vaelkhar the long one running on past its cell), and the page draws it from the mouth across the foes.

| Eidolon | Walk | Attack | Its element |
|---|---|---|---|
| Nivra | slither, 6 | rears, opens her jaws (3), breathes (2) | frost breath, 2 frames |
| Aurelan | gallop, 4 | stands, roars, pours sunlight (2) | the sunlight beam, 2 frames (the lances still fall from the sky) |
| Voltara | glide, 5 | arms raised crackling (2), hurls the bolt (3) | the long bolt |
| Gorm | stomp, 6 | hammer down, raised, swung, **slam**, recover | none: the cracks run from the hammer |
| Vaelkhar | flight, 6 | rears (2), pours black fire (3) | the long black-violet torrent |

The fliers (Voltara, Vaelkhar) now hang to the side of the foes, not in front, as their sheets are side-on; every breath leaves the way the
sprite faces (tilted at most a little to the foes' height, mirrored rather than turned over when it points left), as a sprite held inside
the screen can stand close to the foes' middle. Vaelkhar's lilac crown fire is mostly lost to the key (it is the colour of the
background); the old pack cutter (`tools/eidolon-call-2/cut_sprites.py`) is marked superseded, as it writes the same files.

## Reduced motion, battery saver, no flicker

Reduced motion: every strip holds its brightest frame (`hold`) and fades in and out; no charge closing, no debris, no shafts, no shake;
the blow's flash a steady 0.25. Battery saver: two aftershocks, two debris a foe, at most three lingering patches (and the runs and pillars
to five foes, as before). Nothing loops a brightness: the lingering loops only step their frames (`test/no-flicker.test.ts` passes); the
flash and the bloom are one-shots.

## Tests

`test/eidolon-fx.test.ts` (4): every Eidolon has its layers, each strip in the game with the frame count it says and big enough (the burst
at least 420 px, the pillars 240), the aftermath looping; the strips credited and in the offline list; the aftershocks spread at least half
the screen across, inside it, one after another and all before the aftermath; saver draws less, reduced motion flings no debris.
`test/eidolon-pass.test.ts` updated for the owner's sheets (all six have a sprite now, Voltara too; all but Gorm breathe their element;
all six credited).

## Checked

`npm install`; `npm run typecheck`; `npm test -- eidolon flicker` (32 pass); the full `npm test` (1948 pass, 0 fail); `npm run web`.
`tools/eidolon-fx/shots.mjs` (the strike densely: the sprite, two build-up frames, the blow, three impact frames, the aftershock, two of
the aftermath) and `strip.py`: `docs/samples/eidolon-fx-<id>-before.png` and `-after.png` for all six at 393x852, the impact frame of each
(`eidolon-fx-<id>-impact.png`), and after strips at 360x780 (Askel, Voltara), 412x915 (Nivra, Vaelkhar), reduced motion (Askel, Gorm),
battery saver (Askel) and the short call (Aurelan). No page errors, no missing files, no sideways overflow.
