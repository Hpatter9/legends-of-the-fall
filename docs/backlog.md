# Backlog

Ideas the owner has asked for, kept until there is room (or PixelLab generations) to do them. Take an item off this
list when its work is merged.

## When there are more PixelLab generations

### The tavern comes alive

The heroes in the tavern hall (`src/tavern.ts`, `src/render/tavernSpots.ts`) should feel alive, not stand about.
New animations, drawn in each hero's own style:

- **Sitting** in the chairs and on the benches, at the tables and by the hearth.
- **Chatting** with each other: two or three heroes at a table, turning to whoever speaks.
- **Drinking** together: raising tankards, a toast, one nodding off.
- **Darts** at a board on the wall: a throw, a cheer or a groan.
- **Fighting**: a scuffle that starts over nothing and ends in a laugh (no one hurt, nothing flashes).

The spots in `tavernSpots.ts` would gain a kind (`seat`, `bar`, `darts`, `brawl`) so heroes pair up where the props
are. The cost to estimate first: frames per hero per action times 45 heroes, so it may start with shared props
(tankards, darts) and a few poses each.

## Cinematics

Scenes not built yet (the pilots, The Road Begins and The Ashen Road, are in; each of these is a table entry in
`src/sim/sceneScripts.ts` and a call at its moment; pitches and the player are in `docs/notes/cinematics.md`).

- First army cleared: the Orc Warlord's last toll.
- Each Calamity boss, maps 2 to 6: the Thorn Warden, Malphas, Hrungar, Vorgrath, Karnok.
- The Calamity's end: Karnok falls, the sky un-reddens.
- A hero awakened: one shape, filled per hero.
- A hero's first unlock: the hero walks in, the others make room.
- A tower milestone: the tower opens at floor 10, then floors 25 and 50.
- The daily's boss: "Today's calamity is brought to you by...".
- The first summon in the hall.
- A castle upgrade: the Chapel, the first Library.
- A boss's second form: a three-second cut-in on the phase change.
- First elite met.
- First loss.
- Ascension 1 opens.
- Each army's first boss (nine).
- Music or a sting per scene; a "never show cinematics" setting if the owner wants one.

## The owner's list of 23 October (in progress)

Grouped by the worker branch that takes it.

**`claude/cal-map`: the Calamity's map, shop and rewards**
- Only one campfire per Calamity map (King God Castle's mode like this as the reference).
- Only one recruit spot per map, offering one free hero out of three. The shop sells heroes, relics, gear and heals.
- Going back to a cleared spot (a shop, after earning more gold) glitches; fix it.
- Islands further apart.
- The next map puts the hero on the right (start) spot.
- A bigger end-of-map recap: the map cleared, its rewards and events.
- The detour fight doesn't read well.
- No "floor" wording in the Calamity (it isn't the tower).
- Finishing a Calamity should pay impressive rewards.
- More relics: 50 in the game, and more relic sets in the Calamity.

**`claude/cal-roster`: the Calamity's heroes and fights**
- No duplicates in the Calamity, so no merging; a hero's tier rises with its level, tier 3 late in the run.
- Heroes you don't own can turn up as hires.
- Battle boards twice the size (more heroes, more foes).
- The Calamity isn't scaling: heroes aren't even hurt on map 2.

**`claude/battle-ui`: the battle screen**
- A speed picked in a fight carries on between waves; the speed button always sits at the top beside settings and sound.
- Drag and drop spells onto the grid to cast them (see where they land). Spells usable in the Calamity.
- Shrink the bench when combat starts (the Calamity's especially), so the fight can be seen.
- The gate on the battle screen doesn't make sense.
- The Werewolf is clipped when placed.
- Duchess feels more random: not in every fight, she wanders in.

**`claude/hero-skills`: skills, combos and spectacle**
- Ultimates unlock at level 30 (not 15).
- Tier 2 and tier 3 units get their own upgraded skill (e.g. the Beastmaster: two wolves at tier 2, something massive at 3).
- The Beastmaster summons a wolf, not a werewolf.
- Five-unit synergy combos: a handful exist, need five specific heroes, a bar fills on the side, then a mega ultimate (name to workshop).
- The synergy column on the left hides during the wave unless it's part of the combo.
- Abilities and ultimates flashier; a tier promotion in battle much more obvious (tier 3 flashier still).

**`claude/hero-progress`: ranks, talents, summons**
- Ranking up is the player's choice, not automatic: show what was earned, the stats before and after, the look before and after; rank ups give a nice stat bonus.
- Make it special when a hero is earned through play.
- Talent tree: a tap opens a box with the description and Learn or Back; generic icons that make sense (attack a weapon, defence armour, life a heart, a pickaxe for an execute), generated to fit the art.
- Pulling again reruns the summon show; a cinematic for summoning.

**`claude/menus-unlocks`: unlocks and menus**
- Modes unlock with army stars (e.g. Castle at 10, Tower at 15, Calamity at 21); armies unlock with stars too.
- An army fight starts with no unit, and gold for two hires.
- What the codex rewards are: make it obvious.
- Remove the extra settings bar in the castle.

**`claude/audio`: sound and the phone**
- Redo all music and sound effects with the audio plugin.
- The phone's screen stays on while the game runs.
- Other audio can play over the game.
- Double-check the flavour text and humour: it should make sense.

**`claude/assets-audit`: the repository and the stores**
- Clean up the repository (unused or replaced art).
- A licence audit of every asset, and a plan for the Google Play and App Store release: money (purchases or ads) and being legally covered.
