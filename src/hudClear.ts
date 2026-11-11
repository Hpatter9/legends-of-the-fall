// COMBAT-HUD (docs/notes/combat-hud.md): the fight screen's fixed parts that a passing message (a toast, a quip's bubble) must not cover,
// and the lane under the top ones where a toast shows in a fight. The page only: it reads the DOM, never the battle.

/** HORN-CORNER (docs/notes/horn-corner.md): the War Horn in a fight, on the panel's top edge at the right (the board's bottom-right
 *  corner, its own since HUD-EVEN moved the tactic button to the upper right). */
export const HORN_CORNER = '#panel > .ehFight';

/** The fight's parts kept clear: the top bar, the spell row (orbs, Auto), the boss's bar, a twist's banner, the combo bar,
 *  the tactic button's plaque under the row at the right (HUD-EVEN), the War Horn over the hero rows, and the hero rows. */
export const FIGHT_HUD = ['#top', '#hudSpells', '#bossBar', '#twistBanner', '#comboBar', '#tacticBtn', HORN_CORNER, '#fightHud'];

/** The boxes of those parts that show now (none hidden or empty). */
export function hudBoxes(sels: readonly string[] = FIGHT_HUD): DOMRect[] {
  const out: DOMRect[] = [];
  // (every match, not the first: a toast fading out of the lane and the next coming in are both there for a moment, BOSS-BAR)
  for (const sel of sels)
    for (const e of document.querySelectorAll<HTMLElement>(sel)) {
      if (e.hidden || e.closest('[hidden]')) continue;
      const r = e.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none') out.push(r);
    }
  return out;
}

/** Where a toast's lane starts in a fight: just under the lowest of the top parts (the top bar, the spells, the boss's, twist's and combo
 *  bars, the tactic button's plaque). Undefined outside a fight, where the toast keeps its lane under the top bar. */
export function fightToastTop(): number | undefined {
  if (document.body.dataset.phase !== 'fight') return undefined;
  const half = innerHeight / 2;
  const tops = hudBoxes(['#top', '#hudSpells', '#bossBar', '#twistBanner', '#comboBar', '#tacticBtn']).filter((r) => r.top < half);
  return tops.length ? Math.max(...tops.map((r) => r.bottom)) + 6 : undefined;
}
