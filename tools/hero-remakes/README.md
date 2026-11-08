# Portrait-led hero sprite remakes

Original generated artwork for the owner-approved remake of all ten automatic
heritage repaints. Sources and approved Selam concept: `art-source/hero-remakes/`.
Character briefs: `briefs.json`. Source hashes and per-cell selections are recorded
in `docs/samples/hero-remakes/<hero>.json`.

From the repository root, with Python, Pillow, NumPy and SciPy available:

```sh
python3 tools/hero-remakes/pack.py
node tools/resonance/apply.cjs --art-only
python3 tools/hero-remakes/validate.py
python3 tools/hero-remakes/review.py
npm run typecheck
npm test -- heritage-looks knight-sprite paladin-sprite resonance-facing hero-art hero-kits-looks awaken
npm run web
node tools/hero-remakes/checks.mjs
```

The browser review uses Playwright and `/usr/bin/chromium`. It seeds a started
save only in its isolated browser context, preventing the tutorial from covering
the review. It reviews all ten dossiers and all eight stride frames in four
facings at 393×852, 360×780 and 412×915, plus combat/reduced motion and an offline
reload at 393. Results and real game screenshots are under `browser/` in the
review directory. The fixture is never imported by production code.

Atlases have four front and four rear columns. Seven rows hold idle, two walking
halves, attack, hurt, death and ability. Malia's eight-row source includes an extra
death take; its final row supplies her ability. `pose-selection.json` records
intact casting gestures used for mage attacks to avoid duplicated staff pixels.
Malia holds the intact rear corpse pose for the final death frame, instead of
returning to a seated pose. Selam's separate eight-pose attack source supplies
both her normal attack and Smite, replacing the original duplicated mace take.
Its paired views share one scale; all other atlas poses share their atlas scale.

Packing extracts whole connected components, drops tiny detached specks, hardens
alpha and uses nearest-neighbour sampling; it does not paint or recolour skin.
Source-cell horizontal anchors keep weapon extension from recentering the body.
The old tone filenames remain as exact compatibility copies of the new plain
sheets, and the old recolouring command skips every remake.
