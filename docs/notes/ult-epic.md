## ULT-EPIC 3: the showcase on every use, and room for the multi-volley ultimates

Branch `claude/ult-epic-2` (main 0.496.0 merged in). The owner's answers to two of round 2's questions (below), and nothing else changed:
an Eidolon's first call on Auto still plays in full, and the weights and the Eidolons' lengths are as they were.

1. **Every ultimate fired by hand plays its full showcase** (the hero seen doing what the words say), not only a hero's first use and
   every tenth. `wantsShow` no longer reads the count or a setting; the "Showcase again" row (First / 5th / 10th / 20th) is gone from
   Settings, and an old save's choice is read without harm and kept nowhere. **Shorter ultimates** is still the way out (the three
   staged parts without the showcase, round 2's table), and Auto's are still the 1.5 s banner. `Meta.ultSeen` is still counted.
2. **A showcase with a salvo to land after it may run to about 7 s** (`ULT_LIMITS.SALVO_MAX`), so its wind-up and aftermath are not
   squeezed; every other use stays 4 to 6 s. No showcase is quickened any more.

Since the showcase now plays every time, a showcase use's whole length goes by the ultimate's weight too (`SHOW_TOTAL`), so a single
blow is still the shortest:

| Weight | A showcase use (the showcase at its shortest, 2.5 s) | With a salvo to land after it |
| --- | --- | --- |
| blow | 5.0 s | none has one |
| flurry | 5.4 s | 6.4 s (Overclock, Leviathan Line) |
| wave | 5.7 s | 6.7 s (four of the Mythics) |
| storm | 6.0 s | 7.0 s (Meteor Swarm, Hail of Arrows, Ghost Fleet, Orbital Strike, High Noon, Silver Requiem, Sky Hunt, Shell Storm, Supernova Alignment, Heavenfall) |
| summon | 6.0 s | none has one |

A longer showcase takes what it needs, up to the limit, and its weight's length is then a floor rather than a target: Issen's showcase
is 2.9 s (the crouch and the sheathe are in it), so in the captured fight it is 0.9 / 3.44 / 0.66 = 5.0 s (measured 4.96 s). Meteor
Swarm in the captured fight is a 1.35 s wind-up, a 4.54 s strike (the 2.5 s showcase, then the meteors falling live for up to 1.5 s,
the freeze and a beat) and a 1.11 s aftermath: 7.0 s (measured 6.96 s). In round 2 that same use was 0.9 / 4.54 / 0.56 = 6.0 s. The
tightest now is Shell Storm (0.97 / 5.24 / 0.79). The speed read ×2 before, ×1 on every captured frame and ×2 after, as before.

