# Ultimates for every hero

Every hero has an ultimate now (all 45; `KITS[kind].ultimate`). Eight heroes have had theirs from the start and keep them as they
were (Kitsune, Karasu Tengu, Yamabushi Tengu, Gorgon, Samurai Commander, Great Sage, Demon Swordsman, Tyrant); the other 37 have a
new one, **unlocked when the hero fights at level 15**.

## The rules

- **Level.** A fight carries the level a hero fights at: `Boost.level`, set by `gradeBoost` (a hero kind's *lasting* level, 1 to 30)
  and by `localBoost` (the spire's and Calamity's *in-run* level, capped at 20). `addUnit` stores it on `Unit.level` (absent is 1).
  An ultimate with an `unlock` level (`ULT_LEVEL` = 15 for the 37 new ones) does not charge, does not show its meter and does not go
  off below it (`ultimateOf(unit)` is the one place that decides; `tryCast`, `gain`, `ultimateReady` and the unit's bars read it).
  The first eight have no `unlock`, so they fight as they did. In the spire and Calamity the in-run level counts, so the new ones
  unlock at in-run level 15 there.
- **Foes never take a hero's ultimate.** `ultimateOf` returns nothing for a foe whose ultimate has an `unlock`, so a boss whose
  second phase borrows a hero's skill by name (`bossPhases.ts`: Boar King and the Minotaur's skill, forest boss 3 and the Satyr's)
  does not borrow the ultimate too; the bosses are as they were.
- **Charge.** As before: the ultimate fills at `ULT_RATE` (0.45) of the skill's rate, on its own meter (`charge2`), and goes before
  the skill when full. Each ultimate now also has a `rate` (its meter speed, times `ULT_RATE`) and a `power` (times the caster's attack
  while it casts), the two balance knobs; both are 1 unless `ultimates.ts` (`TUNE`) says otherwise.
- **Talents.** `ultPow` and `ultRate` (`talents.ts`) read the unlocked ultimate of whatever hero has them, so they work for the new
  ultimates too; only the Karasu, Yamabushi and Gorgon trees use them. The general nodes reach the new ultimates the way they reach
  every skill: `pow` lifts the attack while it casts (damage, healing, what is called up), `dur` lengthens stuns, guards, hastes,
  curses and decoys (the engines read `durOf`), `reach` lengthens reach, `extra` adds one more salvo, blink, shot, charge, hook or
  summoned fighter. That is the right size of change: a node that says "Shield Wall lasts longer" also lengthens Mass Muster for the
  Peasant, which a player would expect of a hero's whole kit. No tree names a new ultimate, and none needed to.
- **Hero sheet.** The sheet lists the ultimate under the skill; below its level it is dimmed and ends "Unlocks at level 15." (the
  first eight show no such line).

## How they are built (`src/sim/ultimates.ts`)

`abilities.ts` builds its table, then calls `heroUltimates` once, which returns all 45. The new ones are thin configs on six engines
made from the skills' own helpers (`abilities.ts` exports them in one `export { ... }` at its end), so each reuses the looks
(`skillFx.ts`, the 'area', 'arc', 'heal', 'haste', 'banner', 'song' and 'frenzy' events) and none draws from the fight's main
stream.

| Engine | What it does | Used by |
| --- | --- | --- |
| `sky` | salvos (volley or meteor) on separate crowds, staggered; an optional echo | Archer, Fire Wizard, Dread Pirate, Siege Bot |
| `smite` | a burst round the caster: hurt, held, slowed, brittle, pulled in, cursed, drunk from | Juggernaut, Kraken Mate, Mummy, Shambler, Arc Blade, Lightning Mage, Warlock, Ranger, Time Witch, Wolf Bard |
| `bless` | the team healed, cleansed, shielded, guarded, hastened, rallied, charged, mended over time | Peasant, Cleric, Wanderer, Wolf Bard, Satyr, Time Witch, Druid |
| `fortify` | foes drawn to the caster, who and his allies guard (and are healed) | Knight, Paladin |
| `summon` | up to n of a kind called up at once | Beastmaster (wolves), Druid (treants) |
| `blinks` / `shots` / `fists` | a chain of blinks, shots or blows at separate foes | Kunoichi, Mercenary, Gunslinger, Rifle Bot, Ninja Monk |

The rest (Samurai, Minotaur, Lancer, Barbarian, Werewolf, Reaper, Queen Dragoon, Buccaneer, Illusionist, High Priestess) are
small functions of their own over the same helpers (`iaido` and `chargeAt` with more tiles and more damage, a frenzy filled to the
brim, a harvest that feeds on its kills, a line of fire, hooks, decoys, raising the fallen).
