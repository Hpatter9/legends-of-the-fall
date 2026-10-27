# Shared task board

Project: **Legend of the Last Keep**  
Initial coordination snapshot: 2026-10-26

This is the shared handoff board for Codex and Claude. It records known assignments, not live chat activity. Existing chats must read these instructions from their checked-out branch or receive a handoff; this file does not automatically notify them.

The manager maintains the integrated board. Workers propose their task updates in their own branches and return them in their handoff. Keep one owner per task; reconcile board changes when integrating work.

## Active work

- **UI-002 / Character card flair implementation:** ready for review; owner: Codex manager.
- **Branch / worktree:** `design/character-card-flair-mockup` / `/workspace/legends-of-the-fall`.
- **Authorisation:** owner approved the visual concept and requested implementation.
- **Scope:** roster character card markup/styles, last-viewed hero state, decorative assets/credits, targeted browser checks and documentation. No simulation changes.
- **Completion:** match the approved brass frame/class banner concept; preserve search, rank/awakening/level indicators, hero navigation and offline use; inspect all three portrait sizes.
- **Validation:** typecheck and web build passed; all 103 test files passed across split runs; final real-browser card checks passed at 360×780, 393×852 and 412×915. No-flicker regression fixed without changing tests; interrupted test bundles restored and affected files rerun. Screenshots and full validation details are in the handoff note.
- **Handoff:** implementation commit `ca163a9b`, with final correction/validation in the follow-up commit; [implementation note and screenshots](notes/character-card-flair.md). No merge, deployment or version bump.

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

