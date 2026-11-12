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

Still to do for this ultimate, with the audit: its strike is the great blow in gold, which an aura is not. It is to be the spirits
arriving (no core, no rubble).

## The audit of all 70

To come, in batches: for each ultimate, what it does in the sim, what 0.499 showed, what main shows now, and the verdict; then the ten
side-by-sides (a heal, a blessing, a ward, a summoning, a wall, a mark, a transformation, a storm, a dash, a single blow) before going
wide.
