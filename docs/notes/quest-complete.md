# The Quest complete card (QUEST-COMPLETE)

The owner's ask: "We still need a quest complete screen after turning a quest in with its rewards and a recap. If it has story to the
quest, a little description is nice."

Handing a quest in used to change the giver's card in place (their thanks and one line of pay), or, from the quest log, do nothing
but play a coin. Now every hand-in opens the **Quest complete** card.

## What it shows

A standard ornate menu (`ornateMenu`, a card; `docs/notes/ui-standard.md`), in `src/questComplete.ts`:

- **Head:** "Quest complete" in the eyebrow, the quest's name, and its stars with their name and length ("★★★☆☆ · Trial · Short").
  Under it the giver's painted face, name and title (`faceOf`, `giverName`: a patron hero's portrait, the chosen ruler's picture).
- **The story,** where the quest has one (below). A quest with none shows the giver's thanks as one quoted line, and no story block.
- **What you did:** each objective with its final count ("Win 10 waves, in any mode · 10 of 10"); for a quest battle the battle won, who
  fought and how it went; for a part of a story "Part 2 of 3" and "Next: A Wheel for the Wall"; the days it took; a repeatable's count.
- **Rewards:** one row each, with its picture and amount: crowns, summoning stones, a chest, rift ores, XP tomes, a hero's shards (the
  hero's portrait), a Legendary book (its cover), a keepsake, a hero joining. They arrive one after another (380 ms apart), each amount
  counting up, each with a cue (`coinClaim` for crowns, `star` for a chest, a book or a hero, `sparkle` for the rest); a row arriving
  below the fold is scrolled into view. With reduced motion every row is there at once, the amounts final, with one cue.
- **Foot:** Close, and a primary button: "The next part" when the story has one to take, else "Quest board" (both open the board); for
  an Eidolon chain's part, "See the piece".

## The rules (`src/questCompleteRules.ts`, pure)

**The snapshot.** `handIn` takes the quest out of the log and pays it, so the card reads the quest first: `snapOf(m, id, today)` keeps
its definition as this save took it, each objective's count, the day taken, the heroes owned before the pay, and a quest battle's cast
and record. `questCompleteView(snap)` is the whole card as data.

**The story (`storyOf`).** Nothing is written for it: every line is cut from the quest's own text, and a test checks that for all 383
quests.

| Quest | The story block |
|---|---|
| A quest battle | Its blurb; the narrated line that ends the scene after its last wave (`closingOfScene`); the giver's closing line. |
| A part of a chain or campaign, a tale, a patron's quest, a Mythic's chain | The ask: the first two sentences of the last line of its offer; then the giver's closing line. |
| A plain errand (a short or long quest off the board: 136 of the 383) | None. The giver's closing line is shown alone, as their thanks. |

The closing line is the last of the quest's `done` lines, whole. `firstSentences` only ever returns a piece cut from the start of a
line, at a sentence end ("1.5 crowns" and "Hrrngh. look at me." are not split). I wrote no closing lines: every quest already has one.

**The recap (`recapOf`).** The objectives and counts come from the snapshot (a quest taken before a retune shows the goal it was taken
with). "Part n of m" is `partsOf` / `storyParts`; "Next" is the quest whose `after` is this one, if it may be shown. The days are from
the day it was taken to today; a save that does not know the day (an old one) has no such line.

**A quest battle's record.** The save did not keep how a battle was won, so the recap could not say. `noteBattleWon` now writes
`quests.how[battle]`: the heroes who fought (the one who dealt most first), the battle time, the fights and the try, from the run's own
books. It is written once, at the first win, and read back safely (`readQuests`). A battle won before this has no record: its card says
"won on the third try" from the tries the save already counts, and names the cast.

**The rewards (`rewardRows`).** The rows `payReward` pays, in its order. A test hands in every quest and checks the rows against what
the save really gained (crowns, stones, chests, a hero). A hero who joins is told as the quest's own tease ("The stranger joins your
company") with no portrait, so the join reveal that follows is still a reveal; a save that already has the hero sees the other reward.
A secret hero's shards read as the stones they are paid as.

## Where it opens

| Hand-in | Before | Now |
|---|---|---|
| A giver's card in the tavern (`questCard.ts`) | The card changed to their thanks and "+ pay" | The card closes and Quest complete opens |
| The quest log's Hand in (`questLog.ts`) | A coin sound; the row went | Quest complete opens over the log |
| A part of an Eidolon chain done (its piece found, `main.ts` `showPartDone`) | The piece's card | Quest complete for the part (the piece's sigil in the giver's place, the piece first among the rewards); "See the piece" goes on to the piece's own card, unchanged |

A chain's part is paid the moment its goal is met, with no hand-in, so its card comes after the fight (or after a quest battle's beat,
as the piece's card did). The binding ceremony at a chain's end is its own film and is untouched.

