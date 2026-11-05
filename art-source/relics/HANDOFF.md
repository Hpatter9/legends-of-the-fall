# Relic paintings handoff

Owner: Codex art chat. Branch: `art/relics`, based on main. Scope: `art-source/relics/` and `tools/relics/`.

All 48 prompts painted in order, using the painted Ember Amulet as the style reference and transparent backgrounds in place of magenta. Each raw PNG is 512×512 RGBA. Four commits contain 12 relics each. Doom Helm had its unintended smoky backdrop removed with the image tool.

Validation: exact expected filenames, PNG decoding, dimensions and alpha checked for all 48; changed paths and diff whitespace checked. No runtime checks: no game integration or gameplay code changed.

The original prompts and tools are copied from the source branch. Existing later main-only relic tools are retained. The accompanying docs note was copied locally but excluded from commits under the owner’s allowed-path restriction.
