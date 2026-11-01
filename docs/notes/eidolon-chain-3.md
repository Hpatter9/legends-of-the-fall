# Eidolon chain 3: Aurelan, the Lion of Dawn ("The Late Dawn")

The third Eidolon chain, built exactly as Nivra's ([eidolon-chain-2.md](eidolon-chain-2.md)) on its rails in `src/sim/eidolonChainData.ts`:
giver **Gwen Tallow** (keeper of the tavern, who walks up to the Sanctum), opening "the Wildwood cleared", one chain at a time (it opens
once Nivra is bound). Nothing in the rules changed; the chain is data. Every existing fight plays out the same.

## The story

- **The prologue, "The Late Dawn"** (Gwen, in the Sanctum before sunrise; her own portrait, `face:gwen`): she has not left the taproom in
  forty years, and now the lamps go out at dusk and the dawn comes a little later each day (the cockerel has given up). The Summoner names
  Aurelan, who walked ahead of the sun for the first kings and roared it up each morning, then lay down in the dark when the pacts broke.
  "A thread of his mane, the crown he laid down, and a light that has not been put out."
- **Part 1, Gold in the Grove**: beat a Wildwood boss again (the Thorn Warden at wave 5, the Wood Raider at 10 or the Grove Spearlord at
  15). Piece: **the Dawn-Thread**. Bronze chest.
- **Part 2, The Sunless Shrine** (the chain's own quest battle, shrine land): a shrine nailed shut against the sun, statues facing the
  door, gorgons and stone golems, led by **the Eclipse Queen, Who Keeps the Sun in Stone** (the Gorgon Queen's look): "The sun is late. The
  sun is STONE. Kneel to the shade, little torches." Kwame or Minh fights (any starter hero stands in). Piece: **the Sun-Crown**. Bronze.
- **Part 3, Not One on the Floor**: win 4 waves with no hero falling (`wavesWon`, `flawless`). Gwen lends her hearth-lamp, which only burns
  for a party that brings everyone home. Piece: **the Dawn-Lamp**. Bronze.
- **Part 4, The Trial**: Aurelan himself on the Dawn Hill (highlands, an hour before sunrise): "You have the pieces. Do you have the
  light?" / "We have been standing in the dark a long time. Show us the dawn." After the win he agrees to answer the horn. No piece, no chest.
- **The binding** (gold and rose, no horn beats): the lamp flares, gold and rose run out across the floor in a ring, the braziers stand up
  like sentries; "Night is long, little keep, and you lit a lamp in it. I saw it from the far side of the dark. I am coming." Gold chest,
  his **Bound** card, then the Pact Gallery. `eidolonChains.css` `.ebLayer.el-light`: the circle gold with a rose glow, the Sanctum washed
  in dawn, gold and rose motes, the name and seal in gold.

## Aurelan's trial (`src/sim/eidolonTrials.ts`, boss `aurelanLion`)

Highlands, two waves (four grove satyrs; then Aurelan with two), `like` the Wildwood's wave 13, drawn at 1.5x.

- **Lances of Dawn** (signature, light, `rain` of 3: a 3x3 blast on three heroes; burn; rage "The Sun Comes Down"): the falling lances.
- **Dawnbreak Roar** (signature, light, `row`, stun; rage "Dawnbreak Unending"): the roar down a whole row.
- **The Pride Answers** (skill): two grove satyrs run to his side (four at most, six a fight).
- **Dome of Dawn** (passive): blows from the front lose a quarter.
- **The dawn form at half health** ("THE DAWN IS HERE. STAND IN MY LIGHT, IF YOU CAN!"): a shield of 20% of his health, 8% healed, hasted
  6 s, attack up 20%, the dome stronger (35%), two more satyrs.

**His sprite** (`src/art/units/eidolon_aurelan.png`, `sheets.json`, `sheets.ts`): cut from the owner's Gemini sheet
(`art-source/eidolons/gemini/aurelan-sheet.jpg`) by `tools/eidolon-trial/cut_aurelan.py`, as `cut_nivra.py` cuts hers (keyed, down by 3,
specks and the neighbouring cells' stray tails dropped, one baseline, centred on the body, a palette of 256, 81 KB, bundled into game.js
so it plays offline). Rows: the run (walk), the roar (attack: the beam is left out because the cell cuts it off; the battle's own light
does the striking), idle, the leap's first frames (hurt) and the leap run backwards (dead). Codex lore added in `codexLore.ts`.

## Win rates (`npm run quest-rate`)

The rating party, at the Wildwood's level plus the lift. A hero's ultimate arrives at level 30, so every fight here has a steep step there.

| fight | level | won |
| --- | --- | --- |
| The Sunless Shrine (`ease` 0.78) | 25 | 63% |
| | 27 (where part 2 opens) | 70% (56/80) |
| | 30 | 100% |
| The Trial (`ease` 0.68) | 26 | 27% |
| | 28 (where it opens) | 49% (49/100) |
| | 30 | 100% |

(`ease` 0.9 at the shrine won 38%, 0.7 85%; the trial at 0.65 won 62%, 0.7 31%, 0.8 6%: the trial is steep in `ease`.)

## Tests and checks

`test/eidolon-chain-3.test.ts` (6): the data; the battle and its starter-only cast; offered only once Nivra is bound and the Wildwood
cleared, the parts in order with bronze chests (a win with a hero down counts nothing for part 3); the trial's entry in the tables and the
trial gating the binding; the binding (chosen, a gold chest, the horn untouched, the Bound card); the save; and the trial fought twice from
one seed (the same, a different seed different), with the lances, the roar, his pride and the dawn form all seen. Updated for the new
requirement: `eidolon-chains.test.ts` (Aurelan is written, nine pieces, Voltara is the rail used for junk), `eidolon-chain-2.test.ts`
(Aurelan is offered once the Wildwood is cleared), `eidolon-trial.test.ts` (chains 4 to 6 have no trial yet).

Screenshots at 393x852: `tools/eidolon-chain-3/shots.mjs` -> `docs/samples/eidolon-chain3-*.png` (the plaque, Gwen's prologue, the
Eidolons tab at part 1 and at the trial, the Sanctum ready to bind, the binding beat by beat and the Bound card).

## Left open

- The Sanctum plaque's own `call` words are not shown (the SANCTUM-TIDY plaque says "The Summoner beckons" for every chain, as for Nivra's).
- The pieces borrow gear icons (`phoenixFeather`, `circlet`, `luckyCharm`) until painted: **the Dawn-Thread** (a long stiff hair of
  living gold), **the Sun-Crown** (a crown of beaten gold spiked like rays), **the Dawn-Lamp** (a small brass tavern hearth-lamp, lit,
  without oil).
