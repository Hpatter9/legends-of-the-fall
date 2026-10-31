// STATUS-FX: fingerprints of whole fights, for the proof that moving the old effects (the damage over time, the holds, slows and
// curses) into the one ailment model changed nothing (`test/ailments-identical.test.ts`). Each scenario plays seeded fights of a
// mode and folds every tick's events (through `battleTap`) and the fighters' health at each fight's end into one hash. With the
// new ailments switched off (`AILMENT_SWITCH.on = false`) every hash must equal the one recorded on main before the change
// (`test/fixtures/ailment-logs.json`). Fields and events the model adds (an event's `ail`, the `ailment`, `immune` and `shatter`
// events) are left out of the hash, so only what the old game did is compared.
//   node tools/status-fx/logs.mjs            print the hashes
//   node tools/status-fx/logs.mjs --write    record them as the fixture (only on main's code, before the change)

import { battleTap, fight, place, startBattle, stepBattle, type Battle, type BattleEvent } from '../../src/sim/battle';
import { BOSS_BANDS, FIELD_BANDS } from '../../src/sim/foes';
import { gradeBoost, stageBoost } from '../../src/sim/run';
import { mixSeed, Rng } from '../../src/sim/rng';
import { castSpell, MANA_MAX, SPELL_IDS, type SpellId } from '../../src/sim/spells';
import { startedMeta } from '../../src/sim/meta';
import { newCastle } from '../../src/sim/castle';
import { deploySpots, fieldBoost, pickTeam, play } from '../heroSweep';
import { botSpells, legacyCalamity, playArmy, playCalamity, playDaily, playTower, savedAt } from '../autoplay';
import { playStand, setupAtLevel } from '../stand-balance';
import type { Area } from '../../src/sim/board';

/** Keys and event kinds the ailment model adds: not part of the old game's fingerprint. */
const NEW_KEYS = new Set(['ail']);
const NEW_KINDS = new Set(['ailment', 'immune', 'shatter']);

let h = 0x811c9dc5;
const feed = (s: string) => {
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
};
const canon = (e: BattleEvent): string => {
  const o = e as unknown as Record<string, unknown>;
  return Object.keys(o)
    .filter((k) => !NEW_KEYS.has(k) && o[k] !== undefined)
    .sort()
    .map((k) => `${k}=${JSON.stringify(o[k])}`)
    .join(',');
};
battleTap.fn = (b: Battle, events: BattleEvent[]) => {
  feed(`t${b.t}`);
  for (const e of events) if (!NEW_KINDS.has(e.kind)) feed(canon(e));
  if (b.phase !== 'fight') feed(b.units.map((u) => `${u.def}:${u.alive ? Math.round(u.hp) : 'x'}`).join(';'));
};

/** A level-30 team against `band`, with `cast` (a king's spell at a foe's tile 3 s in) and a land. */
function custom(seed: number, band: string | readonly string[], stage: number, level: number, cast?: SpellId, area?: Area): void {
  const b = startBattle(seed, band, { ...stageBoost(stage), ...(area ? { area } : {}) });
  const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a)));
  pickTeam(new Rng(mixSeed(seed, 0x7ea4))).forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, gradeBoost(1, 0, level)));
  fight(b);
  let cast2 = cast;
  while (b.phase === 'fight') {
    if (cast2 && b.t >= 3000) {
      const foe = b.units.find((x) => x.alive && x.side === 'foe');
      const hero = b.units.find((x) => x.alive && x.side === 'hero');
      const at = cast2 === 'cleanse' || cast2 === 'heal' || cast2 === 'shield' || cast2 === 'renewal' || cast2 === 'blink' ? hero : foe;
      b.spells.mana = MANA_MAX;
      if (at) castSpell(b, cast2, at.u, at.v);
      cast2 = undefined;
    }
    stepBattle(b);
  }
}

