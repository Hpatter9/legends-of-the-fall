# Seven-slot gear, runes and remedies (design)

The design is also published as a page for reading on the phone: https://claude.ai/artifact/1gCUF5VY5bmgzDzG7qQeaF

A design for the owner's approval. No game code changes until it is approved. It answers four asks in one plan:


1. **The big gear update.** Lasting gear gets seven slots (head, torso, right hand, left hand, feet, belt, accessory) and 30 pieces
   a slot (210). Diablo-style sets give 2, 4 and full-set bonuses that change how a hero plays. Named legendary pieces have their
   own stories. Gear grows with use, and the player chooses between enchanting and repairing. Today's slots and owned pieces carry
   over and nothing is lost.
2. **The economy.** Crowns are worth more: the shop's prices go up, repairs cost much more, and gear is harder to get.
3. **Runes replace the in-run equipment.** "King God Castle uses in-battle equipment; simple; they merge to level up: sword =
   attack, armour = defence and health, staff = magic power, bow = speed. Not exactly theirs but similar; call them runes. Each hero
   can have only 3 runes active in a run; they can be removed to merge; we need a way to show who has what rune equipped so we know
   to pull them off and merge them."
4. **Wounds and remedies.** A hero who fell comes back after a **won** wave at about half health, not full. Consumables heal
   between waves.

It builds on what is in the game now: the 60 bases and 12 sets ([hero-gear.md](hero-gear.md), [awaken-gear.md](awaken-gear.md)),
wear and Hester's stall ([shop-books-gear.md](shop-books-gear.md)), real finds in runs ([run-gear.md](run-gear.md),
[run-gear-2.md](run-gear-2.md)), the D&D scores and AC ([stats-1.md](stats-1.md) to [stats-6.md](stats-6.md)), and the
[joint rebalance](joint-rebalance.md), whose targets the balance pass keeps.

---

## The player's experience

**At camp.** The hero sheet's Equipment panel is now a paper doll: the hero in the middle and seven frames around it. The head is
above, the torso at the chest, the right hand (the weapon) and the left hand (a shield, a tome, a quiver, an orb) at either side, the
belt at the waist, the feet below, and the accessory (a ring, an amulet, a charm) in the corner. Kenji wears four pieces of the
Winter Court. The set's bar under the doll lights four of its seven pips, and its 4-piece line is lit: "A crit freezes the foe."
The full-set line is greyed: "Long Winter: the first skill each fight freezes every foe within 2 tiles."

His Frostbrand shows a small seasoning bar. It has fought 46 waves and is now item level 9, three levels above where it dropped.
His boots are worn (amber). The player taps them and gets three choices. **Repair · 180** mends them to full at the smith.
**Patch · 70** brings them back to 60%, but they lose 2 points of durability for good. **Enchant · 650** adds a Swiftfoot glyph
(+4% move speed), but enchanted pieces wear faster and cost more to mend. The crowns will not cover all three. The player patches
the boots and saves for the enchant.

**In a run.** The first won wave drops a red **Ember rune I**. Between waves the bench shows each hero with three small sockets above
their portrait. The player drags the rune onto Kenji's first socket. Two waves later a second Ember I drops, and both runes, the one on
Kenji and the new one in the bag, get a gold rim with a small "2" badge: they can merge. The player drags the new one onto Kenji's.
They fuse into **Ember II** in his socket. The tray's top line says "Merges ready: 0". At the boss wave, Auto (on in auto-replay, a
button in hand play) pulls three runes off two heroes, merges them up, and puts them back where they help most.

**After a wave.** Aiko fell in the fifth wave, but the party won it. She is back on the bench with her bar half full and a bandage
mark. The tray's **Remedies** pocket holds two Bandage Rolls and a Healing Draught brought from camp. A tap on the draught, then on
Aiko, and she is at 100% for the boss.

---

## 1. Seven slots

| Slot | Code id | What goes there | Wear a wave | Score it leans to |
| --- | --- | --- | --- | --- |
| Head | `head` | helms, hoods, circlets, masks, crowns, spectacles | half | WIS, INT, CHA |
| Torso | `torso` | armour, robes, cloaks, harnesses | 1 (+1 if the hero falls) | CON, DEX |
| Right hand | `main` | the weapon: swords, axes, maces, spears, bows, guns, staves, wands | 1 | STR, DEX, INT |
| Left hand | `off` | shields, tomes, orbs, quivers, lanterns, instruments, parrying daggers, idols | 1 | CON, WIS, INT |
| Feet | `feet` | boots, sandals, greaves, sabatons | half | DEX |
| Belt | `belt` | belts, girdles, sashes, bandoliers, pouches, vials | half | CON, STR |
| Accessory | `acc` | rings, amulets, pendants, charms, feathers, shards | half | any |

- **Any hero wears any piece.** A piece made for a calling is stronger on that calling, as today (`CALLING_BONUS` x1.25).
- **No two-handed rule.** A bow's left hand is a quiver and a staff's an orb, so every hero fills all seven slots. (Question 1.)
- **The quiet slots wear at half.** Head, feet, belt and accessory are not struck or swung, so they lose half a point a wave (kept in
  halves, as auto-replay is now). This keeps upkeep in hand with seven pieces instead of three (see the economy).
- **Stats.** Each slot has its own lean. The right hand gives attack, speed, crit and reach. The torso gives health, defence and AC
  (through the dodge shares, as [stats-4.md](stats-4.md) made them). The left hand gives defence, skill charge and resist. The head
  gives skill charge, resist and the ability scores. The feet give move speed, dodge and jump (a new main stat, `jump`, whole steps,
  at most +1 from gear, read by `canStep`). The belt gives health, regen and the potion bonus (remedies heal more). The accessory gives
  crit, score points and the odd unique line.
