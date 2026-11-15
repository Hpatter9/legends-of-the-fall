// TRAIT-PERKS' switch for the tools (`TRAIT_PERKS` in `src/sim/traits.ts`): `TRAIT_PERKS=0` plays this run with the traits as they were
// before the perks, to set the balance tables side by side (`docs/notes/trait-perks.md`). Nothing is written.
import { TRAIT_PERKS } from '../../src/sim/traits';

if (process.env.TRAIT_PERKS === '0') TRAIT_PERKS.on = false;
