# Fixing main after the Mythic heroes

The phone build (`pages.yml`) stopped publishing because `npm test` had 33 failures on main (`87579505`). They came in with
0.397.0, the five hidden Mythic heroes (Vael, Astrax, Ilyra, Orrun and Nyxara; [mythic-heroes.md](mythic-heroes.md)), and one came
from 0.396.0's livelier tavern. This branch (`claude/fix-main`) gives the Mythics what every hero needs, in the shape the tests
ask for, fixes the tavern's looping brightness properly, and adds Mythic exceptions only where the owner's design for them differs:
not pulled ("no tiers, no rates"), earned by content, and one a squad.

## What the Mythics were missing (content)

- **Their own painted leads.** Every cell of the ability atlases 0 to 10 already belongs to a skill or spell, and the move sheets
  in `art-source/heroes-20/icons` are reserved for the twenty heroes' own moves, so `tools/mythics/ability-art.py` cuts one strong
  frame of an existing painted spell sheet (`art-source/spell-fx`) for each Mythic's skill 1 and ultimate into a new
  `src/art/fx/abilities/atlas-11.png` (ten cells; nothing repainted) and adds their catalogue rows. `abilityArt.ts` loads it.
- **Signatures** for those ten (`signatures.ts`, `individualReleases.ts`): each leads with a strip no other skill leads with, and
  no cast layer is shared with another hero or foe. They left `KIT_LOOKS` (a skill with its own look must). Skills 2 and 3 keep
  their borrowed, tinted looks as before.
- **Effects, elements, chips:** `SKILL_FX` entries for the five skill 1s, `SKILL_ELEMENT` entries, and one-word chip names
  (`CHIP_NAMES`, e.g. Saint’s Spear is "Spear").
- **Level 5 steps:** `src/sim/kits/lv5.ts` re-written by `node tools/skills/lv5.mjs --write` (the probe gives the fifteen Mythic
  skills `pow`; nothing else changed).
- **Books:** Vael reads manuals, Nyxara grimoires, Ilyra and Orrun hymnals, Astrax bestiaries.
- **Legacy perks:** Black Sun, Stellar Core (attack), Unburied Mercy (health), Emerald Heart, Unwritten Hour (shield).
- **Lines:** three lines for each of the eight moments (`quipData.ts`), two taunt replies each (`nemesisLines.ts`), six heir
  names each (`heirNames.ts`), story ages and ageless words (`dynastyWords.ts`), and `docs/lines/new-lines.json` brought level with
  the code (their quips, codex stories, the trial aspects' lore and their awakening and joining scenes).
- **Not people:** the five are ageless legends, so they join `NOT_HUMAN` (never re-toned; they keep their own art).
- **Trial aspects' passives:** the recruit's passive works through its own hooks, which answer to the hero alone, so the trial
  foe fought by a passive that did nothing. Each aspect now has a small echo: Vael sunders 12 armour, Astrax hits 20% harder from
  afar, Ilyra mends an ally every 4 s, Orrun returns 15% of melee blows, Nyxara slips 12% of blows. Only the trial fights change.
- **Quest words:** every part of each chain has its own going and hand-in line, and each trial its own offer, going and hand-in
  (they were shared five ways, and each part's offer was also its going line). British spelling throughout.
- **Quest pay:** paid by the star table, the five chains took quest stones to 617 against the cap of 600. Like the hero tales, a
  Mythic's chain is now paid as written (`isMythicQuest`, `rewardOf`): 1,200 crowns and 2 stones a part (the tales' size), the
  legend at the end. Quest stones are back under the cap.

## Rules fixed in code

- **Pulls:** an owned Mythic could come up in an ordinary pull (the draw takes owned content heroes for rank shards). The design
  says Mythics never come from pulls, so `drawKind` leaves them out. Only saves that own a Mythic draw differently.
- **The tavern's brightness loop** (`paintedTavern.css`, from 0.396.0): the hearth's warmth and the supper steam looped their
  opacity. The warmth now swells in size at a steady opacity and each steam wisp grows, rises and thins by shape alone. Reduced
  motion and battery saver still stop or hide them as before.

## Tests changed, and why

- `class-heroes`: the new traits' two-to-five count leaves Mythics out, as `traits` and `more-heroes` already did (one a squad, so
  a Mythic adds at most one to a trait).
- `coming-tune`: the balance sweep's pool is the roster less the Mythics (a random five could hold two; one a squad).
- `goals-audit`: the content heroes are the ten tale heroes and the five Mythics, each Mythic's trial quest on the board (earned by
  content); stronger than before.
- `hero-shards`: ten tale heroes plus five Mythics are content, none of the Mythics pullable (earned by content).
- `meta`: in an all-owned pull test no Mythic ever comes up and the other 54 are as likely as each other (no tiers, no rates).
- `party`: each Mythic joins a party with four ordinary heroes, and two together are refused (one a squad).
- `quest-pay`: Mythic chains pay as written, like the tales (earned by content).
- `hero-kits`: the pool count is 21 mana and 38 stamina (the roster grew by two mana and three stamina heroes).
- `individual-ability-fx`: the count of painted skills and ultimates is 136 (171 with the spells): ten more for the Mythics.
- `skill-rules`: a Mythic kit has three slots, from its own rows, like the twenty's.
- `mythic-heroes`: a Mythic move has its own signature or a borrowed look (it demanded a borrowed one for every move, which
  contradicts the rule that a move with its own look leaves `KIT_LOOKS`).

No fingerprint or identity fixture was re-recorded: no ordinary fight changed.

## Checks

`npm run typecheck`, the full `npm test` and `npm run web`; see the hand-off message for the counts.
