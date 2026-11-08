// Rules of a quest battle's own (QUESTS-3, Q5, `docs/notes/quests-design.md` section 4): protect, survive, race, spare and the mutators.
// Quest battles only: an army, the daily, the Last Stand and the Calamity never set `Battle.rules`, so their fights play out tick for
// tick as they did (a test holds an army run identical). Pure rules: no Pixi, no DOM, no random numbers (the guest stands where the
// duchess would, and the rest is the fight's own).
//
// - **protect**: a guest (one of the `guest*` units, or Duchess, or the standard) fights on the heroes' side under the AI; the fight is
//   lost the moment it falls. It never counts as one of the party (it is a `summon`).
// - **survive** (seconds): there is no boss to fell; the fight is won when the clock runs out with a hero still standing.
// - **race** (seconds): the foes must all fall within the time, or the fight is lost.
// - **spare** (a foe's kind): that foe must not fall (a loss if it does); the fight is won when every other foe has fallen.
// - **mutators**: `hasten` (foes move and strike faster by that share), `noHeal` (no healing for the heroes), `noHearts` (the run has no
//   heart to spend: a lost wave ends the try) and `purse` (the start gold times this).

import { addUnit, type Battle, type BattleEvent, type Unit } from './battle';
import { duchessSpot } from './duchessFight';

export interface QuestRules {
  /** A guest to keep alive: its unit kind, and its health as a share of the kind's own (missing is 1). */
  protect?: { kind: string; hp?: number };
  /** Won when this many seconds have passed with a hero standing. */
  survive?: number;
  /** Lost unless every foe has fallen within this many seconds. */
  race?: number;
  /** A foe kind that must not fall. */
  spare?: string;
  /** Foes' speed times 1 plus this. */
  hasten?: number;
  /** The heroes cannot be healed. */
  noHeal?: boolean;
  /** The run has no hearts. */
  noHearts?: boolean;
  /** The start purse times this (a smaller start). */
  purse?: number;
}

/** What a rule's fight is told as it is made: the mutators that change the board's boosts. Called by `startBattle`. */
export function applyRules(b: Battle, rules: QuestRules): void {
  b.rules = rules;
  if (rules.hasten) b.foeSpeed = (b.foeSpeed ?? 1) * (1 + rules.hasten);
  if (rules.noHeal) b.heroHeal = 0;
}

/** The guest joins as the fight begins (the protect rule): added beside the heroes, with its own unit id kept in `Battle.guard`. */
export function joinGuest(b: Battle): Unit | null {
  const kind = b.rules?.protect?.kind;
  if (!kind || b.guard !== undefined) return null;
  const at = duchessSpot(b);
  if (!at) return null;
  const me = addUnit(b, kind, at.u, at.v, { hp: b.rules!.protect!.hp ?? 1 });
  b.guard = me.id;
  return me;
}

/** The units a spare rule protects (every foe of that kind on the field), by id: found when the fight starts. */
export function spareIds(b: Battle): number[] {
  const kind = b.rules?.spare;
  return kind ? b.units.filter((x) => x.alive && x.side === 'foe' && x.def === kind).map((x) => x.id) : [];
}

/**
 * The end of a fight under a quest battle's rules: 'won', 'lost' or null (the fight goes on, and the usual end test, a side with none
 * left or the time limit, applies as it always did). `heroes` is whether a real hero is standing.
 */
export function ruleEnd(b: Battle, heroes: boolean): 'won' | 'lost' | null {
  const r = b.rules;
  if (!r) return null;
  if (b.guard !== undefined && !b.units.some((x) => x.id === b.guard && x.alive)) return 'lost';
  const spared = b.spared ?? [];
  if (b.units.some((x) => spared.includes(x.id) && !x.alive)) return 'lost';
  if (r.survive !== undefined) {
    if (!heroes) return 'lost';
    return b.t >= r.survive * 1000 ? 'won' : null;
  }
  if (r.race !== undefined && b.t >= r.race * 1000 && b.units.some((x) => x.alive && x.side === 'foe' && !spared.includes(x.id))) return 'lost';
  if (spared.length && heroes && !b.units.some((x) => x.alive && x.side === 'foe' && !spared.includes(x.id))) return 'won';
  return null;
}

/** Push the end of a fight that a rule decided. */
export function endBy(b: Battle, end: 'won' | 'lost', out: BattleEvent[]): void {
  b.phase = end;
  b.pending = [];
  out.push({ kind: 'end', won: end === 'won' });
}

/** A battle's rules in words, for the party screen's line ("Keep The Carter alive · hold out for 90 seconds"). */
export function rulesWords(r: QuestRules | undefined, guestName?: (kind: string) => string): string[] {
  if (!r) return [];
  const out: string[] = [];
  if (r.protect) out.push(`Keep ${guestName?.(r.protect.kind) ?? 'the guest'} alive`);
  if (r.survive !== undefined) out.push(`Hold out for ${r.survive} seconds`);
  if (r.race !== undefined) out.push(`Win within ${r.race} seconds`);
  if (r.spare) out.push('One foe must be spared');
  if (r.hasten) out.push('The foes are hasted');
  if (r.noHeal) out.push('No healing');
  if (r.noHearts) out.push('No hearts');
  return out;
}
