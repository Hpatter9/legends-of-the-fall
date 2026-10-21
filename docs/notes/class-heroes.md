# Class heroes

Eight heroes join the roster (`ALL_HEROES`), each with its own kit in `abilities.ts`, a rarity, two traits and three looks (one
per grade). They are the layered Himeko Sutori sprites: a body template, an outfit, a helm and a weapon laid on one another.
`tools/compose-class-heroes.cjs` (adapted from Chronos's `tools/compose-sheets.cjs`; run it by hand with the assets repo next
to this one) cuts the right-facing poses and writes `src/art/units/cls_<hero>_<1-3>.png` and their entries in `sheets.json`.
Casters also get an `attack2` row (the two casting poses); the grade looks are richer outfits of the same family
(for example Cleric Initiate, Disciple, Holy). Tests are in `test/class-heroes.test.ts`.

| Hero | Rarity | Style | Skill | Passive |
| --- | --- | --- | --- | --- |
| Paladin | 2 | holy tank | Holy Challenge: foes within 3 must attack him for 3s; allies within 2 are healed | Blessed Bulwark: front blows lose a fifth, and he heals for 60% of what he blocks |
| Cleric | 2 | reach-2 healer | Benediction: cleanses every ally and heals them each second for 5s (only when someone is hurt or burning) | Grace: allies within 2 tiles heal 1.5% of their health each second |
| Druid | 3 | summoner (range 3 leaf shots) | Call Treant: a treant rises beside her, one at a time | Thorn Skin: a third of a melee blow's damage is sent back |
| Barbarian | 2 | berserker | Whirlwind: cuts every foe in the 3x3 around him | Bloodrage: attack grows by up to 90% as his health falls |
| Ranger | 2 | range 5, traps | Snare Trap: two traps on the tiles by the nearest foes; the first foe to step on one is hurt and held 2s | Long Shot: +35% damage to foes 4 or more tiles away |
| Warlock | 3 | curses | Hex: the three toughest foes in reach burn for 5s and he drinks 60% of it | Dark Pact: heals for a fifth of what his blows deal |
| Illusionist | 3 | decoys | Mirror Image: slips to the safest tile within 4, leaving two decoys that draw nearby foes for 3s | Sleight of Hand: slips 25% of blows |
| Gunslinger | 3 | range 6, slow reload | Dead Eye: one slug through every foe in a line | Piercing Rounds: shots ignore 4 defence and also hit the foe behind for half |

## Traits

New: **Holy** (Paladin, Cleric: +8% health), **Wild** (Druid, Barbarian: +5% attack), **Arcane** (Warlock, Illusionist:
skills charge 15% faster), **Frontier** (Ranger, Gunslinger: +6% crit), all origins; and the class **Warden** (Cleric, Druid:
4% less damage). The class heroes also join Guardian (Paladin), Caster (Warlock), Blade (Barbarian), Marksman
(Ranger, Gunslinger) and Trickster (Illusionist), so every trait keeps two to four heroes.

## Rules added

- `UnitDef.summon`: the treant and the decoy are hero-side fighters a skill calls up. They are not placed heroes: they do not
  hold a fight open once every real hero has fallen, their fall does not cost the "no one fell" star or achievement, and the
  king's Resurrect does not lift them.
- Passive fields `blockHeal`, `aura`, `rage`, `thorns`, `far`, `through`; `Unit.hot` (heal over time) and a `curse` damage
  over time that feeds its caster; `Battle.traps` (made only when a Ranger lays one) with a `trap` event the renderer draws as
  a ring on the tile. All of it draws on the skill stream or none, so the original fights play out as before.
- New shots `holy`, `leaf`, `curse`, `bullet` (the fire sprite tinted gold, green and purple; the arrow, small, for bullets).
- Fix: `onStrike` no longer assumes the one slipping a blow has a kit (a decoy or treant under a team dodge bonus crashed).

## Balance

`npm run balance` (4000 fights, hero table at stage 5, 20 heroes; average win rate 65.6%). "vs avg" in points:
Paladin +7.2, Cleric +1.5, Druid -7.2, Barbarian +3.6, Ranger -4.2, Warlock -0.7, Illusionist -0.3, Gunslinger -0.1. Stats were
tuned from a first run (Paladin +9.8, Barbarian +9.5, Ranger -10.1, Warlock -8.6). The older heroes' outliers (Knight, Samurai,
Archer, Fire Wizard, Lightning Mage, Yamabushi) are untouched. The Druid's treant is not tallied in her damage.
