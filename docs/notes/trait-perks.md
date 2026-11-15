# Trait perks (TRAIT-PERKS): the design, for the owner's approval

The owner's ask: "lets change the perks for having multiple people of a type on the field. I want them to really matter. be unique and give
amazing and varied buffs. like have 4 of an undead type means 3 skeletons rise from the grave and join you. they revive at the end of the
wave only and dont cost hearts"

This is stage 1: the design only. Nothing in the sim has changed yet.

## What there is today

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

## The new ladder

**Every trait gets three tiers, at 2, 3 and 4 heroes.** Every trait has five to seven heroes and a party is five, so 4 is the most a party
can reach while still mixing in another trait. It is also where the owner's example sits. In the Calamity's ten, two or three traits can
reach their top tier at once (see Interactions).

- **I (2 heroes): a taste.** A small rule of the trait's own, worth roughly a few per cent of a party's power. Every party has two or three
  of these on, so they must stay small.
- **II (3 heroes): a turn of the fight.** A rule you see work in every wave. Each tier keeps the ones below it.
- **III (4 heroes): the trait's signature.** A big, visible thing: an army rising, a broadside, time turning back. It is worth building a
  party around, roughly one extra hero's worth (see Balance).

The flat stat bonuses (+1% attack and the rest) all go. Each tier is a rule instead, and none of them repeats another trait's rule. The four
existing milestones stay, moved onto the new ladder (the Aegis to Guardian II, the decoy log to Trickster II, the wisps to Yokai I, the bats
to Vampire II).

