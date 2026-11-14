# ON-FIGHTER: an effect on a fighter leaves the fighter seen

The owner, with a screenshot of four heroes at a wave's end, each inside a pale green column of vapour: "Effects like this still
hide the heroes. We need to change up how they look so it's not hiding them. Maybe it's a wispy smoke that circles around them."

## Which effect it was

The **heal over time's status loop** (`regen` in `STATUS_LOOKS`, the pack's `forest-status` strip), drawn by `unitView.ts`
`drawStatuses` over the fighter's body at 1.3 times its height and nine tenths strength for as long as the heal holds. The Cleric's
Prayer of Healing puts it on every ally for five seconds, and so do the other heals over time; it was still on them as the wave
ended. Reproduced with the Druid, the Warlock, the Cleric, the Knight and the Archer (`WATCH=1` on
`tools/blender-fx/ult-shots.mjs`: the party fights a wave on its own and is photographed through it). The other five statuses (a
shield, haste, a rally, a banner, a frenzy) were drawn the same way.

## The rule (`src/render/onFighterRules.ts`, `test/on-fighter.test.ts`)

1. The middle of a fighter's body (`BODY`: 0.6 of a tile wide, from 0.2 to 1.0 of a tile above the feet) stays readable. After a
   brief flash nothing may cover more than `BODY.CEILING` (15%) of it, counting how see-through it is drawn.
2. What stays on a fighter goes ROUND it: a pool on the ground at its feet, under the sprite; wisps of smoke that circle the
   body, drawn under the sprite for the back half of each turn and over it, small and faint, for the front half.
3. A clip that plays on a fighter is drawn twice: at full strength UNDER the fighter's body (a layer inside the fighter, just
   below its sprite: `UnitView.underLayer`), and over the fighter only as thinly as its measured cover of a body allows
   (`overAlpha`: the ceiling over the cover). So it is seen all round the body and behind it, and the body through it.

## What is built

- **The six statuses** are a pool and wisps (`STATUS_ROUND`, `ROUND`, `wispAt`, `wispsOf`): rendered loops `aura-pool-<el>` and
  `aura-wisp-<el>` in five elements (new scenes `pool` and `wisp`; energy and smoke, not things). Three wisps in all, shared out
  among the statuses on a fighter, so three statuses do not put three times the smoke in front of it; at most two are in front at
  once, each half size and two fifths strength there (`frontCover` is 14% of the body, under the ceiling; a test holds it).
  Reduced motion holds them still; the battery saver has two.
- **Every rendered clip an ultimate plays on a fighter** (a wind-up on its caster; a strike on each fighter it touches, on each
  friend, or round its caster; every aftermath) goes through the two layers. `tools/blender-fx/body_cover.py` measures each such
  clip's cover of the body's box, frame by frame after its first 150 ms, and writes `src/render/bodyCover.ts` (the build runs
  it); the renderer thins the over layer by it. A test holds that every on-fighter clip is measured and that its cover times its
  thinning is under the ceiling.

## Presence without cover (the director's second order)

`docs/samples/blender-fx/on-fighter-regen-393.png` (three rows: before, the first fix, now) and
`on-fighter-ultimates-2-393.jpg` (the Priestess, the Corsair Surgeon, the Knight, the Gorgon, the Harpooner and the Banneret, five
moments each from the wind-up on).

- **The smoke is seen.** Five wisps (three on the battery saver), each four fifths of the fighter's height across and at full
  strength while it is behind the body; in front, three tenths of that and faint. At most three are in front at once, and
  `frontCover` is still under the ceiling (a test). The pool is fainter: the smoke first, the pool second.