Files: `src/ultShowRules.ts` (`wantsShow`; `showDue`, `EVERY_CHOICES` and `DEFAULT_EVERY` removed), `src/ultStageRules.ts`
(`SALVO_MAX`, `SHOW_TOTAL`, `stagesFor`), `src/settings.ts` (the row and `ultEvery` removed, the toggle's words), `src/ultMoment.ts`.
**Tests changed to the owner's new requirement**: `test/ult-show.test.ts` (the showcase on every use, where it was the first and every
Nth; the setting's test; a showcase with a salvo up to 7 s, each at its own pace, with a wind-up of 0.9 s and an aftermath of 0.7 s at
least) and `test/ult-stages.test.ts` (the 7 s limit for a showcase with a salvo; a showcase use keeps its weight's order).
The strips in `docs/samples/ult-epic/` were retaken on this build at the three sizes: `samurai-<W>.jpg` (Issen: the showcase, 5.0 s),
`wizard-<W>.jpg` (Meteor Swarm: 7.0 s), `gorm-<W>.jpg`, `reduced-wizard-393.jpg`, `reduced-askel-393.jpg`; `first-kunoichi-393.jpg`
was dropped (every use is that now).

---

## ULT-EPIC 2: longer shows in three stages (ultimates 4 to 6 s, Eidolons 4 to 10 s)

Branch `claude/ult-epic` (from main 0.492.0). The owner: "the ultimates still feel off. I want them to feel epic... I want the ultimates
to take between 4-6 seconds and for the game to slow to 1x speed for the animation then back to where it was after. keep the rule where it
runs shorter when it's on auto. Lets do the same for eidolons. Make them feel more epic too. 4-10 seconds for the casting." This round is
timing, staging and feel with what the game already has. No new art: the stages are data, so a frame sheet can be hung on each later
(BLENDER-FX, `claude/blender-fx`). The first round's note follows below, unchanged.

### The three stages

Every ultimate fired by hand, and every Eidolon called in full, plays as a **wind-up**, a **strike** and an **aftermath**
(`src/ultStageRules.ts`, pure). For an ultimate:

| Stage | What plays (all from what the game had) |
| --- | --- |
| Wind-up (the fight held) | The band slashes in with the hero's art, name and the ultimate's name, and stays for the whole stage. The board dims but for the hero and what it will touch, and the element's colour closes in round the screen's edge as the stage goes on (`.umTint`). The hero is posed where it stood as it cast, drawing back for its blow and turned to its foes (a dash or a leap has already moved it in the sim), and the camera pushes in to 1.4 with the hero framed just under the band. Power gathers on it twice (the second as the band leaves). The cast's own numbers and cuts are kept back until the blow. Sound: the slash's sting at once, then the charge, timed to end on the blow; the music stands back 4 dB for the whole show (`duck('ult')`). |
| Strike | The freeze (0.24 s), the bursts on what was struck, the flash, the heavy sting, the shake, the slow beat; the camera lets go and the follow takes it back. A flurry or a storm bursts again in beats on the next of what it struck (`echoes`: smaller bursts, a softer sting, a lighter shake). The veil stays deeper for longer than before (0.55 over 0.7 s, was 0.3 over 0.42 s). A showcase (first use and every Nth, as before) and a salvo still in the air are inside this stage. |
| Aftermath (the fight runs again, at x1) | The element's light lingers where the blow fell and fades over the stage (`.umAfter`), dust rolls off each spot and motes drift up (`Fx.ultAfter`), and the veil eases out to nothing. |

Length by weight (ms; `ULT_STAGES` has every hero by kind, `ultWeight` says which a kind is):

| Weight | Wind-up | Strike | Aftermath | Total | Further bursts after the blow | Ultimates |
| --- | --- | --- | --- | --- | --- | --- |
| blow | 1600 | 1100 | 1500 | **4.2 s** | none | Issen, Berserker Leap, Cavalry Charge, Wrath of the Reef (4) |
| flurry | 1700 | 1400 | 1600 | **4.7 s** | 240, 460, 680 | Assassinate, Hundred-Hand Strike, Stampede, Plague Tide, Overclock, Killing Spree, Keelhaul, Lightning Storm, Belfry Swoop, Dance of Seven Mirages, Leviathan Line (11) |
| wave | 1900 | 1500 | 1700 | **5.1 s** | 420, 820 | every ring, blessing and change: Indomitable, Holy Nova, Time Stop, Battle Hymn, Metamorphosis and 31 more (36) |
| storm | 2000 | 1900 | 1800 | **5.7 s** | 380, 760, 1140 | Hail of Arrows, Meteor Swarm, Call Lightning, Cloud of Daggers, High Noon, Ghost Fleet, Orbital Strike, Inferno Breath, Silver Requiem, Sky Hunt, Shell Storm, Supernova Alignment, Solar Tribunal, Descent of the Host, Heavenfall (15) |
| summon | 2200 | 1700 | 2100 | **6.0 s** | 620 | Wall of Thorns, Hall of Mirrors, Conjure Animals, Mass Resurrection (4) |

The weight comes from the hero's showcase style (a run or a leap is a blow; hops, blows, hooks and a burrow a flurry; a ring, a blessing
or a change a wave; what falls from the sky or is shot in turn a storm; fighters called up a summoning), with three set by hand
(`OWN_WEIGHT`: Stampede and Overclock are flurries, Mass Resurrection a summoning).

