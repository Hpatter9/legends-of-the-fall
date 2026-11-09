// The Assault's balance table (phase 1, docs/notes/assault-1.md; the design's 7.6): `npm run balance -- --assault orcs` plays the party bot
// through the hold, with a full host at the army's Legendary-star level, in two styles: Auto (the opening plan, then the nearest gate) and
// Tactical (the bot also silences the drums near its approach and flies a flying hero onto the wall-walk), and Siege (Tactical with the
// siege works of phase 1b: the ram and two ladders). It reports the wins, the share of
// the host lost, the time taken and the sim's cost a tick.
//
// The targets: Auto wins 40 to 60% and loses 40 to 60% of the host; Tactical wins 75% or more and loses 25 to 40%; tactics worth at least
// 20 points of win rate.
//
//   npm run balance -- --assault orcs [--levels 65,75 (default: the hold's mark)] [--seeds 8] [--share 0.2] [--party recruits|starters] [--talents] [--tier 4]
//     [--last]   (phase 5: as the Last Hold, the whole Council defending: a warchief at Might 8, four captains and eight lieutenants)
import { savedAt } from '../autoplay';
import { BUILDINGS, maxLevel, newCastle, type BuildingId } from '../../src/sim/castle';
import { mixSeed } from '../../src/sim/rng';
import { HEROES, UNITS } from '../../src/sim/units';
import { learn, tierNodes } from '../../src/sim/talents';
import { assaultInput, defaultPlan } from '../../src/sim/assault/assaultMode';
import { playAssault, assaultScore, startAssault } from '../../src/sim/assault/assault';
import { ASSAULT, HOLD_MARK, HOLD_SHARE, LAST_SHARE } from '../../src/sim/assault/garrison';
import { ELITE_FOES } from '../../src/sim/eliteFoes';
import type { NemSnap } from '../../src/sim/nemesis';

const flag = (name: string): string | undefined => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);
const army = flag('--assault') ?? 'orcs';
// (by default the hold's mark: the hero level a player has when its army's tenth star opens it, `HOLD_MARK`)
const levels = (flag('--levels') ?? String(HOLD_MARK[army] ?? 65)).split(',').map(Number);
const seeds = Number(flag('--seeds') ?? 8);
const share = flag('--share') ? Number(flag('--share')) : undefined;
const talents = process.argv.includes('--talents');
// (`--tier 4`: the Warband regrouped, phase 2's weekly re-storm at Mythic)
const tier = flag('--tier') ? Number(flag('--tier')) : undefined;
const PARTIES: Record<string, readonly string[]> = { starters: HEROES, recruits: ['knight', 'paladin', 'archer', 'warlock', 'cleric'], design: ['knight', 'samurai', 'archer', 'wizard', 'dragoon'] };
const party = PARTIES[flag('--party') ?? 'design'];
// (`--last`: the Last Hold, phase 5. A full Council: the seats all taken, at the Might a Council has grown to by the War's end, born of the
// elites of every army; no traits, so the table measures the Council's weight and not its luck)
const lastHold = process.argv.includes('--last');
const MIGHTS = { warchief: [8], captain: [6, 5, 5, 4], lieutenant: [4, 3, 3, 3, 2, 2, 2, 1] } as const;
const elites = Object.keys(ELITE_FOES);
let nid = 0;
const member = (rank: NemSnap['rank'], might: number, base = elites[nid % elites.length]): NemSnap => ({ id: ++nid, base, name: `Member ${nid}`, epithet: 'the Last', rank, might, scars: 0, traits: [], weak: [] });
const chief = member('warchief', MIGHTS.warchief[0], 'orcWarlord');
const council = [...MIGHTS.captain.map((x) => member('captain', x)), ...MIGHTS.lieutenant.map((x) => member('lieutenant', x))];
const maxed = newCastle();
for (const id of Object.keys(BUILDINGS) as BuildingId[]) maxed[id] = maxLevel(id);

console.log(`\nTHE ASSAULT: ${army}  (${party.map((k) => UNITS[k].name).join(', ')}; a full host, a maxed castle${talents ? ', talents learned' : ''}; foeShare ${share ?? (HOLD_SHARE[army] ?? ASSAULT.foeShare) * (lastHold ? LAST_SHARE[army] ?? 1 : 1)}${lastHold ? `, the Last Hold (x${LAST_SHARE[army] ?? 1}, a full Council)` : ''}, officerShare ${ASSAULT.officerShare}; ${seeds} seeds a cell)\n`);
console.log('level  style      wins   host lost   time (won)   sim ms/tick (mean, worst)');
for (const L of levels)
  for (const style of ['Auto', 'Tactical', 'Siege'] as const) {
    const tactical = style !== 'Auto';
    let wins = 0;
    let lost = 0;
    let host = 0;
    let time = 0;
    let ticks = 0;
    let ms = 0;
    let worst = 0;
    for (let s = 1; s <= seeds; s++) {
      const m = savedAt(L, party, s);
      m.castle = { ...maxed };
      m.party = [...party];
      if (talents) for (const k of party) for (const t of [1, 2, 3, 4, 5, 6, 7] as const) for (const n of tierNodes(k, t)) learn(m, k, n.id);
      // (Tactical keeps the host together: every platoon over the Old Bridge)
      const plan = tactical ? { approaches: Object.fromEntries(party.map((k) => [k, 'bridge' as const])) } : defaultPlan(party);
      const input = assaultInput(m, army, mixSeed(s, 0xa55a, L), plan);
      input.troops = Object.fromEntries(party.map((k) => [k, Array(10).fill(0)]));
      input.auto = true;
      input.tactical = tactical;
      // (Siege: Tactical with the siege works, phase 1b: the ram with the first platoon, ladders with the second and third)
      if (style === 'Siege') input.siege = { ram: party[0], ladders: [party[1], party[2]] };
      if (share !== undefined) input.foeShare = share;
      if (tier !== undefined) input.tier = tier;
      if (lastHold) Object.assign(input, { last: true, council, warchief: chief });
      const b = startAssault(input);
      let last = performance.now();
      playAssault(b, [], () => {
        const now = performance.now();
        const d = now - last;
        last = now;
        ms += d;
        worst = Math.max(worst, d);
        ticks++;
      });
      const sc = assaultScore(b);
      const won = b.field!.hold!.outcome === 'won';
      if (won) {
        wins++;
        time += b.t;
      }
      host += 50;
      lost += sc.platoons.reduce((n, p) => n + (10 - p.soldiers), 0);
    }
    const t = wins ? Math.round(time / wins / 1000) : 0;
    console.log(`${String(L).padEnd(7)}${style.padEnd(11)}${`${Math.round((100 * wins) / seeds)}%`.padEnd(7)}${`${Math.round((100 * lost) / host)}%`.padEnd(12)}${(wins ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : '-').padEnd(13)}${(ms / ticks).toFixed(3)}, ${worst.toFixed(1)}`);
  }
