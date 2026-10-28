import { ARMIES, landsOf } from '../../src/sim/armies';
for (const a of ARMIES) console.log(a.id, a.waves.length, a.waves.map((w, i) => (w.boss ? i + 1 : 0)).filter(Boolean).join(','), landsOf(a).join('/'), JSON.stringify(a.waves.map((w: any) => (w.foes ?? w.band ?? []).length)));
