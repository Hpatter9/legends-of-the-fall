# Bloodtusk finishing art

The initial finishing pass used the existing orc atlas, existing smoke effects and borrowed Orc Grunt animation. The following prompts replace those borrowed combinations with bespoke art. The original briefs below describe the intended replacement art. The approved follow-up generated and integrated two combined sheets, recorded below; the original separate wall damage-state and cliff sheets were not generated. Real damaged/breached fort artwork is retained.

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

## Imported follow-up sheets

The owner approved all four art corrections after PR #495. Two new sheets were generated with transparent backgrounds and cut by `tools/assault/pack-warcamp.py`. The actual image layout uses measured painted row boundaries rather than assuming the requested equal grid. Full originals are retained under `art-source/assault/orc/`.

### Camp workers — actual generation brief

```text
For Legends of the Last Keep (legends-of-the-fall), branch art/bloodtusk-weathering, create art-source/assault/orc/orc-camp-workers.png. Transparent background, 1536 × 1024 canvas, four columns and three rows. Twelve isolated crisp detailed isometric pixel-art figures matching the earthy dark fantasy game: olive green skin, leather aprons, brown cloth, heavy boots, no armour or combat weapons. Four coherent keyframes of a blacksmith hammering, four of a woodcutter chopping, four of a butcher preparing meat. All face right; full tools remain inside their cells. Fixed feet at bottom centre within each row. No anvil, logs, meat rack, floor, background scenery or text. Elevated three-quarter camera, strong silhouettes at phone scale, muted russet leather, warm highlights and dark outlines.
```

### Warcamp details — actual generation brief

```text
For Legends of the Last Keep (legends-of-the-fall), branch art/bloodtusk-weathering, create art-source/assault/orc/orc-warcamp-details.png. Transparent background, 1536 × 1024 canvas, four columns and three rows of twelve isolated isometric pixel-art sprites. Earthy dark fantasy orc camp; muted brown timber, grey-brown shale, olive moss, russet cloth, crisp pixel texture and dark outlines. Row one: four healthy fully defensible one-tile diagonal palisades with tightly joined mismatched logs, rope lashings, repair braces, reclaimed planks, iron straps and a small skull; no traversable gaps. Row two: low shale scree apron, broken rooted ledge, rubble and dirt around a wooden footing, worn dirt doorstep with stones/straw. Row three: one coherent unfinished catapult with exposed chassis, mounted and loose wheel, axle, rope and unmounted throwing arm; low shale rockfall; mossy root/dirt clump; cracked earth around foundation posts. Irregular low ground details, no terrain diamonds or rectangular bases. No people, text or scenery backdrop. Generous transparent padding and readable silhouettes at game scale.
```

The new wall variants are healthy-only. Existing battered, broken and breached pictures still follow actual fort health. The workers use four slow work keyframes per job, with the fourth held as a resting pose; these are decorative figures, not simulation units.
