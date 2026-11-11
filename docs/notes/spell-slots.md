# Spell slots

The owner: "For spells, there should be one unlocked to start then the other slots unlock slowly till you get your 4 slots."

These are the king's spells: the orbs in the fight's top row (`#hudSpells`), chosen in the spellbook (the Spells tab).

## How it worked before

- **Known:** a new save knew the starting three (`STARTER_SPELLS`: Heal, Meteor, Haste) and, once the page fitted the loadout to its
  ruler (`fitSchool`), the first two spells of the ruler's school (Rally and Shield for the default ruler, the Iron Stag). Five known.
- **Carried:** the loadout is three school slots and one open slot (`schools.ts`). A new save under the Iron Stag carried three from
  its first fight: Rally and Shield in the school slots and Heal in the open slot. All four slots were open from the start; the
  fourth stood empty only because the save knew no third spell of its school. It came from the Mage Tower (Smite at level 1, Lance at
  level 3 for Steel), a milestone or a chest's scroll (`spellSources.ts`).
- **The Chapel and the Spells tab:** the spellbook (changing the loadout, ranking spells) is shut until the Chapel stands
  (`spellsOpen`). The Chapel can be raised at 10 army stars (`SPELLS_NEED`, `chapelOpen`) and costs crowns. Until then the Spells tab
  is dimmed with a lock and its page says why. The spells a save carries work in fights either way.
- **SPELL Auto** (`autoCast.ts`) casts whatever `castList(meta.spellbook)` holds; a new save starts with it on.
- **The first hour** leans on spells: a new save cleared the Orc Warband in about 2 tries with spells cast and 6 or more without
  (`docs/notes/first-hour.md`). The first fight's tip ("mana") said the king "has spells".

## The rule now

