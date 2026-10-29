// The short card after a wave (WAVE-RECAP): the wave's result in a heading, its pay in one line, and only the moments worth
// a glance as one-liners (a level gained, gear found, a hero fallen, a heart burned). The detail (the performance table,
// each hero's XP) waits for the end of the battle's full recap (`recapView.ts`, from `run.recap`). Pure rules: no Pixi, no DOM.

import { ULT_LEVEL } from './abilities';
import { heroName } from './heroNames';
import { otherFinds, type WaveGain } from './waveGains';

/** What a wave left worth saying, gathered when it is settled. */
export interface WaveMoments {
  /** Levels reached, fighters and bench alike (kind, from, to). */
  ups: readonly { kind: string; from: number; to: number }[];
  /** Hero kinds on the field that ended the fight down (a won wave's fallen). */
  fell: readonly string[];
  /** Hearts burned in the wave, and how many are left after. */
  hearts: number;
  heartsLeft: number;
  /** Gear and prizes picked up (the run's `found`). */
  found: readonly string[];
  /** Everything the wave brought in, grouped (RECAP-REVEAL, `waveGains.ts`): the card lists them as chips, and a `found` line they
   *  already cover is dropped. Missing (an older caller): every `found` line is kept. */
  gains?: readonly WaveGain[];
}

/** One line on the card, with its kind (the line's mark and colour). */
export interface WaveNote {
  kind: 'level' | 'ult' | 'found' | 'fell' | 'heart';
  text: string;
}

const nameOf = (k: string) => heroName(k);

/** Names, with a count for a kind named more than once ("Archer ×2"). */
function names(kinds: readonly string[]): string {
  const n = new Map<string, number>();
  for (const k of kinds) n.set(k, (n.get(k) ?? 0) + 1);
  return [...n].map(([k, c]) => `${nameOf(k)}${c > 1 ? ` ×${c}` : ''}`).join(', ');
}

/** The heading: "Wave 4 of 15 won", "Wave 6 of 10 lost", "Stage 7 won" (an endless run has no end to count to). */
export function waveHeadline(wave: number, of: number | null, won: boolean): string {
  return `${of ? `Wave ${wave} of ${of}` : `Stage ${wave}`} ${won ? 'won' : 'lost'}`;
}

/** The notable moments, most cheering first; none at all for a quiet wave. */
export function waveNotes(m: WaveMoments): WaveNote[] {
  const out: WaveNote[] = [];
  // (one line for every level gained, the highest level each kind reached)
  const best = new Map<string, number>();
  for (const u of m.ups) best.set(u.kind, Math.max(best.get(u.kind) ?? 0, u.to));
  if (best.size) out.push({ kind: 'level', text: `Level up: ${[...best].map(([k, lv]) => `${nameOf(k)} Lv ${lv}`).join(', ')}` });
  const ult = [...new Set(m.ups.filter((u) => u.from < ULT_LEVEL && u.to >= ULT_LEVEL).map((u) => u.kind))];
  if (ult.length) out.push({ kind: 'ult', text: `Ultimate unlocked: ${names(ult)}` });
  for (const f of m.gains ? otherFinds(m.found, m.gains) : m.found) out.push({ kind: 'found', text: `Found ${f}` });
  if (m.fell.length) out.push({ kind: 'fell', text: `Fell: ${names(m.fell)}` });
  if (m.hearts > 0) out.push({ kind: 'heart', text: `${m.hearts > 1 ? `${m.hearts} hearts` : 'A heart'} burned · ${m.heartsLeft} left` });
  return out;
}

/** The heading of a spire floor's or a Calamity fight's short card (WAVE-RECAP-2): "Floor 12 cleared", "Act 2 cleared!", "Spot cleared",
 *  "Map 3 cleared!", or the fall ("Fell on floor 12", "The party falls"). `act` is the act or map whose boss has just fallen. */
export function towerHeadline(kind: 'spire' | 'calamity' | 'expedition', floor: number, won: boolean, act?: number): string {
  if (!won) return kind === 'spire' ? `Fell on floor ${floor}` : 'The party falls';
  // (a Rift Sanctuary expedition is told in regions and crossings, CAL-SANCTUARY)
  if (act !== undefined) return `${kind === 'spire' ? 'Act' : kind === 'expedition' ? 'Region' : 'Map'} ${act} cleared!`;
  return kind === 'spire' ? `Floor ${floor} cleared` : kind === 'expedition' ? 'Crossing made' : 'Spot cleared';
}
