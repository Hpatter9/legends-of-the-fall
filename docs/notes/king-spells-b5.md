# The king's spells, batch 5: the schools' spells' own art (KING-SPELLS)

The art for the fourteen spells batch 4 added ([king-spells-b4.md](king-spells-b4.md)) arrived in PR #333 (branch `art/spell-fx-kings`,
`art-source/spell-fx/h-kings/`, made with OpenAI image generation for this game). It has fourteen painted sheets, each with a `cast` and an
`impact` row; the three walls also have a `stand` loop. There are also fourteen round emblems. Main 0.346.0 and that branch were merged in.

## What was done

- **The sheets** (`tools/spell-fx/spell-parts.json`, `import-spell-art.py`):
  - `h-kings` joined the importer's manifest. Each sheet has `cast` (once, 6 to 8 frames) and `impact` (once, 6 to 8); the walls also have
    `stand` (loop, 4 to 8).
  - The manifest's new `prefix` reads that session's keys as `king-<sheet>`. The king's `charm` would otherwise have overwritten the heroes'
    `charm` in the one table of parts. The importer and `test/spell-fx.test.ts` read the prefix.
  - All fourteen pass the importer's checks, giving `src/art/fx/spells/h-kings.webp` (31 parts, 429 KB). All the atlases together are 3.81 MB
    of the 5 MB cap. The other atlases were left byte for byte as they were.
  - `build.mjs` already copies every atlas in that folder and lists it for the offline cache.
- **Playing them** (`src/render/kingArt.ts`, `fx.ts`):
  - `KING_SHEET` names each spell's sheet. The cast row plays where the spell lands.
  - The impact row plays on every fighter the spell touches (its `spellfx`), under the signature's own release and hit.
  - A wall the king raised (a toolkit wall with `by` 0) stands as its spell's own loop (`KING_WALL`: fire, ice and stone, the bone wall)
    instead of the toolkit's wall paintings. It fades in and out because these sheets have no rise or break rows.
- **The emblems** (`tools/king-spells/icons.py`, re-runnable; the sources are never changed):
  - **Their icons**: `src/art/fx/kings/icons.webp`, one strip of 64 px emblems (37 KB, bundled). `spellIcons.ts` shows them on the spell
    orbs and in the spellbook in place of the borrowed pixel frames.
  - **Their authored art**: `src/art/fx/abilities/atlas-9.png`, a 4 x 4 grid of 192 px cells (700 KB, like the other atlases), with a row
    for each in `src/art/fx/abilities/catalogue.json` (`spell:<id>`, its painting's words). The release and the hit are drawn from it
    (`abilityArt.ts`).
- **Their own looks everywhere**: `SPELL_SIGNATURES`, `SPELL_ELEMENT`, `SPELL_CAST`, `SPELL_TOUCH`, `SPELL_FX` and `SPELL_GLOW` have an entry
  of the spell's own for each of the fourteen. Nothing in the art borrows any more.
- **Nine new release shapes**, so no two king's spells release the same way (`signatures.ts`, `signatureFx.ts`, `shapeFamily`):
  - `wall` (Wall of Fire): strips flare up one after another along a row.
  - `crystal` (Ice Wall): a row rises together and holds.
  - `rise` (Bone Wall): a row climbs out of the ground from the middle outward.
  - `shards` (Shatter): bits burst from each foe and fall.
  - `vines` (Thorn Snare): strips grow up under each foe, swaying in.
  - `hearts` (Charm): strips float up from the foe.
  - `eye` (Foresight): one strip opens above the allies and swells.
  - `haze` (Mirage): strips shimmer beside each ally and drift.
  - `sigil` (Raise Dead): one strip spreads flat on the ground and a second rises out of it.

  The five shapes no king's spell used yet went to Gale (`sweep`), Thunderclap (`barrage`), Sunbeam (`cone`), Venom Fang (`slashX`) and
  Drain Life (`draw`).
- **Sounds stay borrowed** (the director's word: no new sounds yet). `SPELL_LOOK` became `SPELL_SOUND` in `src/sim/spellSounds.ts`, read only
  by the sound (`spellSfx.ts`, `soundRules.ts`). The Decrees keep the looks and sounds of the spells they borrow from.

## Checks

- **The owner's rule is whole again**: `test/individual-ability-fx.test.ts` is back as it was before batch 4. Every hero's skill and ultimate,
  every foe's and all 35 king's spells (143) each has its own authored art, its own source cell and motif, attached to its release and hit
  without a tint, and the king's spells all release differently. Only the count changed, from 129 to 143.
- `test/king-spells-b5.test.ts` (new):
  - each of the fourteen has its painted cast and impact in `h-kings`, and each wall its stand loop;
  - the heroes' `charm` is still the heroes';
  - each has its own emblem as its icon and as its authored art, and 35 spells have 35 paintings.
- `test/spell-fx.test.ts`: the manifest's count (158 sheets, 302 rows) and the prefix.
- The identity proofs were re-recorded on main 0.346.0's code: `daily` and `stand` alone. These are batch 6's constants, which main's
  fixtures did not have yet; nothing in this batch touches a fight.
- Shots (`docs/samples/king-spells-b5-*.png`):
  - a Storm Corsair save, Auto casting Gale, with the new emblems on the orbs, at 393x852, 360x780 and 412x915;
  - the spellbook at each of those sizes;
  - an Ash Empress save's Wall of Fire standing as its painted loop at 393x852.
