# Store art: the Google Play feature graphic (prompt)

Play shows a 1024 x 500 feature graphic at the top of the listing (and behind the promo video, if there is one). Play lays no words over
it, so the painting itself carries the game's look; a title can be added later by the owner if wanted. The one in `docs/store/feature-graphic.png`
is a stand-in (the camp painting cropped, with the name in its title font, made by an older `tools/store-ready/shots.mjs`).

For `hpatter9/legends-of-the-fall`, branch `art/store`, file `art-source/store/feature-graphic.png`.

## The prompt

```text
Paint a wide feature graphic for the Google Play listing of Legends of the Last Keep, a dark-fantasy auto-battler. Canvas 1024 x 500 pixels
(a 2048 x 1000 master is welcome), landscape, fully opaque (no transparency). Style: the game's own painted dark-fantasy art, matching the
reference images: rich painterly detail with crisp edges, deep night blues and ember oranges, warm gold rim light, as in the "Last Keep"
loading poster.

Scene: at dusk, a small company of five heroes stands on a rocky rise on the right half of the picture, facing left toward the danger:
a knight in silver plate with a blue tabard and a round shield bearing a gold cross (front, the anchor of the group), a samurai with a drawn
katana, a red-hatted fire wizard with a glowing staff, a hooded ranger-archer drawing a bow, and a kunoichi crouched low with a short blade.
Behind and above them on the far right, the last keep: a lone stone castle on a crag with a few lit windows and a pale gold banner. On the
left third, a great host of shadowy foes climbs out of the mist (orc banners, horned silhouettes, a huge horned demon shape in the storm
clouds), lit from below by fire. Between them, embers and sparks drift on the wind; a cracked golden crown glints faintly in the clouds high
above the keep.

Composition: keep the upper-left quarter calm (dark storm clouds and a soft moonlit sky with no figures, no bright detail) so a title can be
laid there later if wanted. Keep every hero's face and weapon well inside the frame, at least 60 px from each edge (Play may crop the edges
on some screens). Strong silhouettes that still read when the picture is shown small (about 340 px wide).

No text, no letters, no logo, no watermark, no signature, no frame or border, no UI elements.
```

## References to give with it (attach these images)

- `src/art/loading/last-keep.webp`: the "Last Keep" loading poster: the heroes on the rise, the keep, the demon in the clouds. The closest
  match in palette, light and subject; the feature graphic is this poster turned to a wide frame.
- `src/art/loading/shattered-crown.webp`: the Shattered Crown poster: the broken gold crown, its gold, and the red banners.
- `src/art/camp/overlook.png`: the camp's Battle Overlook painting: the dusk sky, the distant citadel and the land's colours.
- `src/art/camp/camp-war.png`: the war camp painting: banners, fires and the foes' camp.
- The heroes, each as the game paints them: `src/art/heroes/knight.webp` (Kwame, the knight with the cross shield),
  `src/art/heroes/samurai.webp` (Kenji), `src/art/heroes/wizard.webp` (Ravi, the fire wizard), `src/art/heroes/archer.webp` (Natsu) and
  `src/art/heroes/kunoichi.webp` (Ayame); and `src/art/heroes/astrologer.webp` (Cyra) as a second example of the paintings' finish.

## Once it lands

Copy it to `docs/store/feature-graphic.png` (1024 x 500, a 24-bit PNG or JPEG, at most 15 MB: Play's rules) and upload it in Play Console,
Main store listing, Graphics. Nothing in the game uses it.
