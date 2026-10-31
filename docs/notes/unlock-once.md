# Each unlock told once (UNLOCK-ONCE)

The owner: "Double check cinematics, it said 'unlocked' twice. Remove the old ones in favour of the new ones we made."

A film's end card (`docs/notes/cinematic-reveal-vault.md`) now tells what a film opened. Several older announcements told the same
things again, so they are gone, and every kind of unlock has exactly one announcer. The table is `src/sim/unlockTell.ts`
(`UNLOCK_TELLS`, pure); the page asks it (`tellsByCard`) before showing a card, and `test/unlock-tell.test.ts` holds it to the films.

| Unlock | Told before | Told now |
| --- | --- | --- |
| The next army | the last-stand film's card, and the banner "A new army marches" (`showUnlock`) when the card had not shown | the card only: after the film, or alone as the result is left (`Game.tellUnlock`) |
| The Calamity | the "A Hole in the Sky" film's card (nothing with cinematics off) | the card; with cinematics off it comes alone |
| An Ascension level | the "Unscripted Horizons" film's card (first clear), and "Ascension N is open." on the victory card (`calClear.ts`) and the run summary (`towerView.ts`) | the card: after the film, or alone for every later level the clear opened (`ascOpenedBy`) |
| A building raised, the Spellbook | the castle film's card ("Built", the Chapel's "Unlocked") | the card; with cinematics off it comes alone |
| A first awakening | the burst's word "Awakened" on the hero's picture, and the awakening film's card | the card; the burst keeps its rings, without the word |
| A second awakening | the burst's word "Fully awakened" | unchanged (no film) |
| An Eidolon bound | the binding ceremony's seal "Bound" | unchanged; the unused Eidolon card is not shown after it |
| The War Horn | its card after the first binding | unchanged |
| A hero joining | the toast "<Hero> joins you", the drop line's "(joins you!)", and the hero's first-time reveal | the reveal only (`earnedArrival.ts`, `summonTarot.ts` `revealUnseen`) |
| A spell learnt, a deploy helper | a toast each | unchanged |
| Skill 2, the ultimate | a line on the results ("New skill", "Ultimate unlocked") | unchanged |

How it works:

- With cinematics off, `queueScene` still marks a film that reveals something as seen (as `playDue` always did) and shows its card
  alone. A film that reveals nothing is left alone, as before. Nothing of this runs in an auto-replay.
- `Game.revealed` keeps the keys of the cards shown this session, so a film's card and the card alone never both come up. An
  Ascension card's key carries its level (`ascension:3`), so two levels opened in one session each have theirs.
- The army card's own button goes to the new army; Continue opens the armies on the one just cleared, as the banner did.

Not touched: the Castle and the Last Stand opening at their stars have no announcement (the camp's place unlocks); the Battle
button's "new army" badge and the Armies screen's NEW tag are markers, not announcements.

Checks: `npm run typecheck`, `npm test -- unlock-tell scene-reveal army-drops armies awaken cal` and `npm run web`; in the page at
393x852, a last-stand film's card followed by the army won showed one card and no banner, the army won with cinematics off showed the
card alone once, and the Calamity's opening with cinematics off showed its card once, not again when asked a second time.
