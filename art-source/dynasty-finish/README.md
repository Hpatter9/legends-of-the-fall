# Dynasty art integration

The owner approved `house-heirloom.png`: two new original generated painted symbols. The left panel is a branching heraldic shield for a House; the right is a signet keepsake on folded cloth for an heirloom. `tools/dynasty-art/import.py` crops the square panels with an 8px inset and downsamples to 256px WebP.

Existing credited source art is reused unchanged in identity:

- `art-source/expansion/seasons-fates.png`: nine cells, each upper 128×128, ordered Spring, Summer, Autumn, Winter, Mentor, Regular, Shade, Fallen, Legend. All nine are imported. Only the four actual modelled fates appear; Legend remains a reserved source symbol because the bearer model has no Legend fate.
- `art-source/expansion/nemesis-icons.png`: first twelve 128px cells, ordered Iron Skull, Arrow-catcher, Battle-scarred, Sure-footed, Spell-scorned, Horn-deaf, Survivor, Healer-hunter, Executioner, Ambusher, Hill-king, Lone Wolf. Other traits retain text rather than borrowing unrelated symbols. Trait icons appear only when that exact trait is learned; unknown traits and weaknesses retain their existing presentation.
- `houses-backdrop.png` and `council-backdrop.png` in that same source folder: downsampled to 768×1152 WebP. A dark gradient sits over the paintings behind the standard ornate menu's controls. The Houses list and lineage page use the tapestry; the Council board uses its council hall.

All shipping images are bundled as data URLs into already offline-cached game.js. Original source sheets and all prior pack credits are retained. Run `python3 tools/dynasty-art/import.py` to reproduce the imports and contact sheet.
