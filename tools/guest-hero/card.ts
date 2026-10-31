// Prints a saved army run standing at the passing cart with a guest on offer (for `shots.mjs`): the party's five fielded at grade 2.
import { armyRun, type Owned } from '../../src/sim/run';
import { drawGuest } from '../../src/sim/guest';
import { marketOptions } from '../../src/sim/market';
import { HEROES } from '../../src/sim/units';

const run = armyRun(11, 'orcs', HEROES);
run.roster = HEROES.map((kind, i): Owned => ({ id: i + 1, kind, grade: 2 }));
run.nextId = 6;
run.squad = run.roster.map((h) => h.id);
let s = 2;
while (!drawGuest(run, s)) s += 2;
run.stage = Math.min(s + 1, 14);
run.gold = 260;
run.summons = 6;
run.event = { kind: 'merchant', stage: s, title: 'A passing cart', text: "A cart creaks out of the mist, hung with lanterns, pots and somebody's armour. The pedlar swears everything is a bargain. He swears it to the goat, too.", options: marketOptions(run, s), buys: 3 };
console.log(JSON.stringify(run));
