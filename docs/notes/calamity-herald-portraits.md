# Calamity herald portraits

Branch `art/calamity-herald-portraits`, worktree `/workspace/legends-of-the-fall`. Owner approved the sprite-matched Gorvak / Thorn Warden / Malphas concept and explicitly asked to finish the set and merge it alongside the completed trait and road batches.

Six 512px busts and six 256px face crops now serve the boss introduction card and discovered codex entries. Reference sprites are preserved, including species and armour identity. Intro replacement handles both image-to-image and image-to-sprite transitions. Other bosses retain whole-figure sprites; unknown heralds retain dark sprite entries with no painted image. Intro timing, close handling and reduced-motion behaviour remain in place. Cinematic films, battles and simulation rules are unchanged.

Reproduction: `python3 tools/herald-art/import.py`. Source art, references and provenance: `art-source/herald-portraits/README.md`. [Contact sheet](../samples/herald-art/contact.png). All images are bundled into cached game.js.

Typecheck/build and 51 focused tests (`codex boss card ui-standard`) passed. Browser fixtures call the actual shipping Game intro and Home codex, rather than approximating their markup. All three sizes (393×852, 360×780, 412×915) passed: six distinct decoded busts, six matching codex face crops, unknown heralds concealed, image-to-sprite fallback and working intro/detail close controls. Reduced motion passed. The fixture pauses its controlled board renderer across Home visibility changes; no page or console errors were recorded. Results: `docs/samples/herald-art/browser-results.json`. Release metadata, checks and merge are handled by the director in the same branch.