- **An ultimate's clip on a fighter lands with force, none of it over the body** (`UNDER`): the layer under the body is drawn 15%
  larger than the clip and keeps its glow; a strike puts a bright ring of its element on the ground at the fighter's feet, under
  the fighter; and for its first 150 ms the clip is over the body at full strength (the rule's brief flash), then thin.
- **An under layer inside one fighter still draws over fighters standing farther back.** That is the painter's order (the effect
  stands where its fighter stands), and it is not cheap to change: a layer under ALL the fighters would also be under the nearer
  tiles' tops, which are drawn after the farther rows, so a pool at a near fighter's feet would be cut off by its own tile. What
  it would take: the board giving a layer for each diagonal row that sits over that row's tiles and under every fighter of that
  row and of the rows behind it, which means moving the farther rows' fighters above the nearer rows' ground in `boardView.ts`
  (the march-stays builder's file now). Not done.

## The painted effects and the king's spells (group 2)

`docs/samples/blender-fx/on-fighter-painted-393.png` (the Druid's party under the Prayer of Healing, before above, now below) and
`on-fighter-spells-393.png` (the king's Heal above and Shield below on a unit, six moments each, cut close and doubled).

- **Every painted bit** (a skill's cast and hit, a signature's steps, `MOVE_PAINT`, `HEALER_PAINT`, the spell sheets' parts, the
  pack's puffs and rings: all of them are the particles) that lies over a fighter's body is drawn over it at the ceiling itself
  (`PAINT_OVER`, 15%; it was 60%) and again at its full strength under a body (`Particles.under`). Where it lies over several
  fighters it goes under the one standing farthest BACK, so it is behind all of them and covers none.
- **A plain strip** (`anim`) and **a king's spell's rendered clip on a unit** (`bfxOnce`) over a fighter go under that body whole.
- A fighter's under layers are dropped when the fighter goes (`stepUnder`).
- **A king's spell on a unit had gone too quiet** under the body alone (the Heal was all but hidden by whom it healed). Its
  clip is now 15% larger under the body, glow and all, and a second copy stays over the fighter as thin as its measured cover
  allows (as an ultimate's does). In the photograph the Heal is a green pool and glow round the healed, who stand in front of
  it. The Shield's dome is still fairly strong over those inside it.

### The loops round a fighter, and a showcase's gathering

`docs/samples/blender-fx/on-fighter-loops-393.jpg` (the Cleric's Spirit Guardians and Vael's black sun, before above, now below).

- **`aura-spirits` and `aura-eclipse`** (`bfxRound`): whole under the body of the fighter they are round, inside that fighter, and
  over the fighters only as thinly as their measured cover allows (the spirits cover 85% of a body: 18% strength over it; the
  black sun, which hangs above the head, 21%: 70%). In the photograph the guardians stand behind and beside the Cleric's party,
  which is in front of them; the black sun hangs over Vael as before.
- **A showcase's gathering on the caster** (the hero's own wind-up played again) goes through the two layers as the wind-up does.

**A fault of mine, found here and mended:** the push before this asked, as a fight began, for the ring clip of every hero's
element (for the ring at a struck fighter's feet). That is up to five more atlases, and it took the fight's atlases over their
budget, so a strike's own atlas could be given up to make room and the strike fell back to its older look: Vael's golden sweep and
his black sun went missing in a photograph. The rings are no longer asked for ahead; each lies with its element's showcase
beats, which the caster's showcase has just played when the strike lands. Decoded memory in the staged fight is back to 40 MB
(it had risen to 46 MB of the 48 MB budget).

Still over a fighter at the old strength, by decision or not yet done:

- **a painted beam's segments** (`paintBeam`, six tenths where a segment crosses a body): a beam ends ON its target, and is a thin
  strand for under a second; thinning it to the ceiling would cut the beam off short of whom it strikes. Left as it is; say if
  it should change.
- **the ailments' front layers** (`ailmentLayer.ts`, half strength, held by a test at no less than 0.45): they are what tells the
  player a fighter is poisoned, burning or frozen. Not changed without the director's word.

## The survey: rendered clips on a fighter, worst first

238 clips on a fighter; over 0.15: 235; over 0.5: 193 (before this change every one of them was drawn over the fighter at full strength).

| Clip | Most of the body covered | On average | Lasts |
| --- | --- | --- | --- |
| `ult-banneret-strike` | 100% | 83% | 1300 ms |
| `ult-bombardier-windup` | 100% | 87% | 2000 ms |
| `ult-corsairSurgeon-strike` | 100% | 64% | 1300 ms |
| `ult-corsairSurgeon-windup` | 100% | 100% | 1900 ms |
| `ult-gorgon-strike` | 100% | 71% | 1300 ms |
| `ult-harpooner-aftermath` | 100% | 87% | 1600 ms |
| `ult-harpooner-windup` | 100% | 85% | 1700 ms |
| `ult-inquisitor-aftermath` | 100% | 84% | 1800 ms |
| `ult-knight-strike` | 100% | 70% | 1300 ms |
| `ult-kraken-aftermath` | 100% | 86% | 1700 ms |
| `ult-kraken-strike` | 100% | 87% | 1300 ms |
| `ult-kraken-windup` | 100% | 72% | 1900 ms |
| `ult-paladin-aftermath` | 100% | 70% | 1700 ms |
| `ult-plagueDoctor-strike` | 100% | 70% | 1300 ms |
| `ult-priestess-strike` | 100% | 80% | 1300 ms |
| `ult-rifleBot-strike` | 100% | 59% | 1300 ms |
| `ult-samuraiCommander-strike` | 100% | 50% | 1300 ms |
| `ult-shambler-aftermath` | 100% | 87% | 1600 ms |
| `ult-yamabushi-windup` | 100% | 95% | 1900 ms |
| `ult-priestess-windup` | 100% | 88% | 2200 ms |
| `ult-vael-windup` | 100% | 85% | 1900 ms |
| `ult-knight-aftermath` | 100% | 69% | 1700 ms |
| `ult-wolfBard-strike` | 99% | 69% | 1300 ms |
| `ult-mummy-strike` | 99% | 64% | 1300 ms |
| `ult-dhampir-windup` | 99% | 87% | 2000 ms |

The whole table is `tools/blender-fx/body-cover.json` (238 clips).

## Photographs (393x852)

- `docs/samples/blender-fx/on-fighter-regen-393.png`: the owner's case, the Druid's party with the Prayer of Healing on it and at
  the wave's end, cut close and doubled. Before: a green column over each hero. After: a green pool under each hero and small
  wisps; every sprite is plainly seen.
- `docs/samples/blender-fx/on-fighter-ultimates-393.jpg`: the Priestess, the Corsair Surgeon and the Knight, before above and
  after below. The Priestess's pillar, the Surgeon's spout and the Knight's dome stand behind the heroes, who are in front of them.

## Not yet under the rule

See the end of the section on the painted effects, above.


## Since: wisps that are wisps

The wisps round a fighter were a bright head and a row of five shrinking puffs, and read as soft puffs. They are re-rendered as the
owner's picture has them: a long thin thread of smoke that tapers to nothing behind its head, sways as it goes and curls over on
itself at its tail, with a fainter second thread wound round it (the `wisp` scene; two ribbons, each widened across its own
heading so it keeps its width through the curl). Nothing in the rules changed: the same five wisps, the same turn and climb, the
same sizes and strengths in front of the body and behind it.

- The clip: 22 x 11 px and 8 frames before, 31 x 16 px and 10 frames now (a longer, slower loop of 800 ms).
- Memory (decoded): core atlas 0 unchanged at 16,695,380 bytes; core atlas 1 from 2042 x 963 (7,865,784 bytes) to 2042 x 984
  (8,037,312 bytes), 171,528 bytes more. Nothing more is asked for at a fight's start.
- Photographs: `docs/samples/blender-fx/wisps-before-after-393.png` (two moments before, the same two after; every hero carries a
  haste, a rally or both) and `docs/samples/blender-fx/wisps-clips.png` (the clips, before above and after below).
- Verdict: they now read as threads curling round the body and the body is clearer than under the puffs. They are fine things: in a
  crowded melee they are easy to miss, and a first render at two thirds of this width was too faint to see at all.

`STATUS=1` with `WATCH=1` in `tools/blender-fx/ult-shots.mjs` gives each hero a lasting status for the photographs; `ROOT=` in
`tools/blender-fx/shots.mjs` photographs another build's page.

## Since: ROW-UNDER, an ultimate's under copy on the ground's rows

An ultimate's copy under a fighter lay in that fighter's own layer. The board is drawn a diagonal row at a time, so that layer was
over everything farther back: the fighters of the rows behind were covered by it, and the nearer rows' tiles were drawn over its
near edge (a ring at a fighter's feet was cut off by the tiles in front of it).

It now lies on the ground. `Fx.rowUnder` gives a layer over each diagonal row of tiles the picture's box touches (`rowsUnder`), on
the board's own row layers (`BoardView.groundRow`, as the ground paintings use; the board itself is not changed), each cut to its
row's columns (`rowCut`: the top and the near sides, so the picture is not cut along a cliff's face), and one layer behind the
whole board (`behindRow`) for what stands above the far edge. The same clip plays on each. So the copy is under the fighter it is
on, under the fighters of every row behind, and over every tile. The ring at the feet and the glow go with it. A row's layer with
nothing playing is not drawn. Where the board gives no rows the fighter's own layer is used, as before.

- Photographs: `docs/samples/blender-fx/row-under-before-after-393.png` (the Cleric's and the Knight's strikes, before then after:
  the ring whole on the ground, the ally beside the Cleric standing over it).
- Memory: nothing new is loaded; no atlas changed.
- Frame cost, the CPU throttled four times, every frame of the show timed with the graphics card made to finish
  (`FRAMES=1 node tools/blender-fx/ult-shots.mjs --picks ...`). The strike's frames, mean ms (95th percentile), two runs before and
  three after:

  | | before | after |
  | --- | --- | --- |
  | Cleric | 3.9 (22), 4.8 (26) | 5.5 (32), 5.1 (28), 6.4 (27) |
  | Knight | 4.9 (26), 4.5 (24) | 4.7 (26), 6.7 (34), 4.9 (26) |
  | Paladin | 2.5 (6), 2.8 (9) | 4.2 (9), 2.0 (4), 2.3 (4) |
  | Druid | 5.8 (31), 5.1 (29) | 7.0 (37), 4.9 (29), 7.1 (31) |

  The runs vary by a millisecond or more among themselves. Read plainly: up to about a millisecond more on the mean and a few on
  the 95th percentile for the strikes with a ring under several fighters, nothing measurable for the Paladin's. Eleven to
  twenty-two row layers are made in a fight and each is drawn only while something plays on it.
- Not covered: the painted hazes and the king's spells still go under the farthest-back fighter they overlap (`bodyAt`), not on
  the rows; a picture's part over a chasm shows on the layer behind the board.

## Since: ROW-UNDER 2, what lies flat on the ground goes on the ground's rows

The owner's standing rule is that no effect may hide a hero. After ROW-UNDER, the painted bits, the painted strips and the
king's spells' clips still went under the farthest-back fighter they overlapped (`bodyAt`), in that fighter's own layer, where
the nearer tiles cut a ring at the feet.

**The first try was wrong, and the director refused it.** It put all three on the rows whole (a copy on the layer over each row
the picture covers, cut to that row's columns). The king's Rally then buried the two heroes in the middle of the party under
large flame tongues: Rally's `hit` clip is tall flames, and a tall picture laid on the rows stood up the screen over the fighters
of the rows behind. Taking the cut rows away in the page (`EVAL=` in `tools/blender-fx/shots.mjs`) brought the heroes back, so
the rows were the cause; taking away only the layer behind the board did not.

**The rule now** (the director's): on the rows, only what lies FLAT on the ground.

- A painted bit that is flat (a ring, a disc: laid along the ground, `flatOf`) is copied to the rows at `ROW_PAINT` (0.7). A
  painted bit that rises (a flame, a pillar, sparks, a healer's haze) stays in the one fighter's own layer, as before.
- A king's spell's clip made to lie on the ground (`layer: 'ground'`: rings, a disc of light) is copied to the rows at
  `ROW_CLIP.ONE` (0.85), or `ROW_CLIP.WIDE` (0.55) when it is wider than a tile and a half. A clip that rises stays in the
  fighter's own layer, as before.
- A painted strip cannot be told apart, so it always stays in the fighter's own layer, as before.
- **Rally's ring** was the Ring scene's hoops round a solid orange middle, which read as a plate once all of it showed. It is
  now `hoops` (the same hoops with a faint glow inside), so it reads as rings of light.

So what changed in the end is small: flat rings under a party are whole on the ground and under every fighter, where they were
cut by the nearer tiles. Flames, pillars and hazes are exactly where they were.

- **Memory:** nothing new is loaded; the atlases are the same size (Rally's ring was rendered again in its own place).
- **Frame cost**, a whole ordinary fight of 20 s (1250 frames), the CPU throttled four times, the graphics card made to finish
  each frame (`WATCH=1 FRAMES=1 node tools/blender-fx/ult-shots.mjs --picks ...`), three runs each:

  | | mean ms | median | 95th percentile |
  | --- | --- | --- | --- |
  | before | 3.6, 3.8, 3.6 | 2.3, 2.3, 2.2 | 9.2, 9.5, 8.9 |
  | after | 4.0, 3.7, 3.5 | 2.3, 2.4, 2.0 | 9.8, 9.7, 9.7 |

  Within the runs' own spread. Two row layers are drawn on the average through such a fight (18 at the most).
- **Photographs:** `docs/samples/blender-fx/row-under-spells-before-after-393.png` (before above, after below: the king's Heal,
  Rally and Cleanse on the party, and the Cleric's Prayer of Healing in an ordinary fight) and
  `docs/samples/blender-fx/row-under-spells-rally-cleanse-2x.png` (Rally before and after, Cleanse before and after, at twice the
  size).
- **Not understood, and said plainly:** by the geometry a row's piece is cut to that row's own columns and should not stand over
  the fighters of the rows behind, yet it did, on stepped ground. The cuts were in place (each row's layer had its mask). The
  flat-only rule removes the fault whatever its cause, because a flat picture has nothing to stand up. **An ultimate's copy
  (ROW-UNDER, above) uses the same rows and is the ultimate's whole strike clip, rising parts and all**, so the same fault may
  be there on stepped ground. It was not seen in the four ultimates photographed, on gentler ground.

`ROOT=`, `EVAL=` and one fixed seed in `tools/blender-fx/shots.mjs` make two builds' spell photographs the same field and let
one layer be taken away to see what another shows.


## Since: the flat-only rule for ultimates too

The director's order after Rally: an ultimate's copy under a fighter follows the same rule. The strike's own clip rises, so it and
its glow are back in the fighter's own layer under its body (as before ROW-UNDER); only the flat ring at the feet goes on the
ground's rows (whole, under every fighter), as would a clip made to lie on the ground. Where a board gives no rows the ring is in
the fighter's own layer too.

- Memory: nothing loaded, no atlas changed.
- Photographs, on the Undead's stepped ground (`ARMY=undead`), before above and after below:
  `docs/samples/blender-fx/row-under-ultimates-stepped-393.png` (the Cleric, the Knight, the Druid, the Great Sage) and
  `docs/samples/blender-fx/row-under-ultimates-stepped-2x.png` (the same at twice the size, round the strike).
- Verdict, plainly: before and after are all but the same picture in these four. The fault feared (a rising strike standing over
  the fighters of the rows behind) did not show in the before pictures either, so this change is a safeguard and not a fix that
  can be seen. Of the four, only the Cleric's and the Knight's strikes play on a fighter; the Druid's spikes and the Sage's dome
  are one picture in the midst and were never on the rows. The Paladin, the High Priestess and the Wanderer were asked for and did
  not fire in the tool on this land, so they are not shown.

## Since: SHOW-THROUGH, a strike's one large picture never hides a fighter

The director's order, from the Druid's spikes standing solid over the fighters among them: audit every ultimate whose strike is
one large picture laid in the midst of what it struck, and make sure none hides a fighter while keeping the strike's moment.

**The way chosen.** The picture is not thinned, moved or cut (its moment is the strike, and a rising picture cannot go on the
ground's rows). Each living fighter whose body the picture's box overlaps (`amongPicture`) is drawn AGAIN over the picture, on a
layer above the moment's (`Fx.showThrough`, `UnitView.mirrorBody`: the body's own picture, pose, tint and filters, followed every
frame). The copy is absent for the rule's 150 ms flash, then comes up to `THROUGH.ALPHA` (0.85) and goes out with the picture
(`throughAlpha`). A body at 0.85 over the picture leaves the picture over that body at the ceiling (0.15) exactly, and whole
everywhere else. One copy a fighter; a second picture over the same fighter only lengthens its stay. Reduced motion has no
flash: the fighter is seen from the start.

**Where it applies.** Every strike not played on one fighter (the 21 below, and the strikes laid on tiles and down a line), and
every clip of a showcase (the Druid's green spikes are her showcase's, before her strike of vines).

**The 21 ultimates whose strike is one picture in the midst:** Druid, Archer, Last Star, Astrologer, Barbarian, Blood Gargoyle,
Dread Pirate, Falconer, Hemomancer, Juggernaut, Karasu Tengu, Lancer, Lightning Mage, Minotaur, Strigoi, Seraph, Shambler, Siege
Bot, Eclipse Sovereign, War Drummer, Fire Wizard. The Great Sage's dome is played on him and is left as glass.

- Photographs, each on the Undead's stepped ground at the same moment of the strike, before above and after below, seven
  ultimates a sheet in the order above: `docs/samples/blender-fx/show-through-{1,2,3}-393.jpg` (393x852) and
  `show-through-{1,2,3}-2x.jpg` (round the strike at twice the size).
- Memory: nothing loaded; no atlas changed.
- Frame cost of the whole show, the CPU throttled four times, the strike's frames, mean ms (95th percentile), two runs each:

  | | before | after |
  | --- | --- | --- |
  | Druid | 5.1 (30), 5.6 (32) | 7.6 (45), 4.2 (27) |
  | Seraph | 4.7 (28), 5.0 (28) | 5.2 (32), 6.9 (36) |
  | Lightning Mage | 6.3 (37), 4.9 (30) | 7.0 (38), 5.5 (35) |

  The runs differ among themselves by more than the builds do: up to ten more sprites for a second is not measurable here.
- Verdict. In all 21 the fighters among the picture can be read in the after row; the clearest are those that were worst (inside
  the Lightning Mage's cloud, the Seraph's pillar, the Shambler's cloud, the War Drummer's rings, the Juggernaut's dust). The
  strikes look a little less solid for it: a fighter seems to stand in front of a pillar it is inside.
- Limits, plainly:
  1. The show's clock is held on the blow, so the "150 ms" for which the picture is whole over the bodies lasts about 300 ms of
     real time.
  2. A fighter that only overlaps the picture's BOX is shown through too, even where the picture is empty there: harmless (its
     copy is over nothing), but it means a fighter standing in front of a picture is drawn over it at 0.85 where it would have
     been at full strength under it; no difference shows.
  3. The copy is the body alone, not a status's wisps or an ailment's overlay; health bars are above the effects as before.
  4. The copies are sorted among themselves by depth, but each is see-through, so where two overlap the farther shows faintly
     through the nearer.
  5. Each ultimate was photographed once, on one land, with the tool's own party.

## The Dragoon's wind-up (a wind-up that passed the rule and still lost its hero)

The Dragoon's wind-up was a body-high wall of flame (`flames` at its full size, then `flare`). It went through the two layers as
the rule asks: whole for 150 ms, then 18% over her (its measured cover of a body was 0.833) and whole behind her. She could be
made out through it, but a wall of fire the height of her body right behind her and a wash of the same fire over her left her
lost in it at every moment of the two seconds: the rule's numbers were kept and its purpose was not.

So the clip itself was changed (`WIND_OPT.dragoon` and `WIND_OWN.dragoon` in `tools/blender-fx/effects.py`): a pool of fire at
her feet, sixteen low tongues licking round her (half a unit high where they were two), and a ring running out along the ground
in place of the tall flare. Its measured cover of a body is now 0.472, so it is drawn 32% over her; nothing of it stands higher
than her knees. Only her own atlas changed, and it is smaller: 987 x 641 before, 906 x 605 after (2,530,668 bytes decoded to
2,192,520).

`WIND=<ms,ms,...>` on `tools/blender-fx/ult-shots.mjs` photographs a caster that many ms into its wind-up, 200 px round it, and
writes what is drawn over it and under it with each one's strength (`DSF=3` for three times the size).

Before and after, at 60, 300, 700, 1200 and 1700 ms: `docs/samples/blender-fx/windup-dragoon-before-3x.jpg`,
`windup-dragoon-after-3x.jpg`. The first frame of each is inside the 150 ms flash.

What the lesson is for the other wind-ups: a measured cover over the ceiling says the clip is drawn thin over the body, not that
the body reads. A tall clip in the hero's own colours behind it can still lose it; those are to be looked at one by one.

## The wind-ups' audit (all seventy)

Every hero's wind-up was photographed in a fight at 200, 600, 1000 and 1400 ms, each moment three times with nothing stepped
between: as played, without the effects, and without the effects and the caster. The caster's own pixels are where the last two
differ, so what the wind-up does to them is measured and not judged by eye (`tools/blender-fx/wind_audit.py`, from the
photographs `WIND=` leaves): `took` is the mean change of the body's pixels, `lost` the share of them changed by more than a
quarter, `edge` how well the body's outline still stands out from what is round it (1 as clear as the bare fight), `wall` the
share of the outline with the effect behind it. The table, worst outline first: `docs/samples/blender-fx/windup-audit-table.txt`;
the twelve worst, four moments each: `windup-audit-worst-2x.jpg`.

**What it found.** One fault, in every tall wind-up: a long wind-up gathers twice (`ultGather` is called again as the band
leaves) and a showcase plays the wind-up on its caster again, and each playing began with the rule's 150 ms flash at full
strength. So a tall clip hid its caster whole two or three times in one show: the Priestess, the Inquisitor, the Lightning Mage
and the Seraph were gone at 1000 ms (`lost` 0.31, 0.20, 0.36, 0.23), the Bombardier at 1400. Only the first beginning flashes
now (`flash` on `bfxUlt`; `again` on `ultGather`; the showcase's playing passes false). After: the Priestess 0.00, the
Inquisitor 0.00, the Lightning Mage 0.02 at the same moment (`windup-one-flash-2x.jpg`, before on the left).

**What it did not find.** No other wind-up loses its caster as the Dragoon's did. Outside the flash, no hero's body is changed
by more than 0.14 on average. The ones I looked at at full size and left: the Lancer (a white gust lies across his legs through
the whole wind-up, `lost` 0.25; his cover is 0.289 so it is drawn 52% over him: head, plume and armour read, his legs do
not well); the Lightning Mage (a pale mage in a pale cloud: she reads, weakly); the Time Witch and the Paladin (pale rings and
glow behind them: they read). Astrax's `edge 0.00` is the measure failing, not the wind-up: he is under his cut-in's dim in two
of the four moments.

**What the audit does not cover:** one fight, one facing and one spot for each hero (a clip is not symmetric, so another facing
can sit differently); 393 x 852 only; reduced motion not photographed; the first moment (200 ms) is just past the flash, so the
flash itself was not judged.

## The Lancer's gust and the Lightning Mage's cloud (the director's two from the audit)

- **The Lancer.** His wind-up was a tall gust swept across the tile, through his legs, the whole wind-up (`lost` 0.23 to 0.26 at
  every moment). It is now a streak of wind along the ground and dust kicked up round his feet (`trail`, then `dust` at
  `h=0.3`): nothing of it over his knees. `lost` 0.01, 0.07, 0.01, 0.01 at the same four moments.
- **The Lightning Mage.** Her cloud was the element's own pale blue-white round a pale mage. Thinning it was not the answer (the
  director's word): the cloud is now a storm cloud in dark storm grey, lit plainly whatever the element (`storm` on the `cloud`
  scene, used by her wind-up only), so she stands out against it; her sparks still play in it in the element's colours.

Before over after, four moments each, at 2x: `docs/samples/blender-fx/windup-lancer-before-after-2x.jpg`,
`windup-lightningMage-before-after-2x.jpg`. (The before and after fights are not the same fight: the party stood differently.)
The storm cloud is plain: smooth grey lumps with little inside them. It does its work of contrast and no more.