"A wave" below means one fight of a run (a wave of an army, a stage of the Calamity's map), and each wave of the Last Stand's one long
fight. "The party's might" is the average attack of the party's heroes placed at the fight's start (after gear, grade and talents), and
"the party's health" the same for health, so a perk grows with the heroes as summons do now (`callSummon` scales by the caster).

Numbers are first guesses, to be tuned in stage 2 by the measurements below.

### Origins

#### Undead (the owner's example)

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Death's Door | The first blow each wave that would fell an Undead hero leaves it on 1 health instead, and it cannot be hurt for 1 s. | "Each Undead cheats death once a wave" |
| II (3) | Grave Rot | A foe slain within 2 tiles of an Undead hero bursts: every foe within 1 tile of it is poisoned for 3 s (each half second, 8% of the party's might). | "Foes slain near the Undead burst in rot" |
| III (4) | Rise from the Grave | At each wave's start, three skeletons claw up from the ground beside the Undead: a Skeleton Warrior, a Skeleton Spearman and a Skeleton Archer, each with 45% of the party's health and attack. A skeleton that falls stays down until the wave ends; then all three rise again for the next wave. They never cost a life. | "Three skeletons rise to fight each wave" |

The skeletons are summon kinds (`summon: true`), so `lives.ts` already leaves them out of the party (`ofParty`): they never spend a life and
never count as a party fall. They are not kept between waves (`KEPT_KINDS`). Each wave they are made fresh, at full health.

#### Samurai

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Iaijutsu | Each Samurai's first blow of a wave is a sure crit at double damage. | "First cut of each wave: a double crit" |
| II (3) | Way of the Duel | A Samurai striking a foe that no other hero is attacking deals 20% more. A Samurai's kill gives it 2 s of haste. | "Lone duels cut 20% deeper; kills quicken" |
| III (4) | Death Poem | The first Samurai to fall each wave does not fall. It fights on at 1 health for 5 s, cannot be hurt and deals 60% more, then falls (a life raises it as usual). If a heal lifts it above a quarter of its health in those 5 s, it lives. | "The first Samurai to fall fights 5 s more, unkillable" |

#### Mystic

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Ley Lines | The king's spells cost 15% less mana. | "King's spells cost 15% less" |
| II (3) | Echo | Every king's spell echoes 1.5 s later on the same spot at 40% of its strength. | "Each king's spell echoes at 40%" |
| III (4) | Conflux | Every third king's spell of a fight is free and lands twice at full strength (the echo follows both). | "Every third spell is free, and cast twice" |

#### Yokai

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Will-o'-Wisps | Yokai slip 8% of blows. A Yokai that slips a blow leaves a spirit wisp on its tile (the existing `yokaiWisp`). | "Yokai slip 8% of blows and leave wisps" |
| II (3) | Foxfire Twin | Once a wave, a Yokai brought below 40% health splits: a foxfire twin of it stands beside it for 10 s, with 30% of its health and half its attack, and draws blows. | "A Yokai brought low splits in two" |
| III (4) | Night Parade | Each wave opens in spirit dusk for 10 s: every foe walks and acts 25% slower, and every foe slain in the dusk leaves a wisp where it fell. | "Each wave opens in spirit dusk" |

#### Knightly

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Shield Wall | A Knightly hero with a friend on a tile beside it takes 10% less damage. | "10% less damage shoulder to shoulder" |
| II (3) | Oath of Protection | When a blow would land on a hero below 30% health, the nearest Knightly hero within 2 tiles steps in and takes it instead (each knight once every 6 s). | "Knights take blows for the badly hurt" |
| III (4) | The Order's Standard | At each wave's start the Order plants its standard (the Samurai Commander's standard, in the Order's colours) in the middle of the party. Friends within 2 tiles deal 15% more and take 10% less. If it still stands when the wave is won, every hero mends 20% of its health. | "A standard is planted each wave: +15%, -10%" |

#### Holy

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Blessing | Every heal on a hero is 20% stronger. | "Healing is 20% stronger" |
| II (3) | Consecrated Ground | At each wave's start the 3x3 of tiles under each Holy hero is hallowed for the wave. A hero on hallowed ground mends 1% of its health a second; a foe on it takes 6% of the party's might a second. | "Holy ground mends friends and burns foes" |
| III (4) | Resurrection | Once a wave, the first party hero to fall is raised by light at once (no 5 s wait), at 60% health, and no life is spent. | "Once a wave, the first to fall rises at once, free" |

#### Wild

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Bloodscent | Every hero deals 12% more to a foe below half its health. | "+12% damage to wounded foes" |
| II (3) | Frenzy | Each kill by a Wild hero makes the whole party act 3% faster for the rest of the wave, up to 30%. | "Every Wild kill quickens the party, to +30%" |
| III (4) | Stampede | 3 s into each wave, and every 20 s after, a stampede of wild beasts thunders down the board's file with the most foes. Every foe in it takes the party's might once and is knocked back a tile. | "A stampede tramples the foes' thickest file" |

#### Arcane

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Flux | When a hero casts its skill, the friend with the emptiest pool gains 10% of a pool. | "Each skill tops up a friend's pool 10%" |
| II (3) | Spell Weave | When three skills are cast within 3 s (by any heroes), an arcane burst hits the third one's target: 1.5 times the party's might on the 3x3 round it. | "Three skills in 3 s: an arcane burst" |
| III (4) | Overload | Every ultimate meter starts each wave 30% fuller (on top of ULT-CHARGE), and casting an ultimate gives a quarter of the meter back. | "Ultimates start 30% fuller, refund a quarter" |

#### Frontier

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Trailblazers | Heroes ignore the slowing of deep mud, tall grass, shallow water and snow, and step over the field's snares unharmed. | "The party crosses rough ground unslowed" |
| II (3) | Ambush | At each wave's start, three snares (the Ranger's) are laid on the tiles in the foes' path toward the party. | "Three snares laid in the foes' path each wave" |
| III (4) | Wanted | The wave's toughest foe (its boss, or else the foe with the most health) is marked: heroes deal 40% more to it, and when it falls every hero gains 4 s of haste and mends 10%. | "The toughest foe is Wanted: +40% against it" |

#### Machine

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Plating | Each Machine starts each wave behind a shield of 15% of its health. | "Machines start each wave shielded" |
| II (3) | Self-Destruct | A Machine that falls explodes: every foe within 1 tile takes twice its attack. A life raises it as usual. | "A fallen Machine explodes" |
| III (4) | Sentry Network | At each wave's start two sentry turrets unfold on the high tiles nearest the party: still, reach 4, each shooting with 50% of the party's might and 40% of its health. Rebuilt each wave; never cost a life. | "Two sentry turrets deploy each wave" |

#### Royal

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | The Crown | The hero with the highest attack wears the crown: 15% more attack and health while it stands. When it falls the crown passes to the next strongest standing. | "The strongest is crowned: +15%" |
| II (3) | Tribute | Each kill by the crowned hero mends every hero 4% of its health. | "The crown's kills mend the party" |
| III (4) | Regicide's Price | When a crowned hero falls, every foe is stunned for 2 s and the heir who takes the crown has its ultimate filled at once. | "The crown's fall stuns all; the heir's ult fills" |

#### Pirate

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Plunder | Each foe a Pirate slays drops 1 extra gold for the run (a run's waves only). | "Pirate kills drop extra gold" |
| II (3) | Sea Legs | Pirates walk water as dry ground and take 20% less on water. At each wave's start the tide floods three shallow-water tiles under the foes' front. | "Pirates walk water; the tide slows the foes" |
| III (4) | Broadside | Every 15 s a ghost ship's broadside rakes the board's file with the most foes: each foe in it takes 1.5 times the party's might and burns for 3 s. | "Every 15 s a broadside rakes the foes" |

#### Vampire (now 2, 3, 4 like the others; it was 2, 4, 5)

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Thirst | Vampires leech 10% of the damage they deal. | "Vampires drink 10% of what they deal" |
| II (3) | Swarm | Once a wave, a Vampire brought below 30% bursts into bats, mends 15% and slips away (the existing `vampireSwarm`, now once a wave). | "A Vampire brought low bursts into bats" |
| III (4) | Blood Thralls | The first two foes slain each wave rise as blood thralls and fight for the party until the wave ends, with half their health. Bosses and nemeses do not rise. | "The first two foes slain rise as your thralls" |

### Classes

#### Guardian

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Challenge | A foe within 1 tile of a Guardian must strike a Guardian if it can. | "Foes beside a Guardian must strike it" |
| II (3) | Aegis | The first time each hero drops below 30% in a wave, an Aegis shield of 15% of its health covers it for 5 s (the existing `guardianShield`, now once a wave). | "An Aegis covers each hero once a wave" |
| III (4) | Bastion | Two Guardians on tiles side by side both turn back 30% of each blow onto whoever struck them, and take 15% less. | "Guardians side by side turn back 30% of blows" |

#### Blade

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Bleeding Edge | A Blade's crit makes its target bleed: 30% of the blow again over 3 s. | "Blade crits make foes bleed" |
| II (3) | Riposte | A Blade struck in melee strikes straight back for 40% of its attack (once a second). | "Blades riposte when struck" |
| III (4) | Thousand Cuts | Every fifth blow of a Blade is a whirling cut that strikes every foe round it at full damage. | "Every fifth blow cuts all around" |

#### Marksman

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | High Ground | Shooters reach half a tile further per step of height above their target (as today), and deal 8% more per step. | "Shots from the heights reach further and hit harder" |
| II (3) | Pinning Shot | Every fourth shot of a Marksman pins its target where it stands for 1 s. | "Every fourth shot pins" |
| III (4) | Volley | Every 12 s every Marksman looses at once at the same foe (the one nearest the party), each shot a sure crit. | "Every 12 s the Marksmen loose as one" |

#### Caster

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Surge | A Caster's skill that hits three or more foes gives back 30% of its pool. | "Skills that hit three refund 30%" |
| II (3) | Lingering Magic | A Caster's skill leaves its element on the tiles it hit for 4 s: fire burns, ice chills, lightning leaps, shadow curses, light mends friends. | "Caster skills leave their element on the ground" |
| III (4) | Overcast | Every third skill a Caster casts goes off twice. | "Every third skill casts twice" |

#### Warden

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Thornward | A foe that strikes a Warden in melee takes 15% of the blow back. | "Melee blows on Wardens hurt the striker" |
| II (3) | Sanctuary | A hero with a Warden standing between it and the foes (in front of it, in the same file) takes 15% less damage. | "Heroes behind a Warden take 15% less" |
| III (4) | Warding Circle | Once a wave, when the party's health falls below half, every Warden plants a warding circle (the 3x3 round it) for 6 s: heroes in it take half damage. | "At half health, the Wardens raise circles" |

#### Trickster

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Sleight | The first blow each wave aimed at each Trickster misses. | "The first blow on each Trickster misses" |
| II (3) | Decoy Log | A Trickster brought below 25% leaves a decoy log and slips aside, once a wave (the existing `tricksterLog`). | "A Trickster brought low leaves a decoy" |
| III (4) | Hall of Mirrors | At each wave's start, each Trickster casts two mirror images beside it for 8 s: 25% of its health, half its attack. A foe that kills an image is dazed for 1 s. | "Each Trickster casts two mirror images each wave" |

#### Beast

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Pack Instinct | A Beast deals 5% more for each friend within 2 tiles, up to 20%. | "Beasts hit harder with friends near" |
| II (3) | Primal Roar | At each wave's start every Beast roars: foes within 2 tiles of it flee for 1.5 s. | "Each wave the Beasts roar foes away" |
| III (4) | Apex | A Beast that kills goes into a frenzy for 5 s: 40% faster, and each blow mends it 3% of its health. Another kill starts the 5 s again. | "Kills send the Beasts into a frenzy" |

#### Gunner

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Powder | A Gunner's shot splashes 25% of its damage onto foes beside its target. | "Gunner shots splash" |
| II (3) | Powder Kegs | At each wave's start three powder barrels (the board's own terrain) are set among the foes' front. A Gunner's shot sets them off. | "Powder kegs planted among the foes each wave" |
| III (4) | Bombardment | Every 10 s the Gunners call down four shells on the four foes farthest back: 1.2 times the party's might on the 3x3 round each. | "Every 10 s, shells fall on the foes' back rows" |

#### Assassin

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Backstab | A blow from behind (against the way the foe faces) deals 30% more. | "Blows from behind deal 30% more" |
| II (3) | Execute | An Assassin's blow on a foe below 15% of its health kills it outright (a boss below 6%). | "Assassins finish foes below 15%" |
| III (4) | Shadow Step | At each wave's start and after each kill, an Assassin vanishes for half a second and comes out behind the weakest foe within 4 tiles; its next blow is a sure crit. | "Kills step Assassins through the shadows" |

#### Support

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Field Medic | Every 2 s the hero lowest in health mends 3% of its health. | "The most hurt hero is always mending" |
| II (3) | Battle Hymn | Every 10 s the Supports sing to the whole party for 4 s: first a hymn of haste, then of guard (25% less damage), then of might (20% more), in turn. | "Every 10 s a hymn: haste, guard, then might" |
| III (4) | Rallying Cry | When a hero falls, every other hero mends 15% and gains 5 s of haste, and a life raises the fallen hero after 3 s instead of 5. | "A friend's fall rallies the rest; lives raise in 3 s" |

#### Vanguard

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Spearhead | Vanguards act and walk 25% faster for the first 8 s of each wave. | "Vanguards surge at each wave's start" |
| II (3) | Breakthrough | A Vanguard's first blow on each foe knocks it back a tile and staggers it for half a second. | "Each foe's first Vanguard blow knocks it back" |
| III (4) | Onslaught | 2 s into each wave the Vanguards leap into the foes' line together, each landing for 1.5 times its attack on the 3x3 round it and stunning those foes for 1 s. | "Each wave the Vanguards leap into the foes" |

#### Arcanist

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Runic Study | The king's spells hit (and heal) 15% harder. | "King's spells 15% stronger" |
| II (3) | Spell Sling | When the king casts a spell, each Arcanist whose pool is at least half full casts its skill at once. | "King's spells make Arcanists cast" |
| III (4) | Chronal Anchor | Once a wave, when the party's health first falls below 40%, time turns back 4 s for every hero: its health, place and pools return to where they were (the Time Witch's rewind, for the whole party). The fallen in those 4 s stand again without spending a life. | "Once a wave, time turns back 4 s for the party" |