- **One knob keeps a kit modest.** `MAIN_SCALE` is split by slot (`SLOT_SCALE`), so a full seven-piece kit of a grade is worth what
  the balance targets say (section 9), not 7/3 of today's.

### Where today's 60 bases go

Every base keeps its id, name, grade, item level, wear, ability and Mythic name. Only its slot in the catalogue changes.

| New slot | Today's bases that move there | New bases |
| --- | --- | --- |
| Right hand (30) | the 19 weapons: Iron Sword, Runed Blade, Claymore, Frostbrand, Moonlit Katana, Dragonbone Axe, Headsman's Axe, Spiked Mace, Stonebreaker Maul, Ashen Spear, Vampire Fang, Reaper's Scythe, Iron Knuckles, Hunter's Bow, Sunfire Longbow, Ironwood Crossbow, Blunderbuss, Stormcaller Staff, Ember Wand | 11 |
| Left hand (30) | Grimoire (a weapon today), Scrying Orb, Healer's Lyre, Warlord's Drum, Silver Bell, Stone Idol, Scholar's Scroll | 23 |
| Torso (30) | the 20 armours | 10 |
| Head (30) | Silver Circlet, Seer's Spectacles | 28 |
| Feet (30) | Boots of Haste | 29 |
| Belt (30) | Vial of Vigor, Swiftness Elixir | 28 |
| Accessory (30) | Lucky Charm, Iron Ring, Phoenix Feather, Ember Amulet, Moonstone Pendant, Sapphire Ring, Ruby Ring, Emerald Band, Relic Shard | 21 |

60 kept + 150 new = 210.

### What the 30 in a slot are

Each slot has **3 named legends**, **12 set pieces** (sections 2 and 3) and **15 ordinary bases**. Every base has its own main-stat
profile, an ability from Epic up and a Mythic name, as the 60 do now. The ordinary bases cover every calling and play style, so a
hero with no set still has real choices. Examples by slot (the full list of names is written in batch 1, in `equipBases.ts`):

- **Head:** Iron Kettle Helm, Ranger's Hood, Sallet of the Watch, Oni Mask (fear on a crit), Sage's Circlet, Plague Doctor's Beak (resist,
  cleanses), Horned Helm (charge stuns), Crown of Thorns (reflects), Feathered Cap (dodge), Monk's Headband, Tinker's Goggles (reach for
  guns), Witch's Hat (curse), Great Helm (AC), Laurel Wreath (rally), Veil of Mourning (stealth at the start).
- **Left hand:** Buckler (parry: every 4th blow taken is turned), Kite Shield, Tower Shield (guard), Spiked Targe (counter), Quiver of
  Barbs (bleed), Hunter's Quiver (attack speed for shooters), Lantern of Wardens (reveals the unseen), Prayer Beads, Tome of Embers,
  Parrying Dagger, Bone Fetish (curse), Crystal Focus (charge), Signal Horn (haste the line), Hand Mirror (reflect a skill), Bladed Fan.
- **Torso:** Brigandine, Padded Gambeson, Wanderer's Coat, Wyvernhide Jerkin, Inquisitor's Robe, Tidewalker's Wrap, Coat of Plates,
  Moss-Woven Cloak, Battle Kimono, Night-Silk Vest.
- **Feet:** Leather Boots, Iron Greaves, Wading Boots (no slow in water), Climber's Boots (+1 jump), Sabatons, Soft Slippers, Ironshod
  Boots (knock back), Sandals of the Road, Fur Boots (resist cold), Spurred Boots (charge), Tabi, Ember Treads (burning path),
  Windborne Sandals, Bog Striders, Stilt Boots (reach for spears).
- **Belt:** Leather Belt, Girdle of Strength, Alchemist's Sash (remedies heal 25% more), Bandolier (gun reload), Herb Pouch (regen),
  Coin Purse (run gold), Champion's Belt, Rope Cord, Studded Girdle, Sash of the Dancer, Flask Belt, Monk's Obi, Sapper's Belt (blasts on
  death), Wolf-Pelt Belt, Gambler's Belt (crit, and run gold for a crit kill).
- **Accessory:** Bone Ring, Sun Brooch, Signet of the Keep, Owl Feather, Hag Stone, Wishbone, Locket, Silver Anklet, Black Pearl, Tooth
  Necklace, Mourning Ring, Lodestone, Prayer Knot, Opal Eye, Thief's Ring.

---

## 2. Sets

**14 sets, 84 pieces.** Five sets have seven pieces (one in every slot), four have six and five have five. A set is counted by base,
whatever the grade, as today. Bonuses come at **2 pieces, 4 pieces and the full set** (5, 6 or 7), each tier keeping the ones below.

- **2 pieces:** a plain stat bonus, about one Rare piece's worth.
- **4 pieces:** a signature ability (from `equipFx.ts`), strength 0.7.
- **Full set:** a **set power** that changes how the hero plays. These are new rules, one each, written in `setPowers.ts` and run by
  the fight like the abilities. A seven-slot hero can wear one full set of five plus a 2-piece of another, or a full six or seven.

