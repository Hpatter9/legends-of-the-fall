# Army weaknesses: each army calls for a different team

The owner's ask: keep players coming back and summoning; the weak spot was that a player could keep the same five heroes for ever. The
owner picked the fix: army strengths and weaknesses. Every army of the War Room is weak to one or two hero classes and resists one or two.

## The rule (`src/sim/armyWeakness.ts`)

- **Weak to** a class: the army's foes take **x1.3** harm from a hero of that class. **Resists** a class: **x0.9** (the brief's start was
  x0.75; the measure below took it to x0.85, then x0.9).
- **Damage only**, every kind a hero is credited with: its blows, its skills, its ailments' ticks and its summons' blows (a summon counts as
  its owner's class, `creditOf`). Ailments' chances, crowd control and healing are untouched: simpler to read, and the rule stays one number.
- **Where:** an army run's waves (`Battle.foeArmy`, set by `startStage` for an `army` run). Never a duel (their ~60% band, DUEL-FAIR, is
  kept as it was tuned), and not the daily, the Last Stand, the Calamity, the Muster or a quest.
- **The switch:** `ARMY_WEAKNESS.on` (as `TRAIT_PERKS`). Off, every fight plays exactly as before: the recorded fights
  (`nemesis-regression`, `ailments-identical`) turn it off and replay unchanged.
- **Deterministic:** no stream is drawn from; a fight changes only where a hero of a weak or resisted class strikes the army's foes.
- **Saves:** nothing new is stored but the tutorial's seen flag (the existing `tutorials` list).

| Army | Weak to | Resists | Why |
|---|---|---|---|
| Orc Warband | Trickster, Marksman | Beast | Brutes who charge in a mob: tricked and shot down before they close, a match for any beast in a brawl |
| Undead Legion | Support, Guardian | Assassin, Marksman | Holy light and a shield to the bones; arrows rattle through ribs, poison finds no blood |
| Beast Packs | Warden, Caster | Trickster | They fear the wardens' wards and fire; their noses find every trick |
| The Wildwood | Blade, Gunner | Warden | Steel fells the grove and powder frightens it; the wild's own wardens will not harm it |
| The Labyrinth | Bulwark, Assassin | Vanguard | A shield turns the gorgon's gaze, a knife waits at every corner; a charge meets a minotaur's horns |
| Ogre Clans | Arcanist, Vanguard | Blade | Dim wits fall to spells, a lance brings a giant down; blades bite shallow in their hides |
| Infernal Host | Arcanist, Warden | Caster | Banishing runes and holy wards drive the demons back; the pit's fire is their own |
| Yokai Night Parade | Bulwark, Beast | Trickster, Assassin | Temple bells and the hounds' noses find the spirits; no trick or knife in the dark fools them |
| Golem Forge | Caster, Gunner | Blade, Marksman | Fire and blasting powder crack the stone; blades and arrows glance off |

