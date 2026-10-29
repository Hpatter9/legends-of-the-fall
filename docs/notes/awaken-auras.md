# Class auras for awakened heroes (AWAKEN-002)

**Artwork update:** the pack strips described below have been replaced by generated painted class effects.
See [painted ascension auras](painted-ascension-auras.md) for the current artwork, provenance and validation.
The original implementation and approval record below remains for reference.

The owner's ask: "I want to update the ascended look. The colour change is kind of dumb. Let's do an aura when they
ascend, and a stronger aura when they ascend x2", and then: "the aura depends on the type of character class."

**Status: phase B (the whole game) done on the branch, ready for review.** Branch `claude/awaken-auras` (main 0.186.0
merged in). The owner approved the phase A look (the mock-ups below) with these answers: the look suits; drop the
Werewolf's red sheet; keep the gold glow and gold outline of the rank 4 top form, and give the awakened steps the class
colour instead; the step from 1 to 2 is big enough; keep the art behind one seam so painted art can replace it
([art brief](awaken-auras-art-brief.md)); include the camp.

## The rule

- **No recolour and no colour variant.** An awakened hero keeps its own colours and its top form's sheet. The hue
  turn, the saturation and the brighter finish are gone from the game (`awakenLook.ts` keeps only `stepOfRank` and
  `lookSheet`, which is now the form; `awakenRig.ts` no longer tones pixels; the cinematics no longer use a colour
  matrix). The Werewolf's red sheet is no longer used for an awakened Werewolf (it stays for the red werewolf foes).
- **Step 1 (rank 5): an aura. Step 2 (rank 6): a bigger, brighter one with more parts.** The rank 4 top form keeps
  its gold glow and gold outline; at an awakened step the glow and the outline take the class's colour, so an
  awakening reads clearly over the gold.
- **The aura's style comes from the hero's class trait** (`traitsOf(kind)[1]`), never the origin. All 13 class traits
  have their own style, so no hero needs a fallback (`FALLBACK_AURA`, the guardian's golden shield, is there for a hero
  with no class). "Holy" is an origin trait, so holy heroes take their class's aura. A foe a cinematic shows awakened
  (the Orc Warlord rising) has no class and wears the feral flame (`FOE_AURA`).
- The awakening panel says "An aura: <the class's aura>" for step 1 and "A bigger, brighter aura" for step 2, and the
  awakening burst's rings and word glow in the class's colour.

### The table

Places: **ground** flat under the feet; **wrap** behind the body's middle; **rise** rings rising from the feet; **halo**
flat over the head; **orbit** circling the body (dimmer behind it); **motes** dotted round the body on their own beats;
**trail** speed lines streaming back the way the hero faces. Parts marked † are left out on battery saver. The names
in `code` are the 5000 Pixel Effects strips each part is drawn from today (`tools/awaken/aura-pack.json`; the parts'
own keys, such as `caster.2.orbit`, are listed in the [art brief](awaken-auras-art-brief.md)).

