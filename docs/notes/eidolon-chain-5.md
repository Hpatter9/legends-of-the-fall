# Eidolon chain 5: Gorm, the Quarry Titan ("A Goat of Consequence")

The fifth Eidolon chain, built exactly as Voltara's ([eidolon-chain-4.md](eidolon-chain-4.md)) on its rails in `src/sim/eidolonChainData.ts`:
giver **Duchess** (the goat, who walks up to the Sanctum and stands on the altar; her own portrait, `face:duchess`), opening "the Infernal Host
cleared", one chain at a time (it opens once Voltara is bound). Nothing in the rules changed; the chain is data. Every existing fight plays out the same.

## The story

- **The prologue, "A Goat of Consequence"**: Duchess has butted one low stone at the keep's corner every dawn for a month, and it has started
  to knock back (she speaks in bleats, with her asides in brackets, as `quipData.ts` writes her). The Summoner names Gorm, the Quarry Titan,
  who cut the hill for the first kings and raised the keep out of it, then forgot to say so, and lay down in the quarry when the pacts broke
  while the grass came over: "The hill under your walls is him." "A flake of his fire, the mark he cut in his first block, and the stone that
  knocked."
- **Part 1, Fire in the Stone**: beat an Infernal Host boss again (the Devil Leader at wave 8 or the Demon Lord at 15). Piece: **the
  Ember-Crack**. Bronze chest.
- **Part 2, The Buried Foundation** (the chain's own quest battle, dungeon land): the cellar of the keep's first foundation, great grey
  blocks, chalk marks in a very large hand, stone golems, led by **the Clerk of Works, Who Was Never Told It Was Over** (the Forge Titan's
  look): "THE WORK IS NOT SIGNED OFF. NO ONE HAS BEEN TOLD IT IS OVER." Kwame or Minh fights (any starter hero stands in). Piece: **the
  Mason's Mark** (a very large G, and under it, smaller, "built this"). Bronze.
- **Part 3, Stand Your Ground**: take 25,000 damage across fights (`tally`, `taken`, any hero). The stone only hums for a party that has been
  properly hit. Piece: **the Knocking-Stone**. Bronze.
- **Part 4, The Trial**: Gorm himself in the Old Quarry (ruins land): "You have the flake, the mark and the stone. Do you have the weight?" /
  "We have lived on you for three hundred years. We would like to know whether we may go on." After the win he agrees to answer the horn.
  No piece, no chest.
- **The binding** (stone grey, moss green and ember orange, no horn beats): the Sanctum floor lifts "the way a hill does", orange runs along
  the flagstone seams, every brazier is nudged half a pace left; "I built a keep. I meant to tell somebody. It has been three hundred years and
  the grass is very comfortable. I will get up now." Gold chest, his **Bound** card, then the Pact Gallery. `eidolonChains.css`
  `.ebLayer.el-earth`: the circle grey with an ember glow, the Sanctum dimmed and mossy, orange and green motes, the name in stone-white and the
  seal in lichen and ember.

## Gorm's trial (`src/sim/eidolonTrials.ts`, boss `gormTitan`)

Ruins land, two waves (stone, iron and magma golems; then Gorm with two), `like` the Infernal Host's wave 13, drawn at his own scale (0.66).

- **Landslide** (signature, earth, `ring` from 1 to 3 tiles out, shove; rage "The Hill Comes Down"): the ground round him cleared.
- **Rising Pillars** (signature, earth, `rain` of 4, stun; rage "The Whole Quarry"): four tiles marked, then struck.
- **Stone Raises Stone** (skill): two stone golems peel off the quarry wall to his side (four at most, six a fight).
- **Granite Hide** (passive): blows from the front lose a third, he cannot be shoved, a tenth of a melee blow comes back.
- **The hill at half health** ("I WAS THE HILL. I AM STILL THE HILL. MIND YOUR FEET!"): a shield of 25% of his health, 5% healed, attack up
  20%, the hide stronger (45%, a fifth thrown back), two more golems.

**His sprite** (`src/art/units/eidolon_gorm.png`, `sheets.json`, `sheets.ts`): cut from the owner's Gemini sheet
(`art-source/eidolons/gemini/gorm-sheet.jpg`) by `tools/eidolon-trial/cut_gorm.py`, as `cut_voltara.py` cuts hers. Rows: the stride (walk), the
hammer slam's first frames (attack: the debris frame is left out, the battle's own earth does the striking), idle, the crouches (hurt) and
the leap's landing and crouch (dead). Bundled into game.js, so it plays offline. Codex lore added in `codexLore.ts`.

## Win rates (`npm run quest-rate`)

The rating party, at the Infernal Host's level (58) and either side. As the other chains, both fights are steep in `ease`; the Infernal Host's
foes are far stronger than the Labyrinth's, so the eases are much lower than chain 4's (0.24 and 0.27 against 0.76 and 0.6).

| fight | level | won |
| --- | --- | --- |
| The Buried Foundation (`ease` 0.24) | 53 | 80% |
| | 58 (where part 2 opens) | 77% (46/60) |
| | 63 | 88% |
| | 68 | 97% |
| The Trial (`ease` 0.27) | 53 | 35% |
| | 58 (where it opens) | 47% (28/60) |
| | 63 | 63% |
| | 68 | 65% |

(Foundation `ease` 0.15 won 100%, 0.22 95%, 0.26 60%, 0.3 30%, 0.4 0%; trial 0.22 won 82%, 0.26 52%, 0.3 30%.)

## Tests and checks

`test/eidolon-chain-5.test.ts` (7), in the shape of chain 4's: the data; the battle and its starter-only cast; offered only once Voltara is
bound and the Infernal Host cleared, the parts in order with bronze chests (part 3 counted in damage taken); the trial's entry in the tables and
the trial gating the binding; the binding; the save; and the trial fought twice from one seed (the same, a different seed different), with the
landslide, the pillars, his golems and the second form all seen. Updated for the new requirement: `eidolon-chains.test.ts` (Gorm is written,
fifteen pieces, Vaelkhar's the rail used for junk), `eidolon-chain-3.test.ts` and `eidolon-chain-4.test.ts` (fifteen pieces),
`eidolon-trial.test.ts` (chain 6 has no trial yet).

Screenshots at 393x852: `tools/eidolon-chain-5/shots.mjs` -> `docs/samples/eidolon-chain5-*.png`.

## Left open

- The pieces borrow gear icons (`relicShard`, `stoneIdol`, `ironRing`) until painted: **the Ember-Crack** (grey stone with one orange crack),
  **the Mason's Mark** (a dressed block with a large G), **the Knocking-Stone** (a round grey stone, humming).
