# Legend of the Last Keep — agent instructions

Read [CLAUDE.md](CLAUDE.md) before starting work. It contains the shared project rules, architecture, commands, and safeguards for both Codex and Claude. Follow those rules alongside these coordination instructions. Read any more specific instructions in the directories you change.

## Owner's collaboration preferences

- At the start of each new task, ask concise questions to confirm the intended outcome and scope. Reuse answers already given for the current task.
- For visual work, show a visual proposal and confirm the direction before substantial implementation. Show real browser screenshots when available; distinguish concepts from the implemented game.
- Preserve a handoff when a worker finishes and leave it idle until needed. Flag completed app chats for the owner to archive; do not claim to archive or restore chats without that capability.

## Starting a task

- Read [docs/TASKS.md](docs/TASKS.md) and the notes relevant to the task.
- Check the current branch and uncommitted changes before editing. Preserve other people's work.
- Use a dedicated branch and, for concurrent local work, a separate Git worktree. Never push directly to main.
- Record a bounded task, its owner, branch/worktree, allowed scope, and completion criteria before implementation. Unknown information must stay marked unknown.
- An existing chat's uncommitted work is not visible through GitHub. Do not assume the task board reflects its latest edits.

## Manager and workers

The manager turns the owner's plain-language requests into specific tasks, tracks ownership, reviews changes, and reports results in plain language. The owner makes game design decisions and merges completed work.

Handle small tasks directly. When delegation is available and authorised, start with one worker at a time alongside the existing UI chat. Delegate only independent work whose benefit justifies the extra context and review. Give each worker the goal, relevant files, allowed scope, completion criteria, and required checks.

Choose a lower-cost option for bounded, straightforward work when the interface supports it; reserve stronger reasoning for difficult diagnosis, architecture, and integration. Do not claim to change model selection when that control is unavailable. Never put model names or IDs in repository files.

Workers must not delegate further without explicit authorisation. Return the changed files, branch/commit, validation results, limitations, and handoff note. The manager reviews the actual changes before marking work complete.

## Concurrent UI work

The existing Codex UI chat owns the interface task recorded in docs/TASKS.md. Until its exact file list is known, treat page layout, CSS, view modules, input, and renderer changes as reserved. Coordinate a handoff before touching overlapping files.

Separate worktrees prevent local overwrites, but do not prevent merge conflicts. Shared files and shared task-board edits should be coordinated through the manager. Do not reset, rebase, clean, or overwrite another chat's work.

## Validation and handoff

Follow CLAUDE.md: run type checks, tests, and the web build for implementation work; add regression coverage for new simulation rules and inspect the specified portrait sizes for visual changes. Preserve deterministic simulation, existing save keys, offline caching, and asset credits.

For documentation-only changes, inspect the diff, links, and consistency; report runtime checks as not run because executable code is unchanged. Never imply checks passed unless they ran.

Write a short handoff in docs/notes/<topic>.md and update the task board with results and remaining blockers. Do not repeatedly scan the entire repository or run expensive balance sweeps without a task-specific reason.

Workers do not bump the version. The director handles the version at merge time as described in CLAUDE.md. Do not merge or deploy unless the owner requests it.

