# The Eidolon chains, made hard (Q9)

The owner's call (`quests-design.md` section 5): each of the six chains becomes a four-to-five-star Campaign. Nothing is reordered or removed,
so a chain in progress keeps its part; every old part is hardened in place and two new parts are appended after the old three (before the
trial or binding). Every id is kept. A chain now has five parts (six steps with its trial; Askel has no trial).

Stars and length (for the quest log; chains are not in `STAR_TABLE`): all six are Campaign length. Askel, Nivra and Aurelan are 4 stars;
Voltara, Gorm and Vaelkhar are 5 stars. The chain battles open at about 4 stars of difficulty and the trials at 5; Askel's finale battle
(The Kennel Fires) stands at 4.

## The parts

The chain engine counts one `Goal` per part, so all the extra difficulty is riders (`tier: 1` is Hard, `flawless`, `noHeart`, `noHires`,
`noSpells`, `noUlts`, `mode`).

| Chain | 1 (hardened) | 2 (the battle) | 3 (hardened) | 4 (new) | 5 (new) |
| --- | --- | --- | --- | --- | --- |
| Askel | the Orc Warlord on Hard, flawless | Kennel Fires | the Bone Captain on Hard, no hires | Orcs cleared on Hard, no heart | 6 Hard army waves, no ultimate |
| Nivra | a Beast boss on Hard, flawless | Glass Mere | 5 waves, no spell and no ultimate | Beasts cleared on Hard, no heart | 2 Beast bosses on Hard, no spell |
| Aurelan | a Wildwood boss on Hard, flawless | Sunless Shrine | 4 Hard army waves, flawless | Wildwood cleared on Hard, no heart | 2 Wildwood bosses on Hard, no hires |
| Voltara | a Labyrinth boss on Hard, flawless | Copper Works | 6 ultimates in army fights, no spell | Labyrinth cleared on Hard, no heart | 2 Labyrinth bosses on Hard, flawless, no hires |
| Gorm | an Infernal boss on Hard, flawless | Buried Foundation | 25,000 damage taken in Hard army fights, flawless | Infernal cleared on Hard, no heart | 5 Hard army waves, flawless, no hires |
| Vaelkhar | 2 Calamity guardians, flawless | Guest Wing | 200,000 damage dealt in Calamity fights, no spell | Calamity cleared, no heart, no spell | 3 guardians, flawless, no ultimate |

New pieces (art borrowed from existing gear icons): the Huntsman's Whistle, the Hearth-Brand, the Frozen Tear, the Wyrm's Lullaby, the Morning
Ring, the First Cock's Spur, the Storm-Rod, the Last Spark, the Goat's Bell, the Mason's Plumb-Line, the Violet Seal, the Open Ledger. Each new
part pays a bronze chest like the old ones; the binding's gold chest is unchanged. The crown and stone pay from the Campaign row is for the
quest-pay batch to attach if wanted (the chain engine pays chests only).

## Battles and trials (`npm run quest-rate`, 24 tries, its outdated probe party; a rough guide)

| Fight | ease before | ease now | probe win rate before / now |
| --- | --- | --- | --- |
| The Sunless Shrine | 0.78 | 0.82 | 42% / about 33% |
| The Copper Works | 0.76 | 0.97 | 67% / about 30% |
| The Buried Foundation | 0.24 | 0.28 | 58% / about 35% |
| The Guest Wing | 0.21 | 0.22 | 33% / about 33% |
| Voltara's trial | 0.60 | 0.65 | 75% / about 15% to 20% |
| Gorm's trial | 0.27 | 0.285 | 25% / about 25% |
| Vaelkhar's trial | 0.215 | 0.22 | 25% / about 15% |

Left alone because the probe already wins 0 to 17% of them (the probe plays at the army's own level with no talents, so it undersells the
early fights most): The Kennel Fires (1.6), The Glass Mere (1.15), Nivra's trial (0.97), Aurelan's trial (0.68). A real save is stronger than
the probe, so these need a look with a save-like probe.

## Older saves

`readChainState`: a save that had finished the old three parts and won the trial (or was bound) counts as finished. A save that had only the
three pieces carries on at the first new part. Progress counts already made stay, even where a goal now asks for riders (counts made before
the rider are kept; only new fights are held to the rider).
