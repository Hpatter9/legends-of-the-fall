# Late power: levels and the castle

0.95.0 removed hero rarity, so the late armies got much harder (see `no-rarity.md`). The owner's call: win that power back
through hero levels and the castle, not through hero stats. Hero stats are untouched, so `test/hero-balance.test.ts` holds
as it was (all 45 heroes within 4 points).

## Why the levels change only past 20

The first attempts steepened the curve from level 12 or 15. They moved the first armies too: in the realistic climb the
starting five already reach levels 16 to 20 by the Undead and Beast armies (a few heroes take most of the kills), so any
boost below 20 made Undead and Beast clearly easier (Beast 2.7 to 1.7 tries). The party average (8 and 12) hides that spread.
So levels 1 to 20 are exactly as before, and the new power sits above 20, where only the late climb reaches.

## What changed

- `levels.ts`: `MAX_LEVEL` 20 to 30. A hero kind's **lasting** level now has its own boost, `lastingBoost`: identical to
  `levelBoost` up to level 20, then each level adds `LATE_SHARE` (0.3 of a full step, against the 0.25 the levels before
  it fade to), and levels 25 and 30 are milestones (`MILESTONES`: +15% hp / +12% atk, and +25% / +20%, on top). Level 30 is
  x5.1 hp / x4.1 atk (level 20 was x3.86 / x3.34).
- Levels 21 to 30 cost `LATE_XP` (4) times what the plain curve asks (`xpFor`), so the late levels are for the long
  game and the early armies (whose strongest heroes sit near 20) are not lifted. XP to level 30: 26,100 before, 109,500 now.
- `levelOf(xp, max)` takes a cap. The spire and Calamity (their own in-run levels, `climb.ts` and `tower.ts`) pass
  `RUN_MAX_LEVEL` (20) and still read `levelBoost`, so they are bit-for-bit as before (measured below).
- Lasting levels reach the fight through `gradeBoost` (`run.ts`) and the hero sheet (`menuHeroes.ts`) through
  `lastingBoost`; the sheet's HP and Attack are the real figures. The level-up chips in the recap read `levelGain(from, to, lasting)`;
  `showXp` passes `lasting = false` for a run that levels its own heroes.
- `castle.ts`: the **Barracks and Armoury get a 6th and 7th level** (850 and 1,400 crowns; the same +6% hp / +5% attack
  each; `BUILD_MS` gets 8 hours and 1 day). The castle scene's look is spread over the levels by `stageOf`, so nothing else
  needed to change. The realistic-climb player spends lowest-building-first, so it seldom reaches these; they are for the
  player who finishes the castle.

## Numbers (`npm run balance -- --no-tables --climb --saves 60`, realistic climb, mean tries / clear rate)

| Army | Before rarity left | Tries 0.95.0 | Tries now | Clear now |
|---|---|---|---|---|
| Orc Warband | 2.3 | 2.7 | 2.7 | 100% |
| Undead Legion | 2.7 | 2.6 | 2.5 | 100% |
| Beast Packs | 2.4 | 2.7 | 2.8 | 100% |
| The Wildwood | 1.9 | 5.1 | 3.9 | 100% |
| The Labyrinth | 2.2 | 5.6 | 3.2 | 100% |
| Ogre Clans | 1.9 | 5.0 | 2.7 | 100% |
| Infernal Host | 2.0 | 7.5 | 2.4 | 100% |
| Yokai Night Parade | 2.5 | 7.7 | 2.1 | 100% |
| Golem Forge | 3.2 | 7.7 | 2.7 | 100% |

(The first column is from `no-rarity.md`'s 'before' figures, which list the first three armies as 2.3 / 2.7, 2.4 / 2.6 and 1.7 / 2.7 before and after; 0.95.0 clear rates were Infernal Host 95%, Yokai 90%, Golem Forge 77%.) The first three armies are within 0.2.
The Wildwood is the one miss: 3.9 against a target of about 3.5. Its party is mostly level 15 and under, which the change
leaves alone on purpose (touching it moves Beast; two tries with a gentle bump below 20 gave Beast 2.4 and Undead 2.3,
at the edge of the 0.3 allowance). It wants the next lever to be an army-side or castle one rather than more hero levels.
The tool's numbers move about 0.2 between runs of other settings (60 saves).

### The spire and Calamity (unchanged, same tool and seeds)

| | Before | Now |
|---|---|---|
| Tower, 30 greedy climbs: median / mean / max floors, act bosses | 12 / 13.4 / 77, 7% 7% 3% | same |
| Calamity, 30 greedy runs: maps 1 to 6 | 80% 70% 50% 33% 30% 7% | same |

## Tests

- `test/levels.test.ts`: the lasting boost equals the in-run one up to 20; the cap on a run's own levels; the late XP cost;
  each level past 20 adds `LATE_SHARE` and the milestones add their lump; the gains grow level over level and `levelGain`
  reads the right curve. The old `levelBoost(MAX_LEVEL)` check now reads `RUN_MAX_LEVEL` (the curve it checks did not change).
- `test/castle-works.test.ts`: every level of every building has a build time; Barracks and Armoury reach 7 and take 8 h and 1 day.
- `test/castle.test.ts`: "3 to 5 levels" became "3 to 7, and only the Barracks and Armoury go past 5"; the Stable and
  Library still cost like the Armoury's first five levels.
