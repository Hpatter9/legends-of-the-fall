## Conjured fighters count for their caller

A fighter a skill calls up mid-fight belongs to the unit that called it, through `Unit.owner` (`battle.ts`). These are the
Illusionist's decoys, the Druid's treant, the Demon Lord's imps and the Necromancer's skeletons.

- What it does counts for its caller:
  - the after-wave report's row (`tally` in `fightStats.ts` takes the fight's units and resolves the owner);
  - damage dealt, kills, healing, and the blows it takes (a decoy soaking hits counts as the Illusionist's tanking);
  - XP: `fightXp` adds a called-up fighter's damage, healing and kill XP to its caller's kind, and gives the fighter itself no
    XP of its own.
- It is not a hero:
  - `heroesPlaced` and the report's "heroes standing" leave it out, so a decoy that dies is not a hero lost (`noteFight`
    and the achievements already left it out);
  - `creditOf(b, u)` gives whom a fighter's deeds count for.

The fight itself plays out exactly as before: only the bookkeeping changed. Test: `test/conjured.test.ts`.
