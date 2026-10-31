# The relic paintings: prompts and tools

For the relic redesign (`docs/notes/relics-redesign.md`, its "Art plan"): one painted icon for each of the 48 new relics, in the style
of the painted gear icons (`art-source/gear/`) but aged like ancient artefacts.

## Status (2026-10-31): prompts and tools ready, no paintings yet

Both image services this environment can reach refused to paint. The Gemini key is on the free tier, whose quota for every image model
(`gemini-3-pro-image`, `gemini-3.1-flash-image`, `gemini-2.5-flash-image`, the previews and the lite one) is 0 (HTTP 429). OpenAI, which
painted the kings, the heroes and the spell effects, answered `credit_balance_exhausted`. Once either has quota, one command paints the set.

## The list and the colours: `tools/relics/relics.json`

Each relic: its id (the kebab-case of its new name, e.g. `the-first-banner`), its name, its group, its rarity, the old ids it replaces,
and the subject the painter is given (taken from its lore line). Each group has one colour, used in every prompt of that group:

| Group | Colour |
|---|---|
| Chapter I: The Founding | ivory-white and pale holy gold |
| Chapter II: The Long Winter | pale frost blue, rime |
| Chapter III: The Burning | ember red, soot and scorch |
| Chapter IV: The Night Watch | deep violet and shadow |
| Chapter V: The Hunt | forest green on earthy browns |
| Chapter VI: The Treasury | deep coin-gold and amber (warmer and heavier than the Founding's white-gold) |
| Askel, the Cinderhound | charcoal black with molten orange-red cracks |
| Nivra, the Rime Wyrm | glacial ice blue and white crystal |
| Aurelan, the Lion of Dawn | sunrise gold with rose-gold |
| Voltara, the Copper Goddess | copper clockwork with electric-blue lightning |
| Gorm, the Quarry Titan | pale granite, moss green, molten-orange seams |
| Vaelkhar, the Dragon King | obsidian black, violet sheen, gold |
| Storied | the richest gold, with a faint glow |

The Eidolons' colours are taken from their cards (`art-source/eidolons/dreamina-clean/*-card.jpg`). Rares are asked for a little more
craft; Storied relics for more ornament and a faint glow.

## The tools

- `python3 tools/relics/paint-relics.py [ids...] [--try 2] [--model ...]` paints into `art-source/relics/raw/<id>.png` (a second try
  `<id>-try2.png`), Gemini 3 Pro Image first and 3.1 Flash Image if that fails, six at a time, logging model, date and prompt to
  `raw/log.json` and rewriting `art-source/relics/PROMPTS.md`. Each prompt carries one reference image for the style (the painted Ember
  Amulet on magenta) and asks for one object, centred, three-quarter view, no text or frame, on flat #FF00FF.
- `python3 tools/relics/cutout.py [ids...] --sheet` cuts each out (the raw named in `raw/picks.json` if a second try was kept): background
  is what is close to the border's colour and joins the border; a 4 px band gets a soft alpha and has the magenta unmixed out of it; a
  40 px band takes strongly magenta pixels (a glow over the background) as part see-through; the edge is despilled and half-eroded;
  specks under 2% of the object are dropped; then a trim and a fit into 256 x 256 with a 6% margin, to `art-source/relics/<id>.png`.
  `--sheet` draws `art-source/relics/contact-sheet.png` (all 48 with names). Needs numpy, scipy and Pillow. Checked on gear paintings
  laid over noisy magenta (a glowing ring, a violet robe): no pink fringe, and violet stays solid.

Importing them into the game (atlases in `src/art/relics/`, `build.mjs`'s `FILES`) is the redesign's own later step.
