// SEVEN-SLOT GEAR's economy model (docs/notes/gear-runes-design.md section 11.6, docs/notes/gear-build.md): a modelled day of play at army 1,
// 3, 5 and 7 (three runs of the army by hand and ten on auto-replay, replays paying their share), crowns in against the upkeep of five
// heroes' seven-piece kits (repairs at the smith, or patched), a satchel of remedies, and what the stall's prices make of what is left.
// Pure arithmetic over the game's own numbers; nothing is played.
//   npx esbuild tools/econ/day.ts --bundle --platform=node --outfile=out/econ.cjs --loader:.png=empty --loader:.webp=empty && node out/econ.cjs
import { ARMIES, replayOf, waveCrowns } from '../../src/sim/armies';
import { EQUIP_SLOTS, QUIET_SLOTS, type Equipment, type Rarity } from '../../src/sim/equipment';
import { pointsCost, AUTO_WEAR } from '../../src/sim/wear';
import { GEAR_PRICE } from '../../src/sim/stall';
import { REMEDIES } from '../../src/sim/remedies';
import { SHOP } from '../../src/sim/chestShop';

const HEROES = 5;
const HAND_RUNS = 3;
const AUTO_RUNS = 10;
/** A kit's grade at each army the model looks at (Rare early, Mythic late). */
const GRADE: Record<number, Rarity> = { 0: 2, 2: 3, 4: 4, 6: 5 };
const line = (cells: (string | number)[]) => console.log(cells.map((c) => String(c).padStart(12)).join(''));
line(['army', 'crowns in', 'smith', 'patched', 'remedies', 'left', 'gear bought']);
for (const a of [0, 2, 4, 6]) {
  const army = ARMIES[a];
  const waves = army.waves.length;
  // (crowns: the first run of the day pays the waves in full, the rest at the replay share)
  const run = army.waves.reduce((n, _, i) => n + waveCrowns(army, i + 1), 0);
  const crowns = run + (HAND_RUNS - 1 + AUTO_RUNS) * replayOf(run);
  // (wear: a wave wears each of the hands and the torso a point and each quiet slot half, auto-replay at half again)
  const perWave = EQUIP_SLOTS.reduce((n, s) => n + (QUIET_SLOTS.includes(s) ? 0.5 : 1), 0);
  const points = HEROES * perWave * waves * (HAND_RUNS + AUTO_RUNS * AUTO_WEAR);
  const piece: Equipment = { id: 1, base: 'ironSword', rarity: GRADE[a], level: 1 + 3 * a };
  const smith = pointsCost(piece, points);
  // (patching: 40% of the price for the same points, the scars aside)
  const patched = Math.round(smith * 0.4);
  // (a satchel a hand run: two Bandages and a Draught)
  const remedies = HAND_RUNS * (2 * REMEDIES.bandage.price + REMEDIES.draught.price);
  const left = crowns - smith - remedies;
  line([army.name.slice(0, 11), crowns, smith, patched, remedies, left, `${Math.max(0, Math.floor(left / GEAR_PRICE[Math.min(4, GRADE[a])]))} ${['', 'C', 'R', 'E', 'L'][Math.min(4, GRADE[a])]}`]);
}
console.log(`\nChests: ${SHOP.map((c) => `${c.name} ${c.price}`).join(', ')}.`);