#### Bulwark

| Tier | Name | The rule | Badge line |
| --- | --- | --- | --- |
| I (2) | Steadfast | Bulwarks cannot be knocked back, and no stun holds them longer than 1 s. | "Bulwarks cannot be moved or held long" |
| II (3) | Earthworks | At each wave's start each Bulwark raises a ruined wall (the board's own terrain) on the tile two in front of it, blocking the foes' walk and shots. It crumbles when the wave ends. | "Bulwarks raise walls before them each wave" |
| III (4) | Immovable | A Bulwark that has not moved for 2 s takes 40% less damage, and every hero beside it takes 20% less. | "Bulwarks standing firm shelter their neighbours" |

### The kinds, at a glance

So that the ladder is varied, here are the kinds of the top tiers: summons (Undead, Machine, Vampire, Trickster), battlefield strikes
(Wild, Pirate, Gunner, Vanguard), revives and death (Holy, Samurai, Arcanist), auras and formation (Knightly, Guardian, Bulwark, Warden),
on-kill chains (Beast, Assassin, Frontier, Royal), resources (Arcane, Mystic), conditions (Support, Blade, Marksman, Caster, Yokai). Terrain
appears in the middle tiers (Pirate tide, Gunner kegs, Bulwark walls, Holy ground, Caster ground, Frontier trail).

