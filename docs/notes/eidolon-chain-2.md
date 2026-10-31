# Eidolon chain 2: Nivra, the Rime Wyrm ("What Sleeps Under the Mere")

The second Eidolon chain, built exactly as the first ([eidolon-chains.md](eidolon-chains.md), Askel's "The Hound Comes Home") on its rails
in `src/sim/eidolonChainData.ts`: giver a frost-bitten hunter, opening "the Beast Packs cleared", one chain at a time (the owner's pacing).
Nothing in the rules changed: the chain is data, and it opens by itself once Askel is bound and the Beast Packs have fallen. Every existing
fight plays out the same; the chain draws nothing from any stream.

## The story

- **The prologue, "Under the Mere"** (the hunter, at the Sanctum; the Summoner names what sleeps): far to the north a lake lies frozen like
  glass, and something under it has turned over in its sleep. The hunter (the passerby of the road quests, in the same clipped voice, two
  fingers short) walks down to the Sanctum: "You called the fire-dog home. Whole north heard it. Now call something else." The pack ran
  south this winter, not hunting but running, from under the ice. The Summoner: Nivra, the Rime Wyrm, lay under the northern meres and kept
  the passes shut for the first kings; when the pacts broke she went down into the cold to sleep it off. Bring a scale she has shed, the
  pearl of her cold heart and the breath she holds. ("And if she wakes up cross?" "Then be her friend first. Quickly.")
- **Part 1, The Pack That Ran**: beat a Beast Packs boss again (the Alpha Werewolf at wave 8 or the Boar King at wave 15). Piece: **the Rime
  Scale** ("Caught in the coarse fur of a pack-lord's back: a scale of blue ice as broad as a shield." / "It does not melt by the fire.
  Hold it to your ear and it hums, like a lake freezing.").
- **Part 2, The Glass Mere** (the chain's own quest battle): the mere frozen so clear you can see the long pale shape coiled under it;
  shapes of blue crystal walk on the ice with white wolves, led by **the Hoarfrost Warden, Who Keeps the Sleeper Cold** (the Sapphire
  Colossus's look): "The Wyrm SLEEPS. While she sleeps, the mere is MINE. Go home, little fires." Ayame or Kenji fights (any starter hero
  stands in). Piece: **the Mere-Pearl** ("In the Warden's chest, where a heart would be: a pearl of black ice the size of a fist." /
  "Something turns over inside it, slowly, the way a sleeper turns.").
- **Part 3, Hold Your Breath**: win 5 army waves without casting a king's spell (the hunter: "She does not come to noise. My grandmother
  said: win quiet."; it echoes Nivra's own "Hold your breath. I hold mine for centuries."). Piece: **the Held Breath** ("After the fifth
  quiet win, frost drew a serpent's eye on the library window, and a grey mist would not leave the glass." / "Caught in a phial, it frosts
  the glass from the inside. It is very patient.").
- **The binding**: "The scale, the pearl, the breath. Set them on the altar. And put your cloaks on." The Summoner unstops the phial; frost
  runs across the floor in a ring and every brazier gutters blue; Nivra rises: "Three hundred winters under the ice, and I dreamed of your
  horn in every one. The deep remembers it, little keep. So do I." Bound. "The Rime Wyrm wakes for the keep." **No horn beats**: the horn
  was handed over at Askel's binding ([horn-gift.md](horn-gift.md)) and Nivra's binding leaves its fill alone.
- **The end card**: Nivra's **Bound** card (`revealCard({ kind: 'eidolon' })`, her painted card, her rider; with more than one Eidolon bound
  it says she answers the horn now and that the Pact Gallery chooses), then the Pact Gallery opens on her as before.

## What changed in the code

- `src/sim/eidolonChainData.ts`: Nivra's chain (three parts, three pieces, `UNDER_THE_MERE`, `NIVRA_BINDING`), and an optional
  `ChainDef.call`, the Sanctum plaque's words while a chain waits to be heard ("A frost-bitten hunter waits by the altar · Down from the
  north, with snow on the boots · tap to listen"); Askel's keeps the Summoner's. `trial: true` is kept for the trials' batch.
- `src/sim/chainBattleData.ts`: **The Glass Mere** (snow land; white wolves and crystal golems, the Sapphire Colossus as the Warden;
  `like` the Beast Packs' wave 11, `ease` 1.15).
- `src/eidolonChainView.ts` (`hallPlaque` reads `call`), `src/home.ts` (`summonerTap`: a binding that gave no horn shows the Eidolon's
  Bound card), `src/sim/sceneReveal.ts` (the Bound card's "where" with more than one bound).
- The ceremony takes its Eidolon's element (`eidolonBinding.ts`, `eidolonChains.css` `.ebLayer.el-ice`): the circle frost-blue, the
  Sanctum washed blue, snow drifting down in place of embers, the name and seal in rime, and frost's sounds (`frostCrack` as the circle
  forms, `frostShatter` as she rises). Reduced motion: the snow is hidden and nothing moves, as for Askel.

## The battle's win rate

`npm run quest-rate -- 80 +5 --only=glassMere` (a party of the cast and starter heroes, at the Beast Packs' level plus the lift):

| level | won |
| --- | --- |
| 20 (the Beast Packs' 15 + 5: about where the chain's part 2 opens) | 59/80, 74% |
| 25 | 76/80, 95% |
| 30 | 80/80, 100% |

Tuned by `ease` (1.3 won 53%, 1.05 won 93%, 1.12 to 1.17 between 70% and 83%: 1.15 taken).

## The pieces' art (for a future prompt)

Borrowed gear icons until painted (`PieceDef.art`): the Rime Scale (`relicShard`), the Mere-Pearl (`scryingOrb`), the Held Breath
(`vialOfVigor`). To paint, in the gear icons' style: **the Rime Scale** (a shield-broad scale of translucent blue ice, ridged like a
serpent's, frost feathering its edge, a cold light inside), **the Mere-Pearl** (a fist-sized pearl of black ice with a faint pale coil
turning inside it, rime on its skin), **the Held Breath** (a small stoppered glass phial frosted from within, a grey mist curling in it,
a serpent's eye drawn in the frost).

## Tests

`test/eidolon-chain-2.test.ts` (6): the data (parts, pieces, goals' kinds, the binding's beats ending on `bound` with no horn beats, her
line, the prologue's length and lines, the hunter in it, the plaque words); the Glass Mere its own battle, cast from both starter packs
only, a stand-in, a blocked part named; offered only once Askel is bound and the Beast Packs cleared (not while Askel's chain goes, not
before the Beast Packs, an older save through `saveMeta`/`loadMeta`, a dev-flag binding of Askel), begun once; the parts in order (later
goals first count nothing, a Beast Packs boss only, a lost fight nothing, the battle only on its part, practice after, part 3 refusing a
spell cast, the Last Stand and a loss), bronze chests; the binding (chosen over Askel, a gold chest, the horn's fill untouched, once, the
Bound card), determinism and the save (junk dropped).

Updated in `test/eidolon-chains.test.ts` for the new requirement (Nivra's chain was a rail with no parts; it is now written): the rails
check skips Nivra, `PIECES` holds six, "Askel bound: nothing offered" now offers Nivra (and nothing once she is bound too), and the junk
check uses Aurelan for "a rail with no parts is dropped".

## Checked

`npm run typecheck`; `npm test -- eidolon-chain scene-reveal horn-gift no-flicker`; the full `npm test` (1945 pass); `npm run web`;
`npm run quest-rate` as above. One fix on the way: the snow first faded in and out in a loop, which `no-flicker.test.ts` forbids (a
looping animation must not change brightness); it now grows and shrinks as it falls, as the embers do.

In the browser (`tools/eidolon-chain-2/shots.mjs`, a real save of the Sword and Shield pack at level 20 with Askel bound and the Beast
Packs cleared) at 393x852, 360x780 and 412x915: the Sanctum's plaque (the hunter waits), the prologue, the Eidolons tab at each part,
each part done and its piece card, the Glass Mere (party, story, deploy, the Warden's card, the fight), the Sanctum ready to bind, the ice
binding beat by beat, Nivra's Bound card, the Pact Gallery and her card, and the tab with both bound. The save after: both bound, Nivra
chosen, six pieces, three bronze chests and a gold one, the horn's fill untouched by the binding. No page errors, no 404s. One thing found
and fixed: the hunter first spoke over a hero's close-up, so their face sat on top of the hero's painting; the hunter now speaks over wide
shots, their face over the land. Screenshots `docs/samples/eidolon-chain2-*.png` (`-360`, `-412` for the other sizes).

## Left open (questions for the owner)

- **The trial**: the design ends chains 2 to 6 with a trial against the Eidolon itself; this batch (as asked) ends Nivra's at the binding
  after three parts, with `trial: true` kept for the trials' batch. Should her trial become a fourth part before the binding, later?
- **Where the hunter tells it**: the prologue plays from the Sanctum's plaque (as Askel's), with the hunter come to the Sanctum, rather
  than from the passersby' ledge on the Battle tab.
