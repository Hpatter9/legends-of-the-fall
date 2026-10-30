# The Last Stand's retreat (STAND-RETREAT)

The owner: "I want to add a little more story to the Last Stand. Since there are four rooms, it has progression. Like the battle starts in the
courtyard and the army has to fall back with the king as they fight through waves, ending in the throne room." The design the owner approved:
a fixed retreat through the four rooms, a choice to hold the line at each act's end, a short retreat beat, the room reached kept as a record,
and one music hook. Branch `claude/stand-retreat`.

## The acts

| Act | Room | Waves |
| --- | --- | --- |
| I | the courtyard | 1-5 |
| II | the library | 6-10 |
| III | the chapel | 11-15 |
| IV | the throne room (the great hall with the king's dais, renamed and dressed) | 16 to the end |

- `src/sim/standActs.ts`: the schedule (`ACT_HALLS`, `ACT_WAVES` 5, `actOfWave`, `hallOfWave`, `retreatAfter(n, hall)`), the rooms' names
  (`ROOM_NAMES`), the door (`exitOf`: on a back wall, north then west, clear of the breaches), the numbers (`HOLD_HARDER` 1.2, `holdGold`,
  `FLEE_MS` 6 s, `CHOICE_MS` 10 s, `RETREAT_MS` 4 s, `ROOM_BREAK_MS` 10 s) and `reachRoom` (the record).
- A new run starts in the courtyard (`newStandRun`; `StandRun.act` 0). Each room's breaches still vary with the run's seed (`hallPlan`, as
  before); only which room is fixed. The old "never the room of the run before" rule and its `legends.standHall` key are gone from new runs.
- `HALL_NAMES.hall` is now "The throne room". In it the ruler sits enthroned (`rulerSeatTexture`) while nothing is happening and rises to
  strike, cast or take a blow (the empty throne behind shows then); crimson banners hang between the windows on both back walls.

## Holding the line

After waves 5, 10 and 15 (`retreatAfter`) the run stops at a new phase, `choice` (`StandRun.retreat = { to }`; saved, so a reload asks again):

- **Fall back** (`fallBack`): the retreat begins.
- **Hold one more wave** (`holdTheLine`): `holdSpec(seed, armies, n, hall)`, its own side stream (`mixSeed(seed, 0x401d, n)`): the next wave's
  size and foes, `HOLD_HARDER` (1.2) times the next wave's strength, from every breach of the room at once, no boss. Held, it pays
  `holdGold(n)` = twice the act's clearing gold (64, 104, 144 after waves 5, 10, 15), plus its kills, the wave's XP and breath; then the guard
  falls back. The king's fall in it ends the run as ever (`StandSummary.held`). The bonus wave is no numbered wave: `run.wave` is already the
  next, `run.best` is not raised; the top bar shows the act's last wave with "Hold".
- Left to itself (the headless runs) the choice falls back after `CHOICE_MS`; the page does not step the run while the card is up, so it waits.

## The retreat beat

1. **The last foes break off** (`StandMode.flee`, the one hook in `battle.ts`): on an act's last wave, or the bonus wave, once the queue is
   empty and `HUNT_AT` or fewer foes stand with no boss among them, they stop fighting and run for the breaches down `exitField`
   (`standAi.ts`, `fleeDecide`); one that reaches the edge, or any still in the room after `FLEE_MS`, is gone (no gold, no XP). A `breakOff`
   note; no hunt.
2. **A breach caves in** (`StandHall.giveUp`): rubble drops into the room's first breach with a dust burst, the door swings open (the pack's
   five frames). Nothing blinks; with reduced motion the rubble is simply there.
3. **The banner**: "The courtyard is lost · Fall back to the library!" (`lostLine`, `standRetreatLines.ts`).
4. **The walk** (`retreat` phase, `RETREAT_MS` of battle time at x1 whatever the speed): the heroes still standing are given posts in front
   of the door and walk there by the usual AI; the king walks there on the page (`StandHall.walk`); the camera eases round to take in both;
   the screen darkens over the last fifth. A tap anywhere skips (`finishRetreat`). The fallen stay where they lay, in the room left behind.
5. **The next room** (`finishRetreat`): the board is the new room's (`standBoard`), the flow fields, shots, zones, traps and walls of the old
   room are dropped, only the king and the heroes standing come along, each set at the ring plan's post (`ringPlan`, the owner's
   auto-arrange). Then a `break` of `ROOM_BREAK_MS` (10 s, the usual 5) in which any hero may be moved, as in any break.
