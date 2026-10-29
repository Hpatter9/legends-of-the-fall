# The tier skills do what their words say

The owner's answer to two RANK4-SKILLS findings, "Make them work": every tier 2, 3 and 4 skill now does in a fight what its line on the hero
card and in the codex promises. Nothing else was retuned: the grade multipliers and the economy are `claude/merge-two`'s, and the harder late
game the owner asked for comes after this. The numbers below are for that retune.

## What changed

- **Cast modifiers go off with the improved skill** (`src/sim/tierSkills.ts`, `ON_CAST`). A tier skill's `castHeal`, `castShield`,
  `castHaste` and `refund` ("he is shielded", "heals him", "hastens her", "gives back some charge") are no longer merged into the hero's talents,
  where a kitted hero's cast effects only go off with skill 2 and the ultimate (and a refund with either skill). `runRiders` fires them when the
  skill the tier skill improves goes off (skill 1; skill 2 for the Cleric and the Wanderer, whose tier skill is on it), before the riders. Talents
  are untouched (their cast effects still go off with skill 2 and the ultimate, as the hero kits' note set out).
  - The heal is that share of max hp, the shield that share of max hp for 3s (a bigger shield it already has is kept), the charge back is in the
    old meter's points through `gain` (a kitted hero takes `CHARGE_TO_POOL` of it into its pool: "30 charge" is 30).
  - The haste is **added** to any haste the hero has, the skill's own included: the Lancer's charge already hastens him for 3s, so Longer
    Charge's 0.7s did nothing before; it now rides 3.7s ("and he rides faster for longer after it"; it said "the riders are hastened").
- **`extra` gives that many follow-ups** (`followUp` in `abilities.ts`): "two more volleys follow" is two, each 70% of the first and half a
  second apart (Archer, Fire Wizard, Dread Pirate, Siege Bot, Tyrant). It used to make one, whatever the number. Talents that give `extra`
  ("a second, smaller one") read the same.
- **A volley's and a judgement's `reach` widens the patch** (`landArea`'s `r`, `Pending.r`, the `area` event's `r`; `fx.ts` draws the wider
  patch): reach 1 is a 5x5, 2 a 7x7. The Archer's "over a wider patch" and the Tyrant's "a tile wider" did nothing before (the patch was always
  3x3). A broadside's, a shell's and a meteor's reach is still how far they carry.
- **Holds and slows that a skill's own covered** (the audit's other finding). The Minotaur's, Ninja Monk's, Arc Blade's and Juggernaut's
  skills set their own stun on what they hit, and the Kraken's its own slow, from the same moment as a tier skill's `skillStun` or `skillSlow`,
  so "stunned longer", "a longer stun", "holds longer" and "slows longer" did nothing. Those entries now lengthen the skill's own hold or slow
  (`dur`, the same milliseconds as a share of it: 175 ms of a 1.5s stun is `dur: 0.12`). The Lightning Mage's, Yamabushi's and Kraken's
  `skillStun` (on skills that do not stun of their own) were already true and stay.
- **Counts in the words:** the Ranger's Fourth Snare "lays three more traps" laid two (four in all: its name was right), and tier 4 "four more"
  laid three; the words now say two and three.
- **Tier 4 echoes kept sensible on top:** with three volleys now really falling, Sky Darkened's and The Iron Throne's whole second fall is
  lighter (echo 0.55 and 0.45 down to 0.2; their words say "a lighter rain" and "a lighter verdict"). No other entry's numbers moved.

The audit (every tier 2, 3 and 4 line against what its hero's skill reads: `reach`, `dur`, `extra`, the cast modifiers, the stuns and slows, the
riders) found nothing else untrue. Two looser readings stay: the Kitsune's "fox fire ... burning the foes near" is a ring of fire damage, not a
burn ailment, and the tier 4 lines' "far harder" are the `pow` numbers.

## Tests

