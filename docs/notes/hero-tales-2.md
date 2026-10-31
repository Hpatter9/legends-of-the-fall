# Hero tales 2: all ten earned heroes come by a tale

The owner's call after SECRET-HEROES: give all seven other milestone heroes a tale too, built the same way as the first three; keep the
tale battles hard (about 30 to 50% at the level they open); keep the themed dailies as they are.

Built in two batches: the Reaper (The Ledger of the Unburied, Sexton Pell), the Demon Swordsman (The Pawned Blade, Ottilie Marsh), the
Samurai Commander (The Banner in the Mist, Kiku) and the Tyrant (The Second Throne, Master Fenwick); then the Time Witch (Yesterday's
Visitor, Hesper Tock), the Queen Dragoon (The Scorched Eyrie, Wren Halloway) and the Great Sage (The Fallen Star, Ivy Penhallow). Each
has a giver with a face composed from LPC layers (`tools/hero-quests/cut.py`), two or three parts opening about where the old milestone
was, a quest battle of its own (`taleBattleData.ts`, the chains' cast rule), the hero joining with the earned reveal, and an `instead`
reward for a save that owns the hero. No old milestone grants a hero any more. Two needs are new: `ascension` and `bestiary`.

The full list of the ten tales, their battles' rates, the tests and the open points are in `secret-heroes.md`. Screenshots:
`docs/samples/hero-tales-2-*.png` (`tools/hero-tales-2/shots.mjs`).
