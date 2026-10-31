// BOSS-BIG (docs/notes/boss-big-attacks.md): how the bosses' signature attacks move the armies. Each army is played from wave 1 by the
// greedy player (`tools/autoplay.ts`'s `playArmy`: the recruits' party, gear dressed, every talent row the level opens; no castle on the first four armies' Normal, a maxed one from the Labyrinth on and on the higher tiers), a fresh save an attempt, at the level
// its tier is meant for; it prints the share of attempts that cleared, and of the attempts lost, the share lost on a boss wave. And what the
// signatures did: how many landed, how many heroes each struck, and the share of a struck hero's health a strike took.
//
//   node tools/boss-big/run.mjs measure [--attempts 24] [--tiers 0,1,2] [--only orcs,undead]
//        [--off]        the signatures switched off (the fights as on main)
//        [--nododge]    the signatures on, the heroes never step out of the marked tiles
//        [--spells]     the player answers each one with the king's spells (Shield on the marked heroes, Blink a marked wounded hero out, Heal after)

import { battleTap, type Battle, type BattleEvent, type Unit } from '../../src/sim/battle';
import { BOSS_BIG, SIG } from '../../src/sim/bossAttacks';
import { ARMIES } from '../../src/sim/armies';
import { TIERS } from '../../src/sim/tiers';
import { BUILDINGS, maxLevel, newCastle, type BuildingId } from '../../src/sim/castle';
import { mixSeed } from '../../src/sim/rng';
import { castSpell, canAfford } from '../../src/sim/spells';
import { standable, tileAt } from '../../src/sim/board';
import { playArmy, savedAt } from '../autoplay';
import { defOf } from '../../src/sim/battle';
import { heroStats, learn, tierNodes } from '../../src/sim/talents';
import { heroRank, type Meta } from '../../src/sim/meta';
import { levelOfKind } from '../../src/sim/levels';
import { boostOf, type Owned } from '../../src/sim/run';

/** Every talent row the level opens (the first of each pair), as `--deep --talents` dresses a party. */
function dressed(level: number, seed: number): { meta: Meta; boostFor: (h: Owned) => ReturnType<typeof boostOf> } {
  const meta = savedAt(level, party, seed);
  for (const k of party) {
    if (!meta.unlocked.includes(k)) meta.unlocked.push(k);
    for (const t of [1, 2, 3, 4, 5, 6, 7] as const) for (const n of tierNodes(k, t)) learn(meta, k, n.id);
  }
  return { meta, boostFor: (h) => boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), heroStats(meta, h.kind)) };
}

const flag = (n: string): string | undefined => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : undefined);
const ATTEMPTS = Number(flag('--attempts') ?? 24);
const TIER_LIST = (flag('--tiers') ?? '0').split(',').map(Number);
const ONLY = flag('--only')?.split(',');
if (process.argv.includes('--off')) BOSS_BIG.on = false;
if (process.argv.includes('--nododge')) BOSS_BIG.dodge = false;
const SPELLS = process.argv.includes('--spells');
// (`--power 1.2`, `--every 9000`: try another strength or cooldown for every signature)
if (flag('--power')) SIG.POWER = Number(flag('--power'));
if (flag('--hp')) SIG.HP = Number(flag('--hp'));
if (flag('--every')) SIG.EVERY_MS = Number(flag('--every'));
/** The hero level each tier is measured at: Normal at the army's own level, the others at their bands' middles (`docs/notes/difficulty.md`). */
const LEVEL_OF: Record<number, number> = { 1: 45, 2: 65, 3: 85, 4: 100 };
const party = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];

const maxed = newCastle();
for (const id of Object.keys(BUILDINGS) as BuildingId[]) maxed[id] = maxLevel(id);

const seen = { lands: 0, struck: 0, share: 0, killed: 0 };

/** The player's answer to a windup: a Shield over the most marked heroes; failing that, Blink the most wounded hero off the marks if it is
 *  on them; after a landing, a Heal over the most hurt. */
