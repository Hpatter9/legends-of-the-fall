// The game is a phone-width column: a wide desktop window shows it centred (see the body rule in index.html).
//
// WAVE-DELAY (docs/notes/wave-delay.md): the window's size is read once and again when the window says it has changed, not each time it
// is asked for. Reading `innerWidth` makes the browser lay the whole page out afresh whenever anything on it has been written since,
// and the fight's camera asks every frame, after the hero rows have been written: that one read was a quarter of a fight's script time
// on a phone.

/** The widest the column gets, in CSS px. */
export const MAX_COL = 480;

let w = 0;
let h = 0;
function read(): void {
  w = innerWidth;
  h = innerHeight;
}
if (typeof window !== 'undefined') {
  read();
  for (const ev of ['resize', 'orientationchange', 'pageshow']) window.addEventListener(ev, read);
  window.visualViewport?.addEventListener('resize', read);
}

/** The width of the column the game fills. */
export const viewW = (): number => Math.min(w, MAX_COL);

/** The height of the column the game fills. */
export const viewH = (): number => h;

/** How far the column sits from the window's left edge (0 on a phone), for turning pointer and box positions into column positions. */
export const colLeft = (): number => Math.max(0, (w - MAX_COL) / 2);
