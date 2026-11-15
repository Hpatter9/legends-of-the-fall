# Trait perks (TRAIT-PERKS)

The owner's ask: "lets change the perks for having multiple people of a type on the field. I want them to really matter. be unique and give
amazing and varied buffs. like have 4 of an undead type means 3 skeletons rise from the grave and join you. they revive at the end of the
wave only and dont cost hearts"

Stage 1 (the design) was approved with the owner's answers:

1. Keep the 2/3/4 ladder; no fifth tier.
2. Three fresh skeletons each wave; the dead stay down until the wave ends, and none ever costs a life.
3. In assaults, the wave-start perks refresh every 60 s.
4. Pirate I's extra gold is fine.

Stage 2 built it: every trait's three tiers in the sim, the deploy screen's trait row and a card for each trait's whole ladder, the
effects and sounds, a balance pass measured by a new tool, and tests for every rule.

## What there was

`src/sim/traits.ts`. Every hero has two traits, an origin and a class (`HERO_TRAITS`). Different hero kinds count (two Knights count once).
`fight()` calls `applyTraits` (`battle.ts`), which folds every reached tier into one `TraitEffects` (`b.traits`). Attack, health and mana
are set at the start; guard, dodge, crit, speed, charge, reach and leech are read by small hooks. Four tiers have a rule of their own, each
a hook in `hurt` (`battle.ts`) or `abilities.ts`: the Guardians' Aegis, the Tricksters' decoy log, the Yokai's wisps and the Vampires' bats.
The Last Stand (`stand.ts`) and the Assault (through `fight`) apply them the same way. The daily's featured trait gets its tier again on top
(`featuredExtra`, `dailyThemes.ts`).

A party is five heroes; the Calamity's is ten. Between them, five heroes carry ten traits, so a normal party has two or three tiers awake.

| Trait | Kind | Heroes | Today |
| --- | --- | --- | --- |
| Samurai | origin | samurai, kunoichi, archer, ninjaMonk, warDrummer | 2: +1% attack; 4: +10% attack |
| Mystic | origin | wizard, lightningMage, wanderer, sage, geomancer | 2: king's mana +30%; 4: +60% |
| Yokai | origin | kitsune, karasu, yamabushi, gorgon, bellWarden | 2: slip 6%; 3: and wisps |
| Knightly | origin | peasant, knight, minotaur, samuraiCommander, banneret | 2: +5% health |
| Holy | origin | ilyra, paladin, cleric, priestess, inquisitor, seraph | 2: +8% health |
| Wild | origin | orrun, werewolf, druid, barbarian, wolfBard, falconer | 2: +5% attack; 4: +12% |
| Arcane | origin | astrax, nyxara, satyr, warlock, illusionist, timeWitch, astralSphinx | 2: pools +15%; 4: +30% |
| Frontier | origin | ranger, gunslinger, mercenary, beastmaster, mirageDancer | 2: +6% crit; 4: +14% |
| Undead | origin | shambler, mummy, reaper, dreadPirate, plagueDoctor | 2: +6% health; 4: +14% |
| Machine | origin | rifleBot, arcBlade, siegeBot, juggernaut, bombardier | 2: +3% attack; 4: +10% attack, 3% guard |
| Royal | origin | vael, lancer, dragoon, demonSwordsman, tyrant, astrologer | 2: +2% attack, +3% health; 4: +6%, +6% |
| Pirate | origin | buccaneer, kraken, corsairSurgeon, harpooner, seaReaver | 2: +5% crit, slip 3% |
| Vampire | origin | vampireLord, hemomancer, nightstalker, bloodGargoyle, dhampir | 2: leech 6%; 4: 12%, +6% attack; 5: 15%, +10%, bats |
| Guardian | class | vael, orrun, peasant, knight, yamabushi, paladin, seraph | 2: take 5% less; 3: and the Aegis |
| Blade | class | samurai, ninjaMonk, samuraiCommander, barbarian, vampireLord | 2: +10% crit |
| Marksman | class | archer, lightningMage, ranger, gunslinger, falconer | 2: reach from height |
| Caster | class | wizard, wanderer, warlock, tyrant, hemomancer | 2: pools +30%; 4: +50% |
| Warden | class | cleric, druid, shambler, mummy, banneret | 2: take 4% less; 4: 10% less |
| Trickster | class | kunoichi, kitsune, karasu, illusionist, mirageDancer | 2: +5% speed; 3: and the decoy log |
| Beast | class | werewolf, minotaur, satyr, gorgon, astralSphinx | 2: +3% attack; 4: +8% |
| Gunner | class | rifleBot, siegeBot, dhampir, bombardier, harpooner | 2: +4% attack |
| Assassin | class | mercenary, buccaneer, reaper, arcBlade, nightstalker | 2: +8% crit; 4: +16%, +3% speed |
| Support | class | ilyra, wolfBard, beastmaster, priestess, warDrummer, corsairSurgeon | 2: +4% health, pools +10% |
| Vanguard | class | lancer, dreadPirate, dragoon, demonSwordsman, seaReaver | 2: +4% speed; 4: +8% speed, +3% attack |
| Arcanist | class | astrax, nyxara, timeWitch, sage, plagueDoctor, astrologer, inquisitor | 2: mana +15%, pools +10% |
| Bulwark | class | kraken, juggernaut, bloodGargoyle, geomancer, bellWarden | 2: take 4% less, +3% health |

Most of these are a few per cent of one stat, and nine traits have only one tier. Nothing changes how a fight plays except the four
milestones.

## The ladder as built

