# Owner guidance: validation and visual effects

Updated 2026-10-27 on `design/party-war-council`, owner Codex.

The owner clarified two repository-wide requirements:

- Intentional flashy effects are allowed. The no-flashing request concerns textures disappearing completely or glitching off and on. Reduced-motion support remains in place.
- Tests should cover the changed behaviour and affected callers. Full suites and unrelated balance sweeps are not required. Implementation still requires typecheck/build and relevant portrait review; documentation-only changes need diff, link and consistency checks.

Updated `CLAUDE.md`, `AGENTS.md`, the task board, the party proposal and the no-flicker note. Earlier validation results remain historical facts. The no-flicker note now identifies the existing brightness guard as a legacy interpretation to revise when the affected effects change. No runtime code or tests changed.

Validation: inspected documentation diff and referenced paths; `git diff --check` passed. Runtime tests and builds were not run for this documentation-only change. Party visual proposal remains awaiting review; no implementation, merge or deployment.
