# MARCH-STAYS: the party and the battleground stay on show between two waves

The owner (Android phone, upright, the installed app and the browser):

> make sure the heroes don't disappear from the map in between waves. currently they walk to the next section, then disappear
> until the next round is ready. I also want the already fallen into place battleground to stay visible. sometimes it
> disappears as well.

## What was wrong

Filmed with `tools/march-stays/film.mjs` (below) at 393x852, the CPU slowed four times, x2, on 0.551.0.

**1. The heroes vanished after every march (seen, every hand-over).** The march between two waves is `ChainView`
(`src/render/chainView.ts`): its walkers are copies of the heroes, drawn over the two sections joined. When the walk ended,
`ChainView.finish` destroyed every walker at once. The finished fight's own sprites of those heroes were (and are) hidden for the
march (`Game.walking`), and the next fight's fighters are only made by `newBattle` > `syncSprites(true)`, which the short card
over the march calls 1.4 s after the walk at the soonest (`PASS_AFTER_MARCH_MS`), later behind a card with lines to read, a
cinematic, the destination's reveal or the home screen. Nothing drew the party in between: 1.5 to 2.3 s of pictures with none of
the five heroes on a desktop slowed four times (2.6 to 4.8 s with two films running at once), on every one of the hand-overs
filmed. On the owner's phone the wait is longer by however long the next board takes.

**2. The settled battleground gone (not seen; reasoned).** In none of the hand-overs filmed, before or after, was a settled
tile of the next section missing or in the air a second time: the next fight's board is laid in the same frame the march's
tiles are taken down. Three ways the field could go were found by reading, and all three are closed:

- `BoardView.build` took the old picture down FIRST (every child of the stage destroyed) and only then made the new columns. A
  fault while making them (a texture gone, a sheet not there) left the stage empty, and `newBattle` stopped part-way, so nothing
  put it back: the lock of 0.548.0, "the fight's rows up, no battlefield", whose last line in the stops' log was the board's
  build (`docs/notes/wave-delay.md`).
- The loop watch's cure (`Game.watchLoop`, "the board built afresh") built `this.b.board`. Between two waves `this.b` is still
  the finished fight while the run has moved on a stage and the host on show is the section marched to: the cure built a second
  copy of the OLD board in the new section's place, and made the finished fight's fighters again with the marchers already gone.
- `ChainView.finish` baked the old section into the scenery before it told the page the march was over; a fault in the bake left
  the page waiting on a march that had ended (`body[data-move]` never cleared, the card never passing on).

Not found: any way for the tiles to fall in twice. `ChainView.begin` is the only caller of the fall and runs once a wave.

## The rule (`src/render/marchStayRules.ts`, pure; `test/march-stays.test.ts`)

- **A marcher leaves the stage for one reason only: the next fight's fighters have been made** (`marcherAfter`,
  `marcherDrawn`). A walk that ends, or is cut short by a tap, leaves the hero standing at the tile it walked to; a board built
  or a road laid again under it changes nothing. `fightersTakeOver` says which fighters count: those of a battle other than the
  one marched from (the watch's cure makes the finished fight's again; they do not).
- **A board's build never empties the field** (`BUILD_ORDER`, `stageAfter`): the new columns are made first, the old picture is
  taken down only then, and the new goes up in the same frame. A fault while making leaves the old picture standing.
- **Between two waves the host on show is the section marched to** (`hostOnShow`), and that is what a build afresh builds.
- `standFacing`: a stander turns to face as the deploy's fighter will (the sim's facing 3 through the section's turn), so the
  fighter that takes its place looks the same. `filmFaults`: the film's sums.

It is by rule, not by timing: nothing here waits on a clock. However long the next board takes on a slow phone, the party
stands, idling, on the settled section until the frame in which the deploy's fighters are made on the same tiles.

## What changed

- `src/render/chainView.ts`: `finish` no longer destroys the walkers. Each becomes a stander (`stood`), put among the things the
  board keeps through a build (`BoardView.keep`), its idle pose stepped each frame (`idle`); a walk cut short stands the hero at
  its goal. `release()` is the only thing that takes them off. `standing()` names them; the bake of the old section can no longer
  stop `done()` being called.
- `src/main.ts`: `chain.step` runs every frame (it was only while a march was on). `startWalk` notes the fight marched from
  (`marchedFrom`); `syncSprites(true)`, where every new fight's fighters are made, calls `chain.release()` after making them,
  when `fightersTakeOver` says so. The heroes who walked there get no puff of landing dust: they were never set down. The loop
  watch's cure builds the section on show.
