// Saves for the Nemesis War's phase 2 screenshots (`tools/nemesis/shots2.mjs`, docs/samples/nemesis-2/): a save past the Beast Packs with
// a full Dark Council (Gorrak as warchief, four captains, eight lieutenants sworn under them, two blood-oaths), its News, its Fallen and a
// Warchief's Head, nine War Trophies and the Muster open; and a Muster run on its last wave, Gorrak at the head of the Orc Warband's band.

import { startedMeta } from '../../src/sim/meta';
import { recruit } from '../../src/sim/run';
import { HEROES } from '../../src/sim/units';
import { SCENES } from '../../src/sim/sceneScripts';
import { newWar, type Nemesis, type NewsKind } from '../../src/sim/nemesis';
import { swear } from '../../src/sim/council';
import { startMuster } from '../../src/sim/muster';
import { xpFor } from '../../src/sim/levels';

const nem = (id: number, o: Partial<Nemesis> & Pick<Nemesis, 'base' | 'army' | 'name' | 'epithet' | 'rank'>): Nemesis => ({ id, loyalty: 60, might: 1, scars: 0, traits: [], weak: [], known: [], memory: [], met: 1, lost: 0, born: 0, ...o });

/** Today's key, as the page counts it (so the day's first visit has had its turn and the shots show this save as it is). */
const today = (): number => {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

export function meta() {
  const m = startedMeta(7);
  m.unlocked = [...HEROES, 'paladin', 'cleric', 'warlock'];
  m.party = ['knight', 'samurai', 'archer', 'wizard', 'cleric'];
  for (const k of m.party) m.xp[k] = xpFor(30);
  m.crowns = 2400;
  m.bestStage = 14;
  m.scenes = Object.keys(SCENES);
  m.heroesSeen = [...m.unlocked];
  m.featuresTold = ['autoMerge', 'autoPlace'];
  m.armies.orcs = { waves: 15, best: 15, won: 15, clears: 4, stars: {}, met: { '0': 7 }, first: 1 };
  m.armies.undead = { waves: 15, best: 15, won: 15, clears: 2, stars: {}, met: { '0': 1 }, first: 1 };
  m.armies.beasts = { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: { '0': 1 }, first: 1 };
  m.armySeen = ['orcs', 'undead', 'beasts', 'wildwood'];
  m.opened = ['orcs', 'undead', 'beasts', 'wildwood'];
  const war = newWar();
  war.members.push(
    nem(1, { base: 'eliteGorrak', army: 'orcs', name: 'Gorrak', epithet: 'the Headsman', rank: 'warchief', might: 6, scars: 1, traits: ['executioner', 'scarred'], weak: ['dread:samurai'], known: ['executioner', 'dread:samurai'], mark: 'executioner', memory: ['Took the Warchief’s seat of the Dark Council', 'Beat Throg in a feud', 'Slew Kwame and Ravi · Orc Warband · Hard · wave 13'], met: 5, loyalty: 70 }),
    nem(2, { base: 'lichKing', army: 'undead', name: 'Morrow', epithet: 'the Unburnt', rank: 'captain', boss: true, might: 4, scars: 1, traits: ['fireproof', 'bane:arcane'], weak: ['dread:knight'], known: ['fireproof', 'dread:knight'], mark: 'fireproof', memory: ['Slew Ravi the Wizard · Undead Legion · Hard · wave 15'], met: 4 }),
    nem(3, { base: 'eliteYsolde', army: 'beasts', name: 'Ysolde', epithet: 'the Quick Knife', rank: 'captain', might: 3, traits: ['ambusher'], weak: ['dread:archer'], known: ['ambusher'], mark: 'ambusher', memory: ['Rose to captain of the Dark Council', 'Recruited to the Dark Council · Beast Packs'], met: 1 }),
    nem(4, { base: 'orcBrute', army: 'orcs', name: 'Throg', epithet: 'of the High Ground', rank: 'captain', might: 3, traits: ['hillKing'], weak: ['dread:archer'], known: ['hillKing', 'dread:archer'], mark: 'hillKing', memory: ['Beaten by Gorrak in a feud', 'Slew Kwame the Knight · Orc Warband · Normal · wave 9'], oath: 6 }),
    nem(5, { base: 'eliteHollow', army: 'undead', name: 'Sister Ash', epithet: 'the Scarred', rank: 'captain', might: 3, traits: ['scarred'], weak: ['dread:wizard'], known: [], mark: 'scarred', memory: ['Recruited to the Dark Council · Undead Legion'] }),
    nem(6, { base: 'boneVolley', army: 'undead', name: 'Hask', epithet: 'Pincushion', rank: 'lieutenant', might: 2, traits: ['arrowCatcher', 'ambusher'], weak: ['dread:wizard'], known: ['arrowCatcher', 'dread:wizard'], mark: 'arrowCatcher', memory: ['Swore a blood-oath with Throg', 'Slew Natsu the Archer · Undead Legion · Normal · wave 6'], oath: 4, loyalty: 42 }),
    nem(7, { base: 'spearman', army: 'undead', name: 'Old Hollin', epithet: 'the Scarred', rank: 'lieutenant', might: 3, traits: ['scarred'], weak: ['dread:samurai'], known: ['scarred'], mark: 'scarred', loyalty: 24 }),
    nem(8, { base: 'orcArcher', army: 'orcs', name: 'Ratbag', epithet: 'the Quick Knife', rank: 'lieutenant', might: 1, traits: ['ambusher'], weak: ['dread:knight'], known: ['ambusher'], mark: 'ambusher', vengeful: 'knight', memory: ['Swore vengeance on Kwame for Nob'] }),
    nem(9, { base: 'packRed', army: 'beasts', name: 'Ember-Eye', epithet: 'the Uncaught', rank: 'lieutenant', might: 2, traits: ['elusive'], weak: ['dread:wizard'], known: ['elusive', 'dread:wizard'], mark: 'elusive', oath: 10 }),
    nem(10, { base: 'wolfWhite', army: 'beasts', name: 'Greymaw', epithet: 'the Lone', rank: 'lieutenant', might: 1, traits: ['loneWolf'], weak: ['dread:cleric'], known: [], mark: 'loneWolf', oath: 9 }),
    nem(11, { base: 'orcGrunt', army: 'orcs', name: 'Mukk', epithet: 'Bane of warriors', rank: 'lieutenant', might: 2, traits: ['bane:martial'], weak: ['dread:samurai'], known: ['bane:martial'], mark: 'bane:martial' }),
    nem(12, { base: 'skeleton', army: 'undead', name: 'Wick', epithet: 'the Headsman', rank: 'lieutenant', might: 1, traits: ['executioner'], weak: ['dread:knight'], known: [] }),
    nem(13, { base: 'orcArcher', army: 'orcs', name: 'Gristle', epithet: 'the Healer-hunter', rank: 'lieutenant', might: 1, traits: ['healerHunter'], weak: ['dread:archer'], known: ['healerHunter'] }),
  );
  war.nextId = 20;
  war.turn = 47;
  war.musterSince = 2;
  war.trophies = 9;
  war.day = { key: today(), turns: 1, visit: true };
  swear(war);
  const news: [number, NewsKind, string][] = [
    [47, 'feud', 'Gorrak beat Throg'],
    [47, 'oath', 'Throg, of the High Ground and Hask, Pincushion swear a blood-oath'],
    [46, 'slain', 'Nob the Cruel, captain, is slain by Kwame'],
    [46, 'oath', 'Ratbag, the Quick Knife swears vengeance on Kwame for Nob'],
    [46, 'promotion', 'Ysolde, the Quick Knife rises to captain'],
    [45, 'recruit', 'Gristle, the Healer-hunter joins the Council as a lieutenant (Orc Warband)'],
    [44, 'betrayal', 'Wick plots against Sister Ash, and is caught; Wick is slain'],
    [43, 'crowned', 'Gorrak, the Headsman takes the Warchief’s seat'],
    [42, 'claim', 'Gorrak, the Headsman claims the Warchief’s seat'],
    [41, 'slain', 'Grashnak, the Orc Warlord, warchief, is slain by Kenji at the Muster'],
    [40, 'feast', 'Morrow the Unburnt holds a feast for 2 lieutenants'],
    [39, 'trial', 'Old Hollin challenges Morrow to a Trial of Strength and loses'],
    [38, 'named', 'Hask, Pincushion is named a lieutenant: it slew a hero'],
  ];
  war.news = news.map(([turn, kind, text]) => ({ turn, kind, text }));
  war.fallen = [
    { id: 18, name: 'Nob', epithet: 'the Cruel', base: 'orcBrute', army: 'orcs', rank: 'captain', might: 3, by: 'knight', how: 'slain', tier: 1, turn: 46 },
    { id: 17, name: 'Wick', epithet: '', base: 'skeleton', army: 'undead', rank: 'lieutenant', might: 1, by: '', how: 'council', foe: 'Sister Ash, the Scarred', tier: 0, turn: 44 },
    { id: 16, name: 'Grashnak', epithet: 'the Orc Warlord', base: 'orcWarlord', army: 'orcs', rank: 'warchief', might: 5, by: 'samurai', how: 'muster', tier: 0, turn: 41 },
    { id: 15, name: 'Pell', epithet: 'Kwame’s Bane', base: 'orcGrunt', army: 'orcs', rank: 'lieutenant', might: 2, by: 'archer', how: 'slain', tier: 0, turn: 30 },
  ];
  war.heads = [{ name: 'Grashnak, the Orc Warlord', base: 'orcWarlord', army: 'orcs', might: 5, turn: 41 }];
  m.war = war;
  return m;
}

/** The Muster, on its last wave: Gorrak at the head of the Orc Warband's last band. */
export function muster(stage = 3) {
  const m = meta();
  const r = startMuster(m, m.party, 11)!;
  r.stage = stage;
  for (const k of m.party) r.squad.push(recruit(r, k).id);
  r.gold = 60;
  return r;
}
