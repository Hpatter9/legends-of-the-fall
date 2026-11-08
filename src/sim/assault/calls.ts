// The calls the page makes on an assault's battle (phase 2, `docs/notes/assault-2.md`): each the sim's own function, its first argument the
// battle. With the simulation in a Web Worker the page makes each on its copy (for the answer it shows at once) and sends it to the worker,
// whose battle is the truth (`assaultSim.ts`, `assaultWorker.ts`). Pure rules: no DOM.

import { orderPlatoon, setAuto, setFormation, soundRetreat } from './platoons';
import { orderUltimate } from '../orders';
import { castSpell } from '../spells';

export const CALLS = { orderPlatoon, setFormation, setAuto, soundRetreat, orderUltimate, castSpell } as const;
export type CallName = keyof typeof CALLS;