## How it is built (stage 2)

- **The data:** `TRAITS` keeps its shape. Each tier's `effects` names one perk (`perk: 'skeletons'` and so on) with its numbers, and its `text`
  is the badge line. A new `src/sim/traitPerks.ts` holds the rules: one function per perk for each of a few hooks (the wave's start, a
  tick, a blow dealt, a blow taken, a kill, a fall, a skill cast, a king's spell, the wave's end). `battle.ts` calls the hooks; a fight with
  no perks pays one check per hook. One switch, `TRAIT_PERKS = { on: true }`, so a tool can measure with them off.
- **Randomness:** almost none. Every rule above is a count, a timer or a nearest-first choice (ties by tile, then id). If anything needs a
  draw (the stampede's file when two are level, say), it takes its own side stream, `new Rng(mixSeed(seed, TRAIT_SALT))`, so existing fights
  draw the same.
- **The wave's start and end:** the run already knows both (`fight()` is a wave's start; `keepCharges` runs as a wave is won). The Last
  Stand has its own wave turns in `stand.ts`, which will call the same two hooks.
- **The summons:** new summon kinds (`skeletonRaised`, `spearRaised`, `archerRaised`, `sentry`, `thrall`, `mirror`), each `summon: true`
  with an `owner` of the trait (not a hero), sized from the party's might and health. They are not in `KEPT_KINDS`; the perk makes them
  again at each wave's start.
