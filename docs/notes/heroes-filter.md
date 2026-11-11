# The roster's Sort and Filter, and the War Council's pack (HEROES-FILTER)

Two asks from the owner, built as two commits on `claude/heroes-filter`.

## 1. Sort and Filter on the Heroes screen

The owner: "Need a filter and sort button for the heroes screen."

The Heroes screen is the roster ("All heroes" in the tavern; `drawRoster` in `src/menuHeroes.ts`). Under its search box there are now
two painted plate buttons, **Sort** and **Filter** (`plateButton` from `src/paintedButton.ts`), each opening a standard ornate sheet
(`src/heroFilterView.ts`, built with `ornateMenu`). A tap in a sheet changes the list at once, under the sheet.

- **Sort by:** the keep's order (the default, the list as it always was), level, rank (then shards), name, class, newest joined, power
  (the card's Power number, `kindPower`), and ready to upgrade first. Each has two ways round, worded for the sort ("Highest first" and
  "Lowest first", "A to Z" and "Z to A", "Newest first" and "Oldest first"). Ties fall to the keep's order either way round.
- **Filter by**, several at once: owned or not yet owned; in the party or not; upgrade ready (a rank, an awakening or talent points: the
  gold chevron's own rule, `markReady`); Mythic; the class on the hero's card (Guardian, Fighter, Shooter, Mage, Support: `CLASS_OF`); and
  the traits (`TRAITS`: Samurai, Mystic, Guardian, Blade and the rest). Every group chosen must hold; within classes or traits, any one of
  those chosen. The Filter button wears a count seal, and the sheet says how many heroes the choice leaves.
- **What is not offered,** because the hero data has nothing for it: elements and favourites. The Mythic filter and each trait are
  offered only once the save may name a hero that has it, so the sheet gives no secret away.
- **The list's head** says what is on ("Sorted by level · 2 filters · 9 found") with a one-tap **Clear**. An empty result shows "No hero
  answers that call..." and a Clear button.
- **Search by name** was already there ("Find a hero"); it now runs through the same rules, and Clear empties it too. It fits at 360.
- **Remembered:** the choice is saved with the settings (`Settings.roster`, an optional field; old saves have none, and a bad one is
  dropped by `cleanView`). The search text is not kept.
- **Secret heroes stay hidden.** A hero the save may not name ("???") keeps its own place and order whatever the sort; a name search never
  finds it; a filter by class, trait, Mythic or upgrade leaves it out, so no filter can tell what it is. "Not yet owned" and "Not in the
  party" still show it, as they give nothing away. Heroes whose shards are not begun are still only counted, as before.

The rules are pure, in `src/heroFilterRules.ts` (`rosterRows`, `passes`, `sortRows`, `viewRows`, `viewLine`, `cleanView`), tested by
`test/heroes-filter.test.ts`.

**For the director: the party picker does not share this list.** The War Council's "Reinforcements" grid (`src/party.ts`) is its own
grid with its own search and role chips (Front-liner, Striker, Back-liner, Support, by `roleOf`), so the saved sort and filters do not
apply there. Moving it onto these rules is a small follow-up if the owner wants one behaviour in both places.

**Art.** Sort wears the painted down-chevron glyph and Filter the Auto-pick medallion as stand-ins; the prompts for a sort and a filter
medallion are in [heroes-filter-art-prompts.md](heroes-filter-art-prompts.md).

Shots (`node tools/heroes-filter/shots.mjs <label> [scene ...]`, at 393, 360 and 412): `docs/samples/heroes-filter/before-roster-<w>.png`
and `after-<scene>-<w>.png` for roster, roster-sort, roster-filter, roster-sorted, roster-filtered and roster-empty.
