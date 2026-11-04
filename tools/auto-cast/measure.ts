// AUTO-CAST (docs/notes/auto-cast.md): what the king's spells cast on their own are worth. The greedy players (`tools/autoplay.ts`) play
// the same seeds twice, once never casting a spell (as every balance table is measured) and once with Auto casting the save's equipped
// spells (`botSpells`), and the report gives the share cleared, the mean waves won and the spells cast a fight.
//   node tools/auto-cast/run.mjs [seeds]          every cell
// Environment: CELLS (army:level:tier,...), LOADOUT (spell ids, comma-separated; the starting three by default).

import { battleTap } from '../../src/sim/battle';
import { newCastle } from '../../src/sim/castle';
import { mixSeed } from '../../src/sim/rng';
import type { SpellId } from '../../src/sim/spells';
import { botSpells, playArmy, playDaily, savedAt } from '../autoplay';
import { startedMeta } from '../../src/sim/meta';
import { dateKey } from '../../src/sim/dailySeed';

const SEEDS = Number(process.argv[2] ?? 40);
const party = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];
const cells = (process.env.CELLS ?? 'orcs:1:0,orcs:8:0,undead:12:0,beasts:18:0,labyrinth:35:0,ogres:45:0,orcs:40:2,daily:0:0').split(',').map((c) => {
  const [army, level, tier] = c.split(':');
  return { army, level: Number(level), tier: Number(tier) };
});
const loadout = (process.env.LOADOUT ?? '').split(',').filter(Boolean) as SpellId[];

let casts = 0;
let fights = 0;
battleTap.fn = (_b, ev) => {
  for (const e of ev) if (e.kind === 'spell') casts++;
  if (ev.some((e) => e.kind === 'end')) fights++;
};

const pct = (n: number) => `${Math.round(n * 100)}%`.padStart(4);
console.log(`seeds ${SEEDS}; loadout ${loadout.length ? loadout.join(', ') : 'heal, meteor, haste'}`);
console.log('cell                  | never: cleared, waves | auto: cleared, waves, casts/fight');
for (const c of cells) {
  const row: string[] = [];
  for (const on of [false, true]) {
    botSpells.on = on;
    casts = fights = 0;
    let cleared = 0;
    let waves = 0;
    for (let i = 0; i < SEEDS; i++) {
      const seed = mixSeed(i + 1, 0xa0c5);
      if (c.army === 'daily') {
        const meta = startedMeta(seed);
        if (loadout.length) meta.spellbook.equipped = loadout;
        const r = playDaily(meta, dateKey(2026, 1 + Math.floor(i / 28), 1 + (i % 28)));
        cleared += Number(r.cleared);
        waves += r.won;
      } else {
        const meta = savedAt(c.level, party, seed);
        if (loadout.length) meta.spellbook.equipped = loadout;
        const r = playArmy(meta, c.army, seed, party, newCastle(), true, c.tier);
        cleared += Number(r.cleared);
        waves += r.won;
      }
    }
    row.push(`${pct(cleared / SEEDS)}, ${(waves / SEEDS).toFixed(1).padStart(4)}${on ? `, ${(casts / Math.max(1, fights)).toFixed(2)}` : ''}`);
  }
  console.log(`${`${c.army} lv ${c.level}${c.tier ? ` tier ${c.tier}` : ''}`.padEnd(22)}| ${row[0].padEnd(20)} | ${row[1]}`);
}
