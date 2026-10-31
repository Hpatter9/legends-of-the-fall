# Gemini sprite-sheet prompts for the Eidolons

Pixel-art sprite sheets for the five Eidolons other than Askel, in the style of the owner's Askel sheet. Each prompt follows the
shape that worked for Askel, with the creature matched to its painting in `../dreamina/<id>-figure.jpg`.

**Status (2026-10-31): not generated yet.** Every Gemini image model (`models/gemini-3-pro-image`, `gemini-3-pro-image-preview`,
`gemini-3.1-flash-image`, `gemini-3.1-flash-image-preview`, `gemini-2.5-flash-image`) answered `429 RESOURCE_EXHAUSTED`: the
connected key is on the free tier, whose image quota is 0. Once billing is on for the key, run from this folder:

```bash
for id in nivra aurelan voltara gorm vaelkhar; do python3 generate.py $id models/gemini-3-pro-image; done
# a second try:  python3 generate.py <id> models/gemini-3-pro-image -try2
# fallback model: models/gemini-3.1-flash-image
```

Each sheet is saved raw, as returned, as `<id>-sheet.<ext>` (PNG asked for via `responseModalities: ["IMAGE", "TEXT"]`).
Model planned: `models/gemini-3-pro-image` (fallback `models/gemini-3.1-flash-image`). Date of the prompts: 2026-10-31.

## nivra

```text
Pixel art sprite sheet of a mythical serpentine ice dragon called Nivra the Rime Wyrm, for a 2D fantasy game. The creature: A long, legless wyrm whose body coils in an S-curve, covered in translucent pale-blue ice-crystal scales with jagged frost spikes along the spine and a crest of icicle horns. Its scales glow a cold icy cyan from within, its eyes shine bright white-blue, and frost mist drifts from its jaws. Mood: noble, ancient and serene, not demonic. Layout: side view, facing right. One row per animation, each row 6 frames of equal size, evenly spaced on a grid: Row 1: idle; Row 2: move (slither, the body rippling in waves); Row 3: rise, the coils lifting the head and body high; Row 4: frost breath pouring out to the right in a cone of icy white-blue mist and ice shards. Style: crisp retro pixel art, about 64x64 pixels per frame, limited palette, clean dark outline, no anti-aliasing blur, consistent size and position in every frame. Keep the whole creature inside each frame. Plain solid magenta background (#FF00FF). No text, no labels, no grid lines, no watermark.
```

## aurelan

```text
Pixel art sprite sheet of a mythical lion called Aurelan the Lion of Dawn, for a 2D fantasy game. The creature: A great golden lion with a radiant flowing mane of gold, amber and rose-pink, a cream-white chest and a tufted tail. A halo of sunlight rays shines behind its head and its eyes glow warm gold. Mood: noble, proud and heroic, not demonic. Layout: side view, facing right. One row per animation, each row 6 frames of equal size, evenly spaced on a grid: Row 1: idle; Row 2: move (run, a powerful bounding gallop); Row 3: leap, springing up with forelegs reaching forward; Row 4: a roaring burst of golden sunlight, rays and light blasting out to the right from its open jaws. Style: crisp retro pixel art, about 64x64 pixels per frame, limited palette, clean dark outline, no anti-aliasing blur, consistent size and position in every frame. Keep the whole creature inside each frame. Plain solid magenta background (#FF00FF). No text, no labels, no grid lines, no watermark.
```

## voltara

```text
Pixel art sprite sheet of a mythical copper storm goddess called Voltara the Copper Goddess, for a 2D fantasy game. The creature: A tall clockwork goddess in burnished copper and brass armour with coiled copper wire wrapped round her arms, a blindfold-mask over her eyes, a halo ring of small copper gears floating behind her head, and glowing blue electric coils in her chest. Crackling blue lightning arcs between her raised hands. Mood: noble, calm and divine, not demonic. Layout: side view, facing right. One row per animation, each row 6 frames of equal size, evenly spaced on a grid: Row 1: idle; Row 2: move (glide, floating forward just above the ground with her skirt of copper plates swaying); Row 3: rise, lifting into the air with arms raised and lightning crackling; Row 4: a lightning strike, a jagged blue-white bolt hurled from her hands out to the right. Style: crisp retro pixel art, about 64x64 pixels per frame, limited palette, clean dark outline, no anti-aliasing blur, consistent size and position in every frame. Keep the whole creature inside each frame. Plain solid magenta background (#FF00FF). No text, no labels, no grid lines, no watermark.
```

## gorm

```text
Pixel art sprite sheet of a mythical stone titan golem called Gorm the Quarry Titan, for a 2D fantasy game. The creature: A massive hulking golem built of grey quarried stone blocks bound with iron chains, with moss on its shoulders and glowing molten-orange cracks running between the stones. Its small eyes glow amber and it carries a huge stone-block hammer. Mood: noble, steadfast guardian, not demonic. Layout: side view, facing right. One row per animation, each row 6 frames of equal size, evenly spaced on a grid: Row 1: idle; Row 2: move (walk, a heavy stomping stride); Row 3: leap, a heavy jump with the hammer raised overhead; Row 4: a ground-shaking hammer slam to the right, cracking the earth with flying rocks and a burst of orange dust. Style: crisp retro pixel art, about 64x64 pixels per frame, limited palette, clean dark outline, no anti-aliasing blur, consistent size and position in every frame. Keep the whole creature inside each frame. Plain solid magenta background (#FF00FF). No text, no labels, no grid lines, no watermark.
```

## vaelkhar

```text
Pixel art sprite sheet of a mythical dragon called Vaelkhar the Dragon King, for a 2D fantasy game. The creature: A towering black-scaled dragon standing on its hind legs with great leathery bat-like wings, curved horns, a golden crown, and a ring of violet flame floating above its head like a halo. Glowing violet-purple light shines through the cracks between its dark scales and in its eyes, wing membranes tinged purple. Mood: noble, regal and majestic, not demonic. Layout: side view, facing right. One row per animation, each row 6 frames of equal size, evenly spaced on a grid: Row 1: idle; Row 2: move (fly, wings beating as it glides forward); Row 3: rise, wings spread wide taking off upward; Row 4: a stream of dark violet shadow-fire breath pouring out to the right. Style: crisp retro pixel art, about 64x64 pixels per frame, limited palette, clean dark outline, no anti-aliasing blur, consistent size and position in every frame. Keep the whole creature inside each frame. Plain solid magenta background (#FF00FF). No text, no labels, no grid lines, no watermark.
```

