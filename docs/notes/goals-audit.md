# Goals audit

The owner played a daily that asked for four Machines, which cannot be done reliably now that only one of each hero
may stand on the field. Every goal a player can be given was checked against the current rules (one of each hero,
a field of five, secret tale heroes, no tier skills, the relics redesign, Auto casting spells).

## What was broken, and the fix

- **Daily themes' goals (all 18).** Each asked for more featured-trait heroes (3 or 4) than the starting five hold
  (2 or 3), so it leaned on a Hire. A Hire draws at random from the day's pool, the pool often held exactly as many
  members as the goal needed, and a copy of a hero already fielded can no longer stand beside it. So the star could
  depend on luck. Fix: each goal's `need` is now what the five hold (Beasts 3, Spellcasters 3, Swarm/Mystics 2, Guardians 2,
  Wild 3, Assassins 3, Holy 2, Samurai 3, Machines 3, Royals 3, Wardens 3, Yokai 2, Marksmen 2, Pirates 2, Frontier 3,
  Undead 3, Arcane 3, Tricksters 2). The doubled trait bonus still wakes at four, so a lucky Hire is rewarded in play
  but never required. Rewards are unchanged.
- **Sea Dogs.** The Dread Pirate is not a Pirate (and is a secret hero); the five held one Pirate against a goal of two.
  The Kraken Mate now starts in the five, the Dread Pirate moved to the Hire pool, and the idea line says "field" not "hire".

## Found fine

- Quests, tales, quest battles and Eidolon chain parts: no goal needs more than five different heroes, names a hero twice,
  bars a hero it asks for, names a trait with no heroes, a combo of the wrong size, or a map, act or wave out of range.
- Quests that name a secret hero are offered only through owning that hero (patron, `with`, `all`, `only`, `by`, shards).
- No quest, part or achievement is worded for tier skills or the fielded-pair rule.
- Achievements: Relic Hoarder (five relics exist), Yokai Only, Three-Star Hero (grade 3 merges on the bench) and Full Roster
  (counts the tale heroes) can all still be met.
- "No spells" and "only these spells" goals need Auto switched off, since Auto casts the equipped spells; left as they are.

## The checker

`test/goals-audit.test.ts` proves, for the daily themes, every quest goal and every Eidolon chain part, that the goal is
achievable by the rules above, and that no daily theme names a secret hero. A future change that makes a goal impossible
fails there. `test/daily-builds.test.ts` now expects the five to meet each theme's goal.
