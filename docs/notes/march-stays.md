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

The filmstrips kept are under `docs/samples/march-stays/`: one contact sheet before and one after for each case
(`heroes-*`, `daily-*`, `quest-*`, `fallen-*`, `duel-*`), and `rebuild-after`, `after-360x780`, `after-412x915`.

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

## Second pass (on 0.554.0): the empty field found, the cut eased, everyone marches

The director asked for the cases not filmed (a duel wave, a quest battle, a wave after a revive, cinematics on) and for the two
things left alone (the camera's cut at the deploy; a hero who jumps to a free tile; the fallen who appear at the deploy).
Filming them found the owner's second fault.

### The battleground gone: seen, and its cause

**Reproduced on 0.554.0** in a quest battle and in a daily run: from the moment the march begins the canvas shows nothing but
the painted backdrop, the heroes and both sections gone, until the next deploy builds the board again. The console had `a fault
in the drawing TypeError: Cannot read properties of null (reading 'alphaMode')`: a sprite on the stage whose picture had been
destroyed, which makes every drawing throw (the guarded drawing keeps the loop alive, but nothing is drawn, and the canvas is
see-through).

The sprite is the rim's. A land's rim (what stands round the two far edges: `layRim`) draws its still pieces into one picture
(`rimTex`). The march's build of the next section (`BoardView.build(..., keepOld)`) leaves everything on the stage, the old
board's rim with it, and then did `this.rim = []; this.rimTex?.destroy(true)`: the picture destroyed, its sprite still up. "Sometimes"
is which roads stand such a rim: the plain roads (a daily, a quest battle, a Muster) on a land with a rim, at rot 0, not a boss's
arena. An army's scenario road did not in any film here, which is why the first pass never saw it.

The fix (`BoardView.dropRim`): the rim's pieces are taken off the stage first and only then is its picture destroyed, in the one
place that destroys it; the host's rim goes as the host is moved aside for the march (`demote`), since it stood at the world's
origin where the next section falls. `test/march-stays.test.ts` holds the order.

The film now counts the loop's turns beside the drawings, so a drawing that faults is seen (it never reached the watcher before,
which is how a blank march passed as "no march"), and fails on any fault the game writes to the console.

### The camera's cut at the deploy

`newBattle` lays the page out afresh (the bench and the Fight button come up, the board is fitted to the room left) and snapped
the camera to the deploy's framing. After a march the camera now starts from the very picture that was on the screen
(`sameView`: the same scale and the same world point under every pixel, in the new layout) and the deploy's own eases carry it to
the placement rows (the move's 220 ms, the zoom's `EASE_ZOOM_MS`). Three numbers; no work added. Reduced motion keeps the cut.

### Everyone marches, to the tile they will take

- **The tile.** The march's goals came from the section's plain board; the fight's own board has traps, a flood and foes, so a
  hero whose tile one of them took stood there and jumped to a free tile at the hand-over. `startWalk` now rehearses the next
  fight (`startStage(run, 'never')`, nothing of the run changed) and sets the squad down on it exactly as the deploy will
  (`squadTiles`, which `placeSquad` now uses too): each marcher walks to the tile its fighter takes.
- **The fallen.** A fallen hero of the squad is back for the next wave. It now rises where it fell as the march sets out and
  walks in with the party (`marches`; `Walker.risen`), where it used to lie on the old section and appear at the deploy.
- **After a duel.** A duel's battle holds only the champion; the rest of the party watch from beside the ring as copies
  (`DuelShow`), and stayed there while the champion marched alone, then appeared at the deploy. They now leave the crowd as the
  march sets out (`DuelShow.marchOff`) and walk on from where they stood.

Still as it was: a hero hired or added between two waves has nowhere to march from and appears at the deploy; a duel's watcher
with no place by the ring (more heroes than places) does too.

### Numbers (393x852 unless said, CPU x4, x2)

