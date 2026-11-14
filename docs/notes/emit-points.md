# EMIT-POINTS: effects leave from the right spot on the hero

The owner: "Make sure the effects in battle come from the correct spot on the hero. Like the gun shots should come from the end
of the gun."

## The audit: where effects started before

Every effect that leaves a fighter started from a share of that fighter's height above its feet, on its centre line, whatever its
sheet or pose (`src/render/fx.ts`):

| What | Where it started |
| --- | --- |
| a shot (an arrow, an orb, a bullet's tracer) and a gun's flash, `Fx.shot` | 0.55 of the height up, on the centre line; the flash 8 px ahead of that |
| an arc (chain lightning, a charm, a hex), `Fx.arc` | 0.5 of the height |
| a painted streak from a caster to each it struck (`m.streak`) | 0.45 |
| a king's spell's bolt thrown from its caster (`p.from === 'caster'`) | 0.45 |
| a healer's thread of light to the one healed | 0.5 |
| a melee stroke (`Fx.slash`) | on the struck fighter's middle, turned along the line from the attacker's middle |
| a spear's thrust (`Fx.thrust`) | 0.5, running out two thirds of the way |
| an ultimate's wind-up, strike and line | the caster's feet or a share of its height |

So a gun fired from the chest, an arrow from the belt, and a mage's orb from the middle of the robe.

## What it is now

- **The points are data** (`src/render/emitRules.ts`, pure): for each sheet a kind (`muzzle`, `bowHand`, `staffTip`, `hand`,
  `mouth`) and two offsets, for the view from the front and the view from behind (a hero walking up the board shows its back, and
  the pose differs), in the sheet's own pixels from the middle of the frame's bottom edge: x towards the way the figure faces, y
  up.
- **Measured, not guessed.** Each was read off the sheet's release frame: the third frame of its attack row, which is the one on
  show as the shot leaves (the swing lasts the wind-up and 250 ms more, and the shot leaves at the wind-up's end). The frames were
  laid out at three times their size under a 10 px grid and the point read from it; `tools/emit-points/check.py` then checks each
  point against the sheet's drawn pixels (all 54 are on or within 4 px of something drawn; one, the Harpooner's hand from behind,
  was 6 px off and was corrected) and can draw every frame with its point marked. `tools/emit-points/anchors.json` is the same
  table, and a test holds the two equal. A reading from a grid is good to about 3 px of the sheet, 1 to 2 px on the screen.
- **Mirrored and scaled** (`emitWorld`, `UnitView.emitPoint`): the offset is multiplied by the body's own scale, whose x is
  negative when the fighter is mirrored to face the other way, and by the fighter's size, so a larger fighter's point is farther
  out.
- **The fallback** (`emitOffset`, `Fx.emitOf`): a sheet with no point, or a fighter wearing another look (a form, a guise, an
  awakened sheet, whose poses were not measured), keeps the old place. Nothing is worse than before.
- **What starts from the point now:** a shot and a gun's flash (the flash at the muzzle itself, no longer 8 px ahead), a caster's
  own arc (a shock's jump still runs body to body), the painted streak, a king's spell thrown from its caster, a healer's thread.
- **A shot's tail no longer trails back through the shooter.** A rendered orb or tracer carries its tail in its clip; as it left,
  the tail lay back across the body. It is now drawn no longer than the way the shot has come (`tailShare`, never under 0.35 of
  itself so the head is there from the first frame).
- **Looks only:** nothing in `src/sim/` is touched; the rules import nothing of the fight.

## Covered, and where it stops

All 27 heroes that shoot: Last Star (mouth), Fateweaver, Archer, Fire Wizard, Lightning Mage, Wanderer, Gorgon, Druid, Ranger,
Warlock, Gunslinger, Rifle Bot, Wolf Bard, Time Witch, Siege Bot, High Priestess, Great Sage, Hemomancer, Dhampir, Falconer,
Astral Sphinx, Plague Doctor, Bombardier, Astrologer, Inquisitor, Corsair Surgeon, Harpooner.

Not done:

- **The foes that shoot** (15 of them on ten sheets: the three Gorgons and their maze kin, the Orc Archer, the bone volley's
  archer, the Lich King, the Yokai Witch and Nine Tails, the Shaman King, Voltara and Vaelkhar). Their sheets are of another make
  (no view from behind, five to fifteen attack frames), so the release frame must be worked out for each. They keep the old place.
- **Heroes that cast without shooting** (the Cleric, the Kitsune, the Paladin and the like): their arcs and threads keep the old
  place until their sheets are measured.
- **Awakened and borrowed looks** keep the old place.
- **Melee strokes** still land on the struck fighter's middle; a thrust still starts from the attacker's middle.
- **Ultimates' own shows** (the Dragoon's flames among them) are placed as they were.

## Proof

`STAGED=1 WATCH=1 node tools/blender-fx/ult-shots.mjs --picks a,b,c` puts each hero, as the fight opens, in its release frame
facing each of the four ways in turn, looses its own shot, and photographs it one frame later, 130 px round the hero. Only the
hero's picture and the effects are moved; the fight is not stepped.

The sheets (before in the left four columns, after in the right four; the four facings across; four heroes a sheet, three
times the size): `docs/samples/blender-fx/emit-points-{1..7}-3x.jpg`.

## Verdict

- The guns are the plain gain, as the owner asked: the Gunslinger's, the Rifle Bot's, the Bombardier's, the Corsair Surgeon's and
  the Inquisitor's flashes sit at the end of the barrel in all four facings, where before they sat on the chest.
- The mages' orbs leave the hand, the quill or the staff's head.
- As a shot leaves, its clip is drawn short (its tail held to the way it has come), so for a frame or two an orb looks like a
  small flare, not a ball. It was a ball with its tail lying across the caster.
- The archers' arrows are a small painted sprite; in the staged photographs I could not make the arrow out well enough to say it
  sits on the bow hand. Their points passed the pixel check, no more than that.
- The Fateweaver was not staged (she did not come into the tool's party), so her point is checked against her sheet only.
- I looked closely at two of the seven sheets (the first and the sixth: eight heroes); the others I have not opened at full size.
- The staged photographs loose the shot at the nearest foe whatever way the hero is turned, so in some the shot flies away from
  where the hero faces; they show where the shot starts, not a real aim.

## Since: the heroes that cast without shooting

The director's next step. `WHO=1 WATCH=1` in the photograph tool plays a fight and lists every fighter something leaves from and
whether it has a point; run over fights of all 56 heroes that do not shoot, 40 s each, it named fourteen (the Kitsune, Karasu
Tengu, Kunoichi, Shambler, Illusionist, Buccaneer, Mercenary, Mummy, Reaper, Dread Pirate, Arc Blade, Queen Dragoon, Tyrant,
Strigoi). The three healers whose thread of light was still drawn from the body's middle (a call the first pass missed) make
seventeen: the Cleric, the Paladin, the Satyr.

- **A second table, `CAST`** (`emitRules.ts`), of the same shape. A skill's effect fires as its cast begins and plays through
  it, so the point is read on the second frame of the skill's row (`attack2`, or the attack row where a sheet has none): the
  middle of the cast. x may be negative here (the Paladin's mace and the Kitsune's fan are raised behind the head). A new kind,
  `blade` (the Mercenary's sword point, the Arc Blade's crystal).
- `emitOffset` gives a hero its shot's point, or its cast's where it has none. A hero that shoots still casts from its shot's
  point: its cast row was not measured.
- `tools/emit-points/anchors.json` now has the two tables (`shot`, `cast`) and `check.py` checks both: all 34 new points are on
  or within 4 px of something drawn (one, the Mercenary's sword from behind, was 4.5 px off and was corrected).
- The healers' thread now leaves the point too.
- Proof: `STAGED=cast` puts each hero in that frame, facing each way, and runs a strand from it to the nearest foe.
  `docs/samples/blender-fx/emit-casters-{1..5}-3x.jpg` (before in the left four columns, after in the right four).
- Verdict: plain where the weapon is far from the body: the Paladin's strand leaves his raised mace, the Mercenary's his sword's
  point, the Cleric's her hand, the Kitsune's her fan. For the Mummy, the Reaper and the Shambler the crops are crowded and I can
  only say the strand starts near the hands. I looked closely at two of the five sheets.
- Limits: the staged strand is lightning for every hero but the Kitsune (her own charm) since it is the tool's stand-in for
  whatever the skill sends; one frame of the cast is measured, and the cast moves through four; a hero the 40 s fights did not
  show casting is not in the table and keeps the old place.

## Since: the foes that shoot

Fifteen foes shoot, on ten sheets: the three Gorgons, their three maze kin and the Gorgon Queen (`gorgon_1` to `_3`), the Orc
Archer, the bone volley's archer, the Lich King, the Yokai Witch and Nine Tails (one sheet), the Shaman King, Voltara and
Vaelkhar.

- **A third table, `FOE_EMIT`** (`emitRules.ts`): one point a sheet, since a foe's sheet has no look from behind, and the
  frame it was read on. That frame is worked out, not assumed: a shot leaves at the wind-up's end (0.4 of the attack, 500 ms at
  most) of a swing 250 ms longer, so the frame on show is that share of the attack row: the eleventh of the Gorgons' sixteen and
  of the bone archer's fifteen, the seventh of the Yokai's ten, the fourth of five for the rest. A test holds each frame to that
  sum and each sheet to facing right as drawn with no rear view.
- The points: the Gorgons' heads (their thrown arm reaches behind them in that frame, so the gaze is the honest place), the two
  archers' bow hands, the Lich King's staff head, the Yokai's hand, the Shaman King's skull, Voltara's raised hand, Vaelkhar's
  mouth. `check.py` checks them against the drawn pixels (all ten on or within 1 px, after two were pulled 3 px onto the figure).
- Proof: `STAGED=foe` does for each kind of shooting foe in a fight what `STAGED=1` does for a hero.
  `docs/samples/blender-fx/emit-foes-{1,2}-3x.jpg` (the Orc Archer, the bone archer, the three maze Gorgons, the Yokai Witch).
- Verdict, plainly: this proof is weaker than the heroes'. A foe's shot is a small painted arrow or bone, not a bright orb. The
  Gorgon's is seen to move from her body to her head; the two archers' arrows are too small in the crops for me to say they sit
  on the bow hand. The Lich King, the Shaman King, Voltara, Vaelkhar, Nine Tails and the Gorgon Queen were not in the fights I
  staged (bosses and trials): their points are checked against their sheets only.

## Since: melee strokes across the weapon's reach, and the thrust

- **Every fighter's reach is read off its sheet by a tool**, not by eye: `tools/emit-points/reach.py` takes the frame on show as a
  melee blow lands (six tenths through the attack row: the wind-up, 0.4 of the attack and 400 ms at most, of a swing 250 ms
  longer) and finds the forward-most thing drawn on it, the weapon's end, a claw, a horn: the forward-most drawn column, at the
  middle height of what is drawn in the last 4 px before it. It writes `src/render/reachData.ts` (generated): 190 sheets, heroes
  and foes, 75 of them with a look from behind read too; a sheet drawn facing left is read mirrored. With an output path it
  draws every frame with its point.
- **The stroke** (`Fx.slash`, `strokeLay`, `STROKE_AT`): centred half way from the weapon's reach to the struck fighter's middle,
  so it lies across the weapon's end and the near side of the one struck. It was on the struck fighter's middle. Its turn is
  unchanged (the line from body to body): a first try turned it along the line from the weapon's end to the one struck, which is
  a few pixels long, and strokes came out almost upright.
- **The thrust** (`Fx.thrust`): the shaft runs out from the weapon's own height, not half the body's.
- A fighter in another look, or on a sheet with no attack row, keeps the old place.
- Proof: `STAGED=swing` puts a hero in its strike frame, turned to the fighter nearest it, and swings at that fighter.
  `docs/samples/blender-fx/emit-strokes-3x.jpg` (fifteen melee heroes, before and after side by side).
- Verdict, plainly: a small change. The stroke sits some pixels nearer the attacker's weapon and no longer on the far side of the
  one struck; in several pairs I can hardly tell before from after. The reach is the forward-most thing DRAWN, which is the
  weapon for most but can be a cape's edge, a wing or a shield on some sheets; I looked over the first fifty of the 265 frames
  the tool drew, not all. The foes' strokes use the same table and were not photographed.
- Found and left alone: the stroke plays as the swing BEGINS (the `swing` event), some 400 ms before the blow lands and its
  spark plays. So the pose under it is the wind-up's first frame, not the strike frame its place was read from. Moving the
  stroke to the landing would be a change of timing, not of place; it is the director's to order.

## Since: the stroke plays as the blow lands

The stroke was played on the `swing` event, as the swing BEGAN: over the wind-up's first frame, about 400 ms before the blow
landed, and gone (240 to 300 ms long) before the blow's spark played. So the stroke and the spark were two separate moments and
the stroke never met the weapon. The director's order: move it to the landing.

- `strokeLands` (`emitRules.ts`): the stroke plays on a `hit` whose source is the blow itself, by a fighter that does not shoot,
  on the one it was aimed at (not those a wide blow splashes). `Fx.show` calls `slash` there, just before the spark. The pose
  under it is then the strike frame the reach was read from. The thrust moves with it.
- **A blow that is dodged has no stroke now.** The `dodge` event does not say whose blow it was, and the one that dodged has
  its own whoosh of wind. Before, the stroke had played 400 ms earlier whether or not the blow then landed.
- **What else was keyed to the swing's start, checked:**
  - the blink's dash and cut: keyed to the `blink` event and its skill blow (`slashesOf`), not to `swing`: untouched;
  - sound: the heavy wind-up's swoosh is still on the `swing` event (it is the sound of the swing beginning), and the blow's
    own sound was always on the hit: untouched;
  - the ON-FIGHTER flash: the stroke and the spark now begin together, so for the rule's 150 ms both are whole over the struck
    body where they were 400 ms apart. Both then go on by the rule as before. More is over the body in that first moment;
  - reduced motion: the stroke holds its one still frame for its length, as before, now at the landing;
  - the Assault's field and the Last Stand's hall read `swing` for their own things and are untouched.
- Proof, real fights this time: `SEE=land:knight,...` steps a fight until a blow by that hero lands and photographs it 50 ms
  later. Looks only, so the two builds' fights are the same to the frame. `docs/samples/blender-fx/emit-strokes-landing-3x.jpg`:
  the same fifteen heroes, before (main) and after, at three times the size.
- Verdict: in the after frames the stroke is there with the spark, at the weapon, where before the spark was alone: plain for
  the Samurai, the Kunoichi's claws, the Mercenary, the Reaper, the Dragoon, the Demon Swordsman. Where the blow was a crit, the
  crit's large gold cross is over both and the stroke adds little (the Barbarian, the Paladin, the Ninja Monk). It is one moment
  now, and a busier one.

## Since: the ultimates' own shows, the Dragoon's flames first

- **Her mouth** (`ULT_EMIT`, `ultEmitOffset`, `UnitView.ultPoint`): read on the second frame of her ultimate's row at four times its
  size, front and back. From behind her mouth is hidden by her hair: the point is the front edge of her head at the mouth's
  height.
- **The breath** (`mouthRun`, `MOUTH_RUN`): two to six small flames run from her mouth to the first spot of her line, one every
  14 px, each 45 ms after the one before and larger than it (0.3 of its size at the mouth, 0.75 as it reaches the line). The
  line's own flames wait for the run, so the fire is seen to leave her and then go down the line. Any hero given a point in
  `ULT_EMIT` whose strike is laid down a line gets the same; today that is the Dragoon alone.
- **Found on the way:** the small flame clip (`beat-flame`) was never held in a fight. Every call for it returned false, on main
  too, so her showcase's "stream of flame along the line" had always fallen back to the painted flames. The clip is now asked
  for at a fight's start when a hero with a mouth point is in it, so her showcase's rendered flames play as well.
- **Memory.** That clip lies in the fire showcase's atlas (1020 x 1011, 4,124,880 bytes decoded). The photograph tool's count of
  what is held through her show is the same before and after (ten atlases, 36.0 MB decoded): the atlas was already loaded when
  her showcase first played; it is now loaded at the fight's start instead, for fights with the Dragoon only. Handed to the
  graphics card through the show: 2.4 MB before, 6.3 MB after, since its clips are now drawn.
- Proof: `MOUTH=48,112,176,256` steps her show until the mouth run begins and photographs 200 px round her.
  `docs/samples/blender-fx/emit-dragoon-mouth-3x.png`.
- Verdict, plainly: a flame is at her face where there was none, and it is the right spot. But it does not read as a breath
  blown outwards. Her line in the photographed fight began on the tile beside her, so the run was three flames going DOWN from
  her face to the ground at her feet, and the show's clock is held on the blow just then, so the four photographs I took are the
  same frozen moment: I have one picture, of one facing, not a sequence. I have no before picture of the same moment either (the
  two builds' fights differ by then); "before" is that nothing was drawn at her mouth.
- **Not done:** every other ultimate's show. The wind-ups gather on the caster's body and the strikes land where the ability
  lands; which of them should leave a hand, a staff or a weapon has not been audited. The Dragoon was the one named.


### The breath corrected: outwards at mouth height

The first version ran the flames from her mouth DOWN to the ground at the line's first spot, and in the photograph it was a pillar
of fire falling from her face to her feet, over the knight beside her. The director held it and ordered the fix.

- The run now goes outwards along the line at the mouth's own height, to the point that high over the line's first spot; it
  comes down only there, where the line's flames take it on. Each flame is turned to point the way the breath goes (the clip is
  an upright flame; `mouthRun` gives the `turn`). Two to nine flames, 16 px apart, 40 ms apart, from 0.3 to 0.8 of their size.
- **What the proof found:** her line's tiles always begin on the tile beside her, so in an ordinary fight the run is the
  shortest one, two flames, however long the line is: a flame at her mouth pointing down the line, and then the line alight. A
  longer run (six flames) appeared only when the strike had no tiles to burn and was laid on the foes themselves, three tiles
  off.
- Proof: `LINE=<direction>,<from>` in the photograph tool stands the foes in a row from the hero for the photograph, and `MOUTH=`
  now takes its photographs by the flames' own age (the show's clock stands still on the blow).
  `docs/samples/blender-fx/emit-dragoon-mouth-3x.png`: above, the six-flame run; below, the usual two-flame case with a line of
  four tiles; each at 0, 100 and 200 ms into the run, three times the size. Two facings, not chosen freely: they are the two the
  staging gave.
- Verdict: in the usual case a flame is at her mouth, pointing along the line, and the line lights from her outwards; it no
  longer falls to her feet. It is a small thing beside the wall of flames on the ground. The six-flame run is the one that looks
  like a breath, and play will rarely show it.
