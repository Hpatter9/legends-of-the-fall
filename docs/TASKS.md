# Shared task board

Project: **Legend of the Last Keep**  
Initial coordination snapshot: 2026-10-26

This is the shared handoff board for Codex and Claude. It records known assignments, not live chat activity. Existing chats must read these instructions from their checked-out branch or receive a handoff; this file does not automatically notify them.

The manager maintains the integrated board. Workers propose their task updates in their own branches and return them in their handoff. Keep one owner per task; reconcile board changes when integrating work.

## Active work

- **UI-003 / Summoning Sanctum:** ready for review; owner: Codex; branch `design/summoning-sanctum`, worktree `/workspace/legends-of-the-fall`; PR unknown. Owner approved ornate chamber concept and implementation. Scope: summon hall renderer, controls, reveal styling, supporting artwork/credits, browser checks and handoff. Preserve summon rules, saves and costs. Complete when approved chamber, summoner and altar are implemented, three portrait sizes inspected, typecheck/tests/build pass and offline assets verified. Implemented approved chamber/priest/altar and summon/results presentation. Typecheck/build passed; full 103-file test set passed, subsequent two relevant files passed; browser checks passed at all three portrait sizes including full ritual, ten pulls, low funds, keyboard, reduced motion and offline reload. See [handoff](notes/summoning-sanctum.md). Follow-up complete: ceremonial single/ten-result frames, readable recruitment/rank/crown rewards, reveal-all, persistent Continue, timer cancellation and long-name fit. Full 103-file test set and final relevant tests passed; dedicated four-reward-state browser checks passed at all three sizes, including keyboard, early close, collection and offline frame loading. Same owner, branch and reserved scope; ready for owner review. Latest owner refinement complete: new allies alone receive the grand ritual, full-width griffin stage, gold rays, rising entrance and reveal stinger; shards/crowns use quiet parchment tarot cards and bypass the ritual. Mixed batches reveal new allies last. Typecheck/build, all 1,103 tests across 103 files, and both browser suites passed, including multiple new-ally spotlights and all-shard batches at all portrait sizes. Same owner/branch/scope; ready for review. No merge or deployment. No other active reservations.

UI-002 accepted by the owner for version 0.162.0 and GitHub merge; HEART-001 and DIALOGUE-001 are retained as released work.

## UI-001 manager takeover — 2026-10-26

The owner stopped the previous UI chat and transferred the intact branch and PR to this manager. The owner chose Keep & Kingdom (stone, brass, green), authorised layout/navigation redesign, and prioritised hero roster and equipment after comparing two visual concepts. Ask clarifying questions at the start of future tasks and provide visual proposals for visual work.

Checkout and dependency installation now work in the manager environment. Earlier proxy errors were overcome with sandboxed network access; the dependency cache was moved to a writable workspace directory. The hero roster/equipment redesign and shared theme are implemented. Typecheck and web build pass; all 103 test files pass. Browser hero/equipment checks and combat/offline smoke checks pass at all three portrait sizes. All 17 land fits were checked at 393×852. See [implementation and validation](notes/tactical-command-ui.md). The director integrated the manager setup from main, resolved overlapping coordination files, and bumped the working-branch version to 0.158.0 under the merge-time rule. The owner approved the actual visuals and requested the merge. Release version: 0.159.0. A full manual pass across modes and progression states remains a documented follow-up; automated smoke checks are not an exhaustive playthrough. The following is the earlier handoff, retained as history.

## Earlier UI-001 handoff — 2026-10-26

Owner relayed the UI chat's report. GitHub confirms PR #118 is open and draft. This is a recorded handoff, not a new validation run.

- **Changes in reported session:** none; inspected PR and instructions.
- **Blocker:** clone failed because the UI environment could not connect to its network proxy; retry was interrupted. Cause and recovery remain unverified.
- **Checks:** typecheck, tests, web build, and browser checks have not run.
- **Next work:** obtain a checkout on the existing branch; audit and complete the UI; inspect 393×852, 360×780, and 412×915 portrait sizes; check deployment, battles, hero management, navigation, overlays, save loading, and offline play; fix failures and rerun checks.
- **Release gate:** update the UI notes, board handoff, and PR with actual results. Keep PR #118 draft until validation and visual review are complete. Its reservation remains in place while blocked.
- **Reference:** [recorded handoff](notes/ui-coordination-handoff.md).

## Completed work

| ID | Task | Result | Reference |
| --- | --- | --- | --- |
| UI-002 | Ornate company character cards | Done; owner accepted the implementation and authorised release 0.162.0 and GitHub merge; full test set and three portrait sizes validated | [Implementation and release handoff](notes/character-card-flair.md), branch `design/character-card-flair-mockup` |
| HEART-001 | Hearts revive fallen heroes in the existing fight | Done; owner authorised merge into `work`, release 0.161.0; 103 test files, typecheck, build and portrait checks passed | [Handoff](notes/heart-resume.md) |
| DIALOGUE-001 | Roughly 90% fewer fight conversation bubbles | Owner accepted and authorised merge, release 0.160.0; typecheck, build and dialogue tests pass; full suite stopped after 50 passes and 53 cancellations | [Handoff](notes/fight-bubbles.md), branch `reduce-fight-bubbles` |
| UI-001 | Keep & Kingdom hero roster, equipment and shared styling | Done; owner accepted the result and authorised merge, release 0.159.0 | [PR #118](https://github.com/Hpatter9/legends-of-the-fall/pull/118), [validation and screenshots](notes/tactical-command-ui.md) |
| SETUP-001 | Shared Codex instructions and task board | Done; merged at owner's request, version 0.157.0 | [PR #119](https://github.com/Hpatter9/legends-of-the-fall/pull/119), [setup note](notes/manager-setup.md) |

## Ready queue

No additional development tasks have been assigned. Do not invent feature work or start broad refactors. The next task should come from the owner's goal or a specifically authorised investigation.

## Task template

- **ID / title:**
- **Goal:** observable player outcome or question to answer.
- **Status:** ready / in progress / blocked / ready for review / done.
- **Owner:**
- **Branch / worktree / PR:**
- **Allowed files or systems:**
- **Dependencies / reserved files:**
- **Completion criteria:**
- **Validation:** commands actually run, results, and any manual checks.
- **Handoff:** commit or PR, note path, remaining issues.

## Handoff for the existing UI chat

The earlier UI chat stopped work and handed ownership to the manager. UI-001 is accepted and can be archived by the owner. Do not resume that branch without a new assignment. The manager cannot archive app chats directly.

## Returning work to Claude or Codex

Give the next chat the task ID, branch or PR, relevant docs/notes file, checks already run, and remaining work. Repository files provide shared context; chats do not automatically share conversation history or local changes.

## Completion

Mark a task ready for review after implementation and validation. Mark it done only after the owner merges or explicitly accepts the result. Retain a short completed entry with its PR and handoff note.

