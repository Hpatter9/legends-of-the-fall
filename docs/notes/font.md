## One font: Press Start 2P

The owner found numbers hard to read: the page's main font, Pixelify Sans, drew its 5 and 2 much like an 8 ("Wave 1/15"
read as "1/18"). They picked Press Start 2P, the game's number font, for everything.

- `src/pixel.css` adds a second face of the same file, `'Press Start Text'`, with `size-adjust: 66.667%`. `--display` and
  `--body` use it, so a label sized for the old font draws at two-thirds (a 12px label at 8px, the font's native grid) and the
  layouts still fit. `--pixel` keeps the full-size face for the small pixel labels.
- `font-synthesis: none`: the font has one weight, and the browser's fake bold smeared it into a doubled, shadowed look.
- Fitting:
  - the battle's top line hides the game's name;
  - the status line keeps clear of the version line and may wrap;
  - card names close up by 1px a letter;
  - the camp's signboards use 9px small text.
- Damage numbers (`number` in `render/fx.ts`) no longer land on each other: one over the same fighter within half a second
  steps up a row (13px) and to alternate sides.

Checked at 393x852 and 360x780. On the narrowest phone, long names ("Fire Wizard") still end in "…" on the cards.
