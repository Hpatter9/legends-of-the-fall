# HERO-LIVE-STATS — a hero's live stats mid-fight

The owner: "I want to be able to click on a hero mid battle so that his personal stats show up on the bottom of the screen, where the
healthbars and abilities are. Clicking off of him would bring the skills page back though. This way I could see what their stats are - like
current health, mana, stamina, exp, damage dealt, health, taken and anything else helpful like status effects."

## How it plays

In a fight (army waves, the daily, the Calamity's maps; the Last Stand by its rows):

- **A tap on one of your heroes on the board** picks them. The hero rows (portraits, bars, skill chips) give way to the hero's stats panel,
  in the same place and at the rows' own height, so the board above neither moves nor loses more of itself. The tap is forgiving: it takes
  the nearest hero whose body it falls near (each hero's reach measured on its own, so a small hero beside a big one can still be picked).
- **A tap on a hero's row** picks that hero too, unless its ultimate is full: then the tap fires it, as before (a long press still opens the
  ultimate's sheet, a chip still opens its skill's sheet).
- **Another hero** tapped on the board switches the panel to them.
- **Back to the skills:** "‹ Skills" (top right of the panel), a tap on the panel's portrait, a tap on the same hero again, or a tap on the
  empty board (or a foe). The fight's end, and a new fight, put the rows back on their own.
- **On the board** the picked hero stands in a gold ring with four brass marks, and a gold chevron bobs over their bar (the ring alone was
  hidden when foes stood in front of them; the chevron still is now and then by a damage number). The chevron and the ring's breath hold still
  for reduced motion.

## What the panel shows (all live, written five times a second)

- **Head:** the painted face, name, level, rank (when above 0), grade stars and awakening; the ultimate's charge as a small pearl bar ("Ult
  70%", "Ult Ready", "Ult at Lv 30").
- **Bars with numbers:** health; mana or stamina; a shield, with its time left, when one is up; XP into the level and what the next needs (from
  the save; left out in a run with levels of its own, the Calamity and the Last Stand).
- **This fight:** damage dealt, damage taken, healing done, kills and skills cast (the fight's tally, `fightStats.ts`, which now counts casts:
  a summon's cast counts for its caller, a foe's for no one).
- **Effects:** every ailment (burning, poisoned with its stacks, frozen, bleeding, chilled, shocked, stunned, weakened, cursed, silenced,
  feared) with its own icon from the status atlas, and every buff and harm the fight keeps on a hero (hasted, rallied, war banner, auras,
  guarding, mending, warded, hidden, just risen, frenzy, the kits' parry, vow, fury, treeform, guise, forms, charged, anchored, guardian
  angel, Scale Ward, Hymn of Dawn, lifesteal; brittle, charmed, snared, taunted, pinned, in smoke, polymorphed, bounty, condemned, turned to
  stone, suppressed, exposed, branded; "next blow crits" and "next blow misses"), each with a painted motif, its name and its seconds left.
  A tap on one says what it does in a line over the panel's foot; the next tap anywhere closes it (a tap on another effect opens that one's). Ailments come
  first, the latest first, then what helps, then what harms.
- **Fighting numbers:** Attack, Armour, AC and To hit, Blows (seconds between blows), Walk (seconds a tile), Range, Crit, Dodge and Guard (the
  share of a blow it is spared), each as the fight reads it now: haste and slow, frenzy, the kits, gear, the side's traits, the floor's twist.
  Each is compared with what the hero had as the fight began: a better number is green with ▲, a worse one red with ▼ (quicker blows and walks
  count as better), and its title says what it was.
- **Notes:** a fallen hero's "a life raises it in 4s", the run's lives left, times raised this fight, a duel and with whom, an Avenger's
  grudge, a shape's time left, a bond or rivalry and whether it is in reach now, and about how much XP this fight has earned so far (paid when
  it ends, before the mode's bonuses).

## Reading only, and its cost

`src/heroLiveRules.ts` is pure and writes nothing: the ailments are read from their fields, not through `ailmentsOf` (which folds an old `dot`
into the list), and the blow numbers are worked out afresh from the hero's profile, not through `blowStatsOf` (which caches). The test plays
the same fight twice, one read in full every tick, one left alone, and the two end identical. The page's taps only call the HUD (`pick`); the
sim is never asked to do anything.

Measured in Chromium (software rendering, 393x852, `tools/hero-live-stats/shots.mjs`, two runs): a write of the whole panel takes 0.53 to
0.63 ms, a write where nothing changed 0.03 to 0.05 ms; at five a second that is under 0.3% of the main thread. The fight's frames over four
alternating pairs of 1.5 s rounds with the panel open and closed: 40 open against 37 closed, and 73 against 68 (no measurable cost; the
software renderer here is the bottleneck either way, and the worst frame was no worse open, 385 ms against 406). A first, unalternated measure
(open first, then closed) showed fewer frames open; alternating the rounds showed that was the fight's own load as it went, not the panel.
While the panel is up, the hidden rows are not written at all.

**At full speed** the panel reads well: the bars and fight numbers move smoothly, and the effect chips' seconds tick by tenths. Nothing needs
the fight slowed for it; the one thing that is hard to catch at x3 is a short ailment (a stun of half a second comes and goes between two
writes now and then). Picking does not slow or hold the fight. If the owner would like it to, a picked hero could slow the fight to half, as
the Assault's Slow does; I have not done that.

## The Assault

The Assault's bottom (`src/assaultScene.ts`) is different: a tap on the field gives the chosen platoon an order, and a tap on a portrait
chooses, fires the ultimate, flies the camera or (held) opens the platoon card, so a tap cannot also mean "show stats". There, the order row
has a seventh button, **Stats**, for the chosen platoon's hero: the same panel takes the place of the order and spell rows over the platoon
portraits (its back control says "‹ Orders"). Choosing another platoon switches the panel to its hero; All, or none, closes it. The numbers
are the page's copy of the worker's battle (`mirror.ts`), so they are as live as the field; the tally counts the hero's own blows, heals and
casts (its soldiers' are the platoon's, not the hero's). The field has no ring for the picked hero: the chosen platoon is already lit on the
field and the camera goes to it.

## Files

- `src/heroLiveRules.ts`: `pickable`, `pickOnTap`, `pickNow`, `nearestMark` (the tap), `statNumbers` and `statLines` (the numbers and their
  marks), `effectsOf` and `AILMENT_WORDS` (the effects), `liveOf` (the whole panel), `leftWords`, `shortNum`.
- `src/heroLive.ts`: `HeroLivePanel`, the panel (`fhLive`, its parts `fhl*` in `fightHud.css`), each part written only when its words change.
- `src/fightHud.ts`: `pick`, the opening numbers (`base`), the panel in the rows' place; `main.ts` (`heroAtTap`, the board's tap in
  `dragEnd`, `statOf`, `xpOf`, the sprites' `picked`); `standView.ts` (the ring); `render/unitView.ts` (`picked`: the ring and chevron).
- `src/sim/fightStats.ts`: `HeroStat.casts`.
- `test/hero-live-stats.test.ts`; `tools/hero-live-stats/shots.mjs` (the ordinary fight's pictures and the cost) and `assault.mjs` (the
  Assault's), writing `docs/samples/hero-live-*.png`.

The panel sits in the HUD as the rows do: it is not a card or a menu, so it is built as the rows are rather than with `ornateMenu`, in their
wood-and-brass dress.
