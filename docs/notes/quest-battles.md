# Quest battles (quests, batch 2)

Batch 2 of the owner-approved design in [quests-summons-design.md](quests-summons-design.md) ("Quest battles", and the owner's
decisions at its end): a quest can open a one-off battle of its own, with a short story, a required cast of named heroes, its own land,
waves and boss, its own seed and its own save slot. Eleven of them, each opened by a quest from a fitting giver. Every existing fight
plays out the same: nothing new draws from a fight's streams, and army runs, dailies, the spire and the Calamity are untouched.

## The rules (`src/sim/questBattles.ts`, `src/sim/questRun.ts`; data in `src/sim/questBattleData.ts`, `src/sim/questData/battles.ts`)

- **A quest battle** (`QuestBattle`): a land, one to five waves (the armies' `Wave`), a boss of its own (`boss`: a name and a title on an
  existing boss, who keeps its kit, phases and signature attacks from 0.270.0), a required cast (`cast`: slots, each one hero or one of a
  few), an optional rule (`only`: the Audit's spellcasters; `most`: Gwen's cellar fits two), `duchess` (she fights in Under the
  Courtyard, every time, no roll), and two stories in the cinematics' own shape (`before(cast)`, `after(cast)`; played by the page's
  scene player, not kept in the Scenes list; a new `Moment` kind `questBattle` names them, and `CastMember.name` lets a story call the
  heroes by their own names and the boss by its quest name).
- **The army it is** (`questArmy`): an `Army`-shaped object, as the daily's `dailyArmy`, so the waves, the boss card, the long map,
  "Wave 2/3", the walk across, the hearts and the revive all come from the armies' own code. `waveArmyOf` returns it for a run of mode
  `{ kind: 'quest', quest, cast, practice? }`; `armyOfRun` still means a real army, so a quest battle keeps no army record or stars.
  Strength: the last wave's foes are as strong as the `like` army's Normal at its wave, times the battle's own `ease`; the waves before
  are a wave's growth weaker each; its bosses take the like army's mid-boss stats. It pays no crowns by the wave (the quest pays) and
  has no road events between its waves.
- **The required cast and the owner's rule** (`castOf`): each slot takes its first owned hero, no hero in two slots; a battle whose cast
  cannot be filled has no cast, and its quest is not offered (`heroesOwnedFor` reads the `battle` goal), nor drawn. Stand-ins
  (`standIns`) exist in the shape for the Eidolon chains (a later batch); no ordinary battle has any.
- **A try** (`startQuestBattle`): only while a quest taken asks for it, or once won (then it is `practice`: it pays nothing, XP
  neither, and counts for no quest). It counts the try (`Meta.quests.tries`), takes its seed from `questSeed(save seed, battle, try)`
  (`QB_SALT`), begins with the cast on the bench, free, at grade 1 (lasting levels, ranks and gear, as in any army run), and with the
  gold a run would hold by then (`questStartGold`: the armies' two hires plus what an army run is paid by the wave the battle's first
  wave stands for). The party picked for it is its pool for hires; the saved party is not changed.
