// What the heroes' and foes' skills lay (STATUS-FX, docs/notes/status-fx.md, section 3): by the skill's name, what each foe a cast
// struck is left with. `powered` (`abilities.ts`) hands every cast here with the events it made; each foe the caster itself hit
// once or more takes the rider once. Only with the ailments on. The older riders stay where they were (the Fire Wizard's
// Cinders, the crits' bleeds, the Hex's curse, the Lich King's Soul Nova...), moved into the model (`ailments.ts`).
//
// The one balance table for the new sources: each rider's length and strength is here.

import type { Battle, BattleEvent, Unit } from './battle';
import { AILMENT_SWITCH, bleedFor, burnFor, fearFor, shockFor, silenceFor, weakFor } from './ailments';

type Rider = (b: Battle, me: Unit, to: Unit) => void;

const burn: Rider = (b, me, to) => burnFor(b, me, to);
const shock: Rider = (b, me, to) => shockFor(b, me, to);
const bleed = (share: number): Rider => (b, me, to) => bleedFor(b, me, to, share);
const silence = (ms: number): Rider => (b, me, to) => silenceFor(b, to, ms, me);
const fear = (ms: number): Rider => (b, me, to) => fearFor(b, to, ms, me);
const weak = (ms: number): Rider => (b, me, to) => weakFor(b, to, ms, me);

/** Each skill's rider, by the skill's name. */
export const SKILL_RIDERS: Readonly<Record<string, Rider>> = {
  // fire burns
  'Flask Toss': burn,
  'Powder Keg': burn,
  'Forge Hammer': burn,
  // lightning shocks
  'Chain Lightning': shock,
  Thunderstorm: shock,
  'Voltage Blink': shock,
  'Thunder Cascade': shock,
  // blades bleed
  Whirlwind: bleed(0.08),
  Bloodlust: bleed(0.08),
  'Shadow Step': bleed(0.06),
  'Shadow Dance': bleed(0.06),
  'Hellblade Sweep': bleed(0.08),
  // the songs and judgements weaken, the bullets and palms silence, the reapers and roars frighten
  Dirge: weak(3000),
  Condemn: weak(4000),
  'Suppressing Fire': silence(2000),
  'Stillness Palm': silence(2000),
  Pilfer: silence(1500),
  'Harvest of Souls': fear(700),
  'Full Moon': fear(1200),
  'Reign of Terror': fear(1500),
  'Kanabo Smash': fear(1000),
};

/** After a cast: every foe the caster struck takes the skill's rider (once). */
export function skillRiders(b: Battle, me: Unit, name: string, out: BattleEvent[], from: number): void {
  if (!AILMENT_SWITCH.on) return;
  const rider = SKILL_RIDERS[name];
  if (!rider) return;
  const hit = new Set<number>();
  for (let i = from; i < out.length; i++) {
    const e = out[i];
    if (e.kind === 'hit' && e.by === me.id && !hit.has(e.to)) hit.add(e.to);
  }
  for (const id of hit) {
    const f = b.units.find((x) => x.id === id);
    if (f && f.alive && f.side !== me.side) rider(b, me, f);
  }
}