| Class (heroes) | Style and colour | Step 1 (rank 5) | Step 2 (rank 6) |
| --- | --- | --- | --- |
| Guardian (Knight, Peasant, Yamabushi, Paladin) | Golden shield shimmer, gold `#ffd24a` | `light-circle-s` ground ring; `light-shield-s` bubble round the body, added light | `light-circle-sb` wider ring; bigger `light-shield-sb` bubble; `light-aura-s` rising rings; 3 `gold-sparkle-s` motes† |
| Bulwark (Kraken, Juggernaut) | Bronze bastion, bronze-gold `#f0b860` | `sand-circle-sb` ring; `sand-shield-sb` bubble | wider ring plus a second `light-rune-s` ring spinning round it; bigger bubble; `light-aura-s` rings† |
| Blade (Samurai, Ninja Monk, Commander, Barbarian) | Crimson streaks, crimson `#e0304a` | `blood-circle-s` ring; 2 `blood-cut` streaks flicking up beside the body | `blood-circle-sb` ring; `blood-aura-s` rising rings; 2 `blood-slash-b` arcs orbiting; 2 `blood-cut-b` streaks† |
| Marksman (Archer, Lightning Mage, Ranger, Gunslinger) | Wind wisps, pale wind `#dbe8f4` | `wind-circle-s` ring; 2 `white-dash-s` wisps streaming back | `wind-circle-sb` ring; `wind-vortex-s` swirl behind; `wind-aura-s` rings; 3 wisps; 2 `wind-sparkle-s` motes† |
| Gunner (Rifle Bot, Siege Bot) | Gunsmoke and sparks, spark yellow `#f2d35a` | `lightning-circle-s` ring; 2 `white-smoke-s` puffs at the feet | `lightning-circle-sb` ring; `lightning-aura-s` rings; 3 smoke puffs; 2 `lightning-sparkle-sb` sparks† |
| Caster (Wizard, Wanderer, Warlock, Tyrant) | Orbiting arcane runes, violet `#b06cff` | `crystal-rune-s` spinning ring; 2 `crystal-orb-s` orbs orbiting | `crystal-rune-sb` wider ring; `crystal-glyph-s` sigil behind; 3 `crystal-orb-sb` orbs orbiting; `crystal-aura-s` rings† |
| Arcanist (Time Witch, Great Sage) | Starlit sigils, star blue `#7a86ff` | `star-rune-s` ring; 2 `star-sparkle-s` motes | `star-glyph-sb` sigil ring; `star-vortex-s` swirl behind; `star-rune-sb` halo; 2 `star-orb-sb` orbs orbiting; 3 motes† |
| Support (Wolf Bard, Beastmaster, Priestess) | Radiant motes and halo, warm white `#fff0b8` | `light-rune-s` halo over the head; 2 `light-sparkle-s` motes | `light-pillar-s` soft column behind; brighter `light-rune-sb` halo; `light-aura-s` rings; 4 motes† |
| Beast (Werewolf, Minotaur, Satyr, Gorgon) | Feral flame, red-orange `#ff6a2a` | `fire-circle-s` ring; 2 `fire-flame-s` flames at the feet | `fire-circle-sb` ring; `fire-aura-s` rings; 3 bigger `fire-flame-sb` flames; 2 `fire-sparkle-sb` embers† |
| Assassin (Mercenary, Buccaneer, Reaper, Arc Blade) | Shadow smoke, shadow violet `#6a46a8` | `dark-circle-s` ring; 2 `dark-smoke-s` wisps | `dark-circle-sb` ring; `dark-aura-s` rings; 4 `dark-smoke-sb` wisps; 2 `dark-sparkle-sb` motes† |
| Trickster (Kunoichi, Kitsune, Karasu, Illusionist) | Moonlit mist, moon blue `#c6d2ff` | `moon-circle-s` ring; 2 `moon-smoke-s` mist puffs | `moon-circle-sb` ring; `moon-vortex-s` swirl behind; 3 `moon-smoke-sb` puffs; 3 `moon-sparkle-sb` motes† |
| Warden (Cleric, Druid, Shambler, Mummy) | Living green, leaf green `#6cd060` | `forest-circle-s` ring; 2 `forest-sparkle-s` motes | `forest-rune-sb` ring; `forest-vortex-s` swirl behind; `forest-aura-s` rings; 4 `forest-sparkle-sb` motes† |
| Vanguard (Lancer, Dread Pirate, Dragoon, Demon Swordsman) | Heat-haze charge, amber `#ffa040` | `fire-aura-s` rising heat rings, added light; 2 `gold-dash-s` speed lines | `fire-circle-sb` ring; `fire-aura-sb` brighter heat rings; 3 speed lines; 2 `lightning-sparkle-s` sparks† |

Motion: the strips play at 100 to 130 ms a frame, each copy on its own beat; orbits go round about once every three
seconds; the halo bobs a pixel. Nothing blinks off: a part only changes frame, position or (behind the body) dims.

### Rules kept

- **Reduced motion:** every part holds one frame and stays where it is (orbits stop at a fixed angle). The aura stays
  fully visible and never blinks off. The menus' pictures are drawn once, still.
- **Battery saver:** the † parts are left out everywhere, and every aura keeps at least two parts. The menus' aura loop
  runs at 30 a second.
- **No allocation per frame.**
  - In the fight and the cinematics, the sprites are made once per hero and only moved and re-framed after that.
  - On the canvases, one pose object is reused, and the transform is applied and undone by hand (no `save` or
    `restore`). The glow is drawn once per colour and kept.
  - The menus' pictures share one animation loop. It skips pictures scrolled out of sight (`IntersectionObserver`),
    sleeps when none is in sight, and measures a picture again only when its size changes (`ResizeObserver`).
- **Offline:** the atlas (about 58 KB) is bundled in `game.js`. Nothing new is fetched by URL.
- **Deaths:** a fallen hero's aura goes out with it.

## The art seam

`auraStyles.ts` names the parts and places them. A part's frames come only from the atlas `src/art/fx/aura/atlas.png`
with `atlas.json` (`{"cell": 32, "parts": {"<class>.<step>.<part>": [column, row, frames]}}`), read by `auraArt.ts`.

- **Today:** `tools/awaken/aura-sheets.py` builds the atlas from the pack, by the key-to-strip map in
  `tools/awaken/aura-pack.json`.
- **Painted art later:** `tools/awaken/import-aura-art.py <folder> 96` builds it from painted sheets, under the same
  keys, with no code change. I tried it with stand-in sheets: 80 parts were packed and the aura tests passed. Then the
  pack atlas was put back.
- **What to paint:** [awaken-auras-art-brief.md](awaken-auras-art-brief.md) lists every part of every class at both
  steps, the frames, the cell size, the angle, and a prompt for each class.

## Where the aura shows