function answer(b: Battle, events: BattleEvent[]): void {
  const heroes = b.units.filter((x) => x.alive && x.side === 'hero' && !defOf(x).summon);
  const best = (score: (u: number, v: number) => number): { u: number; v: number; n: number } | null => {
    let top: { u: number; v: number; n: number } | null = null;
    for (const h of heroes)
      for (let dv = -1; dv <= 1; dv++)
        for (let du = -1; du <= 1; du++) {
          const n = score(h.u + du, h.v + dv);
          if (n > 0 && (!top || n > top.n)) top = { u: h.u + du, v: h.v + dv, n };
        }
    return top;
  };
  for (const e of events) {
    if (e.kind !== 'bossSig') continue;
    if (e.phase === 'warn') {
      const on = new Set(e.tiles);
      const marked = (x: Unit) => on.has(x.v * b.board.w + x.u);
      const spot = best((u, v) => heroes.filter((x) => marked(x) && Math.abs(x.u - u) <= 1 && Math.abs(x.v - v) <= 1).length);
      if (spot && canAfford(b, 'shield') && castSpell(b, 'shield', spot.u, spot.v)) continue;
      const weak = [...heroes].sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id)[0];
      if (weak && marked(weak) && canAfford(b, 'blink')) {
        for (let r = 1; r <= 3; r++) {
          const to = heroes.length ? [...Array(b.board.w * b.board.d).keys()].find((i) => !on.has(i) && Math.abs((i % b.board.w) - weak.u) + Math.abs(Math.floor(i / b.board.w) - weak.v) === r && standable(tileAt(b.board, i % b.board.w, Math.floor(i / b.board.w))) && !b.units.some((x) => x.alive && x.u === i % b.board.w && x.v === Math.floor(i / b.board.w))) : undefined;
          if (to !== undefined && castSpell(b, 'blink', to % b.board.w, Math.floor(to / b.board.w))) break;
        }
      }
    } else if (e.phase === 'land' && canAfford(b, 'heal')) {
      const spot = best((u, v) => heroes.filter((x) => Math.abs(x.u - u) <= 1 && Math.abs(x.v - v) <= 1).reduce((n, x) => n + (1 - x.hp / x.maxHp), 0));
      if (spot && spot.n > 0.6) castSpell(b, 'heal', spot.u, spot.v);
    }
  }
}

battleTap.fn = (b, events) => {
  let from = -1;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.kind === 'bossSig' && e.phase === 'land') {
      seen.lands++;
      from = e.by;
    } else if (e.kind === 'hit' && e.by === from && e.src === 'skill' && e.heavy) {
      const to = b.units.find((x) => x.id === e.to)!;
      seen.struck++;
      seen.share += e.dmg / to.maxHp;
      if (e.killed) seen.killed++;
    } else if (e.kind !== 'hit') from = -1;
  }
  if (SPELLS && b.stand === undefined) answer(b, events);
};

const pct = (n: number, d: number) => (d ? ((100 * n) / d).toFixed(0) : '-').padStart(4);
console.log(`BOSS-BIG measure: ${BOSS_BIG.on ? `signatures on (power x${SIG.POWER}, every ${SIG.EVERY_MS} ms, boss hp x${SIG.HP})` : 'signatures OFF'}${BOSS_BIG.on && !BOSS_BIG.dodge ? ', no dodging' : ''}${SPELLS ? ', spells answer' : ''}; ${ATTEMPTS} attempts a cell; clear% (boss-wave share of losses%), boss waves won of those reached%, mean waves won`);
console.log(['army'.padEnd(12), ...TIER_LIST.map((t) => `${TIERS[t].name}`.padStart(30))].join(''));
for (const army of ARMIES.filter((a) => !ONLY || ONLY.includes(a.id))) {
  const cells = TIER_LIST.map((t) => {
    const level = t === 0 ? army.level : LEVEL_OF[t];
    let clears = 0;
    let lost = 0;
    let onBoss = 0;
    let waves = 0;
    let reached = 0;
    let beat = 0;
    for (let a = 1; a <= ATTEMPTS; a++) {
      const { meta, boostFor } = dressed(level, a);
      const r = playArmy(meta, army.id, mixSeed(a, 0xb0b1, ARMIES.indexOf(army) * 10 + t), party, t === 0 && ARMIES.indexOf(army) < 4 ? newCastle() : maxed, true, t, boostFor);
      waves += r.won;
      // (each boss wave it reached, and whether it won it)
      army.waves.forEach((w, i) => {
        if (!w.boss || r.won < i) return;
        reached++;
        if (r.won > i) beat++;
      });
      if (r.cleared) clears++;
      else {
        lost++;
        if (army.waves[r.won]?.boss) onBoss++;
      }
    }
    return `${pct(clears, ATTEMPTS)}% (${pct(onBoss, lost)}%) b${pct(beat, reached)}% w${(waves / ATTEMPTS).toFixed(1)} L${level}`.padStart(30);
  });
  console.log([army.name.slice(0, 11).padEnd(12), ...cells].join(''));
}
if (seen.lands) console.log(`signatures landed ${seen.lands}; heroes struck a landing ${(seen.struck / seen.lands).toFixed(2)}; share of hp a strike took ${(seen.share / Math.max(1, seen.struck)).toFixed(2)}; killed by one ${seen.killed}`);