- **Toasts** do not cover it: the queue already waits while any ornate menu is up (`.om` in `achievementsView.ts`).
- **A hero joining** has its usual reveal after the card closes: the log's `changed(true)` holds it, and the card's close releases it;
  the giver's card calls `closed` as before. Seen in the browser with "The Thing at the Fold, II": nothing under the card, the reveal
  as it closed.
- **Old saves:** a quest with no day taken, a goal from before a retune and a battle with no record each have a full card (a test).

## Art

Since UI-ART-WIRE the three stand-ins below are the owner's paintings (`art/quest-complete`): the wax seal over the head, the keepsake on
its nail and the hooded stranger for a hero joining ([ui-art-wire.md](ui-art-wire.md)). Before: everything on the card was art the game had. Three stand-ins, with prompts in
[quest-complete-art-prompts.md](quest-complete-art-prompts.md): the header's ornament (the standard battle crest for now, a wax seal
asked for), a keepsake's icon (the trophy medal) and "a hero joins" (the Heroes medal).

## Checked

`docs/samples/quest-complete/`, each at 393x852, 360x780 and 412x915: `1-plain-quest`, `2-story-quest` (a chain's second part),
`3-chain-part` (an Eidolon chain's part), `4-quest-battle`; and at 393 `5-hero-joins` and `6-chain-part-top-reduced-motion`. The
quests were set ready in a copy of a played save and handed in through the page's own buttons; the chain part through the page's own
`showPartDone`. The long cards (a battle, a chain part) scroll inside the card at every size; the foot stays in view.

Tests: `test/quest-complete.test.ts` (the sentence rule, the story for every quest, the recap, a battle's record and its reading, the
rewards against the real pay for every quest, old saves, every part of every Eidolon chain, the card being a standard menu).

## Not done, and worth knowing

- (Superseded in round 2.) **The giver's thanks are the last `done` line only.** 51 of the 383 quests have two or three `done` lines; the old card showed all of them.
  The card keeps to "two or three sentences", so the earlier ones are not shown anywhere now.
- (Superseded in round 2.) **A quest battle is not handed in from the battlefield.** Winning one still goes to the quest log with "Hand the quest in at the
  tavern"; the card comes at that hand-in, not straight after the fight. Say if it should open at once.
- **"Standing"** cannot be paid by a quest (`Reward` has no such field), so there is no row for it; gear, runes and relics neither.
  If a quest's chest holds them they show when the chest is opened.
- **The first Eidolon chain's story line names the Calamity** ("They burned when the Calamity came"): it is the chain's own text,
  lore of the past and not a pointer at the hidden mode, as round 2 of the first-hour pass left it.
- **An auto-replay** shows no card for a chain's part, as it showed no piece card.

## Round 2: the director's calls, and one quest and one battle played through

The notes above are as the first pass stood; these change them.

- **Every closing line is shown.** The story ends on all of the giver's `done` lines, in order, and a plain quest's thanks are all of
  them (51 quests have two or three), as the old card showed them. `thanksOf` returns the lines; the "last line only" point under
  "Not done" no longer holds.
- **A quest battle won hands its quest in at once.** After the battle's closing scene the Quest complete card opens over the home
  screen (`home.completeQuest`, called from `main.ts` `questEnd`), with no trip to the log. A battle replayed for practice, or one
  whose quest is not in the log, goes on as before; an Eidolon chain's battle keeps its own card. No quest's hand-in asks the player
  for a choice today, so nothing keeps the log step; one that did would not go through `completeQuest`.

### Played in the page

- **A quest, offer to card:** "A Lame Mule" was taken from the board and its five waves won during the first-hour play; handed in
  from the tavern's quest log on this build. The card showed both of the hunter's lines, "5 of 5", "Finished the day you took it"
  and 150 crowns, and the save gained 150 (`7-played-quest-handed-in-393.png`).
- **A quest battle:** "A Crown of Cinders" (The Kiln Road, three waves). The board draws offers once a day, so the offer was put on the
  board by hand; from there it was taken, marched to from the War Council, its story skipped, its three waves fought and won, and
  "Onward" pressed. The card opened after the closing scene with no visit to the log (`8-played-quest-battle-card-393.png`).

### What playing it turned up, fixed

- **The battle's record was a fight short** ("0:31 of battle", 2 fights for a three-wave battle): the page settles the win before it
  adds the last fight to the run's books, and the record was written at the win. It is its own step now, `noteBattleHow`, called once
  the last fight is counted; the replay read "1:28 of battle", 3 fights. A replay for practice writes nothing.
- **The rewards pulled the card down under the reader.** On a long card they are below the fold, and bringing each into view scrolled
  the story away a moment after the card opened. They now wait until the list is in view (an `IntersectionObserver` on the card's
  body) and then arrive as before; the card opens at its top and stays there.

Not played through: a quest handed in at a giver's own card in the tavern (the same call as the log's, checked by the test of both
files), and a battle lost and retried.
