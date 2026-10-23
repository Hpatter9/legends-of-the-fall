// A quick balance check for the permanent equipment: random five-hero teams against the field bands, with and without
// equipment, paired by seed. Table 1 is the win rate by the rarity of a whole kit (a weapon, armour and trinket on every
// hero); table 2 is the lift of each of the 60 types on its own (worn Mythic, level 10, by every hero), so an item that
// breaks the balance stands out. Run with `npm run gear-balance` (`-- --games 300` for quicker and noisier).

import { DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { fight, place, startBattle, type Battle, type Stage } from '../src/sim/battle';
import { FIELD_BANDS } from '../src/sim/foes';
import { mixSeed, Rng } from '../src/sim/rng';
import { ALL_HEROES } from '../src/sim/units';
import { EQUIP_LIST, EQUIP_SLOTS, emptyStats, itemStats, type EquipStats, type NewEquipment } from '../src/sim/equipment';
import { gradeBoost, stageBoost } from '../src/sim/run';
import { stepBattle } from '../src/sim/battle';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 && Number(process.argv[i + 1]) > 0 ? Number(process.argv[i + 1]) : fallback;
};
const GAMES = arg('--games', 600);
const STAGE = arg("--stage", 13);
const LEVEL = arg("--level", 3);
const fieldBoost = (s: number): Stage => ({ ...stageBoost(s), boss: undefined });

function won(seed: number, team: string[], equip: (kind: string) => EquipStats | undefined, mult = 1): boolean {
  const band = FIELD_BANDS[seed % FIELD_BANDS.length];
  const b: Battle = startBattle(seed, band, fieldBoost(STAGE));
  const rng = new Rng(mixSeed(seed, 0xba1a));
  const spots: [number, number][] = [];
  for (let v = b.board.d - DEPLOY_ROWS; v < b.board.d; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  for (let i = spots.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  team.forEach((id, i) => {
    const eq = equip(id);
    const g = gradeBoost(1, 0, LEVEL);
    place(b, id, spots[i][0], spots[i][1], undefined, { ...g, hp: g.hp! * mult, atk: g.atk! * mult, ...(eq ? { equip: eq } : {}) });
  });
  fight(b);
  while (b.phase === 'fight') stepBattle(b);
  return b.phase === 'won';
}

const teams = (): string[][] => {
  const rng = new Rng(0x6ea2);
  return Array.from({ length: GAMES }, () => {
    const pool = [...ALL_HEROES];
    return Array.from({ length: 5 }, () => pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  });
};
const T = teams();
const rate = (equip: (kind: string) => EquipStats | undefined, mult = 1) => (100 * T.filter((t, i) => won(1000 + i, t, equip, mult)).length) / GAMES;
/** The plain hp and attack multiplier (no equipment) that wins as often as `equip`: the kit's "effective strength", as +%. */
function effective(equip: (kind: string) => EquipStats | undefined): string {
  const target = rate(equip);
  if (target >= 99) return '>';
  let lo = 1;
  let hi = 2;
  for (let i = 0; i < 7; i++) {
    const mid = (lo + hi) / 2;
    if (rate(() => undefined, mid) < target) lo = mid;
    else hi = mid;
  }
  return `+${Math.round(((lo + hi) / 2 - 1) * 100)}%`;
}
const sum = (items: NewEquipment[], kind: string): EquipStats => {
  const out = emptyStats();
  for (const it of items) {
    const s = itemStats(it, kind);
    for (const k of Object.keys(out) as (keyof EquipStats)[]) if (k !== 'abilities') (out[k] as number) += s[k] as number;
    out.abilities.push(...s.abilities);
  }
  return out;
};

const base = rate(() => undefined);
console.log(`Stage ${STAGE}, hero level ${LEVEL}, ${GAMES} random teams. No equipment: ${base.toFixed(1)}% won.\n`);
console.log('1. Effective strength of a whole kit on every hero (a random weapon, armour and trinket; item level 1 + 3 per army): the plain hp and attack bonus that wins as often.');
for (const [army, lvl] of [[0, 1], [2, 7], [4, 13], [6, 19]] as const) {
  const row: string[] = [];
  for (const r of [1, 2, 3, 4, 5] as const) {
    const rng = new Rng(77 + r + lvl);
    const kit = (kind: string) => sum(EQUIP_SLOTS.map((slot) => {
      const pool = EQUIP_LIST.filter((b) => b.slot === slot);
      return { base: pool[rng.int(0, pool.length - 1)].id, rarity: r, level: lvl };
    }), kind);
    row.push(`${['Common', 'Rare', 'Epic', 'Legendary', 'Mythic'][r - 1]} ${effective(kit)}`);
  }
  console.log(`  army ${army + 1} (item level ${lvl}):  ${row.join('   ')}`);
}
if (process.argv.includes('--kits-only')) process.exit(0);
console.log('\n2. Each type alone, worn Mythic at level 10 by every hero (win-rate lift in points):');
const lifts = EQUIP_LIST.map((b) => ({ b, lift: rate((k) => sum([{ base: b.id, rarity: 5, level: 10 }], k)) - base })).sort((x, y) => y.lift - x.lift);
for (const { b, lift } of lifts) console.log(`  ${b.name.padEnd(22)} ${b.ability.name.padEnd(18)} ${lift >= 0 ? '+' : ''}${lift.toFixed(1)}`);