| Set | Pieces | 2 pieces | 4 pieces | Full set: the power |
| --- | --- | --- | --- | --- |
| **Winter Court** | 7 | +8% skill charge | a crit freezes the foe | **Long Winter**: the first skill each fight freezes every foe within 2 tiles for 2 s; a frozen foe struck by a crit shatters for 20% of its max hp (not a boss: 8%). |
| **Stormcaller** | 7 | +10% skill charge | every 4th blow chains lightning | **Eye of the Storm**: chains leap to three more foes, each leap gives 4 skill charge, and skills cost 20% less. |
| **Vanguard** | 7 | +1 defence, +4% hp | foes struck may be taunted | **Last Wall**: blows aimed at an ally beside the wearer are taken by the wearer instead, at 40% less. The front line holds. |
| **Radiant Order** | 7 | mends 0.3% hp a second | an aura mends allies beside it | **Dawnbringer**: once a fight, when an ally would fall, the wearer gives it a third of its own hp and both get a shield of 20% of max hp. |
| **Wyrmblood** | 7 | +5% hp, +4% resist | attackers burn | **Dragon's Heart**: below half hp the wearer turns draconic: +25% attack and a cone of fire on the foes ahead every 5 s. |
| **Nightblade** | 6 | +4% dodge | blows heal | **Shadow Dance**: after a kill the wearer steps unseen behind the furthest foe in 4 tiles and strikes a crit. |
| **Shogun** | 6 | +4% attack, +3% hp | a crit makes the foe bleed | **Thousand Duels**: the wearer challenges the strongest foe it can reach; the two fight only each other, and the wearer deals it 30% more. |
| **Gravewalker** | 6 | +4% attack, +4% resist | a kill heals | **Army of the Dead**: a foe the wearer kills rises once as a skeleton fighting for the heroes for 8 s (two at once at most). |
| **Scholar of Ash** | 6 | +8% charge, +4% resist | steady charge | **Echoing Word**: every third skill the wearer casts is cast again at half strength. |
| **Emberforged** | 5 | +5% attack | blows set foes alight | **Pyre Walker**: the wearer's skills leave the tiles they hit burning for 4 s; burning foes take 20% more from the wearer. |
| **Hunter's Kit** | 5 | +4% crit | reach +1, bleeding shots | **Wild Hunt**: the first shot each fight marks the strongest foe; every hero deals it 20% more, and the mark passes on when it dies. |
| **Windrunner** | 5 | +6% move, +3% attack speed | haste at the start | **Tailwind**: the wearer and allies beside it move 30% faster, and its first blow of a fight is a dash from up to 3 tiles away. |
| **Tidecaller** (new) | 5 | +6% hp, no slow in water | blows slow | **Undertow**: blows pull the foe one tile towards the wearer; on a water tile the wearer mends 2% hp a second. |
| **Peakwarden** (new) | 5 | +1 jump | +10% damage from higher ground | **King of the Hill**: from higher ground every blow knocks the foe back a tile and stuns it for 0.5 s. |

- **Today's twelve sets keep their names, colours and pieces.** Each gains new pieces in the new slots (Windrunner grows from 2 to 5).
- **The 3-piece tier becomes the 4-piece tier**, with the same ability. A hero wearing a full old set today (3 pieces) would drop to
  the 2-piece tier, so the migration **gives that hero a Common fourth piece of the set** in an empty slot. Nothing it had is lost.
- **Equip best** (`bestFor`) already scores sets with the pieces. With seven slots and 30 bases a slot it cannot try every combination,
  so it searches by set: for each set the hero could reach 2, 4 or full in, it fills those slots with the best pieces of the set and
  the rest with the best ordinary pieces, then keeps the best whole. A slot still changes only when the whole is better.
- **The panel** shows the sets worn as bars of pips (lit for each piece worn), each tier's line lit or greyed, and on a spare piece in
  the picker "Winter Court: 4 -> 5 of 7".

---

## 3. Named legends

**21 named legends, three a slot.** A legend is one fixed piece with its own name, painting, story and power. It is always Legendary
grade and cannot be combined or bought. Each comes from one place in the game, so finding it is an event. A save holds one copy of
each. A legend has **renown**: the waves it has fought. At 25, 100 and 300 waves a new verse of its story opens on its page and its
power grows one step (0.6, 0.75, 0.9). It never counts towards a set.

| Slot | Legend | Its story (the first verse) | Its power | Where it is found |
| --- | --- | --- | --- | --- |
| Head | **Crown of the Last King** | Worn by the keep's last king the night the walls held. It has never been cleaned. | Allies within 2 tiles get +1 AC; when the wearer falls, every ally is rallied. | The Golem Forge's first Mythic clear |
| Head | **Mask of the Laughing Fox** | A trickster's mask that laughs on its own when a lie is told near it. | At the start the wearer and one ally are unseen for 3 s; a blow from unseen is a crit. | The Kitsune's lost technique chain |
| Head | **Helm of Seven Winters** | Forged in a winter that lasted seven years. The steel is still cold. | Immune to slow and freeze; foes that strike the wearer are slowed. | The spire's act 7 guardian |
| Torso | **The Ferryman's Coat** | The ferryman took coins from the dead. This is what he wore while he waited. | Once a fight the wearer refuses death and stands at 30% hp, unseen for 2 s. | The Calamity's third map boss |
| Torso | **Wyrmhide of Vaelkhar** | Cut from the great wyrm's own scales after its fall. It is warm to the touch. | +3 AC; fire and burning heal the wearer instead of hurting it. | Vaelkhar's heart, first time |
| Torso | **Aegis of Saint Odile** | A nun held a bridge alone in this mail for a day and a night. | The wearer takes a third of every blow aimed at the weakest ally. | A Mythic Undead Legion clear |
| Right hand | **Last Light** | A lantern-blade carried out of the first keep as it burned. It has never gone out. | Blows burn; each kill makes the wearer's next skill free. | The Infernal Host's first Legendary clear |
| Right hand | **Gravesong** | A scythe that hums the names of everyone it has cut. It is a long song. | Kills heal 6% hp and add a stack of +2% attack (to 10) for the fight. | The Last Stand, wave 40 |
| Right hand | **The Widow's Bow** | Strung with her husband's hair after the wars took him. It never misses his killers. | Shots pierce; the first shot each fight at the strongest foe is a sure crit. | A 30-day daily streak |
| Left hand | **Shield of a Hundred Names** | Every soldier who carried it carved a name. There is room for one more. | Every 4th blow taken is turned aside; each one turned gives a 5% shield. | The Ogres' first Hard clear |
| Left hand | **The Unwritten Book** | Its pages are blank until a hero reads them in battle. | Every skill the wearer casts fills 10% of its ultimate. | A Library at level 7 (Hester finds it) |
| Left hand | **Bell of Ending** | Rung once at the end of every war. Nobody wants to be the one to ring it. | Once a fight, when the last foe of a wave is under 30%, every foe is stunned for 2 s. | The Yokai's first Mythic clear |
| Feet | **Seven-League Boots** | The cobbler made them for a giant and forgot to tell the boots. | +2 jump, +20% move; the first step of a fight is a leap anywhere within 4 tiles. | The spire's act 4 guardian |
| Feet | **Ashwalker Sabatons** | Worn across the burning plain and back. The soles are still smoking. | Immune to lava and burning; leaves fire where it walks. | The Calamity's first map, ascended |
| Feet | **Slippers of the Moon Court** | Dance slippers from a court that only meets at full moon. | +12% dodge; a dodged blow gives 6 skill charge. | Hester's standing 3, once |
| Belt | **Girdle of the Giant-King** | A belt from a king who wrestled mountains. It has to be taken in a long way. | +12% hp, +2 STR; the wearer cannot be knocked back or stunned. | The Beast Packs' first Legendary clear |
| Belt | **Captain Rook's Bandolier** | A pirate's bandolier with six pockets and six debts. | Every 6th blow fires a free shot at the furthest foe for 80% of attack. | The Dread Pirate's quest |
| Belt | **The Pilgrim's Cord** | Knotted once for every shrine a pilgrim walked to. | Remedies heal 50% more on the wearer; mends 0.5% hp a second. | 100 waves won with the hero who wears it first (a quest) |
| Accessory | **Ring of Returning** | Whoever wears it always comes home. Nobody knows who made it. | A fallen wearer comes back after a won wave at full, not half. | The Wildwood's first Mythic clear |
| Accessory | **Time Witch's Hourglass** | It runs upwards. Do not ask her about it. | Once a fight, the wearer's skill cooldowns are reset. | The Time Witch's lost technique |
| Accessory | **Eye of the Gorgon** | Still looking. Keep it in the box. | Foes that strike the wearer in melee may be turned to stone for 1 s. | The Labyrinth's first Mythic clear |

