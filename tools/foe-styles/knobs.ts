// FOE-STYLES' measuring knobs, read from the environment by every tool that imports this (and so by their child processes):
//   FOE_SET="orcBrute.hp=400,wolfRed.atk=22"   a foe's stats for this run (`FOES`/`UNITS`)
//   FOE_PLAIN="wolfRed,imp"                     those foes fight without their kits (to see what a style is worth)
//   ARMY_SET="orcs.start=0.6"                   an army's numbers for this run
//   KIT_SET="clanOgre.skill.perSec=1"            a kit's number for this run (its own copy: no other kit sharing the object moves)
// Nothing is written.
import { KITS } from '../../src/sim/abilities';
import { ARMIES } from '../../src/sim/armies';
import { UNITS } from '../../src/sim/units';

for (const kv of (process.env.FOE_SET ?? '').split(',').filter(Boolean)) {
  const [key, v] = kv.split('=');
  const [id, field] = key.split('.');
  if (!UNITS[id]) throw new Error(`no unit ${id}`);
  (UNITS[id] as unknown as Record<string, number>)[field] = Number(v);
}
for (const id of (process.env.FOE_PLAIN ?? '').split(',').filter(Boolean)) delete KITS[id];
for (const kv of (process.env.ARMY_SET ?? '').split(',').filter(Boolean)) {
  const [key, v] = kv.split('=');
  const [id, field] = key.split('.');
  const a = ARMIES.find((x) => x.id === id);
  if (!a) throw new Error(`no army ${id}`);
  (a as unknown as Record<string, number>)[field] = Number(v);
}
for (const kv of (process.env.KIT_SET ?? '').split(',').filter(Boolean)) {
  const [key, v] = kv.split('=');
  const [id, part, field] = key.split('.');
  const k = KITS[id];
  if (!k) throw new Error(`no kit ${id}`);
  const copy = { ...(k as unknown as Record<string, Record<string, unknown>>)[part], [field]: Number(v) };
  KITS[id] = { ...k, [part]: copy };
}
