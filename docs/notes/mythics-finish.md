# The Mythics finished

The owner, of the five Mythic heroes (Vael, Astrax, Ilyra, Orrun and Nyxara; [mythic-heroes.md](mythic-heroes.md),
[fix-main-mythics.md](fix-main-mythics.md)): "extremely rare and hard to get. They need to feel epic and look very impressive. Only 1 can be
used at a time." And now: "This is done but needs skills and finished." Branch `claude/mythics-finish`, from main 0.398.0.

## The audit (what was missing or borrowed)

| | Vael | Astrax | Ilyra | Orrun | Nyxara |
|---|---|---|---|---|---|
| Skill 1 | own painting (atlas-11), ordinary size | same | same | same | same; mechanically a plain 2x strike, no tie to her kit |
| Skill 2 | **borrowed**: Holy Challenge, tinted | **borrowed**: Hex | **borrowed**: Sanctuary | **borrowed**: Heart of the Grove | **borrowed**: Temporal Surge |
| Skill 3 | **borrowed**: Earthquake | **borrowed**: Meteor | **borrowed**: Holy Light | **borrowed**: Call Treant | **borrowed**: Temporal Surge (the same as her skill 2) |
| Ultimate look | own painting, but its cast and hit sheets (`SKILL_FX`) were **Judgement's** | **Starfall's** | **Resurrection's** | **Heart of the Grove's** | **Temporal Surge's** |
| Ultimate cut-in | the **shared** slash (portrait band), like every hero | same | same | same | same |
| Showcase | a **generic** burst: no props, no hits of its own | a generic sky: no props | a generic blessing: no props | the same blessing, in green | the same blessing, in violet |
| Size and fullness | drawn at an ordinary hero's size, three layers or fewer | same | same | same | same |
| Rank shards | **none possible**: never pulled, so never a repeat's shard; no rank, no awakening, no talent points beyond the start | same | same | same | same |
| Awakening | the base portrait and sprites at both steps (`heroArtwork.ts`, `AWAKENED_SHEETS_LATER`); an ordinary aura | same | same | same | same |
| Showcase poses | none (ordinary pilots have painted poses for some) | none | none | none | none |

Also checked and complete already: lines, quips, taunts, heir names, books, legacy perks, talents (`talentsDeep.ts`), codex, tavern spots,
level-5 steps, chips, icons, quest words, trial aspects.

## What changed

### Every skill its own painted look (`signatures.ts`, `individualReleases.ts`, `atlas-12`)

- **Ten new paintings** for skills 2 and 3, in a new atlas `src/art/fx/abilities/atlas-12.png` with catalogue rows, made by
  `tools/mythics/finish-art.py`. Each layers two frames of the existing painted spell sheets (`art-source/spell-fx`), scaled and recoloured,
  so none repeats a cell any other skill or spell uses (the source-cell test checks it honestly: every cell is a different picture):
  Solar Aegis (a gold shield before a sunburst), Crownfall (a black-gold eclipse ring slamming into a golden crack), Star Hunger (a blue
  galaxy swallowing a violet orb), Comet Lance (three blue-white comets behind a burning star), Unburied Mercy (a red grave-lily in a pale
  mist: Ilyra's painting has the lilies), Broken Halo (a golden halo with a wedge broken out), Living Sanctuary (a ring of living runes round
  an emerald wheel), Heartwood (thorned heartwood round an emerald heart), Stolen Tomorrow (a violet star chart over a stopped clock),
  Unmake (violet shards round a cracked web).
