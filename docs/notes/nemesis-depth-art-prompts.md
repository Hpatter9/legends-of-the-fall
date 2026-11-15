# NEMESIS-DEPTH: art prompts

Idea 3 (temperaments, `docs/notes/nemesis-depth.md`) is the only part of the first batch that needs new art: one symbol for each of the eight
temperaments, shown on a Council seat's corner and on a nemesis's card. Until they land, `src/temperArt.ts` uses stand-ins taken from the
Council's and the traits' own symbols:

| Temperament | Stand-in |
|---|---|
| Brute | the feud's blades |
| Schemer | the betrayal's dagger |
| Glory-hound | the duel's crossed swords |
| Coward | the fled runner |
| Zealot | Fearless |
| Oathbound | the blood-oath's hands |
| Trickster | Elusive |
| Old Hand | Scarred |

When the sheet lands, cut it into `src/art/nemesis-temper/<temper>.png` (128 x 128 each, as the traits' symbols are), point `TEMPER_ICON`
at them, and credit it in `CREDITS.md` (and the in-app credits, if it is a creator's work). The icons are bundled into game.js like the
other Council symbols, so the service worker's list does not change.

## The eight temperaments

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its villains are the Dark Council: named foes (orcs, the undead, beasts, the wildwood, the labyrinth,
ogres, the infernal host, yokai and golems) who remember the heroes. Each Council member now has a temperament, its character. This
sheet is the eight temperaments' symbols, shown small on a Council seat's corner and beside the words on a nemesis's card.

Rules for this task:
- Branch: art/nemesis-depth. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/nemesis-depth/temperaments.png. Change no other file.
- Pull request into main titled "Art: the nemesis temperaments". In the body, name the file and list the eight symbols in order.
- No text, letters, numbers, logos, watermarks or signatures. Original work only.

Open these files first and match them, so the new symbols sit among them as one set:
- art-source/expansion/nemesis-icons.png: the Council's event symbols (feud, betrayal, feast, oath and the rest).
- src/art/nemesis-traits/fearless.png and src/art/nemesis-traits/elusive.png: the traits' symbols, for the size, the outline and the
  palette.

The sheet: 1024 x 512 px, a transparent background, eight symbols in two rows of four, each centred in its own 256 x 256 cell with
clear space round it, so that each can be cut out and shown at 18 to 28 px on a phone. Dark fantasy pixel art, crisp, a 1 px dark
outline, muted gothic colours with violet, iron and blood-red accents, each symbol a single bold shape that still reads when small.
In order, left to right, top row then bottom row:
1. Brute: a spiked iron fist, clenched, cracking the ground beneath it.
2. Schemer: a hooded eye half-closed, with a thin dagger hidden behind it.
3. Glory-hound: a raised golden trophy cup with a laurel and a single drop of blood on its rim.
4. Coward: a heel running away, trailing dust, with a dropped broken spear.
5. Zealot: a burning candle in an iron holder, its flame tall and straight.
6. Oathbound: two hands clasped in a red cord knot, a drop of blood between them.
7. Trickster: a grinning jester's mask, split in two halves, light and dark.
8. Old Hand: a battered, much-dented helm with a healed scar across it.
```
