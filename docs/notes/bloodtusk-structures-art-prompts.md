# Bloodtusk timber architecture

Owner approved correcting wall joins, building proportions, timber gate structures and hillside foundations. New artwork is generated for the existing orc palette and camera, not as a separate illustration style. Both original transparent sheets are retained in `art-source/assault/orc/`; `tools/assault/pack-warcamp.py` imports their measured cells. The fittings sheet received a transparency-only image edit before import to remove a faint white background.

## Timber gates

```text
For Legends of the Last Keep (legends-of-the-fall), branch art/bloodtusk-weathering, create art-source/assault/orc/orc-timber-gates.png. Transparent 1536×1024 canvas, strict three columns and two rows of padded 512×512 cells, no labels. Crisp isometric pixel art for a dark earthy orc warcamp: weathered brown logs, rope, iron bands, small bone tusks and muted red hide pennants. No stone masonry, castle towers, fire or scenery. Row one: a wide timber main gate, closed, battered but still closed, then destroyed with low debris, short broken posts and a clearly empty centre. Row two: a narrower tusk-framed inner gate in the same three states. Intact gates have one simple crossbeam and tightly barred plank doors. Gate planes recede from lower-left to upper-right, using the game's elevated camera. Keep matching ground anchors across states, adequate room for two figures through the main entrance, full silhouettes inside each cell and generous transparent padding. No people or terrain diamonds.
```

## Hall and ground fittings

```text
For Legends of the Last Keep (legends-of-the-fall), branch art/bloodtusk-weathering, create art-source/assault/orc/orc-structure-fittings.png. Transparent 1536×1024 canvas, strict three columns and two rows of padded 512×512 cells, no text. Crisp small-scale isometric pixel art matching dark earthy orc timber, brown/red hide roofs, rope, iron bands, bone, moss and dirt. Row one: a compact one-storey chief's longhouse with a low hide pitched roof, wooden walls, a readable entrance, modest tusks and log footings flush to the ground, no stone plinth or stairs; a sharpened timber corner post with rope lashings and a short brace; the same post broken into a stump with low splinters. Row two: low irregular earth-and-root foundation apron with shale; low timber sill resting on rubble and dirt; a shallow earthen doorway ramp with two worn threshold boards and straw. Ground details have freeform transparent edges, no square or diamond tiles, no tall upright posts. No people, fire, masonry, backdrop or baked rectangular shadows.
```

The damaged and breached gates remain separate real states. Decorative fittings never modify collision or imply an entrance where the rules have no opening.
