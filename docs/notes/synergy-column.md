# Synergies down the left edge, no opening banner

Changes "Synergies in a fight" in `synergy-tips.md` (the owner's ask: the banner at every fight's start was not needed, since
the row can be tapped; the row took the board's room; its text was hard to read).

- `src/synergyView.ts`: the banner is gone. The row of two-letter badges (`#synRow`) is now a column of plates (`#synCol`) down
  the left edge under the top bars, one plate per active trait: the count in a small square, then the trait's whole name
  ("3 Samurai"). Origins' squares are brown, classes' blue; a trait at its top tier wears gold (classes light blue).
- Readability: solid dark plates and flat light text with no outline or shadow, the body face at 12px, no letter spacing.
- The column lies over the board's left edge, so `placeSynergies` no longer pushes the board down (it returns `top`).
- Tapping the column opens the list beside it: each trait's name and count in gold, what it gives, and what its next tier
  needs ("1 more hero for +10% attack"). Tapping the list closes it.
- `synergyLines` reads "Samurai 3: +1% attack" (it read "3/2" when the count passed the tier's need).

## The deploy strip made readable too

The owner: the synergy text in the lower section (the deploy strip's chips) was still hard to read. Each chip's effect line
was 9px (drawn 6px tall by the pixel face) at 80% opacity, and the hint line under the strip 11px. In `src/stone.css`
both lines of a chip and the hint are now 12px with flat token colours (`--text`, `--text-dim`, `--btn-ink` on a lit chip,
`--accent` when a tier wakes), with no fade, bold or outline.
