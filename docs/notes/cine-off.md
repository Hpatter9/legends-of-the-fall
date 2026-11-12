## CINE-OFF: the cinematics are off

The owner (2026-11-12): "Turn off the cinematics. They're terrible", meaning the story films (a boss's arrival, an army cleared, the
first loss and the like).

- `src/settings.ts`: `DEFAULTS.cinematics` is `false`. A save's settings from before are turned off once, whatever they held
  (`cineOff`, set by `parseSettings`); after that the Cinematics switch in Settings is the player's own again, so one who turns it back
  on keeps it on.
- Nothing else changed: with the switch off the game already falls back to the plain boss card and act card, a film that opened
  something still shows its end card alone, and the codex's Scenes list still plays a seen scene.
- Left as it was: a quest battle's story before its deploy still plays whatever the switch says (`tellQuestStory` in `main.ts`: it
  explains the quest). The ultimates' moments and the Eidolons' calls are separate switches and are untouched.
- Test: `test/cinematics.test.ts` ("off by default; an old save is turned off once ...") in place of the old "on by default" test, a
  requirement the owner changed.
