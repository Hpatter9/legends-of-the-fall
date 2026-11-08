# Expansion art — taunt banners

- Owner: Codex. Branch: `art/expansion`.
- Source: `art-source/expansion/taunt-banners.png`, one transparent 1280×384 PNG.
- Top cell: `(0, 0, 1280, 192)`, black/blood-red nemesis cloth, aged brass top trim, torn right end and grey smoke.
- Bottom cell: `(0, 192, 1280, 192)`, deep green/brass hero answer, torn left end and grey smoke.
- Original generated artwork, guided by the owner’s brief after viewing `src/art/ui/ribbon.png`; no pack artwork copied. Generated with the image generation tool and resized to the requested dimensions with ImageMagick.
- Validation: visually inspected the final sheet; ImageMagick confirms 1280×384 RGBA and alpha includes fully transparent pixels. No text or figures. Both banners fit their respective cells.
- Source art only; runtime ribbon replacement remains for integration. No executable code changed, so typecheck, tests, web build and browser checks were not run.
- Ready for owner review in the Expansion art PR. No merge or deployment performed.