- **The fight waits** (`notReady`, `notReadyWords`): Fight! stays disabled, and the deploy line says why ("Place Kenji and Hideo to
  begin", "Only spellcasters fight here: take Kwame off", "2 heroes at most in here: take one off"). A required hero cannot be recycled
  while it is the last of its kind (`isCastHero`, in `recycle`).
- **Winning** the last wave sets the goal `{ kind: 'battle', battle }` (`QuestFight.battle`, from `questFightOf`), remembers the battle
  won (`noteBattleWon`, in `settleRun`), and the quest waits to be handed in as any other. Its boss is not "that boss beaten"
  (`m.bosses` is left alone). **Losing** costs nothing: the result card's **Try again** begins a new try at once with a new seed and the
  same party; **Leave** goes to the quest log, where its Fight waits.
- **The save**: a quest battle has its own run slot, `legends.questRun` (`SLOT_KEYS.quest`), so starting one never ends a saved army
  run, daily, spire or Calamity run, and they never end it; one at a time (a new try replaces a saved one; the log's Fight reads
  Continue for the one saved). Start over wipes it too (`SAVE_KEYS`). `Meta.quests` gains `tries`, `won` and `told` (stories told),
  read safely by `readQuests` (battles no longer in the game dropped); a batch 1b save loads as it was. No version bump.

## The page

- **The quest log**: a battle quest's Active row has **Fight** (or **Continue**) and Drop; a battle won has **Replay** on the Done tab
  (practice). **A giver's card**: taking a battle quest turns the card to its **Fight** at once; a giver's card for a battle quest going
  has Fight too (Gwen's always opens; the patrons' and others' while they have an offer).
- **The party screen** (`Party.openQuest`): the cast already in their slots in a gold frame, a padlock and a "Quest" ribbon; a tap on one
  is a nudge and "Kenji must fight in this one."; the other slots from the saved party (only heroes who may fight in it); Auto-pick keeps
  the cast; the hint names the battle, the cast and its rule; "To the quest" starts the try. Nothing is saved to the party.
- **The story before** plays over the deploy the first time a battle is begun (once a save; whatever the Cinematics setting, since it is
  the quest's sense), then **the deploy**: the cast waits on the bench in a gold frame with a padlock; Fight! waits for them.
- **The fight**: the boss's card and bar show its quest name and title ("THE BRIDGE ONI · Toll-Keeper of the Eastern Span"; the card plays
  once for each battle). **The win**: "Quest battle won!", the beat after, then the tavern's quest log, where the quest waits to be handed
  in. A replay's win says so and goes home.
- Files: `src/main.ts` (the hooks: `openQuestBattle`, `beginQuestTry`, `tellQuestStory`, `questBlock`, `questEnd`, `leaveQuest`, the bench
  lock, the result card, the boss's name), `src/party.ts`, `src/questLog.ts`, `src/questCard.ts`, `src/home.ts` (`onQuestBattle`,
  `questSaved`), `src/questBattles.css` (in `build.mjs`), `#qbLeave` in `src/index.html`.

## The eleven battles

| Battle | Quest (giver) | Opens | Cast | Land | Waves | Boss | A line of story |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Two Blades on the Bridge | Two Blades on the Bridge (Kenji) | the Night Parade cleared | Kenji, Hideo | shrine | 3 | The Bridge Oni (the Oni King) | Hideo: "You were very young. And very loud." |
| Salt and Cannon | The Captain's Wager (Tiago), after Who Pays for the Rum | 3 armies | Tiago, Harrow | highlands | 3 | Captain Brine (the Bone Captain) | Brine: "Captain Harrow. You left us the bill." |
| The Kiln Road | A Crown of Cinders (the pedlar) | the Orcs cleared | Ravi | volcano | 3 | The Ash Warden (the Devil Leader) | Ravi: "I have chased fire my whole life. It is about time it led somewhere." |
| The Frozen Meadow | Frost on Their Backs (the hunter) | the Beast Packs cleared | Vuk, and Itzel or Inti | snow | 4 | The Rime Alpha (the Alpha Werewolf) | Vuk: "Wolves do not follow. Wolves lead." |
| Under the Courtyard | A Large Hole (Duchess) | Duchess met, the Labyrinth cleared | Kwame or Minh, and Asterion or Kerem; Duchess fights | ruins | 3 | The Mortar Warden (the Sapphire Colossus) | "Your Majesty, the goat has found a staircase." |
| What Knocks Below | What Knocks Below (Gwen), after Knocking in the Cellar | the Undead cleared | Natsu or Ayame; two heroes at most | dungeon | 2 | The Cellar Tenant (the Bone Captain) | The tenant: "Knock knock." Natsu: "Do not." |
| The Swept Floor | The Sweeper (the pilgrim), after The Pilgrim's Last Mile | 5 armies | Selam or Linnea | temple | 1 | The Sweeper (the Minotaur Champion) | The Sweeper: "BOOTS." |
| The Audit | The Audit (Zofia), after The Small Print | 4 armies | Zofia; only Caster, Arcanist or Mystic heroes | swamp | 2 | Mr Quill (the Demon Lord) | "Clause nine, sub-clause hell: a show of strength, by readers only." |
| The Midnight Recital | The Encore (a notice), after A Recital at Midnight | the Last Stand open | Lovell | graveyard | 4 | The Conductor (the Lich King) | The Conductor: "Too slow. FORTISSIMO." |
| Karnok's Door | One More Door (the rift), after At the Last Door | the Calamity open | Vesper | crystal | 5 (a mid-boss at 4) | The Door That Was Karnok (the Demon Lord) | "Karnok fell. His door did not get the message." |
| The White Wolf's Den | An Empty Den (the hunter), after The Last Hunt | the Beasts on Hard | Inti | forest | 3 | Old Tusk (the Boar King) | Inti: "Something heavy has moved in." |

The design's worked examples The Kiln Road, The Frozen Meadow and Under the Courtyard were Eidolon chain parts; they are built here as
ordinary quests with stories of their own (no Summoner, no pieces), since the Eidolons have been redesigned and their chains are to be
rewritten in their batches; those batches can re-home them or write new ones. Rewards: 180 to 700 crowns, with stones, chests, ores,
tomes, Vuk's shards for the den, and a keepsake for nine of them.

## Tuning (`npm run quest-rate [tries] [+levels] [--search] [--only=id]`)

`tools/quest-battles/rate.ts`: a greedy player (the cast first, then the strongest who may fight, summoning and merging as the armies'
player does, two hearts) with a party of the cast and starter heroes, every hero at the `like` army's Normal level plus the lift, no
talents. `--search` walks `ease` down a ladder until half the tries are won. Each battle's `ease` was set so a party five levels above
its army's level wins about half to two thirds of tries (a boss's kit weighs far more in a short fight with a small party than in an
army's fifteen waves: the Oni King's bridge needs 0.4, the Orcs' Kiln Road 1.75). Measured, 20 tries each:

| Battle | Like | Waves | ease | At its army's level | Five levels above |
| --- | --- | --- | --- | --- | --- |
| Two Blades on the Bridge | Night Parade wave 11 (level 65) | 3 | 0.4 | 35% | 45% |
| Salt and Cannon | Beast Packs wave 13 (15) | 3 | 1.3 | 35% | 60% |
| The Kiln Road | Orcs wave 11 (1) | 3 | 1.75 | 0% (level 1) | 55% (level 6) |
| The Frozen Meadow | Beast Packs wave 12 (15) | 4 | 1.1 | 35% | 60% |
| Under the Courtyard | Labyrinth wave 12 (35) | 3 | 1.6 | 35% | 45% |
| What Knocks Below | Undead wave 6 (8) | 2 | 0.8 | 0% | 55% |
| The Swept Floor | Ogre Clans wave 10 (45) | 1 | 0.72 | 35% | 60% |
| The Audit | Wildwood wave 12 (22) | 2 | 0.75 | 20% | 65% |
| The Midnight Recital | Wildwood wave 9 (22) | 4 | 0.72 | 20% | 50% |
| Karnok's Door | Ogre Clans wave 14 (45) | 5 | 0.48 | 45% | 40% |
| The White Wolf's Den | Ogre Clans wave 8 (45) | 3 | 0.65 | 35% | 55% |

With the two hearts, so a party a little past the army that opens a battle wins it in about two tries, as the design asks (2 to 4 tries
at the expected level); the probe's party has no talents, so the later armies' players (who have them) find them a little easier.

## Changed from the design, or left open

- **Starting gold**: the design gives the armies' usual start (two hires). With a battle as strong as an army's wave 11, a party of the
  cast and two hires lost every try; it now starts with what an army run would hold by then (`questStartGold`).
- **The layout** is picked by the land and the seed, as every army's (the design's `layout` field, a forced river for the bridge, would
  need the long map to take a layout; left out).
- **Duchess** fights only in Under the Courtyard (she never rolls into a quest battle).
- **The board figure's gold frame**: the bench card has it; the figure on the board does not (the deploy line names who is missing).
- A required hero can be taken off the board in a deploy (between waves too); Fight! waits until it is back. The design's "not dragged
  back once the fight has begun" holds already: nothing is dragged during a fight.
- The story plays whatever the Cinematics setting says (it is the quest's sense); there is no "Story" link to play it again yet.
- Stand-ins, the Eidolon chains' battles and the Winter Stag's trial wait for their batches.

## Checked

`npm run typecheck`; `npm test -- quest-battles quests settings` (`test/quest-battles.test.ts`: 16 tests: the data, one quest each, the
stories, the cast rule, hidden until owned (and never drawn), the fight's readiness, the army in shape and its strength, a try (its
seed, the cast on the bench, the saved party untouched, the same try the same fight), the recycle guard, Duchess, the run slot (an
army run untouched), winning and practice, losing and Try again, the save, the words, no road events). One existing test updated for
the new requirement: `quests-content.test.ts` counts the hundred uniques of batch 1b apart from the eleven battle quests. The existing
`settings.test.ts` (unchanged) caught that Start over must wipe `legends.questRun` too; fixed in `SAVE_KEYS`. The full `npm test`; `npm run web`.
Screenshots by `tools/quest-battles/shots.mjs` at 393x852, 360x780 and 412x915 (reduced motion; the game's other cinematics off so the
quest's own play; the fights hurried by thinning foes, a tool's shortcut):
`docs/samples/quest-battles-{offer,card-fight,log,party,party-locked,story,story-2,deploy,deploy-ready,fight,won,beat,handin,replay,lost,try-again}-<width>.png`.
