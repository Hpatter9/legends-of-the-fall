// Saves for the Nemesis War's phase 3 screenshots (`tools/nemesis/shots3.mjs`, docs/samples/nemesis-3/): phase 2's full Dark Council with
// revenge on it. Morrow the Unburnt slew Kwame twice (a Grudge of two steps) and carries Kwame's kite shield as a trophy; Karim, Kwame's
// Sworn partner, is his Avenger. Ysolde was humiliated and is away licking her wounds; Hask cheated death and is Stitched, Vengeful against
// Natsu and wearing Natsu's sword. The News and the Fallen tell of fleeing, a humiliation, a Vengeance and a trophy brought home. And an
// Undead run on Hask's wave, for the taunt cut-in at the deploy and his name plate in the fight.

import { meta as base } from './saves2';
import { armyRun, recruit } from '../../src/sim/run';
import { bondKey } from '../../src/sim/bonds';
import { decorate } from '../../src/sim/revenge';
import { snapOf, type NewsKind } from '../../src/sim/nemesis';

export function meta() {
  const m = base();
  m.unlocked = [...new Set([...m.unlocked, 'paladin'])];
  m.party = ['knight', 'paladin', 'archer', 'wizard', 'cleric'];
  m.xp.paladin = m.xp.knight;
  m.equipment = [
    { id: 501, base: 'kiteShield', rarity: 3, level: 12 },
    { id: 502, base: 'ironSword', rarity: 2, level: 9 },
    { id: 503, base: 'runedBlade', rarity: 4, level: 14 },
  ];
  m.equipped = { knight: { off: 501 }, archer: { main: 502 }, samurai: { main: 503 } };
  m.nextItem = 600;
  m.bonds = { [bondKey('knight', 'paladin')]: 320, [bondKey('archer', 'ranger')]: 40 };
  const war = m.war!;
  const morrow = war.members.find((n) => n.id === 2)!;
  morrow.trophies = [{ kind: 'knight', slot: 'off', item: 501, base: 'kiteShield', rarity: 3 }];
  morrow.memory.unshift('Humiliated by Kwame, and took Kwame’s shield · Undead Legion');
  morrow.shamed = 'knight';
  morrow.scars = 2;
  const hask = war.members.find((n) => n.id === 6)!;
  hask.stitched = true;
  hask.vengeful = 'archer';
  hask.shamed = 'archer';
  hask.scars = 1;
  hask.trophies = [{ kind: 'archer', slot: 'main', item: 502, base: 'ironSword', rarity: 2 }];
  hask.memory.unshift('Humiliated by Natsu, and took Natsu’s weapon · Undead Legion', 'Dragged from the field, scarred · Undead Legion');
  war.away = { '3': 2 };
  m.grudges = { knight: { '2': 2 }, archer: { '6': 1 } };
  war.reclaimed = [503];
  const news: [number, NewsKind, string][] = [
    [48, 'vengeance', 'Vengeance: Kenji slays Nob the Cruel, who slew Hideo'],
    [48, 'reclaimed', 'Kenji’s weapon comes home from Nob the Cruel'],
    [48, 'fled', 'Ysolde, the Quick Knife breaks and runs from the field'],
    [48, 'humiliated', 'Ysolde, the Quick Knife is humiliated by Ravi; it slinks off to lick its wounds'],
    [47, 'cheated', 'Hask, Pincushion is dragged from the field and lives, scarred; humiliated by Natsu, and took Natsu’s weapon, it slinks off to lick its wounds'],
  ];
  war.news = [...news.map(([turn, kind, text]) => ({ turn, kind, text })), ...war.news].slice(0, 40);
  war.fallen[0] = { ...war.fallen[0], by: 'samurai', vengeance: true, reclaimed: 1 };
  return m;
}

/** An Undead run on Hask's wave (5), its nemeses planned in as the page plans them, and the five placed. */
export function run(stage = 5) {
  const m = meta();
  const party = ['knight', 'paladin', 'archer', 'wizard', 'cleric'];
  const r = armyRun(5, 'undead', party);
  r.stage = stage;
  for (const k of party) r.squad.push(recruit(r, k).id);
  r.gold = 40;
  const war = m.war!;
  const pick = (id: number) => decorate(m, snapOf(war.members.find((n) => n.id === id)!), war.members.find((n) => n.id === id)!);
  r.nemesis = { members: [pick(6), pick(2)], waves: { '5': [6], '15': [2] } };
  return r;
}