One use can differ from the table, never from the limits (`stagesFor`): a **salvo in the air** is waited for inside the strike (the fight
running at x1 under the dim), so the strike grows and the aftermath gives way (Meteor Swarm by hand: 2000 + 2040 + 1800 = 5.84 s); a
**showcase** is the first part of the strike, and the wind-up and aftermath give way to it (always 6.0 s; no further bursts, the
showcase is the staging). A showcase too long to fit with its salvo is played a little quicker (1.3 times at most: Shell Storm).
Before this round a showcase use ran up to 7.2 s with its salvo, which the old test did not count.
The tightest case is a first use with a salvo (Meteor Swarm's first: wind-up 0.9 s, strike 4.54 s, aftermath 0.56 s): the showcase and
the fall of the meteors take most of the 6 s.

**Eidolons** (`fullOf` in `eidolonRules.ts`: the old four-second call stretched evenly to each one's weight, so a heavier one crosses more
slowly, gathers longer, strikes in slower beats and leaves a longer aftermath; the freeze on the first blow grows a little and is counted):

| Eidolon | Wind-up (horn, pass, sprite, build-up) | Strike (its beats, with the freeze) | Aftermath | Total |
| --- | --- | --- | --- | --- |
| Askel, the Cinderhound | 3262 | 1138 | 600 | **5.0 s** |
| Voltara, the Copper Goddess | 3806 | 1294 | 700 | **5.8 s** |
| Nivra, the Rime Wyrm | 4349 | 1452 | 799 | **6.6 s** |
| Aurelan, the Lion of Dawn | 4893 | 1608 | 899 | **7.4 s** |
| Gorm, the Quarry Titan | 5709 | 1842 | 1049 | **8.6 s** |
| Vaelkhar, the Dragon King | 6525 | 2076 | 1199 | **9.8 s** |

`eidolonStages(m)` gives the three stages of a call from its beats, and the call's layer carries `data-act` (windup, strike, aftermath)
beside its shot (`data-stage`).

### The speed

The fight's set speed is never written by a show. Each frame the page asks `momentSpeed(this.speed, a show is playing)`, which is 1 while
an ultimate's moment or an Eidolon's full call plays and the set speed otherwise (`main.ts`, `standView.ts`). So there is nothing to put
back and no way to leave it wrong: when the show ends, is skipped by a tap, the fight ends or the screen is left (the queue is cleared),
a sheet or a scene pauses it (it is still the show; it carries on afterwards), or a second ultimate starts during the first (they queue;
x1 across both), the next frame reads the set speed again. The speed button now says so: it reads ×1, dimmed, for the show and the set
speed the moment it is over (`#speed[data-show]`). The Last Stand keeps the same rule but its own button does not change its face.
Measured in the real game with the speed set to ×2 (`tools/ult-epic/stages.mjs`): ×2 before, ×1 on every frame captured, ×2 after, and
the show's real length within a frame of its stages (Issen 4.18 s, Meteor Swarm 5.81 s, Gorm 8.59 s).

### On Auto

Unchanged for ultimates: with Auto ultimates on (or an auto-replay) there is no hold and no dim, only the hero rows' banner for **1.5 s**
over a fight that keeps its speed (`ULT_MOMENT.SHORT_MS`, `fullScene`). For Eidolons, new: with Auto on the call is the short one,
**2.2 s** of beats (2.36 s with its freeze), which was already what plays with "Full Eidolon scenes" off. An Eidolon's first call is
still always in full and cannot be skipped. Auto never blows the horn, so this is a hand-blown horn while the ultimates are on Auto.

### The simulation

Not touched: no file under `src/sim/` changed, so no fight's outcome can have moved and no balance was measured. The show holds the
fight or lets it run at x1; both are the page stepping the same deterministic battle later or slower.

### Reduced motion

The three stages stay, the same lengths (the freeze's time is given to the strike, so a show is not shorter). No camera move, no shake,
no freeze, no slow beat; the band and the hero stand still; the tint and the afterglow fade in and out once, softer; the aftermath's dust
is one still puff at each spot. Captured: `docs/samples/ult-epic/reduced-*.jpg`.

### The camera and the HUD

The push-in aims above the hero by as much as it takes to put the hero just under the band (44 px below it), and never lower than 56 px
above the bottom of the camera's safe rectangle (`this.safe`, CAM-SAFE), so it is not behind its own name and not under the hero rows.
The camera's own limits (`clampCam`) still apply after that. The spell row, the tactic plaque and the horn are under the dim through the
wind-up and are not moved; a tap anywhere skips, as before. Checked at 393x852, 360x780 and 412x915 (the strips below).

### For BLENDER-FX: hanging a sheet on a stage

- `ULT_STAGES[kind]` (and `stagesFor` for one use) and `eidolonStages(fullOf(id))`: each stage's `at` and `ms`.
- `STAGE_ART[kind][stage]` is where a sheet is named (`StageArt`: the sheet, its frame count, where it is drawn (`caster`, `struck`,
  `board`), how many tiles wide, once or looping). It is empty: nothing is attached yet.
- `stageFrame(art, k, ms)` says which frame shows `k` of the way through a stage.
- On the page: `UltQueue.stageNow` is `{ name, k, ms }` each frame, and the moment's layer carries `data-stage`. The moment's own effects
  layer (`Fx.moment`, drawn while the fight is held) is where a sheet should be played: `Fx.ultGather` (wind-up), `Fx.ultImpact`
  (strike) and `Fx.ultAfter` (aftermath) are the three calls to stand a sheet in for or beside. **The player for `STAGE_ART` is not
  written**: its shape depends on how the sheets are packed, so it is left to the builder who has them.

### Files

- `src/ultStageRules.ts` (new, pure): the stages, the weights, the limits, the Eidolons' lengths, `STAGE_ART`, `stageFrame`.
- `src/ultMomentRules.ts`: a moment carries its `stages`; the queue's phases take their lengths from them (`stageNow`, `echoes`; a salvo
  not seen to land gets its blow as its wait ends, inside the strike); `ultCues` (the charge delayed to end on the blow, the echo's cue).
  A moment with no stages plays the old lengths, which the older tests still check.
- `src/ultMoment.ts`: the stages on the page (the tint, the two gatherings, the posed caster, the echoes, the afterglow, the duck, the
  camera's aim under the band). `src/ultEpicRules.ts`: `liftedDim` takes a depth and a time (`STAGED_LIFT`, `STAGED_LIFT_MS`).
- `src/render/fx.ts`: `ultImpact` takes a size; `ultAfter`. `src/render/audioRules.ts`: the `ult` duck, let go with a fight's others.
- `src/eidolonRules.ts`: `fullOf`, `callMs`, `momentOf(first, setting, id, auto)`. `src/eidolonCall.ts`: `auto`, `data-act`.
- `src/main.ts`, `src/standView.ts`: `auto` for the Eidolon's call; `main.ts`: the camera's aim, the speed button. `src/fightHud.css`,
  `src/index.html`: the tint, the afterglow, the button.
- Tests: `test/ult-stages.test.ts` (new: every ultimate's stages 4 to 6 s and in order; every use within the limits; the queue takes
  exactly its stages for every shape, calm too; the echoes; the speed in every case; nothing writes the speed; Auto short; every Eidolon
  4 to 10 s by weight; the sheet's frame; the sound).
- **Tests changed to the owner's new requirement**: `test/ult-moment.test.ts` ("about 3 s" is now "4 to 6 s", stepped frame by frame);
  `test/ult-show.test.ts` (a showcase's 4 to 6 s now counts the whole moment, the freeze and the salvo's wait included, which is
  stricter than before); `test/eidolon-moment.test.ts` (a full call "three to four seconds" is now 4 to 10 s for every Eidolon; Auto
  gives the short call); `test/eidolon-moment.test.ts` and `test/eidolon-pass.test.ts` run their timing checks over every Eidolon's own
  call as well as the old shape.
- Tools: `tools/ult-epic/stages.mjs` (two frames in each stage on a fixed clock, and the speed and the real length logged) and
  `tools/ult-epic/stage-strips.py`.
- Captures (`docs/samples/ult-epic/`): `samurai-<W>.jpg` (Issen, a blow), `wizard-<W>.jpg` (Meteor Swarm, a storm with its salvo) and
  `gorm-<W>.jpg` (the Quarry Titan) at 393, 360 and 412 wide; `reduced-wizard-393.jpg`, `reduced-askel-393.jpg`;
  `first-kunoichi-393.jpg` (a first use: the showcase inside the strike; dropped in ULT-EPIC 3, where every use is one).

### For the owner to decide (answered: see ULT-EPIC 3 at the top; 1 and 4 were taken up, 2, 3 and 5 left as they are)

1. **Should every hand-fired use play the showcase** (the hero really doing what the words say), not only the first and every 10th? The
   other uses now have the three stages and the right length, but the showcase is still the strongest version. It is one more choice in
   Settings, "Showcase again: every use"; nothing else would change.
2. **An Eidolon's first call on Auto** still plays in full (the owner's earlier rule: the first is never cut). Say if Auto should
   shorten that too.
3. **The Eidolons' order by weight** (Askel 5.0, Voltara 5.8, Nivra 6.6, Aurelan 7.4, Gorm 8.6, Vaelkhar 9.8 s) is the builder's
   reading of them; any can be moved by one number in `EIDOLON_MS`.
4. **A first use with a salvo is squeezed** to fit 6 s (a 0.9 s wind-up and a 0.56 s aftermath round a 4.5 s strike). If the owner
   would rather those few run to about 7 s, as they did before, the limit can be lifted for showcase uses only.
5. **36 of the 70 ultimates are "wave"** (5.1 s). If some of them should be heavier or lighter (Metamorphosis, Full Moon, Time Stop),
   `OWN_WEIGHT` takes a line each.

---

## ULT-EPIC: an ultimate's payoff

Branch `claude/ult-epic` (from main 0.258.0; main 0.259.0 merged in). The director captured eight ultimates in the real game after ULT-CUTIN (docs/notes/battle-hud.md)
and found the opening good but the payoff flat: after the banner the ultimate played the same effect as a normal skill at normal size on a
board still dark but for a ~200 px pool round the caster, the banner held still like a title card, and nothing marked the blow landing. The
owner approved a plan; this is all of it, with the owner's painted kit. Before and after, at 393x852: `docs/samples/ult-epic-before-393.png`
(150, 700, 1250, 1450, 1800, 2400 ms) and `docs/samples/ult-epic-after-393.png` (150, 700, 1160 (the freeze), 1450, 1800, 2400 ms), for
Issen, Holy Nova, Stampede, Meteor Swarm, Maelstrom and Call Lightning. Also: the banner mid-motion (`ult-epic-banner-393.png`,
`ult-epic-banner-maelstrom-393.png`), the blow (`ult-epic-impact-393.png`, `ult-epic-impact-holy-nova-393.png`,
`ult-epic-after-impact-maelstrom-393.png`), `ult-epic-360.png`, `ult-epic-412.png`, `ult-epic-reduced-393.png`, `ult-epic-saver-393.png`.

### What the moment does now (full setting, Auto off: `fullScene`; Auto and the short banner are unchanged)

- **The opening (1.15 s, the battle held).** The band slashes in and keeps moving: speed lines rush through it (CSS lines in the element's
  colour, or the painted kit's), bright streaks run along its top and bottom edges, the band slides one way (`umSlide`) while the hero's art
  drifts the other (`umArt`), and the name is stamped in (scale 2.4 to 0.9 to 1, with a white glow that settles). Power gathers on the hero
  under it (`Fx.ultGather`: the kit's gathering, else the element's wind-up from the pack) on the moment's own effects layer, which runs while
  the fight's effects are held. The page camera leans in on the hero (`UltMoments.focus`, 1.3 over the view the follow camera holds) and a
  sting sounds (`ultSlash`). The band slashes away 260 ms before the opening ends, so the blow lands on an open board.
- **The blow (`UltQueue.strike`).** For an instant or lingering ultimate as the opening ends; for a delayed one (a salvo in the air) when the
  page sees its first blow land (`UltQueue.land`, from `note`), or as its wait ends if it never does. The fight and every effect freeze for
  0.15 s of real time (`HIT_STOP_MS`, the queue's `stopLeft`: `holdsBattle` true, `runsEffects` false), on the first, white-hot frame of a
  huge burst of the element on each one struck (`Fx.ultImpact`: up to five, two on battery saver; else on the area's tiles, else on the hero),
  with a shock ring and the pack's nova over it; a flash of the element's colour round the blow eases in and out once (`.umFlash`, 0.55 s, a
  CSS one-shot); a heavy sting (`ultImpact`); and a hard shake as the freeze lets go (the fight's trauma, so none when shake is off or motion
  is reduced). The camera's lean ends and the follow eases back to exactly the view it held (the fight has not moved).
- **The effects.** While its moment plays, the ultimate's own effects (events by the caster on its cast tick, and its salvo's blows while it is
  waited for: `Fx.epic`, set by `UltMoments.note`) are drawn about twice the size: every particle and pack strip (`Particles.boost`, with
  their drift and growth), the painted parts played once (`paintOnce` goes through the particles), the strips `anim` draws, and beams 1.6
  times thicker. A layer already huge only grows to 300 world px across (`boostedScale`), so the old ultimate nova does not turn into a haze.
  Fields, ground loops, auras and walls keep their size (it is the ground they really cover); so do the words. Effects scheduled for later
  (`later`) keep the scale they were scheduled with. Another hero's skill on the same tick is unchanged, and so is every normal skill. The
  old short-version touches (the Pixi dim and the camera push in `skillName`) are left out of the full moment, which has its own.
- **The light.** The dim is a canvas now (`.umDim`, drawn at half resolution): dark but for soft pools over the caster, each one the
  ultimate struck or helped, and each tile it worked on (an area's centre, a dash's ends, a zone, its terrain), with a softer light over all
  of them together when they spread (`litPools`), so a wide effect is never hidden. The pools follow the fighters as the camera moves. As
  the blow lands the dim eases from full to 30 % over 0.42 s (`liftedDim`, a smoothstep, never a step), and the fade takes it out from there.
- **Length.** `IMPACT_MS` went from 850 to 700 ms, so an instant ultimate's whole moment with the 150 ms freeze is the same 2.45 s as before.
  A tap still skips (and drops the freeze). **Since BATTLE-POLISH** ([battle-polish.md](battle-polish.md)) a hand-fired ultimate's moment is
  about 3 s: a 1.45 s opening, a 0.24 s freeze, a 0.5 s slow-motion beat inside a 0.65 s impact, and a 0.65 s fade.
- **Reduced motion**: no shake, no zoom, no freeze; the band and the lines stand still and fade in and out; the flash is a soft 0.3 fade.
  **Battery saver**: two bursts at most, and the particle density and cap as usual. **No flashing**: nothing that loops changes brightness
  (the lines' and edges' loops move their position only; `test/no-flicker.test.ts` passes); the flash and the name's glow are one-shots.
- **The Last Stand** gets all of it but the zoom (its camera is its own, `standCam.ts`); its `Fx` stays `still`, so no shake there either.

### The painted kit (session `u-ultimate`), imported

The owner's 13 painted sheets (PR #231, branch `art/ult-kit`, merged here) are in `art-source/spell-fx/u-ultimate/`: `ult-speedlines`
(`beam`, 6 frames, a loop), `ult-edge` (`beam`, 4), `ult-gather` (`cast`, 8, once) and `ult-burst-<element>` (`impact`, once, 4 tiles) for the
ten elements. They are in `tools/spell-fx/spell-parts.json` under `u-ultimate` (`import-spell-art.py --check`: 13 of 13 pass) and packed
into `src/art/fx/spells/u-ultimate.webp` (1536x672, 229 KB; all the atlases 3.28 MB of the 5 MB cap with main 0.259.0's repaints) with its entry in `index.json`. Only
that session was added: every other atlas is byte for byte as on main and their `index.json` entries are unchanged (another worker is
importing repaints of b, e, f and g). `build.mjs` already copies every atlas and lists it in the service worker. Contact sheet of the
sources: `docs/samples/ult-epic-kit-contact.png` (the coverage of each frame in yellow); in fights: `docs/samples/ult-epic-after-393.png`,
`docs/samples/ult-epic-kit-elements-393.png` (dark, blood, forest, lightning, fire).

The game uses it with no code of its own: the bursts and the gathering through `spellFrames` (`burstPart`: the kit's burst, else the
fallback), the band's speed lines and edges on a canvas (`.umKit`, drawn from the atlas's picture, `spellImage`, tiled and scrolled, tinted
to the element) in place of the CSS lines.

**The honest look at each sheet.**
- *The bursts (ten)*: strong and clear on dark boards (the dark one's violet rim reads well); each grows from a seed to a dome with a 2:1 shock
  ring, then dies to faint wisps. Frames 7 and 8 of every sheet are all but empty (under 1 % of the cell), and frame 1 is a small seed (7 %).
  The game holds a burst's first frame through the 0.15 s freeze, so a fix in `tools/spell-fx/spell-fixes.json` plays frames 2 to 7
  (`[1, 2, 3, 4, 5, 6]`): the freeze shows the bloom, and it still ends on faint wisps. At their peak they fill 43 to 54 % of the cell.
- *The gathering*: motes and a tightening ring at the feet over four sparse frames (3 to 7 %), building to a flare in the last; it plays over
  the opening (1.15 s, 8 frames) as painted. Good.
- *The edge*: seamless (left and right columns match within 0.4 of 255), steady (frames differ by about 2): it reads as a glowing wavy line.
  Its sparks hardly move between frames, so the scrolling gives it its motion.
- *The speed lines*: seamless (within 1.4) and steady (no frame fades), but each cell has one big soft white blob in its middle, so tiled
  along the band it is a row of beads rather than one streak. In the band, scrolled and tinted behind the art, the beads blur into a bright
  central streak and it works; held still (reduced motion) the beads show. **Worth repainting**: the middle glow as one even horizontal
  band running out of both edges (seamless like the lines), not a blob. (Repainted so in round 2: [spell-art-repaint.md](spell-art-repaint.md), "Round 2".)
- **Poison** was not seen in a fight (the Gorgon's test fight ended before her ultimate); its sheet looks right on the contact sheet.

**Fallbacks kept** for a missing atlas (an old build, or the session left out): the burst falls back to the strongest painted burst the game
has for the element (`FALLBACK_BURST`: Meteor Swarm's for fire, Thunderwave's for lightning, Holy Nova's for light, Circle of Death's for dark,
Spike Growth's for the forest, Plague Tide's for poison, Seismic Slam's for earth, Whirlwind's for wind, Reap's for blood) drawn about 3
tiles across, or the pack's element burst at 3.2 times for ice; the band's lines are CSS. **A missing atlas costs nothing**: the atlases are
loaded from `index.json`'s sessions only, so no request is made for one that is not there (the capture tool counts 404s: none, with and
without the kit).

### Files

- `src/ultEpicRules.ts` (pure): `ULT_EPIC` (scale 2, beam 1.6, the 300 px cap, hit-stop 150 ms, zoom 1.3, lift to 0.3 over 420 ms, shake
  0.75, five bursts or two, the pools' radii), `KIT_SESSION`, `KIT`, `burstKey`, `FALLBACK_BURST`, `burstPart`, `ultScale`, `boostedScale`,
  `epicEvent`, `ultTargets`, `burstSpots`, `litPools`, `liftedDim`, `ultZoom`.
- `src/ultMomentRules.ts`: the queue's freeze and blow (`strikes`, `stopLeft`, `since`, `calm`, `strike`, `land`), the lifted `dim`,
  `IMPACT_MS` 700; a moment carries its element and what it touched (`el`, `targets`, `landing`).
- `src/ultMoment.ts`: the dim canvas, the moving band and the kit canvas, the gathering, the impact (bursts, flash, sting), `focus`; new
  options `tile` and `fx`.
- `src/render/fx.ts`: `epic`, `setEpic`, the `moment` layer, `stepMoment`, `ultGather`, `ultImpact`, the boost in `anim`, `later` and
  `paintBeam`. `src/render/particles.ts`: `boost`. `src/render/spellArt.ts`: `spellImage`.
- `src/render/soundRules.ts`, `src/render/audioProcessors.ts`: the `ultSlash` and `ultImpact` cues, measured with `tools/audio-mix/measure.mjs`
  and set to their targets in `tools/audio-mix/targets.mjs`: the slash -22.4 LUFS momentary (gain 2.49), the impact -18.2 with its peak at
  -3.1 dBFS and nothing over the limiter (gain 1; the ultimate's own cue is -16), so the blow sits just under the cast.
- `src/main.ts`: the moment's anchors through the world's own scale (`toClient`, so the light stays on the fighters while zoomed), `tile`,
  `fx`, and the camera's lean (`ultm.focus`). `src/standView.ts`: `tile`, `fx`.
- `src/fightHud.css`: the moving band, the lines, the edges, the flash, reduced motion.
- `tools/spell-fx/spell-parts.json` (the kit), `tools/spell-fx/spell-fixes.json` (the bursts' frames), `tools/spell-fx/import-spell-art.py` (its
  docstring); `art-source/spell-fx/u-ultimate/` (the owner's sheets), `src/art/fx/spells/u-ultimate.webp`, `index.json` (the session added).
- Tests: `test/ult-epic.test.ts` (new); `test/ult-moment.test.ts` (the freeze after the opening, the lifted dim in the fade, the length with
  the freeze); `test/spell-fx.test.ts` (the manifest's count: 144 sheets, 271 rows with the kit).
- Screenshots: `tools/ult-epic/shots.mjs` (its own clock: the Pixi ticker stopped and the page's frame stepped by hand, the CSS animations
  moved with it, so every run takes the same pictures) and `tools/ult-epic/strips.py`.
