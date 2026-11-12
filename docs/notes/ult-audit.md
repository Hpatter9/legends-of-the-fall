# ULT-AUDIT: every ultimate must show what it does

The owner's report (2026-11-12): "Take a look at all ultimates and make sure they're unique and extremely varied. I just saw spirit
guardian and it's completely different than it used to be. There aren't guardians that rotate the hero anymore."

The cause, in general: the Blender-rendered ultimates (`docs/notes/blender-fx.md`) put the same great blow (a core, two rings, rubble)
under every hero's strike, whatever the ability is, and it plays large over the effects that carried the ability's meaning. The rule from
here on: **the effect depicts the ability**. The great blow is only for abilities that are one great blow; a heal, a blessing, a ward, a
summoning, a wall, a mark, a transformation and a lasting aura each have their own shapes, and nothing an ability used to show may be
lost.

## Spirit Guardians (the Cleric), restored first

What it does (`src/sim/ultimates.ts`): an aura round her for 10 s, reach 3: foes in it are hurt each second and slowed, friends in it heal
each second and are cleansed as the spirits come.

What was found, photographed in a real fight at 0.499 and on today's build (`docs/samples/blender-fx/spirit-guardians-393.jpg`): the
aura's painted spirits (`spirit-guardians.motes`, three winged spirits circling) were still drawn in both, but at 0.6 of a tile and
see-through, close in to her body: at a phone's size they could not be seen at all, and the rendered strike's dome and rings then played
over the top. So the guardians were lost to the eye before the Blender ultimates, and those made it worse.

What is restored (`AURA_MOTES` in `src/render/movePaints.ts`, `paintAura` in `fx.ts`): four spirits (three on the battery saver), each
about a fighter tall, circling her a tile and a quarter out at shoulder height, over the fighters, for as long as the aura lasts; still
with reduced motion (they stand round her, not turning). `test/ult-audit.test.ts` holds it.

Then (0.520.0 on): the spirits are rendered in Blender to the heroes' pixel size (`spirits` in `tools/blender-fx/scenes.py`: a head,
a robed body drawn down to a wisp, two wings, two dark eyes; the loop `aura-spirits` turns each exactly into the next one's place, so it
runs round for ever). `paintAura` draws that loop on her, following her, rising out of the ground as it comes, for as long as the aura
lives (the painted spirits circle in its place until it has loaded). Her wind-up is wisps rising inside the ring the spirits will keep
(no circle of power, no pillar); her strike is the wisps and motes with that ring, round her, with no core and no rubble.

## The rules the strikes now follow

- **The great blow only under a great blow** (`GREAT` in `tools/blender-fx/effects.py`): nine of the seventy, each one blow by its own
  words: the Samurai's cut, the Barbarian's leap, the Blood Gargoyle's crash, the Seraph's descent, the Siege Bot's shell, the Wizard's
  meteors, the Astrologer's supernovas, the Bombardier's shells, the Dread Pirate's broadsides. Every other strike is its own two or
  three scenes alone.
