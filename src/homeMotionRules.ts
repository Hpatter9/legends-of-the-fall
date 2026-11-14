// RELEASE-AUDIT (docs/notes/release-audit-code.md): which of the home screen's painted scenes move, kept free of the DOM so a test can read
// it; `home.ts` asks it after every redraw and whenever a page is put up over the home screen or taken down.
//
// - Only the scene of the tab showing moves (the camp on Battle, the tavern on Heroes, the summoning hall on Recruit, the library on
//   Spells, the courtyard on Castle).
// - None moves under a page over the whole home screen: Settings, or the achievements, codex or armies page. Their veil is 97% opaque,
//   so a scene drawing sixty pictures a second under one could not be seen (the camp under Settings cost the page four times the work of
//   Settings itself on a throttled phone).
// - The camp and the tavern hold still under a hero sheet too, the courtyard under a building card (as before).
// - A pull in flight in the hall is never cut short: the hall is stopped only on another tab, or under a page with no pull showing.

export interface HomeLook {
  tab: 'recruit' | 'heroes' | 'battle' | 'castle' | 'spells';
  /** A hero sheet (or the roster, a quest log) is up over the tabs. */
  sheet: boolean;
  /** Settings, or the achievements, codex or armies page, is up over the whole home screen. */
  covered: boolean;
  /** The summoning (a pull) is showing on the Recruit tab. */
  pulling: boolean;
  /** A building's card is open on the Castle tab. */
  card: boolean;
  /** The Castle is open to this save. */
  castleOpen: boolean;
}

/** For each scene: move it, stop it, or (the hall only) leave it as it is. */
export type Motion = 'move' | 'stop' | 'keep';

export function homeMotion(l: HomeLook): { camp: Motion; tavern: Motion; hall: Motion; library: Motion; castle: Motion } {
  const free = !l.sheet && !l.covered;
  return {
    camp: l.tab === 'battle' && free ? 'move' : 'stop',
    tavern: l.tab === 'heroes' && free ? 'move' : 'stop',
    hall: l.tab === 'recruit' && !l.pulling && !l.covered ? 'move' : l.tab !== 'recruit' || (!l.pulling && l.covered) ? 'stop' : 'keep',
    library: l.tab === 'spells' && !l.covered ? 'move' : 'stop',
    castle: l.tab === 'castle' && !l.card && !l.covered && l.castleOpen ? 'move' : 'stop',
  };
}
