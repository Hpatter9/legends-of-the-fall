# Painted healer and revive effects — Session C

Owner: current Codex chat. Branch: `art/spell-fx-c`. Scope: the ten healer/revive
source sheets, their packing/checks, credits and this handoff. Session A remains
in its independent [PR #210](https://github.com/Hpatter9/legends-of-the-fall/pull/210).

Prepared sources cover Revivify, Resurrection, Elixir, Reincarnate, Mass
Resurrection, Guiding Bolt, Prayer, Cure Wounds, Death Ward and Healing Draught.
Originals are retained alongside measured crop layouts and checksums; packed
sheets use 256 px cells. [Preview and reproduction instructions](../../art-source/spell-fx/c-healers/README.md).

Validation: all ten sheets (19 rows / 128 frames) pass `python3 art-source/spell-fx/c-healers/check.py`, including 256 px cells, frame ranges, clear margins and transparent corners. All effects were visually inspected in the contact sheet. `npm run typecheck` and `npm run web` pass. No runtime or
simulation changes; live portrait/offline/reduced-motion tests await integration.
Review once-part fade-outs and loop continuity before enabling these paintings.
The brief's importer is absent from this checkout. Sessions B/D/E/F/G remain.
No merge, deployment or version bump. The owner can archive this chat after handoff.
