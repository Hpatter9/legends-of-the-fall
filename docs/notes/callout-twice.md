# CALLOUT-ONCE: a foe's call-out played twice

The owner: "When an enemy calls out a hero, the call out plays twice." Branch `claude/callout-twice`.

## The cause

A nemesis standing in a wave where it also challenges a hero to a duel (the Nemesis War, phase 4) had **two cut-ins queued** at the wave's
start. `main.ts` queued the wave's taunts (`queueTaunts`: the nemesis's taunt from its memory, phase 3), then the challenge (`queueDuel`:
`duelTaunt`, phase 4), one after the other in `TauntCuts`. Both are the same nemesis's portrait and name plate, and the two lines name the
same hero for the same reason. A Vengeful, Grudge or dread taunt and the challenge come from the same memory, so the hero's answer
(`REPLIES[kind][1]`) was word for word the same in both. The phase-4 screenshot tool even skipped the first cut-in ("the taunt's goes
first: it is skipped"). This happened with every cut-in setting except off, at any speed, with cinematics on or off, and on a fresh or a
resumed run. It never happened under auto-replay, which has no cut-ins.

## The fix

A foe calls out once a wave. `tauntCutRules.ts` `onceEach` (pure) merges new cut-ins into the queue with each nemesis at most once: a later
one for the same nemesis (the challenge) takes the earlier one's place, and one for the nemesis showing now is dropped. `TauntCuts.add`
queues through it, so the challenge's cut-in now stands where the nemesis's taunt stood, and its card follows as before. The challenge's
cut-in counts as a first meeting (`first: true`), so a nemesis met here is still marked taunted. The cut-ins play no sound of their own,
so there was no doubled sound. `tools/nemesis/shots4.mjs` no longer skips a first cut-in.

## The other call-outs, checked

- Grudge and Vengeance taunts are the same taunt (its trigger), once a run for each nemesis (`wavesTaunts` and the page's `taunted` set).
  A retry, a heart burned or a lost duel's wave set up again does not bring it back. A reload of the page does, once.
- The armies' first-boss films and arrivals (`boss:<army>`, `arrivalScene`) are one per boss's first meeting; a boss's boast names no
  hero. A nemesis does not stand as an army's boss.
- The heroes' and foes' spoken quips have no call-out.

## Checks

- `test/callout-once.test.ts`: a wave with a challenge queues each foe once, the challenge in the taunt's place, with no line said twice;
  `onceEach`'s rule; a wave without a challenge keeps every taunt, and one met this run is not called again.
- `node tools/callout/count.mjs` (after `npm run web`): plays phase 4's challenge wave on a resumed run at 393x852, 360x780 and 412x915,
  with cut-ins full and short, at x1 with cinematics on and at x3 with cinematics off, and counts the cut-ins opened by nemesis and every
  line said. Before the fix it found Hask twice in all 12 cases, with Natsu's answer said twice. After the fix each case has one cut-in and
  the challenge card.
- Full suite (3050 pass), typecheck, `npm run web`.
