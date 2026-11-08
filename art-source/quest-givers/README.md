# Painted quest-giver portraits

Original OpenAI-generated paintings in the owner-approved warm painted portrait style. `approved-proposal.png` is the approved Oswy / Mother Teal / Pim proposal; the production sheets preserve that direction.

Each production source is 1536×1024: three columns, two rows of 512px cells. First five cells are used in reading order; final cell is blank.

- `campaigns.png`: Oswy, Mother Teal, Pim, Maren Fold, Sorrel Vane.
- `tales-1.png`: Old Maud, Brannock, Edda Coalbrook, Sexton Pell, Ottilie Marsh.
- `tales-2.png`: Kiku, Master Fenwick, Hesper Tock, Wren Halloway, Ivy Penhallow.

`python3 tools/quest-givers/import.py` crops each cell to its upper central 412px square and downsamples to a 256px shipping portrait. The importer also creates a contact sheet with 40px samples. Backgrounds are deliberately dark charcoal, matching the quest frames. These images replace only quest portraits; world sprites remain the separately credited originals. All faces are bundled as data URLs in offline-cached game.js.
