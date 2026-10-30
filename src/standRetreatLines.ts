// The words of the Last Stand's retreat (STAND-RETREAT): the banner as a room is given up, and the ruler's line on the title card of the next
// room, now and then with an aside from Duchess. Some lines name a hero still standing (`heroName`): `{hero}`. The picks come from a side
// stream of the run's seed and the act, so a run tells its own story the same way each time it is watched. Words only: no Pixi, no DOM.

import { heroName } from './sim/heroNames';
import { mixSeed, Rng } from './sim/rng';
import { actOfHall, ROOM_NAMES } from './sim/standActs';
import type { HallKind } from './sim/standHalls';

/** The banner as the guard gives a room up: "The courtyard is lost. Fall back to the library!" */
export const lostLine = (from: HallKind, to: HallKind): { head: string; line: string } => {
  const the = ROOM_NAMES[from].the;
  return { head: `${the[0].toUpperCase()}${the.slice(1)} is lost`, line: `Fall back to ${ROOM_NAMES[to].the}!` };
};

/** What the ruler says as the guard comes into each room (act II to IV), plain and naming a hero still standing. */
export const ROOM_LINES: Record<'library' | 'chapel' | 'hall', { plain: readonly string[]; named: readonly string[] }> = {
  library: {
    plain: [
      'Bar the doors with the histories. They have kept worse things out.',
      'Among the old books, then. Let them learn how this chapter ends.',
      'Mind the candles. I will not have the archive burn before we do.',
      'The courtyard is theirs. Every shelf in here will cost them dearly.',
    ],
    named: [
      '{hero}, hold the stacks. Our forefathers wrote their oaths in these.',
      'Well fought in the courtyard, {hero}. Now do it again among the books.',
      '{hero}, guard the reading room. I have not finished my chronicle.',
    ],
  },
  chapel: {
    plain: [
      'Into the chapel. If the saints are listening, now would be a fine time.',
      'Light the last candles. The dead of this house will watch us stand.',
      'Hallowed stone, at least. Let them choke on the incense.',
      'Kneel later. For now, set your backs to the altar and hold.',
    ],
    named: [
      '{hero}, say a prayer if you know one, and swing hard if you do not.',
      '{hero} still stands. The chapel has seen worse miracles.',
      'Guard the nave, {hero}. The bells will ring for us, one way or another.',
    ],
  },
  hall: {
    plain: [
      'The throne room. There is nowhere further. Here we hold, or here we fall.',
      'My father died on these steps. I shall not trouble the stonemason twice.',
      'Close the great doors behind us. No one leaves this hall but the victors.',
      'Let them come to the throne, then. They will find it occupied.',
    ],
    named: [
      '{hero}, stand at my right hand. Whatever comes, we meet it together.',
      'If this is the end, {hero}, I am glad it is you beside the throne.',
      '{hero}, there is no more falling back. Make every blow count.',
    ],
  },
};

/** Duchess's asides as the guard falls back (now and then, after the ruler's line). */
export const DUCHESS_RETREAT: readonly string[] = ['Mehh. (She has brought the cabbage.)', 'Mehhh! (Duchess does not care for the stairs.)', 'Meh. (She is first through the door.)'];

/** How often a line names a hero (when one stands), and how often Duchess adds her aside. */
const NAMED_CHANCE = 0.5;
const DUCHESS_CHANCE = 0.25;

/** The ruler's line for coming into room `to`, from the run's `seed`, naming one of `standing` (hero kinds) now and then; and Duchess's aside, if she has one. */
export function roomLine(seed: number, to: HallKind, standing: readonly string[]): { line: string; duchess: string | null } {
  if (to === 'courtyard') return { line: '', duchess: null };
  const rng = new Rng(mixSeed(seed, 0x7e7e, actOfHall(to)));
  const set = ROOM_LINES[to];
  const named = standing.length > 0 && rng.chance(NAMED_CHANCE);
  const line = named ? rng.pick(set.named).replace('{hero}', heroName(standing[rng.int(0, standing.length - 1)])) : rng.pick(set.plain);
  return { line, duchess: rng.chance(DUCHESS_CHANCE) ? rng.pick(DUCHESS_RETREAT) : null };
}