| Place | File | How |
| --- | --- | --- |
| Fights (normal runs, armies, daily, the spire) | `render/unitView.ts` | Pixi `AwakenAura`, behind and in front of the body |
| Last Stand | `render/unitView.ts` (through `sim/stand.ts`'s `awaken`) | the same; no Last Stand file changed |
| Cinematics (the awakening scene and the rest) | `render/sceneView.ts` | Pixi `AwakenAura` on the actor, when its look is 1 or 2 |
| Camp (the Battle tab) | `camp.ts` | `drawAura` round each party hero |
| Tavern | `tavern.ts` | `drawAura` round each hero in the rooms |
| Summoning hall | `hall.ts` | `drawAura` as the hero rises, fading in with it |
| Calamity map | `calMap.ts` | `drawAura` round the walking leader (its canvas has room for it) |
| War council tableau | `partyScene.ts`, `party.ts` | a still `drawAura` (the tableau is a still picture) |
| Roster cards and the dossier | `menuHeroes.ts` | `wearAura`: a canvas behind the picture and one over it |
| Rank up card (before and after) | `rankUpView.ts` | `wearAura` on the "after" picture of an awakening |
| Awakening panel and burst | `awakenView.ts`, `awaken.css` | the class's aura named in the panel; the burst in its colour |

**Calamity fights show no aura.** The Calamity is a run that levels its own heroes (`run.local`): it reads nothing of
the meta, awakening included (`boostFor` in `main.ts`), as before this change. The aura would show there through the
same `unitView.ts` if that rule changes. The Calamity map's leader does wear it, as it wore the recolour before.

**The summoning hall:** only new heroes are summoned, and a new hero cannot be awakened, so in play the hall shows no
aura. It is drawn if an awakened hero ever comes out of the circle; the picture below makes that happen on purpose.

## Files

- `src/render/auraStyles.ts`: the table (`AURAS`, `auraOf`, `auraParts`, `auraKey`, `AURA_KEYS`, `FALLBACK_AURA`,
  `FOE_AURA`). Pure.
- `src/render/auraPlace.ts`: where each piece sits at a moment (`poseAura` into a reused `AuraPose`). Pure; shared by
  both renderers.
- `src/render/auraArt.ts`: the atlas (`AURA_CELL`, `AURA_PIXEL`, `auraStrip`, `loadAuraImage`).
- `src/render/awakenAura.ts`: the Pixi aura (`AwakenAura`, `loadAuraArt`, which `loadFx` awaits).
- `src/render/auraCanvas.ts`: the canvas aura (`drawAura`, `drawAuraGlow`, `wearAura`).
- `src/render/awakenLook.ts`, `src/render/awakenRig.ts` (`awakenedStep`), `src/render/sheets.ts` (`figureShare`).
- Tools in `tools/awaken/`:
  - `aura-sheets.py` and `aura-pack.json`: build the pack atlas;
  - `import-aura-art.py`: build it from painted sheets;
  - `aura-mock.mjs` and `aura-sheet.py`: the phase A mock-ups;
  - `aura-places.mjs` and `aura-places-sheet.py`: the phase B pictures.
- Tests:
  - `test/awaken-auras.test.ts` (4): every class trait has its own aura, and every hero wears its class's; a foe
    wears the feral flame; no aura below step 1; step 2 has more parts and is no smaller; battery saver drops only the
    extras; every part key is in the atlas and in the pack map; placing reuses the caller's pose, stays within its
    strip and holds still under reduced motion.
  - `test/awaken.test.ts`: its look test now checks that there is no recolour and no colour variant (the owner's
    approved change).

## Pictures

Phase B, real captures of the built game in headless Chromium at 2x:

- [Every place at 393x852](../samples/awaken-auras-places.png)
- [Close-ups](../samples/awaken-auras-closeups.png)
- [The three phone sizes](../samples/awaken-auras-sizes.png)
- [Reduced motion and battery saver](../samples/awaken-auras-calm.png)

Phase A mock-ups (approved): [contact sheet](../samples/awaken-auras-mock-sheet.png), motion of the
[Wizard](../samples/awaken-auras-mock-motion-wizard.png) and the [Werewolf](../samples/awaken-auras-mock-motion-werewolf.png).

## Validation

- `npm run typecheck`: passed. `npm run web`: built.
- `npm test -- awaken party camp tavern hall calMap`: 40 of 40 passed while building.
- Full `npm test`: **1252 of 1252 passed**, none failed, cancelled or skipped. That includes `test/awaken-auras.test.ts`
  (5) and the updated look test in `test/awaken.test.ts`.
- `tools/awaken/aura-places.mjs` captured every place in the built game (headless Chromium, 2x) at 393x852, 360x780
  and 412x915, plus reduced motion and battery saver at 393x852, with **no page errors**.
- Under reduced motion the auras are drawn still and stay visible; under battery saver the extra parts are gone.
- `tools/awaken/import-aura-art.py` was tried with stand-in sheets: 80 parts packed, and the aura tests passed on its
  atlas. The pack atlas was rebuilt afterwards.
- Not measured: frame rate on a real phone.
