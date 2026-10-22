# No rarity, and the starter pick

The owner's call: heroes have no tiers any more. Every hero is equally strong overall and useful in its own way; summons are
equal odds; a new save picks one of three starter packs. (This replaces `rarity.md`, which described the old five tiers.)

## What went

- `UnitDef.rarity`, `Rarity` for heroes, `rarityOf`, `tierMult`/`TIER_MULT`, `RATES`, `PITY`, `MYTHIC_PITY`, `MYTHIC_SIZE`,
  `kindsOf(rarity)`, `Pull.rarity`, the hero-rarity part of chests (`armyStars.ts` drew shards and recruits by tier).
- Look: the `.r1`–`.r5` frames and colours on the bench, party, heroes list, collection, hero sheet and summon cards; the
  rarity tags and ribbons; the Mythic aura, ember trail and entrance burst on the board (`unitView.ts`); the tavern's gems;
  the full-page rarity flash (`rarityFlash`); the cards' beams, tease and tremble. `cardb-r*.png` and the crystal and
  fire pillar sheets were deleted.
- **Gear keeps its own five grades** (Common to Mythic items, `equipment.ts`): they are not hero rarity, and the owner's
  list was about heroes. `RARITY_NAMES` and `Rarity` moved into `equipment.ts` for it, and `.r1`–`.r5` / `--rc` stay in
  the CSS for gear only. Say if gear should lose its grades too.
- The eight heroes that have an ultimate (Kitsune, Karasu Tengu, Yamabushi Tengu, Gorgon, Samurai Commander, Great Sage,
  Demon Swordsman, Tyrant) keep it as part of their kits. They get no extra power for it and no size bump (`size` is no
  longer set by `gradeBoost`). Their ultimate meter on the board is now violet (gold when ready) instead of crimson.

## Summons

- Equal odds: `pullOnce` picks one of the 45 heroes with the pull's side stream, `rng.pick(ALL_HEROES)`.
- Pity became a **fair "a hero you do not own yet" helper** (it was five lines): after `NEW_PITY` (12) pulls in a row that
  gave a hero already owned, the next pull is drawn from the heroes not owned yet (while any are left). Counter
  `Meta.sinceNew`. A repeat still gives a shard. `dry` and `dryMythic` are no longer read or written; old saves keep
  them untouched in the JSON.
- Chests: shards and recruits are drawn from all heroes with equal odds (the 10-star chest still always holds a hero). A
  chest not yet opened rolls from its fixed seed, so its heroes may differ from what the old code would have rolled.
- The summon show (`summonRules.ts`, `hall.ts`): **one strong show when the pull holds a new hero** (gold beam, ribbon
  "SUMMONED", a "NEW HERO" banner and a showcase pose for the first new hero, quick showcases for the other new ones in a
  ten-pull), **the plain hall show when it is all repeats** (shards shown in the reveal). Nothing flashes: the white
  flash, the heartbeat and the silhouette are gone, and the room only brightens in a soft swell. Cues are `riseSummon`,
  `stingSummon`, `slam` (the Epic and Mythic cues were deleted). The reveal cards (`gacha.ts`) flip in order with the new
  heroes last; a new hero's card has a steady gold glow.
- Hall and recruit page text: "Every hero is as likely as any other. A new hero is sure within N pulls."

## Starter pick

- `src/sim/starter.ts`: every hero has a class (Front-liner, Striker, Shooter, Caster, Support). `starterPacks(seed)` draws
  three packs from the side stream `mixSeed(seed, 0x57a47)`: pack i is one front-liner, one striker and one back-liner;
  the back-liners are one shooter, one caster and one support in random order, and no hero is in two packs.
- `newMeta(seed)` is now a save with **no heroes** and `Meta.starter = { packs, pick: null }`. `pickStarter(meta, i)`
  unlocks exactly that pack and makes it the party. `loadMeta` leaves a save without a `starter` field alone (it keeps
  the old five and everything it recruited, levels, shards, gear and talents) and does not force the five on a save that
  has one. `startedMeta(seed)` is the old five-hero save that the tests and tools play with.
- Start over wipes the meta, so the next load is a new save and shows the pick.
- `src/starter.ts` draws the full-screen pick (`#starter`, styled in the file like `hall.ts`): three pack cards with
  portraits, names, class tags and role lines, tap a pack and then "Start with this pack". An address with `?seed=` (a test
  page) takes pack 0 without asking. After the pick the home screen opens and the first-run tips begin as before.
- The daily challenge keeps its fixed starting five (so every player faces the same day).

## Balance

