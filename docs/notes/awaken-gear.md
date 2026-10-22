# Awakening and gear sets

## Hero awakening (ranks 5 and 6)

Above the top shard rank (4 stars, 10 shards) a hero can be awakened twice (`src/sim/awaken.ts`, numbers in `awakenRules.ts`).

- **Path and cost.** Awakening I needs 16 shards in all and uses 6; Awakening II needs 26 and uses 10. The shards are taken from the
  pool the talents buy from (`shardsToSpend`), so the rank (derived from total shards) never drops. A step is taken by a button on
  the sheet, not automatically (so the show plays); `Meta.awakened` (`kind -> 1 | 2`) is optional and `readAwakened` cuts a save
  back to what its shards paid for. Rank 1 to 4 are unchanged (`MAX_RANK` stays 4; `heroRank` = shard rank + steps).
- **Stats.** `AWAKEN_MULT` 1.08 hp and attack a step, on top of the ranks' 1.05 each (`rankMult` reads ranks above 4 as steps).
- **Passive.** Each of the 45 heroes has its own (data in `PASSIVES`): one of the equipment's signature abilities (a different one for
  every hero, a name of its own), run by the existing `equipFx.ts` through `heroStats`. Step I switches it on at strength 0.6, step II
  makes it 0.85 (Mythic gear is 0.7). Knight Oathbound (unyielding), Samurai Thousand Cuts (crit bleeds), Kunoichi Smoke Step (unseen
  at the start), Archer Falcon Eye, Wizard Living Flame (burn), Ninja Monk Rising Fist (haste), Peasant Stubborn Heart, Lightning Mage
  Forked Sky (chain), Wanderer Road Song (heals ally), Kitsune Foxfire Curse, Karasu Hawk Dive, Yamabushi Mountain Wind (shockwave),
  Werewolf Blood Moon (kill charges), Minotaur Labyrinth Rage (stun), Satyr Wild Pipes (haste), Gorgon Stone Gaze (freeze), Samurai
  Commander Banner of the Dawn (rally), Paladin Last Bulwark, Cleric Warding Chime, Druid Evergreen (regen), Barbarian Berserk Heart,
  Ranger Briar Snare, Warlock Blood Pact (leech), Illusionist Mirror Step, Gunslinger Dead Eye (pierce), Shambler Rotten Plates,
  Rifle Bot Overclock, Mercenary Bounty Money, Mummy Sealed Wrappings, Buccaneer Grappling Hook, Wolf Bard Moonlit Verse (mana), Beastmaster
  Pack Hunt (splash), Kraken Mate Riptide (pierce), Lancer Couched Lance, Reaper Harvest, Time Witch Borrowed Hours, Arc Blade Arc
  Fragment, Dread Pirate Deathless Crew (revive), Siege Bot Shrapnel (burst), High Priestess Halo (aura), Queen Dragoon Wyrm Scales,
  Juggernaut Spiked Hide (reflect), Great Sage Starlit Mind, Demon Swordsman Executioner, Tyrant Gaze of Judgement (taunt).
- **Look** (`render/awakenLook.ts`, `awakenRig.ts`). The only pack variant not already used as a hero's form is the Werewolf's red
  sheet, so the **Werewolf** wears `werewolf_red` once awakened. **Every other hero is a recolour** of its top form (a hue turn of its own, richer
  colour at step I, brighter at step II); the packs' grades are already their three forms. The scenes (tavern, castle road, camp, hall) get
  the tone applied to the pixels once and cached (same maths as the CSS filter, so it works on iOS); the sheet uses a CSS filter; a
  fight draws it with a Pixi colour filter and a violet (step I) or gold (step II) halo (`Boost.awaken`, `Unit.awaken`; look only).
- **Sheet.** Stars plus two gems (`★★★★ ◆◇`), an Awakening panel (both steps, cost, what each gives, the passive in words, a progress
  bar and the button), and a one-shot show on the portrait (two rings, a flash and "Awakened"; no looping; still with reduced motion).
- **Duplicates always have a use.** Shards until a kind has 26 (ranks, both steps and the 3 talent points together use exactly 26), then
  a repeat pays 40 crowns (`Pull.crowns`). No rng is drawn differently, so every old pull sequence replays the same.

### Balance

`npm run balance -- --no-tables --climb --saves 60` (realistic climb, mean tries per army):

