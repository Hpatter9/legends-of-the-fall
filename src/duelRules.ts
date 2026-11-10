// The Nemesis War, phase 4: a challenge's words and its cut-in (`docs/notes/nemesis-4.md`; the rules are `sim/duel.ts`). A wave that opens
// with a challenge plays the taunt cut-in once more (`tauntCut.ts`), the nemesis calling its hero out in its army's voice and the hero
// answering, then the challenge's card (`duelView.ts`): who calls out whom and why, what each outcome means, Accept and Refuse. Pure: no Pixi,
// no DOM.

import { DUEL_HEAL, DUEL_SHAMED, duelMs, type DuelOffer, type DuelWhy } from './sim/duel';
import { DUEL_LINES } from './sim/duelLines';
import { heroName } from './sim/heroNames';
import { fullName, MOCKING_ATK, type NemSnap } from './sim/nemesis';
import { REPLIES, VOICES, type Voice } from './sim/nemesisLines';
import { fill, type Taunt } from './tauntCutRules';
import { UNITS } from './sim/units';

const hash = (...xs: number[]): number => {
  let h = 0x811c9dc5;
  for (const x of xs) h = Math.imul(h ^ (x | 0), 0x01000193) >>> 0;
  return h;
};
const voiceOf = (army: string | undefined): Voice => (VOICES.includes(army as Voice) ? (army as Voice) : 'orcs');

/** The challenge's cut-in: the nemesis calls its hero out (or any champion), and the hero it names answers. It plays in full unless the
 *  cut-ins are off. */
export function duelTaunt(o: DuelOffer, s: NemSnap, seed: number): Taunt {
  const lines = DUEL_LINES[o.kind ? 'named' : 'open'][voiceOf(s.army)];
  const line = fill(lines[hash(seed, s.id, o.wave, 0xd0e1) % lines.length], { name: s.name, ...(o.kind ? { hero: heroName(o.kind) } : {}) });
  const reply = o.kind ? REPLIES[o.kind]?.[1] : undefined;
  return {
    id: s.id,
    base: s.base,
    name: fullName(s),
    rank: s.rank,
    might: s.might,
    scars: s.scars,
    trigger: 'meet',
    line,
    ...(o.kind ? { hero: o.kind } : {}),
    ...(reply ? { reply: fill(reply, { name: s.name }) } : {}),
    first: true,
    vain: s.weak.includes('vain'),
  };
}

const SMALL = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** DUEL-SHOW: the ring's clock in words ("sixty seconds", "two minutes", "two and a half minutes"; else "2:15"). */
export function clockWords(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s === 60) return 'sixty seconds';
  if (s < 60) return `${s} seconds`;
  const m = Math.floor(s / 60);
  const name = SMALL[m] ?? String(m);
  if (s % 60 === 0) return m === 1 ? 'a minute' : `${name} minutes`;
  if (s % 60 === 30) return m === 1 ? 'a minute and a half' : `${name} and a half minutes`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** Why it challenges, in words. */
const WHY: Readonly<Record<DuelWhy, (hero: string) => string>> = {
  vengeful: (h) => `It swore vengeance on ${h}`,
  grudge: (h) => `${h} bears a Grudge on it`,
  dread: (h) => `It dreads ${h}, and means to be rid of the fear`,
  vain: () => 'It is Vain, and must be seen to win',
};

/** The challenge card's words: its title, why, and what each answer means. */
export function duelWords(o: DuelOffer, s: NemSnap): { title: string; why: string; win: string; lose: string; time: string; refuse: string } {
  const hero = o.kind ? heroName(o.kind) : 'your champion';
  return {
    title: o.kind ? `${s.name} challenges ${hero}` : `${s.name} calls out your champion`,
    why: WHY[o.why](hero),
    win: `It is slain for good${s.rank === 'warchief' ? ' (a warchief is humiliated, and flees to his Muster)' : ''}, its wave breaks and runs and the wave is won, every hero heals ${DUEL_HEAL * 100}%, and it pays double`,
    lose: `${o.kind ? hero : 'Your champion'} falls and stands again at half; it gains a Might and fights the wave with its escorts`,
    time: `After ${clockWords(duelMs())} it slips away a Might stronger (humiliated if under ${DUEL_SHAMED * 100}% health); the wave fights on without it`,
    refuse: `The wave is fought as usual, and it is Mocking: +${MOCKING_ATK * 100}% attack for the rest of the run`,
  };
}

/** The champion's line in the card's strip ("Kwame · Knight"). */
export const championWords = (kind: string): string => `${heroName(kind)} · ${UNITS[kind]?.name ?? kind}`;

/** The duel's bar over the fight: the nemesis's name and the seconds left ("Morrow the Unburnt · 0:42"). */
export function duelBar(name: string, msLeft: number): string {
  const s = Math.max(0, Math.ceil(msLeft / 1000));
  return `${name} · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The wave card's line for a challenge the next wave will open with ("Ahead: Hask, Pincushion will call Natsu out to single combat"). */
export const duelAhead = (o: DuelOffer, s: NemSnap): string => `Ahead: ${fullName(s)} will call ${o.kind ? heroName(o.kind) : 'your champion'} out to single combat`;
