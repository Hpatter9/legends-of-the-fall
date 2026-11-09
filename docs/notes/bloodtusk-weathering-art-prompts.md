# Bloodtusk finishing art

The current finishing pass is implemented with the existing orc atlas, existing smoke effects and borrowed Orc Grunt animation. The following prompts replace those borrowed combinations with bespoke art. These sheets are not generated or integrated yet. They are for the director’s next art import; do not silently substitute them for fort damage states.

## Weathered palisade variants

```text
For the Legends of the Last Keep repository (legends-of-the-fall), on branch art/bloodtusk-weathering, create art-source/assault/orc/orc-weathered-palisades.png. Canvas 1536 × 1024, transparent background, no text or labels. Match the existing game’s crisp isometric pixel-art orc atlas: earthy timber, iron straps, dark shadows, bone trophies, warm firelight; no smooth vector or painted-scene treatment. Twelve isolated sprites in a precisely aligned 4-column × 3-row grid of 384 × 341 cells, with generous clear padding and matching foot anchors. Columns are four structural variations: leaning mismatched stakes; patched logs with diagonal bracing; rope-lashed old timber; rough reclaimed planks. The first row is intact and fully defensible despite age, the second row genuinely damaged, the third row collapsed into low rubble. Keep gaps closed in every intact sprite: weathering must never look like a traversable breach. Preserve a one-tile footprint and the isometric view of src/art/assault/orc/sprites.webp. No ground diamonds, scenery or baked-in cast-shadow backdrop.
```

## Unarmed camp workers

```text
For the Legends of the Last Keep repository (legends-of-the-fall), on branch art/bloodtusk-weathering, create art-source/assault/orc/orc-camp-workers.png. Canvas 1536 × 768, transparent background, no text. Crisp isometric pixel-art figures matching the Orc Grunt unit sheet, with the same foot alignment and a roughly 43-pixel in-game figure height. A strict 8-column × 4-row sprite grid, cells 192 × 192. Row one: an unarmoured green orc blacksmith in a leather apron, eight coherent hammering frames, facing right. Row two: the same smith pausing and tending the anvil, eight idle frames. Row three: an unarmoured orc woodcutter in rough work clothes, eight coherent axe-chopping frames, facing left. Row four: an orc butcher in an apron preparing hanging meat, eight small repetitive working frames, facing left. Tools are work tools; no swords, shields, armour, health bars, combat rings, background objects or floor tiles. Keep every frame’s feet fixed near the bottom centre of its cell, with all tools fully inside the cell. These are decorative workers who flee before combat.
```

## Siege engine under construction

```text
For the Legends of the Last Keep repository (legends-of-the-fall), on branch art/bloodtusk-weathering, create art-source/assault/orc/orc-siege-assembly.png. Canvas 1024 × 1024, transparent background, no text. One coherent isometric pixel-art siege assembly scene matching the current orc asset atlas: an unfinished crude catapult with an exposed timber frame, one mounted wheel, a second wheel on the ground, loose axle, rope coils, heavy stone ammunition and an unmounted throwing arm. Crooked iron-strapped timber and a small red orc pennant. No people, fire, ground diamond or surrounding terrain. Fit a compact two-by-two-tile solid footprint, with low loose parts arranged inside the silhouette. Ground contact anchor at bottom centre. Strong readable structure at phone-game scale, generous transparent padding.
```

## Cliff-edge details

```text
For the Legends of the Last Keep repository (legends-of-the-fall), on branch art/bloodtusk-weathering, create art-source/assault/orc/orc-ridge-edges.png. Canvas 1536 × 1024, transparent background, no text. A strict 4-column × 3-row grid of isolated isometric pixel-art details matching the existing dark rock and heath atlas. Twelve variants: four broken shale ledges with irregular overhangs, four low scree fans and rockfall piles, two exposed-root tufts, and two mossy rock shelves. Earthy grey-brown stone with restrained dry grass and moss. Clear top-versus-front-face reading. Keep low details below a fighter’s knees and keep overhangs within a one-tile footprint; no implied bridges or openings. No terrain diamonds, people or scenery. Generous cell padding, consistent foot anchors, crisp pixels and existing-game lighting.
```
