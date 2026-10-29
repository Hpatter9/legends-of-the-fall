// The king's spells' own sounds: which rendered file plays for each spell, and when (pure: no Web Audio, no DOM, so the
// tests can check it). Every spell has two: its cast (`cast-<id>`, a king's whoomp and a shimmer in the spell's element,
// as the spell goes off) and its effect (`fx-<id>`, what the spell does, timed to its look). The meteor's effect is
// timed to its fall, each meteor of the shower has a fall of its own, and Chain Lightning's leaps each zap.
//
// The files are rendered offline by tools/spell-sfx/ (`docs/notes/spell-sfx.md`); `spellBank.ts` loads them and `sound.ts`
// plays them on the effects bus. Until they are decoded (or where a browser cannot decode them) the old synthesised cues
// play instead: each part carries its `fallback`, and `coveredBySpells` only applies once the files are in.

import type { Battle, BattleEvent } from '../sim/battle';
import { SPELLS, type SpellId } from '../sim/spells';
import { panOfTile } from './audioRules';
import { spellCues, type Cued } from './soundRules';
import { SPELL_SFX_FILES, type SpellSfxId } from './spellSfxManifest';

type SpellEvent = Extract<BattleEvent, { kind: 'spell' }>;

/** One sound of a spell: its file, `delay` ms after the spell's event (battle time: the page divides by the fight's
 *  speed), its level and pan, and the synthesised cues that stand in when the file cannot play. */
export interface SpellPart {
  file: SpellSfxId;
  delay: number;
  gain: number;
  pan: number;
  role: 'cast' | 'effect';
  fallback: Cued[];
}

/** When each spell's effect starts, ms after its event. Most land with the cast's whoomp (`WHOOMP_MS`), as the spell's look
 *  bursts; a few are set by their own look: a lance and a chain strike at once, a quake's shake begins at once, the wolves
 *  howl as they rise. (Meteor and Meteor Shower are timed by their falls instead, from the `area` events.) */
export const EFFECT_DELAY: Record<SpellId, number> = {
  heal: 70, shield: 60, smite: 40, chain: 0, poison: 70, frost: 40, rally: 70, quake: 0, resurrect: 80, cleanse: 60,
  blink: 0, hex: 70, lance: 0, renewal: 70, deepfreeze: 50, warcry: 70, bulwark: 60, wolves: 100, haste: 40,
  meteor: 0, starfall: 0,
};

/** When the cast's whoomp falls (ms into its file). */
export const WHOOMP_MS = Math.round((SPELL_SFX_FILES['cast-heal'].whoomp ?? 0) * 1000);
/** A chain's leaps zap this far apart (ms): the arcs are drawn together, so the zaps run along them like the bolt's path. */
export const HOP_MS = 75;

/** The levels, on top of the effects bus. The files are mastered by loudness (casts a little under the effects); the king's
 *  spells sit a little above a hero's blow, the player's big moments, and the master's limiter holds the stack. */
export const CAST_GAIN = 0.85;
export const EFFECT_GAIN = 1.15;
export const STAR_GAIN = 1;
export const HOP_GAIN = 0.85;

/** Every file a spell can play (the loader fetches these). */
export const SPELL_FILES = Object.keys(SPELL_SFX_FILES) as SpellSfxId[];

/** The cast and effect files for a spell. */
export const castOf = (id: SpellId): SpellSfxId => `cast-${id}`;
export const effectOf = (id: SpellId): SpellSfxId => `fx-${id}`;

/** How far into a file its falling thing lands (ms). */
const impactMs = (file: SpellSfxId): number => Math.round(((SPELL_SFX_FILES[file] as { impact?: number }).impact ?? 0) * 1000);

/** The king's meteors in a tick: the `area` events the king (unit 0) sent with this cast. */
const kingFalls = (events: BattleEvent[]) => events.filter((x): x is Extract<BattleEvent, { kind: 'area' }> => x.kind === 'area' && x.by === 0);

/** The sounds a king's spell makes: its cast, its effect, and for the falls and the leaps, one each. `events` is the
 *  tick's whole list (the spell's falls and arcs come with it). */
export function spellParts(b: Battle, e: SpellEvent, events: BattleEvent[]): SpellPart[] {
  const all = SPELLS[e.id].target === 'all';
  const pan = all ? 0 : panOfTile(e.u, e.v);
  // (the old cues stand in for the cast and the effect together; a meteor's stand in for its fall)
  const falls = e.id === 'meteor' || e.id === 'starfall';
  const parts: SpellPart[] = [{ file: castOf(e.id), delay: 0, gain: CAST_GAIN, pan, role: 'cast', fallback: e.id === 'meteor' ? [] : spellCues(e.id) }];
  if (falls) {
    const file: SpellSfxId = e.id === 'meteor' ? 'fx-meteor' : 'fx-star';
    if (e.id === 'starfall') parts.push({ file: 'fx-starfall', delay: 0, gain: EFFECT_GAIN, pan, role: 'effect', fallback: [] });
    for (const f of kingFalls(events)) {
      parts.push({
        file,
        delay: Math.max(0, f.ms - impactMs(file)),
        gain: e.id === 'meteor' ? EFFECT_GAIN : STAR_GAIN,
        pan: panOfTile(f.u, f.v),
        role: 'effect',
        fallback: [{ cue: 'meteorFall', delay: Math.max(0, f.ms - 850) }, { cue: 'fireBoom', delay: f.ms, gain: 1.5 }, { cue: 'thunder', delay: f.ms + 60, gain: 0.8 }],
      });
    }
    return parts;
  }
  parts.push({ file: effectOf(e.id), delay: EFFECT_DELAY[e.id], gain: EFFECT_GAIN, pan, role: 'effect', fallback: [] });
  if (e.id === 'chain') {
    const unit = (id: number) => b.units.find((x) => x.id === id);
    kingArcs(events).forEach((a, i) => {
      const to = unit(a.to);
      parts.push({ file: 'fx-chain-hop', delay: HOP_MS * (i + 1), gain: HOP_GAIN, pan: to ? panOfTile(to.u, to.v) : pan, role: 'effect', fallback: [{ cue: 'crackle', delay: HOP_MS * (i + 1) }] });
    });
  }
  return parts;
}

/** A chain's leaps: the arcs that are not an ailment's spark. */
const kingArcs = (events: BattleEvent[]) => events.filter((x): x is Extract<BattleEvent, { kind: 'arc' }> => x.kind === 'arc' && !x.ail);

/** The events in a tick whose plain cues a king's spell's own sound stands in for, so the two do not double: the king's
 *  meteors (their fall and boom are the spell's), a heal spell's mends, a chain's leaps and a blink's leap. Empty when no
 *  spell was cast this tick. */
export function coveredBySpells(events: BattleEvent[]): Set<BattleEvent> {
  const out = new Set<BattleEvent>();
  const cast = new Set(events.flatMap((x) => (x.kind === 'spell' ? [x.id] : [])));
  if (!cast.size) return out;
  for (const x of events) {
    if (x.kind === 'area' && x.by === 0) out.add(x);
    // (the spell's own mends have no healer, or the hero itself: a cleanse's; a hero's heal from another stays)
    else if (x.kind === 'heal' && (x.by === undefined || x.by === x.to) && (cast.has('heal') || cast.has('resurrect') || cast.has('cleanse'))) out.add(x);
    else if (x.kind === 'arc' && !x.ail && cast.has('chain')) out.add(x);
    else if (x.kind === 'blink' && cast.has('blink')) out.add(x);
  }
  return out;
}