- **Ten new signatures** for them, out of `KIT_LOOKS`. Their elements (wind-up glow and sound) are unchanged, now in `SKILL_ELEMENT`.
- **All twenty Mythic moves are grander**: the releases are larger (a single-release ultimate's lead 4.2 to 4.8, against an ordinary
  hero's largest 4.5; Heavenfall rains five), every skill has three cast layers, every skill 1 and ultimate two hit layers, every ultimate
  five cast layers (no ordinary ultimate has more than four) and a three-layer wind-up; and `fx.ts` plays a Mythic's skills and ultimate a
  fifth larger again. Every supporting layer is in a colour of its
  own, so no layer of a Mythic move is shared with any other look (tested against every signature, heroes', foes' and the twenty's).
- The ultimates' **own** cast and hit sheets in `SKILL_FX` (they were aliases of Judgement, Starfall, Resurrection, Heart of the Grove and
  Temporal Surge).
- Flourishes are deliberate (spirals, sprays, rings); nothing loops its brightness and nothing blinks off and on. Reduced motion is the
  signature player's own (held frames).

### Mechanics

Each kit already plays distinctly (Vael's eclipse and totality, Astrax's stars, Ilyra's mercy and grace, Orrun's wounds and sanctuary,
Nyxara's memories and foretelling) inside the Mythics' own power budget. One skill read thin: **Fate Shard** was a plain strike with no tie
to her kit. Now it aims at a foe she has foretold, hits it 3.6x instead of 2x and holds the mark a second longer, so her three skills work as
one (foretell, shatter, unmake). The trial aspect (which uses Fate Shard) never foretells, so the trial fights are unchanged.

### The ultimate: a cut-in of its own (`mythicCutRules.ts`, `ultMoment.ts`, `fightHud.css`)

A Mythic's ultimate no longer opens with the shared slash. Its **whole painting** stands in a gilded frame, its **sigil** (its showcase
prop) turns behind it, and beside it the word **Mythic**, its name and title, the ultimate's name and a motto ("The sun does not rise
today"). Each comes in its own way and colours: Vael's frame drops as the black sun eclipses behind it (gold on black); Astrax's sweeps down
out of the upper right (white on deep blue); Ilyra's rises as the halo settles (ivory and crimson); Orrun's grows up out of the ground
(emerald on loam); Nyxara's opens out of two mirrored halves while the clock turns backwards (violet on night). The timings are the
opening's own (nothing about the hold changes), only transforms and clips move, and reduced motion fades it in and out, held still. The
painting and sigil are warmed with the portrait before the fight; the painting is already precached (`heroes/*.webp`), the sigils are
bundled.

### The showcase (`ultShowRules.ts`, `ultShow.ts`, `showArt.ts`)

Each has its own words, hits and painted props (five new props, `src/art/ult-show/mythic-*.webp`, layered by the same script): Vael's black
sun swells and eclipses over him and a small one marks each foe his sweep **cuts** (it was a generic smite); Astrax's star chart opens over
him and a constellation falls over each crowd; Ilyra's halo rises over her and settles over each ally in turn; Orrun's world tree climbs out
of the ground behind him and a small one rises at each ally; Nyxara's clock of fate turns backwards under her and over each ally drawn back.
Lengths are unchanged (4 to 6 s with the opening and fade, tested).

### Rank shards from the trial (`mythicEcho.ts`)

Mythics never come from pulls, so they could never earn a rank shard. Now a Mythic's trial, once won, stays on the quest log's Done tab as a
Replay (as every quest battle does), and **a replay won pays that Mythic 2 rank shards, once a day per Mythic, never past `SHARD_CAP` (26:
the top rank and both awakenings)**. A lost try pays nothing; the first win pays nothing extra (it gives the legend). So the top rank takes
five days of replays and the last awakening thirteen at the soonest, each a hard trial won without a Mythic. Saved as `Meta.trialShards`
(the day each was last paid; sanitised on load). The Replay button says what it pays; the fight's toasts say what it paid.

## Art that does not exist yet: prompts

The awakened Mythics keep their base portrait and sprites (no art exists). For the owner to make with ChatGPT image generation, then cut with
the existing awakening tools; until then the code keeps the base art (`heroArtwork.ts`, `AWAKENED_SHEETS_LATER`).

Prompt (one per Mythic; the same frame and rules as the other awakened paintings in `src/art/heroes/awakened-*.webp`):

```text
Paint the AWAKENED form of an existing character for the fantasy game Legends of the Last Keep. Use the attached painting of the character
as the exact reference for face, body, armour, colours and silhouette: the same being, risen to its full legend. Portrait orientation
768x1152, full figure, painterly high-fantasy oil style matching the reference, dramatic rim light, no text, no frame, no logo.
- Vael, the Eclipse Sovereign: the black sun behind him has fully eclipsed and its corona is a crown of gold fire; his armour is edged in
  molten gold, his cloak is torn into the dark of the eclipse, the greatsword burns with a thin golden line.
- Astrax, the Last Star: the dragon blazes white-gold from the star in its chest, constellations trace along its wings, its crest is a crown
  of small stars, the sky behind is a meteor shower.
- Ilyra, the Unburied Saint: the broken halo is whole and burning above her, red grave-lilies bloom at her feet and float round her, the
  spear is lit like a sunrise, her robes are white and crimson in a wind.
- Orrun, the Worldroot: the antlers have become a living canopy with gold leaves, the emerald heart blazes, roots spread from his hooves
  into a glowing ring of runes.
- Nyxara, Queen of the Unwritten: more crystal shards of possible futures orbit her, a great clock face hangs behind her running
  backwards, her gown dissolves into stars at the hem.
```

Showcase poses (like the Samurai's crouch or Ayame's kneeling finish, `src/art/ult-show/`): one each, cut out on a transparent background,
facing right, 256 px tall, the pixel-art style of the battle sprites (`src/art/units/mythic_*.png` as the reference):

```text
Pixel-art pose for the fantasy auto-battler Legends of the Last Keep, matching the attached battle sprite exactly (palette, outline,
proportions, shading). Transparent background, facing right, one figure, no ground, no shadow, no text, 256 px tall.
- Vael: greatsword raised two-handed overhead at the top of a sweep, cloak flaring.
- Astrax: rearing up, wings spread wide, breath gathering as a white star in its jaws.
- Ilyra: spear planted, other hand raised to the sky, halo bright above her.
- Orrun: rearing on hind legs, antlers lowered, roots bursting from the ground under his forelegs.
- Nyxara: staff raised, both hands open, crystal shards drawn in round her.
```

## Tests

New, `test/mythics-finish.test.ts`: every Mythic move has a painted look of its own (none borrowed, every lead its own source cell); no layer
of a Mythic move is shared with any other look and no other look leads with its strip; a Mythic's looks have more layers than any ordinary
hero's and its ultimate is about the largest; each Mythic's cut-in has its own entrance, sigil and colours (and no ordinary hero has one);
trial shards pay 2 once a day up to the cap and nothing otherwise; Fate Shard's foretold strike.

Changed: `individual-ability-fx` now expects the catalogue to hold the Mythics' skills 2 and 3 as well (181 rows; it checks every one of
the ten has its own cell), which is stricter. No test was loosened or removed.