Every one of the thirteen classes is some army's weakness (Warden, Caster, Gunner, Bulwark and Arcanist twice), so every hero is wanted
somewhere. **Early rosters:** both starter packs cover the first two armies' weaknesses (Sword and Shield: the Archer for the Orcs, the Knight
for the Undead; Blade and Spell: the Kunoichi for the Orcs, the Peasant for the Undead); the Beast Packs (level 15) want a Caster (the
second pack's Wizard) or a Warden (the Cleric, the Druid...), which the first summons bring. A player without them fights as before.

## On the page

- **The War Room** (`armiesView.ts`, `armyMatchView.ts`): under the army's name, "Weak to" and "Resists" with each class's painted sigil
  (`src/art/release/class-sigils.webp`, the summoning's own, `classSigil.ts`) and the army's line.
- **The deploy screen** (`main.ts`): the army faced leads the trait strip, "vs Golem Forge ▲2 ▼1" with its weak classes' sigils, its line
  naming each placed hero that counts (▲ a weakness, ▼ a resistance); a tap opens its standard card ("Close"). Each bench card wears ▲ or ▼.
- **The fight** (`render/fx.ts`): a blow on a weakness says **"Weak!"** in green over its number, on a resistance **"Resisted"** in grey,
  at most once every 0.9 s over the same foe (`MATCH_LABEL_MS`), so a crowd of blows stays readable on the phone.
- **The lists:** Recruit's "Nearest to joining" and the hero list flag "▲ Strong vs Golems" on a hero on the weakness of the army faced:
  the army run in progress, else the furthest army opened (`facedArmy`; nothing is stored for it).
- **The codex:** each foe's sheet has "Its army's weaknesses", a line for each army it marches with (`codexLine`).
- **The tutorial** (`tutorialRules.ts`, `armyWeakness`): the first time the War Room shows them, pointing at the rows; `newer`, so a save from
  before sees it once.
- **Auto place** (`pickSquad`) ranks a hero by its strength as the army sees it (x1.3, x0.9); **the suggester** (`suggestParty`, the
  party screen's Suggest) adds `ARMY_SCORE` 8 a hero on the weakness and takes 8 off one resisted (a role covered is worth 14, so roles hold),
  and its hint says "Picked for the Golem Forge: Fire Wizard".

Photographs at 393 x 852, 360 x 780 and 412 x 915 are in `docs/samples/army-weakness/` (`node tools/army-weakness/shots.mjs`): the War Room,
the tutorial card, the deploy screen with a team built for the Golem Forge and one built against it, the chip's card, and the fight's "Weak!".

## Measured

`npm run balance -- --no-tables --weakness` (`tools/armyWeaknessTable.ts`): every army and tier, one try a cell over 32 fresh saves, at the
level the tier is meant for (Normal at the army's own, then the bands' entries 25, 45, 65, 85), a maxed castle, gear, every talent row and the
skills mastered at that level. Three parties: **auto** (today's team, the balance tool's recruits: Knight, Paladin, Archer, Warlock,
Cleric), **matched** (three heroes of the army's weak classes, then the auto team's neutral heroes) and **mismatched** (three of its
resisted classes). Each cell is clear % / mean stars of a clear / mean waves won, rule off -> on.

| Army | Tier (Lv) | Auto: off → on | Matched: off → on | Mismatched: off → on |
|---|---|---|---|---|
| Orc Warband | Normal (1) ¹ | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) |
| Orc Warband | Hard (25) ¹ | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) |
| Orc Warband | Elite (45) ¹ | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) |
| Orc Warband | Legendary (65) ¹ | 97% (0.9★, 15.0w) → 100% (0.8★, 15.0w) | 100% (0.7★, 15.0w) → 100% (0.7★, 15.0w) | 100% (0.7★, 15.0w) → 97% (0.6★, 15.0w) |
| Orc Warband | Mythic (85) ¹ | 100% (0.7★, 15.0w) → 97% (0.5★, 15.0w) | 91% (0.7★, 14.9w) → 100% (0.6★, 15.0w) | 91% (0.4★, 14.9w) → 94% (0.4★, 14.9w) |
| Undead Legion | Normal (8) ¹ | 100% (2.9★, 15.0w) → 100% (3.0★, 15.0w) | 100% (2.8★, 15.0w) → 100% (2.9★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) |
| Undead Legion | Hard (25) ¹ | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) |
| Undead Legion | Elite (45) ¹ | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) |
| Undead Legion | Legendary (65) ¹ | 94% (0.7★, 14.9w) → 81% (0.6★, 14.8w) | 81% (0.3★, 14.8w) → 88% (0.4★, 14.9w) | 19% (0.0★, 14.0w) → 9% (0.0★, 13.9w) |
| Undead Legion | Mythic (85) ¹ | 81% (0.5★, 14.8w) → 81% (0.3★, 14.8w) | 41% (0.2★, 14.4w) → 63% (0.1★, 14.6w) | 3% (0.0★, 12.4w) → 0% (12.6w) |
| Beast Packs | Normal (15) ¹ | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) |
| Beast Packs | Hard (25) ¹ | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) |
| Beast Packs | Elite (45) ¹ | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) |
| Beast Packs | Legendary (65) ¹ | 100% (0.6★, 15.0w) → 97% (0.6★, 15.0w) | 94% (0.7★, 14.7w) → 100% (0.7★, 15.0w) | 88% (0.0★, 14.4w) → 75% (0.0★, 14.3w) |
| Beast Packs | Mythic (85) ¹ | 75% (0.5★, 13.9w) → 84% (0.3★, 14.0w) | 84% (0.4★, 14.0w) → 88% (0.6★, 14.2w) | 75% (0.0★, 13.7w) → 50% (0.0★, 12.6w) |
| The Wildwood | Normal (22) ¹ | 100% (3.0★, 15.0w) → 100% (2.9★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (2.9★, 15.0w) → 100% (2.8★, 15.0w) |
| The Wildwood | Hard (25) ¹ | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) |
| The Wildwood | Elite (45) ¹ | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 97% (3.0★, 14.6w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) |
| The Wildwood | Legendary (65) | 94% (0.7★, 14.6w) → 94% (0.6★, 14.6w) | 38% (0.1★, 11.9w) → 81% (0.2★, 13.6w) | 78% (0.3★, 12.8w) → 44% (0.3★, 11.2w) |
| The Wildwood | Mythic (85) | 53% (0.6★, 9.1w) → 53% (0.8★, 9.3w) | 3% (0.0★, 5.9w) → 25% (0.1★, 9.1w) | 19% (0.0★, 7.0w) → 13% (0.0★, 6.1w) |
| The Labyrinth | Normal (35) ¹ | 100% (2.6★, 15.0w) → 100% (2.6★, 15.0w) | 100% (2.8★, 15.0w) → 100% (2.9★, 15.0w) | 100% (3.0★, 15.0w) → 97% (3.0★, 14.5w) |
| The Labyrinth | Hard (35) ¹ | 100% (2.8★, 15.0w) → 100% (2.8★, 15.0w) | 97% (2.9★, 15.0w) → 100% (3.0★, 15.0w) | 100% (3.0★, 15.0w) → 100% (3.0★, 15.0w) |
| The Labyrinth | Elite (45) | 66% (2.5★, 13.3w) → 66% (2.5★, 13.3w) | 31% (2.3★, 13.6w) → 56% (2.6★, 14.1w) | 69% (2.8★, 13.8w) → 47% (2.6★, 14.0w) |
| The Labyrinth | Legendary (65) | 50% (0.2★, 12.2w) → 50% (0.2★, 12.2w) | 13% (0.0★, 12.6w) → 34% (0.1★, 13.6w) | 25% (0.0★, 12.3w) → 34% (0.0★, 12.6w) |
| The Labyrinth | Mythic (85) ¹ | 0% (4.3w) → 0% (4.3w) | 0% (5.5w) → 0% (8.3w) | 3% (0.0★, 7.9w) → 0% (4.9w) |
| Ogre Clans | Normal (45) ¹ | 97% (2.6★, 14.5w) → 97% (2.6★, 14.5w) | 88% (2.1★, 13.8w) → 91% (2.5★, 14.3w) | 100% (2.4★, 15.0w) → 84% (2.1★, 13.8w) |
| Ogre Clans | Hard (45) | 97% (2.6★, 15.0w) → 97% (2.6★, 15.0w) | 38% (2.0★, 10.4w) → 50% (2.3★, 11.1w) | 66% (2.1★, 13.2w) → 50% (2.0★, 12.3w) |
| Ogre Clans | Elite (45) | 84% (2.6★, 14.2w) → 84% (2.6★, 14.2w) | 3% (2.0★, 5.0w) → 16% (2.0★, 8.1w) | 19% (2.0★, 9.2w) → 3% (2.0★, 7.1w) |
| Ogre Clans | Legendary (65) | 66% (0.3★, 11.3w) → 66% (0.3★, 11.3w) | 9% (0.7★, 5.7w) → 25% (0.3★, 9.5w) | 13% (0.5★, 7.9w) → 3% (1.0★, 8.0w) |
| Ogre Clans | Mythic (85) ¹ | 47% (0.1★, 11.2w) → 47% (0.1★, 11.2w) | 0% (2.8w) → 0% (4.2w) | 0% (4.1w) → 0% (3.9w) |
| Infernal Host | Normal (58) | 25% (2.3★, 8.3w) → 22% (2.4★, 8.0w) | 0% (5.3w) → 3% (2.0★, 5.6w) | 47% (3.0★, 10.7w) → 38% (2.8★, 9.8w) |
| Infernal Host | Hard (58) | 19% (2.7★, 11.2w) → 19% (2.5★, 10.7w) | 0% (10.1w) → 6% (2.0★, 11.7w) | 63% (2.9★, 13.4w) → 47% (2.7★, 12.0w) |
| Infernal Host | Elite (58) | 13% (2.8★, 9.4w) → 6% (2.5★, 10.1w) | 0% (7.2w) → 0% (8.8w) | 41% (2.8★, 11.9w) → 34% (2.9★, 10.5w) |
| Infernal Host | Legendary (65) | 31% (0.2★, 9.9w) → 19% (0.0★, 9.1w) | 0% (5.7w) → 0% (6.8w) | 53% (0.4★, 11.4w) → 34% (0.4★, 9.8w) |
| Infernal Host | Mythic (85) ¹ | 0% (5.8w) → 9% (0.0★, 6.3w) | 0% (3.1w) → 0% (3.5w) | 19% (0.0★, 6.1w) → 13% (0.3★, 4.7w) |
| Yokai Night Parade | Normal (65) ¹ | 9% (2.0★, 5.3w) → 9% (2.0★, 5.3w) | 0% (3.9w) → 0% (5.6w) | 0% (7.4w) → 0% (7.6w) |
| Yokai Night Parade | Hard (65) ¹ | 3% (2.0★, 6.8w) → 3% (2.0★, 6.8w) | 0% (5.2w) → 0% (7.5w) | 0% (9.0w) → 0% (7.2w) |
| Yokai Night Parade | Elite (65) ¹ | 0% (4.8w) → 0% (4.8w) | 0% (2.4w) → 0% (3.7w) | 0% (5.4w) → 0% (4.9w) |
| Yokai Night Parade | Legendary (65) ¹ | 0% (5.1w) → 0% (5.1w) | 0% (3.1w) → 0% (4.4w) | 0% (6.2w) → 0% (4.9w) |
| Yokai Night Parade | Mythic (85) ¹ | 0% (3.4w) → 0% (3.4w) | 0% (2.7w) → 0% (3.6w) | 0% (5.2w) → 0% (4.3w) |
| Golem Forge | Normal (74) ¹ | 6% (2.0★, 9.0w) → 22% (2.0★, 9.6w) | 25% (2.8★, 8.0w) → 53% (2.8★, 10.0w) | 3% (2.0★, 8.7w) → 0% (5.9w) |
| Golem Forge | Hard (74) ¹ | 9% (2.0★, 11.3w) → 19% (2.0★, 11.0w) | 34% (2.9★, 10.0w) → 41% (2.8★, 11.3w) | 0% (8.8w) → 0% (8.8w) |
| Golem Forge | Elite (74) ¹ | 13% (2.0★, 7.6w) → 9% (2.0★, 7.9w) | 16% (2.8★, 7.7w) → 28% (3.0★, 7.7w) | 0% (6.7w) → 0% (4.6w) |
| Golem Forge | Legendary (74) ¹ | 0% (7.1w) → 3% (0.0★, 6.6w) | 6% (0.5★, 6.9w) → 19% (0.5★, 7.4w) | 0% (6.3w) → 0% (4.4w) |
| Golem Forge | Mythic (85) ¹ | 0% (7.7w) → 3% (0.0★, 6.8w) | 13% (0.5★, 6.0w) → 25% (0.5★, 8.0w) | 0% (4.2w) → 0% (3.2w) |

