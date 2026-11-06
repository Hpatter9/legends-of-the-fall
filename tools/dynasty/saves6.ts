// Saves for Dynasties' phase 6 screenshots (`tools/dynasty/shots6.mjs`, docs/samples/dynasty-6/): phase 5's save (seasons opened 20 days
// ago, twelve Houses at every stage) taken on. Kwame, the Elder, has passed the mantle to Ama, his and Minh's heir (generation II, the
// birthright Harvest Hands, his sword an heirloom, a Blood Grudge on the orc who slew Minh), and sits at the Elders' table; Kofi, passed
// over, is the cadet line. Ravi's heir with Rhys is trained and waiting; Kenji's with Ayame is in training; Karim may name one; Selam
// mentors in the Hall from before. The Kitsune's elder sits at the table too. An Orc Warband run on wave 2 shows Ama on the board.

import { meta as meta5, run as run5 } from './saves5';
import { xpFor } from '../../src/sim/levels';
import { nameHeir, passMantle } from '../../src/sim/heirs';
import { equipItem, grantEquipment } from '../../src/sim/equipment';
import { newWar } from '../../src/sim/nemesis';

const DAY = 86_400_000;
const key = (d: Date): number => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
const daysAgo = (n: number): number => key(new Date(Date.now() - n * DAY));

export function meta() {
  const m = meta5();
  m.unlocked = [...m.unlocked, 'kunoichi'].filter((k, i, a) => a.indexOf(k) === i);
  m.heroesSeen = [...m.unlocked];
  for (const k of ['wizard', 'wanderer', 'paladin', 'kunoichi']) m.xp[k] = xpFor(72);
  m.xp.samurai = xpFor(68);
  m.bonds = { ...m.bonds, 'knight|peasant': 320, 'knight|paladin': 130, 'wanderer|wizard': 150, 'kunoichi|samurai': 140, 'kitsune|karasu': 0 };
  const d = m.dynasty!;
  d.lines.wizard.bearers[0].served = 8;
  // (a living orc of the War slew Minh twice: Ama's Blood Grudge)
  m.war = newWar();
  m.war.members.push({ id: 7, base: 'orcBrute', army: 'orcs', name: 'Gash', epithet: 'Minh’s Bane', rank: 'captain', loyalty: 60, might: 3, scars: 1, traits: ['slew'], weak: [], known: [], memory: ['Slew Minh · the Orc Warband, wave 9'], met: 3, lost: 0, born: 1 });
  m.war.nextId = 8;
  m.grudges = { peasant: { '7': 2 } };
  // (Kwame's sword, worn: the heirloom)
  const sword = grantEquipment(m, { base: 'ironSword', rarity: 4, level: 12 });
  equipItem(m, 'knight', sword.id);
  m.castle.hall = 2;
  const t0 = Date.now() - 9 * DAY;
  nameHeir(m, 'knight', 'peasant', t0, daysAgo(9));
  passMantle(m, 'knight', { pick: 0, honour: 'regular', heirloom: sword.id }, t0 + 7 * DAY, daysAgo(2));
  d.lines.knight.bearers[d.lines.knight.current].served = 0;
  // (Ravi's heir with Rhys, trained; Kenji's with Ayame, three days in)
  nameHeir(m, 'wizard', 'wanderer', Date.now() - 8 * DAY, daysAgo(8));
  nameHeir(m, 'samurai', 'kunoichi', Date.now() - 3 * DAY, daysAgo(3));
  // (the Kitsune's elder has passed on before, and sits at the table too)
  const kl = d.lines.kitsune;
  kl.bearers[0].fate = 'regular';
  kl.bearers.push({ name: 'Akari', gen: 2, served: 1, parents: ['Kohaku', 'Kurogane'], partner: 'karasu', look: 'dusk', birthright: 'karasu' });
  kl.current = 1;
  d.regulars = ['knight', 'kitsune'];
  // (for the shots: Kwame's honour can be changed now)
  d.lines.knight.bearers[0].honourAt = Date.now() - DAY;
  delete d.scenes;
  delete d.heirNote;
  return m;
}

/** The save with Kwame fielded in Ama's place (the banner). */
export function elderMeta() {
  const m = meta();
  m.dynasty!.lines.knight.field = 0;
  return m;
}

export const run = run5;
