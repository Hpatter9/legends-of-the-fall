# HALL-LIGHT — the Hall of Heroes scrolls lightly

After HEROES-STILL the Hall of Heroes was the heaviest Heroes screen to scroll: about 5 of every 6 seconds of the main thread busy with the
CPU slowed four times (`docs/notes/heroes-still.md`). Two changes, and it looks the same.

## What changed

- **A cached picture for each hero, not a canvas each.** Each of the Hall's hero cells drew its sprite portrait onto a `<canvas>` of its own
  (about seventy on the page, each a layer the browser composites as the list scrolls). Now each sheet's portrait is drawn once, kept as a
  picture (`PICS` in `src/hallView.ts`, by sheet, for the life of the page), and every cell shows it as an `<img>` the same size. A sheet not
  loaded yet keeps nothing, so the next opening tries again (as before, its cell is empty until then).
- **What moves under the Hall waits while it is open.** The Hall's sheet covers the roster but for a dimmed strip at its top, and under it the
  roster's eighteen upgrade chevrons kept bobbing. While the Hall is open they are paused (`warRoom.css`); nothing seen changes, and they
  move again as it closes.

## Measured

`node tools/heroes-still/scroll.mjs <label>` (393x852, the CPU slowed four times, six seconds of scrolling; the main thread's busy time):

| | Busy, of 6 s | Style + layout | Frames over 50 ms | Long tasks |
| --- | --- | --- | --- | --- |
| Before (0.628.0) | 5.1 to 5.2 s | 0.46 s | 0 | 0 |
| After | 3.1 to 3.7 s | 0.19 to 0.26 s | 0 | 0 |

Each change alone: the pictures, 5.1 to 5.2 s → 4.1 to 4.2 s; pausing the roster under it, about 0.8 s more.

**Tried and not kept:** putting each portrait in only as its cell nears the view (an `IntersectionObserver` with a 400 px margin), both
taking them out again as they leave and keeping them once in. Both were far worse: about thirty long tasks in six seconds, 2.1 to 2.5 s of
style and layout, frames of 100 to 250 ms. The cells are light once they hold a picture rather than a canvas, so there is nothing left
worth windowing. Hiding the roster under the Hall (about 1.5 s less) changes the dimmed strip at the Hall's top, so it is not done.

## Looks

`node tools/heroes-still/shots.mjs <label>` at 393x852: the Hall at its top and scrolled to its heroes, before and after
(`docs/samples/heroes-still-light-{before,after}-{hall,hall-heroes}-393.png`), show no pixel that differs noticeably. `test/hall-light.test.ts` keeps both
changes in place.
