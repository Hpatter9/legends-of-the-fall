// Relics: team-wide passives that last the rest of a run, found in events, chests and the merchant's stall. A run holds
// them by id (`run.relics`); `relicEffects` folds them into one set of numbers the fight start reads. Hp and attack
// go into the heroes' boost, the rest become a team bonus like a trait's, and three hooks are the battle's own
// (`first`: the foes stand still that long at the start; `revive`: one fallen hero rises once per fight).
//
// Pure rules: no Pixi, no DOM, no randomness.

import type { TraitEffects } from './traits';

export interface Relic {
  id: string;
  name: string;
  /** What it does, in plain words. */
  text: string;
  effects: RelicEffects;
  /** A legendary relic: only the mystery floors give it (never a shop, chest or drop), and it is worth a price. */
  great?: boolean;
}

/** What a set of relics gives. Multipliers are x1 when absent. */
export interface RelicEffects extends TraitEffects {
  /** The foes wait this many ms at the start of a fight. */
  first?: number;
  /** One hero that falls rises again at half health, once a fight. */
  revive?: boolean;
  /** Extra gold for each win. */
  gold?: number;
}

export const RELICS: Record<string, Relic> = {
  whetstone: { id: 'whetstone', name: 'Whetstone', text: '+8% attack for every hero', effects: { atk: 1.08 } },
  banner: { id: 'banner', name: 'Banner', text: '+10% hp for every hero', effects: { hp: 1.1 } },
  hourglass: { id: 'hourglass', name: 'Hourglass', text: "the king's mana fills 25% faster", effects: { mana: 1.25 } },
  warDrum: { id: 'warDrum', name: 'War Drum', text: 'the heroes strike first: the foes wait 1 second', effects: { first: 1000 } },
  luckyCoin: { id: 'luckyCoin', name: 'Lucky Coin', text: '+12 gold for every win', effects: { gold: 12 } },
  phoenix: { id: 'phoenix', name: 'Phoenix Feather', text: 'one fallen hero rises at half health, once a fight', effects: { revive: true } },
  ironShield: { id: 'ironShield', name: 'Iron Shield', text: 'heroes take 6% less damage', effects: { guard: 0.06 } },
  featherCharm: { id: 'featherCharm', name: 'Feather Charm', text: 'heroes slip 6% of blows', effects: { dodge: 0.06 } },
  hawkEye: { id: 'hawkEye', name: 'Hawk Eye', text: '+8% crit chance for every hero', effects: { crit: 0.08 } },
  swiftBoots: { id: 'swiftBoots', name: 'Swift Boots', text: 'heroes act and walk 6% faster', effects: { speed: 1.06 } },
  scholarScroll: { id: 'scholarScroll', name: "Scholar's Scroll", text: 'skills charge 20% faster', effects: { charge: 1.2 } },
  spyglass: { id: 'spyglass', name: 'Spyglass', text: 'shooters reach further from high ground', effects: { reach: 0.3 } },
  // (the legendary ones: from the tower's cursed altar only, so the ordinary draws are as they were)
  sunCrown: { id: 'sunCrown', name: 'Sun Crown', text: 'LEGENDARY: +14% attack and +14% hp for every hero', effects: { atk: 1.14, hp: 1.14 }, great: true },
  dragonHeart: { id: 'dragonHeart', name: 'Dragon Heart', text: 'LEGENDARY: +12% hp, and heroes take 12% less damage', effects: { hp: 1.12, guard: 0.12 }, great: true },
  stormRing: { id: 'stormRing', name: 'Storm Ring', text: 'LEGENDARY: heroes act and walk 14% faster, +10% crit', effects: { speed: 1.14, crit: 0.1 }, great: true },
  voidLens: { id: 'voidLens', name: 'Void Lens', text: "LEGENDARY: skills charge 40% faster, and the king's mana fills 40% faster", effects: { charge: 1.4, mana: 1.4 }, great: true },
};
/** The ordinary relics (what shops, chests and drops draw from). */
export const RELIC_IDS = Object.keys(RELICS).filter((id) => !RELICS[id].great);
/** The legendary relics. */
export const GREAT_RELIC_IDS = Object.keys(RELICS).filter((id) => RELICS[id].great);

/** The sum of a set of relics: multipliers multiply, shares and times add, `revive` is any. Unknown ids are skipped. */
export function relicEffects(ids: readonly string[] = []): RelicEffects {
  const out: RelicEffects = {};
  for (const id of new Set(ids)) {
    const fx = RELICS[id]?.effects;
    if (!fx) continue;
    for (const k of ['atk', 'hp', 'mana', 'charge', 'speed'] as const) if (fx[k]) out[k] = (out[k] ?? 1) * fx[k]!;
    for (const k of ['guard', 'dodge', 'crit', 'reach', 'first', 'gold'] as const) if (fx[k]) out[k] = (out[k] ?? 0) + fx[k]!;
    if (fx.revive) out.revive = true;
  }
  return out;
}

/** A team bonus with a relics' one folded in, the same way (so the battle reads the one set). */
export function mergeEffects(a: TraitEffects, b: TraitEffects): TraitEffects {
  const out: TraitEffects = { ...a };
  for (const k of ['atk', 'hp', 'mana', 'charge', 'speed'] as const) if (b[k]) out[k] = (out[k] ?? 1) * b[k]!;
  for (const k of ['guard', 'dodge', 'crit', 'reach'] as const) if (b[k]) out[k] = (out[k] ?? 0) + b[k]!;
  return out;
}
