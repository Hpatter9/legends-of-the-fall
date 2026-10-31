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
- **Part 4, The Trial** (the owner's call: chains 2 to 6 end with a trial against the Eidolon before the binding): once the three pieces
  are in, Nivra herself tests the keep on the Glass Mere. The log: "Nivra: “You have the pieces. Do you have the nerve? Come back to the
  mere, little keep, and show me.”" Before the fight: "The Glass Mere again. The ice is broken open in the middle, and the water under it is
  moving." She rises: "So. The little fires who knocked on my door." / "You have the pieces. Do you have the nerve?"; the hero: "We came
  all this way. We are not going home cold." After the win: "Good. The pack ran from me. You stood. Take me to your Summoner, little keep:
  I will answer your horn." / "She is laughing. I think. It sounds like a lake cracking." **Winning leads straight to the binding**;
  losing costs nothing (Try again at once, or Leave and fight it later from the Eidolons tab). It finds no piece and pays no chest: the
  binding is its reward.
- **The binding**: "The scale, the pearl, the breath. Set them on the altar. And put your cloaks on." The Summoner unstops the phial; frost
  runs across the floor in a ring and every brazier gutters blue; Nivra rises: "Three hundred winters under the ice, and I dreamed of your
  horn in every one. The deep remembers it, little keep. So do I." Bound. "The Rime Wyrm wakes for the keep." **No horn beats**: the horn
  was handed over at Askel's binding ([horn-gift.md](horn-gift.md)) and Nivra's binding leaves its fill alone.
- **The end card**: Nivra's **Bound** card (`revealCard({ kind: 'eidolon' })`, her painted card, her rider; with more than one Eidolon bound
  it says she answers the horn now and that the Pact Gallery chooses), then the Pact Gallery opens on her as before.

## What changed in the code

- `src/sim/eidolonChainData.ts`: Nivra's chain (three parts, three pieces, `UNDER_THE_MERE`, `NIVRA_BINDING`), and an optional
  `ChainDef.call`, the Sanctum plaque's words while a chain waits to be heard ("A frost-bitten hunter waits by the altar · Down from the
  north, with snow on the boots · tap to listen"); Askel's keeps the Summoner's. `trial: true`: her trial is written (see The trial).