- **A strike plays where the ability lands** (`PLACE`, the clip's `at`, `ultPlace`; `Fx.ultImpact`): `each`, a small one on every fighter
  the ability touches (a heal on each friend healed, a ward on each warded, a mark on each foe marked, a flurry's cut on each foe cut,
  the called where each arrives: 28 heroes); `self`, round the caster (an aura, a ward of his own, a change, a pull towards him: 16); else
  once in the midst of what it struck (a great blow, a storm on its tiles, a wall where it stands).
- **Pairs changed to say what the ability is**: Call Lightning is a cloud and its bolts, Inferno Breath a flare and a wall of fire, Wall
  of Thorns a hedge and vines, Mass Polymorph a spiral and a puff of smoke, Panacea hearts and motes, Heavenfall rain and the flames its
  constellations leave, Rallying Cry a pillar and a flare on each ally, Call to Arms a veil and a shout, Midnight Knell a shout and its
  rings.

## The first ten, at 0.499 beside now

`docs/samples/blender-fx/audit-ten-1.jpg`, `-2.jpg`, `-3.jpg`: each hero's ultimate fired by hand in the same fight at 0.499 (above) and
now (below), eight moments each: two of the wind-up, two of the strike, two of the aftermath, and 1.2 s and 3.8 s into the fight after.

| Ultimate | Kind | What it does | What 0.499 showed | What it shows now | Verdict |
| --- | --- | --- | --- | --- | --- |
| Spirit Guardians (Cleric) | aura | spirits circle her 10 s, hurting foes and healing friends near | a small gathering, then a gold ball and a gold ring burst; spirits too small to see after | wisps rising in a ring; four ghostly figures circling her through the aftermath and on into the fight | shows the ability; wind-up still plain |
| Panacea (Wanderer) | heal | every ally healed, shielded, hastened | the same gold ball and ring burst as the Cleric's; then the heal's own green swirls on each ally | a circle and pillar on her, then hearts and motes on each ally, then the green swirls | better (the gold ball is gone, the heal lands on the allies) but the per-ally strike is small and faint; to be made stronger |
| Arcane Surge (Sage) | blessing | every ally's pool half filled, an arcane shield on each | the same gold ball and ring burst again | blue pillars round him, then a sigil and a dome on each ally | better and its own colour; the domes on the allies need to read as shields at a glance |
| Indomitable (Knight) | ward | foes must go for him; he is shielded | a pale dust burst and ring | rings of light climbing round him, then a dome over him | shows a ward on him |
| Conjure Animals (Beastmaster) | summoning | four wolves answer | a green ball and a green ring burst, then the wolves | a green circle and pillar, then claw marks, smoke and a ring where each wolf arrives; the wolves themselves | shows arrivals; the wind-up is the shared circle and pillar |
| Gaze of Medusa (Gorgon) | mark | foes in sight turned to stone 2.5 s | green puffs on each foe petrified (its own, on each) | an eye over her in the wind-up; an eye and grey crystal on each foe petrified | shows the mark on each foe |
| Full Moon (Werewolf) | transformation | both forms at once, a howl | the painted moon, then a purple ball and ring | the painted moon (kept), then claws, a shout and a flare round him | keeps the moon; his own change reads |
| Call Lightning (Lightning Mage) | storm | a cloud over her 6 s, a bolt a second | a pale ball and ring burst, then the painted storm cloud over the field | a funnel, then a cloud with a bolt out of it; the storm cloud stays over the field after | shows the storm lasting |
| Cavalry Charge (Lancer) | dash | rides a line through every foe on it | sheet 3 | a streak along the ground, gusts and sparks where he passed | shows the line; the streak is short of his whole ride |
| Berserker Leap (Barbarian) | single blow | leaps onto the thickest crowd | sheet 3 | the great blow in red: a core that tears open, rings, rubble | a great blow, as it should be; the core still hides the crowd for its first frames |

What the sheets make plain: at 0.499 the Cleric, the Wanderer and the Sage all had the same gold ball and ring. The sameness the owner
saw is older than the rendered ultimates; the rendered great blow under every strike then kept it. Both are now gone for these.

## The wind-ups: the ability beginning

Every "wave" ultimate wound up with the same circle and pillar in its colour (the Wanderer's, the Sage's, the Beastmaster's, the
Gorgon's and the Werewolf's were one shape in five colours), every storm with the same funnel. Each of the 70 now has a wind-up of its
own (`WIND_OWN` in `tools/blender-fx/effects.py`): the ability itself beginning. The Lightning Mage's cloud gathers and sparks, the
Knight plants a slab and a dome closes over it, the Kraken's whirlpool turns and a spout rises, the Druid's vines climb, the Wanderer's
elixir fountains up into hearts, the Gorgon's eye opens over a fume, the Buccaneer's hooks whirl, the Siege Bot's targeting ring locks
and the shell's line comes down. `docs/samples/blender-fx/audit-windups-393.jpg` has five of them in a fight.

## In grey

`docs/samples/blender-fx/audit-grey.jpg` (`tools/blender-fx/grey_sheet.py`): all 70 wind-ups and strikes with the colour taken out, the
frame reduced motion holds. The recipe now refuses two heroes with the same scenes in the same order in a strike or a wind-up, whatever
their colours, and `test/ult-audit.test.ts` holds it. What the sheet still shows alike, said plainly:

- the nine great blows share their core and ring by design (a cloudy ball in a ring); what differs is what lies over it, and in the held
  frame that is little. They differ more in motion than in this one frame;
- several strikes and wind-ups are "rings with upright bars" (Ilyra, the Priestess, the Paladin, the Peasant, the Gunslinger's wind-up,
  Vael's wind-up): different scenes, similar silhouettes;
- the coiled cones (the Kraken, the Mummy, Yamabushi, Karasu, the Wizard's wind-up) are one `vortex` scene at different sizes with a
  different second scene.
- the aftermaths have not been done: about forty of them share their two scenes with another hero's in another colour.

These are the next batch: new scenes where one scene is carrying too many heroes (a second kind of funnel, a second kind of barred
ring), and the aftermaths.

## Batch 3: guardians, beasts, the gaze, shields

From the director's notes on the first sheets. `docs/samples/blender-fx/audit-batch3-1.jpg` and `-2.jpg`: 0.499 above, now below.

| Ultimate | What it does | What 0.499 showed | What it shows now | Verdict |
| --- | --- | --- | --- | --- |
| Spirit Guardians (Cleric) | spirits circle her 10 s | a gold ball and ring; spirits too small to see | hooded guardians, a face in shadow under each hood, a spear at each side, a wake of wisps behind each, circling her for as long as the aura lasts | the ability itself |
| Conjure Animals (Beastmaster) | four wolves answer | a green ball and ring | wind-up: pairs of eyes opening in dark brush round him; strike: a wolf's shape leaping out of a puff of smoke and landing in a ring, with claw marks | shows beasts arriving; it plays where the cast's events put it, which in the photographed fight is one spot, not one beast for each wolf |
| Gaze of Medusa (Gorgon) | foes in sight turned to stone | green puffs on each foe | wind-up: snakes rising round her and the eye opening; a line runs from her to each foe (`ultLinked`), then grey stone grows up over it out of a fume | shows the gaze and the stone on each foe |
| Panacea (Wanderer) | every ally healed, shielded, hastened | a gold ball and ring | the elixir fountains; a line of light runs to each friend; hearts, motes and a halo rise on her and on each of them, larger than before | lands on the friends, and reads |
| Arcane Surge (Sage) | every ally's pool half filled, a shield on each | a gold ball and ring | a dome closes over him, then over each living friend, a sigil under each | reads as shields on each |
| Mountain's Embrace (Geomancer) | a wall of stone 4 tiles across the foes' way, a shield on each friend | (in the sheet) | slabs rising in a ring of cracked ground | NOT RIGHT YET: it is still one cluster where the cast's events put it, not a wall along the tiles; in the photographed fight no wall of his was found on the board at the blow, which wants looking into |

Two things under these that were wrong before and are now right:

- **A heal or a blessing played on the caster alone.** The strike was given only the foes the cast struck (`burstSpots`), never the
  friends it helped, so the Sage's "shield on each ally" was one dome on the Sage. A strike now has its own spots by where it plays
  (`ultSpots`: the caster and each friend helped; the tiles taken; the foes struck), and where the cast's events do not name them (a
  shield and a filled pool are not heals) the fight does: every living friend, the tiles the caster's wall stands on.
- **Carried from the caster.** A healer's light and the Gorgon's gaze run out as a line of small clips from the caster to each one
  touched, and the strike lands there as the line arrives (`ultLinked`, `ULT_LINK_MS`).

Three new scenes in `tools/blender-fx/scenes.py`: `spirits` (redrawn as guardians), `beast` (a wolf: body, chest, head and snout, ears,
legs, tail, an eye, leaping out of smoke) and `eyes` (pairs of eyes opening and blinking in dark brush).

## Batch 4: one beast for each wolf, the wall's slabs, what the fight knows

`docs/samples/blender-fx/audit-batch4-393.jpg` (the usual eight moments) and `audit-batch4-blow-393.jpg` (the Geomancer and the Gorgon
60, 200, 400 and 700 ms after the blow lands: `EARLY=1` in `tools/blender-fx/ult-shots.mjs`).

- **Conjure Animals**: a beast now leaps out where each wolf stands. What is called up is not in the cast's events, so the strike asks
  the fight for the units the caster called (`Unit.owner`).
- **Mountain's Embrace**: why it was one cluster: the wall is laid only where a line across the foes' way is free (`chokeLine`,
  `raiseWall`), and in the photographed fight that was one tile or none. The strike now raises a slab on each tile the wall does stand
  on, and then on the caster and each friend (the other half of the ability, a shield on each). In the photograph: slabs and rings on
  five spots. It is still not a long wall when the sim lays a short one; that is the ability's own doing.
- **The line from the caster** (a healer's light, the Gorgon's gaze): its one small clip is asked for as a fight with such a hero in it
  begins, so it is there for the first cast, and the clip is larger (a small flare, not motes). NOT CONFIRMED BY EYE: in the photographs
  taken just after the blow the moment's flash is over the field and I cannot pick the line out. It needs a look in motion.

Found on the way, and not yet dealt with: under every "burst" and "bless" showcase the same two beats play in the showcase's colour
before the blow, a ring going out along the ground and a ring of small tongues (`call` and `nova`). They are a second sameness, in the
showcase rather than in the stages, and belong with the next batch.

## Batch 5: guardians a hero tall, a grey wolf, the line seen

`docs/samples/blender-fx/audit-batch5-393.jpg` (the Beastmaster and the Cleric at the usual moments; under them the Gorgon and the
Wanderer 60 to 700 ms after the blow with the moment's flash turned off, `EARLY=1 NOFLASH=1`) and `audit-batch5-beasts-393.jpg`.

- **The guardians** are a full hero tall and thicker (a wider robe and hood, larger pauldrons, a stouter spear, a stronger glow). In
  the fight frames they stand over the fighters round the Cleric and read at a phone's size.
- **The beast** is a wolf in a wolf's colours whatever the element: grey fur, an amber eye. Only the puff it bursts from and the ring
  it lands in are the element's green. The puff is smaller and torn open at once, and the claw marks that lay over it are gone (the
  second scene is a spray of sparks where it lands). In the sheet several grey wolves can be seen leaping, a ring under each as it
  lands. Still not as clear as it should be: the aftermath's green fume lies over them a moment later and tints them.
- **The line from the caster is confirmed** for the Wanderer: with the flash off, a row of small gold flares runs out from her to a
  friend, and the hearts and the halo rise there as it arrives. For the Gorgon I cannot pick her line out against the foes' own
  effects in these frames; hers is the same code in her own colour.

## Batch 6: wolves' heads in the dark, a heavy wall

`docs/samples/blender-fx/audit-batch6-393-1.jpg`. From the director's look at batch 4: the Beastmaster's wind-up and strike were round
green blobs, the Geomancer's slabs small and pale.

- **Conjure Animals, the wind-up**: the dark round brush read as green blobs with dots. It is now wolves' heads lifting out of a patch
  of shadow one after another: a dark grey head, two pricked ears, a snout, and two amber eyes side by side that open and blink
  (`eyes` in `scenes.py`), with leaves kicked up round them. On the frame sheet they are plainly animals. In the fight at a phone's
  size they are small (a head is about a third of a fighter) and sit in a clump; they read as creatures with eyes, not yet at a glance
  as wolves. They want to be larger and further apart.
- **Mountain's Embrace**: an ultimate's slabs are heavy stone now (`dark` in `slab`: deep in colour, thicker, with the sheet's dark
  edge) and a fifth larger. In the fight: dark standing stones in rings on five spots, strong against the pale ground.

## Batch 7: the showcase's own sameness

`docs/samples/blender-fx/audit-batch7-show-393-1.jpg` (`SHOW=1`: two moments of the wind-up, then four of the showcase itself, which
plays through the first part of the strike's stage before the blow).

A hand-fired ultimate plays its showcase, and on the caster every showcase began with the same three beats in its colour: a circle and
what is drawn into it (`gather`), a ring going out along the ground with a ring of small tongues (`call`), and that ring of tongues
again at the end (`finish`). That was the "gold circle" seen on the Cleric, and it was the same on every hero. Now, for a hero with a
wind-up of its own (all 70): the showcase gathers with THAT wind-up, played again over 1.8 s (the Knight's slab and dome, the
Wanderer's fountain, the wolves' heads); its call is only the dust it kicks up; its finish is a small flare. The hero's kind reaches
the beat from `ultShow.ts` (`hero`). The beats on foes and friends (a cut, a mark, a blessing's line, a landing) are as they were.

Also in this batch: the Beastmaster's wolves' heads are larger and further apart (four of them, each about a fighter's head and
shoulders).

## Batch 8: why the wolves were green

`docs/samples/blender-fx/audit-batch8-beastmaster-393.jpg`: the Beastmaster in a fight at full size, four moments (the wind-up, the
strike, two of the aftermath).

The director's look at batches 5 and 6 found the Beastmaster did not match the report: in the fight the heads and wolves were pale
green, with no grey and no amber. The shapes were right; the colours were not. The cause was neither a stale clip nor first-use
loading: every scene's solid things are lit by a rim light and a sky in the ELEMENT's colours (`Ctx.lights`), so grey fur under the
forest's green rim and sky rendered green, and the palette step then pulled the few amber pixels of the eyes to the nearest green.
The wolf scenes now light themselves plainly (`_plain_lights` in `scenes.py`: a white sun, a warm white rim, a grey sky), the fur is a
warmer, darker grey, the eyes larger, and the Beastmaster's wind-up keeps 22 colours so the amber survives (`WIND_COLOURS`).

In the photograph: the wind-up is four grey wolves' heads with pricked ears and yellow-amber eyes, each about a fighter tall, standing
apart round him; at the strike four grey wolves leap across to where they land. What is still over them: in the aftermath a green
ring and green cracks in the ground lie across the wolves for a moment (the strike's second scene and the aftermath's ring).

First-use loading was checked as the director asked, since it would touch every hero's first wind-up: a fight asks for each fielded
hero's wind-up, strike and aftermath as it begins (`warmBfx` in `Fx.show`), two at a time inside the budget, before any ultimate can
be charged; in every photographed fight the wind-up was the hero's own on its first cast. No change was needed.

## Batch 9: the aftermaths

About forty aftermaths shared their two scenes with another hero's in another colour (seven were a cloud and motes, seven a ring and
motes). Each of the 70 now has its own pair, what the ability leaves (`AFTER_OWN` in `tools/blender-fx/effects.py`): the Wizard's
cracked ground burning, the Arc Blade's cracks with a last bolt, the Samurai's line and a veil, the Wanderer's ring and hearts, the
Sage's sigil under a fading dome, the Blood Gargoyle's cracks and fallen slabs, the Kraken's ring and spout, the Werewolf's ring and
claw marks. The recipe refuses two heroes with the same pair whatever their colours, and `test/ult-audit.test.ts` now holds that for
all three stages. `docs/samples/blender-fx/audit-grey-aftermaths.jpg` is all 70 in grey; `audit-batch9-aftermaths-393-1.jpg` three
of them in a fight.

Still alike in grey, said plainly: several aftermaths are a ring with upright bars or tongues (Ilyra, the Priestess, the Inquisitor,
the Seraph, the Illusionist), since `halo`, `pillar` and `veil` over a ring or sigil make much the same shape. They are thin and
short, the least seen of the three stages; a second kind of barred ring is still owed.

The Beastmaster's aftermath is now a trail on the ground and motes, so no green ring lies across the wolves; the strike's green
cracks under them remain.

## Batch 10: wolves in profile, stone that is stone, a show cut short

`docs/samples/blender-fx/audit-batch10-393-1.jpg` (the Beastmaster, the Geomancer, the Gorgon, the Knight) and
`audit-batch10-beastmaster-393.jpg` (the Beastmaster at full size, as finally built).

- **The wolves' heads** are seen from the side, so the outline is a wolf's: a long snout out across the view (one to the left, the next
  to the right), a brow, two tall ears pricked back, a thick ruff, the near eye amber. The earlier ones faced the camera and read as
  ghosts or cats.
- **Nothing green across the wolves**: the strike's second scene is a short trail on the ground behind each wolf (it was cracks, then
  for one build a ring, which was worse); the aftermath is a trail and motes. What is left under each wolf is the thin ring it lands
  in.
- **Plain light for what has its own colours** (the director's note after the wolves): an ultimate's slabs are stone's own grey-brown
  lit plainly (`dark` in `slab`: the Geomancer's wall, the slab the Knight plants, the Peasant's, the Juggernaut's, the Blood
  Gargoyle's); what the Gorgon's gaze leaves on a foe is grey rock, not a crystal in her poison's green (`stone` in `crystal`, asked
  for by her strike alone: `OWN_OPT`). In the sheet: grey standing stones for the Geomancer, grey peaks over each petrified foe, a
  grey slab under the Knight's gold dome. Left as they are, on purpose: ice, crystal, thorns and bone in a spell or a skill are the
  element's own stuff and keep its light; the guardians are pale spirits and keep the wind's pale light. The spells that use `slab` and
  `crystal` were rendered again by this change and came out the same (their options did not change).
- **A show cut short at a fight's end** (the freeze fix, 0.525.0): read in the code, not photographed. The queue sends the moment
  straight to its aftermath, a second of it at most (`fightOver`, `OVER_MS`), and the page plays the aftermath sheet over what is left
  (`aftermath(b, m, Math.max(300, q.left))`), so all its frames play in that second: it reads, faster. A wind-up or strike sheet
  already playing finishes its own run (1.3 s at most) on the board, under the result card; nothing waits on it.

## Batch 11: a whirlpool, a sandstorm, wings, a banner; three wolves; a show cut short, photographed

`docs/samples/blender-fx/audit-batch11-1.jpg` and `-2.jpg` (0.499 above, now below: the Kraken, the Mummy, the Priestess, the Peasant,
the Samurai Commander, the Banneret, Karasu), `audit-batch11-beastmaster-393.jpg`, `audit-cut-short-393.jpg`, and the grey sheet
again (`audit-grey.jpg`).

- **Four new scenes** in place of shapes too many heroes shared. `whirlpool`: water turning flat on the ground, spiral arms of foam
  winding in to a dark eye (the Kraken's Maelstrom was a standing funnel, the same as the Mummy's, Yamabushi's and Karasu's).
  `sandstorm`: a low wide wall of blown sand, broken bands racing round at different heights (the Mummy). `wings`: two fans of light
  unfolding from the shoulders (Ilyra, the Priestess; the Seraph's aftermath). `banner`: a planted pole with two pennants streaming
  (the Peasant, the Samurai Commander, the Banneret, whose strikes were a veil or a pillar over a ring). Karasu's cloud of daggers is
  feathers and gusts; the Wizard winds up under a gathering cloud, not a funnel; the Paladin's third scene (a third barred ring) is
  gone. In the sheets the Kraken's whirlpool and spout are the clearest gain over 0.499's two pale balls.
- Not as good as it should be: the Peasant's banner is small and pale in the earth's tan against the ground; the Mummy's sand is pale.
  Ilyra is still unphotographed (her ultimate does not fire in the tool).
- **The Beastmaster's wind-up** is three wolves' heads, larger than a fighter, set apart, darker, each in profile with a long snout and
  tall ears: in the photograph they are wolves at a glance. **No ring** is left where a wolf lands; the aftermath is a low swirl and
  motes at the Beastmaster's feet. Standing wolves have nothing green under them.
- **A show cut short**, staged and photographed (`CUT=strike` and `CUT=windup` in `tools/blender-fx/ult-shots.mjs`: the fight is ended
  150 ms after the blow, or 60% through the wind-up, and the next 2 s are photographed). Cut after the blow (the Cleric): the strike
  finishes, and the guardians go on circling; it reads. Cut during the wind-up (the Kraken, the Samurai): the wind-up sheet plays on
  for about a third of a second and is gone; NO strike and NO aftermath sheet is seen, the show simply ends. That is the case of an
  ultimate that itself ends the fight: the player sees its wind-up and then the result. Whether that last second should show the
  blow is a question for the freeze fix's rule (one second of aftermath); I tried playing the strike in the aftermath's turn and it
  did not show (the cut does not reach the aftermath's stage from the wind-up), so I took the change out rather than leave it
  unseen. Nothing lingers, nothing waits, no errors.

## The killing blow is seen (the director's decision, 2026-11-12)

The cut-short photographs showed that an ultimate which itself ended the fight was never seen to land: the freeze fix (0.525.0) cut a
show to a second of aftermath the moment the fight was over, and from the wind-up that left nothing. The director's decision: when the
fight is over and the blow has NOT been seen, the last beat is the strike, its own run of 1.3 s at most, on where the foes fell; then
the moment ends and the result comes. When the blow has been seen, it is the second of aftermath as before. The freeze fix's limits
stand: the moments waiting are dropped, nothing is held, nothing waits, and the result's own two-second wait is not lengthened.

- `UltQueue.fightOver` (`src/ultMomentRules.ts`): a moment whose blow has not landed lands it at once (`strike`, its stage the strike,
  `OVER_STRIKE_MS` = 1300 of the `impact` phase with nothing held), and its fade is then ended at once. `holdsBattle` is false through
  it.
- `Fx.ultImpact`: a foe that has fallen and gone from the board is struck where it fell (its tile), so the blow has somewhere to land.
- Tests (`test/freeze-fix.test.ts`): cut in the wind-up or the showcase gives the blow and ends within the strike's run, for every
  shape; cut after the blow gives the aftermath and no second blow; a queue of several still drops the ones waiting; no cut point from
  0 to 7 s takes longer than the strike's run; the next moment starts clean. The freeze fix's own test, which held "a second at most",
  now holds "the blow's run or a second, whichever applies": a requirement the director changed, not a test loosened.
- Photographed (`docs/samples/blender-fx/audit-cut-short-393.jpg`, `CUT=windup` and `CUT=strike`): the fight ended 60% through the
  Kraken's and the Samurai's wind-ups: the whirlpool and spout, and the Samurai's great blow, play in full and are gone by 2 s; ended
  150 ms after the Cleric's blow: the strike finishes and the guardians circle on; and the Wizard, whose meteors had not yet landed,
  now gets its fireball.

Confirmed in a real, settled fight (`KILL=1` in the photo tool: every foe is put at one health as the ultimate is fired, so the cast
itself ends the fight in the sim and the run settles as in play; `docs/samples/blender-fx/audit-killing-blow-393.jpg`). Measured for
Vael, the Kraken and the Tyrant, the same each time: the fight is over on the frame of the cast; the blow is played on that same
frame (0 ms after); the moment is gone 1,312 ms after; the result card is up 1,984 ms after. In the Kraken's photographs the header
reads Victory, the whirlpool and spout are playing 0.3 s and 0.8 s after the fight ended, the board is clear at 1.4 s, and the card
comes at 2 s. (The Samurai's line did not reach every foe in the staged fight, so his was not a last blow there.)

Not done: an Eidolon's call. Its strike is the other builder's staged show (`eidolonCall.ts`, its own clock and its own cut,
`CALL_OVER_MS`), not a small change of this kind; it is left as it is.

## The full-size pass (begun): fifteen judged by the owner's two tests

The director's order: go through the 48 not yet looked at closely, at full size, and judge each by the owner's two tests: does it
show what the ability does, and could it be mistaken for another hero's. `tools/blender-fx/full_pass.py` cuts four moments of each
(the wind-up at its height, the strike late, the aftermath early and in its middle) to the board, unscaled.
`docs/samples/blender-fx/audit-fullsize-1-393.jpg`, `-2`, `-3` (as they were on 0.534.0) and `audit-fullsize-fixes-393.jpg` (the
three changed here, after).

| Hero | Shows the ability? | Mistaken for another? | Verdict |
| --- | --- | --- | --- |
| Vael, Kneel Before Night | a great sweeping cut across the field, then sigils on the ground; the shield on allies is not shown | no | reads as his sweep; it is purple where his words say a golden sweep, and his totality (eight seconds of it) has nothing lasting |
| Ilyra, Death Denied | a line of light to each friend, then a golden dome with rays over each | close to Orrun's domes in shape, gold against green | reads as protection laid on each ally |
| Orrun, The World Stands | vines rise round him; a dome wound with vines over each ally | see Ilyra | reads as a sanctuary on each ally |
| Nyxara, Rewrite Fate | a sigil; a line to each ally; a spiral and a sigil on each | no | the spirals read as something wound back; acceptable |
| Kunoichi, Assassinate | crossed blades on each foe cut | the Mercenary's is also crossed blades (red), with sparks | the strike reads. Her aftermath was a mass of purple smoke over the fallen: CHANGED to gusts and petals; in the new photograph it is a row of purple arcs, no longer a mass, still busy. Her wind-up is a few pale flecks: weak |
| Mercenary, Killing Spree | red blades on each of the three | see Kunoichi | reads; the wind-up is a plain red ball, weak |
| Minotaur, Stampede | cracks where he paws, then cracks and dust where he charges | no | reads as a charge's wake; the charge itself is the showcase's |
| Ninja Monk, Hundred-Hand Strike | was a single small ball of sparks: NOT a flurry of blows. CHANGED to claw-like slash marks and gusts | no | NOT CONFIRMED: in the new photograph the strike's frame is covered by another fighter's fire and I cannot see the slash marks |
| Buccaneer, Keelhaul | a cage of purple chain round him and on those hooked | no | reads as hooks and chain |
| Archer, Hail of Arrows | a shaft loosed upward; rings on the ground with thin arrows falling; shafts standing in the rings | no | reads; the falling arrows are thin |
| Dread Pirate, Ghost Fleet | one huge purple ball that tears open | the other great blows | DOES NOT READ as broadsides from a fleet, and hides the field for most of the strike. Not fixed yet: it wants shot falling across several spots, not one ball |
| Siege Bot, Orbital Strike | a targeting ring and the shell's line coming down, then a fireball and its ring | the Wizard's fireball | reads well |
| Gunslinger, High Noon | was a burst on each target with crossed sword cuts over it: bullets are not cuts. CHANGED to a burst and flaring tongues | no | the new photograph shows a burst on each target, then flames in a ring: better; the wind-up (a halo of bars) says nothing of high noon |
| Rifle Bot, Overclock | a bolt down onto it, then sparks and rings round it | no | reads as charging itself |
| Dragoon, Inferno Breath | flames rise round her; a cluster of flame with a wall in it at one spot; tall tongues after | the other fire strikes | DOES NOT READ as breath down a line: it stands in one place. Not fixed yet: it wants laying along the line the breath takes |

So of these fifteen: nine read (Ilyra, Orrun, Nyxara, the Minotaur, the Buccaneer, the Archer, the Siege Bot, the Rifle Bot, Vael
with reservations), two were changed and now read better (the Kunoichi's aftermath, the Gunslinger), one was changed and is not
confirmed (the Ninja Monk), two do not read and are not fixed (the Dread Pirate, the Dragoon), and several wind-ups are weak (the
Kunoichi, the Mercenary, the Gunslinger). Thirty-three heroes remain to be looked at this way.

### The two that did not read, and the Ninja Monk again

`docs/samples/blender-fx/audit-fullsize-fixes2-393.jpg`.

- **Ghost Fleet (the Dread Pirate)** is no longer a great blow (eight heroes have it now). Its strike is a rain of shot and a burst on
  each foe it falls among (`each`, a fifth larger). In the photograph: purple shot raining over the crowd, then a burst on each of
  three foes. Verdict: better, and the field is no longer hidden under one ball; but three purple balls among the foes still say
  "explosions" more than "a fleet's guns". A broadside wants its own scene (shot arriving in a slanting volley from one side).
- **Inferno Breath (the Dragoon)** has a new place, `line`: the strike on each tile of the line the ability takes, and nothing else
  (`ultSpots`). In the photograph the flames lie over a short stretch of ground rather than standing in one cluster. Verdict: only a
  little better; the line in the staged fight was short, and the clip on each tile is the same clump of tongues. It wants a strip of
  fire that visibly runs out from her mouth.
- **Hundred-Hand Strike (the Ninja Monk)**: photographed again, and again another fighter's fire lies over the frame. NOT CONFIRMED.

### The next ten, 0.499 above and now below

`docs/samples/blender-fx/audit-fullsize-4-393.jpg` (the Ranger, the Paladin, Yamabushi, the Juggernaut, the Warlock) and `-5` (the
Tyrant, the Shambler, the Reaper, the Illusionist, the Demon Swordsman); `tools/blender-fx/full_pass_two.py`.

| Hero | 0.499 | Now | Shows the ability? | Mistaken for another? |
| --- | --- | --- | --- | --- |
| Ranger, Entangle | three green balls, then a green ring | vines whipping up round her; vines standing on each foe; a vine dome in a ring on each | yes: a net of vines on every foe | Orrun's vine domes are on allies, hers on foes: alike in shape, different in where |
| Paladin, Holy Nova | a gold ball, then a gold ring | a pillar of light on him; a ring of gold tongues bursting out round him with a strike from above | yes: a nova from where he kneels | no |
| Yamabushi, Tempest | two pale balls, then pale rings | a great funnel of wind round him, growing, then breaking into gusts | yes: a gale | the Wizard's wind-up was this funnel until batch 11; now only his |
| Juggernaut, Fissure | a pale dust ball and ring | a slab under his foot; cracks running out across the ground; rock spires standing in them | yes: the ground splitting, spires rising; the cracks are thin and pale | no |
| Warlock, Circle of Death | three purple balls, purple rings | an orb over a sigil; sigil circles spreading round him and under the foes | yes: a circle of death | Astral Sphinx and Vael also leave sigils; his are the only ones that are the whole effect |
| Tyrant, Reign of Terror | two purple balls, purple rings | red spikes and climbing rings round him; rings and spikes bursting out | yes: terror going out from him | no |
| Shambler, Plague Tide | a green ball, a green ring | a fume where he sinks; cracks; a spout of rot bursting up out of them | yes: bursting out of the grave-earth | no |
| Reaper, Harvest of Souls | a purple ball, purple rings | wisps round him; a great crescent sweep; rings after | yes: a scythe's sweep | YES: Vael's strike is also a great purple crescent. One of the two wants changing (Vael's should be gold, by his own words) |
| Illusionist, Hall of Mirrors | a purple ball, a purple ring | upright panes of light standing in a row, then a portal | yes: mirrors | no |
| Demon Swordsman, Metamorphosis | a red ball, a red ring | a mass of flame on him; a ring of chain round him with a flare and a spiral | yes: chains, and a change on him | no |

All ten read as their ability, and at 0.499 all ten were a ball and a ring in a colour. One pair is alike: the Reaper and Vael.
Twenty-five of the 48 are judged; twenty-three remain.

## The audit of all 70

`docs/samples/blender-fx/audit-all-1.jpg` to `-7.jpg`: all 70 ultimates, ten heroes a sheet in the table's order, each fired by hand in
the same fight at 0.499 (above) and on this build (below), eight moments each (two of the wind-up, two of the strike, two of the
aftermath, then 1.2 s and 3.8 s into the fight after). Ilyra is in them for the first time: her Death Denied answers an ally who is
hurt, so the photo tool now puts one friend at half health before firing it (at 0.499 she has no row: the old run could not fire her).

How to read the table. "What it does" is the ability's own words in the game. The three "now" columns are what the recipe builds
(`tools/blender-fx/effects.py`), in plain words, and where the strike plays. The last column says whether I have looked at that hero
closely in a fight photograph at full size and written about it in a batch above, or only have it in the sheet: for the ones marked
"in the sheet only" the effect is built and photographed but I have NOT judged at full size whether it reads as the ability, and I
do not claim it does.

Two rows to know about in the sheets: where an ultimate killed every foe in the staged fight (Astrax, the Arc Blade on this build),
the fight ended at the cast, the moment played its blow and ended (the killing-blow rule above), and the later frames show the board
after the fight rather than the stages.

| # | Hero | Ultimate | What it does | Wind-up now | Strike now, and where it plays | Aftermath now | Sheet | Looked at closely |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | vael | Kneel Before Night | Eight seconds of totality. Strike every foe, punish the wounded and shield allies. Bosses resist the interrupt. | a halo, a drawing-in | a sweeping cut, a shock along the ground; once, in the midst of what it struck | a sigil, wisps | audit-all-1 | no: in the sheet only |
| 2 | astrax | Heavenfall | Scorch every foe and leave three burning constellations for six seconds. | a sigil, motes | a rain of bolts, flames, a sigil; once, in the midst of what it struck | flames, motes | audit-all-1 | no: in the sheet only |
| 3 | ilyra | Death Denied | Once per battle, when an ally is hurt: allies cannot fall for five seconds, then receive a healing surge. Does not revive the fallen. | a halo, rings on the ground | wings of light, a dome; on the caster and each friend, a line run out to each | rings on the ground, a halo | audit-all-1 | this batch (first photographs) |
| 4 | orrun | The World Stands | Ten seconds of sanctuary, shields for the whole squad and binding roots. Bosses are slowed instead. | vines, rings on the ground | vines, a dome; on the caster and each friend, a line run out to each | vines, a swarm | audit-all-1 | no: in the sheet only |
| 5 | nyxara | Rewrite Fate | Restore living allies’ health and free positions from three to five seconds ago. Keeps deaths, enemy damage and spent resources. | a sigil, a spiral | a sigil, a spiral; on the caster and each friend, a line run out to each | a sigil, a spiral | audit-all-1 | no: in the sheet only |
| 6 | kunoichi | Assassinate | A teleport slash: she slips behind the four weakest foes in turn and backstabs each | smoke, a swarm | crossed cuts, a swarm; on each foe touched (or where each called one arrives) | a cloud, a swarm | audit-all-1 | no: in the sheet only |
| 7 | wizard | Meteor Swarm | Three meteors fall on separate crowds, each leaving the ground burning; the foe at the heart of each is thrown a tile | a cloud, flames | the great blow, a burst, cracked ground; once, in the midst of what it struck | cracked ground, flames | audit-all-1 | batch 9, the cut-short sheets |
| 8 | beastmaster | Conjure Animals | Four wolves answer his call at once, for 30s of fighting, wave to wave | wolves' heads rising, a swarm | a wolf leaping out, a streak on the ground; on each foe touched (or where each called one arrives) | gusts, motes | audit-all-1 | batches 3 to 11 |
| 9 | mercenary | Killing Spree | Slips beside the three hardest-hitting foes in turn and cuts each hard | a drawing-in, sparks | crossed cuts, sparks; on each foe touched (or where each called one arrives) | cracked ground, sparks | audit-all-1 | no: in the sheet only |
| 10 | arcBlade | Lightning Storm | He becomes lightning: a teleport slash through up to six foes within 6 tiles, each shocked and stunned for 1.4s, then back where he started | a spiral, a bolt | a bolt, crossed cuts; on each foe touched (or where each called one arrives) | cracked ground, a bolt | audit-all-1 | no: in the sheet only |
| 11 | samurai | Issen | "The one cut": dashes up to 7 tiles in a line, cutting every foe on it with a huge blow | rings on the ground, a flare | the great blow, a sweeping cut, sparks; once, in the midst of what it struck | a streak on the ground, a veil of panes | audit-all-2 | the cut-short sheets |
| 12 | lancer | Cavalry Charge | He rides up to 7 tiles in a line through every foe on it, each struck and thrown a tile aside, and the riders near him gallop faster for 4s | gusts, a streak on the ground | a streak on the ground, gusts, sparks; once, in the midst of what it struck | a streak on the ground, gusts | audit-all-2 | batch 1 |
| 13 | minotaur | Stampede | Up to three charges in a row, each at the weakest foe in line; each foe struck is launched 2 tiles and stunned | smoke, cracked ground | cracked ground, smoke, a streak on the ground; once, in the midst of what it struck | cracked ground, smoke | audit-all-2 | no: in the sheet only |
| 14 | barbarian | Berserker Leap | He leaps up to 4 tiles onto the thickest crowd: the 3x3 round him is struck and shoved a tile out; he drinks a third of what it deals and runs fast for 5s | a flare, rings of a shout | the great blow, cracked ground, a burst; once, in the midst of what it struck | cracked ground, a flare | audit-all-2 | batch 1 |
| 15 | ninjaMonk | Hundred-Hand Strike | Five blows on each of the three nearest foes, each stunned for 1.2s; the last blow throws each 2 tiles | a spiral, sparks | sparks, gusts; on each foe touched (or where each called one arrives) | rings on the ground, gusts | audit-all-2 | no: in the sheet only |
| 16 | buccaneer | Keelhaul | Hooks the three nearest shooters (or foes) in beside him; each cut is a roll of the die (x1 to x3), and each is held 1.5s | chains, rings on the ground | chains, crossed cuts; on each foe touched (or where each called one arrives) | a cloud, chains | audit-all-2 | no: in the sheet only |
| 17 | archer | Hail of Arrows | Five volleys fall on separate crowds across the field | a slanting shaft, gusts | a rain of bolts, rings on the ground; once, in the midst of what it struck | rings on the ground, a slanting shaft | audit-all-2 | no: in the sheet only |
| 18 | dreadPirate | Ghost Fleet | Three broadsides from the ghost fleet fall on separate crowds and set off the powder barrels there | a cloud, wisps | the great blow, a rain of bolts, a burst; once, in the midst of what it struck | cracked ground, wisps | audit-all-2 | no: in the sheet only |
| 19 | siegeBot | Orbital Strike | A great shell on the thickest crowd, throwing every foe in the 3x3 2 tiles outward, and a second on the same spot a moment after | rings on the ground, a strike from above | the great blow, a burst, a shock along the ground; once, in the midst of what it struck | cracked ground, a cloud | audit-all-2 | no: in the sheet only |
| 20 | lightningMage | Call Lightning | A storm cloud gathers over her for 6s: each second a bolt strikes the toughest foe within 6 tiles, stunned for 0.8s and Charged | a cloud, sparks | a cloud, a bolt; once, in the midst of what it struck | a cloud, a bolt | audit-all-2 | batch 1 |
| 21 | gunslinger | High Noon | Six shots at the hardest-hitting foes in reach | a halo, sparks | sparks, crossed cuts; on each foe touched (or where each called one arrives) | rings on the ground, smoke | audit-all-3 | no: in the sheet only |
| 22 | rifleBot | Overclock | It jets to the highest ground in reach, then hits half as hard again and shoots faster for 7s, and fires four shots at the weakest foe | sparks, a bolt | sparks, rings on the ground, a spiral; round the caster | rings on the ground, sparks | audit-all-3 | no: in the sheet only |
| 23 | dragoon | Inferno Breath | Fire down the longest line of foes, up to 8 tiles, burning each for 5s; the line stays alight for 4s | flames, a flare | a flare, a wall of fire, flames; once, in the midst of what it struck | flames, smoke | audit-all-3 | no: in the sheet only |
| 24 | ranger | Entangle | A net of vines hurts every foe in sight within 8 tiles and holds it for 2.2s; each takes a third more from every blow for 6s | vines, a swarm | vines, rings on the ground; on each foe touched (or where each called one arrives) | vines, motes | audit-all-3 | no: in the sheet only |
| 25 | knight | Indomitable | Every foe within 5 tiles must go for him for 6s; he takes half damage, a quarter of his health forms a shield, and the allies within 2 of him take a fifth less for 6s | stone slabs, a dome | rings of a shout, a dome; round the caster | rings on the ground, a pillar | audit-all-3 | batches 1, 10 |
| 26 | paladin | Holy Nova | Foes within 4 tiles are struck and must go for him for 5s; the allies near him are healed and shielded | a ring of tongues, a pillar | a ring of tongues, a strike from above; round the caster | a sigil, a pillar | audit-all-3 | no: in the sheet only |
| 27 | yamabushi | Tempest | A great gale: every foe within 4 tiles is hurt hard, stunned for 1.5s and launched 2 tiles | a funnel, gusts | a funnel, gusts; round the caster | a cloud, a spiral | audit-all-3 | no: in the sheet only |
| 28 | gorgon | Gaze of Medusa | Every foe in sight within 6 tiles is hurt and turned to stone for 2.5s | vines, an eye | grey stone, smoke; on each foe touched (or where each called one arrives) | spikes, smoke | audit-all-3 | batches 1, 3, 10 |
| 29 | juggernaut | Fissure | The ground splits: every foe within 6 tiles is hurt hard and held still for 2s, and rock spires rise where the rift is widest for 6s | cracked ground, stone slabs | cracked ground, spikes; once, in the midst of what it struck | cracked ground, spikes | audit-all-3 | no: in the sheet only |
| 30 | kraken | Maelstrom | A whirlpool drags every foe within 6 tiles up to 2 tiles towards him, hurts and slows it | a whirlpool on the ground, a spout | a whirlpool on the ground, a spout; round the caster | rings on the ground, a spout | audit-all-3 | batch 11 |
| 31 | mummy | Curse of the Pharaoh | A sand-wind drags every foe within 5 tiles a tile towards him; each is cursed and slowed for 6s, he is shielded, and the two strongest are his puppets for 2s | bands of blown sand, chains | bands of blown sand, chains; round the caster | a cloud, gusts | audit-all-4 | batch 11 |
| 32 | warlock | Circle of Death | Every foe within 7 tiles is cursed and burns for 6s, and he drinks from each; a ring of death holds round him for 6s: a foe within 2 takes 0.3 of his attack a second, and he drinks a third of it | a sigil, strands drawn up | a sigil, strands drawn up; round the caster | a sigil, strands drawn up | audit-all-4 | no: in the sheet only |
| 33 | tyrant | Reign of Terror | Every foe within 6 tiles is hurt and slowed for 5s; every ally is rallied: attack up a quarter for 7s | rings of a shout, a flare | rings of a shout, spikes; round the caster | spikes, a flare | audit-all-4 | no: in the sheet only |
| 34 | shambler | Plague Tide | He sinks into the grave-earth and bursts out in the thickest crowd within 6 tiles, launching the foe there; the wave of rot leaves every foe within 5 cursed for 7s, and he drinks from them | cracked ground, a cloud | cracked ground, a cloud, a spout; once, in the midst of what it struck | a cloud, a spout | audit-all-4 | no: in the sheet only |
| 35 | reaper | Harvest of Souls | The scythe's sweep drags every foe within 5 tiles a tile towards him, then cuts them all; those under a third of their health are reaped for far more, each kill feeds him and rises as a wraith for 12s | wisps, a sweeping cut | a sweeping cut, wisps; round the caster | rings on the ground, wisps | audit-all-4 | no: in the sheet only |
| 36 | druid | Wall of Thorns | A hedge of thorns rises across the foes' way for 8s, two treants rise at her side for 30s, and every ally is healed | vines, motes | a hedge of stakes, vines; once, in the midst of what it struck | vines, a veil of panes | audit-all-4 | the wind-ups batch |
| 37 | illusionist | Hall of Mirrors | Four decoys appear round her and every foe within 6 tiles turns on them for 4.5s | a veil of panes, sparks | a veil of panes, a portal; on each foe touched (or where each called one arrives) | a sigil, a veil of panes | audit-all-4 | no: in the sheet only |
| 38 | priestess | Mass Resurrection | Up to three fallen heroes rise with 40% of their health (each once a wave), every ally is healed and cleansed, and a Wall of Light rises between the foes and her friends for 5s | a halo, a pillar | wings of light, a pillar; on the caster and each friend, a line run out to each | a sigil, a halo | audit-all-4 | batch 11 |
| 39 | werewolf | Full Moon | Both his forms at once for 7s, a quarter of his health back, and a howl: the foes within 3 tiles are frightened | rings on the ground, rings of a shout, claw marks | claw marks, rings of a shout, a flare; round the caster | rings on the ground, claw marks | audit-all-4 | batch 1 |
| 40 | demonSwordsman | Metamorphosis | Chains of hellfire drag the three nearest foes within 4 tiles to him; for 15s (it carries into the next wave) he hits half as hard again, and a fifth of his health comes back | chains, flames | chains, a flare, a spiral; round the caster | flames, chains | audit-all-4 | no: in the sheet only |
| 41 | kitsune | Mass Polymorph | The three strongest foes in sight become little foxes for 4s: a fifth of their attack, no casts, slowed (a boss keeps its shape, and is weakened and silenced for half the time) | a spiral, flames | a spiral, smoke; on each foe touched (or where each called one arrives) | rings on the ground, a swarm | audit-all-5 | no: in the sheet only |
| 42 | karasu | Cloud of Daggers | A whirling cloud of razor feathers hangs on the thickest knot of foes for 4s: a foe in it is hurt each second and bleeds | a swarm, gusts | a swarm, gusts; once, in the midst of what it struck | a cloud, a veil of panes | audit-all-5 | batch 11 |
| 43 | timeWitch | Time Stop | Every foe within 8 tiles is stopped where it stands for 2.6s, while her friends are hastened for 5s | a sigil, rings on the ground, motes | a sigil, a crystal, rings on the ground; on each foe touched (or where each called one arrives) | a sigil, a crystal | audit-all-5 | no: in the sheet only |
| 44 | wanderer | Panacea | A cure for every ill: every ally is healed, shielded for 3s and hastened for 4s | a spout, hearts | hearts, motes, a halo; on the caster and each friend, a line run out to each | rings on the ground, hearts | audit-all-5 | batches 1, 3, 5 |
| 45 | satyr | Bacchanal | Allies are hastened for 6s, mended over time and their skills surge | a swarm, hearts | a swarm, a spiral; on the caster and each friend, a line run out to each | vines, hearts | audit-all-5 | no: in the sheet only |
| 46 | samuraiCommander | Rallying Cry | The war banner flies over every ally: attack up a quarter for 9s and a quarter of their health back; every melee ally within 4 charges up to 2 tiles at its nearest foe | a banner planted, a flare | a banner planted, a flare; on the caster and each friend, a line run out to each | rings on the ground, a flare | audit-all-5 | batch 11 |
| 47 | sage | Arcane Surge | Every ally's pool fills by half and an arcane shield forms round it for 4s | a spiral, a dome | a dome, a sigil; on the caster and each friend, a line run out to each | a sigil, a dome | audit-all-5 | batches 1, 3, 9 |
| 48 | cleric | Spirit Guardians | Spirits circle her for 10s: foes within 3 are hurt each second and slowed; friends within 3 heal each second, and are cleansed as the spirits come | rings on the ground, wisps | wisps, motes, rings on the ground; round the caster | rings on the ground, motes | audit-all-5 | batches 1, 3, 5 |
| 49 | peasant | Call to Arms | Every ally closes ranks and takes half damage for 6s, a sixth of their health comes back, and he leads a charge of up to 3 tiles at the nearest foe | a banner planted, rings of a shout | a banner planted, rings of a shout; on the caster and each friend, a line run out to each | stone slabs, smoke | audit-all-5 | batch 11 |
| 50 | wolfBard | Battle Hymn | The opening chord shoves the foes within 2 tiles 2 tiles back; then allies are hastened and rallied (attack up a quarter) for 6s, and every foe within 7 tiles is slowed | rings of a shout, motes | rings of a shout, a spiral, rings on the ground; round the caster | rings on the ground, a spiral | audit-all-5 | no: in the sheet only |
| 51 | vampireLord | Banquet of Blood | Seizes the strongest foe within 3 and drinks deep, healing half of what he deals; the foes beside it are cursed | strands drawn up, a swarm | a drawing-in, strands drawn up; on each foe touched (or where each called one arrives) | a cloud, strands drawn up | audit-all-6 | no: in the sheet only |
| 52 | hemomancer | Blood Tithe | Every foe within 5 tiles is struck and bleeds, and every ally drinks back a tenth of its health | strands drawn up, rings on the ground, a rain of bolts | strands drawn up, a rain of bolts; once, in the midst of what it struck | rings on the ground, a rain of bolts | audit-all-6 | no: in the sheet only |
| 53 | nightstalker | Belfry Swoop | Seizes the strongest foe within 6 tiles and carries it 4 tiles off towards his friends, where it is dropped and stunned for 2s | a swarm, smoke | a swarm, claw marks; once, in the midst of what it struck | a cloud, claw marks | audit-all-6 | no: in the sheet only |
| 54 | bloodGargoyle | Cathedral Perch | Crashes down from on high on the thickest crowd within 6 tiles, stunning the 3x3 for 2s | gusts, a slanting shaft | the great blow, a shock along the ground, stone slabs; once, in the midst of what it struck | cracked ground, stone slabs | audit-all-6 | no: in the sheet only |
| 55 | dhampir | Silver Requiem | Vaults to the safest tile within 3 and fires five silver stakes across the strongest foes within 7 tiles, shoving each | a halo, crossed cuts | a rain of bolts, crossed cuts; on each foe touched (or where each called one arrives) | rings on the ground, crossed cuts | audit-all-6 | no: in the sheet only |
| 56 | warDrummer | Ten Thousand Drums | A thunder cadence over the field: every foe within 6 tiles is struck and shoved 2 tiles back, and every friend is hastened | rings of a shout, sparks | rings of a shout, a bolt, a shock along the ground; once, in the midst of what it struck | rings on the ground, rings of a shout | audit-all-6 | no: in the sheet only |
| 57 | geomancer | Mountain's Embrace | Raises a Wall of Stone 4 tiles across the foes' way and shields every friend for a quarter of its health | stone slabs, motes | stone slabs, cracked ground; on each tile taken, then each friend | spikes, motes | audit-all-6 | batches 4, 6, 10 |
| 58 | bellWarden | Midnight Knell | Stillness: the foes within 3 are struck and stunned, and the knell tolls round him for 8s, slowing the foes there | rings of a shout, a crystal | rings of a shout, rings on the ground; round the caster | rings on the ground, a veil of panes | audit-all-6 | no: in the sheet only |
| 59 | falconer | Sky Hunt | Vaults to the safest tile within 3 and calls three dives of falcons down on the foes | a swarm, a slanting shaft | a slanting shaft, claw marks; once, in the midst of what it struck | a streak on the ground, a swarm | audit-all-6 | no: in the sheet only |
| 60 | banneret | Oriflamme of the Keep | Heals every friend for a fifth of its health and raises the Oriflamme round her for 8s: friends within 3 take a quarter less | a banner planted, rings on the ground | a banner planted, rings on the ground, flames; round the caster | flames, a veil of panes | audit-all-6 | batch 11 |
| 61 | astralSphinx | The Last Riddle | Every foe within 5 tiles is struck and silenced for 2.5s, none of them able to answer | an eye, a sigil | an eye, a sigil; on each foe touched (or where each called one arrives) | a sigil, an eye | audit-all-7 | no: in the sheet only |
| 62 | mirageDancer | Dance of Seven Mirages | Slashes through five foes within 6 tiles in turn, bleeding each, and leaves two sand mirages behind | a veil of panes, gusts | a veil of panes, crossed cuts; on each foe touched (or where each called one arrives) | a sigil, gusts | audit-all-7 | no: in the sheet only |
| 63 | plagueDoctor | Black Miasma | Strikes and poisons every foe within 4, and raises a Black Miasma round him for 8s that poisons the foes there | a cloud, strands drawn up | a cloud, smoke; round the caster | a cloud, motes | audit-all-7 | no: in the sheet only |
| 64 | bombardier | Shell Storm | Rocket-jumps to the safest tile within 3 and rains four salvos of shells across the foes | flames, a spout | the great blow, a slanting shaft, a burst; once, in the midst of what it struck | flames, a cloud | audit-all-7 | no: in the sheet only |
| 65 | astrologer | Supernova Alignment | Drags the foes within 4 of the thickest crowd 2 tiles together, then drops two supernovas on it | a drawing-in, motes | the great blow, a drawing-in, a burst; once, in the midst of what it struck | a sigil, motes | audit-all-7 | no: in the sheet only |
| 66 | inquisitor | Solar Tribunal | Strikes the three strongest foes within 6 tiles and sets them burning, and the Tribunal sits round her for 8s, burning the foes there | a halo, a strike from above | a strike from above, rings on the ground; on each foe touched (or where each called one arrives) | flames, a halo | audit-all-7 | no: in the sheet only |
| 67 | seraph | Descent of the Host | Crashes down on the thickest crowd within 6 tiles, throwing the foes round her 2 tiles out, and raises the Host's Halo round her for 7s: friends within 3 take a fifth less | a halo, a slanting shaft | the great blow, a slanting shaft, a shock along the ground; once, in the midst of what it struck | a ring of tongues, wings of light | audit-all-7 | no: in the sheet only |
| 68 | corsairSurgeon | Rum Ration | Cleanses every friend and mends it for a quarter of its health | a spout, rings on the ground | a spout, motes, rings on the ground; on the caster and each friend, a line run out to each | a cloud, hearts | audit-all-7 | no: in the sheet only |
| 69 | harpooner | Leviathan Line | Harpoons the three farthest foes within 6 tiles in turn, each struck, dragged 3 tiles in and slowed | chains, a spout | chains, spikes; on each foe touched (or where each called one arrives) | spikes, chains | audit-all-7 | no: in the sheet only |
| 70 | seaReaver | Wrath of the Reef | Surfs a towering wave through a line of foes (or leaps on them), throwing the foes round him 2 tiles aside | a spout, gusts | a spout, gusts, rings on the ground; once, in the midst of what it struck | a streak on the ground, a spout | audit-all-7 | no: in the sheet only |

What 0.499 showed, in the rows I have looked at (the batches above, and the first sheet as a whole): a small gathering on the
caster, then the element's ball and ring burst where it struck (gold, green, purple, pale blue, red), then whatever the ability
itself leaves (a heal's swirls, a storm cloud, burning ground). The ones I saw with something of their own already at 0.499: the
Gorgon (puffs on each foe), the Werewolf (the painted moon), the Lightning Mage (the painted cloud), the Wizard (the burning ground
its meteors leave). I have not gone through sheets 2 to 7 row by row.
