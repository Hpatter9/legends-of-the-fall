# Prompts for the Assault's phase 3 art (the Drill Yard)

The owner's rule: new art is painted from ChatGPT image prompts, never drawn in code; a plain stand-in is fine until it lands. Phase 3
(`docs/notes/assault-3.md`) needs one new building picture and two room icons. Everything else it shows is art the game already has:

- the duel's ring is staked with the Orc hold sheet's `stakeLine` piece (`src/art/assault/orc/sprites.webp`);
- the challenge card wears the run duel card's commissioned crest (`DUEL_CREST`, `src/expansionArt.ts`) and the Council's portrait frames;
- the Elite tricks change numbers only (Elites already show their gold glint in battle).

## Where each goes, and the stand-ins until then

| Picture | Saved as | Stand-in now | Wired in |
| --- | --- | --- | --- |
| The Drill Yard, the castle card's painting | `src/art/castle/drill_yard.png` | the castle's weapon rack (`src/art/castle/rack.png`) | `CHAMBERS` in `src/castle.ts` (`edificeUrl`) |
| The Blooded Drill room icon | `src/art/rooms/drill-blooded.webp` | `crossed-swords.webp` | `ROOMS` in `src/sim/rooms.ts` (`icon`) |
| The Veteran Drill room icon | `src/art/rooms/drill-veteran.webp` | `mark.webp` | `ROOMS` in `src/sim/rooms.ts` (`icon`) |

How to bring them in:

- The building: crop to the building's own outline on a transparent background and scale it to about 120 x 120 (the Smithy is 95 x 110,
  the Hall of Legends 119 x 112), keeping the pixels crisp. Then import it in `src/castle.ts` in place of `rackUrl`, and credit it in
  `CREDITS.md`.
- The icons: scale them to 48 x 48 and save them as WebP beside the other room icons. Then name them in `ROOMS` and map them in
  `src/roomIcons.ts`.
- All three are bundled into `game.js` by import, so nothing needs adding to the service worker's `FILES` list.

## 1. The Drill Yard (the castle card's painting)

```
A single small fantasy building for a castle-builder game, isometric three-quarter view from above and to the left, in the same style as a
set of pixel-art castle buildings drawn at high resolution: chunky readable shapes, warm late-afternoon light from the upper left, soft
painted shading, crisp dark outline, centred on a fully transparent background with no ground plane beyond the building's own small yard.
Subject: a medieval army drill yard. A low timber-and-stone barracks shed with a red-tiled roof sits at the back. In front of it is a
square packed-earth parade ground fenced with a low wooden rail. On the ground stand two straw training dummies on posts, one with a
battered round shield; a weapon rack with spears and wooden practice swords; a small red pennant on a pole; and a sergeant's drum by the
gate. Colours: warm timber browns, grey stone, faded red cloth, straw gold. No people, no text, no letters, no frame, no background
scenery, no sky. Square image, 1024 x 1024, the building filling about 80% of it.
```

## 2. The Blooded Drill (room icon)

```
A small flat game UI icon, a single gold emblem on a fully transparent background, in the same style as a set of simple golden room icons:
one solid warm-gold fill (#e2b04a) with a slightly darker gold inner edge and a thin dark brown outline, a flat front view, no shading
beyond one soft highlight, a bold simple silhouette that reads at 48 pixels. Subject: a straw training dummy on a post with a single
sword stuck upright beside it, and one small drop shape above it (a first drop of blood, drawn in the same gold). No text, no letters, no
frame, no background, no other colours. Square image, 512 x 512, the emblem filling about 75% of it.
```

## 3. The Veteran Drill (room icon)

```
A small flat game UI icon, a single gold emblem on a fully transparent background, in the same style as a set of simple golden room icons:
one solid warm-gold fill (#e2b04a) with a slightly darker gold inner edge and a thin dark brown outline, a flat front view, no shading
beyond one soft highlight, a bold simple silhouette that reads at 48 pixels. Subject: a round soldier's shield with two chevrons across
it, a sergeant's baton laid diagonally behind it. No text, no letters, no frame, no background, no other colours. Square image,
512 x 512, the emblem filling about 75% of it.
```
