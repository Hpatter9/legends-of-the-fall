## ULT-CAMERA: the camera sees the casting, then the effect

Branch `claude/ult-camera` (from main 0.502.0). The owner: "with the ultimate changes, make sure the camera follows the effect. like if
a spell is cast i want to see the casting, then the effect after." Before this the camera pushed in on the caster through the wind-up
and then simply let go, so the fight's own follow drifted back to the middle of the fight while the strike played wherever it fell.

### An ultimate fired by hand

The rules are in `src/ultCameraRules.ts` (pure, tested); `ultMoment.ts` lays a moment's camera out once its caster is posed, and
`main.ts` sends the page's camera where it says.

| Beat | What the camera does |
| --- | --- |
| The casting | On the caster, as before: the push-in under the band through the wind-up, and through a showcase it stays with the hero doing what the words say. The casting is always seen for at least 0.65 s (`CAST_MIN`). |
| The travel | It leaves for where the effect lands, timed to arrive 0.16 s before the blow (`LEAD_MS`). Its length goes by how far it has to go on the screen (0.36 to 0.9 s), and that length is the camera's ease, so it is a deliberate move, not a snap. A showcase that lets go of its caster early (a staff raised for a storm, a burrower sunk) sends the camera on then, so it follows the storm to where it falls. |
| The strike | It frames the whole effect: every fighter struck, every one helped, the tiles worked on, and the strike sheet's own box on each spot it bursts on, with a little room round it, inside the camera's safe rectangle. |
| The hold | It stays there through the aftermath. |
| The return | When the show ends, the fight's own follow has the camera again and glides it back (the same slow ease as after the player lets go of the camera). |

- **Close together:** when the caster and the effect fit one frame without being made small (no less than 0.82 of the zoom the fight's
  follow holds, `BOTH`), that one frame is used from the moment the camera leaves the push-in, and kept. A blessing on the friends beside
  the caster, a ring round the caster, a blow on the foe in front of it: all of these.
- **The effect's real size:** the strike's box is read from the sheet itself (`strikeArt`: the clip's frame size and anchor from
  `blenderFxData.ts`, times `BFX_SCALE` and the size it is drawn at), the same numbers `Fx.ultImpact` draws it with. So when the strikes
  are made bigger the frame grows with them; nothing here names a size. The tests run every ultimate's sheet at 1, 1.5 and 2 times its
  size.
- **Too wide to fit:** when the whole effect cannot be shown even at the camera's widest (the whole board across), the bursts are
  gathered, in the order they go off, into as few frames as each fit, and the camera steps between them through the strike, each with
  an even share of the time from the blow to the show's end (`strikeViews`, `stepAt`). A single burst whose own sheet is wider than
  the room is framed about its middle at the widest zoom.
- **A salvo:** the camera is at the tiles it is aimed at before it lands; when its blows show what it really struck the frame is laid
  out again to hold them (the timing is not changed).
- **However the show ends**, the camera is the fight's again on the next frame: played out, skipped by a tap (a moment skipped before
  its blow goes straight back, with no detour to the strike), the fight over or the screen left. The page asks for a frame only while
  a moment plays.

Kept as they were: **Auto** (the short banner, no camera move: a moment is only made with Auto off), **Shorter ultimates** (the same
camera, without the showcase), the **speed rule** (read, never written), the **manual camera** (a camera the player has moved in the
last four seconds is never taken; the check is the first thing the page does), and nothing under `src/sim` changed.

**Reduced motion:** no camera travel at all. No plan is made, so the camera stays wherever the fight's follow has it for the whole show
(the push-in was already off).

**Shake off, motion on:** the push-in on the caster stays off (it always went with the shake setting), but the camera still goes to the
effect and frames it. Say if that setting should hold the travel back too.

### An Eidolon's call

The call frames the board's picture (a CSS frame on the canvas and on the call's own layer, so its trail and runs stay on their tiles),
not the page camera. `frameBoard` now puts every shot on as a shift and a zoom about the page's top-left, so one shot eases into the
next without a jump, and in full the call has a strike frame (`pictureFrame`):

