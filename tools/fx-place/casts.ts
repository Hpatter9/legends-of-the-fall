// FX-PLACE: the casts of a battle the page dumped (`tools/battle-feel/probe.mjs` with DUMP=file), replayed headless: when each hero cast what,
// and the area and aura events it laid, so a frame strip can be taken at the moment.
import { readFileSync } from 'node:fs';
import { fight, stepBattle, type Battle } from '../../src/sim/battle';
const b = JSON.parse(readFileSync(process.argv[2], 'utf8'), (_k, v) => (v && v.__map ? new Map(v.__map) : v && v.__set ? new Set(v.__set) : v)) as Battle;
fight(b);
while (b.phase === 'fight') {
  for (const e of stepBattle(b)) {
    if (e.kind === 'skill' || e.kind === 'area' || e.kind === 'aura') {
      const u = b.units.find((x) => x.id === e.by);
      if (u?.side === 'hero') console.log(b.t, u.def, e.kind, e.kind === 'skill' ? e.name : e.kind === 'area' ? `${e.id} at ${e.u},${e.v} ms ${e.ms}` : `${e.what} reach ${e.reach}`);
    }
  }
}
