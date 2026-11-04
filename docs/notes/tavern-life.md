# Tavern life: every hero has their own place and their own thing to do (TAVERN-LIFE)

The owner: "I also want to give each person in the tavern a proper animation: idling, sitting in a chair, playing darts, singing,
drinking, etc. They would each have a specific place in the tavern for this so it won't be random." And: "add the tavern keeper (Gwen)
to the art prompt next time we need new art".

Branch: `claude/tavern-life` (from main 0.263.0).

## What each hero does (`src/render/tavernLife.ts`, new; pure data, tested)

- `LIFE`: every one of the 45 heroes has **one activity** at their one spot (`SPOTS` in `tavernSpots.ts`), with a one-line reason in
  the data (`why`). The same hero always does the same thing in the same place; its rhythm comes from its name (`lifeSeed`, a hash),
  never from chance. The old random idles (turning, emote bubbles, strolls, flourishes) no longer run for a hero with an activity.
- `ACTIVITIES`: 22 activities, each with its posture (sits, stands or either), its steady **loop**, its occasional **beat** (the
  action that breaks the loop) and how often the beat comes (`every`, `lasts`; `beatOf(kind, now)` gives where a hero is in it).
  `puffs()` counts out the little things given off (notes, z's, steam) from the clock, with no list and nothing random.
- The fixtures: `HEARTHS` (the bar room's little hearth and the hall's big fire), `DARTBOARD` (on the games room's wall), `STAGE`,
  and `BEAT_MS` (the bard's beat, which the dancers and the crowd keep).

| Room | Where | Who, and what |
| --- | --- | --- |
| Bar room | the stools at the bar | Natsu drinks, Kwame has his four o'clock tea, Ayame flips a coin, Kenji tends his blade, Ravi keeps a flame on his palm |
| | the end of the bar | Minh eats standing |
| | the little hearth | Jiro meditates in the chair, Kazan warms his hands on the stool |
| | the round table | Malia tells a storm story; Rhys and Xanthe listen |
| | the long table | Karim eats, Selam reads her prayer book; on the front stools Eirik and Asterion arm-wrestle |
| Hearth hall | at the fire | Kian leans, arms crossed; Seneb warms his hands; Tiago rolls dice; Rook-7 tinkers |
| | the benches | Luana makes little lights; Maeve cleans her pistols |
| | the left round table | Dorion plays his pipes, Isla has an herbal brew, Zofia reads |
| | the right round table | Hideo tells of the bridge; Kohaku listens; Hobb dozes through it |
| | standing about | Vuk gnaws a joint, Kurogane leans (eyeing purses), Inti has a pint |
| Games room | the dartboard | Bataar and Tiziri throw in turns; Harrow keeps score with a tankard |
| | the first card table | Seydou, Aram and Edmund play cards |
| | the second card table | Bastion dozes (powered down), Kerem eats, Linnea has a cup of tea |
| | the stage | Lovell sings with his lute; Adaeze and Itzel dance; Minjun cheers |
| | about | Vesper leans in the corner, Skerry drinks |

**Spots moved** so the furniture fits: Asterion (the Minotaur) and Inti (the Ranger) swapped (Asterion to the long table's front stool for
the arm-wrestle); Harrow (the Dread Pirate) and Tiziri (the Queen Dragoon) swapped (the darts players stand at the line, not under the
board; Harrow now faces them); Kazan faces the little hearth. Fifteen to a room and no overlaps still hold (`test/tavern.test.ts`).

## How it is drawn (`src/tavernLifeDraw.ts`, new; small hooks in `src/tavern.ts`)

- **Painted, when it lands**: `src/art/tavern/life/<kind>.png` (two rows: the loop, then the beat; square cells, the seat painted in)
  and `gwen.png` (idle, wipe, talk). They are found **by name when the game is built** (an esbuild glob over the folder, `urlOf`), so a
  sheet dropped in needs no code change; rows' frame counts are read from the picture. `tools/tavern-life/bring.py` checks the
  paintings in `art-source/tavern-life/` and shrinks them into that folder (256 px cells to 128, hard alpha).
- **Placeholder until then** (`lifePose`, `drawLifeFront`): the hero's battle sheet in gentle loops: darts players play their attack
  row and a dart flies to the board and sticks there until the next throw (they take turns); a teller gestures with the cast row and a
  speech box of dots; dancers step the walk row and hop and turn on the beat; the crowd hops on the beat; the arm-wrestlers lean in and
  rock together over clasped hands; the bard sways with notes rising; dozers breathe with z's rising; drinkers raise a tankard to the
  mouth; a page turns, a card is slapped on the table, dice are thrown on the floor, a coin flips, sparks fly from a whetstone.
- **Sitting**: a seated hero's top half sits on the seat (the hips about half way up the figure, `HIP`), and the legs below are squeezed
  into the room between the seat and the floor (`hipsAt`, `sitDrop`), so a chair sitter is lower than a stander. A stool or bench is drawn
  in front (its seat hides the join); a chair, whose back would cover them, behind.
- **Props**: pack pictures where a pack has the thing, drawn at their own pixels (16 px strips of the 5000 Pixel Effects pack: notes,
  z's, steam, embers, sparks, "!", sweat; DawnLike's open book, pipes and meat; `tools/tavern-life/cut.py`, `CREDITS.md`). The
  tankard, cup, cards, dice, coin, dart and clasped hands are a few code-drawn pixels each (no pack has them at this size), and a painted
  `prop-<name>.png` takes over.
- **Gwen** (`drawGwenPainted`, `drawGwenWipe`): her painted figure when it lands; until then her pack sprite as before, and every nine
  seconds, for two and a half, she wipes a mug over the bar's top. Tapping her still talks and opens her quests (QUESTS batch 1's code is
  unchanged but for one line that lets the painting take her place).
- **Reduced motion**: every hero holds a still pose (the first idle frame), props at rest, a still note over the bard and a still "z" over
  the dozers; no thrown darts, no rising things. **Battery saver**: no steam, embers, sweat or meditating sparkles (the tavern already caps
  at 30 frames a second there). Nothing blinks: the rising things fade out over their last third.
- Tapping a hero still opens their sheet (the tap uses the spot, as before).

## The patrons' quest marks (QUESTS-1b, merged from main 0.264.0)

A hero with a quest of their own still wears the gold "!" (or the tick) over their head, and a tap on them still opens their card,
wherever their activity puts them. The mark is now drawn after the hero's props (`lifeFront` in `tavern.ts`), over a sitter's lower
head, and a marked hero gives off nothing over their head (no notes, z's, speech box or "!" of their own), so it stays clear. Checked
by `tools/tavern-life/patrons.mjs` with offers from Kwame (bar stool), Eirik (the arm-wrestle), Selam (a chair), Harrow (under the
dartboard), Itzel (dancing by the stage), Edmund (the card table), Hideo (telling his story) and Hobb (dozing): every mark shows, and
tapping Harrow and Itzel opens their cards (`docs/samples/tavern-life-patrons-*.png`).

## The art prompt

`docs/notes/tavern-art-prompt.md`: 52 images for Antigravity (branch `art/tavern-life`, PR "Tavern life art", `art-source/tavern-life/`):
45 hero activity sheets grouped by activity, Gwen Tallow's standing figure (idle, wiping a mug, talking; matching her portrait on
`art/eidolons-1`), and six props (tankard, cup, dart, card, die, coin).

## Tests (`test/tavern-life.test.ts`, new)

Every hero has one activity with a reason; sitters have seats and standers none; darts at the line facing the board, the bard on the
stage, hearth-warmers by a hearth facing it, cards in the games room, dancers and the crowd by the stage; the arm-wrestlers are each
other's rivals, side by side and face to face; listeners face their teller at the same table; the same hero's beat is the same every
time; the darts players never throw at once; the wrestlers strain as one; each beat comes as often and lasts as long as its activity says;
`puffs` counts from the clock.

## Samples (`node tools/tavern-life/shots.mjs`)

`docs/samples/tavern-life-*.png`: each room in two views (`bar-a`, `bar-b`, `hearth-a`, `hearth-b`, `games-a`, `games-b`) with all 45,
`new-save` (the five at the bar) and `reduced`, at 393x852; `new-save`, `bar-a`, `bar-b`, `hearth-a` and `games-a` also at 360x780 and
412x915; `tavern-life-strip-*.png`, eight frames 200 ms apart of the darts, the stage, the bar and the hearth hall.

## Not sure about

- The placeholder's sitting is a trick (a standing sprite with its legs squeezed): it reads at phone size, but the painted sheets are
  the real answer.
- The hand positions for props are a guess from the battle sheets (a fifth of the height in front, half way up), so on some heroes a
  tankard floats a little off the hand.
