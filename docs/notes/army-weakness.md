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

RESULTS_TABLE

## What it changes

- **The auto team clears as it did.** Where it moves, its own heroes are on a weakness or a resistance (the Golem Forge, weak to its
  Warlock, rises; the Infernal Host, resisting the Warlock, falls a little). In the game Auto now prefers the heroes the army is weak to,
  so a player's own Auto team gains.
- **A team built for the army clears clearly more, and goes further**, on every army and tier not already at 100%.
- **A team built against it** loses less than it did at x0.75 and x0.85; where a cell is on a knife's edge (a boss wave won or lost by a
  sliver) it still loses ground. That is the rule doing its job: the army asks for a different team.
- **Duels** are untouched (the rule is off in a duel), so their ~60% band holds.