6. **The title card**: "Act II · The Library" and a line from the ruler (`roomLine`, a side stream of the seed: gothic, British, half of them
   naming a hero still standing by `heroName`), now and then an aside from Duchess. It stays 3.4 s; a tap takes it away. With reduced motion
   there is no walk: the banner, then the card fades in over the next room.

## The record

- `Meta.standAct` (optional): the furthest room reached, kept the moment a room is entered (`reachRoom`) and at the end (`settleStand`).
- The Last Stand's card at the camp: "best wave 13 · Chapel"; the throne room is the badge: "best wave 23 · ♛ Throne Room" (`home.ts`).
  The achievements list is full (its test caps it at 25), so the throne room is a badge, not an achievement.
- The end card: "Fell in the chapel, wave 13" (", holding the line" when so), and "♛ Reached the throne room" (`StandSummary.room`, `act`).

## Music

`src/render/standMusic.ts`: `ROOM_TRACK` (room to track, all null today) and `standRoomTrack(seed, hall)`, which the page asks for its track.
The music player has no intensity levels (its acts are the tower's colours), and the battle music's rule keeps one track a run, so nothing
changes yet; when the new theme's boss arrangement lands, the throne room can name it there.

## Saves

- New fields are optional: `StandRun.act`, `StandRun.retreat`, `Meta.standAct`, `StandSummary.room/act/held`. `loadStand` drops junk in them.
- A run saved under the old rule (a room from the seed, or no room) keeps its room to its next act's end, then follows the order
  (`retreatAfter` compares the next wave's room with the room it is in). One past wave 15 in another room falls back to the throne room at
  its next fifth wave.
- `canSave` now includes the choice; the walk and the bonus wave are never saved (a reload is back at the choice, as it was saved).

## Balance

`npm run stand-balance -- --levels 1,10,20,30,60,100 --attempts 30` (the greedy buyer, eight heroes, nothing worn), the wave the king fell in,
median (mean, min-max):

| Level | Before (main 0.245.0) | After, falling back at once | After, holding the line every time | Held (mean) / fell holding |
| --- | --- | --- | --- | --- |
| 1 | 3 (3.5, 3-4) | 4 (3.7, 3-4) | 4 (3.7, 3-4) | 0 / 0 |
| 10 | 9 (9.3, 7-10) | 9 (9.2, 8-11) | 9 (8.8, 6-10) | 1.0 / 1 |
| 20 | 11 (10.7, 9-12) | 10 (10.5, 8-12) | 11 (10.4, 8-11) | 1.0 / 15 |
| 30 | 15 (15.9, 13-21) | 16 (15.9, 12-21) | 15 (14.8, 12-19) | 2.1 / 7 |
| 60 | 20 (18.8, 14-25) | 20 (19.2, 14-26) | 18 (17.9, 13-28) | 2.6 / 2 |
| 100 | 24 (25.7, 13-44) | 25 (25.8, 18-36) | 25 (26.8, 16-40) | 3.0 / 1 |

Falling back at once leaves the medians where they were (within a wave, the means within 0.4). Holding every time is a real gamble: a level-20
party loses its king in the second hold half the time, mid parties lose a wave on average to the heroes it costs, and only a strong party
(level 100) comes out a wave ahead. The purse is gold only (about two waves' clearing gold), so the economy's prices and pace are unchanged.

## Checks

- `test/stand-retreat.test.ts`: the schedule; a strong party falls back room by room in order, each room laid out with the ring plan's
  posts; the walk heads for the door and ends in the next room (or at once when skipped); the choice waits and falls back by itself; the hold
  wave's spec, side stream, purse, determinism and the waves after it; a fall while holding; the last foes breaking off; old saves and a
  saved choice; the record; every room's door.
- Changed for the owner's new rule: `test/stand-overhaul.test.ts` (a new run begins in the courtyard instead of avoiding the room of the run
  before), `test/stand.test.ts` (the leash test reads the heroes' new posts after each fall back).
- `tools/stand/retreat-shots.mjs [port]`: the four rooms in order, the choice, the hold banner, the retreat banner, the walk, the title card
  and the end card at 393x852; the choice and the first retreat at 360x780 and 412x915; reduced motion. `docs/samples/stand-retreat-*.png`.
