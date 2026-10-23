# Backlog

Ideas the owner has asked for, kept until there is room (or PixelLab generations) to do them. Take an item off this
list when its work is merged.

## When there are more PixelLab generations

### The tavern comes alive

The heroes in the tavern hall (`src/tavern.ts`, `src/render/tavernSpots.ts`) should feel alive, not stand about.
New animations, drawn in each hero's own style:

- **Sitting** in the chairs and on the benches, at the tables and by the hearth.
- **Chatting** with each other: two or three heroes at a table, turning to whoever speaks.
- **Drinking** together: raising tankards, a toast, one nodding off.
- **Darts** at a board on the wall: a throw, a cheer or a groan.
- **Fighting**: a scuffle that starts over nothing and ends in a laugh (no one hurt, nothing flashes).

The spots in `tavernSpots.ts` would gain a kind (`seat`, `bar`, `darts`, `brawl`) so heroes pair up where the props
are. The cost to estimate first: frames per hero per action times 45 heroes, so it may start with shared props
(tankards, darts) and a few poses each.

## Character and humour

The owner wants the game to have more character and life, with humour, maybe bringing **Duchess** over from Chronos.

- **Duchess the goat.** In Chronos she is the town goat and its running joke: the star of the loading screen
  (`drawDuchess`, her `amble`, `chew` and `wander` gags, her "Mehh."), the cutscenes and the founders' lines. Her
  sprite is Little-Town `src/renderer/art/eventprops/goat.png` (whtdragon's white goat; credit it in `CREDITS.md`).
  Here she could wander the camp and the tavern, nibble a hero's cloak, turn up in the loading screen, or sit on a
  tile at the board's edge watching the fight and bleating at a big hit.
- **Hero quips.** A line or two each in the heroes' own voices: when hired, when placed, after a win or a loss,
  and banter between heroes who share a trait.
- **Funny text.** Foes with staffing problems (as in Chronos's villains), recap lines, loading tips with jokes,
  shop and chest blurbs.

## Cinematics

Scenes not built yet (the pilots, The Road Begins and The Ashen Road, are in; each of these is a table entry in
`src/sim/sceneScripts.ts` and a call at its moment; pitches and the player are in `docs/notes/cinematics.md`).

- First army cleared: the Orc Warlord's last toll.
- Each Calamity boss, maps 2 to 6: the Thorn Warden, Malphas, Hrungar, Vorgrath, Karnok.
- The Calamity's end: Karnok falls, the sky un-reddens.
- A hero awakened: one shape, filled per hero.
- A hero's first unlock: the hero walks in, the others make room.
- A tower milestone: the tower opens at floor 10, then floors 25 and 50.
- The daily's boss: "Today's calamity is brought to you by...".
- The first summon in the hall.
- A castle upgrade: the Chapel, the first Library.
- A boss's second form: a three-second cut-in on the phase change.
- First elite met.
- First loss.
- Ascension 1 opens.
- Each army's first boss (nine).
- Music or a sting per scene; a "never show cinematics" setting if the owner wants one; Duchess wandering through scenes once the humour branch lands (`claude/humour`; the scene format has a `duchess` role ready).
