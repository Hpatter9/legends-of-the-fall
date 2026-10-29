# HERITAGE-LOOKS — A varied cast, and every hero named

Branch: `claude/heritage-looks` (from main 0.222.0). The owner's asks: "Is there a way to add more ethnicity to the game"
(they chose skin-tone variety on the existing heroes' sprites and portraits, plus new painted artwork done from a prompt:
"Nothing particular, just want more cultures represented in the game"), and then "I also want to give all the heroes
names. So they feel more unique and less generic".

## What changed

- **Twelve human heroes' battle sprites are re-toned** (front and rear sheets, every grade, so the board, the hero bar,
  the bench and every `portrait()` cut from the sheet follow). Only skin changes (and hair for two); outlines, shading
  structure, cloth, armour and alpha are untouched, pixel for pixel. With the Mercenary and the Beastmaster, who were
  already drawn olive-tan and brown, 14 of the 30 people among the heroes now have a non-light look.
- **Every hero (all 45) has a personal name**, shown as "Name · Class" wherever a hero is presented: the company card
  (name, the class small under it), the dossier, the hero strip, the summon reveal and its tarot cards, the hall's recruit
  card, the codex, the starter pick, the rank-up and awakening card, the party picker, the post-fight stats (MVP) and XP
  rows, the wave recap's MVP and XP rows, and the grade-up notice. The hero bar shows the name alone; the class is in the
  tile's tooltip and its accessible label. Ids, save keys and the sim are unchanged: the name is display only.
- **The painted art** (`src/art/heroes/*.webp`) still shows the old looks. All twelve re-toned heroes now clash with
  their painting, so they head the prompt for new paintings: [heritage-art-prompt.md](heritage-art-prompt.md).

## Choosing the cast

- **People only.** Spirits, beasts, the undead and machines (`NOT_HUMAN`: Kitsune, both Tengu, Werewolf, Minotaur, Satyr,
  Gorgon, Shambler, Rifle Bot, Mummy, Wolf Bard, Kraken Mate, Reaper, Dread Pirate, Siege Bot) keep their looks; their names
  fit their lore. Foes are out of scope.
- **Spread over roles, not mapped to them.** Re-toned: two tanks (Knight, Paladin), melee (Buccaneer, Queen Dragoon), a
  ranged hunter (Ranger), casters (Fire Wizard, Illusionist, Time Witch, Great Sage, Lightning Mage), a healer (Cleric),
  militia (Peasant). The darker tones are on heroes, healers, sages and leaders, not on the brutes or the dark-magic
  roles; the Barbarian, Warlock and Tyrant keep their drawn looks.
- **Both starter packs** carry variety from the first fight: Sword and Shield has Kwame (Knight), Blade and Spell has
  Minh (Peasant) and Ravi (Fire Wizard).
- **Heroes whose gear is plainly Japanese** (Samurai, Kunoichi, Archer, Ninja Monk, Samurai Commander) stay Japanese; the
  Peasant's straw hat reads as a Vietnamese nón lá.
- **Hair** is redrawn only where it would read wrongly and the tool can find it cleanly: the Knight's blond to black,
  the Paladin's blond to dark brown. Silver, white and teal hair (Time Witch, Lightning Mage, Great Sage, Queen Dragoon) is
  fantasy and suits any tone. The High Priestess (blond hair against a gold mitre, halo and staff) and the Gunslinger (red
  hair against a red coat) were left as drawn, because no clean hair mask exists for them.
- **Names** are real, everyday names from each heritage, short (9 letters at most, most 4 to 6), easy to read, and all
  different; no famous people. Mythic names are used only for the mythic beings (Asterion the Minotaur).

