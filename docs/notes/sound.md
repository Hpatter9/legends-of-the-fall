# Sound and music

What the page plays, and where. The code is `src/render/sound.ts` (nothing else knows about Web Audio).

- **Music**: three looping tracks in `src/audio/` (`town.ogg` between fights, `battle.ogg` for a fight, `boss.ogg` for a
  boss stage, from `isBossStage` in `src/sim/run.ts`). Each runs through a gain node, so tracks crossfade (about 1.2 s).
  The town track comes back when a fight ends. Music sits at a quiet level (`MUSIC_LEVEL`).
- **Effects**: synthesised in code (a tone, a noise burst, or a short tune per effect): sword hit, heavy hit, death,
  arrow, fire whoosh, skill, spell, summon chime, merge fanfare, victory and defeat stings, and a tap on any button.
  `playEvents` maps each tick's battle events to them; a per-effect gap (`GAP`) keeps a crowd of hits from getting loud.
- **Hooks in `src/main.ts`**: `setup()` (starts the audio on the first pointer-down and taps buttons), `bindMute` (the
  speaker in the top bar), `startFight` in `begin()`, `playEvents` after each tick, and `play` for a summon or a merge.
- **Mute**: the choice is kept in localStorage as `legends.sound` (`on` or `off`).
- **Service worker**: the three tracks are in its file list, so they play offline once loaded.
- **Caveat**: the tracks are Ogg Vorbis. Browsers that cannot play Ogg (older iPhone Safari) stay silent for the music;
  the effects still play. Converting the tracks to MP3 would fix that if it matters.
- No sim rule was added, so no test. The sim is untouched.
