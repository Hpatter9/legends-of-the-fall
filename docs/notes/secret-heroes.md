# Secret heroes, and the hero quests

The owner's ask: "Let's keep the heroes that are gained from specific unlock scenarios a secret. Also, let's add some quests in which a
hero comes from." Every existing fight plays out the same: nothing new draws from a fight's streams, and the tales draw nothing at all.

## Secret heroes (`src/sim/secretHeroes.ts`)

- **The secret heroes** are the ten earned in play (`CONTENT_KINDS`): seven by a milestone, three now by a hero quest (below). A hero is
  secret to a save while it has not joined (`isSecret`, `secretsOf`); once it joins it is an ordinary hero and its first reveal plays
  as before (the earned arrival, `earnedArrival.ts`, with its deed: "Earned: see The Thing at the Fold to its end").

  | Hero | Joins when | Hint shown |
  | --- | --- | --- |
  | Werewolf (Vuk) | **the tale The Thing at the Fold is done** (was: the Beast Packs cleared) | A hero waits for a tale to be told in the tavern |
  | Dread Pirate (Harrow) | **the tale A Sellsword in Chains is done** (was: wave 20 of the Last Stand) | the same |
  | Juggernaut (Kerem) | **the tale The Iron Pilgrim is done** (was: the Golem Forge on Hard) | the same |
  | Reaper (Vesper) | the Undead Legion on Hard | A hero waits for a deed of note |
  | Demon Swordsman (Aram) | the Infernal Host on Hard | the same |
  | Samurai Commander (Hideo) | the Yokai Night Parade on Elite | the same |
  | Tyrant (Edmund) | wave 40 of the Last Stand | the same |
  | Time Witch (Adaeze) | a Calamity cleared | the same |
  | Queen Dragoon (Tiziri) | a Calamity cleared at ascension 3 | the same |
  | Great Sage (Seydou) | half the bestiary met | the same |