Every trait has three tiers, at 2, 3 and 4 different heroes of it, and each tier keeps the ones below it. The flat stat bonuses are gone;
each tier is a rule of its own. The four old milestones are on the new ladder (the wisps at Yokai I, the Aegis at Guardian II, the decoy
log at Trickster II, the bats at Vampire II) and now come round once a wave. The words below are the game's own (`TRAITS` in
`src/sim/traits.ts`: each tier's name, its badge line and its whole rule); the numbers are `PERK` in `src/sim/traitPerks.ts`.

"Each wave" means each fight of a run, each wave of the Last Stand's one long fight, and each minute of an Assault. "The party's might" is
the average attack of the placed heroes as the fight begins, and "the party's health" their average health: the strikes and the
summons are sized from them, so they grow with the heroes.

### Origins

#### Undead

Heroes: Shambler, Mummy, Reaper, Dread Pirate, Plague Doctor.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Death's Door | The first blow each wave that would fell an Undead hero leaves it on 1 health instead, and nothing can hurt it for a second. | "Each Undead cheats death once a wave" |
| II (3) | Grave Rot | A foe slain within 2 tiles of an Undead hero bursts: every foe within a tile of it is poisoned. | "Foes slain near the Undead burst in rot" |
| III (4) | Rise from the Grave | At each wave's start three skeletons claw up beside the Undead: a warrior, a spearman and an archer. One that falls stays down until the wave ends; then all three rise again. They never cost a life. | "Three skeletons rise to fight each wave" |

#### Samurai

Heroes: Samurai, Kunoichi, Archer, Ninja Monk, War Drummer.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Iaijutsu | Each Samurai's first blow of a wave that lands is a crit (15% more). | "First cut of each wave: a keen crit" |
| II (3) | Way of the Duel | A Samurai that fells a foe it fought alone (no other hero beside the foe) gains a second of haste. | "A lone duel won quickens the Samurai" |
| III (4) | Death Poem | The first Samurai to fall each wave fights on at 1 health for two and a half seconds: nothing can hurt it and it deals 15% more. Then it falls, unless a heal has lifted it above a quarter of its health. | "The first Samurai to fall fights on, unkillable" |

#### Mystic

Heroes: Fire Wizard, Lightning Mage, Wanderer, Great Sage, Geomancer.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Ley Lines | The king's spells cost a quarter less mana. | "King's spells cost a quarter less" |
| II (3) | Echo | Every king's spell (but those that call or raise) echoes 1.5 seconds later on the same spot at 30% of its strength. | "Each king's spell echoes at 30%" |
| III (4) | Conflux | Every fourth king's spell of a fight is free, and lands a second time at full strength. | "Every fourth spell is free, and cast twice" |

#### Yokai

Heroes: Kitsune, Karasu Tengu, Yamabushi Tengu, Gorgon, Bell Warden.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Will-o'-Wisps | Yokai slip 8% of blows, and a Yokai that slips one leaves a spirit wisp on its tile that hurts the foe who steps on it. | "Yokai slip 8% of blows and leave wisps" |
| II (3) | Foxfire Twin | Once a wave, a Yokai brought below 40% health splits: a foxfire twin with a quarter of its health and half its attack stands beside it for 10 seconds and draws blows. | "A Yokai brought low splits in two" |
| III (4) | Night Parade | Each wave opens in spirit dusk for 5 seconds: the foes walk and act 15% slower, and every foe slain in the dusk leaves a wisp where it fell. | "Each wave opens in spirit dusk" |

#### Knightly

Heroes: Peasant, Knight, Minotaur, Samurai Commander, Banneret.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Shield Wall | A Knightly hero with a friend on a tile beside it takes 10% less damage. | "10% less damage shoulder to shoulder" |
| II (3) | Oath of Protection | A blow on a hero below 30% health is taken instead by the nearest Knightly hero within 2 tiles (each knight once every 6 seconds). | "Knights take blows for the badly hurt" |
| III (4) | The Order's Standard | At each wave's start the Order plants its standard among the party. Friends within 2 tiles of it deal 15% more, take 10% less and mend 1% of their health a second while it stands. | "A standard is planted each wave: +15%, -10%" |

#### Holy

Heroes: Paladin, Cleric, High Priestess, Inquisitor, Seraph.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Blessing | Every heal on a hero is 15% stronger. | "Healing is 15% stronger" |
| II (3) | Consecrated Ground | At each wave's start the ground round each Holy hero is hallowed: a hero on it mends 1% of its health a second, and a foe on it is burnt by the light. | "Holy ground mends friends and burns foes" |
| III (4) | Resurrection | Once a wave, the first hero to fall is raised by light at once, at a fifth of its health, and no life is spent. | "Once a wave, the first to fall rises at once, free" |

#### Wild

Heroes: Werewolf, Druid, Barbarian, Wolf Bard, Falconer.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Bloodscent | Every hero deals 8% more to a foe below half its health. | "+8% damage to wounded foes" |
| II (3) | Frenzy | Each kill by a Wild hero makes the whole party act 4% faster for the rest of the wave, up to 40%. | "Every Wild kill quickens the party, to +40%" |
| III (4) | Stampede | 3 seconds into each wave, and every 20 seconds after, a stampede thunders down the file with the most foes: each foe in it is trampled for more than the party's might and knocked back a tile. | "A stampede tramples the foes' thickest file" |

#### Arcane

Heroes: Satyr, Warlock, Illusionist, Time Witch, Astral Sphinx.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Flux | When a hero casts a skill, the friend with the emptiest pool gains a tenth of a pool. | "Each skill tops up a friend's pool 10%" |
| II (3) | Spell Weave | When three skills are cast within 3 seconds, an arcane burst strikes round the third one's nearest foe for one and a half times the party's might. | "Three skills in 3 s: an arcane burst" |
| III (4) | Overload | Every ultimate meter starts each wave 30% fuller, and casting an ultimate gives a quarter of the meter back. | "Ultimates start 30% fuller, refund a quarter" |

#### Frontier

