# BENCH-TITLES — Pull a hero back to the bench; every hero a longer title

Branch: `claude/bench-titles` (from main 0.232.0). Two owner asks:

1. "Make it easier to pull a hero back to the bench. Dragging them down to it highlights the bench box so it's obvious."
2. "Heroes now have name, I like that. But they should also have a longer title. Like Minjun, Wolfsbane Bard. The names can stay
   short for small boxes though, like the battle screens." (The example mixed two heroes: Minjun is the Arc Blade, Lovell the Wolf
   Bard. Lovell takes "Wolfsbane Bard", the owner's own words; Minjun is the "Spark-Forged Blade".)

## Back to the bench (`src/benchDrop.ts`, new; hooks in `src/main.ts`, `src/index.html`)

- **The drop area is the whole bottom panel** (`#panel`: the bench strip, the hero bar, the traits line and the bottom buttons), the
  same width out to `RETURN_REACH` (22 px) either side and above its top edge, and everything below it (a finger past the bottom, over
  the gesture bar, still counts): `inReturnZone`. Over it, a placed hero let go goes back (`takeBack`, which calls the sim's
  `unplace`), even where a deploy tile lies under the panel. Before, the hero went back only over the panel and only where no free
  tile was under the finger.
- **The flick:** a hero on the board dragged quickly downwards and let go before the bench counts too (`flickToBench`): over the
  drag's last 140 ms (`FLICK_WINDOW_MS`) it came down at least 36 px (`FLICK_DROP`) at 0.7 px a ms or more (`FLICK_SPEED`), more down
  than sideways, and carried on for 220 ms (`FLICK_CARRY_MS`) it would be in the panel. A slow drag to a lower tile still places the
  hero there. The drag keeps a short trail of points for it (`Drag.trail`, `pushTrail`).
- **Order on a drop:** a merge first (a matching bench card or a matching hero under the finger, MERGE-TWO, as before), then the
  recycle area (a bench card), then the return, then a tile.
- **The highlight:** while a hero that stands on the board is dragged, the panel shows a dashed gold outline and a gold pill on its top
  edge, "↓ Drag here for the bench" (`#panel.returnCan`, `#returnTag`); with the finger over the area the outline turns solid and
  glowing with a soft gold wash, "↓ Return to bench" (`#panel.returnHot`). Over a matching card the merge's glow shows and the return's
  does not. A steady glow that eases in over 0.15 s, no flashing; reduced motion drops the easing. It goes out when the drag ends
  (`endDrag` calls `markReturn(null, false)`). A bench hero not on the board shows nothing.
- **Sound and animation:** there was no return sound or animation; none was added. The hero leaves the board as it did.

## Titles (`src/sim/heroNames.ts`, `src/heroTitleView.ts`, new)

- `HeroName.title`: every hero's epithet, fitting its class, kit and lore, all 45 different, 24 letters at most ("Name, Title" 32 at
  most). Display only, as the names are.
- `heroTitle(kind)` now gives "Name, Title" ("Kwame, Shield of the Dawn"); `heroEpithet(kind)` the title alone; the old
  "Name · Class" label is `heroClassLabel(kind)` (used where it was in the small places: the hero bar's tooltip and accessible label,
  the party strip's remove button, the "Nearest:" recruit lines, the starter pick, the locked roster rows, the recruitment bars'
  labels). Anything that is not a hero still gets its unit name.
- `titleLine(kind, tag, cls, stack)` (`src/heroTitleView.ts`) builds the heading: the name, ", " and the title as spans; stacked, the
  title sits on a line under the name at 0.58 of its size, in italics (the comma hidden from sight; the text and the accessible label
  still read "Name, Title").
- **Where "Name, Title" shows (stacked):** the dossier's heading; the summon reveal and unlock scene (`firstReveal`); the tarot card of
  a new hero in a draw (`pullInfo`, a join only; shard cards keep the name); the hall's summon card; the codex entry; the full-artwork
  viewer; the end recap's MVP row (and the MVP face's tooltip in the wave strip).
