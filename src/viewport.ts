// The game is a phone-width column: a wide desktop window shows it centred (see the body rule in index.html).

/** The widest the column gets, in CSS px. */
export const MAX_COL = 480;

/** The width of the column the game fills. */
export const viewW = (): number => Math.min(innerWidth, MAX_COL);

/** The height of the column the game fills. */
export const viewH = (): number => innerHeight;

/** How far the column sits from the window's left edge (0 on a phone), for turning pointer and box positions into column positions. */
export const colLeft = (): number => Math.max(0, (innerWidth - MAX_COL) / 2);