Heroes: Ranger, Gunslinger, Mercenary, Beastmaster, Mirage Dancer.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Trailblazers | Heroes act and walk 4% faster, are not slowed by mud, tall grass, water or snow, and are not held by the field's snares. | "The party moves quicker, over rough ground unslowed" |
| II (3) | Ambush | At each wave's start three snares are laid on the tiles the foes nearest the party will step on. | "Three snares laid in the foes' path each wave" |
| III (4) | Wanted | The wave's toughest foe is marked Wanted: heroes deal 40% more to it, and when it falls every hero gains 4 seconds of haste and mends 10%. | "The toughest foe is Wanted: +40% against it" |

#### Machine

Heroes: Rifle Bot, Arc Blade, Siege Bot, Juggernaut, Bombardier.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Plating | Each Machine starts each wave behind a shield of a tenth of its health. | "Machines start each wave shielded" |
| II (3) | Self-Destruct | A Machine that falls explodes: every foe within a tile takes half as much again as its attack. | "A fallen Machine explodes" |
| III (4) | Sentry Network | At each wave's start two sentry turrets unfold beside the party: they stand, and shoot with a fifth of the party's might. Rebuilt each wave; they never cost a life. | "Two sentry turrets deploy each wave" |

#### Royal

Heroes: Lancer, Queen Dragoon, Demon Swordsman, Tyrant, Astrologer.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | The Crown | The hero with the most attack wears the crown: 10% more attack and health. When it falls, the crown passes to the strongest standing. | "The strongest is crowned: +10%" |
| II (3) | Tribute | Each kill by the crowned hero mends every hero 4% of its health. | "The crown's kills mend the party" |
| III (4) | Regicide's Price | When a crowned hero falls, every foe is stunned for a second and a half and the heir who takes the crown has its ultimate filled. | "The crown's fall stuns all; the heir's ult fills" |

#### Pirate

Heroes: Buccaneer, Kraken Mate, Corsair Surgeon, Harpooner, Sea Reaver.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Plunder | Each foe a Pirate slays drops a gold piece for the run. | "Pirate kills drop extra gold" |
| II (3) | Sea Legs | The party walks water as dry ground, and Pirates take 20% less on it. At each wave's start the tide floods three tiles under the foes' front. | "The party walks water; the tide slows the foes" |
| III (4) | Broadside | 5 seconds into each wave, and every 12 seconds after, a ghost ship's broadside rakes the three files with the most foes in their middle: each foe in them takes twice the party's might and burns. | "Every 12 s a broadside rakes the foes" |

#### Vampire

Heroes: Vampire Lord, Hemomancer, Strigoi, Blood Gargoyle, Dhampir.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Thirst | A Vampire drinks back 8% of the damage it deals. | "Vampires drink 8% of what they deal" |
| II (3) | Swarm | Once a wave, a Vampire brought below 30% health bursts into bats, mends 15% and comes together away from the foes. | "A Vampire brought low bursts into bats" |
| III (4) | Blood Thralls | The first two foes slain each wave rise as blood thralls with a third of their health and half their bite, and fight for the party until the wave ends. Bosses and nemeses do not rise. | "The first two foes slain rise as your thralls" |

### Classes

#### Guardian

Heroes: Peasant, Knight, Yamabushi Tengu, Paladin, Seraph.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Challenge | A foe beside a Guardian must strike a Guardian, and the Guardians take 7% less damage. | "Foes beside a Guardian must strike it" |
| II (3) | Aegis | The first time each hero drops below 30% health in a wave, an Aegis shield of 15% of its health covers it for 5 seconds. | "An Aegis covers each hero once a wave" |
| III (4) | Bastion | A Guardian with another Guardian beside it turns 8% of each blow back on whoever struck it. | "Guardians side by side turn back blows" |

#### Blade

Heroes: Samurai, Ninja Monk, Samurai Commander, Barbarian, Vampire Lord.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Bleeding Edge | A Blade's crit makes its target bleed for a third of the blow again over 3 seconds. | "Blade crits make foes bleed" |
| II (3) | Riposte | A Blade struck in melee strikes straight back for 40% of its attack (once a second). | "Blades riposte when struck" |
| III (4) | Thousand Cuts | Every fifth blow of a Blade is a whirling cut that strikes every foe round it at full damage. | "Every fifth blow cuts all around" |

#### Marksman

Heroes: Archer, Lightning Mage, Ranger, Gunslinger, Falconer.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | High Ground | Shooters reach half a tile further for each step of height above their target, and their shots deal 6% more for each step. | "Shots from the heights reach further and hit harder" |
| II (3) | Pinning Shot | Every fourth shot of a Marksman pins its target where it stands for a second. | "Every fourth shot pins" |
| III (4) | Volley | Every 12 seconds every Marksman looses at once at the foe nearest the party, each shot a crit. | "Every 12 s the Marksmen loose as one" |

#### Caster

Heroes: Fire Wizard, Wanderer, Warlock, Tyrant, Hemomancer.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Surge | Each skill a Caster casts gives back 8% of its pool. | "Caster skills refund part of their pool" |
| II (3) | Lingering Magic | A Caster's skill leaves its magic on the ground under two of the foes it struck (or those nearest it) for 4 seconds: a burn, a shock, a curse or a bleed, by the Caster. | "Caster skills leave their mark on the ground" |
| III (4) | Overcast | Every fifth skill the Casters cast (counted together) goes off twice. | "Every fifth Caster skill casts twice" |

#### Warden

Heroes: Cleric, Druid, Shambler, Mummy, Banneret.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Watchful | A hero on a tile beside a Warden takes 5% less damage. | "Heroes beside a Warden take 5% less" |
| II (3) | Sanctuary | A hero with a Warden standing in front of it in the same file takes 5% less damage. | "Heroes behind a Warden take 5% less" |
| III (4) | Warding Circle | Once a wave, when the party's health falls below half, every Warden raises a warding circle round it for 6 seconds: heroes in it take a quarter less damage. | "At half health, the Wardens raise circles" |

