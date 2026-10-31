# Secret heroes, and the hero quests

The owner's ask: "Let's keep the heroes that are gained from specific unlock scenarios a secret. Also, let's add some quests in which a
hero comes from." Every existing fight plays out the same: nothing new draws from a fight's streams, and the tales draw nothing at all.

## Secret heroes (`src/sim/secretHeroes.ts`)

- **The secret heroes** are the ten earned in play (`CONTENT_KINDS`): all ten now by a hero quest (below; three in SECRET-HEROES, the
  other seven in HERO-TALES-2, the owner's call). A hero is
  secret to a save while it has not joined (`isSecret`, `secretsOf`); once it joins it is an ordinary hero and its first reveal plays
  as before (the earned arrival, `earnedArrival.ts`, with its deed: "Earned: see The Thing at the Fold to its end").

  | Hero | Joins when (was) | Hint shown |
  | --- | --- | --- |
  | Werewolf (Vuk) | the tale The Thing at the Fold is done (the Beast Packs cleared) | A hero waits for a tale to be told in the tavern |
  | Dread Pirate (Harrow) | the tale A Sellsword in Chains is done (wave 20 of the Last Stand) | the same |
  | Juggernaut (Kerem) | the tale The Iron Pilgrim is done (the Golem Forge on Hard) | the same |
  | Reaper (Vesper) | the tale The Ledger of the Unburied is done (the Undead Legion on Hard) | the same |
  | Demon Swordsman (Aram) | the tale The Pawned Blade is done (the Infernal Host on Hard) | the same |
  | Samurai Commander (Hideo) | the tale The Banner in the Mist is done (the Yokai Night Parade on Elite) | the same |
  | Tyrant (Edmund) | the tale The Second Throne is done (wave 40 of the Last Stand) | the same |
  | Time Witch (Adaeze) | the tale Yesterday's Visitor is done (a Calamity cleared) | the same |
  | Queen Dragoon (Tiziri) | the tale The Scorched Eyrie is done (a Calamity cleared at ascension 3) | the same |
  | Great Sage (Seydou) | the tale The Fallen Star is done (half the bestiary met) | the same |

  No old milestone grants a hero any more (`grantContent` gives a hero whose tale's last part is in `quests.done`); the "deed of note"
  hint is left in `secretHint` for a hero that is not a tale's, and none is now.

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

A giver slot, `tale`, with ten givers by the tavern's fire, one a tale (faces composed from LPC layers, `tools/hero-quests/cut.py`, run
by hand with the assets repo: `python3 -I tools/hero-quests/cut.py <chronos-assets> [name ...]`): Old Maud (a shepherd), Brannock (the
keep's turnkey), Edda Coalbrook (a forge-hand), and since HERO-TALES-2 Sexton Pell (the chapel yard's ledger), Ottilie Marsh (a
pawnbroker of Lantern Row), Kiku (a lantern-seller from the shrine road), Master Fenwick (the keep's herald), Hesper Tock (a clockmaker),
Wren Halloway (a falconer of the high crags) and Ivy Penhallow (the keeper of the keep's bestiary). A tale's parts follow each other by
`after`; each part is put on the board as soon as its story allows (`offerTales`, from `refreshOffers`: no daily draw, so nothing waits
on luck), and stays until taken (the slot's `cap` is 10, one part a tale; `offerTales` does not draw, so it never limits). They are
ordinary quests otherwise: taken, tracked, dropped and handed in from the log or the giver's card, with the 3-quest limit. The tale's
hero is "the stranger" in its battle's story and "the visitor", "the customer", "the soldier", "the occupant", "the rider" or "the
star-counter" in its words (a black figure, `shade`, never in a close-up, which would show its painted portrait); the reward reads as
the tease ("the visitor joins your company"). The last part's hand-in brings the hero in (`Reward.hero`, `payReward`); its reveal plays
as the giver's card closes (`CardHooks.closed`) or over the log.

| Tale (giver) | Opens | Part 1 | Part 2 | Part 3 | Hero |
| --- | --- | --- | --- | --- | --- |
| The Thing at the Fold (Old Maud) | the Beast Packs cleared | Tracks: win 5 waves of the Beast Packs (150 crowns, 2 stones) | The Moonlit Fold: quest battle | | Werewolf (Vuk) |
| A Sellsword in Chains (Brannock) | the Last Stand open, 3 armies cleared | His Keep: reach wave 10 of the Last Stand (200 crowns, 2 stones) | His Old Crew: fell 40 skeletons (250 crowns, a bronze chest) | The Tide in the Moat: quest battle | Dread Pirate (Harrow) |
| The Iron Pilgrim (Edda Coalbrook) | the Golem Forge cleared | Footprints in the Slag: win 6 waves of the Golem Forge on Hard (400 crowns, 3 stones) | The Long March: quest battle | | Juggernaut (Kerem) |
| The Ledger of the Unburied (Sexton Pell) | the Undead Legion cleared | The Uncounted: win 6 waves of the Undead Legion on Hard (300 crowns, 3 stones) | The Bell at Midnight: fell 60 of the Undead Legion's foes (350 crowns, a bronze chest) | The Thirteenth Bell: quest battle | Reaper (Vesper) |
| The Pawned Blade (Ottilie Marsh) | the Infernal Host cleared | Ticket Thirteen: win 6 waves of the Infernal Host on Hard (500 crowns, 3 stones) | The Debt Collectors: quest battle | | Demon Swordsman (Aram) |
| The Banner in the Mist (Kiku) | the Yokai Night Parade cleared | Lanterns on the Road: win 5 waves of the Yokai Night Parade on Elite (600 crowns, 4 stones) | The Crows' Tally: fell 30 crow tengu and crow seers (600 crowns, a silver chest) | A Hundred Lanterns: quest battle | Samurai Commander (Hideo) |
| The Second Throne (Master Fenwick) | the Last Stand open, 6 armies cleared | A Summons: reach wave 30 of the Last Stand (600 crowns, 4 stones) | Contempt of Court: hold the line at an act's end 3 times (700 crowns, a silver chest) | The Appeal: quest battle | Tyrant (Edmund) |
| Yesterday's Visitor (Hesper Tock) | the Calamity open | The Stopped Clocks: fell 2 Calamity guardians on the fourth map or later (700 crowns, 4 stones) | The Hour Out of Place: quest battle | | Time Witch (Adaeze) |
| The Scorched Eyrie (Wren Halloway) | a Calamity cleared at ascension 1 (new need `ascension`) | Feathers and Ash: clear a Calamity whole twice (800 crowns, 5 stones) | The Net-Men: fell 40 of the Ogre Clans' foes (700 crowns, a gold chest) | The Nest: quest battle The Scorched Eyrie | Queen Dragoon (Tiziri) |
| The Fallen Star (Ivy Penhallow) | a third of the bestiary met (35%; new need `bestiary`) | Notes in the Margin: fell 30 of the Labyrinth's foes (500 crowns, 3 stones) | The Crystal Moths: fell 20 crystal golems (600 crowns, a silver chest) | The Way Home: quest battle The Star-Hearted | Great Sage (Seydou) |

**Why these:** each was a milestone hero whose story fits a tale (a wolf-man hiding in a fold; a twice-drowned captain fished out of the
moat in chains; a walking wall that left the Forge; a quiet figure with a scythe writing the Legion's dead into a sexton's ledger; a
swordsman who pawned his hungry blade to quit the Infernal Host; a soldier who has held the shrine road under a banner every night; a
crowned stranger passing sentence from a second throne at the Last Stand; a lady who visits a clockmaker the day before she arrives; a
rider guarding a scorched nest on the crags; a star-counter fixing the bestiary's margins), and moving milestone heroes keeps the shard
pool (`PULL_HEROES`, 35) and so the shard curve and the unlock pace untouched. Each tale opens about where its milestone was: a Hard or
Elite milestone opens with the army's Normal clear and asks for its waves on that tier, as the Forge's did; the Last Stand's asks for
waves short of the old mark plus more parts; the Calamity's ask for its deep maps or clears; the bestiary's opens at a third instead of
half. The two new needs are `{ kind: 'ascension', n }` (`ascCleared >= n`) and `{ kind: 'bestiary', share }` (that share of the
bestiary's entries met), in `needMet`.

**The battles** run on the quest battles' machinery (seed, slot, Try again, practice replays); the cast rule is the Eidolon chains': one
slot, a hero of either starter pack, every other starter hero standing in, so any save can field it. They are meant to be **hard**: about
30 to 50% won at the level the tale opens (the owner's call).

| Battle | Like | Land | Waves | Boss | ease | Rated at (opens about) | Won there | Five levels above |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| The Moonlit Fold | Beast Packs wave 12 (15) | plains | 3 | The Grey Widow, Mother of the Moonlit Pack (the Alpha Werewolf) | 1 | 15 | 30% | 55% |
| The Tide in the Moat | Wildwood wave 11 (22) | swamp | 3 | Mistress Marrow, First Mate of the Second Drowning (the Bone Captain) | 1.2 | 22 | 30% | 55% |
| The Long March | Golem Forge wave 12 (74) | forge | 3 | The Foreman, Who Counts Every Stone (the Forge Titan) | 0.33 | 74 | 50% | 60% |
| The Thirteenth Bell | Labyrinth wave 12 (35) | graveyard | 3 (a mid-boss) | The Roll-Caller, Who Reads the Names of the Dead (the Lich King) | 0.95 | 35 (the Undead on Hard) | 35% | 28% |
| The Debt Collectors | Golem Forge wave 9 (74) | desert | 3 | Paymaster Grisk, Who Docks Every Wage (the Devil Leader) | 0.48 | 74 (the Infernal Host on Hard) | 40% | 43% |
| A Hundred Lanterns | Golem Forge wave 13 (74) | shrine | 3 | Kagari of the Nine Tails, Who Leads the Parade Astray (the Nine-Tailed Fox) | 0.47 | 85 (the Yokai on Elite) | 38% | 53% |
| The Appeal | Golem Forge wave 15 (74) | dungeon | 3 (a mid-boss) | Gorm the Appellant, Who Will Not Be Sentenced (the Orc Warlord) | 0.45 | 90 (the Last Stand's wave 30 and on) | 35% | 38% |
| The Hour Out of Place | Golem Forge wave 12 (74) | desert | 3 | Never-o'-Clock, Who Eats the Hours (the Demon Lord) | 0.39 | 80 (the Calamity's deep maps) | 43% | 55% |
| The Scorched Eyrie | Golem Forge wave 14 (74) | snow | 3 (a mid-boss) | Hrask the Wing-Breaker, Chief of the Net-Men (the Horned Ogre) | 0.43 | 95 (Calamity ascensions) | 43% | 60% |
| The Star-Hearted | Infernal Host wave 12 (58) | crystal | 3 | The Star-Hearted, Who Wants to Go Home (the Sapphire Colossus) | 0.48 | 58 (a third of the bestiary) | 48% | 53% |

Measured by `npm run quest-rate -- 40 +L --only=<id>` (40 tries each for the seven new ones, 20 for the first three), `L` the levels above
the like army's own to the level the tale opens about (my judgement of where a player meets that milestone: the tool rates a party at
the like army's level plus `L`). `--ease=<x>` (new) rates one battle at a trial ease. The rate climbs slowly with level (the Thirteenth
Bell's five-levels-above row is lower, within the noise of 40 tries): these stay hard for a while, as asked. The late ones use the Golem
Forge's strength with a low `ease` (as the Long March does), since no army is rated above level 74.

**A save that has the hero already** (an old save that earned it by its old milestone) is told the same tale and paid `instead`: 400
crowns and 4 stones (the Fold), 500 and 4 (the Chains), 800 and 5 (the Pilgrim), 600 and 5 (the Ledger), 800 and 5 (the Blade), 900
and 6 (the Banner), 1000 and 6 (the Throne), 1000 and 6 (the Visitor), 1200 and 7 (the Eyrie), 900 and 6 (the Star); the words say so.
A save that met an old milestone but never loaded since keeps nothing it did not have: no milestone grants on load now. The earned
reveal scenes' narration for all ten is rewritten to the tales (`sceneScripts.ts`; the Tyrant's first words too, which spoke of forty
waves).

**Saves:** no new save fields beyond the optional `Run.hide` (the tales use `Meta.quests` as any quest); no version bump.

## Tests

`test/secret-heroes.test.ts` (13): the secret set; no screen's words name a secret (the lock line, the hint, the combos, the scenes);
**no quest that can be offered to a save without a secret hero names it**, in its words, its pay or its battle's story (over 1000
quest-and-hero cases, all ten tales included); no secret as a guest or a Calamity hire; the tales' shape (one giver and one battle a
tale, parts in order, a hero at the end, any starter pack can field the battles, the stranger dark and never in a close-up); the Fold
offered when, parts in order, the hero joins once; the Last Stand's and the Forge's goals; a save that has the hero is paid otherwise; a
secret's shards as stones; a save with a tale done gets the hero on load; and since HERO-TALES-2: **all ten tales play through** (closed
on a new save, one part of each on the board at a time, the hero joining only at the last part, once); the new needs (a Calamity cleared
at ascension 1, not a plain clear; a third of the bestiary, not one short); the new tales' goals count what they say (the Yokai on Elite
and not Hard, thirty crows and not the foxes, the Legion's foes won or lost, the Calamity's guardians from the fourth map).
`tools/secret-heroes/shots.mjs` and `tools/hero-tales-2/shots.mjs` also check every page they visit (text and alt, aria, title, data and
src attributes) for any secret hero's name, title or class.

Tests changed for the owner's rule: `hero-shards.test.ts` (no old milestone brings a hero: the Last Stand's waves, the armies' Hard and
Elite, the Calamity, its ascension, the bestiary; a tale's end does; every secret's hint is the tavern's), `scene-fixes.test.ts` (no
hero joins at the Last Stand's waves now), `recap-reveal.test.ts` (the Reaper's deed line names its tale), `quest-battles.test.ts` (its
"eleven battles" set excludes the tales' battles), `quests-content.test.ts` (its hundred uniques exclude the tales; tale givers are not
held to four quests each; a hero is pay), `quests.test.ts` (a hero is pay).

Screenshots: `docs/samples/hero-tales-2-*.png` at 393x852, 360x780 and 412x915 (the board with each new tale's first part, the seven new
givers' cards, The Thirteenth Bell's log row, story and stranger, its deploy, and The Second Throne's hand-in, thanks and reveal); no page
error and no secret named on any page.

## Open points for the owner

- **The daily's themed days** field fixed fives for everyone, and some name a secret hero (Beasts' Night has the Werewolf, Sea Dogs the
  Dread Pirate, Crown and Lance the Queen Dragoon and the Tyrant): kept as they are (the owner's call).
- The roster's heading still counts "0 of 10 earned in play" (a count, no names).
- **The levels the tales open at** are my reading of where a player meets each milestone (the Undead on Hard about 35, the Infernal on
  Hard about 74, the Yokai on Elite about 85, the Last Stand's wave 30 about 90, the Calamity's deep maps about 80, its ascensions about
  95, a third of the bestiary about 58); if the owner sees those players elsewhere, `ease` moves each battle in one number.
- The story's stranger is a black shade, as in the first three: its outline (a scythe, a lance, a crown) still hints at what it is.