| case | build | hand-overs | what the film found |
| --- | --- | --- | --- |
| a daily run (desert, a rim) | 0.554.0 | 2 | FAILED: 66 turns of the loop with no picture drawn, 121 faults written; no march was drawn at all |
| a daily run | now | 2 | held: 0 not drawn, 0 faults |
| a quest battle (bridgeBlades: shrine, a rim) | 0.554.0 | 1 | FAILED: 70 turns with no picture; the camera cut 231 px at the deploy |
| a quest battle | now | 1 | held (the second wave was lost by the film's two heroes, so one hand-over); the cut 8 px |
| a hero fallen at the wave's end (`--fell`) | 0.554.0 | 2 | FAILED: 98 pictures of the march and after without the returning hero |
| a hero fallen at the wave's end | now | 2 | held: it marches from the first picture of the march |
| a duel wave (`--duel`) | 0.554.0 | 2 | passed the count (the watchers were still drawn, by the ring) but by eye the champion marched alone and four appeared at the deploy; 1 fault written at the hand-over (the crowd posed after the build had destroyed it) |
| a duel wave | now | 2 | held: 5 of 5 march; 0 faults (the crowd is put away as the next fight is made) |
| a wave after a revive (`--level 14`: a life spent) | now | 3 | held |
| cinematics on (`--scenes`, waves 4 to 7) | now | 3 | held; no fault |
| 393x852 / 360x780 / 412x915 | now | 3 / 2 / 2 | held |

The camera at the deploy, the party's middle on the screen in the one picture the deploy comes up in (pictures here are 230 to
500 ms apart, so one step of the ease is most of the way; on a phone at 30 to 60 pictures a second it is many small steps):
0.554.0 moved it 41 to 65 px (231 in the quest battle); now 6 to 30 px, the scale unchanged in both.

Not filmed: a hero whose tile is blocked on the next board (no seed found that blocks one; `squadTiles` and its test hold the
rule), the Muster, reduced motion. The sheets kept are listed above.

## Third pass (on 0.558.0): the lock of 0.548.0, and the deploy and the fight's start filmed

The director asked whether the rim's fault, or one like it, could hit a deploy or a fight's first frame on an army road: the
owner was once locked on 0.548.0 "at a fight's start with the board empty, clock 0:00" in an army run, wave 7.

**What the film does now.** Beside the hand-over it watches every wave's deploy and the fight's first seconds (`--start`,
5 s): the loop's turns with no picture drawn, a battle's clock that has not moved, a loop that did not turn. And every twelfth
picture, the whole run long, it walks the stage for a sprite whose picture is dead (destroyed, or its source gone), shown or
hidden. Each fails the run. The page's own picture is told from a bake by what the renderer is asked to draw, so it works on a
build before the guarded drawing too.

**Every place that destroys a picture, read:**

| where | what | safe? |
| --- | --- | --- |
| `BoardView.dropRim` | the rim's one picture | yes now: its pieces first (it was the fault) |
| `BoardView.bake` (the oldest baked section let go) | a baked section | yes: its sprite is destroyed just before |
| `BoardView.columns` (the column cache's `destroy`) | a painted column | only when nothing holds it; every holder destroys its sprites before it lets go (`retire`, `dropOld`, the build, the bakes). `build(keepOld)` with a board still built would let go with the tiles up, but its one caller demotes first. A rim's near columns ride on the board's own leases; `demote` now takes the rim down first |
| `BoardLife.light` | the dark layer | yes: the sprite and its picture go together |
| `blenderFxArt.drop` | an effect's atlas | yes by its own rule: every frame is pointed at an empty picture first (read only; not my file) |
| `standView`, `standHall`, `fieldView`, `sceneView`, `assaultScene` | their own stages | not on the fight's stage |

No second fault of the kind was found.

**Can it hit an army road?** No. A rim is laid only on a board with none of an army road's own tiles (`rimOf`: `t.scene`); of
675 sections (nine armies, five seeds each) none carries one. Filmed on the build now: eight armies from wave 5 (waves 5 to 8;
three were lost at the first wave by the film's party), every deploy and fight start drawn, every clock moving, no dead picture
on the stage, no fault written. Filmed on 0.548.0 itself: five armies, waves 5 to 8, the same (its only failure the party
vanishing after the march, as known).

**But the rim's fault is very likely the lock.** On 0.548.0 the drawing was Pixi's own listener, not yet guarded. Filmed there
in a daily run: at the first march the page throws `Cannot read properties of null (reading 'alphaMode')` uncaught, Pixi's
ticker stops for good, and the next wave's fight "begins" with **no turn of the loop at all**: the page's own parts still answer
taps (the card, the deploy, Fight), so the fight's rows and the clock at 0:00 come up over a canvas that was cleared and is
never drawn again. That is the owner's picture exactly, and the stops' log would end on the board's build, as theirs did. The
loop stays dead until the page is loaded again, whatever is played next, because the game only stops and starts its ticker from
inside the loop that has died. So: a daily or a quest battle marched once in that sitting, on a land with a rim, and then any
run, an army's among them, is locked at its next fight. I cannot show the owner's sitting was that; I can show the mechanism on
their version and that an army road alone does not do it.

Since 0.550.0 the guarded drawing and the loop watch turn that lock into a blank march (what the second pass found), and
since 0.558.0 the cause is gone.