const ARMY_BANDS: Record<string, string[]> = {
  undead: ['lichKing', 'boneVolley', 'skeleton', 'spearman', 'boneCaptain'],
  golems: ['forgeTitan', 'magmaGolem', 'crystalGolem', 'ironGolem', 'stoneGolem'],
  infernal: ['devilLeader', 'hellImp', 'hellDemon', 'hellImp', 'hellDemon'],
  yokai: ['nineTails', 'yokaiWitch', 'yokaiSeer', 'yokaiFox', 'yokaiMonk'],
  elites: ['eliteNyssa', 'eliteCindra', 'calBoss5', 'sapphireColossus', 'oniKing'],
  beasts: ['alphaWolf', 'packBlack', 'packRed', 'gorgonQueen', 'mazeMino1'],
};

/** Every scenario: its name and how it plays. */
export const SCENARIOS: Record<string, () => void> = {
  field1: () => {
    for (let g = 0; g < 80; g++) play(g + 1, FIELD_BANDS[g % FIELD_BANDS.length], fieldBoost(5), pickTeam(new Rng(mixSeed(g + 1, 0x7ea4))), 1, 1);
  },
  field30: () => {
    for (let g = 0; g < 80; g++) play(g + 101, FIELD_BANDS[g % FIELD_BANDS.length], fieldBoost(78), pickTeam(new Rng(mixSeed(g + 101, 0x7ea4))), 1, 30);
  },
  bosses: () => BOSS_BANDS.forEach((band, i) => custom(200 + i, band, 15, 30)),
  armyFoes: () => Object.values(ARMY_BANDS).forEach((band, i) => [1, 30].forEach((level) => custom(300 + i, band, level === 1 ? 4 : 40, level))),
  spells: () => SPELL_IDS.forEach((id, i) => custom(400 + i, FIELD_BANDS[i % FIELD_BANDS.length], 20, 30, id)),
  lands: () => (['volcano', 'swamp', 'snow', 'forge', 'oasis'] as Area[]).forEach((area, i) => custom(500 + i, FIELD_BANDS[i], 10, 10, undefined, area)),
  army: () => {
    playArmy(savedAt(30, ['knight', 'paladin', 'archer', 'warlock', 'cleric'], 1), 'undead', 11, ['knight', 'paladin', 'archer', 'warlock', 'cleric']);
    playArmy(savedAt(60, ['wizard', 'samurai', 'ranger', 'shambler', 'priestess'], 2), 'infernal', 12, ['wizard', 'samurai', 'ranger', 'shambler', 'priestess']);
    playArmy(savedAt(70, ['lightningMage', 'kraken', 'mummy', 'mercenary', 'timeWitch'], 3), 'golems', 13, ['lightningMage', 'kraken', 'mummy', 'mercenary', 'timeWitch']);
    playArmy(savedAt(65, ['reaper', 'tyrant', 'rifleBot', 'wolfBard', 'dragoon'], 4), 'yokai', 14, ['reaper', 'tyrant', 'rifleBot', 'wolfBard', 'dragoon']);
  },
  daily: () => playDaily(startedMeta(3), 20260115),
  tower: () => playTower(startedMeta(4), 13, undefined, newCastle(), 6),
  stand: () => playStand(setupAtLevel(30), mixSeed(1, 0x57a0), undefined, 6),
  // (recorded before the Rift Sanctuary rebuilt the Calamity: the proof plays a calamity of the shape saved then, which still loads and plays as it did)
  calamity: () => playCalamity(startedMeta(5), 21, 'wizard', newCastle(), 0, legacyCalamity),
};

/** Play every scenario and give each one's hash. The greedy players cast no spells here (SPELLS-RETUNE turned the balance tools' spells on by
 *  default; the fixture was recorded by a player that never cast, and this proof is about the fights, not the bot). */
export function scenarioHashes(only?: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const was = botSpells.on;
  botSpells.on = false;
  try {
    for (const [name, run] of Object.entries(SCENARIOS)) {
      if (only && !only.includes(name)) continue;
      h = 0x811c9dc5;
      run();
      out[name] = h.toString(16).padStart(8, '0');
    }
  } finally {
    botSpells.on = was;
  }
  return out;
}