- **The summoning** is seen as it was: the horn, the pass across the screen, the sprite coming on.
- **Through the build-up** the frame travels to the foes' side, timed to arrive 0.16 s before the strike.
- **The strike** is framed there: the middle of the living foes is brought to the middle of the room the player sees, zoomed in as far
  as the foes' side fits (never past 1.2). The picture must still cover the screen, so the shift is held to what the zoom allows.
  A staged strike wider than the screen (**Askel's wall of fire**) is not zoomed in on, which would only crop more of it: it gets at
  most 1.08, enough to lean it towards its middle. The snap on the first blow is now a little closer about the first foe struck, on
  top of the strike's frame, and returns to it.
- **It holds** through the aftermath and eases back as the fight runs again.

The short call (the setting off, or Auto on) keeps its plain shots. Reduced motion: no frame at all, as before.

### A king's spell cast by hand

A spell cast on a tile by hand (a tap with the spell chosen, or its orb dragged onto the board) gets a glance: the camera eases in
0.32 s to frame the spell's target, the tiles it touches and its cast sheet's box, stays 1.1 s in all, and the follow glides it back
(`glanceAt` in `main.ts`, `spellView`). No dim, no slowdown, no hold of the fight. It never zooms in closer than the fight's own frame
(it is a glance, not a push-in) and zooms out only as far as it must. It does not play over a camera the player has just moved, while
an ultimate's show or an Eidolon's call is running, or with reduced motion (`spellGlance`); a spell over the whole field has no one
place to look at and gets none; a spell cast by Auto gets none.

### Not done

- **The Last Stand** has its own camera (`standCam.ts`) and is unchanged: there an ultimate still plays without a camera move, as it
  did (its moment has no `room`).
- The Eidolon's strike frame does not read each Eidolon's effect size: it uses the foes' side of the board (most of the screen's
  width) for all, and the full width for a staged one. Only Askel is staged so far.

### Files

- `src/ultCameraRules.ts` (new, pure): `ULT_CAM`, `strikeArt`, `artBoxAt`, `effectBox`, `fitView`, `shows`, `strikeViews`, `stepAt`,
  `bothView`, `travelMs`, `travelPlan`, `camPlan`, `camAt`; `pictureFrame`, `zoomAboutPt`; `spellView`, `spellGlance`.
- `src/ultMomentRules.ts`: the queue's `clock` (real ms since the moment began, the freeze counted).
- `src/ultMoment.ts`: `camOf` (a moment's plan), and `focus` gives the strike's frame once the casting has been seen; the `room` option.
- `src/main.ts`: the frame taken as the camera's target with the travel's length as its ease, the glide back, `camRoom`, `glanceAt`,
  the Eidolon's `safe`.
- `src/eidolonCall.ts`: `frameShot`, `strikeFrame`, `applyFrame`, `unframed`, `snapOnto`; `frameBoard` goes through them.
- Tests: `test/ult-camera.test.ts` (the caster's frame; the travel's timing; the strike's frame holding every struck spot and the
  sheet's box for all 70 ultimates at 393x852, 360x780 and 412x915 and at 1, 1.5 and 2 times the sheets' size; a strike wider than the
  room and the stepping; one frame for caster and effect when close; the return however the show ends; the Eidolon's frame; the
  spell's glance).
- Tool: `tools/ult-camera/shots.mjs` (five frames a show on a fixed clock: the caster, the travel, the strike, the hold, the return;
  it logs the camera's numbers and whether the caster and everyone touched are inside the safe rectangle at the strike).
- Strips (`docs/samples/ult-camera/`, at 393, 360 and 412 wide): `kunoichi-<W>.jpg` (Assassinate fired as the fight begins, on foes
  across the field: blades on far targets), `wizard-<W>.jpg` (Meteor Swarm fired as the fight begins: a storm, the camera travelling
  to where it falls), `beastmaster-<W>.jpg` (Conjure Animals: a summoning), `wanderer-<W>.jpg` (Panacea: a blessing on allies),
  `askel-<W>.jpg` (the Cinderhound's call) and `spell-<W>.jpg` (the king's Meteor cast by hand).