#### Trickster

Heroes: Kunoichi, Kitsune, Karasu Tengu, Illusionist, Mirage Dancer.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Sleight | The first blow each wave aimed at each Trickster misses. | "The first blow on each Trickster misses" |
| II (3) | Decoy Log | Once a wave, a Trickster brought below 25% health leaves a decoy log where it stood and slips aside. | "A Trickster brought low leaves a decoy" |
| III (4) | Hall of Mirrors | At each wave's start each Trickster casts a mirror image beside it for 8 seconds, with a fifth of its health and half its attack. A foe that breaks an image is dazed for a second. | "Each Trickster casts a mirror image each wave" |

#### Beast

Heroes: Werewolf, Minotaur, Satyr, Gorgon, Astral Sphinx.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Pack Instinct | A Beast deals 6% more for each friend within 2 tiles, up to 24%. | "Beasts hit harder with friends near" |
| II (3) | Primal Roar | Each wave, the first time the foes close on a Beast, it roars: the foes within 2 tiles flee for 2 seconds. | "Each wave the Beasts roar foes away" |
| III (4) | Apex | A Beast that kills goes into a frenzy for 5 seconds: 40% faster, and each of its blows mends it 5% of its health. Another kill starts the 5 seconds again. | "Kills send the Beasts into a frenzy" |

#### Gunner

Heroes: Rifle Bot, Siege Bot, Dhampir, Bombardier, Harpooner.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Powder | A Gunner's shot splashes a quarter of its damage onto the foes beside its target. | "Gunner shots splash" |
| II (3) | Powder Kegs | At each wave's start three powder kegs are rolled among the foes' front. A Gunner's shot beside one sets it off; otherwise they go off by themselves after 8 seconds. | "Powder kegs among the foes each wave" |
| III (4) | Bombardment | Every 12 seconds the Gunners call down four shells on the four foes farthest back: each bursts on the tiles round it for most of the party's might. | "Every 12 s, shells fall on the foes' back rows" |

#### Assassin

Heroes: Mercenary, Buccaneer, Reaper, Arc Blade, Strigoi.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Backstab | A blow from behind a foe deals 30% more. | "Blows from behind deal 30% more" |
| II (3) | Execute | An Assassin's blow on a foe below 10% of its health (a boss below 6%) kills it outright. | "Assassins finish foes below 10%" |
| III (4) | Shadow Step | At each wave's start and after each kill, an Assassin steps through the shadows to the tile behind the weakest foe within 3 tiles (any on the field at a wave's start), and its next blow is a crit. | "Kills step Assassins through the shadows" |

#### Support

Heroes: Wolf Bard, Beastmaster, High Priestess, War Drummer, Corsair Surgeon.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Field Medic | Every 2 seconds the hero lowest in health mends 2.5% of its health. | "The most hurt hero is always mending" |
| II (3) | Battle Hymn | Every 12 seconds the Supports sing to the whole party for 4 seconds, in turn a hymn of haste, of guard (15% less damage) and of might (a tenth more). | "Every 12 s a hymn: haste, guard, then might" |
| III (4) | Rallying Cry | When a hero falls, every other hero mends 6% and gains 5 seconds of haste, and a life raises the fallen hero after 3 seconds instead of 5. | "A friend's fall rallies the rest; lives raise in 3 s" |

#### Vanguard

Heroes: Lancer, Dread Pirate, Queen Dragoon, Demon Swordsman, Sea Reaver.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Spearhead | Vanguards act and walk 15% faster for the first 8 seconds of each wave. | "Vanguards surge at each wave's start" |
| II (3) | Breakthrough | A Vanguard's first blow on each foe staggers it for most of a second. | "Each foe's first Vanguard blow staggers it" |
| III (4) | Onslaught | 2 seconds into each wave the Vanguards leap into the foes' line together, each landing for most of its attack on the tiles round it and stunning those foes for a moment. | "Each wave the Vanguards leap into the foes" |

#### Arcanist

Heroes: Time Witch, Great Sage, Plague Doctor, Astrologer, Inquisitor.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Runic Study | The king's spells hit and heal 15% harder. | "King's spells 15% stronger" |
| II (3) | Spell Sling | When the king casts a spell, each Arcanist's pool gains a tenth and it is ready to cast at once. | "King's spells make Arcanists cast" |
| III (4) | Chronal Anchor | Once a wave, when the party's health first falls below a fifth, time turns back 4 seconds for every hero: its place returns to where it was and its health toward what it was (a tenth of its health at most), and a hero fallen in those 4 seconds stands again without spending a life. | "Once a wave, time turns back 4 s for the party" |

#### Bulwark

Heroes: Kraken Mate, Juggernaut, Blood Gargoyle, Geomancer, Bell Warden.

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Steadfast | Bulwarks cannot be knocked back, and no stun holds them longer than a second. | "Bulwarks cannot be moved or held long" |
| II (3) | Earthworks | At each wave's start each Bulwark raises a stone wall two tiles in front of it, which blocks the foes' walk and shots for 12 seconds. | "Bulwarks raise walls before them each wave" |
| III (4) | Immovable | A Bulwark that has not moved for 2 seconds takes 15% less damage, and every hero beside it takes 5% less. | "Bulwarks standing firm shelter their neighbours" |


## How it is built

