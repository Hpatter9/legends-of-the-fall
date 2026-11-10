// BATTLE-FEEL's rules in the fight (docs/notes/battle-feel.md): the walk for the foe that can be struck soonest (`FAR_WALK`), a blocked melee
// hero changing places with a still shooter of its own (`unjam`), and the floor under a skill's blow (`SKILL_FLOOR`). On in every fight; the
// proof that the ailment model changed nothing (`test/ailments-identical.test.ts`) turns them off, as it does the bosses' great attacks.
// `on` is all three; `walk`, `swap` and `floor` each one alone (the balance tools turn one off to see what it moves).
export const FEEL = { on: true, walk: true, swap: true, floor: true };
