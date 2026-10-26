# Shared task board

Project: **Legend of the Last Keep**  
Initial coordination snapshot: 2026-10-26

This is the shared handoff board for Codex and Claude. It records known assignments, not live chat activity. Existing chats must read these instructions from their checked-out branch or receive a handoff; this file does not automatically notify them.

The manager maintains the integrated board. Workers propose their task updates in their own branches and return them in their handoff. Keep one owner per task; reconcile board changes when integrating work.

## Active work

| ID | Task | Status | Owner | Branch/worktree | Scope | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| UI-001 | Existing interface work | In progress, reported by owner | Existing Codex app UI chat | Unknown; needs handoff from that chat | Exact files unknown. Reserve page layout, CSS, view modules, input, and renderer changes until confirmed. | UI chat supplies its scope, completion criteria, changed files, validation results, and branch/PR. |
| SETUP-001 | Shared Codex instructions and task board | Ready for owner review once the setup PR is open | Manager chat | codex/manager-setup | AGENTS.md, docs/TASKS.md, docs/notes/manager-setup.md | Instructions point to CLAUDE.md; UI ownership is recorded; documentation is checked and a reviewable PR is opened. |

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
