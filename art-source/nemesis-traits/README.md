# Remaining Nemesis trait symbols

Owner-approved Fireproof / Bane of Mages / Elusive concepts are in `proposal.png`. `remaining-clean.png` supplies the other nine symbols. `remaining.png` retains the rejected hazy-background take for provenance and is never imported.

`python3 tools/nemesis-trait-art/import.py` rebuilds the twelve 128px outputs, hard alpha, 48-colour palettes, centred 104px maximum objects and minimum 12px padding. Nearest-neighbour sampling preserves crisp clusters. The proposal is three columns in one row; the clean sheet is three columns by three rows, with actual transparent row gaps at y=400 and 800 (the generated baselines drift from equal thirds). The final 28px review is in `docs/samples/nemesis-traits/contact.png`.

Mappings:

- Proposal: Fireproof, Bane of Mages (`bane:arcane`), Elusive.
- Clean row 1: Rime-hardened, Venom-blooded, Thick-hided.
- Clean row 2: Grounded, Fearless, Bane of Warriors (`bane:martial`).
- Clean row 3: Bane of the Devout (`bane:devout`), Bane of the Wild (`bane:wild`), Legend-slayer.

The twelve original commissioned icons remain unchanged. `src/nemesisTraitArt.ts` now covers all 24 modelled traits. The existing card helper still gates symbols behind `n.known`; neither rules nor saved trait identities change. New PNGs are bundled in already offline-cached game.js.
