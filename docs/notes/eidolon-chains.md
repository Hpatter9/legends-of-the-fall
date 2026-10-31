# Eidolon chains (quests, batch 5): Askel's chain, end to end

Batch 5 of the owner-approved design in [quests-summons-design.md](quests-summons-design.md) ("The first chain, end to end ... the
Summoner's prologue, the parts, the piece cards, the binding ceremony and the Pact Gallery"), with the design's last sections ruling: the
first and easiest Eidolon is **Askel, the Cinderhound** (fire, *The Burning Run*), one Eidolon chain at a time, and a quest that needs a
particular hero stays hidden until it is owned (so a chain only ever asks for starter heroes, from both packs). Chain 1 was written for an
older fire summon (Ossery); it is rewritten here for Askel with the same pacing: it opens after the Orc Warband, sits at levels 5 to 12,
has three easy parts, and ends in a binding, not a trial. Every existing fight plays out the same: nothing new draws from a fight's
streams, and the chains draw nothing at all.

## The story (Askel's chain, "The Hound Comes Home")

- **The prologue, "The Hearth Below"** (the Summoner, in the Sanctum, once the Orc Warband has fallen): when the Warlord fell, heat breathed
  under the Sanctum's floor. The first kings kept a hound of living embers, Askel, who ran their hunts and slept by their hearth; when the
  Calamity broke the old pacts he ran into the fire under the hills and has been running since. Every hound wants to come home: call him
  the old way, with the ember of his heart, his collar, and the bell that called him to supper.
- **Part 1, Embers of the Warband**: beat an Orc Warband boss again (the Chieftain at wave 8 or the Warlord at wave 15). Piece: **the Ember
  Heart** ("In the war-fire, among the bones, a coal that will not go out. It beats, slowly, like something asleep.").
- **Part 2, The Kennel Fires** (the chain's own quest battle): the first kings' kennels on the southern hill, still burning after three
  hundred years, where a red pack has made its den round an old iron collar, led by **the Ash-Mane, Who Would Be the Kennel King** (the
  Alpha Werewolf's look): "The fire's hound is gone. The fire's kennel is MINE." Ravi or Natsu fights (any starter hero stands in).
  Piece: **the Kennel Collar** ("An iron collar the width of a cartwheel, the keep's crest on its buckle. The wolves were keeping it warm for
  someone.").
- **Part 3, The Kennel-Master's Bell**: fell the Bone Captain, the Undead Legion's wave 8 (he was the first kings' kennel-master, raised by
  the Legion). Piece: **the Kennel Bell** ("The dead came when he rang it. Something else will come when we do.").
- **The binding**: the Summoner sets the heart, the collar and the bell on the altar and rings the bell once; every brazier leans towards
  the altar, the circle catches fire, Askel rises: "A bell I have not heard in three hundred years. I have run a long way, little keep. Blow
  your horn, and I will run for you." Bound.

## The rules (`src/sim/eidolonChains.ts`; data in `src/sim/eidolonChainData.ts`, the battle in `src/sim/chainBattleData.ts`)

- **The data** (`CHAINS`): six chains, one an Eidolon, easiest first (`order`), each with its giver, its opening (`opens`: a quest `Need`,
  or `calCleared`), whether it ends in a trial, its parts (`ChainPart`: a goal of the quests' own kinds, the giver's words as it begins,
  its piece and its pay), its prologue (a `Scene` in the cinematics' shape, a new `Moment` kind `eidolon`) and its binding's beats
  (`BindingBeat`: times, the beat, who speaks and the words). All plain data, so the general shot layer can take them over.
- **The rails for chains 2 to 6** (Nivra, Aurelan, Voltara, Gorm, Vaelkhar): each has its giver from the design (a frost-bitten hunter,
  Gwen, the Crown, Duchess, a voice in the rift), what opens it (the Beast Packs, the Wildwood, the Labyrinth and the Infernal Host
  cleared, the Calamity cleared once), `trial: true`, and no parts yet: **a chain with no parts is never offered**, so each later batch
  writes its parts, pieces, prologue and binding and it opens by itself.
- **One at a time** (`offeredChain`): nothing is offered while a chain goes (`activeChain`); the next is the first chain not done, offered
  once the chain before it is done and its own opening holds. A chain is done when bound at the Summoner, or when its Eidolon is bound some
  other way (the `?eidolons=all` dev flag), so the flag never leaves a chain hanging.
- **Begun** by the prologue (`beginChain`, the page's call as it ends). **The parts go in order** (`noteChains`, beside `noteQuests` in
  `settleRun` and at the Last Stand's end): the part going counts a settled fight with the quests' own `goalGain` (a practice replay counts
  nothing; losing never takes progress away); done, it finds its piece (`Meta.quests.pieces`), pays its reward (a bronze chest, as the
  design asks) and the next part begins from nothing.
- **The chain's quest battle** runs on the quest battles' machinery (its strength, cast, seed, save slot, Try again, practice replays): it
  is found by `questBattleById` but is not one of the eleven (`QUEST_BATTLES`), and no quest in the log opens it: `canFightBattle` also
  lets a battle be fought while the chain's part going asks for it (`chainWantsBattle`).
- **Hidden until owned**: the battle's one slot is Ravi (Blade and Spell) or Natsu (Sword and Shield), with every other starter hero as a
  stand-in, so any save can field it whatever its pack (tested). Should a save own none of them (`partBlocked`), the part shows greyed with
  who it needs instead of vanishing (the design's rule for a chain).
- **Bound** (`bindChain`): when every piece is in (`readyToBind`), the binding binds the Eidolon (`bindEidolon`), makes it the one the War
  Horn calls (`chooseEidolon`, even if another was chosen), marks the chain done and pays a gold chest (the design: "a gold one on
  binding"). The next chain may then open.
- **The save**: `Meta.quests.chains` (`{ [chain]: { part, progress, bound? } }`) and `Meta.quests.pieces`, read by `readChainState` from
  `readQuests` (chains not in the game or without parts dropped, parts and counts kept in range, `bound` only with every piece in, unknown
  pieces dropped). Optional fields; no version bump. **An older save** (no chain state) is offered Askel's chain as soon as it loads with
  the Orc Warband cleared.
- **Why a new battle and not The Kiln Road**: The Kiln Road (0.271.0) is an ordinary quest (the pedlar's smoking crown, the Ash Warden)
  with Ravi alone in its cast; reusing it would tie the chain to one pack's hero and to an ordinary quest's state (`won`, its hand-in), and
  its story is about a crown, not a hound. *The Kennel Fires* is the chain's own (autumn land, the Beast Packs' red wolves and an Alpha as
  the Ash-Mane), measured like the others: `npm run quest-rate -- 20 +5 --only=kennelFires` wins 75% at level 6 and 100% at level 10
  (`ease` 1.6; the tool now rates the chains' battles too).

## The page

- **The Sanctum** (`hall.ts`, a few lines): the Summoner's plaque over the shards' scroll, an ember-lit button while a chain is to be heard
  ("The Summoner looks up from the altar · tap to listen"), a quiet one while a chain goes ("Askel, the Cinderhound · 1 of 3 pieces · Part
  2: The Kennel Fires": the log's Eidolons tab), and "Bind Askel, the Cinderhound" when every piece is in. A **Pact Gallery** button beside
  the chest shop once the chains have begun. The Recruit tab's dot also lights while the Summoner waits (a chain to hear or to bind).
- **The prologue** plays in the scene player over the home screen (`HomeHooks.onStory`, whatever the Cinematics setting: it is the
  chain's sense), the Summoner a voice off the stage, the party's first two heroes answering; then the chain begins and the log opens on
  its Eidolons tab.
- **The quest log's Eidolons tab** (`questLog.ts` shows it once a chain has been offered; drawn by `eidolonChainView.ts`): the six chains,
  easiest first. A sleeping one is its Eidolon's silhouette (its figure, black, with a faint rim of its colour) and "?", and says what
  opens it. The chain going: its piece slots (found ones lit and tappable for their card), the part, its goal and bar, the giver's words,
  **Fight: The Kennel Fires** on the battle's part, **Story** (the prologue again) and a practice **Replay** of the battle once won. Ready:
  "Bind at the Sanctum". Bound: its card, "Bound · answers the War Horn".
- **A piece's card** (`showPieceCard`): the piece's sigil, a kicker ("A piece of Askel's pact · 1 of 3"), its name, its two lines and what
  comes next ("Part 2 of 3 begins: The Kennel Fires", or "Take them to the Summoner"). It rises a moment after an army fight's result; for
  the chain's battle it waits until the beat after has played and the log has opened on the chain. An auto-replay shows none (the log has
  it).
- **The binding** (`eidolonBinding.ts`, about 13 s, the beats from the data): the Sanctum darkens behind letterbox bars, the three pieces
  float up onto the altar, the bell is rung and the summoning circle (`eid-circle.webp`, tinted fire) catches fire with the braziers' glow,
  Askel rises behind the altar in his painted figure, breathing, with embers drifting up; "ASKEL, the Cinderhound" stamps in; he speaks
  his line; the seal reads **Bound** ("Askel answers the War Horn"). A tap moves on a beat; Continue binds him (`bindChain`), and the Pact
  Gallery opens on him. Reduced motion: nothing rises, drifts or turns; the beats fade in and out held still. The Summoner's casting pose,
  the beam and the eye-shield are the hall's own still painting here (the hall's actor is not separate art).
- **The Pact Gallery** (`openPactGallery`): six arched alcoves, the bound Eidolons in theirs with their card art and name (the chosen one
  ringed), the rest silhouettes with "?" ("Something sleeps here", or "2 of 3 pieces" for the chain going). A tap on a bound one: its card,
  attack, rider, the line it spoke at its binding, its pieces, **Answer the horn** (choose it; the horn keeps its fill) and **Watch the
  binding** again. Reached from the Sanctum and from the War Horn's card at the camp (its new **Pact Gallery** button).
- **Then the horn**: Askel bound is chosen, so a full horn calls him in any fight (batches 3 and 4's call, unchanged).

## The pieces' art (for a future prompt)

There are no paintings of the pieces yet: each piece's sigil borrows a painted gear icon (`PieceDef.art`, from `src/art/gear/`: the Ember
Amulet, the Iron Ring, the Silver Bell) in a ring of the Eidolon's colour. To paint, in the gear icons' style (128 x 128 and 256 x 256, a
precious object on a transparent ground, lit from above, a darker outline): **the Ember Heart** (a fist-sized coal of black basalt cracked
with slow-beating orange light, wisps of heat, held in no setting), **the Kennel Collar** (a massive black-iron dog collar, wide as a
cartwheel, worn smooth, the keep's crest on a brass buckle, faintly glowing from within like a cooling forge), **the Kennel Bell** (a small
tarnished silver hand-bell on a frayed leather cord, a hound's head worked into its handle, a glint of ember in its mouth). Later chains'
pieces join this list as their batches write them.

## A fix on the way

- **A fight that never moved** (`main.ts`, the home screen's hidden-attribute watcher): the ticker was stopped whenever the home screen hid
  while the board still held a fight's `won` or `lost` (as after a run that ended), so a quest battle begun from the home screen just after
  could sit at 0:00. It now stops only while the home screen is up. Found by the browser check (the chain's part 2 straight after part 1).

## Changed from the design, or left open

- **The goals**: the design's chain 1 had a hero rider on part 1 (Ravi or Kwame) and the daily for part 3; Askel's has no hero riders at
  all outside the battle's slot (the owner's rule), and the Undead Legion's Bone Captain for part 3 (the daily is open from the start, so it
  would not belong to levels 5 to 12; the Legion does).
- **The horn** fills from the start (batch 3), not only once the first chain has begun.
- **The binding is not a pixel scene** in the scene player: it is a short cinematic of its own over the Sanctum, for Askel's painted figure;
  its beats are data (`ChainDef.binding`), and the prologue is a `Scene`, so both can move onto the shot layer (`claude/cinematics`).
- **Not kept in the codex's Scenes list**: the prologue replays from the chain's **Story** button, the binding from the Pact Gallery.
- The piece sigils are borrowed paintings until the pieces are painted.

## Checked

`npm run typecheck`; `npm test -- eidolon-chains quests quest-battles` (`test/eidolon-chains.test.ts`, 8 tests: the data and the rails;
the chain's own battle and its cast from both starter packs only; offered after the Orc Warband (an older save at once) and begun once;
one at a time (none while one goes, the rails never offered unwritten, the dev flag's binding closing them); parts in order with their
pieces and bronze chests, the battle open only on its part, practice counting nothing, the Undead Legion's Bone Captain only; the binding
(bound, chosen over another, a gold chest, once); hidden until owned (each pack's hero, a stand-in, a blocked part named); determinism and
the save (through `saveMeta`/`loadMeta`, junk dropped)). One existing test updated for the new requirement: `quests.test.ts` asserted
that an unknown `chains` entry was kept raw for "a later batch"; this is that batch, so an unknown chain is now dropped. The full
`npm test`; `npm run web`. `npm run quest-rate -- 20 +5 --only=kennelFires` and `+9` (75%, 100%).

In the browser (`tools/eidolon-chains/shots.mjs`, a real save of the Blade and Spell pack at level 10 with the Orc Warband cleared; each
fight hurried by thinning the foes, a tool's shortcut) at 393x852, 360x780 and 412x915: the Sanctum's plaque, the prologue, the Eidolons
tab at each part, each part done in a real fight and its piece card, the chain's battle (party, story, deploy, fight), the Sanctum ready
to bind, the binding beat by beat, the Pact Gallery and Askel's card, the horn's card at the camp and its Pact Gallery button, and the horn
blown in a fight with Askel answering. Screenshots: `docs/samples/eidolon-chain1-*.png` (`-360`, `-412` for the other sizes).
