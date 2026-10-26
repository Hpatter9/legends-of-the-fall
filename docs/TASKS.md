# Shared task board

Project: **Legend of the Last Keep**  
Initial coordination snapshot: 2026-10-26

This is the shared handoff board for Codex and Claude. It records known assignments, not live chat activity. Existing chats must read these instructions from their checked-out branch or receive a handoff; this file does not automatically notify them.

The manager maintains the integrated board. Workers propose their task updates in their own branches and return them in their handoff. Keep one owner per task; reconcile board changes when integrating work.

## Active work

| ID | Task | Status | Owner | Branch/worktree | Scope | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| UI-001 | Tactical Command interface overhaul | Blocked: checkout/network access; not ready for review | Existing Codex app UI chat | ui/tactical-command-overhaul; [draft PR #118](https://github.com/Hpatter9/legends-of-the-fall/pull/118); no local checkout reported | Current PR: src/index.html and docs/notes/tactical-command-ui.md. Reserve related page layout, CSS, UI views, input, and renderer work; additional files unknown. | Obtain checkout, audit and complete UI, pass required checks and portrait/functional review, document results, and submit for owner review. |

## UI-001 handoff — 2026-10-26

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

Read AGENTS.md and CLAUDE.md. Continue your assigned interface work on your own branch/worktree. Include your branch, changed or reserved files, intended outcome, and checks in your next handoff so the manager can update UI-001. Do not overwrite unrelated work.

## Returning work to Claude or Codex

Give the next chat the task ID, branch or PR, relevant docs/notes file, checks already run, and remaining work. Repository files provide shared context; chats do not automatically share conversation history or local changes.

## Completion

Mark a task ready for review after implementation and validation. Mark it done only after the owner merges or explicitly accepts the result. Retain a short completed entry with its PR and handoff note.
