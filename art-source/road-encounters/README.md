# Painted road encounters

The owner approved the three-scene proposal: Pale Lady shrine, crossroads forge and refugee caravan. Original generated source sheets remain here:

- `approved-proposal.png`, three vertical panels: pact, temper, refugees.
- `road-people.png`, three vertical panels: scout, deserters, cardsharp.
- `healer-crown.png`, two vertical panels: healer, crown.

Run `python3 tools/road-art/import.py` to crop each complete panel horizontally to 16:9, preserving the top and bottom of figures, and resize to 768×432 WebP. Mapping uses stable `EventKind` values in `src/roadArt.ts`, not translated titles or encounter text.

The image fits wholly inside a compact, dark-backed panel in the existing road card. It does not crop faces, move costs into artwork or replace any text. The later Pale Lady collection and refugee return deliberately have no image: these pictures depict their first meetings, not follow-up events. Other encounter kinds also retain their existing presentation.

All eight paintings are bundled into already offline-cached game.js; no new runtime URL is introduced. Source art and rules remain separate.