- `src/sim/chainBattleData.ts`: **The Glass Mere** (snow land; white wolves and crystal golems, the Sapphire Colossus as the Warden;
  `like` the Beast Packs' wave 11, `ease` 1.15).
- `src/eidolonChainView.ts` (`hallPlaque` reads `call`), `src/home.ts` (`summonerTap`: a binding that gave no horn shows the Eidolon's
  Bound card), `src/sim/sceneReveal.ts` (the Bound card's "where" with more than one bound).
- The ceremony takes its Eidolon's element (`eidolonBinding.ts`, `eidolonChains.css` `.ebLayer.el-ice`): the circle frost-blue, the
  Sanctum washed blue, snow drifting down in place of embers, the name and seal in rime, and frost's sounds (`frostCrack` as the circle
  forms, `frostShatter` as she rises). Reduced motion: the snow is hidden and nothing moves, as for Askel.

## The trial (EIDOLON-TRIAL)

**Reusable: one entry a chain.** A trial is plain data, `TrialDef` in `src/sim/eidolonTrials.ts`: the boss (the Eidolon as a fighter,
its sheet its own art), its kit (a summoning skill and a passive), its great attacks (BOSS-BIG signatures), what it becomes at half health
(a boss phase), the arena (land, waves, `like`, `ease`, and `lift` on the Eidolon alone), the cast, and the words (the part in the log, the
story's lines). The tables take each trial in from `TRIALS`: `foes.ts` (`FOES`, and `isBoss`; kept out of `BOSS_IDS`, the meta's boss
codex), `abilities.ts` (`KITS`, its summoning a generic `callPack`), `bossAttacks.ts` (`SIGNATURES`), `bossPhases.ts` (`PHASE2`),
`chainBattleData.ts` (`trialBattle` makes the quest battle and its two stories), `sceneFamilies.ts` (the second form's cut-in) and
`codex.ts` / `codexLore.ts` (the bestiary: met in "The Trial: the last part of Nivra's Eidolon chain"). **Chains 3 to 6 add one entry to
`TRIALS`** (and a sheet and its lore); nothing else changes. A chain with `trial: true` and no entry ends at the binding, as before.

**The rules** (`eidolonChains.ts`): `trialOf(chain)`, `trialDue(meta)` (every piece in, the trial written and not yet won), `stepsOf`
(the parts plus the trial: "Part 4 of 4"). `readyToBind` now also waits for the trial; `chainWantsBattle` opens the trial's battle while it
is due (so it is fought from the chain's card, as the Glass Mere is); `noteChains` marks `trialWon` when the trial's battle is won (its last
wave; a loss or any other battle counts nothing). The save: `ChainState.trialWon` (optional; kept only once every piece is in, and only
`true`). **Older saves**: a save part-way through the chain carries on where it was; one saved with every piece in (ready to bind under the
old rule) now faces the trial first; one already bound stays bound. Practice: once won, the trial is replayed from the tab ("Replay The
Trial", no reward).

**Nivra's kit** (the boss `nivraWyrm`, drawn at 1.5x as a last boss is):

- **Rime Breath** (signature, ice, a new shape `row`): she gathers and the whole width of the field is marked down the row where most heroes
  stand, then frost pours along it and freezes whoever is still on it (rage: two rows deep, "The Long Winter"). Step off, or Shield it.
- **Glass Tomb** (signature, ice): a ring of ice one and two tiles round her, chilling (rage: "The Mere Closes").
- **Call of the Mere** (her skill): two frost wolves (the white werewolves) run out of the snow to her side; four at most standing, six a fight.
- **Rime Scales** (passive): blows from the front lose a fifth, and her blows chill (slow).
- **Ice armour at half health** (her second form, "THE ICE REMEMBERS. SO DO I. COME, MY WOLVES!", with its cut-in once a save): a shield of
  18% of her health, blows from the front lose 35% and a fifth of a melee blow comes back, two more frost wolves, her attack up 15%.
- The War Horn's Eidolon strikes her as "a great being in its own trial" (25%, `eidolons.ts`, armed by the page for a trial).

**The arena**: snow, two waves (two white wolves and two crystal golems; then Nivra with two wolves), strength `like` the Beast Packs'
wave 13, `ease` 0.97, her own `lift` 1 (the mid-boss's stats are her base; the tuning was by `ease`). The cast as at the Glass Mere (Ayame or
Kenji; any starter hero stands in).

**Her sprite** (`src/art/units/eidolon_nivra.png`): cut from the owner's Gemini sheet (`art-source/eidolons/gemini/nivra-sheet.jpg`, from
`art/gemini-eidolons`; no other branch had cut her) by `tools/eidolon-trial/cut_nivra.py`, as `tools/eidolon-call-2/cut_askel.py` cuts
Askel's: magenta keyed, down by 3 a block at a time, specks dropped, one baseline, centred on her coils, a palette of 256 (147 KB, bundled
into game.js as the other sheets are, so it plays offline). Rows: the slither (walk), the breath (attack: her jaws opening, the mist
leaving them; the sheet's fifth breath frame, whose cone runs out of its cell and whose pose does not meet the coils, is the fourth held a
beat), idle, the rise's first frames (hurt), the rise backwards (dead: she sinks). The breath's great cone is the battle's own frost along
the marked row.

**The page**: the Eidolons tab shows "Part 4 of 4: The Trial", the goal, Nivra's words and **Fight: The Trial**; the Sanctum's plaque
"Part 4: The Trial"; the third piece's card "Part 4 of 4 begins: The Trial. Nivra waits to test the keep." The trial's win plays its beat
after, then the binding at once (`Home.bindAfterTrial`, the Sanctum's own binding moved into `Home.bind`), its Bound card and the Pact
Gallery.

### The trial's win rate

`npm run quest-rate -- 80 +N --only=nivraTrial` (the rating tool's party of the cast and starter heroes, at the Beast Packs' level 15 plus
N, with the two hearts):

| level | won |
| --- | --- |
| 20 | 26/80, 33% |
| 21 (where the trial opens: the Glass Mere's 20, and part 3's five waves after) | 36/80, 45% |
| 23 | 43/80, 54% |
| 25 | 57/80, 71% |
| 30 | 80/80, 100% |

Tuned by `ease` (1 won 17% at level 21, 0.95 51%, 0.92 63%, 0.85 73%, 0.75 97%: 0.97 taken, hard but fair as the owner keeps quest fights).

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

**The chain (earlier)**: `test/eidolon-chain-2.test.ts` (6): the data (parts, pieces, goals' kinds, the binding's beats ending on `bound` with no horn beats, her
line, the prologue's length and lines, the hunter in it, the plaque words); the Glass Mere its own battle, cast from both starter packs
only, a stand-in, a blocked part named; offered only once Askel is bound and the Beast Packs cleared (not while Askel's chain goes, not
before the Beast Packs, an older save through `saveMeta`/`loadMeta`, a dev-flag binding of Askel), begun once; the parts in order (later
goals first count nothing, a Beast Packs boss only, a lost fight nothing, the battle only on its part, practice after, part 3 refusing a
spell cast, the Last Stand and a loss), bronze chests; the binding (chosen over Askel, a gold chest, the horn's fill untouched, once, the
Bound card), determinism and the save (junk dropped).

Updated in `test/eidolon-chains.test.ts` for the new requirement (Nivra's chain was a rail with no parts; it is now written): the rails
check skips Nivra, `PIECES` holds six, "Askel bound: nothing offered" now offers Nivra (and nothing once she is bound too), and the junk
check uses Aurelan for "a rail with no parts is dropped".

**EIDOLON-TRIAL**: `test/eidolon-trial.test.ts` (4): the data (one `TrialDef` taken into `FOES`, `KITS`, `SIGNATURES`, `PHASE2` and the
chain battles; her lines; a starter-only cast from both packs; chains 3 to 6 flagged with no trial yet, Askel's none; "Part 4 of 4"); the
trial only after the three pieces (not at parts 1 to 3, a win "before its time" counts nothing), a loss or another battle changing
nothing, a win readying the binding (no piece, no chest), the binding after it, practice after; old saves through `saveMeta`/`loadMeta`
(mid-chain carries on, every piece in faces the trial, bound stays bound, `trialWon` kept and junk dropped); the trial battle itself fought
twice from one seed and the same (and a different seed different), with the Rime Breath striking one row, the Glass Tomb, her wolves and
her ice armour all seen. Updated for the owner's new requirement in `test/eidolon-chain-2.test.ts`: every piece in now means the trial is
due (not ready to bind), and the binding test wins the trial first. Coverage tables that list every boss and skill took her in: the codex
(lore, where met), the second-form cut-in (`sceneFamilies.ts`) and `docs/lines/new-lines.json`; her summoning borrows the Beastmaster's
"Call of the Wild" key (its painting, look and sound) rather than a new skill needing new art.

## Checked

**EIDOLON-TRIAL**: `npm run typecheck`; the full `npm test` (1970: 1968 passed, and the two `new-lines` checks that failed, the writer's
file missing her lore and cut-in, pass after adding them); `npm run web`; `npm run quest-rate` as in "The trial's win rate" (the Glass
Mere still 59/80 at level 20). In the browser (`tools/eidolon-trial/shots.mjs`, a Sword and Shield save about level 21 with the three
pieces found) at 393x852, 360x780 and 412x915, the whole way through: the Sanctum plaque, the tab, the party, the story, the deploy, her
boss card, the Rime Breath's row marked, her second form, the after beat, the binding straight after, the Bound card. The save after each:
both bound, Nivra chosen, `trialWon` set, the trial won. No page errors, no 404s. Fixed on the way: Nivra stood half off the right of the
after beat (moved in). Note `eidolon-trial-armour-2` at each size caught a defeat screen (the tool fielded one hero in that try), which
shows the loss card's words instead ("Nivra holds. Losing costs nothing: try again with a new board, or come back to it from the quest
log."). Screenshots `docs/samples/eidolon-trial-*.png`.

**The chain (earlier)**:

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

- **Her sprite and the call's**: another session (`claude/eidolon-fx`) is cutting the six Gemini sheets into the War Horn call's
  sprites (`src/art/eidolons/sprites/nivra.png`). The trial's cut is a fighter's sheet in the fighters' own layout and lives apart
  (`src/art/units/eidolon_nivra.png`), so the two never clash; if the owner prefers, the trial can later read frames from that cut instead.
- **Where the hunter tells it**: the prologue plays from the Sanctum's plaque (as Askel's), with the hunter come to the Sanctum, rather
  than from the passersby' ledge on the Battle tab.