All 45 heroes were retuned with `tools/balance.ts --heroes-only` (random five-hero teams, six bands in turn, stage 5 foes).
Each hero's hp and attack were scaled together (shape kept, stats rounded) until its win rate was near the roster average;
then every hero was scaled together so the whole roster's strength sat where the early-game tests need it. The tuning
loop was a throwaway script; the result is in `units.ts`.

- Before: with the tiers, the average team won 95% and the hero lifts ran from -5.4 to +5.0 (Mythics up, Commons down).
- After: the average team wins about 53%, every hero is within 4 points of the average on the tuned fights (12000 games,
  `heroLifts(12000, 5)`) and on fights it was not tuned on (20000 games, `--seed-offset 500000`; worst lift about 3.5, best-to-worst
  spread under 8 points). `test/hero-balance.test.ts` holds the first set.
- The overall level dropped on purpose-less grounds: the tiers were worth +8% to +40% hp and attack, and are gone. The five
  starting heroes had to stay about where they were for the early tests (`foes.test.ts` bands, `armies.test.ts` pacing), so
  the whole roster is about where a Common was, not where the average tier was.
- **Heads-up for the director:** the late campaign is harder for a recruited party. Realistic climb (`--climb`, 60 saves),
  mean tries per army before / after: Wildwood 1.9 / 5.1, Labyrinth 2.2 / 5.6, Ogre Clans 1.9 / 5.0, Infernal Host 2.0 / 7.5,
  Yokai 2.5 / 7.7, Golem Forge 3.2 / 7.7; clear rate of Golem Forge 100% / 77% (25 tries). The first three armies are
  unchanged (2.3 / 2.7, 2.4 / 2.6, 1.7 / 2.7). The old curve leaned on tiers for that growth; a lever (hero ranks, levels,
  castle) is the place to put it back if wanted. Whole runs on the starting five are unchanged in the first armies and a
  little harder later (`--runs-only`).

### Table: every hero before and after

Lift = the hero's win rate with it in the team, minus the roster average, in points. "Before" is the old game (tiers on,
4000 games, average 95.4%); "after" is the tuned fights (12000 games, average 52.7%); the last column is 20000 other fights.

