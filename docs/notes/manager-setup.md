# Manager setup

Added root AGENTS.md so Codex reads the existing CLAUDE.md project rules and follows a shared coordination workflow. Added docs/TASKS.md with the existing Codex UI chat recorded as the UI owner; its branch, precise scope, and progress remain unknown.

The workflow uses bounded tasks, separate branches/worktrees for concurrent work, economical delegation where supported, and explicit validation and handoffs. It does not provide automatic chat creation, model routing, or communication with existing chats.

The owner confirmed the title is **Legend of the Last Keep**. These coordination files use that spelling. Existing game text, repository name, URLs, save keys, version, and CLAUDE.md are unchanged.

Validation: documentation reviewed for relative links, consistency with CLAUDE.md, accurate unknowns, and absence of model identifiers. Runtime checks were not run because this change only adds documentation.

After merge, new Codex tasks should read AGENTS.md automatically where supported. Existing chats should explicitly read it from an updated checkout. Claude should read docs/TASKS.md alongside CLAUDE.md when receiving a handoff. The manager cannot observe an existing chat's uncommitted work.
