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