- **The page:** the deploy screen's trait row and the bench badges keep their places. Each counter reads "Undead 3/4 · Grave Rot" (the
  reached tier's name) and lights a pip per tier. A tap (and a long-press) opens the trait's full ladder in a standard ornate card
  (`ornateMenu`, `menuSection` per tier, "Close"): the three tiers, reached ones lit, each with its rule and the heroes of the trait you own.
  The daily's theme text and the codex read the same lines.
- **Old code:** the stat hooks for `atk`, `hp`, `guard`, `dodge`, `crit`, `speed`, `charge`, `mana`, `reach`, `leech` stay, because relics
  (`b.relics.team`) use the same `TraitEffects`. The traits simply stop filling them.

## Art and effects

Almost all of it reuses what the game has:

| Perk | Looks |
| --- | --- |
| Skeletons | the foes' sheets `skeleton_warrior`, `skeleton_spearman`, `skeleton_archer`, tinted to the party's side ring; rising: `beat-rise` with `death-bones` played backwards, `ground-dark` |
| Sentry turrets | **new art** (a small turret sheet, idle and fire); a stand-in until it lands: `robot_infantry`, still |
| Blood thralls | the slain foe's own sheet with a red tint and the side ring; `beat-appear-blood` |
| Mirror images, foxfire twin | the hero's own sheet, faded and tinted (as the decoy is); `beat-appear-light`, `beat-appear-fire` |
| Order's standard | the existing `summon_standard` |
| Stampede | the wolf sheets (`summon_wolf`, `summon_direwolf`) running a file, with `beat-dust-earth` |
| Broadside | `beat-sky-fire` shells down a file, `beat-crash-fire`; a ship's silhouette at the board's edge is **new art** (stand-in: none) |
| Bombardment | `beat-sky-fire` and `beat-crash-fire` |
| Onslaught | the Dragoon's jump arc and `beat-crash-earth` |
| Night Parade | a violet board tint (the weather layer) and `aura-spirits` |
| Hallowed ground, warding circle, Lingering Magic | `aura-pool-light`, `ground-*`, `beat-ring-light`, the element's `aura-pool-*` |
| Chronal Anchor | the Time Witch's rewind effect for each hero |
| The crown | **new art**: a small crown mark over the crowned hero (stand-in: the gold rank pip) |
| Powder kegs, ruined walls, shallow water, snares | the board's own terrain and trap looks |
| The rest | numbers, `beat-*` beats and status marks the fight already draws |

