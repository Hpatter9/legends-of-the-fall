// The Vampires' kits (docs/notes/twenty-heroes.md, batch 1): each has a pool, three skills and an ultimate in main's skill system, held to the
// same rules as the roster's (`test/skill-rules.test.ts`, `test/hero-kits-all.test.ts`, `test/skill3.test.ts`): the classes' ranges, a heavy its
// dearest and a jab its cheapest, the kit's demand, a guard cast only in its case; and each skill does something, and a fight of the five with
// every skill open plays out the same twice. They wait for their battle sheets outside the roster, so these tests read `comingHeroKits()`.
import { comingKitTests } from './comingKits';

comingKitTests('the Vampires', ['vampireLord', 'hemomancer', 'nightstalker', 'bloodGargoyle', 'dhampir']);
