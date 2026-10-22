> Hero rarity was removed later (see `no-rarity.md`): where this note gives a hero a tier, rarity frame or tier bonus, that no longer applies.

# New heroes

Seven heroes join the starting five (`ALL_HEROES` in `units.ts`; `HEROES` stays the five). Each has a kit in
`abilities.ts` (`KITS`) and a test in `test/new-heroes.test.ts`.

| Hero | Rarity | Style | Skill | Passive |
| --- | --- | --- | --- | --- |
| Peasant | 1 | spear, reach 2, sturdy | Hold the Line: allies within 2 tiles take half damage for 3s | Strength in Numbers: 7% less damage per ally beside him (up to 3) |
| Ninja Monk | 2 | fast unarmed striker | Thousand Fists: three strikes, foe stunned 1.5s | Iron Fists: blows ignore 3 defence |
| Lightning Mage | 2 | shooter (new `bolt` shot) | Chain Lightning: jumps through up to five foes, 80% each jump | Static: 25% of blows arc to a second foe |
| Wanderer | 2 | support shooter | Sanctuary: heals and shields all allies (only when someone is under 75%) | Mending Light: every 2.5s heals the most hurt ally |
| Kitsune | 3 | quick melee | Fox Charm: the strongest foe near her fights its own side for 3.5s | Spirit Drain: heals for 25% of the damage her blows deal |
| Karasu Tengu | 3 | flier | Dive: drops beside a shooter (else the weakest foe) for double damage | Hunter's Eye: +50% damage to shooters |
| Yamabushi Tengu | 3 | tanky melee | Wind Gust: hurts foes within 2 tiles and shoves each a tile back; a drop of 2+ adds fall damage | Mountain Breath: heals 2% of his health a second |

## Rules added

- `UnitDef.flies` and `FLY_JUMP` (board.ts): a jump of 9 goes over any height at the cost of a level step.
- `Unit.charmUntil` (a charmed foe picks its targets from its own side in `decide`) and `Unit.mendAt` (the Wanderer's timer).
- `BattleEvent` `arc` (a bolt between two fighters; `fx.ts` draws it) and the `bolt` shot (blue fire).
- Passive fields `pierce`, `arc`, `mend`, `regen`, `leech`, `prey`, `huddle`. All use the skill stream, so the original
  five play out as before.

## Balance

Swapping any new hero into a five (60 seeds) keeps the team near the starting five's 45 wins, except that losing the
knight's front line hurts any team; the Yamabushi and Peasant can hold it. Whole new teams with a tank first win 33 to 47.
