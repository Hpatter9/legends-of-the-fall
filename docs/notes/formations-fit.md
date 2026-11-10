# FORMATIONS-FIT: every formation fits the party the player has

Branch `claude/formations-fit` (from main 0.452.0). The owner's ask, through the director: picking a formation should always do something.
BATTLE-FEEL measured that it often did nothing: with random five-hero teams a Shield Wall formed in 91 of 300 fights and a Spearhead in
168 (`docs/notes/battle-feel.md`, round 2). The version and `UPDATES` are untouched.

## Why the shapes failed to form

A formation is read from where the heroes stand as the fight begins (`formationOf`). Two things broke it:

1. **Fixed roles.** A wall needed two front-liners in its run, a square a back-liner inside, and a skirmish four heroes. A party
   without them never formed the shape, however it was set out.
2. **The wrong shape read.** Shapes were read in a fixed order (Wall, Spearhead, Square, Skirmish), so a party set out in one could be
   read as another its tiles also made. Shooters set out as a wall stood in a Hollow Square (BATTLE-FEEL round 3). And `formationSpots`
   filled the shapes by class rank, not by who could hold the front.

## What changed (`src/sim/formations.ts`; no randomness, the board and the kinds decide everything)

- **The shape picked is read first** (`formationOf(d, heroes, prefer)`). The page passes the pick to the fight with `setFormations(b, on,
  pick)` (`Battle.formationPick`), and the Formation button reads with it. Shapes the player stands up by hand, with no pick, are read in
  the old order.
- **Every shape adapts to whoever is in the party.** No shape needs a class any more:

  | Shape | Forms with | Its parts |
  | --- | --- | --- |
  | Shield Wall | 3 or more side by side on the front row (2 when the party is 2) | the run; its two ends |
  | Spearhead | a tip on the front row and a wing behind it on each diagonal (1 wing when the party is 2) | tip and wings |
  | Hollow Square | 3 or more: one on the back row guarded on all three sides (beside or a row ahead on each side, and ahead); a party of 3 guards it on 2 | a shooter or healer inside when one stands there, else whoever does |
  | Skirmish | the whole party, no two touching (2 or more) | everyone |

  `FORM_MIN` is the fewest each shape forms with (2, 2, 3, 2). Below it, a lone hero, or two for a square, the party fights loose. That is
  the only case the button's "Not enough for a …" words are left for (BATTLE-FEEL round 3, `shapeFits`).
- **Who stands where** (`formationSpots`, `SHAPES`, `sturdiness`). Each shape has ordered core tiles, each exposed or protected, then
  extra tiles for the rest:
  - The exposed tiles take the sturdiest heroes who are not shooters or healers (`sturdiness`: health x (10 + defence)), whatever their
    class.
  - The protected tiles take the shooters and healers, the most fragile first.
  - Each side borrows from the other when it runs short: a party of shooters fills the wall with its three sturdiest.
  - A short party fills only the first core tiles, so it makes a smaller shape.
  - The centre column is chosen to fit the core tiles first.
  - Wall: the sturdiest three side by side in front; the rest at the wall's ends a row behind, and the back line behind it.
  - Spearhead: the sturdiest at the tip, the next two its wings.
  - Hollow Square: a shooter or healer inside on the back row, the sturdiest in front of it, one on each side, the rest ahead.
  - Skirmish: the same spread tiles as before, the sturdy ahead and the shooters behind.
- **The bonuses are unchanged** (`FORM`). With the old rules they applied only when a shape formed; now a shape forms whenever it is
  picked, and each one wins as often per formed fight as before (below). No scaling was needed.

## Form rates and balance, before (main 0.452.0) and after

Random five-hero teams, set out by `formationSpots` with the formations on, the shape picked (`FORM=<shape> node tools/battle-feel/audit.mjs`).

**Level 1, stage 5, 900 fights a shape** (where the average team wins about 60%; one standard error is about 1.6 points):

