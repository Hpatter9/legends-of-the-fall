// Saves for NEMESIS-DEPTH's screenshots (`tools/nemesis/shotsDepth.mjs`, docs/samples/nemesis-depth/): phase 3's full Dark Council, now with
// temperaments on every seat, remembered fights, an epithet grown, a hunt set on Morrow the Unburnt and War Trophies to set another. And an
// Undead run on Hask's wave, Hask (a Schemer, who never calls a champion out) now remembering the Volley
// Natsu put into him at the graveyard, for the taunt cut-in.

import { meta as base, run as baseRun } from './saves3';
import type { Temper } from '../../src/sim/nemesisTemper';

const TEMPERS: Record<number, Temper> = { 1: 'glory', 2: 'veteran', 3: 'coward', 4: 'brute', 5: 'zealot', 6: 'schemer', 7: 'schemer', 8: 'oathbound', 9: 'brute', 10: 'schemer', 11: 'zealot', 12: 'trickster', 13: 'glory' };

export function meta() {
  const m = base();
  const war = m.war!;
  for (const n of war.members) n.temper = TEMPERS[n.id] ?? 'brute';
  const morrow = war.members.find((n) => n.id === 2)!;
  morrow.met = 5;
  morrow.moments = [
    { k: 'brink', hero: 'knight', land: 'graveyard', wave: 15 },
    { k: 'element', what: 'fire', land: 'graveyard', wave: 12 },
    { k: 'skill', hero: 'paladin', what: 'Holy Smite', land: 'ruins', wave: 9 },
  ];
  morrow.was = ['the Pale'];
  morrow.epithet = 'the Unburnt';
  war.hunt = { id: 2, army: 'undead', at: war.turn };
  war.trophies = 5;
  const hask = war.members.find((n) => n.id === 6)!;
  hask.moments = [{ k: 'skill', hero: 'archer', what: 'Volley', land: 'graveyard', wave: 9 }];
  delete hask.trophies;
  delete hask.shamed;
  delete hask.vengeful;
  hask.met = 3;
  war.news.unshift({ turn: war.turn, kind: 'hunt', text: 'You set a hunt on Morrow the Unburnt' });
  return m;
}

export function run(stage = 5) {
  const r = baseRun(stage);
  const m = meta();
  const hask = m.war!.members.find((n) => n.id === 6)!;
  const s = r.nemesis!.members.find((x) => x.id === 6)!;
  delete s.trophies;
  delete s.shamed;
  delete s.vengeful;
  s.moments = hask.moments;
  s.temper = hask.temper;
  s.met = hask.met;
  s.seen = true;
  return r;
}
