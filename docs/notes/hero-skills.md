## Hero skills and passives

Each hero has a skill that fires on its own when its charge fills, and an always-on passive. All of it is data in
`src/sim/abilities.ts` (`KITS`), with one `cast` function per skill; `battle.ts` calls it through `tryCast` (when a
free hero decides), `onStrike` (before any damage), `afterBlow` and `tickStatus` (every tick).

**Charge** (0 to `CHARGE_MAX` 100): a blow dealt, a blow taken (a splash blow does not count) and each second give the
amounts in the hero's `skill` entry. A full charge waits if the skill has nothing to hit. Casting makes the hero busy
for `castMs`. Randomness for crit and dodge is a side stream, `b.skillRng`, so the main fight stream is untouched.

| Hero | Skill | Passive |
| --- | --- | --- |
| Knight | Shield Wall: foes within 3 tiles must go for him for 4s; he takes half damage | Stout Shield: blows from the front lose a quarter |
| Samurai | Iaido: dashes up to 4 tiles in a line, cutting every foe on it, landing on the last free tile | Keen Edge: 15% of blows crit x1.6 and make the foe bleed |
| Kunoichi | Shadow Step: blinks behind the weakest foe, backstabs for x1.8 atk | Evasion: slips 20% of blows |
| Archer | Volley: after 0.7s arrows land on a 3x3 (the spot with most foes in reach) | Eagle Eye: `heightReach` 1.4, twice the reach bonus from height |
| Fire Wizard | Meteor: after 1.1s a blast on a 3x3 (within 6 tiles), leaving it burning 4s | Cinders: its blows burn the foe (3 every 0.5s for 2s) |

New events: `skill`, `dash`, `blink`, `area` (a volley or meteor on its way), `zone` (burning ground), `dodge`; `hit`
now has `src` (`blow`, `skill` or `dot`). `fx.ts` shows them with the existing hit, fire and blast sheets and the
arrow; `unitView.ts` plays the sheet's `attack2` or `defend` row for a cast (plain `attack` where a sheet has
neither), rings a guarded fighter, tints a burning or bleeding one, and draws the charge bar under the health bar
(gold and flashing when full).

**Balance.** Hero hp was cut by a quarter to make room for the kits, with small stat tweaks to set them apart (knight
slower and tougher, kunoichi faster and lighter). With `readyBattle` the heroes win 29 of 40 fights (26 before).
Tests: `test/abilities.test.ts`.

**Ultimates.** Every hero also has an ultimate, a second and bigger skill on its own meter, unlocked at level 30 (it was 15; see below): see `ultimates.md`.


---

# Tier skills, combos and spectacle (the owner's notes on hero skills)

