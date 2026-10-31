# Relics redone: things the keep has lost (a proposal for the owner)

Status: **a design for approval.** No rule has changed yet. Branch `claude/relics` (the first part, relics shown on the wave-prep screen
only, is built: `docs/notes/relics-prep.md`).

The owner: "we should redo these so they are more of a relic, rather than an individual piece of gear that helps the party."

## What is wrong now

There are 50 relics (`src/sim/relics.ts`, `src/sim/relicSets.ts`): 12 ordinary ones, 4 legendary ones and 34 set pieces. Nearly all of
them are one flat number: "+8% attack", "+6% hp", "heroes take 4% less damage". Many repeat each other (five relics are "+5% or +6%
attack", six are "+4% to +7% hp", four are "skills charge 10% to 12% faster"). They read like gear for the whole party, and the names
(Whetstone, Iron Shield, Swift Boots, Wolf Fang) are gear's names.

## The idea in one paragraph

A relic is **something the keep has lost**, found again on the road: a banner from its founding, a drum from the Burning, a scale
from the night the Dragon King came as a guest. Each one has **a name, one line of lore, a look, and a rule with character**. No relic
is a bare "+8%". Each has one of four shapes:

| Shape | What it means | Example |
|---|---|---|
| **A price** | Strong, but it costs something | *Ember of the Great Hall*: +12% attack, but heroes start each fight at 90% health |
| **A condition** | Works only when something is true | *The First Banner*: +6% hp; +8% attack too while no hero has fallen this fight |
| **A growing power** | Starts small and grows through the run | *The Old Whetstone*: +3% attack, +1% more for each wave won this run (to +15%) |
| **A story tie** | Bites hardest against the keep's old enemies | *Scorched Scale*: 5% less damage, 15% less from bosses |

The sets become the keep's **Chapters**: four relics from the same part of its history. Two of a chapter give a small bonus and three
the strong one, as now; the card also tells that chapter's story a line at a time as its relics are found. The Calamity's six sets
become the six **Eidolons' reliquaries**, tied to the War Horn. The four legendary relics become six **Storied** relics, each a big
change to how a run plays.

## Rarity and where relics are found

| Rarity | Frame | How many | Found |
|---|---|---|---|
| **Common** | grey | 16 | everywhere relics are now: the road's events and chests, the merchant, the market, the Pale Lady, Last Stand breaks and holds, tower shops, chests, elites, bosses |
| **Rare** | blue | 8 | the same places, a third as often (each draw is Rare one time in four while a Rare is left unowned) |
| **Eidolon** | the Eidolon's colour | 18 | the Calamity only (its shops, chests, elites, bosses), as its six sets are now |
| **Storied** | gold | 6 | only the tower's black altar (a hero lost for one) and the cursed crown road event, as the legendary four are now |

Prices are unchanged for Commons (the merchant's `70 + 4 x stage`, the Stand's `60 + 12 x owned + 3 x wave`); a Rare costs half as much
again.

## The Chapters of the keep (24 relics, the run's ordinary relics)

Each relic: its name, its lore line, its rule, its rarity, and the old relic(s) it replaces (how saves convert).

### Chapter I: The Founding (holy, gold-white)

*"Before the walls there was a hill, a banner and nine stubborn people."*

| Relic | Lore | Rule | Rarity | Replaces |
|---|---|---|---|---|
| **The First Banner** | Sewn from the founders' cloaks. It has never been washed and never been taken. | +6% hp; +8% attack as well while no hero has fallen this fight | Common | Banner |
| **The Founder's Ledger** | Every stone of the keep, counted twice, in a hand that never shook. | Skills charge 5% faster, +1% more for each wave won this run (to +20%) | Rare | Scholar's Scroll |
| **St Oswin's Cup** | The saint drank from it once and declared it too big. | The king starts each fight with 2 mana; mana fills 10% faster | Common | Holy Chalice |
| **The Warden's Medal** | Given to whoever held the gate last. Most of the names on it are scratched out. | When one hero is left standing, it heals 30% of its health and takes 30% less damage | Common | Saint's Medal |

Two: +3% hp. Three: heroes heal 0.5% of their health a second (as Holy's three now).

### Chapter II: The Long Winter (frost, pale blue)

*"The winter the gate froze shut, and the keep lived on what was in the cellar and what came over the wall."*

| Relic | Lore | Rule | Rarity | Replaces |
|---|---|---|---|---|
| **The Gate Boss** | The iron boss of the old gate, prised off when the gate went. | Heroes take 10% less damage, but act and walk 4% slower | Common | Iron Shield |
| **The Stopped Hourglass** | Its sand stopped in the Long Winter and has not moved since. | The king's mana fills 15% faster, and twice as fast in each fight's first 10 seconds | Rare | Hourglass |
| **Rime Sapphire** | Nobody knows who froze it. Everybody knows not to lick it. | A hero at full health charges its skills 20% faster | Common | Frost Sapphire |
| **The Sentry's Cloak** | Worn by eleven sentries over one winter. Only the cloak came back warm. | +12% hp for heroes placed on the back row; +4% for the rest | Common | Winter Cloak |

Two: heroes take 2% less damage. Three: the first blow on each foe chills it for a second (as Frost's three now).

### Chapter III: The Burning (fire, ember red)

*"The night the Infernal Host reached the inner hall, and the hall was the thing that burned."*

| Relic | Lore | Rule | Rarity | Replaces |
|---|---|---|---|---|
| **Phoenix Feather** | From the bird that nested in the chimney during the Burning, and refused to leave after. | Once a fight, the first hero to fall rises at half health. After five rises in a run it burns out and becomes **Phoenix Ash**: +5% attack | Rare | Phoenix Feather |
| **The Siege Drum** | Beaten on the walls all night, so the town would know the keep still stood. | The foes wait 1 second at the start of a fight; 2 seconds if a boss is with them | Common | War Drum |
| **Ember of the Great Hall** | The last coal of the hall's hearth. It has not gone out, and it is not polite. | +12% attack, but heroes start each fight at 90% health | Common | Ember Ruby |
| **Scorched Scale** | Shed by Vaelkhar on the one night he came to the keep as a guest. | Heroes take 5% less damage, and 15% less from bosses | Common | Dragon Scale |

Two: +2% crit chance. Three: heroes' blows set foes burning (as Fire's three now).

### Chapter IV: The Night Watch (shadow, violet)

*"The years the Yokai walked the walls after dark, and the watch learned to walk quieter."*

| Relic | Lore | Rule | Rarity | Replaces |
|---|---|---|---|---|
| **The Watchman's Charm** | Every watchman wore one. The ones who forgot are in the annals. | Heroes slip 5% of blows, and 15% in each fight's first 8 seconds | Common | Feather Charm |
| **The Hawk's Eye** | The glass eye of the keep's last falconer, who said it saw better than the other. | +3% crit chance, +1% more for each elite or boss felled this run (to +15%) | Rare | Hawk Eye |
| **The Cutpurse's Cloak** | Taken off a thief the watch caught. The watch kept it; the thief kept running. | Heroes slip 10% of blows, but take 5% more from those that land | Common | Shadow Cloak |
| **The Poisoner's Fang** | Found in the well. The well was not used again. | +4% crit chance; crits on a foe under half health deal 25% more | Common | Viper Fang |

Two: heroes slip 2% of blows. Three: +2% crit chance, and crits make foes bleed (as Shadow's three now).

### Chapter V: The Hunt (beast, green)

*"When the Beast Packs came down from the hills every autumn, and the keep went out to meet them."*

| Relic | Lore | Rule | Rarity | Replaces |
|---|---|---|---|---|
| **The Old Whetstone** | Worn to a sliver by forty generations of the keep's blades. | +3% attack, +1% more for each wave won this run (to +15%) | Common | Whetstone |
| **The Courier's Boots** | They ran the keep's last letter out. They came back without the courier. | Heroes act and walk 8% faster, but have 4% less hp | Common | Swift Boots |
| **The Wolf-Tooth Necklace** | One tooth from every wolf the huntmaster killed. It is a long necklace. | +4% attack; +15% against beasts (the werewolves, the Beast Packs and the Wildwood's creatures) | Common | Wolf Fang |
| **The Huntmaster's Harness** | The huntmaster's own, from the year the pack came back for him. | When a hero falls, the rest act 12% faster for 8 seconds (up to three times at once) | Rare | Beast Harness |

Two: heroes act and walk 2% faster. Three: +2% attack and 1% faster still (as Beast's three now).

### Chapter VI: The Treasury (fortune, gold)

*"What the keep kept when it could, and what it pawned when it couldn't."*

| Relic | Lore | Rule | Rarity | Replaces |
|---|---|---|---|---|
| **The Coronation Crown-Piece** | Minted for a coronation that was called off at the last minute. | +8 gold for each win, +1 more for every 50 gold you hold (to +16) | Common | Lucky Coin, Coin Hoard |
| **The Tax Ingot** | The whole of one year's tax, melted down so nobody could spend it. | +20 gold for each win, but every price is 10% higher | Common | Gilded Ingot, Gold Band |
| **The Pawned Crown** | Pawned three times, redeemed twice. | +6% hp and +6% attack, but each win costs 10 gold (never below nothing) | Rare | Jewelled Crown |
| **The Watchtower Glass** | From the highest window, where you could see them coming a day off. | Shooters reach further from high ground, and have +6% attack while they stand on it | Common | Spyglass |

Two: +6 gold for each win. Three: +10 gold for each win and +3% hp (as Fortune's three now).

## The Eidolons' reliquaries (18 relics, the Calamity only)

The six Calamity sets now have no story and repeat the ordinary relics' numbers. They become the six Eidolons' reliquaries: three things
each great being left in the world. Two of one: a small bonus in its element. All three: **the bound echo**: while that Eidolon is the
one bound to the War Horn, the horn fills 25% faster this run and the Eidolon's rider lasts half as long again. This ties the Calamity's
relics to the Eidolons the player has earned, and gives a reason to choose an Eidolon for a run.

| Eidolon | Relic | Lore | Rule | Replaces |
|---|---|---|---|---|
| **Askel, the Cinderhound** | Cinder Collar | It never fitted him. He wore it anyway. | +10% attack, but heroes heal 20% less | Blood Vial, Ruby Locket |
| | Hound's Ash-Tooth | Lost in a fight with something larger. He won. | A hero's kill gives it +3% attack for the rest of the fight (to +15%) | Reaver Helm |
| | Ember Brand | Where Askel lay down, the ground kept the shape. | +5% crit chance; crits leave the foe burning | Bloodstone Ring |
| | *Two:* +3% attack. | | | |
| **Nivra, the Rime Wyrm** | Rime Pearl | It forms in her throat once a century. She coughs. | Foes that strike a hero are slowed 10% for 2 seconds | Moon Lantern |
| | Wyrm's Breath Vial | Do not open indoors. | Skills charge 10% faster; the first skill each fight freezes its target for a second | Comet Shard |
| | Glacier Step | Her tracks, kept in ice, from when she still walked. | Heroes slip 4% of blows, 10% while they stand still | Cloud Treads |
| | *Two:* heroes take 3% less damage. | | | |
| **Aurelan, the Lion of Dawn** | Mane-Gold Thread | One hair, and enough to sew a banner with. | +6% hp; the first hero to drop under a quarter health heals 25% (once a fight) | Last Light |
| | The Dawn Chart | Where the sun rose on the day he first spoke. | The king's mana fills 12% faster | Star Chart |
| | Lion's Oath-Ring | Whoever wears it cannot lie. It is rarely worn. | Heroes heal 3% of their health whenever a foe falls | Astral Circlet |
| | *Two:* +3% hp. | | | |
| **Voltara, the Copper Goddess** | Thunder Horn | Her herald's. It only plays one note, and it is loud. | Heroes act and walk 6% faster | Thunder Horn |
| | Copper Torc | Struck by lightning every hour, on the hour. | Skills charge 12% faster, but heroes have 3% less hp | Thunder Pendant |
| | Tempest Ring | Small, and humming. | +6% crit chance; every tenth blow strikes a second foe nearby | Tempest Ring |
| | *Two:* heroes act and walk 3% faster. | | | |
| **Gorm, the Quarry Titan** | Granite Heart | It beats once a day, which is plenty. | +10% hp, but heroes act 3% slower | Granite Heart |
| | Quarry Gauntlet | He wore it to dig the keep's first foundation. | Heroes take 6% less damage; 12% for heroes who have not moved this fight | Stone Gauntlet |
| | Moss Bell | Rung once, it has been ringing slowly ever since. | Heroes heal 0.4% of their health a second | Moss Amulet, Earthen Bell |
| | *Two:* +3% hp. | | | |
| **Vaelkhar, the Dragon King** | Void Shard | A splinter of the sky he flew through to get here. | +6% attack; +12% against the Calamity's guardians | Rift Shard |
| | Dragon-King's Sigil | His seal, on a letter the keep never answered. | Skills charge 10% faster; ultimates charge 10% faster too | Void Sigil |
| | Doom Helm | Made for his rider. He has never let anyone ride him. | Heroes take 4% less damage, and the foes wait half a second | Doom Helm |
| | *Two:* the foes wait a third of a second at the start. | | | |

(The old Calamity sets do not line up one to one with the Eidolons: the Star set's pieces are shared between Aurelan and Nivra, and
Askel's and Gorm's take two old pieces into one. Every old id has a home: see the conversion table.)

## The Storied relics (6, the old legendary four reconsidered)

Each changes how a run plays, and each has a real price. Found only at the tower's black altar (a hero given up for one) and from the
cursed crown on the road, as now.

| Relic | Lore | Rule | Replaces |
|---|---|---|---|
| **The Crown of the First King** | The keep's first crown. Every king since has found it too heavy. | +14% attack and hp for every hero; the strongest foe of every wave has +14% too | Sun Crown |
| **Vaelkhar's Heart** | He gave it to the keep's first queen. He would like it back. | +12% hp, heroes take 12% less damage; bosses have +10% attack (they can smell it) | Dragon Heart |
| **Voltara's Wedding Ring** | She married the storm. The storm kept the house. | Heroes act and walk 14% faster, +10% crit chance; each fight, one hero (drawn from its own side stream) starts struck, at 85% health | Storm Ring |
| **The Calamity's Eye** | A splinter of the tear the Calamity came through. Look into it, and it looks back. | Skills charge and the king's mana fill 40% faster; foes have 6% more hp | Void Lens |
| **The Book of Names** *(new)* | Every defender who fell for the keep, in order. There is room at the end. | Each hero who falls in this run (for good or for the fight) adds +2% attack for the rest of the run, to +30% | — |
| **The Unfinished Chronicle** *(new)* | The keep's history, the last chapter left blank. | Every Chapter (and reliquary) counts one more relic than you hold: one relic of a chapter switches on its two, two switch on its three | — |

## How existing saves convert

Saved runs keep their relics as a list of ids (`run.relics` in the ordinary run, the tower and the Calamity; `StandRun.relics` and
`heldRelics`; the tower's open `offer`; the Pale Lady's lent `relic`; the Calamity clear card's `relics`). One table, `RELIC_RENAMES`
(old id to new id), is applied when each save loads, and duplicates that the merge makes (two old relics into one new one) are dropped
and **paid back as their price in gold**, so no one loses value. Growing relics start from nothing (a run already under way grows them
from its next wave). Unknown ids are already skipped by `relicEffects`, so a save from a later version stays safe. No save version bump.

| Old | New | | Old | New |
|---|---|---|---|---|
| whetstone | The Old Whetstone | | thunderHorn | Thunder Horn |
| banner | The First Banner | | cloudTreads | Glacier Step |
| hourglass | The Stopped Hourglass | | thunderPendant | Copper Torc |
| warDrum | The Siege Drum | | tempestRing | Tempest Ring |
| luckyCoin | The Coronation Crown-Piece | | graniteHeart | Granite Heart |
| phoenix | Phoenix Feather | | mossAmulet | Moss Bell |
| ironShield | The Gate Boss | | stoneGauntlet | Quarry Gauntlet |
| featherCharm | The Watchman's Charm | | earthenBell | Moss Bell (merged) |
| hawkEye | The Hawk's Eye | | bloodVial | Cinder Collar |
| swiftBoots | The Courier's Boots | | bloodstoneRing | Ember Brand |
| scholarScroll | The Founder's Ledger | | reaverHelm | Hound's Ash-Tooth |
| spyglass | The Watchtower Glass | | rubyLocket | Cinder Collar (merged) |
| emberRuby | Ember of the Great Hall | | starChart | The Dawn Chart |
| dragonScale | Scorched Scale | | cometShard | Wyrm's Breath Vial |
| frostSapphire | Rime Sapphire | | moonLantern | Rime Pearl |
| winterCloak | The Sentry's Cloak | | astralCirclet | Lion's Oath-Ring |
| holyChalice | St Oswin's Cup | | coinHoard | The Coronation Crown-Piece (merged) |
| saintMedal | The Warden's Medal | | gildedIngot | The Tax Ingot |
| shadowCloak | The Cutpurse's Cloak | | jewelCrown | The Pawned Crown |
| viperFang | The Poisoner's Fang | | goldBand | The Tax Ingot (merged) |
| wolfFang | The Wolf-Tooth Necklace | | riftShard | Void Shard |
| beastHarness | The Huntmaster's Harness | | voidSigil | Dragon-King's Sigil |
| sunCrown | The Crown of the First King | | doomHelm | Doom Helm |
| dragonHeart | Vaelkhar's Heart | | lastLight | Mane-Gold Thread |
| stormRing | Voltara's Wedding Ring | | | |
| voidLens | The Calamity's Eye | | | |

(The fortune set moves out of the Calamity into Chapter VI, which the ordinary run, the tower and the Last Stand also draw from; a
Calamity run that held fortune pieces keeps them, converted. The ids can stay the old ones under new names where the relic is the same
thing, which keeps the conversion table short; the ids are never shown.)

## How the relics are shown

- **The prep screen** (built): the strip of icons; a tap opens a **relic card** in place of today's one line: the icon large, the name,
  the rarity, the lore line in italics, the rule, any price in red, a growing relic's value now ("+7% attack now, +15% at most"), and its
  chapter: the four pieces (held ones lit), the two bonuses, and the chapter's line of story.
- **Offers** (the merchant, the Stand's break, an elite's hoard): the same card, smaller; "Chapter III, 2 of 4 → 3 of 4" as now.
- **The Pack** lists them by chapter instead of in the order found.
- **Not in the fight** (the owner's ask, built). A relic that fires in a fight (the Phoenix's rise, the Warden's Medal, the Harness)
  shows its icon briefly over the hero it touched, so the player sees it work without a strip on screen.

## The rules the fight needs (engineering, for the estimate)

Most of the new rules are small hooks of the kind the sets already use (`SetHooks` in `relicSets.ts`, read in `battle.ts` and
`abilities.ts`). New:

- **Conditions:** no hero fallen yet; a hero at full health; the last hero standing; a boss on the field; the foe under half health; a
  hero placed on the back row or not yet moved; the foe's kind (beasts, Calamity guardians); the first N seconds of a fight.
- **Growing powers:** an optional `run.relicMarks?: Record<string, number>` (waves won, elites felled, heroes fallen, Phoenix rises),
  counted at the wave's end in `run.ts` / `stand.ts` / `tower.ts`; old saves have none and start at zero.
- **Prices:** heroes start below full health; foes stronger (the strongest of the wave, bosses, all); prices higher (`market.ts`,
  `events.ts`, `stand.ts`, the tower's shop); gold lost on a win.
- **Triggers:** on a hero's fall (Harness, Book of Names), on a kill (Ash-Tooth, Oath-Ring), every tenth blow (Tempest Ring).
- **The Unfinished Chronicle:** `setCount` adds one for each chapter with at least one piece.
- Voltara's Wedding Ring draws its struck hero from its own side stream (`mixSeed(seed, <new salt>, wave)`), so no other draw changes.

Every rule gets a test in `test/relics.test.ts` (and the conversion its own, from saves of each mode). Autoplay's relic choice
(`autoplay.ts`, today "always take the free relic") learns to skip a relic whose price it cannot pay well (the Tax Ingot with no gold to
spend, Ember of the Great Hall for a party with no healer).

## Balance plan

- **The budget.** Today a Common is worth about one +8% stat (Whetstone), a set piece +5%, a legendary two stats at +12% to +14%. The new
  ones keep that: a Common is worth +8% of one stat **on average over a run**, a Rare +12%, a Storied about +25%. A price relic shows a
  bigger number (+12%) for its cost; a condition relic a bigger number for the share of time it is on; a growing relic starts under the
  budget and ends over it (the Whetstone is +3% at wave 1 and +15% from wave 12: about +8% across an army's 15 waves).
- **Measured.** A new `npm run relic-balance` (in the shape of `npm run balance`): each relic alone, on the same party, against the
  classic armies at hero levels 10, 30 and 60, 40 boards each; the mean waves reached and the win rate, against no relic and against
  today's Whetstone. A Common should land within half a wave of the Whetstone; a Rare up to one wave above; a Storied two. Then the
  modes as a whole: `npm run stand-balance` (the Last Stand), the tower and the Calamity's sweeps, before and after, to show runs end
  where they ended before.
- **The sets.** The chapters' two and three bonuses stay as they are (they were tuned), so the sets' power does not move; only the
  pieces change. The bound echo is new and measured with `--eidolon`.
- Relics are found at the same rate in the same places, so runs gain power at the same pace.

## Art plan

Today's icons are 16x16 DawnLike tiles (`src/art/items/`), most chosen for the old gear names (a boot for Swift Boots, a shield for Iron
Shield), and many relics share a tile.

- **Recommended: paint them**, as the equipment was painted (`art-source/gear/`, `docs/notes/gear-icons.md`): 48 paintings, 256 x 256,
  imported with a copy of `tools/gear/import-gear-icons.py` into `src/art/relics/relics-128.webp` and `-64.webp` (loaded by URL, added
  to `build.mjs`'s `FILES` for offline play). The DawnLike tiles stay as the fallback, as they do for gear.
- **The look**: the gear icons' painted style (glossy, rich colour, a single object centred on a clean background), but **old**: worn
  gilt, patina, chips, wax seals and thread, a faint glow of the chapter's colour, as if lit by a candle in a reliquary. A thin frame of
  the rarity's colour is drawn by the page (as gear's grade frames are), not painted.
- **The prompt** (one per relic, the subject changed):

  > A single fantasy relic, painted game item icon, centred on a plain transparent background, three-quarter view, rich saturated
  > colour, soft painted highlights, crisp silhouette, in the same style as a set of hand-painted RPG equipment icons. The object is
  > old and treasured: worn gilding, patina, small chips, a wax seal or a scrap of ribbon, lit warmly as if by candlelight, with a
  > faint **[chapter colour: gold-white / pale blue / ember red / violet / green / gold]** glow behind it. Subject: **[the relic, e.g.
  > "a tattered square war banner on a short broken pole, embroidered with a hill and nine stars, its edges singed"]**. No text, no
  > frame, no hands, no background scene. 256 x 256.

  The subjects are written out with the relic list above (the lore lines say what each looks like). The Eidolon relics take that
  Eidolon's palette from its portrait (`art-source/eidolons/`). Storied relics get a second, brighter painting, as gear's Mythic does.
- **If no painting is wanted yet**: DawnLike tiles re-picked for the new names (a book for the Ledger, a cup for St Oswin's, a bell for
  the Moss Bell), so no icon is shared. Credited in `CREDITS.md` either way.

## Open questions for the owner (with what I recommend)

1. **Is the list right?** 24 relics in six Chapters, 18 in the Eidolons' reliquaries, 6 Storied: 48 in all, against 50 now.
   *Recommend:* yes; fewer, each different, rather than more repeats.
2. **Prices: how sharp?** Some relics cost something (start at 90% health, prices up, foes stronger). *Recommend:* yes, shown in red on
   the card so the cost is never a surprise, and Auto (and autoplay) avoids a price it cannot pay.
3. **The Eidolon reliquaries: Calamity only?** *Recommend:* yes, as the Calamity sets are now; their bound echo only works for an Eidolon
   the player has already earned.
4. **Storied relics that change the rules** (the Book of Names grows with each fallen hero; the Unfinished Chronicle bends the sets).
   *Recommend:* keep both; they are the "story" end of the list and only come from the altar and the cursed crown.
5. **Converting old runs.** *Recommend:* silently, with one line on the next prep screen: "The keep's relics have been catalogued anew:
   your Whetstone is now The Old Whetstone." Merged duplicates are paid back in gold.
6. **Art: paint the 48 (recommended) or re-pick DawnLike tiles for now?** Painting fits the gear icons and the "ancient artefact" feel.
7. **The relic card on prep: lore always shown, or under a "more" tap?** *Recommend:* always: one short italic line is what makes it a
   relic and not a stat.
8. **A relic in the fight:** a small icon over the hero when one fires (the Phoenix, the Medal, the Harness). *Recommend:* yes; it is
   brief, so the fight screen stays clear as asked.
9. **Build it in one go or two?** *Recommend:* two: first the Chapters and Storied relics with the new card and the conversion (the
   ordinary run, the tower, the Last Stand), then the Eidolon reliquaries and the bound echo for the Calamity.
