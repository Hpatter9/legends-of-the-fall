# GUARDED-SAVES: a save never stops the game

The release audit (`docs/notes/release-audit-code.md`, point 2) found that the game's savers called `localStorage.setItem` with nothing
round it. A phone whose storage for the site is full (Chrome gives a site 5 MB) throws `QuotaExceededError` from that, and a throw from a
save inside the game's own flow stopped it: the Battle button began no run, and the save at start-up would have stopped the game before
the home screen. A save that could not be read was quietly replaced by a fresh one, and the old text lost with the first save.

## What it does

- **Every saver is guarded** (`src/sim/saveGuard.ts` `guardedSave`): `saveMeta`, `saveRun`, `saveSlot` (the tower, calamity, quest and
  muster slots) and `saveStand` return false when the storage refuses the write, and never throw. The game plays on from what it holds in
  memory, and every later save tries again, so what is done is kept once there is room.
- **The player is told once a session** (`src/saveNotice.ts` `watchSaves`, a standard ornate card): "Your phone's storage is full: progress
  can't be saved until space is freed." A write refused for another reason (storage switched off, a private window) has its own words.
- **An unreadable save is kept aside** (`loadMeta`'s third argument, `keepUnreadable`): its text is copied to `legends.meta.unreadable`
  (the first one only, never written over) before the Keep begins afresh, and a card says so ("Your save could not be read ... kept on
  this phone, untouched, in case it can be mended"), with "Begin afresh" to carry on. If even that copy cannot be written (the storage
  full), the card says it could not be kept.

The other small keys (settings, tips, diagnostics, the hall's fold) were already each in a `try`.

## Checked

`test/guarded-saves.test.ts`: a full and a refused storage, every saver, a listener that throws, an unreadable save handed over (a cut-off
save and readable text that is no save), the backup kept once, the words, and the page listening before its first save. In the built game
(`tools/release-audit/robust.mjs --only full`, `--only corrupt`): with the storage filled a run begins, its wave is fought to its result
card and the card is shown; a cut-off save shows the card, its text is kept under `legends.meta.unreadable`, and the game starts on a
fresh save.

Not done: a damaged run save (`legends.run`) is still read as no run, as before (the run is lost, the meta is not).
