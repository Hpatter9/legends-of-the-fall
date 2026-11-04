# The king's spells, revamped (design, for the owner to approve)

> **Status: design only.** No game code has changed. The owner: "I want to revamp the spell system", meaning the king's spells: the ones
> the player's ruler casts in battle with mana. This note audits the system as it stands on main 0.331.0, offers three directions and
> recommends one. Nothing is built until the owner picks. A phone-readable copy: https://claude.ai/artifact/HA8us2t62muXEd5qoRYkZ4

## 1. The system today

| Part | How it works now | Where |
| --- | --- | --- |
| Spells | 21 spells: Heal, Meteor, Haste (the starting three), Shield, Smite, Chain Lightning, Poison Cloud, Frost Nova, Rally, Earthquake, Resurrect, Cleanse, Blink, Hex, Light Lance, Renewal, Deep Freeze, Battle Cry, Bulwark, Call the Wolves, Meteor Shower | `src/sim/spells.ts` |
| Earning | The Mage Tower teaches 12 (three a level, levels 1 to 4); six grand spells come from milestones (an army's clear, wave 15 of the Last Stand); a gold chest holds a scroll 30% of the time, a Mythic chest 60% | `spellSources.ts`, `spell-sources.md` |
| Choosing | The spellbook (the Spells tab's library, opened by building the Chapel for 200 crowns): three slots whose powers must add up to the budget, 9, plus 1 at Mage Tower 2 and 4. The starting three cost 8 | `spellbook.ts`, `castle.ts` |
| Mana | Starts at 2, fills 0.5 a second (x1.12 a Mage Tower level, relics and traits on top), holds 10 at most | `fillMana` |
| Casting | Tap an orb, then a tile (a 3x3 preview), or drag the orb onto the grid; Rally, Earthquake, Battle Cry and Bulwark cast on the tap. Each spell has a cost and a cooldown | `main.ts`, `fightHud.ts` |
| Auto | The fight's one Auto switch casts the equipped spells with a rule-based chooser (help first, then harm, then buffs; a mana reserve for the cheapest help spell; 1.5 s between casts) and fires the ultimates. Since 0.292 the whole game is tuned for a player who casts this well | `autoCast.ts`, `auto-cast.md`, `spells-retune.md` |
| Look and sound | Effects from `src/art/fx/magic`; two rendered sounds per spell (`cast-<id>`, `fx-<id>`) | `spell-sfx.md` |
| The ruler | Eight rulers (Iron Stag, Sun Viper, Frost Witch, Ash Empress, Rose Duchess, Moon Oracle, Storm Corsair, Gilded Necromancer) are a look and a voice: none changes a spell | `rulerRules.ts` |

## 2. What I played and measured

**In the browser at 393x852** (`npm run web`; a save with the Mage Tower at level 1, the recruits' party, Orc Warband wave 1):

- The spell row sits under the top bar: the mana bar (62 px), three orbs of **40 x 40 px**, then the Auto switch. The War Horn joins it at the left when bound.
  Below the board are five hero rows with their skill chips; a tap on a row fires that hero's ultimate.
- With Auto off, 5 mana (a Meteor) came at **5.6 s**. Tapping the orb put a two-line hint over the top of the board ("tap a tile, or drag a card
  onto the grid") and the 3x3 preview follows the finger. The fight was won at **17.4 s** with the bar **full at 10/10 and nothing cast**:
  the heroes win wave 1 without the king, and the mana that would not fit was lost.
- With Auto on, the same fight cast Haste at 7.2 s and Heal at 12 s, and ended at 16.3 s with 5 mana unspent.

**Headless, with the game's own casting bot** (`node tools/king-spells-design/run.mjs 8`: the greedy player of `tools/autoplay.ts`, Auto's
chooser, the knight, paladin, archer, warlock and cleric, gear dressed, 8 saves a cell; "king's share" counts hits and heals the king made):

| Cell | Fight length | Casts a fight | King's share of damage | King's share of healing | Bar full | Casts by spell |
| --- | --- | --- | --- | --- | --- | --- |
| **Heal, Meteor, Haste** (the starting three, what the game is tuned on) | | | | | | |
| Orc Warband, level 1 | 30.8 s | 3.9 | 0% | 53% | 1% | Heal 2.0, Haste 1.9, Meteor 0.0 |
| Undead Legion, level 8 | 33.1 s | 4.4 | 0% | 53% | 1% | Heal 2.6, Haste 1.8, Meteor 0.0 |
| Beast Packs, level 15 | 20.2 s | 2.4 | 0% | 45% | 0% | Heal 1.4, Haste 1.0 |
| The Labyrinth, level 35 | 43.2 s | 6.0 | 0% | 35% | 2% | Heal 3.3, Haste 2.7 |
| Infernal Host, level 55 | 18.6 s | 2.3 | 0% | 35% | 1% | Heal 1.9, Haste 0.4 |
| **Meteor alone** | | | | | | |
| Orc Warband, level 1 | 30.3 s | 0.9 | 12% | 0% | 29% | Meteor 0.9 |
| The Labyrinth, level 35 | 33.9 s | 0.0 | 0% | 0% | 55% | |
| **Meteor, Chain Lightning, Smite** | | | | | | |
| Orc Warband, level 1 | 24.6 s | 3.6 | 23% | 0% | 0% | Smite 2.0, Chain 1.5 |
| Beast Packs, level 15 | 18.1 s | 2.7 | 11% | 1% | 0% | Smite 1.6, Chain 1.1 |
| The Labyrinth, level 35 | 32.9 s | 4.7 | 15% | 0% | 0% | Smite 3.2, Chain 1.5 |
| Infernal Host, level 55 | 10.3 s | 1.6 | 7% | 0% | 0% | Smite 1.0, Chain 0.6 |
| Golem Forge, level 74 | 16.9 s | 2.6 | 15% | 0% | 0% | Smite 1.4, Chain 1.3 |

How often real players cast is not known: the game keeps no play statistics (it is offline and private), so this is the bot's measure and my own play.

## 3. Where it is weak

1. **The king is a heal button.** With the starting three, Auto never cast Meteor in any cell (0.0 a fight): its 3x3 rarely holds three
   foes "worth hitting" at the heroes, and the reserve keeps Heal's 3 mana back. Alone, Meteor was cast once a fight at level 1 and never at
   the Labyrinth, while the bar sat full for 55% of the fight. The king's healing, though, is a third to a half of all the healing done.
2. **Collecting spells changes nothing.** SPELLS-RETUNE measured every set a top save can afford and **no later set beat the starting three**
   (`spells-retune.md`, section 1). Eighteen spells are earned through the tower, milestones and scrolls, and none is an upgrade or a new
   answer the player needs.
3. **Few, small decisions.** Fights run 10 to 45 s, which buys 2 to 6 casts. The power budget (9, the starters cost 8) mostly blocks
   combinations rather than inviting them. A spell has one rank for ever: nothing grows.
4. **The numbers do not grow with the game.** Meteor (110 raw, less defence), Smite (160), Chain (70), Lance (85) and Meteor Shower (55) are
   flat numbers against foes tuned to hero level and tier, while Heal, Shield and Bulwark are shares of health, so they keep pace. Damage
   spells fade from 23% of the damage at level 1 to 7% to 15% later on.
5. **Mana is lost at the cap.** A player who waits for the right moment watches mana spill at 10; a fight that is won early (most ordinary
   waves) ends with a full bar.
6. **Fiddly on a phone.** 40 px orbs (under the usual 44 px touch size) at the top of the screen, a hint that covers the top of the board, a
   3x3 aimed on an isometric grid of moving fighters with a thumb over it, and the same row also holds the horn and the Auto switch. In a
   fight the player can tap 3 spells, 5 ultimates, the horn, Auto and the speed.
7. **Overlap.** Heal, Shield, Haste, Rally and Battle Cry repeat what the Cleric, Knight, Paladin and the bards already do; the Wizard's Fireball
   is a 3x3 fire burst like Meteor; Call the Wolves sits beside the summoners; the **Eidolon horn** is now the king's big once-a-fight moment,
   and it outshines every spell.
8. **The ruler is only a face.** The player picks one of eight rulers, each with a clear character (the Frost Witch "an annotated
   spellbook", the Gilded Necromancer "a spectral companion"), and it changes nothing about the magic.
9. **Auto is good at helping and timid at harming.** The rules suit Heal and Haste; the harm spells wait for a crowd that seldom forms.

## 4. Three directions

Each keeps the rules that are easy to break: the sim stays deterministic (any draw takes its own side stream of the seed), Auto casts
through the same `castSpell`, it plays offline, upright only.

### A. The Royal Hand (a small deck)

- **Play:** before a run the player builds a deck of **8 spell cards** from those known (copies allowed up to 2). In a fight the hand holds
  **3**; a card cast goes to the bottom and the next is drawn. Mana as now, but the cap rises to 12 and a card left in hand for 12 s can be
  **discarded for 2 mana** (a swipe down). Each card shows its cost in big type.
- **Phone:** three **56 px cards** in a strip just above the hero rows (where the thumb is), drag a card up onto the board. The hand only
  ever has three things to look at.
- **Progression:** duplicate scrolls level a card (ranks 1 to 3: more power, a rider at 3). The tower raises the deck limit (8, 10, 12).
- **Auto:** the chooser runs over the hand, not the whole loadout; it gains a "cycle" rule (discard a card it will not use soon).
- **Balance:** each card's value a mana point is set against one yardstick (a third of a hero's swing a second at that level); then the modes are re-measured with the bot on decks of 8.
- **Art and sound:** card frames (one per element), card-back and draw/discard sounds; spell effects reused.
- **Good:** every spell earned can earn a place; the draw gives each fight a new shape. **Weak:** luck in a game whose fights the player
  cannot steer otherwise; the ruler is still only a face; more UI to build.

### B. Schools of the Crown (each ruler a school) - recommended

- **Play:** each of the eight rulers leads a **school** of five spells and one **Decree**:
  - **Iron Stag, Steel:** Rally, Bulwark, Light Lance, Shield, Smite; *Decree: Stand Fast* (every hero shielded and unshakeable for 6 s).
  - **Ash Empress, Fire:** Meteor, Meteor Shower, Firewall, Smite, Battle Cry; *Decree: Red Sky* (fire falls on every foe).
  - **Frost Witch, Ice:** Frost Nova, Deep Freeze, Ice Wall, Shatter, Shield; *Decree: Long Winter* (every foe frozen 3 s, then slow).
  - **Storm Corsair, Storm:** Chain Lightning, Gale (push a 3x3), Blink, Haste, Thunderclap; *Decree: The Tempest* (bolts hunt the foes for 6 s).
  - **Rose Duchess, Thorns and Poison:** Poison Cloud, Hex, Thorn Snare (hold), Charm, Cleanse; *Decree: The Rose's Price* (every foe's ailments burst at once).
  - **Moon Oracle, Stars and Time:** Haste, Renewal, Blink, Starfall, Foresight (dodge the next blow); *Decree: Stop the Clock* (foes stand still 3 s, heroes don't).
  - **Sun Viper, Sun and Venom:** Heal, Sunbeam (Light Lance's line), Venom Fang, Mirage (decoys), Cleanse; *Decree: High Noon* (heal all, burn all).
  - **Gilded Necromancer, Death:** Resurrect, Raise Dead (the wolves become skeletons), Drain Life, Hex, Bone Wall; *Decree: The Gilded Toll* (the fallen rise, foes that die rise for you).
  - Most are today's 21 spells, moved to the school that suits them; about 14 are new. Heal stays in reach of everyone (below).
- **Loadout:** three slots from your ruler's school, plus **one open slot** for any spell you know from another school (that is what the
  tower, milestones and scrolls keep giving). No power budget: the slot rule does that work.
- **The Decree** replaces the lost mana: mana that would spill over 10 fills the **Decree meter** instead (and a little from every hero
  ultimate). Full, the ruler's portrait glows on the spell row and one tap casts it, no aim. Once a fight, like the horn, but cheaper and the
  ruler's own; the horn stays the Eidolon's.
- **Phone:** four **52 px orbs** in one row, the Decree as the ruler's face at the row's end. The aim stays (tap, then tile; or drag), but a
  **soft snap** puts the 3x3 on the nearest crowd of foes (or of wounded heroes for a help spell) under the finger, and the hint shrinks to a
  label on the orb.
- **Progression:** each spell has **three ranks**; the Mage Tower's levels and the school's own milestones give **school marks** to spend on
  ranks. Rank 3 adds a rider (Meteor leaves the ground burning; Frost Nova shatters frozen foes). Changing ruler keeps every mark:
  marks belong to the spell, so a player who changes ruler starts that school at rank 1 (the owner may prefer a free respec: a question below).
- **Auto:** the chooser gains a rule per school (the Frost Witch's freeze before her Shatter, the Necromancer's Raise Dead where foes fell)
  and casts the Decree when its rule says (a boss below half, or three heroes below half). Harm spells use a looser crowd rule (two foes,
  or one elite), so Auto actually uses them.
- **Balance:** damage spells scale with the party's level and tier like hero skills (a spell's power is a share of the level's yardstick, not a
  flat 110), so they no longer fade. Each school is measured with the bot so none falls more than 10% from the starting set in tries to clear;
  then the armies, tiers, daily, Last Stand and Calamity are re-measured to the owner's pace (`army-curve.md`, `difficulty.md`), as
  SPELLS-RETUNE did, and only the knobs that move get turned.
- **Art and sound:** eight Decree effects and about 14 new spell effects from the Pixel Effects atlas and the packs; the eight rulers'
  command pose (already in `rulerArt.ts`) and a voiced line each for the Decree; about 28 new rendered sounds; school badges in the
  spellbook.
- **Good:** the ruler finally matters; the starting three stop being the answer; Auto uses harm spells; the meter ends lost mana; a clear
  moment that is the king's alone. **Weak:** the biggest build (14 new spells, eight Decrees); the ruler choice becomes a play choice, which
  the owner made a look choice; a balance pass across eight schools.

### C. Royal Momentum (spells that grow in a fight)

- **Play:** two spells and a **charge**. Mana is gone. Each spell has a ring that charges from the fight (a hero's hit, a kill, an ultimate);
  a tap casts it at its level, **1, 2 or 3**, each bigger (Meteor: one, then three, then a rain). Waiting is the decision. Casting two
  elements in a row makes a **combo** (Frost then Meteor: shatter; Poison then Fire: explosion; Haste then Rally: frenzy).
- **Phone:** two big **64 px rings** at the bottom right where the thumb rests; level shown by pips. No 3x3 aim: every spell lands on the
  thickest crowd (help spells on the most hurt), so there is nothing to drag.
- **Progression:** spells unlock as now; levels raise each spell's top charge and open combos in the spellbook (a combo book to fill in).
- **Auto:** casts at level 2 by default (a setting: "Auto waits for level 3").
- **Balance:** charge per hit is the knob: one value per mode, then the usual re-measure.
- **Art and sound:** three looks per spell (small, medium, grand), combo flashes, a rising charge sound.
- **Good:** easiest on a phone; every fight has rising tension; spells grow with the fight. **Weak:** no aim at all may feel like less
  control; combos need many pairs to be tested; overlaps the heroes' own charge meters, which already work this way.

## 5. The recommendation

**B, Schools of the Crown**, with two pieces of C: the **Decree meter fed by spilt mana** (no mana is ever lost) and the **soft snap** to aim, so
it plays well with a thumb. It answers the weak points directly: the ruler gets its magic, the spells rank up and scale with the game, Auto
uses the harm spells, and the king's moment is the king's own rather than the horn's.

Whatever the owner picks, four fixes stand alone and could ship first:

1. Larger orbs (48 px or more) and the hint moved off the board.
2. Damage spells scaled to the level and tier instead of flat numbers.
3. Auto's crowd rule eased so it casts Meteor (and the other area spells).
4. Mana over the cap kept (into a meter, or a cap that rises).

**Building it** (if B is approved), in batches that each ship whole: (1) the four fixes above and the measure; (2) schools and the slot rule
on today's 21 spells, with the Decree meter and two Decrees; (3) ranks and marks; (4) the new spells, school by school; (5) the other Decrees,
voices and sounds; (6) the full re-measure to the owner's pace.

## 6. Questions for the owner

- Should the ruler you pick change your spells (B), or should rulers stay a look and the magic come from a deck (A) or charge (C)?
- If B: may a player change ruler freely, and do ranks carry over (a free respec), or does each school rank up on its own?
- Does Heal stay open to every ruler (in the open slot or as a shared spell), so no school is left without healing?
- The Decree is once a fight like the Eidolon's call: should both be allowed in the same fight?
- Should Auto cast the Decree, or should that stay the player's tap, as the horn does?

## Checks

Design only. `npm run typecheck` passed. The measure tool is `tools/king-spells-design/` (new; it changes nothing in the game). The play
was at 393x852 on `npm run web`.
