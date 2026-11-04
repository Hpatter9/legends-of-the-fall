# The Eidolon chains' cinematics, in the opening's style

Follows `docs/notes/opening-v2.md`. Same chains, givers, pieces, rewards, parts and bindings; only how the stories are staged and worded changed.

## Prologues (`src/sim/eidolonChainData.ts`)
- One backdrop, the Sanctum (`temple`), from the first shot to the last. Nivra's no longer cuts to the snow and back: the north's snow drifts in
  at the Sanctum door (`weather`). Aurelan, Voltara and Vaelkhar get motes, dust and embers the same way.
- The Summoner is now on the stage (a priestess figure at the altar), not an unseen voice, and the two heroes stand opposite her, so each
  speaker is shown on their own lines. Duchess (Gorm's chain) walks in as herself. The hunter, Gwen, the Crown's courier and the rift voice
  keep their faces filling the picture as they speak.
- Beats: establish (the Sanctum and what is wrong), the giver's complaint, the turn (the Summoner names the Eidolon), the payoff (what it was,
  why it slept), the handover (the three pieces, and a hero's dry answer). The old "the quest log's Eidolons tab keeps the trail" tutorial line
  is gone; the Summoner's request is the handover.
- Each voice is its own: the Summoner dry, hero A wry, hero B earnest, the giver in their own register (Duchess in bleats, her asides now a
  hero's translation). Lines were shortened; the scenes run about 30 to 45 s.

## Part and trial scenes (`src/sim/chainBattleData.ts`)
- The foe walks into the frame (stopping at x 380, in view) instead of arriving off-screen, so it is drawn in full, and the hero and the foe share
  every wide shot; the old close-ups on the hero's portrait are wide two-shots.
- A trial's last "after" line (the Eidolon's gesture, e.g. "She is laughing...") is narration, so it is told, not put in the hero's mouth.
- The trials' words (`eidolonTrials.ts`) were already in-world and kept as written.

## Bindings
Unchanged (beats, colours and lines): they were already told in-world.

## Other
- `__game.sceneFrames('chain:<id>')` / `playScene('chain:<id>')` previews a chain's prologue (`filmOf` in `main.ts`).
- Frames at 393x852: `docs/samples/cine-eidolon-<chain>-1.png` (prologue) and `-2.png` (the part or trial's meeting).
