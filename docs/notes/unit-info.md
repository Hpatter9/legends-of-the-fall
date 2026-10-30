## The unit's info card (UNIT-INFO)

The owner asked: "Let me click and hold on a unit in between waves to get a run-down on skills and stats too."

**What it does.** Between waves (the deploy screen before any fight, so the break between an army's, the daily's, the spire's and the
Calamity's waves too; and the Last Stand's deploy and its breaks), a finger resting on a unit for `HOLD_MS` (400 ms) opens its info card.
A gold ring fills round the finger while it rests; it shows only after `RING_DELAY_MS` (120 ms), so an ordinary tap shows nothing. A finger
that strays `HOLD_SLOP` (8 px, the drag's own threshold) lets the press go, and the drag, pan or tap carries on exactly as before. Two
fingers (a pinch) let it go too. It works on any unit on the board (heroes, foes, bosses, summons, Duchess, the Last Stand's King), on a bench
card and on a Last Stand tray card.

The card is the fight's skill sheet (`.fhSheet`, `.fsCard`) at the bottom of the screen, over the bottom panel, scrollable, closed with its
× or a tap outside it. It only reads: the battle is not changed (a bench hero not on the board is read from a unit made on a scratch copy of
the battle, `previewUnit`), and in a Stand break the break's clock waits while the card is open.

- **Heroes:** portrait (its rank and grade), name and bench title, kind, class and role; level, stars, awakened steps; health with a bar;
  the pool (`Mana: 20/100 MP`, `Stamina: 19/60 SP`), attack, defence, range (shoots, splash), the time between blows and a step (with the
  trait and the floor's twist pace, the gear's attack and move speed, the Stable), climb or flies, crit and dodge where it has them, a shield
  if it starts behind one; its traits and their tiers; its equipment (the castle's pieces with rarity and level, the run's gear, gear
  abilities; there is no gear wear on main); then Skill 1, Skill 2 (marked locked, "Opens at level 10") and the Ultimate (locked, "Opens at
  level 30"; it costs no pool, its own meter starts each fight `ULT_FILL.START`% full), each with what it does, cost, cooldown, strength, cast
  time, a revive face, and its tier lines, all from the fight HUD's `sheetOf` (`fightHudRules.ts`), so the kit data is the one source; and
  its passive.
- **Foes and bosses:** name and epithet (elites, the Calamity's heralds), Foe / Boss / Tower elite / Calamity herald, its family (from its
  look: Werewolf, Orc, Undead, Golem, Yokai ...: `familyOf`) and role; health, attack, defence (as boosted for this wave), range, blows and
  steps at the army tier's pace, climb, crit, dodge; the codex's lore line; its skill, ultimate and passive; a boss's second form when it has
  one armed (`PHASE2`: at what health, the line it shouts, how much harder it hits, heals, shields, haste, the adds it calls, the skill and
  ultimate it takes up, its new passives: `phaseLines`); and the codex's weaknesses and tips (`tipsOf`).
- **Summons** say who called them; **the King** that his fall ends the Last Stand; **Duchess** her title.

**Files.** `src/unitInfoRules.ts` (pure: `infoOf`, `previewUnit`, `phaseLines`, `familyOf`, `gearLines`, `holdBroken`, `HOLD_MS`,
`HOLD_SLOP`, `RING_DELAY_MS`), `src/unitInfo.ts` (`HoldPress`: the ring and the timer; `UnitInfoCard`: the sheet), `src/unitInfo.css`
(added to the page's CSS in `build.mjs`), `test/unit-info.test.ts`. Hooks: `src/main.ts` (`unitAtScreen`, `openInfo`, `openBenchInfo`; the
hold started on the canvas's and the bench cards' pointerdown in a deploy, moved and cancelled with the drag), `src/standView.ts` (`unitAt`,
`openInfo`; the field and the tray cards; the break held while the card is open). Reduced motion: the ring shows whole at once, unfilled
by animation. Nothing flashes: the ring fades in once and the card opens without an effect.

**Checks.** `node tools/unit-info/shots.mjs` (an army's last wave at 393x852, 360x780, 412x915: real holds on a hero, a caster, a bench
hero with its skill 2 and ultimate locked, a foe and the boss; each card fits the screen and closes on a tap outside; no unit changed; a
press that moves opens nothing) and `node tools/unit-info/stand.mjs` (the Stand: a hero on the field and a tray card in the deploy, a hero
in a break; the break's clock waits while the card is open and runs once it closes). Screenshots: `docs/samples/unit-info-hero.png`,
`-caster`, `-locked`, `-foe`, `-boss`, `-ring` (and `-360`, `-412`), `-stand-deploy`, `-stand-break`.
