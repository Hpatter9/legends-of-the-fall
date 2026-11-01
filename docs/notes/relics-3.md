# The Eidolons' reliquaries, step 2 of the relics redesign (RELICS-3)

The owner approved `docs/notes/relics-redesign.md`; step 1 (the keep's chapters and Storied relics) is `relics-2.md`. This is step 2: the
Calamity's old sets (Storm, Earth, Blood, Star, Rift) become **eighteen Eidolon relics in six reliquaries of three**, found only in the
Calamity (its shops, chests, elites and bosses; the Last Stand and the road no longer offer them). Branch `claude/relics-3`.

## The relics (`src/sim/relicSets.ts`, `SET_RELICS` and `SETS`)

Rarity `eidolon` (a purple frame on the card; drawn as often as a Common). Numbers as tuned (see Balance); the lore is the plan's.

| Reliquary | Relic (id) | Rule |
|---|---|---|
| Askel | Cinder Collar (`cinderCollar`) | +14% attack; heroes heal 20% less (price) |
| | Hound's Ash-Tooth (`ashTooth`) | a hero's kill gives it +4% attack for the fight, to +20% |
| | Ember Brand (`emberBrand`) | +10% crit; crits leave the foe burning |
| | two | +3% attack |
| Nivra | Rime Pearl (`rimePearl`) | foes that strike a hero are slowed 5% for 2 s |
| | Wyrm's Breath Vial (`wyrmVial`) | skills charge 10% faster; the first skill of a fight freezes the foe it struck for 1 s |
| | Glacier Step (`glacierStep`) | slip 2% of blows, 6% while standing still |
| | two | heroes take 3% less damage |
| Aurelan | Mane-Gold Thread (`maneThread`) | +6% hp; the first hero under a quarter health heals 15% (once a fight) |
| | The Dawn Chart (`dawnChart`) | the king's mana fills 35% faster |
| | Lion's Oath-Ring (`oathRing`) | heroes heal 2% of their health whenever a foe falls |
| | two | +3% hp |
| Voltara | Thunder Horn (`thunderHorn`) | heroes act and walk 6% faster |
| | Copper Torc (`copperTorc`) | skills charge 30% faster; 2% less hp (price) |
| | Tempest Ring (`tempestRing`) | +6% crit; every sixth blow strikes a second foe nearby (60% of the blow) |
| | two | heroes act and walk 3% faster |
| Gorm | Granite Heart (`graniteHeart`) | +10% hp; 3% slower (price) |
| | Quarry Gauntlet (`quarryGauntlet`) | 5% less damage; 10% for heroes who have not moved this fight |
| | Moss Bell (`mossBell`) | heroes heal 0.5% of their health a second |
| | two | +3% hp |
| Vaelkhar | Void Shard (`voidShard`) | +8% attack; +12% against the Calamity's guardians |
| | Dragon-King's Sigil (`dragonSigil`) | skills and ultimates charge 15% faster |
| | Doom Helm (`doomHelm`) | 6% less damage; the foes wait half a second |
| | two | the foes wait a third of a second |

The rules beyond plain numbers are new `RelicHooks` (`healLess`, `killAtk`, `critBurn`, `foeSlow`, `firstFreeze`, `stillDodge`, `rescue`,
`killHeal`, `echoEvery`, `stillGuard`, `regen`, `guardianAtk`, `ultPace`), each read at one place in `relicFight.ts` (the start of a fight,
`relicBlow`, `relicTaken`, `relicDodge`, `relicFall`, plus `relicHurt`, `relicStruck`/`relicFoeSlow`, `relicSkill`, `relicEcho`) with a
call in `battle.ts`, `abilities.ts` and `spells.ts`. None draws a random number, so no other draw moves.

## The bound echo

All three of a reliquary (the Unfinished Chronicle counts one more) switch on `set.echo`. Then, for that Eidolon only:

- the War Horn fills 25% faster (`hornEcho`, applied where the page adds a settled fight's gain: `main.ts`), when it is the Eidolon chosen to answer the horn;
- its rider lasts half as long again (`riderLong` in `eidolons.ts`: the burn, warmth, freeze, boss slow, shield, stone skin, boss stun and drain). Voltara's rider has no duration (it fills the meters and the mana at once), so it is half as large again.

## Old saves

`RELIC_BOOK` is 3. `RELIC_RENAMES` maps the old Calamity ids to the new (the plan's table); the two merged pairs (Moss Amulet and Earthen
Bell, Blood Vial and Ruby Locket) keep one and pay 70 gold back. A run saved in the second catalogue is moved on; the prep screen's line
shows only if a relic actually changed (a first conversion still shows it). Ordinary run, tower/Calamity slot and Last Stand save all go
through `convertRelics`. The Last Stand keeps a converted Eidolon relic it held but is no longer offered new ones.

## Icons

Placeholders: the old Calamity DawnLike tiles, renamed to the new ids in `src/art/items/` (`star_chart`, `rift_shard`, `cloud_treads`
and `blood_vial` are kept as copies, as the events, castle and quest art use them). The painted icons come later.

## Balance

`npm run relic-balance` now includes the Eidolon relics. Target: each about a Common (the old Whetstone's lift), as the plan sets no
separate Eidolon target. Cell `undead:18:15`, 300 fights (about 3 points of noise), lift over no relic, in points; Whetstone +5.0:
first pass then tuned; the second pass (before the last four small changes) read Collar +5.7, Ash-Tooth +4.3, Brand +2.3, Pearl +7.7,
Vial +4.7, Glacier +4.7, Mane-Gold +7.7, Dawn Chart +1.7, Oath-Ring +4.0, Horn +5.0, Torc +1.0, Tempest +7.3, Granite +5.7,
Quarry +7.0, Moss Bell +8.3, Shard +5.0, Sigil +5.7, Doom Helm +5.3. Then Brand, Dawn Chart, Torc raised and Moss Bell trimmed.
The Void Shard's guardian bonus does not show in this cell (no guardians).

Calamity sweep (`npm run balance -- --no-tables --calamity --attempts 36`, the same command on main 0.304.0 and this branch; mean maps, map 1/2/3 cleared): main 1.83 (100% / 81% / 3%), this branch 1.75 (97% / 75% / 3%). The difference is within the noise of 36 runs; the Calamity stays where it was.

## Checks

`test/relics-3.test.ts` (new): the eighteen and their reliquaries, the two and three bonuses, the echo (horn and rider), each rule, the
conversion, the draw. `test/elites.test.ts` and `test/relics-2.test.ts` follow the new counts. `tools/relics/eidolon-shots.mjs`: the
card at 393x852 (`docs/samples/relics-3-*.png`).

## Open questions

1. Eidolon relics' power target (aimed at Common level).
2. Voltara's echo makes her rider half as large again, since it has no duration.
3. The Void Shard's guardian bonus is not measured by the classic-army sweep.