- **What every screen shows for one:** one dark figure with a brass "?" (`secretFigure`, `src/secretView.ts`, `src/secret.css`: the
  same for all ten, so no hero's shape or colours are given), "???", and the hint at most. No name, title, class, role, art, sprite,
  kit, stats, bar or count towards its milestone. Where:
  - **All heroes** (`menuHeroes.ts` `drawRoster`): the section "Earned in play" is now "Secret heroes"; a row's tap opens a secret sheet
    (`paintSecret`: the figure, "???", "a secret, for now", the hint; nothing else). Any other way into a secret hero's sheet (the
    tavern's empty seat, the party's "i") gets the same sheet.
  - **The party screen** (`party.ts`): the card's sprite is the figure, its name "???", its line "A secret"; a role filter never lists a
    secret (its role would give it away); search never finds one.
  - **Recruit** (`gacha.ts`): the collection's cell is the figure, "???" and "A secret".
  - **The codex** (`codexView.ts`): the Heroes grid's card and page are the figure, "???" and the hint (an unknown shard hero still
    shows its class, as before). A five-hero combo not seen yet hints at its first hero who is no secret (`comboHint`), never at a secret.
  - **The lock line** (`lockInfo`, `contentHeroes.ts`): a secret's is `{ line: hint, need: 0, named: false, short: 'A secret' }`.
  - **Quests**: a reward of a secret hero's shards reads and pays as that many stones until it joins (`rewardWords`, `payReward`; the
    shards could not be held anyway, and the words named it: An Empty Den paid "2 of Vuk's shards"). Under the Courtyard's goal named
    Kerem as a stand-in; it now says "Asterion or another strong back".
  - **Guests and Calamity hires**: `Run.hide` (optional; set by the page in `syncPool` to the save's secrets) keeps them out of the
    passing cart's guest (`guestKinds`) and the Calamity's hires (`hireable`). A run without it (an old save's, the tools') draws as
    before, so every measured fight is unchanged.
  - Already safe, checked: the starter pick and pulls never offer an earned hero; the hall's and recruit's "closest" lines are shard
    heroes only; the tavern's locked seat is an empty chair; the scenes list folds the earned reveals into "???".

## The hero quests (`src/sim/questData/tales.ts`, battles in `src/sim/taleBattleData.ts`)

A new giver slot, `tale`, with three givers by the tavern's fire (faces composed from LPC layers, `tools/hero-quests/cut.py`): Old Maud
(a shepherd), Brannock (the keep's turnkey) and Edda Coalbrook (a forge-hand). A tale's parts follow each other by `after`; each part is
put on the board as soon as its story allows (`offerTales`, from `refreshOffers`: no daily draw, so nothing waits on luck), and stays
until taken. They are ordinary quests otherwise: taken, tracked, dropped and handed in from the log or the giver's card, with the 3-quest
limit. The tale's hero is "the stranger" (or "the prisoner", "the walker") in every part and in the battle's story (a black figure,
`shade`, never in a close-up, which would show its painted portrait); the reward reads as the tease ("the stranger joins your company").
The last part's hand-in brings the hero in (`Reward.hero`, `payReward`); its reveal plays as the giver's card closes (`CardHooks.closed`)
or over the log.

| Tale (giver) | Opens | Part 1 | Part 2 | Part 3 | Hero |
| --- | --- | --- | --- | --- | --- |
| The Thing at the Fold (Old Maud) | the Beast Packs cleared | Tracks: win 5 waves of the Beast Packs (150 crowns, 2 stones) | The Moonlit Fold: quest battle | | Werewolf (Vuk) |
| A Sellsword in Chains (Brannock) | the Last Stand open, 3 armies cleared | His Keep: reach wave 10 of the Last Stand (200 crowns, 2 stones) | His Old Crew: fell 40 skeletons (250 crowns, a bronze chest) | The Tide in the Moat: quest battle | Dread Pirate (Harrow) |
| The Iron Pilgrim (Edda Coalbrook) | the Golem Forge cleared | Footprints in the Slag: win 6 waves of the Golem Forge on Hard (400 crowns, 3 stones) | The Long March: quest battle | | Juggernaut (Kerem) |

**Why these three:** each was a milestone hero whose story fits a tale (a wolf-man hiding in a fold, a twice-drowned captain fished out of
the moat in chains, a walking wall that left the Forge), and moving milestone heroes keeps the shard pool (`PULL_HEROES`, 35) and so the
shard curve and the unlock pace untouched. Each tale opens about where its milestone was (the Forge's asks for Hard, as before; the Last
Stand's asks for wave 10, not 20, plus two more parts).

**The battles** run on the quest battles' machinery (seed, slot, Try again, practice replays); the cast rule is the Eidolon chains': one
slot, a hero of either starter pack, every other starter hero standing in, so any save can field it.

| Battle | Like | Land | Waves | Boss | ease | At its army's level | Five levels above |
| --- | --- | --- | --- | --- | --- | --- | --- |
| The Moonlit Fold | Beast Packs wave 12 (15) | plains | 3 | The Grey Widow, Mother of the Moonlit Pack (the Alpha Werewolf) | 1 | 30% | 55% |
| The Tide in the Moat | Wildwood wave 11 (22) | swamp | 3 | Mistress Marrow, First Mate of the Second Drowning (the Bone Captain) | 1.2 | 30% | 55% |
| The Long March | Golem Forge wave 12 (74) | forge | 3 | The Foreman, Who Counts Every Stone (the Forge Titan) | 0.33 | 50% | 60% |

Measured by `npm run quest-rate -- 20 [+5] --only=<id>` (20 tries each; the tool now rates the tales' battles too), set as the others
were: about half to two thirds won five levels above the army. The Forge Titan's kit weighs heavily on a three-wave fight, so its `ease`
is low, as the Bridge Oni's (0.4).

**A save that has the hero already** (an old save that earned it by its old milestone) is told the same tale and paid `instead`: 400
crowns and 4 stones (the Fold), 500 and 4 (the Chains), 800 and 5 (the Pilgrim); the words say so. A save that met an old milestone but
never loaded since keeps nothing it did not have: the three milestones no longer grant on load. The earned reveal scenes' narration for
the three is rewritten to the tales (`sceneScripts.ts`).

**Saves:** no new save fields beyond the optional `Run.hide` (the tales use `Meta.quests` as any quest); no version bump.

## Tests

`test/secret-heroes.test.ts` (10): the secret set; no screen's words name a secret (the lock line, the hint, the combos, the scenes);
**no quest that can be offered to a save without a secret hero names it**, in its words, its pay or its battle's story (over 1000
quest-and-hero cases); no secret as a guest or a Calamity hire; the three tales' shape (givers, parts in order, one battle each, a hero at
the end, any starter pack can field the battles, the stranger dark and never in a close-up); offered when, parts in order, the hero
joins once; the Last Stand's and the Forge's goals; a save that has the hero is paid otherwise; a secret's shards as stones; a save with
a tale done gets the hero on load. `tools/secret-heroes/shots.mjs` also checks every page it visits (text and alt, aria, title, data and
src attributes) for any secret hero's name, title or class.

Tests changed for the owner's new rule: `hero-shards.test.ts` (wave 20 and the Beast Packs no longer bring the Dread Pirate and the
Werewolf; a content hero's lock line is the secret hint, no name or bar), `scene-fixes.test.ts` (only the Tyrant joins at the Last
Stand's waves), `quest-battles.test.ts` (its "eleven battles" set excludes the tales' battles), `quests-content.test.ts` (its hundred
uniques exclude the tales; tale givers are not held to four quests each; a hero is pay), `quests.test.ts` (a hero is pay).

## Open points for the owner

- **The daily's themed days** field fixed fives for everyone, and some name a secret hero (Beasts' Night has the Werewolf, Sea Dogs the
  Dread Pirate, Crown and Lance the Queen Dragoon and the Tyrant): they fight on the board with their names. Left as they are; swap them
  for unowned saves, or keep the daily the same for everyone?
- The roster's heading still counts "0 of 10 earned in play" (a count, no names).
- The other seven milestone heroes keep their milestones but show no progress now; should more of them get tales?
