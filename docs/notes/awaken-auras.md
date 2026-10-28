# Class auras for awakened heroes (AWAKEN-002)

The owner's ask: "I want to update the ascended look. The colour change is kind of dumb. Let's do an aura when they
ascend, and a stronger aura when they ascend x2", and then: "the aura depends on the type of character class."

**Status: phase A (proposal and prototype), waiting for the owner's approval of the look.** Branch `claude/awaken-auras`
(from main 0.180.0). Nothing outside the fight board has changed yet.

## The proposal

- **No recolour.** An awakened hero keeps its own colours and its top form's sheet. The hue turn, the extra saturation
  and the brighter finish (`toneOf`, `lookFilter`, `tonePixels` in `src/render/awakenLook.ts`) go.
- **The Werewolf's red sheet goes too.** It is a real pack sheet, not a recolour, but it is still a colour change, the
  thing the owner called dumb, and the beast's flame aura now marks it. (Easy to keep if the owner prefers it:
  `PACK_VARIANTS` stays in `awakenLook.ts` and only the fight board stopped reading it.)
- **Step 1 (rank 5): an aura. Step 2 (rank 6): a bigger, brighter one with more parts.** Step 2 uses the pack's bright
  (`-b`) strips, larger rings, and adds rising rings and extra motes; the soft glow behind the body is stronger, and the
  rim round the body takes the aura's colour at both steps.
- **The aura's style comes from the hero's class trait** (`traitsOf(kind)[1]`), never the origin. All 13 class traits
  have their own style, so no hero needs a fallback today. A hero with no class trait (none exist) would fall back to
  the guardian's golden shield (`FALLBACK_AURA`), the colour of the old awakened glow. "Holy" is an origin trait, so
  holy heroes take their class's aura (the Cleric warden, the Paladin guardian, the Priestess support).

Every part is a looping 32px strip of the **5000 Pixel Effects** pack (`pixel-effects/sprites/<name>/sheet-32.png` in
the assets repository), copied unchanged into one atlas. The pack's families used: `circle` (a flat ring on the
ground), `rune` (a spinning ring), `glyph` (a triangle sigil in a ring), `shield` (a bubble), `aura` (rising rings),
`sparkle` (rising motes), `orb`, `flame`, `smoke`, `vortex`, `pillar`, `cut` and `slash`, and the neutral `dash`.
Strip suffixes: `-s` slow (8 frames), `-b` bright, `-sb` slow and bright.

### The table

Places: **ground** flat under the feet; **wrap** behind the body's middle; **rise** rings rising from the feet; **halo**
flat over the head; **orbit** circling the body (dimmer behind it); **motes** dotted round the body on their own beats;
**trail** speed lines streaming back the way the hero faces. Parts marked † are left out on battery saver.

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

- **Reduced motion:** every part holds one frame and stays where it is (orbits stop at a fixed angle); the aura stays
  fully visible.
- **Battery saver:** the † parts are left out; every aura keeps at least two parts.
- **Phone cost:** the sprites are made once per hero (on the first frame after the atlas is ready) and only moved and
  re-framed after that; no allocation per frame. The atlas is one 256x2240 PNG (about 58 KB), bundled in `game.js`,
  so it plays offline with nothing added to the service worker list. At most 5 heroes wear an aura, at most 8 sprites
  each.
- **Deaths:** a fallen hero's aura goes out with it.

## The prototype (what exists on the branch)

- `src/render/auraStyles.ts`: the table above as pure data (`AURAS`, `auraOf`, `auraParts`, `AURA_SHEETS`,
  `FALLBACK_AURA`); no Pixi, no DOM.
- `src/render/awakenAura.ts`: `AwakenAura` (two containers, behind and in front of the body) and `loadAuraArt`, which
  `loadFx` in `fx.ts` awaits.
- `src/render/unitView.ts`: the fight sprite. An awakened hero now keeps its own sheet (no recolour, no red Werewolf),
  its glow and rim take the class colour, and it wears its `AwakenAura`. This already covers the normal fights, the
  Calamity and the Last Stand (which passes `awaken` through `sim/stand.ts`; no Last Stand file changed).
- `src/art/fx/aura/atlas.png` + `atlas.json`: 70 strips, packed by `tools/awaken/aura-sheets.py` (run by hand).
- `test/awaken-auras.test.ts`: every class trait has its own aura and every hero wears its class's; no aura below
  step 1; step 2 has more parts and is no smaller; battery saver drops only the extras; every strip is in the atlas.
- `tools/awaken/aura-mock.mjs` + `aura-sheet.py`: the mock-up pictures below (after `npm run web`).

The rest of the game still shows the old recolour until phase B.

## Mock-up pictures

Real browser captures (headless Chromium at 393x852) of the prototype on the fight board, each hero alone on a clear
tile. Step 0 is the hero's top form at rank 4, with the existing gold top-form glow.

- [Contact sheet: 13 classes x steps 0, 1, 2](../samples/awaken-auras-mock-sheet.png)
- [Motion: the Wizard (caster), step 2](../samples/awaken-auras-mock-motion-wizard.png)
- [Motion: the Werewolf (beast), step 2](../samples/awaken-auras-mock-motion-werewolf.png)

## Phase B plan (after approval)

1. Retire the recolour: `awakenLook.ts` keeps `stepOfRank` and loses `hueOf`, `toneOf`, `tonePixels`, `lookFilter`
   and (if approved) `PACK_VARIANTS`; `awakenRig.ts` returns the plain sheet; `sceneView.ts` drops its colour matrix and
   wears the aura instead; the awaken tests change to match the approved rule.
2. Draw the aura everywhere an awakened hero is drawn:
   - fights, Calamity and Last Stand: done in the prototype (`unitView.ts`);
   - the hero dossier and roster portraits, and the Rank up card (`menuHeroes.ts`, `rankUpView.ts`): a small canvas
     aura behind and in front of the picture, from the same table and atlas (a 2D-canvas twin of `AwakenAura`);
   - the party war council tableau (`partyScene.ts`, which today shows no awakened look at all);
   - the tavern (`tavern.ts`), the summoning hall's reveal (`hall.ts`), the awakening panel and its burst
     (`awakenView.ts`), and the cinematics (`sceneView.ts`);
   - the camp (`camp.ts`) and the Calamity map (`calMap.ts`) also draw awakened heroes through `awakenRig.ts`. If the
     camp counts as the castle tab, which is reserved, it is left to that tab's owner.
3. Checks: typecheck, web build, `npm test -- awaken`, the fight, dossier, party, tavern and summon screens at
   393x852, 360x780 and 412x915, with reduced motion and battery saver.

## Questions for the owner

1. Does the look and the class table suit? Any class whose aura you would change?
2. Werewolf: drop the red sheet (the proposal), or keep it as well as the flame aura?
3. Should rank 4 (the top form before awakening) keep its gold glow and gold rim? Today it does, so step 0 and step 1
   of a gold class (guardian, support) differ less than the others.
4. Step 2 strength: is the step 1 to step 2 jump big enough, or should step 2 be bigger still?