| Hero | Old tier | hp / atk before | hp / atk after | Lift before | Lift after | Lift on other fights |
|---|---|---|---|---|---|---|
| Knight | Common | 380 / 17 | 270 / 11 | +1.8 | +0.8 | -1.8 |
| Samurai | Common | 225 / 31 | 200 / 28 | +1.4 | +0.9 | -0.9 |
| Kunoichi | Common | 178 / 17 | 195 / 19 | -5.2 | +0.2 | -0.3 |
| Archer | Common | 158 / 26 | 180 / 29 | -5.4 | -1.4 | -2.3 |
| Fire Wizard | Common | 135 / 30 | 145 / 33 | -3.9 | +1.4 | -1.2 |
| Ninja Monk | Rare | 250 / 17 | 250 / 16 | -0.1 | +0.6 | +0.5 |
| Peasant | Common | 300 / 18 | 315 / 18 | -4.6 | -0.0 | +0.5 |
| Lightning Mage | Epic | 150 / 34 | 160 / 37 | +0.3 | -0.3 | -0.8 |
| Wanderer | Rare | 165 / 16 | 150 / 15 | -1.6 | -0.3 | -0.1 |
| Kitsune | Mythic | 200 / 22 | 190 / 20 | +4.1 | -0.0 | -1.0 |
| Karasu Tengu | Mythic | 200 / 30 | 200 / 30 | +4.2 | -0.3 | -1.0 |
| Yamabushi Tengu | Mythic | 300 / 20 | 250 / 17 | +4.2 | -0.4 | +0.2 |
| Werewolf | Legendary | 200 / 23 | 210 / 24 | +1.2 | +0.8 | +0.6 |
| Minotaur | Epic | 310 / 24 | 280 / 22 | +2.4 | -1.1 | +2.1 |
| Satyr | Rare | 240 / 21 | 265 / 24 | -1.3 | -0.4 | +1.6 |
| Gorgon | Mythic | 200 / 26 | 205 / 27 | +2.1 | -0.5 | -0.5 |
| Samurai Commander | Mythic | 260 / 26 | 240 / 24 | +4.4 | +0.5 | -1.0 |
| Paladin | Epic | 300 / 15 | 255 / 13 | +0.5 | -0.6 | -0.5 |
| Cleric | Rare | 235 / 13 | 220 / 13 | -2.3 | -0.4 | +0.0 |
| Druid | Epic | 200 / 17 | 225 / 19 | -0.9 | -0.4 | +1.3 |
| Barbarian | Rare | 265 / 22 | 240 / 21 | +0.0 | -0.4 | -0.6 |
| Ranger | Rare | 165 / 25 | 185 / 27 | -4.9 | -0.2 | +2.6 |
| Warlock | Legendary | 185 / 27 | 185 / 27 | +0.6 | -0.4 | +1.7 |
| Illusionist | Epic | 175 / 18 | 180 / 18 | +0.7 | +0.5 | +1.1 |
| Gunslinger | Legendary | 145 / 42 | 135 / 40 | +0.8 | +0.2 | +2.1 |
| Shambler | Common | 300 / 16 | 280 / 16 | -2.4 | -0.7 | -3.1 |
| Rifle Bot | Common | 160 / 27 | 155 / 27 | -4.1 | +0.0 | -0.0 |
| Mercenary | Common | 215 / 24 | 205 / 23 | -1.6 | -0.0 | +2.3 |
| Mummy | Common | 270 / 17 | 285 / 19 | -2.2 | -0.3 | +0.8 |
| Buccaneer | Common | 210 / 23 | 225 / 24 | -3.3 | +0.5 | -1.7 |
| Wolf Bard | Rare | 230 / 22 | 235 / 22 | -1.2 | +0.1 | -1.9 |
| Beastmaster | Rare | 205 / 18 | 195 / 17 | -1.1 | +1.7 | +4.0 |
| Kraken Mate | Rare | 280 / 20 | 275 / 19 | -0.9 | +1.5 | +1.2 |
| Lancer | Rare | 230 / 25 | 230 / 24 | -1.4 | +0.1 | +1.6 |
| Reaper | Rare | 170 / 26 | 180 / 27 | -1.9 | -0.5 | -2.0 |
| Time Witch | Epic | 185 / 27 | 190 / 28 | -0.3 | -1.2 | -0.4 |
| Arc Blade | Epic | 200 / 24 | 205 / 24 | +0.9 | +1.5 | -1.1 |
| Dread Pirate | Epic | 265 / 21 | 255 / 21 | +1.2 | -0.5 | +3.6 |
| Siege Bot | Epic | 200 / 34 | 200 / 33 | +1.5 | +0.5 | +0.4 |
| High Priestess | Legendary | 245 / 19 | 225 / 18 | +2.6 | +0.2 | -0.4 |
| Queen Dragoon | Legendary | 225 / 24 | 220 / 24 | +2.6 | +0.4 | +0.3 |
| Juggernaut | Legendary | 365 / 20 | 335 / 19 | +1.6 | -0.2 | +2.9 |
| Great Sage | Mythic | 205 / 33 | 185 / 29 | +3.6 | -0.1 | -2.4 |
| Demon Swordsman | Mythic | 215 / 23 | 200 / 22 | +4.0 | -1.0 | -3.6 |
| Tyrant | Mythic | 255 / 23 | 230 / 20 | +3.7 | -0.7 | -2.7 |

## Tests

- Deleted `test/rarity.test.ts`; its ultimate tests live on in `test/ultimates.test.ts` (the eight ultimate heroes by name,
  not by tier). The tier, rate, pity and tier-multiplier tests are gone with the rules they checked.
- `test/meta.test.ts`: the rate and pity tests became "every hero is as likely as any other" (45000 pulls, each within 130 of
  1000) and the fair-helper test; a new save has no heroes.
- `test/starter.test.ts` (new): the packs are deterministic and distinct, a mix of classes, every hero is offered
  sometimes; the pick unlocks exactly the pack; old saves keep their heroes; a first run starts from any pack.
- `test/summon-fx.test.ts` rewritten for the two shows (new hero, repeats), no flash, caps and reduced motion.
- `test/hero-balance.test.ts` (new): every hero within 4 points of the roster average (`tools/heroSweep.ts`, shared with the
  balance tool). It takes about 30 s: when a hero changes, retune rather than loosen it.
- `test/armyStars.test.ts`: the chest tests that expected rarer heroes in richer chests now check the 10-star chest always
  holds a hero and every hero is as likely as any other.
- `test/new-heroes.test.ts`: "any team of five new heroes" now builds teams from the starter packs (the three hand-picked
  teams were chosen for the tier bonus; one is genuinely weak without it at plain placement).
- Fixture numbers that were tied to the old stats now read them: the capstone test's knight (about 76 hp, from
  `UNITS.knight.hp`) and the gear test's knight hp. `test/talents.test.ts`: capstones are checked for the heroes that have
  an ultimate. Every other test only changed `newMeta` to `startedMeta`.
- `tools/scenes/summon-shots.mjs` plays the new shows; `tools/no-rarity/shots.mjs` made the pictures in `docs/samples/no-rarity-*.png`
  (starter pick at 393x852 and 360x780, the pick taken and the home screen after it, the hall, a summon, a hero sheet).