- **The class stays visible:** the class (the unit's name, "Knight") that the old "Name · Class" headings carried now leads the line
  under them: the dossier's and the codex's "Knight · Front-liner · role", the reveal's "Kitsune · X · Yokai · Trickster" line, the hall
  card's "Knight · role", and a small line in the artwork viewer.
- **The short name stays** on the hero bar, the bench, the board, the wave card notes, the XP rows, the recap's other rows, the roster
  cards (name with the class under it: a tile two columns wide has no room for 24 more letters) and the party picker's cards (the
  same: small tiles with a 56 px portrait).

## Tests

- `test/hero-titles.test.ts` (new): every hero has a title, all different, not its name or bare class; `heroTitle` is "Name, Title";
  24 letters at most (32 with the name) for the reveal at 360 px; plain words, British spelling; non-heroes keep their unit name.
- `test/bench-drop.test.ts` (new): the wide area (the middle, the bottom bar, past the bottom, just above the panel, not the board);
  the flick (fast down, a little sideways; not slow, short, sideways, upwards, or stopping short of the bench); the trail stays short.
- `test/heritage-looks.test.ts`: the assertion that `heroTitle` is "Name · Class" now checks `heroClassLabel` (the owner's new ask
  gave `heroTitle` the long title).

## Browser checks (`tools/bench-titles/shots.mjs`, new)

At 393x852, 360x780 and 412x915, in an army run's deploy: a placed hero picked up outlines the panel; dragged slowly into the bench
it lights up with "Return to bench" (`docs/samples/bench-titles-drag-*.png`); let go, it is off the board and the light is out; let go
over the bottom buttons' row it goes back; a quick flick (110 px down in five moves 12 ms apart, sent in the page as a phone sends them, let go 50 to 126 px above the panel) sends it back; a slow move on the board
keeps it there; a fielded knight dragged onto its twin's bench card merges (the merge's card lit, the return not;
`bench-titles-merge-393x852.png`). The summon reveal with "Kohaku, Amber Fox of Many Faces" at each size
(`bench-titles-reveal-*.png`), and at 360 the long ones (Asterion, Aram, Kenji) fit in two lines (`bench-titles-reveal-long-360x780.png`).
The dossier and the full-artwork viewer at 393x852 (`bench-titles-dossier-393x852.png`, `bench-titles-artwork-393x852.png`): "Selam, Lantern of Mercy", "Cleric · ..." under it; the roster card
keeps "Selam" with "Cleric" under it. No page errors.

## Every hero's title

