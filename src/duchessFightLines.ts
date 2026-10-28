// Duchess's lines in the rare fight she joins (DUCHESS-FIGHTS, `sim/duchessFight.ts`): only "Mehh." and "Nom." in their variations, with the
// house's asides in brackets, as her other lines (`DUCHESS_LINES` in `quipData.ts`). The writer's copy is `duchess_fights` in
// `docs/lines/new-lines.json` (`test/duchess-fights.test.ts` holds the two together). Words only: no DOM.

export const DUCHESS_FIGHT_LINES = {
  /** On her card as she joins. */
  joins: ['Mehh.', 'Mehh. (Make way.)', 'Mehh! (Her Grace will see to this.)', 'Mehh. (Hold my hay.)', 'Meh-heh. (Stand aside.)'],
  /** Over her as she headbutts. */
  headbutt: ['MEHH!', 'Mehh! (Out of my meadow.)', 'MEEEHH!', 'Mehh! (Mind the horns.)', 'MEHH! (Manners.)'],
  /** Over her as she eats a foe's shield. */
  nom: ['Nom.', 'Nom nom.', 'Nom. (Shield-flavoured.)', 'Nom nom nom. (Rivets.)', 'Nom. (Needs mustard.)'],
  /** Over her when the fight is won with her standing. */
  won: ['Mehh. (Naturally.)', 'Mehh. (You are welcome.)', 'Meh-heh-heh.', 'Mehh. (Hay, now.)', 'Nom. (Victory snack.)'],
} as const;

export type DuchessFightLine = keyof typeof DUCHESS_FIGHT_LINES;