| Hero | Name | Heritage | Battle sprite tone / hair |
|---|---|---|---|
| Knight (`knight`) | Kwame | Ghanaian (Akan) | **deep brown**, black hair |
| Samurai (`samurai`) | Kenji | Japanese | as drawn |
| Kunoichi (`kunoichi`) | Ayame | Japanese | as drawn |
| Archer (`archer`) | Natsu | Japanese | as drawn |
| Fire Wizard (`wizard`) | Ravi | Indian (Tamil) | **brown** |
| Peasant (`peasant`) | Minh | Vietnamese | **warm tan** |
| Ninja Monk (`ninjaMonk`) | Jiro | Japanese | as drawn |
| Wanderer (`wanderer`) | Rhys | Welsh | as drawn |
| Lightning Mage (`lightningMage`) | Malia | Samoan | **brown** |
| Kitsune (`kitsune`) | Kohaku | a Japanese fox spirit | not a person: as drawn |
| Karasu Tengu (`karasu`) | Kurogane | a Japanese crow tengu | not a person: as drawn |
| Yamabushi Tengu (`yamabushi`) | Kazan | a Japanese mountain tengu | not a person: as drawn |
| Werewolf (`werewolf`) | Vuk | a Serbian wolf legend | not a person: as drawn |
| Minotaur (`minotaur`) | Asterion | Cretan myth | not a person: as drawn |
| Satyr (`satyr`) | Dorion | Greek myth | not a person: as drawn |
| Gorgon (`gorgon`) | Xanthe | Greek myth | not a person: as drawn |
| Samurai Commander (`samuraiCommander`) | Hideo | Japanese | as drawn |
| Paladin (`paladin`) | Karim | Lebanese | **olive**, dark brown hair |
| Cleric (`cleric`) | Selam | Ethiopian (Amhara) | **deep brown** |
| Druid (`druid`) | Isla | Scottish | as drawn |
| Barbarian (`barbarian`) | Eirik | Norwegian | as drawn |
| Ranger (`ranger`) | Inti | Quechua (Peruvian Andes) | **brown** |
| Warlock (`warlock`) | Zofia | Polish | as drawn |
| Illusionist (`illusionist`) | Luana | Afro-Brazilian | **brown** |
| Gunslinger (`gunslinger`) | Maeve | Irish | as drawn |
| Shambler (`shambler`) | Hobb | English folk tale | not a person: as drawn |
| Rifle Bot (`rifleBot`) | Rook-7 | a clockwork designation | not a person: as drawn |
| Mercenary (`mercenary`) | Kian | Persian (Iranian) | as drawn (already olive-tan, dark hair) |
| Mummy (`mummy`) | Seneb | Ancient Egyptian | not a person: as drawn |
| Buccaneer (`buccaneer`) | Tiago | Cape Verdean | **brown** |
| Wolf Bard (`wolfBard`) | Lovell | an old English name meaning wolf cub | not a person: as drawn |
| Beastmaster (`beastmaster`) | Itzel | Maya (Mexican) | as drawn (already brown, black hair) |
| Kraken Mate (`kraken`) | Skerry | sea lore (a skerry is a sea rock) | not a person: as drawn |
| Lancer (`lancer`) | Bataar | Mongolian | as drawn |
| Reaper (`reaper`) | Vesper | Latin, the evening | not a person: as drawn |
| Time Witch (`timeWitch`) | Adaeze | Nigerian (Igbo) | **deep brown** |
| Arc Blade (`arcBlade`) | Minjun | Korean | as drawn (fully armoured) |
| Dread Pirate (`dreadPirate`) | Harrow | a drowned crew's legend | not a person: as drawn |
| Siege Bot (`siegeBot`) | Bastion | a siege engine's designation | not a person: as drawn |
| High Priestess (`priestess`) | Linnea | Swedish | as drawn |
| Queen Dragoon (`dragoon`) | Tiziri | Amazigh (Moroccan) | **olive** |
| Juggernaut (`juggernaut`) | Kerem | Turkish | as drawn (fully armoured) |
| Great Sage (`sage`) | Seydou | Malian | **deep brown** |
| Demon Swordsman (`demonSwordsman`) | Aram | Armenian | as drawn (fully armoured) |
| Tyrant (`tyrant`) | Edmund | English | as drawn |

## How the sprites are re-toned (`tools/heritage/`)

The Resonance sheets are generated pixel art with ~100,000 colours a sheet, and their skin shares exact colours with
cream cloth (the Cleric's robe, the Knight's tabard), so no colour window finds the skin on its own.

