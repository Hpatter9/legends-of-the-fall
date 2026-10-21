## A war banner for heroes on the field

A hero placed on the board used to turn its bench card's frame blue, which read as the Rare tier's blue frame. The frame
now belongs to rarity alone. A placed card flies a small crimson swallowtail war banner, with a gold top bar and gold
crossed blades, from its top right corner. The banner sways gently (`@keyframes banner`, still with reduced motion), and
the portrait gets a faint golden glow. The banner stays up through the fight, so you can see who is fighting; a fallen
hero's card greys it with the rest. CSS only: `.card.placed` in `src/index.html`.

## No flash of the battle screen on opening

While the game loaded, the fight screen's title and buttons (Summon, Recruit, Pack, Home, Fight) showed for a moment
before the home screen covered them. The `#loading` screen in `src/index.html` is now a full, opaque cover in the home
screen's own colours, above everything (`z-index: 30`). It is removed once the home screen is up, so the game goes
straight from "Loading…" to the castle.