Their words are drafts in British spelling; the owner can rename any. Each places in the codex's "Legends" page with its verses.

---

## 4. Gear that grows with use

- **Seasoning.** Every piece worn by a hero placed in a wave gains a point of seasoning (half under auto-replay, none while broken), as
  wear is counted now. `Equipment.xp`.
- **Levels from use.** At each threshold the piece's item level goes up by one (`seasonNeed(level) = 8 + 2 x level` waves), up to its
  grade's cap: Common 8, Rare 12, Epic 16, Legendary and Mythic 20. A piece found at level 4 that is worn for a long time ends at its cap.
  So a well-used Rare can beat a fresh Epic of a low level, and the player has a reason to keep a piece.
- **Its durability grows too** (it is the grade's plus the item level, as now), so a seasoned piece lasts a little longer.
- **The page** shows a thin gold seasoning bar under the durability bar and "Seasoned: 46 waves · Lv 9 (cap 16)".
- **Legends** use renown instead (section 3).

---

## 5. Repair, patch or enchant

Crowns are scarcer (section 6), so each worn piece asks a choice.

- **Repair** (the smith at Hester's stall): to full. Price per point `REPAIR` x 1.6: Common 0.32, Rare 0.4, Epic 0.56, Legendary 0.72,
  Mythic 0.88, times `1 + 0.04 x (level - 1)`, times `1 + 0.25 x` enchant level, less the Armoury's cut (4% a level, as now).
- **Patch** (anywhere at camp, from the piece's page): back to 60% for 40% of a repair's price, but the piece loses 2 points of
  maximum durability for good (`Equipment.scars`, at most a third of its durability). A scarred piece shows stitches on its frame.
  **Reforge** at the stall (standing 2) clears the scars for the price of a full repair from nothing.
- **Enchant** (the stall's new **Enchant** tab, standing 1): a piece takes up to three glyphs. A glyph is a small extra line, drawn
  from the slot's list (a Swiftfoot glyph on boots, a Keen glyph on a weapon, a Warded glyph on a helm...), chosen by the player from
  three offered (offered from `mixSeed(m.seed, ENCHANT_SALT, piece id, count)`, so a reload offers the same three). Each glyph is about
  a third of a Rare piece's main stat. Price: 300, 900 and 2,400 crowns for the first, second and third, times the grade's step
  (Common 0.5 to Mythic 2). **The cost of power:** each glyph makes the piece wear 20% faster and its repairs 25% dearer.
  Glyphs can be cleared for free (the crowns are not returned).
- **Broken pieces** still give nothing and are never destroyed, as now. Nothing repairs itself. Start is never blocked.

---

## 6. The economy

The owner's ask: crowns more valuable, prices up, repairs much dearer, gear harder to get. **Income is not touched.** The wave and
chest crowns stay where the joint rebalance left them, so every crown buys less.

| What | Now | New |
| --- | --- | --- |
| Stall gear (`GEAR_PRICE`, Common / Rare / Epic / Legendary) | 80 / 200 / 600 / 1,500 | 200 / 550 / 1,600 / 4,000 |
| Books (Common / Uncommon; the traders' Rare) | 350 / 900; 2,400 | 500 / 1,300; 3,400 |
| Chests (bronze / silver / gold) | 400 / 1,500 / 6,000 | 600 / 2,400 / 9,000 |
| Repair per point (Common to Mythic, item level 1) | 0.2 to 0.55 | 0.32 to 0.88 (x1.6), plus 25% a glyph |
| Pieces worn by a hero | 3, all wearing 1 a wave | 7, four of them at half (5 points a wave in all) |
| Repair upkeep, a late day of play (three runs by hand, ten auto) | about 1,300 (a fifth of the day) | about 3,500 at the smith (half the day); about 2,200 if the player patches |
| Selling (`sellPrice`) | as now | as now: the stall still pays far below its prices |
| Gear in chests: bronze / silver / gold | 35% / always / always | 15% / 60% / always |
| Grade odds: silver Legendary, Mythic; gold Legendary, Mythic | 7%, 1%; 24%, 6% | 5%, 0%; 16%, 3% |
| Gear from runs | every source drops a real piece; the finds come home | **runes instead** (section 7); a boss leaves a lasting **trophy** piece 25% of the time (always on an army's first clear of a tier) |
| The stall's gear shelf | a piece a slot (3) | four pieces a day from the seven slots |

- **Standing** at Hester's still counts crowns spent, so the thresholds (4,000 and 20,000) come sooner in crowns but later in things
  bought; the levels are unchanged.
- **No crowns loop.** The existing tests (`test/stall.test.ts`) still hold: the stall's price stays at least 5 times the sale price,
  repairing never earns, and three bought pieces combined sell for less than they cost. New ones: patching then selling never beats
  selling; an enchanted piece sells for no more than a plain one (glyphs add nothing to the sale price).
- **The stash** keeps 150 spare pieces and the cart 20. With fewer pieces coming in it fills more slowly.
- **Today's owned pieces** keep their item level, grade and wear. To soften the change, the update mends every owned piece once for
  free ("Hester's welcome: everything mended").

---

## 7. Runes (in place of the in-run equipment)

Runes are carved stones that a hero sets in its three **sockets** for one run. They are the run's only gear. They merge two into one
of the next level, as King God Castle's equipment does, but the kinds, numbers and look are our own.

### The eight kinds

| Rune | Colour and glyph | What one gives at level I | Level V flourish |
| --- | --- | --- | --- |
| **Ember** | red, a flame | +4% attack | blows burn for 2 s |
| **Bulwark** | iron grey, a tower | +1 defence, +5% hp | the first blow each wave is turned aside |
| **Arcana** | violet, an eye | +5% skill power (skill damage and healing) | skills cost 10% less |
| **Gale** | green, three lines | +4% attack speed, +4% move speed | haste for 3 s at the start |
| **Hawk** | gold, a feather | +3% crit chance, +10% crit damage | a crit gives 5 skill charge |
| **Wellspring** | blue, a drop | mends 0.2% hp a second, +5% healing received | a heal over 20% of max hp also shields 5% |
| **Warding** | white, a shield-knot | +1 to saving throws, +5% resist | the first lay each fight is shrugged off |
| **Keystone** | black with a gold rim | nothing on its own | it cannot be socketed |

- **Levels I to V.** A rune's strength by level is x1, x2, x3.5, x5.5, x8 of level I (`RUNE_LEVEL`), times one knob, `RUNE_SCALE`, set in
  the balance pass. So an Ember V is +32% attack, about what a found Legendary weapon gives in a run now with its field boost.
- **The Keystone** is the rare wild rune. Dropped onto any rune of its own level it merges as a twin, so an Ember III and a Keystone III
  make an Ember IV. It is never worn. It drops about one in fifteen runes and from bosses.
- **Skill power** is a new number on the boost (`EquipStats.skillPow`), read where the skills already scale by strength. Arcana is the
  staff of the owner's list.

### Getting runes

All runes come from a side stream, `mixSeed(run.seed, RUNE_SALT, stage, source, n)`. Every place that now calls `findGear` keeps
drawing its one number from its own stream, so events, relics and foes play out the same.

- **Every won wave:** one rune of level I (the kind from the side stream; a Keystone 1 in 15).
- **A boss wave:** two runes, one of them level II; the first clear of a tier adds a Keystone II.
- **The spire and the Calamity:** a plain floor one rune, an elite one of level II, a guardian or map boss two of level II.
- **The road** (events, the merchant, the passing cart, the mystery rooms): what sold or gave a piece of gear now sells or gives runes.
  The merchant sells two runes (level I 25 gold, level II 60, plus 2 a stage), and the crossroads forge becomes the **rune-carver**: for
  gold, raise one rune a level, or recarve it to another kind of the same level.
- **The Last Stand** has no runes, as it has no gear finds now.

### Wearing, removing and merging

- **Three sockets a hero.** At most three runes a hero, any mix (three Embers is allowed). No gear, relic or talent changes the cap.
- **Worn by kind**, like the run's finds now (`run.runes.worn[kind]`), so a hero merged or recycled in a classic run keeps its runes
  on its kind. A guest has its own three.
- **The bag** holds 8 runes not worn. When a ninth comes, it merges at once with a twin if one is in the bag; otherwise the lowest-level
  rune in the bag is broken for 5 gold, and the wave card says so.
- **Between waves only.** Runes are set, taken off and merged on the deploy screen, never during a fight. Taking one off is free.
- **Merging:** two runes of the same kind and level (or one and a Keystone of that level) make one of the next level. The pair can be
  anywhere: both in the bag, one worn and one in the bag, or worn by two heroes. The new rune goes where the rune it was dropped on
  was. A level V does not merge further.
- **At the run's end** runes are gone. They are the run's, not the save's. (Question 5.)

### Showing who wears what

The owner asked for a way to see at a glance who wears which rune, so the player knows what to pull off and merge.

- **Sockets over every hero.** On the deploy screen each hero, on the bench and on the board, has three small diamond sockets over its
  head: empty is a dark outline, a rune is its colour with the level as a pip count (I to V). They are big enough to read at 393 px
  and hidden during the fight.
- **Twins glow.** Any rune with a twin somewhere (same kind and level, worn or in the bag, or a Keystone of its level) gets a gold
  rim and a small "2" badge, on the hero's sockets and in the tray. With reduced motion the rim does not pulse.
- **The rune tray.** The **Runes** button (with "2 merges" on it when there are any) opens a tray from the bottom, like the pack now:
  - one row per fielded hero: portrait, name, its three sockets, and the total it gets ("+12% attack, +5% hp");
  - the bag: eight cells;
  - **Merge all** and **Auto runes**;
  - the remedies pocket (section 8).
- **Drag to do it.** Drag a rune onto an empty socket to set it, onto a full socket to swap (the old one goes to the bag), onto the bag
  to take it off, or onto its twin to merge. A merge plays a short spark and the new rune's level count. **Tap to do it** too: tap a
  rune, the places it can go light up, tap one. This is needed for one-handed play.
- **Merge all** merges every pair it can, highest level first, taking runes off heroes as needed. Each result goes back to the hero
  that wore the rune with the most use, or to the bag if neither was worn.

### What Auto does

`autoRunes(run, kinds)` in `runes.ts`, pure, used by the **Auto runes** button, by auto-replay before every wave, and by the balance bot:

1. Merge everything that merges (Merge all), Keystones last, on the kind most worn.
2. Rate each fielded hero for each rune kind by its role: a front-liner (heavy armour, a melee calling, a taunt or guard in its kit)
   wants Bulwark, Ember, Warding; a shooter Hawk, Gale, Ember; a caster Arcana, Hawk; a healer Arcana, Wellspring. The rate is the
   hero's stat gain from the rune times its role weight (`RUNE_ROLE`).
3. Hand out the runes best first, strongest heroes first, at most three a hero; a rune moves off a hero only when the new place rates
   higher by a tenth.
4. Never changes the runes in hand play unless the button is pressed.

### Old runs

A run saved before runes (no `run.runes`) finishes on its rules, with its found pieces in the seven slots (a trinket goes to the slot
its base now has). A run started after gets runes and no finds.

---

## 8. Wounds and remedies

### A fallen hero comes back at half

- **After a won wave**, a hero who fell stands again at **50%** of its hp (`REVIVE_SHARE`) for the next wave. Heroes still standing
  are whole, as now. (Question 2 asks about carrying the survivors' wounds too.)
- **After a lost wave** with hearts left, the wave is fought again with everyone whole, as now: the heart is the price.
- Kept as `Run.wounds` (roster id to share of hp); a fight starts each hero at that share, as the spire already does
  (`battle.ts`'s start share). A hero not listed is whole.
- **The spire and the Calamity** keep their own wounds (`FALLEN` 25%, campfires), and remedies work there too. (Question 3.)
- **The page:** a wounded hero's bar on the bench is part filled with a bandage mark, and the wave card says "Aiko stands again at half."

### Remedies

Lasting items bought with crowns, carried into a run and used between waves (in the spire and the Calamity, between fights).

| Remedy | What it does | Price | Where |
| --- | --- | --- | --- |
| **Bandage Roll** | one hero +30% hp | 60 | the stall (standing 1), bronze chests (1 in 3) |
| **Healing Draught** | one hero +60% hp | 180 | the stall (standing 1), silver chests |
| **Camp Stew** | every hero in the squad +25% hp | 320 | the stall (standing 2) |
| **Phoenix Ash** | one hero to full, and +10% max hp for the next wave | 500 | the stall (standing 2), gold chests, first clears |
| **Elixir of the Keep** | every hero in the squad to full | 1,400 | the stall (standing 3, one a day), Mythic clears |

- **The satchel.** A run takes up to **5 remedies**, at most **1 Elixir**, chosen on the party screen before Start (the last choice
  is remembered). Unused ones come home. In a run, a remedy is used from the rune tray's pocket: tap it, then tap a hero (or tap Use
  for the squad ones).
- **The stall** gets a **Remedies** shelf: a daily stock (four Bandages, two Draughts, then the better ones by standing), priced as above.
  Remedies sell back for a fifth.
- **The daily** gives one Bandage Roll for a clear; the Last Stand none (it has no waves to heal between).
- **The Alchemist's Sash** and **the Pilgrim's Cord** make remedies heal more on their wearer.
- **Auto's use.** Auto-replay uses remedies only if **Auto may use remedies** is on (off by default; a switch on the party screen).
  Then before a wave it heals any hero under 50% with the cheapest remedy that brings it to at least 75%, saves the Phoenix Ash and the
  Elixir for a boss wave, and never buys. (Question 6.)
- **The run's cart potions** (Draught of Iron, Fire Tonic, Quicksilver for run gold, a boon for one fight) stay as they are.

---

## 9. Data shapes

All new save fields are optional; the save version is not bumped. The sim stays deterministic: nothing new draws from a fight's streams.

```ts
// equipBases.ts / equipment.ts
export type EquipSlot = 'head' | 'torso' | 'main' | 'off' | 'feet' | 'belt' | 'acc';
export const EQUIP_SLOTS: readonly EquipSlot[] = ['head', 'torso', 'main', 'off', 'feet', 'belt', 'acc'];
export const QUIET_SLOTS: readonly EquipSlot[] = ['head', 'feet', 'belt', 'acc'];   // wear at half
export interface Base { id; name; mythic; slot: EquipSlot; icon; calling?; main: Main; ability; legend?: LegendDef }
export interface Equipment {
  id: number; base: string; rarity: Rarity; level: number;
  wear?: number;          // points lost (as now; halves allowed)
  found?: number;         // an old run's find (kept for old runs)
  xp?: number;            // seasoning: waves fought (halves allowed)
  renown?: number;        // a legend's waves
  scars?: number;         // max durability lost to patches
  glyphs?: string[];      // up to 3 enchant ids
}

// gearSets.ts
export interface GearSet { id; name; colour; pieces: readonly string[]; two: SetTier; four: SetTier; full: SetTier & { power: string } }

// setPowers.ts (new): the 14 full-set powers, run by hooks beside equipFx's (fxBlow, fxStruck, fxKill, fxStart, fxTick)

// meta.ts
interface Meta {
  gearV?: 2;                                  // the seven-slot migration has run
  equipped?: Record<string, Partial<Record<EquipSlot, number>>>;
  satchel?: Partial<Record<RemedyId, number>>; // remedies owned
  satchelPick?: Partial<Record<RemedyId, number>>; // the last satchel taken
  autoRemedies?: boolean;
  legends?: Record<string, number>;           // legend id -> the piece's id (one copy each)
}

// runes.ts (new)
export type RuneKind = 'ember' | 'bulwark' | 'arcana' | 'gale' | 'hawk' | 'wellspring' | 'warding' | 'keystone';
export interface Rune { id: number; kind: RuneKind; lv: 1 | 2 | 3 | 4 | 5 }
interface Run {
  runes?: { bag: Rune[]; worn: Record<string, Rune[]>; next: number };  // worn: up to 3 by hero kind
  wounds?: Record<string, number>;            // roster id -> share of hp
  satchel?: Partial<Record<RemedyId, number>>; // remedies taken into this run
}
export type RemedyId = 'bandage' | 'draught' | 'stew' | 'phoenix' | 'elixir';
```

New pure modules: `runes.ts` (drops, merge, sockets, `autoRunes`, `runeStats`), `remedies.ts` (the catalogue, use, the satchel, Auto's
rule), `setPowers.ts`, `legends.ts` (the 21, renown, sources), `enchant.ts` (glyphs, patch, reforge, prices). `EquipStats` gains `jump`
and `skillPow`; runes reach the fight through the same boost as the run's finds now (`runKitStats`).

## 10. Save migration

`readEquipment` runs once on a save without `gearV` and sets `gearV: 2`:

1. **Pieces:** every owned piece keeps its id, base, grade, level and wear. Its slot is the base's new slot (the catalogue does this:
   nothing in the piece changes).
2. **What is worn:** `equipped[kind].weapon` goes to `main` (the Grimoire to `off`); `armour` to `torso`; `trinket` to the base's new
   slot. If two pieces land in one slot (a hero wearing the Grimoire and the Scrying Orb), the trinket stays worn and the other goes to
   the stash. It is never sold, and the hero sheet says "Moved to your stash: Grimoire".
3. **Full old sets:** a hero wearing all three pieces of an old set gets a new Common piece of that set in a free slot, so it keeps the
   ability it had (now the 4-piece tier).
4. **Hester's welcome:** every owned piece's wear is set to 0, once.
5. **Locked ids, the cart, the Sold today shelf and the stall's stock** carry over; today's stock is redrawn the next day.
6. **A run in progress** finishes on its own rules (section 7, old runs).

Tests read a save from 0.331.0 with every combination and check that every piece is still owned, every worn piece still worn or in
the stash, and the fight stats of every kind unchanged or higher.

## 11. Balance

The rule is the joint rebalance's: **every mode back to the owner's pace**, its targets table ([joint-rebalance.md](joint-rebalance.md)),
heroes' kits first, each mode's own knobs next, global knobs last. The measurements come before and after each batch that moves a fight.

1. **Teach the tools first.** `tools/autoplay.ts` and the balance tools learn seven slots, the sets' tiers and powers, runes (drops,
   `autoRunes`, the bag), wounds and remedies (the bot packs a satchel by the save's crowns and uses Auto's rule).
   `npm run gear-balance` reads seven slots.
2. **The kit's worth** (`npm run gear-balance`): a full seven-piece kit by grade, set by `SLOT_SCALE`, worth what three pieces are now
   (Common +6% to Mythic +29% at army 1, to +36% at army 7), so a save's kit after migration is no stronger. Sets and legends on top:
   a full set's power about +6 to +10 points of win rate, never more than a Mythic piece's best; each of the 14 measured alone.
3. **Runes** (`RUNE_SCALE`, the drop rates): a run's runes should do what its finds did, so the realistic climb (`npm run balance --
   --no-tables --climb --saves 120`) reads 2.0 / 2.9 / 4.3 / 2.0 again. With finds no longer kept, the early climb gets harder; the army
   starts that run-gear raised (Undead 2.02, Beasts 2.39, Wildwood 2.8) are the knobs to bring back.
4. **Wounds at half** make the later waves of a run harder. Measured with and without remedies; the armies, the daily (`npm run
   daily-rate`, 79% / 63%) and the late armies' hearts are tuned without remedies first (a player who buys none must still keep pace),
   then checked with the bot's satchel.
5. **Every mode re-measured**: the climb, the late armies' hearts (Infernal 4.3 to 5, Yokai 11 to 12, Golems 6.6 to 8), Mythic at 100,
   the single tries, a fresh party's first wave (about 1 in 400), the daily, the Last Stand's medians (4 / 9 / 15 / about 25), the
   Calamity (about 1.8 maps), the spire (82.7 / 89.3 floors), Voltara's trial; hero parity within 6 at levels 1, 10, 30 (no gear in the
   yardsticks, so unchanged).
6. **The economy** (`tools/econ/day.mjs`, new): a modelled day of play at army 1, 3, 5 and 7, crowns in against prices, repair upkeep
   and remedies, so the owner sees what a day buys before and after.
7. The identity fixtures move only for the run modes (runes) and the modes with wounds, re-recorded by the tests' own computation.

## 12. Art

The rule: **pack sprites first, then generated paintings in batches**.

| What | How many | Source |
| --- | --- | --- |
| Today's 60 bases | 60 (and their 60 Mythic paintings) | kept as they are (`art-source/gear/`) |
| New bases | 150 | one painting each; a Mythic is the same painting with the Mythic glow frame (not a second painting; question 8) |
| Legends | 21 | their own painting each, a little grander |
| Runes | 8 stones | one painting each; the level is the frame and pip count, drawn in code from one frame painting |
| Rune frames and the merge spark | 5 frames, 1 spark sheet | generated |
| Remedies | 5 | generated |
| Set emblems | 14 (12 exist as colours; they get emblems) | generated |
| Empty slot outlines for the doll | 7 | generated, plain line-art |
| The paper doll's backing, the Enchant tab's glyph stones | 1 + 3 | generated |

1. **Packs first.** Look through `hpatter9/chronos-assets` (cloned next to this repo) for helmets, shields, boots, belts, rings and
   potions that suit the painted set. The DawnLike tiles do not match the paintings, so a pack sprite is used only if it fits the
   painted style; the audit's sheet (`tools/gear/pack-audit.mjs`) shows each candidate beside a painting for the owner's eye.
2. **Then generated**, through the connected OpenAI image API (`api.openai.com`, the proxy adds the key), by a tool
   `tools/gear/gen-icons.mjs`: one prompt a piece from its name, slot and a line of look ("a kite shield, oak and iron, a white swan
   painted on it"), with the house prompt from [gear-art-prompt.md](gear-art-prompt.md) and two of the existing paintings as the style
   reference. 1024 x 1024 with a transparent background, cut to 256 x 256 by the existing `import-gear-icons.py` (stray bits,
   re-centring, atlases).
3. **In batches of about 20**, a slot at a time (head first: it has the fewest today). Each batch ends with a contact sheet
   (`--contact`) for the owner; a painting that fails is regenerated with its note. About 190 paintings, about 10 batches.
4. Everything used is copied into `src/art/` and the atlases (bundled, so offline play holds; any new file loaded by URL goes into
   `build.mjs`'s `FILES`). Credited in `CREDITS.md`: the generated ones as made for this game.

## 13. The build, in batches

Each batch is its own branch, with its tests, its note in `docs/notes/`, and screenshots at 393x852, 360x780 and 412x915 for page
changes.

| Batch | What | Tests |
| --- | --- | --- |
| 1. Seven slots | the catalogue (210 bases, the slot leans, `SLOT_SCALE`), `jump`, the migration, Equip best by set, the paper doll with placeholder icons (the slot outline and the base's word) | `gear-slots.test.ts`: the catalogue, every base a slot and a profile; old saves (every case of section 10); Equip best; fights of an unmigrated kit unchanged |
| 2. Sets and legends | 14 sets with 2 / 4 / full, the 14 powers (`setPowers.ts`), the 21 legends and renown, their sources, the codex's Legends page | `set-powers.test.ts`: every power fires in a small fight and is deterministic; `legends.test.ts`: sources, one copy, renown steps |
| 3. Growth, repair, patch, enchant, prices | seasoning, patch and reforge, the Enchant tab, the new prices and chest odds, the welcome mend | `wear.test.ts`, `stall.test.ts` extended: seasoning caps, patch scars, glyph prices and wear, the no-loop inequalities |
| 4. Runes: the rules | `runes.ts`, drops in every source (the stream rule), merge, the bag, the cap, `autoRunes`, the run's end; finds stop (trophies stay); old runs | `runes.test.ts`: streams unchanged, merging and Keystones, the cap of three, the bag, Auto, old runs finish on their rules |
| 5. Runes: the page | the sockets over heroes, twin rims, the tray, drag and tap, Merge all, Auto runes, the wave card's lines | `runes-page.test.ts` for the pure helpers; screenshots |
| 6. Wounds and remedies | `Run.wounds`, `REVIVE_SHARE`, `remedies.ts`, the satchel, the stall shelf, Auto's rule and switch, the bench's bars | `wounds.test.ts`, `remedies.test.ts` |
| 7. Art | the pack audit, then generated batches; each merged as its batch passes the owner | the importer's checks; every base has an icon |
| 8. Balance | section 11, every mode, the economy model | the pace tests on their own seeds, the identity fixtures re-recorded |

Batches 1 to 3 can ship before runes; 4 to 6 belong together (runes replace finds, and the wounds' balance needs both); 7 runs
alongside from batch 1.

---

## Questions for the owner

1. **Two-handed weapons.** Should a bow, a staff or a great sword fill the left hand too? **Recommended: no.** Every hero fills all
   seven slots (a bow's left hand is a quiver), which is simpler and gives more choices.
2. **The survivors' wounds.** You asked for the fallen to come back at half. Should heroes still standing also carry their wounds to
   the next wave? **Recommended: no, they stay whole as now.** Carrying every wound makes armies much harder and remedies a must.
3. **The spire and the Calamity.** They already carry wounds, with the fallen at 25% and campfires. **Recommended: keep their 25%**;
   their campfires were tuned to it, and remedies now work there too.
4. **How dear is upkeep?** Planned: repairs at x1.6 a point with seven pieces, about half a late day's crowns if everything is mended
   at the smith, about a third with patching. **Recommended: this**; x2 would be about 60%.
5. **Runes at the run's end.** **Recommended: they are gone**, like King God Castle's, so the run is the rune game and the save's
   power stays in lasting gear.
6. **Auto and remedies.** **Recommended: off by default**, with a switch "Auto may use remedies" that heals under 50% with the
   cheapest remedy and keeps the Phoenix Ash and Elixir for bosses.
7. **Lasting gear from runs.** **Recommended: runs stop bringing pieces home**, except a boss's trophy (25%, always on a first clear
   of a tier). This is the biggest step in "harder to get", and the early armies' starts come back down to keep your pace.
8. **Mythic art for the new bases.** **Recommended: one painting a base, with the Mythic glow frame for Mythic**, and a painting of
   their own for the 21 legends. That is about 190 paintings instead of about 340.
9. **The legends' names and sources.** **Recommended: approve the 21 as drafts**; any you want renamed or moved can change in batch 2.
10. **Old full sets.** **Recommended: give the gifted Common fourth piece**, so no hero loses the ability it has today.
