# Eidolon chain 4: Voltara, the Copper Goddess ("The Dry Storm")

The fourth Eidolon chain, built exactly as Aurelan's ([eidolon-chain-3.md](eidolon-chain-3.md)) on its rails in `src/sim/eidolonChainData.ts`:
giver **The Crown** (a royal courier, the ruler's portrait `face:ruler`, who climbs to the Sanctum), opening "the Labyrinth cleared", one chain
at a time (it opens once Aurelan is bound). Nothing in the rules changed; the chain is data. Every existing fight plays out the same.

## The story

- **The prologue, "The Dry Storm"**: every weathercock on the keep spins, no rain falls, and lightning has struck the same tower seven nights
  running, never the rod. The Summoner names Voltara, who married the storm, was kept the house by it, and has wandered the sky looking for the
  door; the Labyrinth held her wires down for three hundred years. "A coil of her own wire, the face of the clock that stopped, and a storm
  kept in glass."
- **Part 1, Wire in the Maze**: beat a Labyrinth boss again (the Gorgon Queen at wave 8 or the Minotaur Champion at 15). Piece: **the Copper
  Coil**. Bronze chest.
- **Part 2, The Copper Works** (the chain's own quest battle, forge land): cold furnaces, a great clock stopped at the minute the pacts
  broke, golems, and **the Mint-Warden, Who Keeps the Last Spark** (the Sapphire Colossus's look): "THE CLOCK IS NOT TO BE TOUCHED. THE SPARK
  IS NOT TO BE SPENT. WIND DOWN, LITTLE FUSES." Kwame or Minh fights (any starter hero stands in). Piece: **the Stopped Clock-Face**. Bronze.
- **Part 3, Thunder on Demand**: fire 6 ultimates (`ults`). The Crown's glassmaker's flask wants filling with something shouted. Piece:
  **the Storm-Glass**. Bronze.
- **Part 4, The Trial**: Voltara on the Lightning Heights (crystal land): "Do you have the nerve to be struck?" / "Strike, then. We have a
  rod, and a very good ceiling." After the win she agrees to answer the horn; the clouds break into an ordinary, welcome rain. No piece, no chest.
- **The binding** (copper and electric blue, no horn beats): the glass is uncorked, copper and blue run across the floor, the braziers stand on
  end; "A door. Oh, a door, and it has a roof on it." Gold chest, her **Bound** card, then the Pact Gallery. `eidolonChains.css`
  `.ebLayer.el-lightning`: the circle blue with a copper glow, the Sanctum dimmed and blue-struck, blue and copper motes, name and seal in pale blue.

## Voltara's trial (`src/sim/eidolonTrials.ts`, boss `voltaraGoddess`)

Crystal land, two waves (labyrinth minotaurs and gorgons; then Voltara with two), `like` the Labyrinth's wave 13, drawn at 1.5x. She keeps a
distance (range 4, a `bolt` shot).

- **Chain Lightning** (signature, lightning, `line` 8 long, stun; rage "The Arc Unbroken"): a bolt down a whole column, leaping hero to hero.
- **Marked Storm** (signature, lightning, `rain` of 4, burn; rage "The Sky Falls In"): four tiles are marked, then struck.
- **Copper Sentries** (skill): two crystal golems step out of the storm to her side (three at most, five in a fight).
- **Copper Ring** (passive): shots lose 40% (`scales`) and her blows may arc to a second hero (`arc` 0.5).
- **Overcharged at half health** ("OVERCHARGED! LET THE WHOLE SKY IN!"): a shield of 20% of her health, 6% healed, hasted 7 s, attack up 25%,
  a crystal golem, the ring stronger (shots lose 55%, arcs 0.8).

**Her sprite** (`src/art/units/eidolon_voltara.png`, `sheets.json`, `sheets.ts`): cut from the owner's Gemini sheet
(`art-source/eidolons/gemini/voltara-sheet.jpg`, five columns by four rows) by `tools/eidolon-trial/cut_voltara.py`, as `cut_aurelan.py` cuts
his. She floats and faces us: walk and idle are the floating frames, attack the three casting frames (arms up, lightning streaming), hurt and
dead the turned-away frames. The beam row is left out (the cells cut it off; the battle's own lightning does the striking). Bundled into
game.js, so it plays offline. Codex lore added in `codexLore.ts`.

## Win rates (`npm run quest-rate`)

The rating party, at the Labyrinth's level (35) plus the lift. Below level 30 no hero has an ultimate and both fights are lost outright (0% at
27 to 29); that step at 30 is the same one the earlier chains have, and the Labyrinth does not open before level 35.

| fight | level | won |
| --- | --- | --- |
| The Copper Works (`ease` 0.76) | 30 | 68% |
| | 35 (where part 2 opens) | 75% (45/60) |
| | 40 | 80% |
| The Trial (`ease` 0.6) | 30 | 33% |
| | 35 (where it opens) | 43% (26/60) |
| | 40 | 53% |

(Trial `ease` 0.45 won 92%, 0.55 53%, 0.6 43%; the Works at 0.8 won 60%, 0.75 78%, 0.7 87%.)

## Tests and checks

`test/eidolon-chain-4.test.ts` (7): the data; the battle and its starter-only cast; offered only once Aurelan is bound and the Labyrinth
cleared, the parts in order with bronze chests (part 3 counted in ultimates); the trial's entry in the tables and the trial gating the
binding; the binding (chosen, a gold chest, the horn untouched, the Bound card); the save; and the trial fought twice from one seed (the same,
a different seed different), with the chain arc, the marked storm, her sentries and the overcharged form all seen. Updated for the new
requirement: `eidolon-chains.test.ts` (Voltara is written, twelve pieces, Gorm's the rail used for junk), `eidolon-chain-3.test.ts` (twelve
pieces), `eidolon-trial.test.ts` (chains 5 and 6 have no trial yet).

Screenshots at 393x852: `tools/eidolon-chain-4/shots.mjs` -> `docs/samples/eidolon-chain4-*.png`.

## Left open

- The pieces borrow gear icons (`circlet`, `luckyCharm`, `vialOfVigor`) until painted: **the Copper Coil** (a coil of bright copper wire),
  **the Stopped Clock-Face** (white enamel, one copper hand), **the Storm-Glass** (a blown-glass flask with a small blue storm in it).
