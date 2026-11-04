# Eidolon chain 6: Vaelkhar, the Dragon King ("The Guest's Things")

The sixth and last Eidolon chain, built exactly as Gorm's ([eidolon-chain-5.md](eidolon-chain-5.md)) on its rails in `src/sim/eidolonChainData.ts`:
giver **a voice in the rift** (the rift's own picture, `face:rift`, and its lower-case, cold-but-polite voice), opening "the Calamity cleared
once", one chain at a time (it opens once Gorm is bound). Nothing in the rules changed; the chain is data. Every existing fight plays out the same.
With this, all six Eidolons have chains.

## The story

- **The prologue, "The Guest's Things"**: a crack of violet light the size of a letterbox opens in the Sanctum floor after the Calamity, and
  a voice carries a message from someone too large to come through. He came to the keep once, as a guest, for one night, and left his things;
  he has wondered for three hundred years whether it is rude to ask for them back. The Summoner names Vaelkhar, who flew over the first kings'
  walls as an invited guest and was asleep in the east wing when the pacts broke; he left a scale, a seal and a helm made for a rider (the
  Scorched Scale, Dragon-King's Sigil and Doom Helm of his reliquary), and gave the first queen his heart (Vaelkhar's Heart, the Storied
  relic: "He would like it back"). "He is a king. It comes out as the same thing [as angry]." "A scale from the last guardians' floor, the
  letter that was never answered, and a tine of his crown."
- **Part 1, Under the Guardians**: fell 2 Calamity guardians (`calGuardian`, any map). Piece: **the Black Scale**. Bronze chest.
- **Part 2, The Guest Wing** (the chain's own quest battle, graveyard land): the keep's oldest wing, a corridor of shut doors, one straight
  line in the dust, skeletons, spearmen and bone-archers, led by **the Chamberlain, Who Keeps the Guest's Things** (the Lich King's look): "THE
  GUEST HAS NOT CHECKED OUT. THE GUEST'S THINGS ARE NOT TO BE REMOVED. PLEASE REMAIN SEATED." Kwame or Minh fights (any starter hero stands
  in). Piece: **the Unanswered Letter** ("To the Keep. Re: my things."). Bronze.
- **Part 3, A King's Ransom**: deal 200,000 damage across fights (`tally`, `dealt`). Piece: **the Crown-Tine**. Bronze.
- **Part 4, The Trial**: Vaelkhar on the Black Summit (volcano land, the sun put out): "You have the scale, the letter and the tine. Do you
  have the crown?" / "We shut your last door, and came back for the next. Kneel? We would rather stand, and watch." After the win he agrees
  to answer the horn; the sun comes back on with a faint, embarrassed click. No piece, no chest.
- **The binding** (void purple and black, no horn beats): "Three of his four things: the heart, the keep may keep, and he has asked for a
  receipt." The windows go dark one pane at a time, a ring of violet fire stands up, the whole keep under a crown; "I came as a guest, and I
  left my things, and you kept them dusted. ... Kneel, little king. No. Do not kneel. Stand, and watch." Gold chest, his **Bound** card, then
  the Pact Gallery. `eidolonChains.css` `.ebLayer.el-dark`: the circle violet, the Sanctum nearly black, violet and gold motes, the name in
  pale violet with a gold subtitle, the seal in violet and gold.

## Vaelkhar's trial (`src/sim/eidolonTrials.ts`, boss `vaelkharKing`)

Volcano land, two waves (imps and demons; then Vaelkhar with three), `like` the Golem Forge's wave 13 (the hardest army: the Calamity is not
a level-gated mode, so the last army is the reference). He is the hardest of the six: the most health (3,000), reach 3 with a `curse` shot, jump 5, and
a leeching hide.

- **Voidfire** (signature, dark, `line` 9 long and 2 wide, curse; rage "Torrent of Night"): a torrent of black fire down a whole line.
- **The Void Collapses** (signature, dark, `pull` from 6 tiles, 2 in, then a 2-tile blast, stun; rage "Crown of Night"): heroes are dragged
  in, then struck.
- **The Court of Night** (skill): two demons of his court step out of the dark (three at most, five in a fight).
- **Doom Scales** (passive): blows from the front lose a quarter, shots a third, and he heals a fifth of the damage he deals.
- **The crown at half health** ("KNEEL, LITTLE KING. THEN STAND, AND WATCH!"): a shield of 25% of his health, 8% healed, hasted 8 s, attack up
  30%, the scales stronger (35% block, shots lose half, he heals 35% of what he deals), two more demons.

**His sprite** (`src/art/units/eidolon_vaelkhar.png`, `sheets.json`, `sheets.ts`): cut from the owner's Gemini sheet
(`art-source/eidolons/gemini/vaelkhar-sheet.jpg`, six columns by four rows) by `tools/eidolon-trial/cut_vaelkhar.py`, as `cut_voltara.py` cuts
hers, with a stricter key so the violet is not keyed away with the magenta. Rows: the flying frames (walk), the wings-up frames (attack: the
breath row is left out because the cells cut the breath off; the battle's own dark fire does the striking), the idle stand, and the low rise
frames (hurt and dead). Bundled into game.js, so it plays offline. Codex lore added in `codexLore.ts`.

## Win rates (`npm run quest-rate`)

The rating party, at the Golem Forge's level (74) and either side. As elsewhere both fights are steep in `ease` (low: the Golem Forge's foes are
the strongest in the game).

| fight | level | won |
| --- | --- | --- |
| The Guest Wing (`ease` 0.21) | 69 | 62% |
| | 74 (the last army's level) | 83% (50/60) |
| | 79 | 87% |
| | 84 | 87% |
| The Trial (`ease` 0.215) | 69 | 13% |
| | 74 (the last army's level) | 22% (13/60) |
| | 79 | 33% |
| | 84 | 48% |

(Guest Wing `ease` 0.12 won 100%, 0.2 83%, 0.22 63%, 0.24 53%, 0.28 23%; trial 0.12 won 100%, 0.2 40%, 0.21 40%, 0.22 25%, 0.28 0%. The
trial is the steepest of the six, as asked: a party a good way above the last army's level wins about half.)

## Tests and checks

`test/eidolon-chain-6.test.ts` (7), in the shape of chain 5's: the data; the battle and its starter-only cast; offered only once Gorm is bound
and the Calamity cleared, the parts in order with bronze chests (part 1 counted in Calamity guardians, part 3 in damage dealt); the trial's
entry in the tables and the trial gating the binding; the binding; the save; and the trial fought twice from one seed, with the voidfire, the
collapse, his court and the second form all seen. Updated for the new requirement: `eidolon-chains.test.ts` (all six are written, eighteen
pieces, the junk save no longer names a rail), `eidolon-chain-3.test.ts` to `-5` (eighteen pieces), `eidolon-trial.test.ts` (every chain after
Askel's has a trial).

Screenshots at 393x852: `tools/eidolon-chain-6/shots.mjs` -> `docs/samples/eidolon-chain6-*.png`.

## Left open

- Vaelkhar's Heart (the Storied relic, "He would like it back") is only a joke in the prologue and the binding (the keep may keep it; he
  wants a receipt). Nothing returns it or changes it. Does the owner want the binding to do something with it?
- The pieces borrow gear icons (`relicShard`, `scholarScroll`, `moonPendant`) until painted: **the Black Scale** (black with violet
  cracks), **the Unanswered Letter** (violet wax seal), **the Crown-Tine** (a golden spike).
