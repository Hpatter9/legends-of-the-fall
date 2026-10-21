# Restyle: dark fantasy, autumn and gold

- **Fonts** (bundled from `@fontsource`, woff2 in `out/web/fonts/`, listed in the service worker's `FILES`, OFL credits
  in `CREDITS.md`): Cinzel Decorative (`--display`: titles, banners, big and primary buttons), Alegreya Sans (`--body`),
  Press Start 2P (`--pixel`: gold, crowns, clock, mana, stat numbers and the damage numbers in `render/fx.ts`).
  `main.ts` waits (at most 2.5 s) for the faces before the first Pixi text is drawn.
- **Skin** (the last block of `src/index.html`): tokens (`--gold-hi`, `--gold-lo`, `--ember`, `--panel-bg`, `--frame`),
  one button look (press bounce, a shimmer across `.primary` and the Battle button), framed panels (`.hmPanel`,
  `.hsheet`, `.evcard`, `#tip`, cards), red ribbon titles on the full-screen pages, a ribboned result banner,
  slide-ins, and ten falling leaves on the home screen (`#leaves`, hidden with reduced motion).
- Overlays that inject their own CSS (spellbook, party picker, ...) pick it up through the shared classes and tokens;
  override with a `body #id` selector when an injected rule needs to lose.
- No ids or logic changed. The packs' GUI frames (DawnLike) are 1 px borders, so the frames are layered CSS instead.
- Checked at 393x852 and 852x393: home tabs, recruit, heroes and hero sheet, castle, spellbook, settings, achievements,
  deploy, fight, result, tutorial bubble.
