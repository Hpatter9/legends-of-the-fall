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

## The audit of all 70

To come, in batches: for each ultimate, what it does in the sim, what 0.499 showed, what main shows now, and the verdict; then the ten
side-by-sides (a heal, a blessing, a ward, a summoning, a wall, a mark, a transformation, a storm, a dash, a single blow) before going
wide.