Everything below is one branch (`claude/hero-skills`). Rules kept: the sim is deterministic (no new draw from the main stream; nothing here draws from any stream at all), no flashing (one-shot
blinks only, at most 0.35 alpha for 110 ms, the settings' shake switch and the device's reduced motion turn the dimming, flashes, slow motion, freeze frames and camera pushes off), text at
12px multiples and never bold in everything new, whole-number scales (the promotion's pop moves in quarter steps), the packs' art only (the Pixel Effects strips already in the atlas, and the MV
animals' wolf), nothing loaded by URL (so no change to `FILES`: the wolf sheets are bundled into `game.js` like every other sheet).

## 1. Ultimates unlock at level 30

`ULT_LEVEL` is 30 (it was 15), for all 45 heroes. A hero kind's lasting level goes to 100 and a run's own level (the spire, the Calamity) to 30, so a run's hero reaches it at the cap. The sheet and the
codex say "Unlocks at level 30." (the codex now says it too; it did not), and a result screen's level-up chip says "Ultimate unlocked" when a hero crosses it.
**Balance at level 30** (`npm run balance -- --heroes-only --hero-level 30 --hero-stage 39`; the test is `hero-balance-ultimates.test.ts`, moved to level 30, stage 39, where a team wins
about two in five): every hero within 4 points of the average (spread 34.4% to 41.5%, average 37.9%). No `TUNE` number changed: the ultimates move the table so little that the old numbers still hold (at stage 38 the Time Witch was 4.2 out, from her skill and passive, and no meter speed moves her, so the test sits at stage 39).
The ultimates fire only in the longer fights (the meter is `ULT_RATE` 0.45 of the skill's), so at level 30 they decide little of a hero's lift: its own skill and passive do.

## 2. Tier 2 and tier 3 skills (`src/sim/tierSkills.ts`)

A hero merged to grade 2 or 3 casts a named, better version of its skill, shown as "Tier 2 · Name: text" and "Tier 3 · Name: text" on the hero's sheet and in the codex. It is all data, `TIER_SKILLS`
(45 heroes, two entries each; a tier 3 entry is the whole of tier 3, it replaces tier 2's), read two ways:

- **`mods`**: talent-style modifiers (`pow`, `dur`, `reach`, `extra`, `castHeal`, `castShield`, `castHaste`, `refund`, `skillStun`, `skillSlow`: the keys of `talents.ts`). They are merged into the
  hero's `eq.tal` when it joins the fight (`applyTierMods`, called by `addUnit` for a hero with a grade; it copies the equipment object, which is shared between fights), so every skill reads them
  exactly as it reads a talent. Where a skill makes things (volleys, meteors, wolves, treants, traps, jumps) `extra` makes one more.
- **`riders`**: extra things that happen when the skill goes off (`runRiders`, called from `began`): `nova` (a ring of damage, with a short stun, round the caster), `mend`, `haste`, `ward` (a shield),
  `charge` (the friends' skill meters), `summon` (wolves, a dire wolf, decoys) and `echo` (the skill goes off again `ms` later at a share of its strength: a pending `echo`, `echoSkill`).
  A `burst` event shows a nova's ring.
- `TIER_STRENGTH` (1) is the one knob: it scales every fractional modifier and rider strength (counts and tiles are not scaled).
- `promoteUnit(unit, grade, out)` promotes a hero in the middle of a fight (it swaps the tier skill and sends a `promote` event); see section 6.

The table (the Beastmaster's is the owner's example: tier 2 two wolves at a cast, tier 3 a wolf and a great black dire wolf):

| Hero | Tier 2 | Tier 3 |
| --- | --- | --- |
| Knight | Iron Wall: Shield Wall reaches a tile further, and he is shielded | Fortress: Shield Wall reaches two tiles further and lasts longer; he is shielded and slams the ground round him, stunning the foes near |
| Samurai | Twin Iaido: Dashes a tile further, cuts harder and gives back some charge | Moon Cut: Dashes two tiles further and cuts harder; a second cut follows a moment later |
| Kunoichi | Fading Step: Shadow Step gives back some charge and hastens her briefly | Thousand Shadows: Backstabs harder, hastens her, and slips behind another foe a moment later |
| Archer | Double Volley: A second, smaller volley follows the first | Rain of Arrows: Two more volleys follow, over a wider patch, and every arrow hits harder |
| Fire Wizard | Twin Meteor: A second, smaller meteor follows the first | Meteor Shower: Two more meteors follow, and the ground burns longer |
| Peasant | Hold Harder: The line holds a little longer, and the allies near him are mended | Rally the Village: The line holds much longer, a tile wider; his allies are mended well and hastened |
| Ninja Monk | Fourth Fist: Thousand Fists lands a fourth strike | Fifth Fist: Two more strikes, a longer stun, and a burst of force round him |
| Wanderer | Brighter Sanctuary: Heals more, and shields him | Radiant Sanctuary: Heals far more, and hastens the allies near him |
| Lightning Mage | Forked Chain: The bolt jumps through one more foe | Storm Chain: The bolt jumps through three more foes and holds each briefly |
| Kitsune | Lingering Charm: Fox Charm lasts longer | Hundred Fox Fires: The charm lasts much longer, and fox fire flares round her, burning the foes near |
| Karasu Tengu | Swift Dive: Dive gives back 30 charge and strikes harder | Storm Dive: Strikes harder; a gale bursts where he lands, and a second dive follows |
| Yamabushi Tengu | Stronger Gust: The gust reaches a tile further and stuns briefly | Hurricane: The gust reaches two tiles further, hits harder and stuns longer |
| Werewolf | Savage Ravage: Bites harder and heals him a little | Blood Moon: Bites much harder, heals him well and hastens him |
| Minotaur | Heavier Charge: Charges a tile further and the foe is stunned longer | Rampage: Charges two tiles further, and charges again a moment later |
| Satyr | Livelier Pipes: The pipes last longer and reach a tile further | Pan's Frenzy: The pipes last much longer and reach two tiles further; his friends' skill meters jump by 20 |
| Gorgon | Deeper Gaze: The gaze reaches a tile further, holds longer and hits harder | Medusa's Glare: The gaze holds much longer, and every foe near her is stiffened |
| Samurai Commander | Higher Banner: The banner flies longer and reaches a tile further | Grand Standard: The banner flies much longer, two tiles further, and mends his allies |
| Paladin | Righteous Challenge: The challenge reaches a tile further and shields him | Crusader's Oath: The challenge reaches two tiles further and lasts longer; he is shielded and his allies are mended well |
| Cleric | Warm Benediction: Heals more, and for longer | Miracle: Heals far more, for much longer, and every ally is shielded |
| Druid | Grove: A second treant can stand beside the first | Ancient Grove: Her treants hit harder, and every ally near her is healed when one rises |
| Barbarian | Wide Whirl: The whirl cuts a tile wider | Cyclone: A wider whirl, a second whirl a moment later, and he heals |
| Ranger | Third Snare: Lays a third trap | Fourth Snare: Lays three more traps, and what they hold is held longer |
| Warlock | Deep Hex: The curse burns longer and deeper | Doom: The curse burns much longer and deeper, and dark force bursts round him |
| Illusionist | Longer Mirage: The decoys last longer, and she is hastened | Hall of Illusions: The decoys last much longer, two more appear, and she is hastened well |
| Gunslinger | Long Eye: The slug carries a tile further and hits harder | Dead Eye Deluxe: The slug carries two tiles further, hits much harder, and a second slug follows |
| Shambler | Thicker Rot: The rot lasts longer and heals him a little | Plague: The rot lasts much longer, reaches further, and a wave of it bursts round him |
| Rifle Bot | Fourth Round: Burst Fire shoots a fourth round | Full Magazine: Two more rounds, and 20 charge comes back |
| Mercenary | Bigger Bounty: Every cut hits harder | Gold Rush: Cuts much harder, and a second cut follows a moment later |
| Mummy | Tighter Wraps: The wraps last longer and reach a tile further | Pharaoh's Wraps: The wraps last much longer and reach two tiles further; he is shielded |
| Buccaneer | Longer Hook: The hook reaches a tile further and holds longer | Boarding Party: The hook reaches two tiles further and cuts harder; he lands with a burst of force |
| Wolf Bard | Louder Dirge: The dirge reaches a tile further and lasts longer | Chorus: The dirge reaches two tiles further and lasts much longer; his friends' skill meters jump by 15 |
| Beastmaster | Pair of Wolves: Two wolves answer each call, and up to three can stand beside him | Pack Leader: A great black dire wolf answers each call beside the wolf, and up to three wolves can stand beside him |
| Kraken Mate | Stronger Undertow: The undertow reaches a tile further and slows longer | Maelstrom Tide: The undertow reaches two tiles further, hits harder and holds each foe briefly |
| Lancer | Longer Charge: Charges a tile further and the riders are hastened | Knight's Charge: Charges two tiles further, hits harder, and charges again a moment later |
| Reaper | Keener Scythe: The scythe reaches a tile further and cuts harder | Soul Scythe: The scythe cuts much harder, a tile further, and heals him |
| Time Witch | Longer Surge: The surge lasts longer | Time Loop: The surge lasts much longer, a tile further, and her friends' skill meters jump by 20 |
| Arc Blade | Live Wire: The discharge holds longer and hits harder | Storm Blink: The discharge hits much harder and holds well, and he blinks and discharges again a moment later |
| Dread Pirate | Double Broadside: A second, smaller broadside follows the first | Ghost Armada: Two more broadsides follow, and each hits harder |
| Siege Bot | Heavier Shell: The shell hits a little harder | Twin Shells: The shell hits harder, and a second, smaller shell follows it |
| High Priestess | Brighter Light: The light heals more | Holy Radiance: Heals far more, and every ally is shielded and mended |
| Queen Dragoon | Longer Breath: The breath carries a tile further and hits harder | Dragonfire: The breath carries two tiles further, hits harder, and a second breath follows |
| Juggernaut | Heavier Quake: The quake reaches a tile further and holds longer | Titan Quake: The quake reaches two tiles further and holds well longer; he is shielded |
| Great Sage | Fourth Star: Starfall calls a fourth star | Constellation: Two more stars fall, and every ally's skill meter jumps by 25 |
| Demon Swordsman | Wider Sweep: The sweep reaches a tile further and heals him a little | Demon Sweep: The sweep cuts much harder, heals him, and sweeps again a moment later |
| Tyrant | Twin Verdicts: A second, smaller judgement follows the first, a tile wider | Tyrant's Decree: Two more judgements follow, and a wave of dread bursts round him |

## 3. The Beastmaster's wolf

The Beastmaster calls a **wolf**, not a werewolf: the grey wolf of the MV animals pack (`whtdragon`'s `animals/wolfdog.png`, in `hpatter9/chronos-assets`), cut by `tools/wolf/compose-wolf.py` into
`wolf_grey.png` (and `wolf_black.png` for grade 3's wolves and the new **Dire Wolf**, a bigger black wolf with a little more health and attack that a tier 3 Beastmaster calls beside the wolf). The
king's Wolves spell calls the same wolf. The kind's id is still `wolf` and its stats are as they were, so level-1 parity does not move. The skill reads "A wolf answers his call (two at most stand at
once)"; the ultimate "Hunt of the Pack" calls four wolves.

## 4. Five-hero combos (working name "Accord", `src/sim/combos.ts`)

Eight sets of five specific heroes (no hero is in two; `COMBOS`). When all five are placed, the fight has a combo (`Battle.combo`, set by `fight`). A bar fills while they fight: each second per hero (1.0 a second
each), each blow they deal (1.5), each blow they take (1.2) and each skill they cast (10) feed it; it is full at 100, which takes about 10 to 20 seconds of a real fight (a set of fighters that last the fight casts it about once; the sturdy Holy Order about four times). A fallen member takes its fifth of the
feeding with it, and with fewer than three standing the bar stops (the page dims it). When full, the standing members stop and cast together (1.6 s, `comboCast` event), the move lands 1.1 s later (`comboLand`),
every beat in order (`Beat`: hurt, stun, slow, burn/curse/bleed, heal, ward, haste, charge, guard, summon, charm, mend), and the bar empties and fills again. Damage is a share of the five heroes' attacks together.

| Combo | The five | Move | What it does |
| --- | --- | --- | --- |
| The Holy Order | Knight, Paladin, Cleric, High Priestess, Wanderer | Sanctum of Light | allies healed, cleansed, shielded; foes struck and held 1.5s |
| The Arcane Council | Fire Wizard, Lightning Mage, Great Sage, Warlock, Time Witch | Elemental Cataclysm | every foe hurt and burning 4s; allies shielded, skill meters +40 |
| The Shadow Clan | Samurai, Kunoichi, Ninja Monk, Karasu Tengu, Mercenary | Thousand Cuts | every foe cut and bleeding 4s; the five hasted 5s |
| The Black Fleet | Buccaneer, Dread Pirate, Kraken Mate, Siege Bot, Gunslinger | Full Broadside | every foe hurt and slowed 4s; the five shielded |
| The Wild Hunt | Beastmaster, Werewolf, Druid, Ranger, Wolf Bard | The Great Hunt | three wolves and a dire wolf rise; allies hasted 5s; foes hurt |
| The Night Parade | Kitsune, Yamabushi Tengu, Gorgon, Satyr, Illusionist | March of a Hundred Spirits | the three strongest foes turn on their own side 4s; the rest held 1.2s |
| The Iron Vanguard | Juggernaut, Minotaur, Lancer, Barbarian, Samurai Commander | Charge of Legends | every foe hurt hard and held 1s; allies take half damage 3s |
| The Dread Court | Tyrant, Reaper, Demon Swordsman, Shambler, Mummy | Reign of the Damned | every foe cursed 5s and slowed; the five drink back a little |

- **Seen and discoverable.** `Meta.combosSeen` (optional; old saves load with none) gets a combo when its move goes off (`noteCombos`, called when the fight settles and when the move starts). The codex has an
  **Accords** tab: a seen combo shows its name, five heroes and what it does; the rest are locked rows ("???") that name one hero as a hint. A hero's codex page lists the combos it is in. The deploy
  line says "Accord: The Holy Order" the moment the five are placed, so a player finds them by trying.
- **The left column.** The synergy plates are hidden during the wave (owner's note 5); a fight shows only the combo bar (`#comboBar` in `synergyView.ts`: the name, a meter, five pips that go dark as members fall;
  it dims when the bar cannot go on, blinks once when the move goes off, and a tap lists the five and what the move does). With no combo the edge is empty.
- **Spectacle** (`spectacle.ts`, `fx.ts`): the five gather in rune circles with a ring of motes running between them and the world dims (the camera leans in); the move's name is written over them (24px, regular
  weight); it lands in a nova and two rings from the middle of the five, a strike and a column of light on every foe, a white blink (one, 0.35, 110 ms), a hard shake, a beat of slow motion and a
  freeze frame. Each tone (holy, arcane, shadow, sea, wild, spirit, earth, dark) is made of three pack elements, so the eight look different.
- **Balance.** Over 160 fights each at stage 5 the eight combo teams win 75% with the move and 63% without it: the move is worth about 12 points to the team that has it (the Dread Court about 21,
  the Arcane Council none, the Iron Vanguard 16), against the cost of building a five-hero set.

**Names for the owner to pick from** (the working name is `COMBO_NAME` in `combos.ts`, the one place the page reads it from): *Accord*, *Grand Concord*, *Legend Strike*, *Fellowship Finale*, *Last Oath*, *Oathsong*.

## 5. Flashier skills and ultimates

- An **ultimate**: the camera leans in on the caster for the cast (a push of 1.2 on the caster, `Fx.takePush` and `Game.leanIn` in `main.ts`: the page owns the camera, the effects only ask), the nova ends in a
  column of the skill's element, a beat of slow motion (450 ms, `slowLeft`) and a freeze frame (70 ms), on top of the dimming, flash (one blink) and shake it had.
- An ordinary **hero skill** ends in a ring of its element (a pack wave) at the end of its wind-up.
- A **tier skill's ring** (`burst` event) is a wave and a nova of the caster's skill's element, as wide as the ring.
- All of it goes through `Particles` (pooled, capped, thinned by the battery saver's density); the slow motion, freeze frame, dim, flash, shake and camera push are all off when shake is off in the settings
  or reduced motion is on (`calm()`).

## 6. The promotion show (one call for both paths)

`Fx.promote(unitId, grade, quiet)` is the whole show; `Game.promoteHero(unitId, grade)` (also `window.__game.promoteHero`) wraps it. The sprite pops up a beat (quarter steps, tier 3 higher) and the
evolve burst plays; tier 2 rises in a ring of light with a small banner; **tier 3** adds a tall pillar of light (two, one after the other), a nova and a wave, a shower of gold sparks, one white blink, the
dimming, a short slow motion and a camera push on the hero, and a banner ("Tier 3" at 24px, the hero's name and its new skill's under it).

- **After a hire** (the merge): `syncSprites` calls it for the sprite of a hero a merge has just made (it replaced `evolve()`), `quiet` outside a fight (no slow motion or camera push in the deploy view;
  the pillar, banner, flash and dimming still play).
- **The Calamity's tier by level** (`claude/cal-roster`): call `promoteUnit(unit, grade, out)` from the sim (it swaps the tier skill and puts a `promote` event in `out`), or `window.__game.promoteHero(id, grade)`
  from the page; the page plays any `promote` event it sees (`frame` in `main.ts`), rebuilding a sprite drawn at a lower grade first. The sim does not touch stats: whoever promotes sets them (`gradeBoost` does for a hero
  placed at that grade).
- The sound: a `merge` chime (tier 3 adds the holy chime and a sparkle), through `soundRules.ts`.

## What moved in balance

(`tools/tries/run.mjs`, 30 fresh saves a cell, the bot of `tools/autoplay.ts` as in `difficulty.test.ts`; "before" is main at 0.135.0.)

| Cell (mean tries) | Before | Now |
| --- | --- | --- |
| Orc Warband, Normal, level 1 | 1.1 | 1.0 |
| The Labyrinth, Normal, level 1 | 5.2 | 4.4 |
| The Labyrinth, Normal, level 15 | 1.4 | 1.3 |
| The Labyrinth, Hard, level 15 | 16.7 | 11.1 |
| Golem Forge, Hard, level 30, with talents | 1.6 | 1.5 |
| Golem Forge, Elite, level 45, with talents | 5.7 | 3.1 |
| Golem Forge, Legendary, level 60, with talents | 7.5 | 4.9 |

The tier skills make a merged party stronger (they are the owner's ask), and the late tiers, which the bot clears with merged heroes, ease by a third to a half. Normal at level 1 is still a few tries on
the Labyrinth. If the tiers should be as hard as before, turn `TIER_STRENGTH` down (the quickest) or retune the hard tiers' foes (`tiers.ts`); `difficulty.test.ts` passes either way.
**Hero parity** (`--heroes-only`): level 1, grade 1, stage 5 is unchanged (46.0% to 58.4%, the same four heroes just past 4: Wanderer, Shambler, Siege Bot, Tyrant). At **grade 3** (`--hero-grade 3 --hero-stage 20`,
average 53%) the spread is 44% to 58%, every hero within 6 points of the average except the Samurai (-9.1; it was -9.7 before any tier skill, a weakness of its stats at high grade that the tier skill barely moves).
At **grade 2** (`--hero-grade 2 --hero-stage 10`, average 66%) the spread is 60% to 72%, everyone within 6.3 (Siege Bot) and the Samurai -5.6. At **level 30** with ultimates, see section 1.

## Tests and tools

`test/tier-skills.test.ts` (every hero has two named tier skills; the modifiers merge into a copy; the Beastmaster's wolves; an echo; the Knight's ring; a promotion mid-fight; determinism),
`test/combos.test.ts` (eight disjoint sets; the combo only with all five placed; the bar fills, the five cast, the move lands and empties the bar; each move does what it says; fallen members;
determinism; the codex's seen list), `test/spectacle.test.ts` (every strip the effects play is in the atlas; a flash is at most 0.5 and 120 ms). `ultimates`, `calamity` and `hero-balance-ultimates` moved to level 30.
`node tools/skills/shots.mjs` takes the screenshots (`docs/samples/hero-skills-*.png`, three phone sizes) and plays a full combo fight on a new save and a full fight on an old one with no page error.
`npm run balance -- --heroes-only --hero-grade 3 --hero-stage 20` is the new grade flag; `node tools/tries/run.mjs army:tier:level:talents ...` prints the armies' tries.

## For the owner

- **Pick the combo's name** (list above) and say whether the eight sets are the right ones (only the sets are data: one entry each in `COMBOS`).
- **A combo needs three of its five standing** for the bar to fill and the move to go off (a fallen member slows it); I judged "all five alive" too hard with squishy sets. One line (`MIN_ALIVE`).
- **The combos make a team about 12 points stronger** (the Dread Court about 20, the Arcane Council about 0: its squishy casters fall before the bar fills): say if they should be rarer or bigger.
- **Tier skills ease the late tiers** (table above): say if the hard tiers should be retuned, or turn `TIER_STRENGTH` down.
- The Samurai is the one hero well under the average at tier 3 (and was before); its stats, not its skills, want a look.
- The synergy plates are only hidden, not removed (`#synCol` is `display: none` in `synergyView.ts`), in case the traits' list should come back between waves.
