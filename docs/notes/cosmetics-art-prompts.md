# Cosmetics art prompts: what the two new rulers still need

The Ember Sovereign and the Starlit Empress (`ruler_ember`, `ruler_starlit`, $6.99 each in the Shop) have their action atlases from round 2
(`art-source/round2/ruler_ember.png`, `ruler_starlit.png`: 4 x 8 cells of 224 px, rows idle, walk, strike, cast, hurt, dead, seated,
command, as `src/art/rulers/provenance.json`). A ruler in the game also stands on the Crown Terrace (a full-length figure over its own
domain painting) and sits a throne in the castle and the Last Stand (a cell of `src/art/rulers/thrones.png`). Round 2 painted none of
those, so **both rulers stay "Coming soon" in the Shop until these land** (`docs/notes/cosmetics.md`).

All for `hpatter9/legends-of-the-fall`, branch `art/cosmetics`, files under `art-source/cosmetics/`. Style: the game's dark-fantasy painted
pixel art, matching the eight rulers already in the game (`src/art/crown-terrace/ruler-*.webp`, `src/art/crown-terrace/<ruler>.webp`,
`src/art/rulers/thrones.png`), crisp edges, no text, no logos, no watermark. Each figure must match the round-2 atlas of the same ruler:
the same face, armour or robes, colours and props.

## The Crown Terrace figures

```text
Paint the Ember Sovereign standing full length for the Crown Terrace of Legends of the Last Keep, the same king as the reference atlas
art-source/round2/ruler_ember.png (a broad-shouldered king in blackened gold plate, a mantle whose hem smoulders with embers, a crown of
black iron spikes tipped with fire, a greatsword with a molten edge, a short grey-streaked beard). Match the eight ruler figures there in
scale, pose and finish (reference src/art/crown-terrace/ruler-iron_stag.webp). Output art-source/cosmetics/terrace-ruler-ember.png,
360 x 470, transparent background, three-quarter view facing the viewer's left, greatsword planted point down, feet at the bottom edge.
Painted pixel art, crisp edges, no text.
```

```text
Paint the Starlit Empress standing full length for the Crown Terrace of Legends of the Last Keep, the same empress as the reference atlas
art-source/round2/ruler_starlit.png (tall and calm, night-blue robes sewn with tiny silver stars, a silver circlet with a crescent, long
black hair with a white streak, an astrolabe sceptre, a faint starlight halo). Match the eight ruler figures there in scale, pose and
finish (reference src/art/crown-terrace/ruler-moon_oracle.webp). Output art-source/cosmetics/terrace-ruler-starlit.png, 360 x 470,
transparent background, three-quarter view facing the viewer's left, sceptre raised, feet at the bottom edge. Painted pixel art, crisp
edges, no text.
```

## The domains (the Crown Terrace behind each)

```text
Paint the Ember Sovereign's domain for the Crown Terrace of Legends of the Last Keep, matching the eight domains in layout and finish
(reference src/art/crown-terrace/iron_stag.webp and ash_empress.webp): a black basalt throne terrace over a sea of cooling lava, iron
braziers, ember-red standards, ash drifting under a smouldering red sky. Output art-source/cosmetics/terrace-ember.png, 800 x 1200, an
opaque full painting with the terrace floor and its lower middle clear for the ruler and the court to stand. Painted pixel art, no
figures, no text.
```

```text
Paint the Starlit Empress's domain for the Crown Terrace of Legends of the Last Keep, matching the eight domains in layout and finish
(reference src/art/crown-terrace/moon_oracle.webp): a pale marble observatory terrace under a deep night sky thick with stars and a slow
comet, brass orreries, blue lanterns, night-blue banners sewn with stars. Output art-source/cosmetics/terrace-starlit.png, 800 x 1200,
opaque, the terrace floor and its lower middle clear for the ruler and the court. Painted pixel art, no figures, no text.
```

## The thrones

```text
Paint two empty thrones for Legends of the Last Keep, matching the eight thrones of src/art/rulers/thrones.png (one per ruler, 224 px cells,
the same angle, scale and lighting, the seat at the same height so the ruler's seated frames sit in it). Output
art-source/cosmetics/thrones-new.png, 448 x 224, transparent background, two cells side by side: left, the Ember Sovereign's throne of
black basalt and blackened gold, its back a crown of iron spikes with embers glowing in the seams; right, the Starlit Empress's throne of
pale marble and silver, its back an arch of stars with a crescent at the top. Painted pixel art, crisp edges, no figures, no text.
```

## Once they land

Each ruler joins `RULERS` (`src/rulerRules.ts`: id, name, role, colour, words), `RULER_URLS` (`src/rulerUrls.ts`, its atlas copied into
`src/art/rulers/`), `RULER_COURTS` (`src/crownTerrace.ts`), `SEAT_BREATH`, the thrones sheet, and the picker shows it only while its
entitlement is owned (`ruler_ember`, `ruler_starlit`). Then `ready: true` in `PRODUCTS` (`src/iapRules.ts`), and the test follows.
