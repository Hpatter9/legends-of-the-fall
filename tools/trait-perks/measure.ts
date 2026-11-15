// TRAIT-PERKS (`docs/notes/trait-perks.md`): what each trait's tiers are worth. For each trait and each tier, a party that reaches it (the
// trait's heroes, filled to five with heroes of other traits) plays the same seeded fights three ways: with only that trait's perks on,
// with no perk at all (the lift is against this), and with the traits as they were before the perks (`TRAIT_PERKS.on` false: "vs old"). The fights are the hero table's (`tools/heroSweep.ts`:
// every band in turn, the land's traps laid, the king's starting spells cast by Auto), at the stage where the
// party without perks wins nearest half its fights, so a lift reads as points of win rate. The target (the design): a top tier +8 to +15,
// none above +20 nor below +6; a first tier +1 to +4.
//
//   node tools/trait-perks/run.mjs                  every trait, every tier (GAMES fights a cell, default 300)
//   node tools/trait-perks/run.mjs undead,holy      only these traits
//   GAMES=200 LEVEL=30 TIERS=3 node tools/trait-perks/run.mjs     more fights, heroes at level 30 (their ultimates open), the top tier only
import '../joint/off';
import '../tactics/off';
import { sweepLevel } from '../living-fields/switch';
import { deploySpots, fieldBoost, sweepBoost, SWEEP } from '../heroSweep';
import { fight, place, startBattle, stepBattle } from '../../src/sim/battle';
import { mixSeed, Rng } from '../../src/sim/rng';
import { STARTER_SPELLS } from '../../src/sim/spells';
import { FIELD_BANDS } from '../../src/sim/foes';
import { isMythic } from '../../src/sim/mythicRules';
import { TRAIT_PERKS } from '../../src/sim/traitPerks';
import { HERO_TRAITS, membersOf, TRAITS } from '../../src/sim/traits';

SWEEP.hazards = sweepLevel();
const GAMES = Number(process.env.GAMES ?? 300);
const LEVEL = Number(process.env.LEVEL ?? 1);
const TOP_ONLY = process.env.TIERS === '3';
const only = (process.argv[2] ?? '').split(',').filter(Boolean);
/** The fill-ins: plain heroes of many traits, the first that shares no trait with the party's own taken first. */
const FILLERS = ['knight', 'archer', 'wizard', 'cleric', 'ranger', 'buccaneer', 'lancer', 'rifleBot', 'kraken', 'werewolf', 'samurai', 'kitsune'];

function partyFor(trait: string, n: number): string[] {
  const own = membersOf(trait).filter((k) => !isMythic(k)).slice(0, n);
  const fill = FILLERS.filter((k) => !HERO_TRAITS[k].includes(trait) && !own.includes(k));
  return [...own, ...fill].slice(0, 5);
}

/** One of the hero table's fights (`heroSweep.play`), with the king casting the starting spells by Auto as a player's would. */
function play(seed: number, band: string, stage: number, team: string[]): boolean {
  const foes = fieldBoost(stage);
  const b = startBattle(seed, band, SWEEP.hazards ? { ...foes, hazards: SWEEP.hazards } : foes);
  const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a)));
  team.forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, sweepBoost(1, LEVEL)));
  fight(b);
  b.autoSpells = [...STARTER_SPELLS];
  while (b.phase === 'fight') stepBattle(b);
  return b.phase === 'won';
}

/** A party's win rate: `old` (the traits as before the perks), `none` (no perk awake) or `on` (only `trait`'s perks). */
type Way = 'old' | 'none' | 'on';
function rate(team: string[], stage: number, way: Way, trait: string, games: number, from = 1): number {
  TRAIT_PERKS.on = way !== 'old';
  TRAIT_PERKS.only = way === 'on' ? trait : '-';
  let won = 0;
  for (let g = 0; g < games; g++) if (play(from + g, FIELD_BANDS[g % FIELD_BANDS.length], stage, team)) won++;
  return (100 * won) / games;
}

/** The stage where the party without perks wins nearest half (a short scan, then the nearest). */
function evenStage(team: string[], trait: string): number {
  let best = 1;
  let gap = Infinity;
  for (const s of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 19, 22, 26, 30, 36, 44, 52, 60]) {
    const w = rate(team, s, 'none', trait, 40, 900000);
    if (Math.abs(w - 50) < gap) {
      gap = Math.abs(w - 50);
      best = s;
    }
    if (w < 30) break;
  }
  return best;
}

const pad = (s: string, n: number) => s.padEnd(n);
const rp = (s: string, n: number) => s.padStart(n);
console.log(`TRAIT-PERKS: each tier's lift (${GAMES} fights a cell, heroes at level ${LEVEL}; the party without perks at its even stage)\n`);
console.log([pad('trait', 11), pad('tier', 24), rp('stage', 6), rp('old %', 7), rp('none %', 8), rp('on %', 7), rp('lift', 7), rp('vs old', 8)].join(''));
const flags: string[] = [];
for (const t of Object.values(TRAITS)) {
  if (only.length && !only.includes(t.id)) continue;
  t.tiers.forEach((tier, i) => {
    if (TOP_ONLY && i < 2) return;
    const team = partyFor(t.id, tier.need);
    const stage = evenStage(team, t.id);
    const old = rate(team, stage, 'old', t.id, GAMES);
    const off = rate(team, stage, 'none', t.id, GAMES);
    const on = rate(team, stage, 'on', t.id, GAMES);
    const lift = on - off;
    const mark = i === 2 && (lift > 20 || lift < 6) ? (lift > 20 ? '  <- strong' : '  <- weak') : '';
    if (mark) flags.push(`${t.name} ${tier.name} ${lift.toFixed(1)}`);
    console.log([pad(t.name, 11), pad(`${['I', 'II', 'III'][i]} ${tier.name}`, 24), rp(String(stage), 6), rp(old.toFixed(1), 7), rp(off.toFixed(1), 8), rp(on.toFixed(1), 7), rp((lift >= 0 ? '+' : '') + lift.toFixed(1), 7), rp((on - old >= 0 ? '+' : '') + (on - old).toFixed(1), 8)].join('') + mark);
  });
}
TRAIT_PERKS.on = true;
delete TRAIT_PERKS.only;
console.log(`\ntop tiers outside +6 to +20: ${flags.length ? flags.join(', ') : 'none'}`);
