# Top bar and wake lock

Two small things for the phone.

- **Top bar upright** (`#top` in `src/index.html`): the bar wraps to two rows in portrait. The title, gold, clock and
  the mute and speed buttons share the first row; the stage and status sit on a full-width second row, with room at
  its right for the version line (top right). In a fight the title hides so the clock and buttons have room. Sideways
  the bar is still one row, beside the bench, and the version stays at the bottom right.
- **Screen stays on in a fight** (`src/render/awake.ts`): `keepAwake(true)` asks the Screen Wake Lock API for the screen
  when a fight starts (`begin()` in `src/main.ts`); `keepAwake(false)` releases it when the fight settles. When the page
  comes back to the front during a fight (`visibilitychange`), the lock is asked for again, since the browser drops it
  when the page is hidden. Browsers without the API, or a refused request, are ignored: the fight plays on either way.
- Checked at 393x852, 360x780 and 852x393 (deploy and fight) in Chromium, and the lock request and release with a stub.
- The sim is untouched, so no test was added.