## Checks

- `npm run typecheck`: clean. `npm run web`: builds; `heroes/*.webp` (the paintings) are already in the service worker's list, and the new
  atlas and props are bundled into game.js, so the cut-ins and looks play offline.
- The full `npm test`: 2,720 tests, all pass (one combat-fx and one skill-keys failure along the way were fixed by moving the ten elements
  into `kitLooks.ts`, `MYTHIC_KIT_ELEMENT`, where `kitElement` reads them; no test was changed for them).
- The combat-HUD probe with each Mythic fielded first (`PARTY=<mythic>,knight,cleric,wizard,archer SCENES=ult,mid SIZES=393,360,412 node
  tools/combat-hud/probe.mjs`): 0 overlaps in every case, five Mythics, three sizes, army and Calamity. Its single tap caught a Mythic's
  cut-in only for Orrun (57 parts), so `tools/mythics/finish-shots.mjs --ult-only --size <w>x<h>` measures every Mythic's cut-in words and
  frame against the top bar, spell row, Auto, mana, tactic button and hero rows: 0 overlaps and all on screen, all five at 393x852, 360x780
  and 412x915, and with reduced motion at 393x852.
- `node tools/mythics/finish-shots.mjs`: [the pictures](../samples/mythics-finish/) of each Mythic's three skills and its ultimate (cut-in
  and showcase) mid-cast at 393x852 ([contact sheet](../samples/mythics-finish/contact.jpg)); 0 page errors, 0 missing files. The software
  renderer stalled on one heavy frame now and then; the tool takes the picture a frame later.