¹ Measured with the resistances at x0.85; the rows without the mark were measured again at x0.9, the final value (the cells where a
mismatched team had lost most). At x0.85 those rows' mismatched teams lost more: Ogre Clans Hard 66 → 34%, the Labyrinth Elite 69 → 38%,
the Infernal Host Hard 63 → 34%; at x0.75 the Ogres' Hard was the same 34% and the brief's start was eased. The unmarked rows' auto and
matched columns hardly move between the two (a weakness is x1.3 in both).

Mean stars count the clears only; the stars of Legendary and Mythic are one a tier, so their means sit under 1. The level-85 Mythic and the
late armies' own levels are walls by design (`docs/notes/difficulty.md`), so many cells clear rarely either way: the waves won show the
rule's pull there (the Yokai's matched team 3.9 → 5.6 waves on Normal).

**Left for the owner's call:**
- the **Infernal Host's auto team** (its Warlock a Caster, which the Host resists) clears a little less: Elite 13 → 6%, Legendary
  31 → 19%. The in-game Auto now benches a resisted hero when it has another, so a player's own team loses less; nudging the Host's
  strength down about 3% would give the measure's auto team its rate back, at the cost of every other team finding the Host easier;
- a **deliberately mismatched team** still loses ground on a knife-edge cell (the Wildwood's Legendary, three Wardens: 78 → 44%). x0.9 is
  the gentlest a resistance can be and still read on the card; making it purely a weakness system (no resistances) is the other way.

## What it changes

- **The auto team clears as it did.** Where it moves, its own heroes are on a weakness or a resistance (the Golem Forge, weak to its
  Warlock, rises; the Infernal Host, resisting the Warlock, falls a little). In the game Auto now prefers the heroes the army is weak to,
  so a player's own Auto team gains.
- **A team built for the army clears clearly more, and goes further**, on every army and tier not already at 100%.
- **A team built against it** loses less than it did at x0.75 and x0.85; where a cell is on a knife's edge (a boss wave won or lost by a
  sliver) it still loses ground. That is the rule doing its job: the army asks for a different team.
- **Duels** are untouched (the rule is off in a duel), so their ~60% band holds.
