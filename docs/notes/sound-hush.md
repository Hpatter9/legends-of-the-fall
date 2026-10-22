## Sound stops when the game is out of sight

The music and effects used to keep playing after the phone switched away from the game or the app was closed. Now
`src/render/sound.ts` listens for `visibilitychange`, `pagehide` and `pageshow`:

- hidden or closed (`hush`): every music track's element pauses and the AudioContext is suspended, so no effect plays;
- seen again (`wake`): the context resumes and the track that was playing carries on.
