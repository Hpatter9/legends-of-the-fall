# Auto casts the spells too (AUTO-CAST)

The owner: "For Auto in battle, it should do auto spells and ultimates." The fight's one Auto switch now covers both: with it on, the heroes'
ultimates fire on their own (as before) and the king's equipped spells are cast on their own, where they are worth it. Built on main 0.289.0.

## The switch

- One switch, as before, at the end of the spell orbs' row (`FightHud.autoEl`, `src/fightHud.ts`), on every fight screen: army runs, the daily,
  the spire, the Calamity, quest battles (all `main.ts`) and the Last Stand (`standView.ts`). It now reads AUTO, the switch, and a small
  **ULT+SPELL** line under it; its label and tip say "Auto: ultimates + spells". It is 4 px wider (50 px); CSS in `src/fightHud.css`.
- It is kept where it always was, `Meta.ultAuto` (the old key, so a save that had Auto on has it on, now with the spells too). Auto-replay turns
  it on for its fights, as it did for the ultimates.
- The page tells the battle through `setAutoOn(b)` (in `main.ts` and `standView.ts`): `b.autoUlt` as before, and the new optional
  `Battle.autoSpells`, the equipped spells while Auto is on (`autoSpellsFor`), unset while it is off.
- The War Horn stays the player's: nothing here blows it (it never was automatic).
- The "ult" tip says the switch casts your spells too (`src/tips.ts`).

## The chooser (`src/sim/autoCast.ts`, pure, deterministic)

`stepBattle` calls `autoCast(b)` after each tick when `b.autoSpells` is set: the cast lands between two ticks, where a tap lands, through the
same `castSpell` (mana, cooldown, the tile's checks, the effects, and the entry in `b.log`, so a fight still replays from its log; a replay
plays the log with Auto off). At most one spell a tick and `AUTO_GAP_MS` (1.5 s) between two. `chooseSpell(b, ids)` reads the board:

- **Help first** (in the order equipped): Resurrect a fallen hero while foes worth fighting remain; Heal or Renewal a 3x3 with a hero below
  `HURT` (50%; the Last Stand's king below 65%) or giving back `HEAL_WORTH` (60% of a hero) between them; Shield the heroes standing on a
  boss's marked tiles (`b.warnings`, the signature blows winding up) or below `DYING` (30%) with a foe on them; Bulwark when two heroes are in a
  marked blow or three are below half in the fight; Cleanse a held, charmed, frozen, feared or silenced hero (or two ailing); Blink the most
  wounded hero below 30% with a foe beside it, to the free tile furthest from every foe.
- **Then harm**: Meteor, Poison Cloud, Frost Nova and Hex on the 3x3 holding the most foes **worth hitting** that are at the heroes (`CROWD`,
  3, or every foe left when fewer, or the boss); Meteor Shower over its five spots (4, or the boss); Chain Lightning on a foe with two others
  within its reach (or the boss); Light Lance down the fullest column; Earthquake with enough on low ground; Smite and Deep Freeze on the boss,
  or the sturdiest foe at the heroes. A foe with under `SPENT` (25%) of its health is nearly done and not counted (a boss always counts).
- **Then buffs**: Haste on two or more heroes in the fight (a foe within `ENGAGED`, 2 tiles), not already hasted; Rally once three heroes are
  in the fight and none is rallied; Battle Cry the same, while their skill meters are on average no more than half full. Not for a wave's
  last stragglers.
- **A reserve**: while a help spell (other than Blink) is equipped, a harm or buff spell leaves the cheapest help spell's mana, unless the bar
  is all but full (`MANA_MAX - 0.5`).

Unset `autoSpells` casts nothing: every headless fight, every test fixture and every balance table plays exactly as before (checked by the
full suite and by `auto-cast.test.ts`).

## What it is worth (win rate, spells never vs Auto)

`node tools/auto-cast/run.mjs 30` (the greedy player of `tools/autoplay.ts`, whose new `botSpells` switch sets `autoSpells` on every fight it
starts; off by default then, on since SPELLS-RETUNE; the recruits' party, no castle, gear dressed, 30 seeds, the same seeds both ways). Cleared share and mean waves won:

| Cell | Never: cleared, waves | Auto, Heal/Meteor/Haste: cleared, waves, casts a fight | Auto, Shield/Frost/Chain |
| --- | --- | --- | --- |
| Orcs Normal, level 1 | 13%, 13.8 | 73%, 14.7, 2.9 | 53%, 14.5, 2.2 |
| Orcs Normal, level 8 | 90%, 14.9 | 100%, 15.0, 1.9 | 97%, 15.0, 1.6 |
| Undead Normal, level 12 | 17%, 11.1 | 63%, 14.6, 2.9 | 43%, 14.4, 2.4 |
| Beasts Normal, level 18 | 30%, 9.7 | 90%, 14.4, 1.8 | 93%, 14.5, 1.5 |
| Labyrinth Normal, level 35 | 0%, 0.4 | 40%, 6.8, 4.3 | 10%, 2.0, 3.2 |
| Ogre Clans Normal, level 45 | 0%, 0.1 | 0%, 1.5, 7.3 | 0%, 0.4, 5.2 |
| Orcs Elite, level 40 | 100%, 15.0 | 100%, 15.0, 1.9 | 100%, 15.0, 1.8 |
| Daily, a fresh save (30 dates) | 77%, 9.4 | 100%, 10.0, 1.7 | 100%, 10.0, 1.3 |

The spells are worth a great deal to the bot (the balance tables were measured with no spells at all, which a player tapping them never
matched): the early armies go from a coin toss to a likely clear, and a fresh save's daily from 77% to every date. **Question for the owner**:
the content was tuned against the spell-less bot, so Auto makes the game easier than those tables say (about as a player who casts well). Keep
it so (Auto plays as a good player would), or should Auto's spells be held back (fewer casts, or only help spells), or the tables re-measured
with spells cast?

**The owner's answer (SPELLS-RETUNE, 0.292):** keep Auto as smart as it is and retune the game for a player who casts. `botSpells` is now on by
default and the armies, tiers, daily, Last Stand and Calamity were retuned: `docs/notes/spells-retune.md`.

## Checks

- `test/auto-cast.test.ts`: Auto off casts nothing and plays as before (and an empty list is off); Auto on casts only the listed spells, logs
  them, keeps the gap, plays the same twice and replays from its log; heal to the hurt and not to the well; the meteor on the thickest pack and
  not on foes nearly done; the reserve; a shield before a boss's marked blow; a buff waits for the fight; `autoCast` is a `castSpell` (the same
  result as the tap on that tile) and never blows the horn.
- `node tools/auto-cast/shots.mjs` (after `npm run web`): an old save with `ultAuto` on, an army wave and the Last Stand, at 393x852, 360x780
  and 412x915: the switch on and on screen, the first spell cast by itself (Haste at 8 s, then more), no page errors, no sideways scroll.
  Screenshots `docs/samples/auto-cast-toggle-*.png`, `auto-cast-fight-*.png`, `auto-cast-stand-*.png`.