| Hero | Name | Title | Shown as |
| --- | --- | --- | --- |
| Knight (`knight`) | Kwame | Shield of the Dawn | Kwame, Shield of the Dawn |
| Samurai (`samurai`) | Kenji | Sword of the Eastern Sea | Kenji, Sword of the Eastern Sea |
| Kunoichi (`kunoichi`) | Ayame | Smoke on the Rooftops | Ayame, Smoke on the Rooftops |
| Archer (`archer`) | Natsu | Eye of the High Crags | Natsu, Eye of the High Crags |
| Fire Wizard (`wizard`) | Ravi | Kindler of Pyres | Ravi, Kindler of Pyres |
| Peasant (`peasant`) | Minh | Banner of the Commons | Minh, Banner of the Commons |
| Ninja Monk (`ninjaMonk`) | Jiro | Fist of the Quiet Vow | Jiro, Fist of the Quiet Vow |
| Wanderer (`wanderer`) | Rhys | Brewer of the Long Road | Rhys, Brewer of the Long Road |
| Lightning Mage (`lightningMage`) | Malia | Herald of the Storm | Malia, Herald of the Storm |
| Kitsune (`kitsune`) | Kohaku | Amber Fox of Many Faces | Kohaku, Amber Fox of Many Faces |
| Karasu Tengu (`karasu`) | Kurogane | Iron-Beaked Raider | Kurogane, Iron-Beaked Raider |
| Yamabushi Tengu (`yamabushi`) | Kazan | Master of the Gale | Kazan, Master of the Gale |
| Werewolf (`werewolf`) | Vuk | Hunter of the Full Moon | Vuk, Hunter of the Full Moon |
| Minotaur (`minotaur`) | Asterion | Horn of the Labyrinth | Asterion, Horn of the Labyrinth |
| Satyr (`satyr`) | Dorion | Piper of the Revel | Dorion, Piper of the Revel |
| Gorgon (`gorgon`) | Xanthe | Lady of the Stone Gaze | Xanthe, Lady of the Stone Gaze |
| Samurai Commander (`samuraiCommander`) | Hideo | Holder of the Bridge | Hideo, Holder of the Bridge |
| Paladin (`paladin`) | Karim | Bearer of Wounds | Karim, Bearer of Wounds |
| Cleric (`cleric`) | Selam | Lantern of Mercy | Selam, Lantern of Mercy |
| Druid (`druid`) | Isla | Voice of the Old Oaks | Isla, Voice of the Old Oaks |
| Barbarian (`barbarian`) | Eirik | Red Axe of the North | Eirik, Red Axe of the North |
| Ranger (`ranger`) | Inti | Warden of the Snares | Inti, Warden of the Snares |
| Warlock (`warlock`) | Zofia | Black-Pact Warlock | Zofia, Black-Pact Warlock |
| Illusionist (`illusionist`) | Luana | Weaver of Mirrors | Luana, Weaver of Mirrors |
| Gunslinger (`gunslinger`) | Maeve | Deadeye of the Marches | Maeve, Deadeye of the Marches |
| Shambler (`shambler`) | Hobb | the Unburied | Hobb, the Unburied |
| Rifle Bot (`rifleBot`) | Rook-7 | Brass Sentinel | Rook-7, Brass Sentinel |
| Mercenary (`mercenary`) | Kian | Bane of the Mighty | Kian, Bane of the Mighty |
| Mummy (`mummy`) | Seneb | Binder of the Sands | Seneb, Binder of the Sands |
| Buccaneer (`buccaneer`) | Tiago | Hook of the Salt Isles | Tiago, Hook of the Salt Isles |
| Wolf Bard (`wolfBard`) | Lovell | Wolfsbane Bard | Lovell, Wolfsbane Bard |
| Beastmaster (`beastmaster`) | Itzel | Caller of the Grey Pack | Itzel, Caller of the Grey Pack |
| Kraken Mate (`kraken`) | Skerry | Child of the Undertow | Skerry, Child of the Undertow |
| Lancer (`lancer`) | Bataar | Thunder of the Steppe | Bataar, Thunder of the Steppe |
| Reaper (`reaper`) | Vesper | Keeper of the Last Hour | Vesper, Keeper of the Last Hour |
| Time Witch (`timeWitch`) | Adaeze | Starlit Hourglass | Adaeze, Starlit Hourglass |
| Arc Blade (`arcBlade`) | Minjun | Spark-Forged Blade | Minjun, Spark-Forged Blade |
| Dread Pirate (`dreadPirate`) | Harrow | Twice-Drowned Captain | Harrow, Twice-Drowned Captain |
| Siege Bot (`siegeBot`) | Bastion | Clocktower Cannon | Bastion, Clocktower Cannon |
| High Priestess (`priestess`) | Linnea | Halo of the Undying | Linnea, Halo of the Undying |
| Queen Dragoon (`dragoon`) | Tiziri | Crowned Wyvern Rider | Tiziri, Crowned Wyvern Rider |
| Juggernaut (`juggernaut`) | Kerem | the Marching Wall | Kerem, the Marching Wall |
| Great Sage (`sage`) | Seydou | Reader of the Stars | Seydou, Reader of the Stars |
| Demon Swordsman (`demonSwordsman`) | Aram | Host of the Hungry Steel | Aram, Host of the Hungry Steel |
| Tyrant (`tyrant`) | Edmund | the Unbending Verdict | Edmund, the Unbending Verdict |
