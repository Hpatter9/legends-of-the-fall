// Prints the second wave of heroes as JSON (for the contact sheet): `node tools/more-heroes/contact.mjs` bundles and runs it.
import { ALL_HEROES, UNITS } from '../../src/sim/units';
import { HERO_TRAITS, TRAITS } from '../../src/sim/traits';
import { KITS } from '../../src/sim/abilities';

const wave = ALL_HEROES.slice(25);
console.log(
  JSON.stringify(
    wave.map((id) => {
      const d = UNITS[id];
      const k = KITS[id];
      return { id, name: d.name, rarity: d.rarity, forms: d.forms ?? [d.sheet], traits: HERO_TRAITS[id].map((t) => TRAITS[t].name), skill: k.skill.name, ultimate: k.ultimate?.name ?? null };
    }),
  ),
);
