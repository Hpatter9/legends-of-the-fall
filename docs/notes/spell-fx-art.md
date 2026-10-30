# Painted spell effects — Session A

Branch: `art/spell-fx`. Owner: current Codex chat. Source: the owner's attached
131-sheet brief, retained at [BRIEF.md](../../art-source/spell-fx/BRIEF.md).

Prepared all 15 movement-toolkit sheets (36 part rows) under
`art-source/spell-fx/a-toolkit/`. Original generations are retained separately;
source crops, packing script and SHA-256 checksums make the preparation reproducible.
[Preview](../../art-source/spell-fx/preview.jpg) and
[packing/check instructions](../../art-source/spell-fx/README.md).

Validation: `python3 art-source/spell-fx/check.py` passes for all 15 sheets;
256 px cells, permitted frame counts and transparent corners. Manually inspected
contact sheets for all effects. `npm run typecheck` and `npm run web` pass.
No runtime or simulation changes; no simulation tests or live portrait checks run.
The packed swap beam closes its three distinct source paintings with a repeat of
its first frame. Review beam seams and animation continuity during integration.

Not the whole 131-sheet project: Sessions B–G (116 sheets) remain. The expected
spell importer, manifest and runtime are absent from this checkout. No atlases
were imported, and atlas budget/offline/live-fight checks remain outstanding.
No merge, deployment or version bump. Ready for source-art review; the owner can
archive this chat after the handoff.
