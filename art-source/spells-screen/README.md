# Spells screen artwork

`approved-concept.png` is the owner's approved visual proposal. Its labels and example spells are illustrative, not game rules.

`study-source.png` is the new production environment painting, drawn with OpenAI image generation from that proposal: candlelit bookshelves, brass astronomical instrument, glowing blue tome on a green-draped lectern, and a moonlit stained-glass window. It deliberately excludes UI and lettering. The lossless production copy is `src/art/ui/spells-study.png` (1536×1024).

Live DOM supplies the title, actual ruler's school, loadout, filters, marks and spell cards. Existing credited painted spell icons and combat frame assets are reused. The build's UI asset loop copies and precaches the painting for offline play.

`parchment-source.png` is a second original generated material: pale ivory parchment with subtle botanical corner tracery and no text or frame. The lossless production copy is `src/art/ui/spells-parchment.png` (1536×1024). Standard ornate wells supply the card structure and existing painted frames.