| Shape | Formed: before → after | Won when formed: before → after | Won overall: before → after |
| --- | --- | --- | --- |
| Shield Wall | 256 → 900 | 58.6% → 61.4% | 61.9% → 61.4% |
| Spearhead | 508 → 900 | 65.0% → 65.9% | 62.4% → 65.9% |
| Hollow Square | 714 → 900 | 67.4% → 67.7% | 65.6% → 67.7% |
| Skirmish | 900 → 900 | 59.9% → 61.3% | 59.9% → 61.3% |
| No formation (random placing) | - | - | 59.9% |

**Level 15, stage 24, 300 fights a shape** (the average team wins about 97%):

| Shape | Formed: before → after | Won overall: before → after |
| --- | --- | --- |
| Shield Wall | 91 → 300 | 97.7% → 98.3% |
| Spearhead | 168 → 300 | 99.3% → 97.7% |
| Hollow Square | 236 → 300 | 98.0% → 98.7% |
| Skirmish | 300 → 300 | 97.7% → 98.0% |

On army boards: Auto place with a shape picked stands in it in 96 of 96 cases (24 saves x 4 shapes, `test/auto-formation.test.ts`),
against the old test's "more than a third".

**The balance tools** move not at all. The greedy bot never picks a formation, so the hero sweep (`node tools/skills/measure.mjs`, 1,500
fights: level 1 stage 5 58.5%, level 15 stage 30 70.1%, as on main) and the armies table 5a (`npm run balance -- --armies-only --attempts 12
--levels 1,15,30`: 116.8 mean waves won, every one of the 27 cells the same as main) are unchanged. The hero balance bands and the daily's
band use the same fights and are untouched.

## The Shield Wall's waiting strikers

BATTLE-FEEL measured strikers waiting longer behind a wall (13.2% of their time against 9.5% with none). The adapted wall does not fix it.
At level 1 (900 fights) strikers wait 12.1% behind it against 9.2% with no formation, much as before (12.3%). Two other places for the
strikers were tried, wider on the flanks a row behind (12.6%) and wider on the front row (12.8%); neither helped, so the first stays. The
waits are "no way to a foe": the foes pile onto the wall's front, and the tiles beside them are taken. It is the wall's trade-off (it holds
the line, and the strikers behind it wait their turn), not a placing fault. The other shapes keep their strikers nearer the none figure
(Spearhead 9.8%, Square 11.2%, Skirmish 11.6%).

## The words and the card

- The shapes' lines (`FORMATION_WORDS`, `tacticPick.ts`) say who stands where now: "The sturdiest three side by side in front", "The
  sturdiest at the tip", "A shooter or healer inside, the sturdiest round it", "Spread out, nobody touching".
- The Formation card's medallions sat over the first lines of each shape's words, worst at 360: `#tacticSheet .tacForm`'s padding
  overrode the medallion's room. Each medallion now stands beside its shape's name, and the words run the card's full width below
  (`paintedBattlePopups.css`). Shots: `docs/samples/formations-fit/form-card-{393,360,412}.png` and the button,
  `form-{393,360,412}.png` (a party of five shooters and casters, a Shield Wall picked: it stands in one).
- The tactic advice is unchanged: it still advises a wall against slow brutes only with two front-liners to hold it, because that is
  advice about when a wall is wise, not whether one forms.

## Tests

- `test/formations.test.ts`:
  - A wall of whoever stands three wide; every shape fits shooters alone, and a party of two or three.
  - The sturdiest take the exposed tiles, and the shooters and healers the protected ones (the least sturdy inside a square with none).
  - The pick is read first, in the fight too.
  - Short parties make smaller shapes, the same every time.
- `test/auto-formation.test.ts`: every picked shape stands on the army boards.

## For the director

- **What the owner will notice:** picking a shape now always changes the fight, so the Spearhead (+3.5 points overall at level 1) and the
  Hollow Square (+2.1) win more often when picked. Per formed fight they are as strong as before. A party with no front-liner now walls
  its sturdiest shooters, and that wall gets the full +1 armour and the melee guard. Recommendation: keep the bonuses as they are. They
  were tuned to be "small real gains" (`docs/notes/tactics.md`, batch 6), and forming every time is what makes picking one matter.
- The Shield Wall's strikers still wait more than loose ones; see above. If the owner wants that gone, it is an AI matter (strikers
  going round the wall's ends rather than queueing behind it), not a placing one.
