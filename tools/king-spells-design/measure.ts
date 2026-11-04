// KING-SPELLS-DESIGN (docs/notes/king-spells-design.md): what the king's spells do in a fight today, for the revamp's audit. The greedy
// player (`tools/autoplay.ts`, Auto casting the starting three) plays army cells; for every fight the tap reports how long it ran, how many
// spells were cast, the share of the damage to foes that came from the king (hits `by: 0` that are not the Eidolon's), the share of the
// healing that did, and how long the mana bar sat full (mana that could not be stored).
//   node tools/king-spells-design/run.mjs [seeds]
// Environment: CELLS (army:level:tier,...), LOADOUT (spell ids, comma-separated).

import { battleTap, type Battle } from '../../src/sim/battle';
import { mixSeed } from '../../src/sim/rng';
import { MANA_MAX, type SpellId } from '../../src/sim/spells';
import { botSpells, playArmy, savedAt } from '../autoplay';

const SEEDS = Number(process.argv[2] ?? 12);
const party = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];
const cells = (process.env.CELLS ?? 'orcs:1:0,undead:8:0,beasts:15:0,labyrinth:35:0,infernal:55:0').split(',').map((c) => {
  const [army, level, tier] = c.split(':');
  return { army, level: Number(level), tier: Number(tier) };
});
const loadout = (process.env.LOADOUT ?? '').split(',').filter(Boolean) as SpellId[];

interface Tally { fights: number; ms: number; casts: number; kingDmg: number; dmg: number; kingHeal: number; heal: number; fullMs: number; byId: Record<string, number> }
let t: Tally;
const fresh = (): Tally => ({ fights: 0, ms: 0, casts: 0, kingDmg: 0, dmg: 0, kingHeal: 0, heal: 0, fullMs: 0, byId: {} });
const lastT = new WeakMap<Battle, number>();
battleTap.fn = (b, ev) => {
  const prev = lastT.get(b) ?? 0;
  if (b.phase === 'fight' && b.spells.mana >= MANA_MAX) t.fullMs += b.t - prev;
  lastT.set(b, b.t);
  for (const e of ev) {
    if (e.kind === 'spell') {
      t.casts++;
      t.byId[e.id] = (t.byId[e.id] ?? 0) + 1;
    }
    if (e.kind === 'hit') {
      const to = b.units.find((u) => u.id === e.to);
      if (to && to.side !== 'hero') {
        t.dmg += e.dmg;
        if (e.by === 0 && !e.eidolon) t.kingDmg += e.dmg;
      }
    }
    if (e.kind === 'heal' && e.amount > 0) {
      const to = b.units.find((u) => u.id === e.to);
      if (to && to.side === 'hero') {
        t.heal += e.amount;
        if (e.by === 0 || e.by === undefined) t.kingHeal += e.amount;
      }
    }
    if (e.kind === 'end') {
      t.fights++;
      t.ms += b.t;
    }
  }
};

const pct = (n: number) => `${Math.round(n * 100)}%`;
botSpells.on = true;
if (loadout.length) botSpells.loadout = loadout;
console.log(`seeds ${SEEDS}; loadout ${loadout.length ? loadout.join(', ') : 'heal, meteor, haste'}`);
console.log('| Cell | Fight length | Casts a fight | King share of damage | King share of healing | Time with the bar full | Casts by spell |');
for (const c of cells) {
  t = fresh();
  for (let i = 0; i < SEEDS; i++) {
    const seed = mixSeed(i + 1, 0xa0c5);
    const meta = savedAt(c.level, party, seed);
    if (loadout.length) meta.spellbook.equipped = loadout;
    playArmy(meta, c.army, seed, party, undefined, true, c.tier);
  }
  const by = Object.entries(t.byId).map(([k, n]) => `${k} ${(n / t.fights).toFixed(1)}`).join(', ');
  console.log(`| ${c.army} ${c.level}${c.tier ? ` t${c.tier}` : ''} | ${(t.ms / t.fights / 1000).toFixed(1)} s | ${(t.casts / t.fights).toFixed(1)} | ${pct(t.kingDmg / t.dmg)} | ${pct(t.kingHeal / Math.max(1, t.heal))} | ${pct(t.fullMs / t.ms)} | ${by} |`);
}
