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

## The audit of all 70

To come, in batches: for each ultimate, what it does in the sim, what 0.499 showed, what main shows now, and the verdict; then the ten
side-by-sides (a heal, a blessing, a ward, a summoning, a wall, a mark, a transformation, a storm, a dash, a single blow) before going
wide.