- `recolour.py`: each hero has a few tight boxes round its skin (the face, bare hands, arms or legs) on one or two frames
  (`heroes.json`). Skin-like pixels in those boxes teach a nearest-colour test in Lab; skin-like pixels elsewhere on those
  frames (more than 6 px from a box) are the counter-examples. Every skin-like pixel of every frame of the hero's sheets is
  then skin when it is nearer to a taught skin colour. Lone pixels are dropped (fewer than 2 skin neighbours), gaps ringed
  by skin filled, parts under 6 px dropped, and the skin spreads up to 3 px into skin-like pixels that are not hair (the
  shaded rim of a cheek, a nostril). Each skin pixel then takes the shade of the tone's 5-stop ramp at its own lightness
  (between the 3rd and 99th percentile of the taught skin's lightness), so the shading structure is kept. Hair works the
  same way with its own boxes, window and ramp, and must form parts of 40 px or more (so gold trim is never taken for
  hair). Writes `src/art/units/<sheet>_<tone>.png` next to the source; `--preview DIR` writes the mask over each sheet.
- `src/sim/heroLooks.ts` is the table the tool reads (`TONES`, `HAIRS`, `HERO_LOOKS`, `NOT_HUMAN`): change a hero's
  tone there, run `python3 tools/heritage/recolour.py <hero>`, then `node tools/resonance/apply.cjs --art-only` (a new
  hero needs its boxes in `heroes.json`; `--preview` shows whether the mask holds).
- The tool lists each re-toned file in `tools/heritage/sheets.json`; `tools/resonance/apply.cjs --art-only` (which writes
  the generated `src/render/resonanceArt.ts`, and with `--art-only` touches nothing else) imports the re-toned file under
  the source sheet's key. So the re-toned sheets are drawn in the sources' place (layout, rear view, grades' forms and
  portraits follow), as data URLs in `game.js` like every other sheet, and **the twelve source sheets are no longer
  bundled**: they stay in `src/art/units/` as the tool's input. A sheet where no skin shows (the Cleric's back) is left
  as it is and bundled from its source; no copy is kept. (`atlas.cjs` now loads `sharp` only when it packs a sheet, so
  `apply.cjs` runs without it.)
- `strip.py` writes the before/after strips; `shots.mjs` the browser screenshots and checks.
- `import-art.py` brings in the painted art the prompt asks for (`art-source/heritage-heroes/<id>.png` and
  `<id>-cutout.png` to `src/art/heroes/<id>.webp` and `<id>-portrait.webp`, the gallery's sizes and settings).

The names: `src/sim/heroNames.ts` (`HERO_NAMES`, `heroName`, `heroTitle`).

**Size:** the re-toned sheets replace their sources in the bundle (23 sheets swapped; the Cleric's back is drawn from
its source), so `game.js` does not grow for them: the 23 re-toned PNGs are 9.05 MB against their sources' 9.32 MB.

## Checks

- `npm run typecheck`: passes.
- `npm test -- heritage`: `test/heritage-looks.test.ts` (every re-toned hero is a real human hero with a known tone and
  hair; the tool and the table name the same heroes; every sheet the hero is drawn from has its re-toned file, the same
  size as the source, holding every frame, and bundled in its place; every hero has a unique one-word name of 9 letters
  at most that is not its class; `heroName` / `heroTitle`).
- Full `npm test`: 1432 tests, 1432 pass, 0 fail.
- `npm run web`, then `node tools/heritage/shots.mjs` at 393x852, 360x780 and 412x915: every roster card's name and every
  hero bar name fits its tile, the bar shows "Kwame" with "Kwame · Knight" in the tooltip, no page errors.
- Screens: [home overlook](../samples/heritage-home.png) ([its party, enlarged](../samples/heritage-home-party.png)), [roster](../samples/heritage-roster.png)
  ([360](../samples/heritage-roster-360.png), [412](../samples/heritage-roster-412.png)),
  [dossier](../samples/heritage-dossier.png), [deploy](../samples/heritage-deploy.png),
  [fight and hero bar](../samples/heritage-fight.png) ([the board, enlarged](../samples/heritage-fight-zoom.png)) ([360](../samples/heritage-fight-360.png),
  [412](../samples/heritage-fight-412.png)); [all twelve before and after](../samples/heritage-before-after.png), and one
  strip a hero (`docs/samples/heritage-<hero>.png`: idle, attack and hurt, and the rear view, as drawn and re-toned).

## For the owner

- The tone, hair and name choices are a first cast; any of them is one line to change.
- The painted art needs the ChatGPT pass before the menus match the sprites.