- **The rules** are `src/sim/traitPerks.ts`. `fight()` calls `startPerks` (after the kept summons stand): it fixes each trait's tier from
  the placed heroes (`perkTiers`; the daily's featured trait counts one hero more) into `Battle.perk`, and runs the first wave's start
  (`perkWave`). The fight's hooks call into it: `tickPerks` each tick; `perkGuard`, `perkDamage`, `perkStruck`, `perkSpare` and `perkDeath`
  in `hurt`; `perkBlow` after a blow lands (`settle`); `perkCrit` in `swing`; `perkCast` and `perkUlt` in `powered` and `began`;
  `perkSpell`, `spellCost` and `spellPower` in `castSpell`; `perkSpeed` in `speedOf`; `perkFoot` in a step's cost and the field's snares.
  A fight with no perk awake has no `Battle.perk`, and each hook is one check.
- **The fighters' marks** are `Unit.pk` (`PerkUnit`): a spent Death's Door, a death poem's end, blows counted, a crown, a Wanted foe, and
  what a perk raised (`raised`).
- **What the perks raise** are new summon kinds in `units.ts`: `graveWarrior`, `graveSpear`, `graveArcher` (the foes' skeleton sheets),
  `sentry` (a stand-in sheet, `robot_infantry`, until its art lands), `thrall` (drawn in the slain foe's own sheet), `mirror` (drawn in its
  hero's sheet), and the Samurai Commander's `standard` for the Order. Each is `summon: true` and owned by no hero, so `lives.ts` never
  counts one as the party: none ever spends a life, and a party all down with only these standing is still a party fall. None is in
  `KEPT_KINDS`: the skeletons and turrets that stand at a wave's end are made whole, the fallen rise again, and the thralls go.
- **No randomness.** Every rule is a count, a timer or a nearest-first pick (ties by tile, then id). Nothing draws from the fight's stream
  or a side stream.
- **The switch** is `TRAIT_PERKS` in `traits.ts`. Off, the traits are exactly what they were before (`LEGACY_TIERS`: the old small bonuses,
  the old milestones at their old counts, the daily's featured bonus counted twice) and no perk wakes, so the recorded fights of the
  regression tests (`ailments-identical`, `nemesis-regression`, `spells-identity`, `stand-regression`) still play as recorded with it off,
  as they do with `FIELD_HAZARDS` and `LAND_TERRAIN` off. `only` keeps one trait's perks, for the measure.
- **The run** pays Pirate I's gold in `noteFight` (`run.ts`). **Lives** read `Battle.reviveMs` (Support III's 3 s). A Bulwark's `steady`
  is read by `stunFor` (`ailments.ts`) and `movable` (`toolkit/move.ts`).

## In each mode

- **A run's waves and the Calamity:** each fight is a wave. In the Calamity's ten, two or three top tiers can stand at once; the measure
  has not shown that to be a problem yet, so there is no cap.
- **Ten lives:** as above, nothing a perk raises costs a life. Holy III and Arcanist III stand a hero up without spending one; Support III
  makes a life raise a hero in 3 s instead of 5; Undead I and Samurai III put a fall off.
- **The Last Stand:** one long fight. Each of its waves is a perk wave: `beginWave` asks for the wave's start once its foes have come on
  (`perkWaveSoon`), and its party's changes are read again (`syncPerks`, from `syncTraits`).
- **The Assault:** its field has no waves, so its wave-start perks come round every 60 s (the owner's answer, `ASSAULT_WAVE_MS`). On the big
  field a perk reaches only the foes within 16 tiles of the party's middle (`FIELD_REACH`), so the strikes stay near the fighting and cheap.
  The Bulwarks raise no walls there: a wall raised every minute could block the field's narrow ways for the heroes too (a precaution;
  the stormings measured below had no Bulwarks).
- **The daily:** the featured trait counts one hero more than it has, in place of its old bonus counted twice. Its theme lines name the
  perks now ("The Undead count one more: three of them and the skeletons rise"); the start card says "Undead counts one more".
- **Duels:** the ring holds only the champion and the nemesis. Nothing is raised or laid there and no strike falls on the field; the
  champion's own perks (Iaijutsu, Bleeding Edge, Backstab, Thirst, Steadfast, the Death Poem and the like) still work.
- **Foes:** the perks are the heroes' only.

## On the page

- **The deploy screen's trait row:** each chip has the trait's count against its next need ("Undead 3/4"), three pips (one a tier, lit as
  each is reached), and under it the perk awake by name and what the next tier gives. A tap or a long press opens the trait's card.
  When a tier wakes, the line under the row says so ("Synergy active! Undead III, Rise from the Grave: ...").
- **The trait's card** (`src/traitCard.ts`, words from `traitCardRules.ts`) is the standard ornate card: "Origin" or "Class", the trait's
  name, how many are on the field, the three tiers as slate wells (those reached gilded, the next one rimmed with a dashed brass line,
  each with its numeral, name, count and whole rule), the trait's heroes with those on the field marked, and "Close".
- **In the fight**, each perk's beat (`PerkEvent`) is drawn by `Fx.perk` from `src/render/perkFxRules.ts`: its word over the fighter or
  the spot, and a Blender beat clip from the showcases' own sheets (a rising for the skeletons, a crash for a broadside, dust down a file for
  the stampede, a ring for a hymn...), on a fighter, a tile, some tiles, a file or the whole party. Only the clips of the traits awake are
  asked for as a fight begins. A file's strikes run down it from the far end; the big ones shake the camera a little. A keg waits on its
  tile until it goes off. What a perk raised is tinted for what it is (`perkLookRules.ts`: a thrall blood red, an image pale and faded, a
  skeleton grave green), and the crowned hero and the Wanted foe are touched with gold and amber. Each beat has its sound
  (`soundRules.ts`, `PERK_CUES`). Reduced motion keeps its rules: the clips show their held frame.

## Art

Everything is drawn from what the game has, with three stand-ins until their art lands; their ChatGPT prompts are in
`docs/notes/trait-perks-art-prompts.md` (branch `art/trait-perks`, files under `art-source/trait-perks/`):

- the sentry turret (stand-in: the `robot_infantry` sheet, standing still);
- the ghost ship of the broadside (stand-in: the fire beats down the files, no ship);
- the crown mark (stand-in: the crowned hero's gold tint and the "Crowned" word).

## Balance

**The target** (the design's): a trait's top tier worth about one extra hero, +8 to +20 points of win rate over the same party with no perk
awake, at a stage where that party wins about half its fights; a first tier a few points.

**The tool:** `node tools/trait-perks/run.mjs [traits]` (`GAMES`, default 300; `TIERS=3` for the top tiers only; `LEVEL` for the heroes'
level). For each trait and tier, a party of that many of the trait's heroes, filled to five with plain heroes of other traits, plays the hero
table's fights (`tools/heroSweep.ts`: every band in turn, the land's traps laid, the king's starting spells cast by Auto) three ways: with
only that trait's perks, with no perk at all, and with the traits as they were ("vs old"). The stage is the one where the party with no
perks wins nearest half (a binary search). Fights at level 1 have no ultimates, and the hero table's fights have no lives, so the revives
(Holy III, Arcanist III) read higher here than they are worth in a run, where a life would have raised the hero anyway.

**What moved in the tuning** (four passes; the design's first numbers were far too strong, and a few rules worked against their own side):

- The summons: the skeletons from 45% of the party's health and attack to a quarter; the sentries from half the party's might to a fifth
  (their health 15%); the thralls from half the foe's health and its full bite to a quarter and 40%; the mirror images one a Trickster, not
  two, at a fifth of its health; the foxfire twin a fifth.
- The revives: the Resurrection from 60% health to a fifth; the Chronal Anchor now waits for a fifth of the party's health and gives back at
  most a tenth of each hero's; the Death Poem two and a half seconds at 15% more.
- The guards: Guardian I is the taunt with 7% less damage for the Guardians (a taunt alone lost to the old 5% guard for everyone); the
  Bastion turns back 8%, with no guard of its own; Immovable 15% and 5%; the Warding Circle a quarter; Sanctuary 5%. Warden I is
  Watchful (5% less for a hero beside a Warden) in place of Thornward, whose reflected blows were worth most to a front-line Warden.
- Samurai: Way of the Duel is a second of haste for a lone duel won (its +20% damage made the starting five, three Samurai among them, win
  six more of every forty fights against every band), and Iaijutsu's crit 15% more.
- Rules that hurt their own side: Breakthrough no longer knocks foes back (it pushed them out of the Vanguards' reach), only staggers;
  the Pirates' tide is water the whole party walks (it slowed the party's own heroes as they closed).
- Up: Beast's Apex 40% faster and 5% healing a blow, Pack Instinct 6% a friend; the stampede more than the party's might; Frenzy 4% a
  kill; the broadside rakes three files for twice the party's might, from 5 s in and every 12 s; Trailblazers also 4% quicker.
- Down for the hero table's spread: Bloodscent 8% (it reaches the whole party), High Ground 6% a step.
- Smaller cuts to Mystic (Echo 30%, Conflux every fourth spell; Ley Lines a quarter off, up from 15%), Holy (Blessing 15%, hallowed ground), Caster (Surge
  8%, Overcast every fifth), Support (hymns every 12 s, the Rallying Cry 6%), Assassin (Execute at 10%), Vanguard (Spearhead 15%, the
  Onslaught most of a hero's attack) and Arcanist (Spell Sling a tenth of a pool).

**The table** (`GAMES=200 node tools/trait-perks/run.mjs`, two shards, heroes at level 1). "Old %" is the party with the traits as they
were, "None %" with no perk, "On %" with only this trait's perks; "Lift" is on against none, "Vs old" on against old. Each cell is 200
fights, so a lift is good to about 4 points either way.

| Trait | Tier | Stage | Old % | None % | On % | Lift | Vs old |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Undead | I Death's Door | 7 | 75.0 | 64.0 | 70.5 | +6.5 | -4.5 |
| Undead | II Grave Rot | 8 | 48.0 | 37.0 | 52.5 | +15.5 | +4.5 |
| Undead | III Rise from the Grave | 7 | 77.5 | 51.5 | 68.5 | **+17.0** | -9.0 |
| Samurai | I Iaijutsu | 7 | 65.0 | 62.5 | 64.0 | +1.5 | -1.0 |
| Samurai | II Way of the Duel | 8 | 39.5 | 37.5 | 40.0 | +2.5 | +0.5 |
| Samurai | III Death Poem | 8 | 68.0 | 46.0 | 60.5 | **+14.5** | -7.5 |
| Mystic | I Ley Lines | 7 | 54.5 | 51.0 | 54.5 | +3.5 | +0.0 |
| Mystic | II Echo | 7 | 54.5 | 52.5 | 62.5 | +10.0 | +8.0 |
| Mystic | III Conflux | 7 | 62.5 | 43.5 | 63.5 | **+20.0** | +1.0 |
| Yokai | I Will-o'-Wisps | 8 | 33.0 | 40.0 | 40.0 | +0.0 | +7.0 |
| Yokai | II Foxfire Twin | 8 | 41.0 | 35.0 | 47.5 | +12.5 | +6.5 |
| Yokai | III Night Parade | 7 | 64.5 | 52.0 | 71.5 | **+19.5** | +7.0 |
| Knightly | I Shield Wall | 8 | 46.5 | 35.0 | 39.5 | +4.5 | -7.0 |
| Knightly | II Oath of Protection | 8 | 57.0 | 43.5 | 51.5 | +8.0 | -5.5 |
| Knightly | III The Order's Standard | 8 | 64.5 | 55.5 | 68.0 | **+12.5** | +3.5 |
| Holy | I Blessing | 7 | 76.0 | 64.0 | 67.5 | +3.5 | -8.5 |
| Holy | II Consecrated Ground | 8 | 57.5 | 36.5 | 52.0 | +15.5 | -5.5 |
| Holy | III Resurrection | 8 | 47.5 | 35.5 | 57.0 | **+21.5** | +9.5 |
| Wild | I Bloodscent | 8 | 41.0 | 36.0 | 39.0 | +3.0 | -2.0 |
| Wild | II Frenzy | 8 | 46.0 | 39.5 | 45.0 | +5.5 | -1.0 |
| Wild | III Stampede | 8 | 51.0 | 34.0 | 45.0 | **+11.0** | -6.0 |
| Arcane | I Flux | 7 | 58.0 | 51.5 | 52.0 | +0.5 | -6.0 |
| Arcane | II Spell Weave | 8 | 42.5 | 40.0 | 48.5 | +8.5 | +6.0 |
| Arcane | III Overload | 8 | 43.0 | 40.0 | 49.0 | **+9.0** | +6.0 |
| Frontier | I Trailblazers | 6 | 71.5 | 67.5 | 67.0 | -0.5 | -4.5 |
| Frontier | II Ambush | 7 | 53.0 | 51.0 | 57.5 | +6.5 | +4.5 |
| Frontier | III Wanted | 7 | 63.0 | 52.5 | 68.5 | **+16.0** | +5.5 |
| Machine | I Plating | 8 | 37.0 | 32.0 | 33.0 | +1.0 | -4.0 |
| Machine | II Self-Destruct | 8 | 46.5 | 38.0 | 47.5 | +9.5 | +1.0 |
| Machine | III Sentry Network | 8 | 74.5 | 47.0 | 64.0 | **+17.0** | -10.5 |
| Royal | I The Crown | 8 | 48.0 | 40.5 | 48.5 | +8.0 | +0.5 |
| Royal | II Tribute | 8 | 54.5 | 45.0 | 53.5 | +8.5 | -1.0 |
| Royal | III Regicide's Price | 7 | 80.5 | 63.5 | 79.5 | **+16.0** | -1.0 |
| Pirate | I Plunder | 7 | 76.5 | 68.5 | 68.5 | +0.0 | -8.0 |
| Pirate | II Sea Legs | 8 | 49.5 | 41.0 | 39.0 | -2.0 | -10.5 |
| Pirate | III Broadside | 8 | 53.0 | 47.0 | 61.0 | **+14.0** | +8.0 |
| Vampire | I Thirst | 7 | 59.5 | 50.5 | 52.5 | +2.0 | -7.0 |
| Vampire | II Swarm | 8 | 40.0 | 51.0 | 63.5 | +12.5 | +23.5 |
| Vampire | III Blood Thralls | 8 | 50.5 | 58.0 | 75.5 | **+17.5** | +25.0 |
| Guardian | I Challenge | 8 | 46.5 | 35.0 | 47.0 | +12.0 | +0.5 |
| Guardian | II Aegis | 8 | 61.5 | 48.0 | 64.5 | +16.5 | +3.0 |
| Guardian | III Bastion | 8 | 69.0 | 51.0 | 70.0 | **+19.0** | +1.0 |
| Blade | I Bleeding Edge | 8 | 39.5 | 35.0 | 35.0 | +0.0 | -4.5 |
| Blade | II Riposte | 8 | 57.5 | 37.0 | 49.5 | +12.5 | -8.0 |
| Blade | III Thousand Cuts | 7 | 69.5 | 55.5 | 73.5 | **+18.0** | +4.0 |
| Marksman | I High Ground | 7 | 55.5 | 52.0 | 53.5 | +1.5 | -2.0 |
| Marksman | II Pinning Shot | 7 | 54.0 | 49.5 | 49.5 | +0.0 | -4.5 |
| Marksman | III Volley | 7 | 58.5 | 54.5 | 63.5 | **+9.0** | +5.0 |
| Caster | I Surge | 7 | 54.5 | 46.0 | 49.5 | +3.5 | -5.0 |
| Caster | II Lingering Magic | 7 | 52.0 | 40.5 | 49.5 | +9.0 | -2.5 |
| Caster | III Overcast | 8 | 38.5 | 30.5 | 49.5 | **+19.0** | +11.0 |
| Warden | I Watchful | 7 | 61.5 | 56.0 | 57.5 | +1.5 | -4.0 |
| Warden | II Sanctuary | 8 | 47.5 | 38.0 | 40.5 | +2.5 | -7.0 |
| Warden | III Warding Circle | 8 | 59.5 | 37.5 | 45.5 | **+8.0** | -14.0 |
| Trickster | I Sleight | 7 | 65.0 | 61.0 | 68.5 | +7.5 | +3.5 |
| Trickster | II Decoy Log | 9 | 33.0 | 36.5 | 55.0 | +18.5 | +22.0 |
| Trickster | III Hall of Mirrors | 8 | 51.0 | 55.0 | 75.5 | **+20.5** | +24.5 |
| Beast | I Pack Instinct | 8 | 54.0 | 44.5 | 46.5 | +2.0 | -7.5 |
| Beast | II Primal Roar | 7 | 78.5 | 69.0 | 75.0 | +6.0 | -3.5 |
| Beast | III Apex | 7 | 82.0 | 67.0 | 79.5 | **+12.5** | -2.5 |
| Gunner | I Powder | 7 | 61.5 | 52.0 | 53.5 | +1.5 | -8.0 |
| Gunner | II Powder Kegs | 7 | 70.0 | 61.5 | 61.5 | +0.0 | -8.5 |
| Gunner | III Bombardment | 8 | 44.5 | 32.0 | 45.0 | **+13.0** | +0.5 |
| Assassin | I Backstab | 7 | 56.5 | 48.5 | 52.0 | +3.5 | -4.5 |
| Assassin | II Execute | 7 | 61.5 | 56.5 | 66.5 | +10.0 | +5.0 |
| Assassin | III Shadow Step | 7 | 67.0 | 50.5 | 65.0 | **+14.5** | -2.0 |
| Support | I Field Medic | 7 | 63.5 | 54.5 | 63.5 | +9.0 | +0.0 |
| Support | II Battle Hymn | 7 | 65.5 | 56.0 | 69.0 | +13.0 | +3.5 |
| Support | III Rallying Cry | 7 | 58.5 | 56.0 | 74.5 | **+18.5** | +16.0 |
| Vanguard | I Spearhead | 7 | 57.5 | 59.0 | 56.5 | -2.5 | -1.0 |
| Vanguard | II Breakthrough | 8 | 54.5 | 46.0 | 42.0 | -4.0 | -12.5 |
| Vanguard | III Onslaught | 7 | 71.0 | 58.0 | 74.0 | **+16.0** | +3.0 |
| Arcanist | I Runic Study | 7 | 61.5 | 50.5 | 52.0 | +1.5 | -9.5 |
| Arcanist | II Spell Sling | 8 | 39.0 | 36.0 | 48.0 | +12.0 | +9.0 |
| Arcanist | III Chronal Anchor | 8 | 33.0 | 30.0 | 51.5 | **+21.5** | +18.5 |
| Bulwark | I Steadfast | 9 | 38.5 | 30.5 | 31.0 | +0.5 | -7.5 |
| Bulwark | II Earthworks | 9 | 44.5 | 30.5 | 35.5 | +5.0 | -9.0 |
| Bulwark | III Immovable | 8 | 52.5 | 39.5 | 54.5 | **+15.0** | +2.0 |

Read with the rest:

- **The top tiers:** 23 of 26 are within +6 to +20 of no perks. Three are just over: Holy's Resurrection and Arcanist's Chronal Anchor
  (+21.5 each; both stand a fallen hero up, which these fights, with no lives, value at its most; in a run a life would have raised it
  anyway, so they are worth less there) and Trickster's Hall of Mirrors (+20.5, within the noise). Arcane's Overload reads low here
  (+9) because level 1 has no ultimates to fill.
- **Against the old bonuses:** the old four-of tiers were strong flat stats (Undead's +14% health for every hero, Machine's +10% attack),
  and at the measure's even stages a few points of health or attack swing a fight hard, so some top tiers read below old (Undead -14,
  Machine -10.5) while those that change how a fight plays read well above it (Vampire, Trickster, Arcanist, Support). The first tiers
  are mostly a little under the old flat bonuses (-1 to -9), as the target asked: small.
- **The director's watch list:** Undead's skeletons +12 (the owner's own example, in the band, not dominant); Holy and Arcanist +21.5
  each (the revives, above); Vampire's thralls +17.5.

**Every mode** (the same commands with `TRAIT_PERKS=0` for the old traits, `tools/trait-perks/env.ts`):

| Measure | With the perks | Without |
| --- | --- | --- |
| The daily, 40 dates, fresh save (`npm run daily-rate -- --days 40`): cleared with the hearts / first loss ends it | 100% / 78% | 98% / 80% |
| The Last Stand, 10 runs (`npm run balance -- --no-tables --stand --levels 10,30 --attempts 10`): median wave at level 10 / 30 | 10 / 19 | 10 / 15 |
| The Assault, every storming once (`node tools/assault-dev/run.mjs`) | 21 of 27 won | 21 of 27 won |
| Duels (`npm run balance -- --no-tables --duel`), every kind alone | 44.2% | 44.2% |

The daily is unchanged within its noise. The Last Stand's eight (three Samurai, two Guardians, two Holy, two Marksmen) go four waves
further at level 30: its waves are long, so the once-a-wave perks and the summons come round many times. The Assault's party (the
Knight, Samurai, Archer, Wizard and Dragoon) wakes only Samurai I and wins the same stormings; their lengths move, as one changed blow
moves a long fight. The duel table puts each kind in alone, so no trait wakes, and it is the same. (The daily, Stand, Assault and duel
rows were measured a pass before the last small cuts.)

## Tests and checks

- `test/trait-perks.test.ts`: every perk's rule, trait by trait (the tiers, the switch, the skeletons rising, staying down and never
  costing a life, each trait's three tiers, a duel's ring, determinism, and whole fights with top tiers playing to their end).
- `test/trait-card.test.ts`: the card's ladder and words, the chip's pips, every perk's look and its clip, the tints.
- Updated for the owner-approved ladder: `traits`, `synergy-lines`, `trait-badges`, `vampires`, `more-heroes`, `daily-builds` and
  `emit-points` (the risen archer and the sentry shoot from their stand-in sheets' points). The recorded fights (`ailments-identical`,
  `nemesis-regression`, `spells-identity`, `stand-regression`) play with the switch off, as recorded. Seed-staged tests re-staged, as their
  own notes do when the party's play moves: `stand-retreat` (two tests) and `set-powers` (three powers to seed 7).
- **Still failing:** `hero-balance` at level 1. The Mummy is 6.8 points under the roster average (the bar is 6; before the perks it was
  4.2 under). The Mummy and the Shambler share Undead and Warden, and those traits' perks help a front-line tank more than the Mummy:
  every version of the two traits that lifted the Mummy past the bar at level 1 pushed the Shambler past it at level 30. The test's own
  note says to retune the hero rather than loosen the bar, and retuning the Mummy's kit would re-record the level-1 fights of the
  recorded tests, so it is left for the director to decide.
- The photographs: `node tools/trait-perks/shots.mjs` at 393x852, 360x780 and 412x915 (`docs/samples/trait-perks-*`): the deploy row, the
  Undead card, the fight with the skeletons risen and a close look at them. No page error, no sideways scroll, the card inside the screen.