The three new pieces of art get ChatGPT prompts in `docs/notes/trait-perks-art-prompts.md` (pushed with this note).

## Balance

**The target:** each trait's top tier is worth about one extra hero (+8 to +15 win-rate points at a stage where the same five without
perks win half their fights), and no top tier above +20. Each tier I is worth +1 to +4. Today's tiers are worth +1 to +5, so parties get
stronger overall. The foes' tables will need a small lift afterwards (stage 2 measures by how much).

First estimates of the top tiers, as a share of a five-hero party's power (to be measured):

| About +20% (watch closely) | About +12 to 15% | About +8 to 10% |
| --- | --- | --- |
| Undead (three bodies), Holy (a free revive), Arcanist (the rewind), Vampire (two thralls) | Machine, Pirate, Gunner, Wild, Support, Trickster, Knightly, Mystic, Arcane, Vanguard | Samurai, Royal, Guardian, Bulwark, Blade, Marksman, Caster, Warden, Beast, Assassin, Frontier, Yokai |

The first column's numbers will likely come down (45% skeletons may become 35%) and the last column's go up.

**How it is measured:**

1. A new `tools/trait-perks/measure.mjs`, on the hero table's method (`tools/balance.ts`): for each trait and each tier, a party built to
   reach it (the trait's heroes plus fill-ins that wake nothing else) plays the same seeded fights with `TRAIT_PERKS.on` true and false, at
   a stage where the off party wins about half. It prints each tier's lift, and flags any top tier above +20 or below +6.
2. `npm run balance -- --runs-only` and `--no-tables --tiers` before and after, for the whole run's win rate and the tiers' clear rates.
3. `npm run balance -- --no-tables --stand` for the Last Stand, where the summons are rebuilt every wave of a long fight.
4. `node tools/assault-dev/run.mjs` for the Assault, and `npm run daily-rate` for the daily with its featured trait.
5. `npm run balance -- --duel` for the duel waves.

## How each perk plays in each mode

- **Ordinary waves and the Calamity:** as written. In the Calamity's ten heroes, two or three top tiers can stand at once. If the measure
  shows that too strong, the Calamity can cap it at two top tiers (the two with the most heroes).
- **Ten lives:** summons, turrets, thralls, images and the standard are never the party, so they never cost a life, and a party all down
  with only summons standing still counts as a party fall (as today). Holy III and Arcanist III raise heroes without spending a life;
  Support III shortens the wait from 5 s to 3 s; Undead I and Samurai III delay a fall rather than prevent it.
- **The Last Stand:** one long fight. "A wave" is each of its waves: summons rise and once-a-wave rules reset at each wave's start there.
- **The Assault:** one long fight on its big field with no waves, so the wave-start rules run once, at the start, and the once-a-wave rules
  happen once. The field strikes (stampede, broadside, bombardment) pick their file within the 16 tiles round the party's middle, so they stay
  cheap on the big field. A question for the owner below.
- **The daily:** the featured trait counts one hero more than it has (so three of the Undead on Grave Pact day raise the skeletons), in
  place of today's doubled bonus. The theme lines ("Four Beasts wake the pack: +16% attack") are rewritten to name the perks.
- **Duels:** the ring holds only the champion and the nemesis, so the perks that make summons, strike the field or change the terrain do not
  happen in the ring. The champion's own perks (Iaijutsu, Bleeding Edge, Backstab, Thirst, Steadfast, Death Poem and the like) do apply.
- **Foes:** the perks are the heroes' only. Nothing changes for the foes.

## Open questions for the owner

1. Is a ladder of 2, 3 and 4 right? A fourth tier at 5 (a whole party of one origin) could crown the five-hero traits, but it would mean
   a party with only one origin.
2. The skeletons rise at each wave's start and are not kept between waves (always three, always fresh). Is that the owner's "revive at the
   end of the wave"?
3. The Assault has no waves. Should the skeletons and the other wave-start perks rise once, or again every so often (say every 60 s)?
4. Pirate I pays a little gold. Is a perk that touches the run's economy all right, or should every perk stay within the fight?