`test/tier-skills.test.ts`: a tier skill's cast modifiers are not talents and go off with skill 1 (Iron Wall shields the Knight on Shield Wall);
the haste adds to the skill's own (Longer Charge, 3.7s), the heal goes off (Savage Ravage); "two more volleys" are two follow-ups and a reach
widens the patch (Archer grade 1, 2, 3; the Fire Wizard, Dread Pirate and Tyrant at tier 3); a widened volley strikes two tiles from its
centre; no tier skill's stun or slow sits under a skill's own. **Changed for the owner's requirement:** `test/fixtures/ailment-logs.json`
(the ailment model's proof): its `army`, `daily` and `tower` scenarios, whose merged heroes' tier skills now play differently, are re-recorded
(the comment in `ailments-identical.test.ts` says so); every other mode still plays as before.

## Balance, before and after (for the late-game retune)

Measured on main 0.224.0 (`claude/merge-two` merged: two of a kind, `MAX_GRADE` 4, `GRADE_BOOST` [1, 1.3, 1.6, 2.4]) and on this branch merged
with it, the same fights both ways. The hero table: `npm run balance -- --heroes-only --hero-grade G --hero-stage S [--hero-level 30]`, four runs
of 4,000 random teams on seed offsets 0, 100000, 200000 and 300000 (16,000 fights, about 1.2 points of noise per hero). The lift is a hero's win
rate in the teams that had it, against the roster's average. Each hero's own tier 4 step: `node tools/rank4/run.mjs --stage S --games 400
[--level 30]` (400 fights, the hero at tier 4 and then at tier 3, the other four at tier 4 both times).

| Grade, level, stage | Average win rate | Spread of lifts | Beyond 6 after (before) | Moved most |
| --- | --- | --- | --- | --- |
| 2, level 1, stage 9 | 34.0% → 35.9% | -4.4..+16.1 → -4.6..+15.5 | Knight +10.3 (+11.9), Wolf Bard +6.7 (+7.1), Beastmaster +16.1 (+15.5) | Tyrant +4.3, Kunoichi +2.0 |
| 2, level 30, stage 140 | 18.2% → 18.8% | -6.1..+6.1 → -5.8..+6.1 | Fire Wizard +6.1 (+6.1) | Knight +2.1, Tyrant +1.8 |
| 3, level 1, stage 12 | 57.0% → 61.8% | -7.1..+16.9 → -6.7..+14.8 | Knight +13.5, Beastmaster +14.8, Arc Blade +12.4, Samurai +9.6, Peasant +8.6, Wolf Bard +6.8, Kunoichi +6.1, Minotaur -6.5, Buccaneer -6.7 (all but the Kunoichi out before) | Tyrant +7.8, Juggernaut +3.9, Archer +2.9 |
| 3, level 30, stage 173 | 31.9% → 33.1% | -6.7..+13.0 → -8.1..+13.5 | Siege Bot +13.5 (+13.0), Dread Pirate +11.9 (+11.6), Archer +7.4 (+5.6), Fire Wizard +6.8 (+6.5), Mummy +6.5 (+4.2), Karasu -8.1 (-6.7), Mercenary -7.0, Minotaur -6.9, Werewolf -6.2, Buccaneer -6.1 | Juggernaut +3.3, Knight +2.6, Mummy +2.3 |
| 4, level 1, stage 24 | 41.8% → 47.4% | -7.0..+11.7 → -8.3..+11.6 | Knight +11.6 (+11.7), Tyrant +10.7 (-0.1), Karasu +9.9, Beastmaster +9.6, Demon Swordsman +7.7, Wolf Bard +7.5, Peasant +7.2, Arc Blade +6.0, Gunslinger +6.0, Kitsune -8.3, Great Sage -8.3, Lightning Mage -7.6, Druid -6.7 | Tyrant +10.8, Juggernaut +6.3, Archer +3.7 |
| 4, level 30, stage 260 | 46.1% → 47.8% | -7.6..+10.0 → -7.5..+9.6 | Dread Pirate +9.6 (+10.0), Siege Bot +7.8 (+7.6), Juggernaut +7.6 (+1.3), Great Sage +6.8, Archer +6.4 (+4.4), Karasu -7.5 (-7.6) | Juggernaut +6.3, Knight +3.0 |

(Grade 2 and 3 at level 1 were also run at stages 13 and 16, where the average was 4% and 11%, too hard to read; the rows above are at easier
stages.)

- **What the fixes cost:** the party wins about 2 to 6 points more at the same stage, most at level 1 (more of each fight is skill 1 there).
- **The movers are the promises that did nothing before:** the Tyrant (its judgements now really fall wider, and two more of them), the
  Juggernaut (its quake's hold now really lengthens: tier 4's "holds far longer" is `dur` 0.42 of a 1.2s hold), the Archer (two more volleys, a
  wider patch), the Knight (his shield now comes with Shield Wall). Every other hero moved by less than about 2.5 points, within the noise.
- **Tier 4's own step** (grade 4): level 1 a mean +4.4 → +5.0 points of wins (from 0.0 to +17.8; the Tyrant +6.8 → +15.0, the Archer +2.5
  → +7.5, the Werewolf +13.8 → +17.5, the Demon Swordsman +14.2 → +10.2); level 30 +2.6 → +2.3 (from -0.2 to +6.8). The party at tier 3 (all
  five) wins 36.6% → 41.7% at level 1 and 42.6% → 44.2% at level 30 in those fights; at tier 4, 41.0% → 46.7% and 45.2% → 46.5%.
- **For the retune:** the Tyrant at grade 4 level 1 (+10.7) and the Juggernaut at grade 4 level 30 (+7.6) are this change's; the rest beyond
  6 were there before. Lowering `TIER_STRENGTH` (one knob for every tier skill) or a hero's own entry is the place to answer them. Nothing was
  retuned here except the two tier 4 echoes above.

`tools/rank4/` and `npm run balance -- --tier-cap 3` are as RANK4-SKILLS left them.
