# Fewer fight bubbles

Task DIALOGUE-001, branch `reduce-fight-bubbles`, owner Codex.

The owner requested roughly one tenth as many conversation bubbles during fights.
`src/quips.ts` now keeps 10% of the combat lines that the existing dialogue rules
would display: hero ultimates, close calls, Last Stand level-ups, revivals, fight
endings and banter, foe grumbles, and the Last Stand king's lines.

Filtering happens after the normal dialogue rules, so suppressed lines still use
their usual cooldown and scene allowance. This prevents later attempts from
filling the silence. A separate seeded random stream leaves battle outcomes and
the original dialogue picks unchanged. Recruitment, placement and Duchess
dialogue keep their existing behaviour. The reduction is an average across
fights, rather than a fixed quota in each fight.

Validation: typecheck, web build (including release 0.160.0), diff whitespace
check, and the quips and new-lines test files pass. The full suite was stopped
at the owner's request to wrap up: 50 test files passed, zero failed and 53 were
cancelled. Its 12,000-fight ultimate balance test passed but took over ten minutes;
the next balance sweep was cancelled. No tests were changed or loosened.
No layout or renderer drawing changed; portrait browser checks were not run.

The owner authorised the version bump and merge. Package and root lockfile
metadata are 0.160.0. Merge via a pull request; the main-branch Pages workflow
handles publication. This chat is ready for the owner to archive after handoff.