| | Orc | Undead | Beast | Wildwood | Labyrinth | Ogre | Infernal | Yokai | Golem |
|---|---|---|---|---|---|---|---|---|---|
| before (`--no-awaken`) | 2.7 | 2.5 | 2.8 | 3.9 | 3.2 | 2.7 | 2.4 | 2.1 | 2.7 |
| with awakening (the player awakens at once) | 2.7 | 2.5 | 2.8 | 3.9 | 3.2 | 2.7 | 2.4 | 2.1 | 2.7 |

Identical: in the realistic climb no hero reaches 16 shards (the player owns 41 different heroes by the last army), so awakening
changes the climb by 0.0 tries (limit 0.5). Awakening is for after the climb. As a stress test, `--force-rank4` (the five best heroes at
rank 4 from the start) gives 1.2 to 1.8 tries and `--force-awaken` (the same heroes awakened twice) 1.0 to 1.1, so the two steps are worth
about 0.5 tries on top of rank 4 in an army they should not yet be near.

## Gear: combining and sets

- **Combine** (`equipment.ts`: `combineGroups`, `combineItems`, `combineGroup`, `combineAll`). Three spare pieces of one base and grade make one
  of the next grade (Common to Mythic), keeping the best item level of the three. A bigger group uses its best three. Worn and Mythic pieces
  are never used. "Auto-combine all" goes up the grades, so a made piece joins the next group. Both are buttons in the equipment panel.
- **Sets** (`gearSets.ts`, 12 sets). Counted by base, whatever the grade. 2 pieces give a stat bonus, 3 keep it and add the strong tier (a stat
  and a signature ability at 0.55 to 0.7). Bonuses are folded into `equipStats` (and so capped like the rest); an ability a worn piece already
  carries is not added twice.

| Set | Pieces (weapon, armour, trinket) | 2 pieces | 3 pieces |
|---|---|---|---|
| Emberforged | Dragonbone Axe, Ember Robe, Ember Amulet | +5% attack | +4% attack, burning blows |
| Winter Court | Frostbrand, Silken Robe, Sapphire Ring | +8% charge | +3% crit, a crit freezes |
| Stormcaller | Stormcaller Staff, Mage Robe, Scrying Orb | +10% charge | +5% attack, chain lightning |
| Hunter's Kit | Hunter's Bow, Ranger's Cloak, Seer's Spectacles | +4% crit | +1 reach, bleeding shots |
| Vanguard | Spiked Mace, Plate Cuirass, Stone Idol | +1 def, +4% hp | +6% hp, taunting |
| Nightblade | Vampire Fang, Shadowcloak, Relic Shard | +4% dodge | +4% atk speed, blows heal |
| Shogun | Moonlit Katana, Lamellar, Warlord's Drum | +4% attack, +3% hp | +3% crit, a crit bleeds |
| Radiant Order | Runed Blade, Sunforged Aegis, Healer's Lyre | mends 0.3% hp/s | +5% hp, a healing aura |
| Gravewalker | Reaper's Scythe, Bone Armour, Ruby Ring | +4% attack, +4% resist | +4% hp, kills heal |
| Wyrmblood | Ashen Spear, Dragonscale Mail, Phoenix Feather | +5% hp, +4% resist | +4% attack, scorching the attackers |
| Windrunner (2) | Leather Jerkin, Boots of Haste | +6% move, +3% atk speed | none |
| Scholar of Ash | Grimoire, Sage Vestments, Scholar's Scroll | +8% charge, +4% resist | +5% charge, steady charge |

- **Equip best** (`bestFor`) now picks the best of the three slots together: the best item of each base per slot, every combination scored as
  the pieces' scores plus the sets' worth (`setScore`). A slot changes only when the whole beats what is worn; ties go to the older item.
  Taking from other heroes and locked ids work as before; `equipAll` is unchanged on top of it.
- **UI.** The equipment panel shows the sets the hero wears (count, pieces lit, tiers lit), an "All sets" list, a set hint on each spare
  piece in the picker (`Shogun set: 1 -> 2 of 3`), and Combine / Auto-combine all.

## Tests

`test/awaken.test.ts` (steps, costs, shards pool and talents, stats, unique passives, the fight stats, the pull overflow, saves, looks and
pixel toning) and `test/gear-sets.test.ts` (set data, tiers, fight stats, equip best with sets, determinism, combine and auto-combine, saves).
Screenshots: `docs/samples/awaken-gear-*.png` (`node tools/awaken/shots.mjs`).
