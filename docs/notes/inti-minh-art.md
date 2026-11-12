# Inti and Minh: why their battle sprites sit apart (inti-minh-art)

The owner: "Inti and Minh don't really fit the art style of the rest." It is the battle sprites only; the portraits are
fine and were left alone. Nothing under `src/` changed here: this is the finding, the prompts for new art and the
packing step, ready for when the art lands.

## What the pictures show

`python3 tools/inti-minh-art/contact.py` draws every hero's first idle frame on one neutral grey, from the sheet the
game bundles: [front.png](../samples/inti-minh-art/front.png) and [back.png](../samples/inti-minh-art/back.png) at the
game's own scale (3x, so the pixels read) and [native.png](../samples/inti-minh-art/native.png) at the sheets' own
pixels. `measure.py` beside it prints a few numbers for each.

- **Minh (Peasant), front and back.** The plainest figure in the cast. Slim, realistic, small-headed proportions where
  the Samurai, Gunslinger and Barbarian have big heads and sturdy bodies; he stands upright with his arms down; the
  tunic and trousers are near-flat fills with two or three tones; the outline is thin and brown, not dark (rim
  lightness 50 against the cast's mean of 34 and the Samurai's 26); the spear is a thin line and its pennon tiny. He
  is also the **smallest hero on screen**: 593 pixels of figure at the game's scale, less than half the Samurai's
  1,219. Part of that is by design (the small band, 42 px) and part is the sheet: the game sizes a hero from the
  height of its first idle frame, and Minh's spear tip stands above his hat, so the spear, not the man, fills the 42.
  The back view is worse: a blank hat and a blank yellow back.
- **Inti (Ranger), front and back.** Drawn with more care than Minh, but the same slim, upright, small-headed build,
  61 pixels wide where the Samurai is 113. Olive green, tan and mid-brown at similar lightness run together; the
  outline is light (rim 56, among the lightest); the bow is a thin brown line against a brown cloak. From behind she
  is a green cloak and a brown braid with little else to read.
- Both are true to their portraits; the costumes are right. It is the build, the stance, the outline and the depth of
  shading that differ, so the fix is a redraw, not a recolour.

## Others I would flag (the owner named two)

Milder than those two, worst first. All share the slim, upright, narrow build of the later sheets rather than the
bold one of the Samurai's:

1. **Tenzin (Geomancer)**: narrow, static, red and orange robes at one lightness, a thin staff; the flattest shading
   after Minh (spread 44).
2. **Itzel (Beastmaster)**: dark browns on brown skin blur into one shape; front and back are hard to tell apart.
3. **Dorion (Satyr)**: plain and cartoon-flat, bare-chested with nothing in his hands; a small, simple figure.
4. **Malia (Lightning Mage)**: pale lilac and white with the lightest outline of all (rim 78); washes out on a light floor.
5. **Kohaku (Kitsune)**: small (682 px), soft light outline (62), upright with arms in.
6. **Tariq (Corsair Surgeon)**, **Corvus (Plague Doctor)**, **Klara (Dhampir)**, **Isolde (Banneret)**: small, narrow
   and either busy (Tariq) or dull in colour (Corvus, Klara); Isolde is a thin figure under a large flag.

I would not flag the rest. Selam, Luana and Tiago, remade in the same batch as Inti and Minh, hold up: stronger
colour blocks and darker outlines.

## The prompts

[inti-minh-art-prompts.md](inti-minh-art-prompts.md): **one ChatGPT task, two files** (Inti's and Minh's 8 x 7
atlases, front and back together), on branch `art/inti-minh`. The style is spelled out from the Samurai, Gunslinger and
Barbarian sheets, which the prompt names as references. No portrait prompts: the portraits stay.

## Packing

The new files replace `art-source/hero-remakes/ranger.png` and `peasant.png`, where the remakes' packer
(`tools/hero-remakes/pack.py`, `docs/notes/hero-sprite-remakes.md`) already reads them. One command:

```sh
python3 tools/inti-minh-art/pack.py
```

It checks each source first (transparent background, 56 whole figures in an 8 x 7 grid, idle figures at least 96 px
tall) and says what is wrong in plain words; then packs front and back (and the toned copies), bundles them
(`tools/resonance/apply.cjs --art-only`), runs the remakes' validation and redraws the contact sheets. Run today on the
present sources it rebuilds the four shipped sheets byte for byte, so the path is proven. The Carter (`guestCarter`)
draws `hero_res_peasant`, so he follows with no step of his own. The packer sets cell sizes itself, so a wider
silhouette needs no other change; `scale` in `units.ts` stays as it is (figure 96).

## The interim pass: built, not applied

`tools/inti-minh-art/interim.py` is a filter on the packed sheets (darker rim, a little more contrast and colour; no
pixel added or moved). `--preview` writes [interim.png](../samples/inti-minh-art/interim.png): idle and attack, before
and after, front then back, Inti then Minh. I looked at it and did **not** apply it: the outline is firmer and the
colours a little richer, but the build, the stance, the flat cloth and the small size are untouched, which is what
the owner is seeing. It is a modest lift, not a clear one. If the director wants it meanwhile: run it without
`--preview`, then `node tools/resonance/apply.cjs --art-only` and the usual checks.

## Open choices for the director

- Minh is in the small band (42 px) by an old design call. With a bolder sheet he may still read small beside the
  Samurai (50). Moving him to the medium band is one number in `units.ts` and `tools/resonance/roster.json`.