- `src/render/boardView.ts`: `build` makes the new section before taking anything down.

No work was added to the hand-over's frame: the standers are the walkers already there, and making the new columns before
taking the old down is the same work in another order (while both are held the column cache has more in use; it never evicts
what is in use, and the old leases are let go a line later). The guarded drawing, the loop watch and the cache refusing dead
textures are as they were.

It holds whatever the kind of wave, because every way into a next fight goes through `newBattle` > `syncSprites(true)`: a normal
wave, a boss's, a duel (its challenge comes after the deploy is up), a quest battle with an army's road, a wave after a revive.
With auto-replay on there is no march at all (`startWalk` is not called), so nobody to keep.

## The tool

```bash
npm run web && node tools/march-stays/film.mjs [--cpu 4] [--waves 4] [--size 393x852] [--speed 2] [--army wildwood] [--stage 6]
                                               [--tap] [--rebuild] [--shots docs/samples/march-stays/<name>] [--keep]
```

It plays an army's waves on a real clock with the CPU slowed, and after every picture the page draws, from the last foe's fall
to a second into the next deploy, writes down whether each hero who was standing has a fighter drawn (in the stage's tree, shown,
not see-through) and how many of the host section's tiles are drawn or lifted. It fails (exit 1) on any picture short of a
marcher, short of a settled tile, or with a settled tile in the air again. `--tap` taps the card mid-march; `--rebuild` has the
loop watch build the board afresh while the party stands; `--shots` films it (the browser's screencast) and keeps a contact
sheet for each hand-over, each frame named by its stage and ringed in red where the watcher found it short. `ROOT=<dir>` plays
another build (how the "before" numbers were taken).

### Its numbers

| build | size | case | hand-overs | pictures short of a hero | short of the section | tiles in the air again |
| --- | --- | --- | --- | --- | --- | --- |
| before | 393x852 | x2 | 5 | 83 (2.6 to 4.8 s each, 0 of 5 drawn) | 0 | 0 |
| before | 360x780 | x2 | 2 | 37 | 0 | 0 |
| before | 412x915 | x2 | 2 | 33 | 0 | 0 |
| before | 393x852 | x2, the watch's build afresh while the party should stand | 2 | 33 | 0 (the watcher counts tiles, not whose: it was the old board's copy) | 0 |
| after | 393x852 | x2 | 5 | 0 | 0 | 0 |
| after | 360x780 | x2 | 2 | 0 | 0 | 0 |
| after | 412x915 | x2 | 2 | 0 | 0 | 0 |
| after | 393x852 | x1 | 2 | 0 | 0 | 0 |
| after | 393x852 | x2, the card tapped mid-march | 2 | 0 | 0 | 0 |
| after | 393x852 | x2, the watch's build afresh while the party stands | 2 | 0 | 0 | 0 |
| after | 393x852 | x2, into a boss's arena and on from it (waves 9 to 11) | 2 | 0 | 0 | 0 |

Not filmed: a duel wave, a quest battle, a wave after a revive, cinematics on (the destination's reveal). They go through the
same `newBattle` > `syncSprites(true)`, so the rule covers them, but no film says so. Page errors in every film: none.

The filmstrips are under `docs/samples/march-stays/` (`before-*`, `after-*`: one sheet a hand-over, and `film.json` with the
sums; the `before-393` sheets are from a second, two-wave film of the same build).

## What still looks abrupt, and what was not done

- When the deploy comes up the camera cuts to the deploy's own framing (the bench and the Fight button take the lower part of
  the page, and the board is fitted to what is left). The party and the section are on show on both sides of the cut, but the
  picture jumps. That is the deploy's layout, not this change; easing it would be a change of its own.
- A hero whose tile from the last fight cannot be stood on in the next (a boulder or a foe's tile now) is set down on a free
  tile instead, as before, so that one hero moves at the hand-over.
- The fallen do not march (they lie on the old section), so they appear at the deploy, as before.
- The destination's reveal (cinematics on, once a run) sends the camera away from the section to the distant landmark for about
  three seconds after the march. The section and the party are still drawn, but off the screen for that time. Left as it is: it is
  a designed moment, and the owner may want to say whether it stays.
- The second fault was not reproduced, so its fix is by reasoning. If the owner sees the field go again, the Diagnostics log's
  last lines around it will say which build it was.
