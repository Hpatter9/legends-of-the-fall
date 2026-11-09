// The codex's page for each hold (phase 3, `docs/notes/assault-3.md`; the design's phase 3): one page an army, in the army's order. A hold
// that is built has its name, its lord, its defences counted from its blueprint, what the player has done there, and how it is won; one
// not built yet (phase 4) is a locked line that names its army only. The codex page draws these (`codexView.ts`, the Holds tab, open once
// the Assault is).
//
// Pure rules: no Pixi, no DOM. It reads the blueprints themselves, not the engine, so the codex page does not load the Assault's fighters.

import { ARMIES, bossOf } from '../armies';
import type { Meta } from '../meta';
import { warchiefOf } from '../muster';
import { fullName } from '../nemesis';
import { UNITS } from '../units';
import type { Blueprint } from './blueprint';
import { BLOODTUSK } from './maps/orcs';

/** The holds built so far, by army. */
const BUILT: Readonly<Record<string, Blueprint>> = { [BLOODTUSK.army]: BLOODTUSK };

/** How each built hold is won, in a few lines (its tips). */
export const HOLD_TIPS: Readonly<Record<string, readonly string[]>> = {
  orcs: [
    'Silence the three war drums: while one beats, the garrison near it strikes harder.',
    'The Iron Gate is the strongest structure on the map: the trebuchet\'s volley, the ram or a sapper\'s keg breaks it quicker than blades.',
    'Three volleys, or one keg, on a stretch of the stone wall bring it down to a ramp any platoon can climb.',
    'Hold the Warpath camp, or burn every tent of it, and no more bands march down to the hold.',
    'A Vain captain at the Iron Gate calls out a champion: send your strongest hero, or refuse and face him Mocking.',
  ],
};

export interface HoldPage {
  army: string;
  /** The army's name (its card's). */
  armyName: string;
  built: boolean;
  /** The hold's name (built), else a locked line. */
  name: string;
  /** What the player has done there: not yet stormed, stormed so often, conquered. */
  record: string;
  /** The facts: the lord, the defenders, the gates, the drums. */
  facts: string[];
  tips: readonly string[];
}

const count = (roster: string): number => roster.replace(/\s/g, '').length;
/** A blueprint's defenders: those at its posts (every letter of every roster), and the bands down the Warpath. */
export const defendersOf = (bp: Blueprint): { posted: number; bands: number } => ({ posted: bp.posts.reduce((n, p) => n + count(p.roster), 0), bands: bp.reinforce.bands * count(bp.reinforce.roster) });

/** Every army's hold page, in the army's order. */
export function holdPages(m: Meta): HoldPage[] {
  const a = m.assault;
  const chief = warchiefOf(m.war);
  return ARMIES.map((army) => {
    const bp = BUILT[army.id];
    const armyName = army.name;
    if (!bp) return { army: army.id, armyName, built: false, name: 'A hold not yet found', record: `The ${armyName.replace(/^The /, '')} keep their stronghold hidden for now.`, facts: [], tips: [] };
    const tries = a?.tries[army.id] ?? 0;
    const won = a?.conquered[army.id];
    const record = won ? `Conquered${won.wins > 1 ? `, and taken ${won.wins} times` : ''} in ${tries} assault${tries === 1 ? '' : 's'}` : tries ? `Stormed ${tries} time${tries === 1 ? '' : 's'}; it still stands` : 'Not yet stormed';
    const gates = bp.stamps.filter((s) => s.kind === 'gate').map((s) => (s as { name: string }).name);
    const drums = bp.stamps.filter((s) => s.kind === 'drum').length;
    const lord = chief ? `${fullName(chief)}, Warchief of the Dark Council, holds its throne` : `Its own lord, the ${UNITS[bossOf(army)]?.name ?? 'army\'s last boss'}, holds its throne while no warchief sits`;
    const d = defendersOf(bp);
    return {
      army: army.id,
      armyName,
      built: true,
      name: bp.name,
      record,
      facts: [lord, `${d.posted + d.bands} defenders: ${d.posted} at ${bp.posts.length} posts, and ${d.bands} more down the Warpath until it is held or burnt`, `Its gates: ${gates.join(', ')}`, `${drums} war drums`],
      tips: HOLD_TIPS[army.id] ?? [],
    };
  });
}
