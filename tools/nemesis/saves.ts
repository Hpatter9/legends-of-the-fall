// Saves for the Nemesis War's screenshots (`tools/nemesis/shots.mjs`, docs/samples/nemesis-1/): a save past the Undead Legion with a Council of
// three captains and five lieutenants, every scene seen, and an Undead run whose fifth wave holds a lieutenant and whose fifteenth Morrow.

import { startedMeta } from '../../src/sim/meta';
import { armyRun, recruit } from '../../src/sim/run';
import { HEROES } from '../../src/sim/units';
import { SCENES } from '../../src/sim/sceneScripts';
import { newWar, type Nemesis } from '../../src/sim/nemesis';
import { xpFor } from '../../src/sim/levels';

const nem = (id: number, o: Partial<Nemesis> & Pick<Nemesis, 'base' | 'army' | 'name' | 'epithet' | 'rank'>): Nemesis => ({ id, loyalty: 60, might: 1, scars: 0, traits: [], weak: [], known: [], memory: [], met: 1, lost: 0, born: 0, ...o });

export function meta() {
  const m = startedMeta(7);
  m.unlocked = [...HEROES, 'paladin', 'cleric', 'warlock'];
  m.party = ['knight', 'samurai', 'archer', 'wizard', 'cleric'];
  for (const k of m.party) m.xp[k] = xpFor(24);
  m.crowns = 2400;
  m.bestStage = 14;
  m.scenes = Object.keys(SCENES);
  m.heroesSeen = [...m.unlocked];
  m.featuresTold = ['autoMerge', 'autoPlace'];
  m.armies.orcs = { waves: 15, best: 15, won: 15, clears: 3, stars: {}, met: { '0': 7 }, first: 1 };
  m.armies.undead = { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: { '0': 1 }, first: 1 };
  m.armySeen = ['orcs', 'undead', 'beasts'];
  const war = newWar();
  war.members.push(
    nem(1, { base: 'lichKing', army: 'undead', name: 'Morrow', epithet: 'the Unburnt', rank: 'captain', boss: true, might: 4, scars: 1, traits: ['fireproof', 'bane:arcane', 'spellScorned'], weak: ['dread:knight', 'fears:frost'], known: ['fireproof', 'bane:arcane', 'dread:knight'], mark: 'fireproof', memory: ['Slew Ravi the Wizard · Undead Legion · Hard · wave 15', 'Escaped the heroes · Undead Legion · Normal · wave 15', 'Maimed Kwame the Knight · Undead Legion · Normal · wave 15'], met: 4 }),
    nem(2, { base: 'orcWarlord', army: 'orcs', name: 'Gash', epithet: "Selam's Bane", rank: 'captain', boss: true, might: 3, traits: ['bane:devout', 'executioner'], weak: ['dread:samurai'], known: ['bane:devout', 'dread:samurai'], mark: 'bane:devout', memory: ['Slew Selam the Cleric · Orc Warband · Normal · wave 15'], met: 3 }),
    nem(3, { base: 'boneCaptain', army: 'undead', name: 'Sister Ash', epithet: 'the Healer-hunter', rank: 'captain', boss: true, might: 2, traits: ['healerHunter'], weak: ['dread:archer'], known: ['healerHunter', 'dread:archer'], mark: 'healerHunter', memory: ['Slew Selam the Cleric · Undead Legion · Normal · wave 8'], met: 2 }),
    nem(4, { base: 'boneVolley', army: 'undead', name: 'Hask', epithet: 'Pincushion', rank: 'lieutenant', might: 2, traits: ['arrowCatcher', 'ambusher'], weak: ['dread:wizard'], known: ['arrowCatcher', 'dread:wizard'], mark: 'arrowCatcher', memory: ['Slew Natsu the Archer · Undead Legion · Normal · wave 6'] }),
    nem(5, { base: 'orcBrute', army: 'orcs', name: 'Throg', epithet: 'of the High Ground', rank: 'lieutenant', might: 1, traits: ['hillKing'], weak: ['dread:archer'], known: ['hillKing', 'dread:archer'], mark: 'hillKing', memory: ['Slew Kwame the Knight · Orc Warband · Normal · wave 9'] }),
    nem(6, { base: 'spearman', army: 'undead', name: 'Old Hollin', epithet: 'the Scarred', rank: 'lieutenant', might: 1, traits: ['scarred'], weak: ['dread:samurai'], known: ['scarred', 'dread:samurai'], mark: 'scarred', memory: ['Slew Kenji the Samurai · Undead Legion · Normal · wave 11'] }),
    nem(7, { base: 'orcArcher', army: 'orcs', name: 'Ratbag', epithet: 'the Quick Knife', rank: 'lieutenant', might: 1, traits: ['ambusher'], weak: ['dread:knight'], known: ['ambusher'], mark: 'ambusher', memory: ['Slew Ravi the Wizard · Orc Warband · Normal · wave 4'] }),
    nem(8, { base: 'packRed', army: 'beasts', name: 'Ember-Eye', epithet: 'the Uncaught', rank: 'lieutenant', might: 1, traits: ['elusive'], weak: ['dread:wizard'], known: ['elusive', 'dread:wizard'], mark: 'elusive', memory: ['Escaped the heroes · Beast Packs · Normal · wave 7'] }),
  );
  war.nextId = 9;
  m.war = war;
  return m;
}

/** An Undead run on wave `stage` with its nemeses planned in: a lieutenant (Hask) on wave 5, Sister Ash on 8 and Morrow on 15. */
export function run(stage: number) {
  const r = armyRun(5, 'undead', ['knight', 'samurai', 'archer', 'wizard', 'cleric']);
  r.stage = stage;
  for (const k of ['knight', 'samurai', 'archer', 'wizard', 'cleric']) r.squad.push(recruit(r, k).id);
  r.gold = 40;
  const m = meta();
  const snap = (id: number) => {
    const n = m.war!.members.find((x) => x.id === id)!;
    return { id: n.id, base: n.base, name: n.name, epithet: n.epithet, rank: n.rank, ...(n.boss ? { boss: true as const } : {}), might: n.might, scars: n.scars, traits: [...n.traits], weak: [...n.weak] };
  };
  r.nemesis = { members: [snap(1), snap(3), snap(4)], waves: { '5': [4], '8': [3], '15': [1] } };
  return r;
}