A save has **spell slots**: how many of the loadout's four slots may be filled at once (`src/sim/spellSlots.ts`). They open by total
army stars (`totalStars`, the stars that open the armies, the modes and the rune bench's Auto):

| Slot | Opens at | About when |
|---|---|---|
| 1 | the start | Heal |
| 2 | 3 ★ | the first army cleared |
| 3 | 10 ★ | with the Chapel and the Spells tab |
| 4 | 20 ★ | |

These are the director's starting numbers, kept after measuring (below).

- The loadout keeps its shape: at most three school spells and one in the open slot. The open slots cap the total, so the one slot
  of a new save takes a school spell or any spell known.
- **A new save carries Heal** (`FIRST_SPELL`, `newLoadout`), whatever its ruler. Of the five spells a new save knows, Heal is the one
  that holds the first army on its own (see the numbers).
- **A slot that opens while the spellbook is shut fills itself** with the next default spell (`fillSlots`: Heal, then the ruler's
  school in its order), because the player has no way to fill it before the Chapel. So slot 2 takes Rally under the Iron Stag, and
  the notice says so. Once the spellbook is open a new slot is left empty for the player.
- `equipBlock`, `equipSpell` and `fitSchool` take the open count; a full set of open slots refuses a spell with "Your one open slot
  is full: unequip a spell first, or win army stars to open another". A change of ruler fills no more than the open slots, Heal first.
- **SPELL Auto** needs no change: it casts `castList`, which never holds more than the open slots.

### Old saves

`Loadout.slots` (optional) is the count a save holds open whatever its stars. `readLoadout` sets it from what the save has
equipped the first time it is read, and never lowers it, so a save with three or four spells in its slots keeps those slots. A save
with one or none equipped, and every new save, follows the stars. `Meta.slotsTold` is how many slots' opening has been told: a new
save starts at 1; a save without the key (from before) is told none of the slots it already has.

### Telling it

- **The notice:** `tellSlots` gives one line a slot ("Second spell slot unlocked · Rally joins your spells", or "... · fill it in the
  spellbook"), shown as the standard toast. The page tells it as the run's recap opens, so the line is in the recap's "News of the
  run" (every toast is listed there), and again wherever the deploy helpers are told, in case the stars came another way.
- **The spellbook:** four slot tiles. Open ones first (the spells in cast order, then "Empty"), then the shut ones with the painted
  lock from the button kit and "Opens at 10 ★ (you have 6)". The heading says "2 of 4 slots open". With all four open the row reads
  as before (School 1 to 3, Open).
- **The Spells tab** wears its mark while an open slot is empty and a spell known could fill it (`slotWaiting`). A new Steel save at
  20 stars knows no third Steel spell, so its fourth slot shows empty without nagging until one is learnt.
- **The fight's top row** shows only the spells carried; there is no hole for a shut slot. The even spacing rule already takes any
  count.
- **Tips:** the first fight's tip now reads "Your king's magic wins fights. You begin with Heal, and more spell slots open as you win
  stars. The SPELL switch casts for you; or tap a spell, then a tile." The spellbook's tip says "up to four as stars open slots".
  The ultimates' tip ("Auto spells casts your spells") was already true with one.

### Quests

`noSpells` and `spellsOnly` read the fight's log and are untouched. One quest could be offered before its spell could be carried:
Gwen's "Smoke Out the Bees" (cast Meteor, Meteor Shower or Poison Cloud), offered after the Beast Packs, about 6 stars, when a new
save now carries Heal and Rally and cannot change them. It now also waits for the spellbook (a new need, `{ kind: 'spellbook' }`).
The quest audit's rule changed to match: only Heal counts as carried from the first fight; another starting spell needs the
spellbook, any other spell its own `spell` need. The audit passes with no calls.

## Numbers

`node tools/first-hour/pace.mjs --saves 40` (a new save, the Orc Warband on Normal, mean tries to the first clear; first pack /
second pack):

| Spells cast | Sword and Shield | Blade and Spell |
|---|---|---|
| Before: Rally, Shield, Heal | 1.9 | 1.6 |
| **One slot: Heal (the rule now)** | **2.1** | **1.8** |
| One slot: Shield | 3.3 | 2.4 |
| One slot: Haste | 5.3 | 3.5 |
| One slot: Meteor | 5.7 | 4.0 |
| One slot: Rally | 6.4 | 4.1 |
| Two: Rally, Heal | 2.1 | 1.8 |
| Two: Shield, Heal | 1.9 | 1.6 |
| No spells | 8.7 | 6.5 |

So the first slot's spell matters far more than the count: Heal alone is within "about 2 to 3 tries", and any other single spell
is not. That is why the first slot is Heal rather than the school's first spell, and why slot 2 did not need to come earlier.

`CLIMB_ARMIES=3 npm run balance -- --no-tables --climb --saves 20 --new-save` (mean tries an army; 20 saves, so a try or so of
noise):

| Army | Before | After |
|---|---|---|
| Orc Warband | 1.8 | 2.2 |
| Undead Legion | 5.0 | 4.5 |
| Beast Packs | 2.1 | 1.6 |

The second and third armies are fought with two spells (Rally and Heal) and come out no harder.

**Other bands:** untouched. The balance tools' player casts only the open slots' spells of the save it plays (`botLoadout`).
`startedMeta`, the old save every table and test is measured from, is a save from before the slots and keeps all four, so its
loadouts are what they were. The full suite, the pinned recordings among them, passed with no recording moved.

## Checks

- `test/spell-slots.test.ts`: slots at N stars; a new save's Heal under every ruler; an old save's count; equipping refused on a
  locked slot; the notice and the default fill; the tab's mark; the bot's loadout; the gated quest and the tips.
- `node tools/spell-slots/shots.mjs` (after `npm run web`): at 393x852, 360x780 and 412x915, one to four orbs in the fight's row with
  even gaps and equal margins and no hole; the spellbook with one to four open, the shut slots' lock and words fitting; a refused
  spell; the notice; the tab's mark coming and going. Shots in `docs/samples/spell-slots/`.
- No new card or popup: the spellbook is the same ornate sheet and page, so the phone's Back and the popup guard are as they were.

## Left for the owner or the director

- Slot 2 fills itself with the school's first spell. For Steel, Shield beside Heal does a little better than Rally (1.9 against 2.1
  tries), but the school's order is used elsewhere, so it was left.
- The unlock notice also shows on the home screen if the page is opened with a slot not yet told.
