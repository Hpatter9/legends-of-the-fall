// The Last Hold and the War's end (phase 5 of the Assault, `docs/notes/assault-5.md`; the design's 1.4 and phase 5):
//
// - THE LAST HOLD. Whichever army's hold stands last (every other army's is conquered) is where the War ends. Its throne is the warchief's
//   last stand: he never flees it (there is nowhere left to ride), and every Council member left defends it, whatever army it was born to
//   and even those away licking their wounds: the mightiest at the posts' officers' places as in any hold, the rest at the throne beside him.
//   Its garrison's rank and file stand at `LAST_SHARE` of the hold's own share, so that the whole Council's weight keeps the fight on the
//   same targets at the hold's own mark (`npm run balance -- --assault <army> --last`).
// - THE WAR'S END. Its fall ends the Dark Council: the members slain on its walls die for good (as on any conquering attempt), the few who
//   lived are scattered as the seats burn, and the War is over (`War.end`). The Council takes no more turns, recruits no one, births no
//   nemeses; the War Trophies and the Spoils stay to spend. A scene plays at the camp (`warEndScene.ts`), and the War's record and the
//   hold's codex page say how it ended.
//
// Pure rules: no Pixi, no DOM, no randomness.

import { ARMIES, armyById, bossOf } from '../armies';
import type { Battle } from '../battle';
import { news } from '../council';
import type { Meta } from '../meta';
import { fullName, type Nemesis, type War, type WarEnd } from '../nemesis';
import { UNITS } from '../units';
import type { HoldState } from './holdTypes';
import { HOLDS } from './holds';
import { holdName } from './warAnswer';

/** Whether an army's hold is the Last Hold: it has a hold, it still stands, and every other army's hold has fallen. */
export function isLastHold(m: Pick<Meta, 'assault'>, army: string): boolean {
  const won = m.assault?.conquered ?? {};
  return !!HOLDS[army] && !won[army] && ARMIES.every((a) => a.id === army || !!won[a.id]);
}

/** Whether the War is over: its Last Hold has fallen. */
export const warOver = (war: War | undefined): boolean => !!war?.end;

/** The Council at the Last Hold: every member left but the warchief (he holds the throne), away or not, of any army. */
export const lastCouncil = (war: War | undefined): Nemesis[] => (war?.members ?? []).filter((n) => n.rank !== 'warchief');

/** The lord who held the Last Hold's throne, as the War's end remembers him: the warchief, else the member born the army's lord, else that
 *  lord, nameless. */
function chiefOf(b: Battle, h: HoldState): WarEnd['chief'] {
  const c = h.input.warchief;
  if (c) return { name: fullName(c), base: c.base, warchief: true };
  const s = h.input.council?.find((n) => n.id === b.field?.byId[h.lord]?.nem?.id);
  if (s) return { name: fullName(s), base: s.base, warchief: false };
  const base = b.field?.byId[h.lord]?.def ?? bossOf(armyById(h.input.army)!);
  return { name: UNITS[base]?.name ?? base, base, warchief: false };
}

/**
 * The Last Hold has fallen (`settleAssault`, after the War has settled the fight): the War ends. The Council's members slain there are
 * written into the ending (the War has struck them already), the rest are scattered and their seats burn, and the News says so. Returns the
 * News lines it wrote.
 */
export function endWar(m: Meta, b: Battle, h: HoldState, slainIds: readonly number[], day: number, tries: number): string[] {
  const war = m.war;
  if (!war || war.end) return [];
  const army = h.input.army;
  const hold = holdName(army);
  const here = [...(h.input.council ?? []), ...(h.input.warchief ? [h.input.warchief] : [])];
  const byMight = (a: { might: number; id: number }, b: { might: number; id: number }) => b.might - a.might || a.id - b.id;
  const slain = here.filter((n) => slainIds.includes(n.id)).sort(byMight).map(fullName);
  const scattered = [...war.members].sort(byMight).map(fullName);
  const chief = chiefOf(b, h);
  war.end = { day, turn: war.turn, army, chief, slain, scattered, tries };
  // (the seats burn: no one is left on the Council, no claim, no one away, no Muster to call)
  war.members = [];
  delete war.claim;
  delete war.away;
  war.musterSince = 0;
  const lines: string[] = [];
  const say = (text: string) => {
    news(war, 'conquest', text);
    lines.push(text);
  };
  say(`${hold} falls, the last hold standing. ${chief.name} made his last stand there${slain.length ? `, and ${slain.length} of the Council fell with him` : ''}`);
  if (scattered.length === 1) say(`${scattered[0]} lives through it, and is scattered to the wilds`);
  else if (scattered.length) say(`${scattered.length} of the Council live through it, and are scattered to the wilds`);
  say(`The Dark Council is broken. Its seats burn, and the War is over`);
  return lines;
}

/** The War's end in a line, for the War's record and the hold's codex page. */
export function endLine(end: WarEnd): string {
  const others = end.slain.filter((n) => n !== end.chief.name).length;
  return `The War ended at ${holdName(end.army)}, the Last Hold, in ${end.tries} assault${end.tries === 1 ? '' : 's'}: ${end.chief.name} fell on its throne${others ? ` with ${others} of the Council` : ''}`;
}
