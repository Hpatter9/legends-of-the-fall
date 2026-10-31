# A film's end card, and the vault made clear (REVEAL-VAULT)

Two asks from the owner. Branch `claude/cinematic-reveal-vault`.

## 1. "At the end of a cinematic, if it was revealing something, it should come up at the end"

The owner noticed it on the Calamity's opening: the film says a portal has opened, then ends, and nothing says the Calamity is now a
mode you can play, or where it is.

### What the player sees

After the last shot of a film that opened or changed something, an **end card** comes up over the screen: the army banner's own ribbon
(`.unlock` in `pixel.css`) with **Unlocked** (or **Built**, **Awakened**, **Bound**), the thing's art, its name, one line on what it is,
a **Where:** line, and the buttons. It waits for a tap (Enter or Escape too). **Skip, Escape or a held finger still bring the card**: it
comes after the film however it ended, so the reveal cannot be missed. With reduced motion it comes up without moving (the Calamity's
portal stops turning too).

| Film | The card (only when the save shows it) | Button |
| --- | --- | --- |
| A Hole in the Sky (`calamityOpens`, `calOpen`) | Unlocked: **The Calamity**. Where: the Battle tab | Into the portal |
| An army's last stand (`clear:<army>`, nine) | Unlocked: **the next army**, its warlord's portrait. Where: Battle tab, Armies | To the armies |
| Unscripted Horizons (`calamityEnds`) | Unlocked: **Ascension 1** (the level now open), what it pays | To the Calamity |
| The castle going up (`castle:<site>`, seven) | Built: **the building**, what it does for every hero or run; the Chapel: Unlocked: **The Spellbook** | To the castle / To the spells |
| Awakening (`awaken:<hero>`, 45) | Awakened: **the hero**, its awakened portrait and its new passive | none (the awakening panel is open already) |
| (for the Eidolon chain's films) | Bound: **the Eidolon**, its card art, what it does | none |

The button that goes there is offered **only on the home screen** (a castle finished while you look at it, say). From inside a fight or
its result (the army's last stand and the Calamity's opening both come at the fight's settle), from the Calamity's own button (which goes
on into the mode anyway), and from a replay in the Codex's Scenes list, the card has **Continue** only and the Where line says where to
find it.

Films that reveal nothing (the opening, the heralds, the first loss, the firsts, the army intros, the boss arrivals, the act cards, the
quest stories, the Last Oaths) end as before. **A hero earned** (`earned:<hero>`) is left without a card on purpose: its own full reveal
(`earnedArrival`, `summonTarot.ts` `queueReveal`) follows it at once and is that hero's end card. **Duchess joining a fight** likewise
keeps its own card (`showDuchessCard`).

The army's older banner ("A new army marches", `showUnlock`) stands aside when the last-stand film's card already showed that army
this session (`Game.revealed`), so it is not told twice; with cinematics off the banner shows as before.

### How it is built

- **Data-driven.** A film names what it reveals: `Scene.reveal` (`sceneKit.ts`, type `Reveal`: `mode`, `nextArmy`, `ascension`, `building`,
  `awaken`, `eidolon`). Set on `calamityOpens` and `calamityEnds` (`sceneEvents.ts`) and on the clear, castle and awaken families
  (`sceneFamilies.ts`). A new film that opens something needs only that field.
- **`src/sim/sceneReveal.ts`** (pure): `revealOf(film, meta)` and `revealCard(reveal, meta)` say what the card shows given the save, or
  null when nothing was in fact opened (an army cleared whose next one still wants stars; the Calamity not open; a building not raised).
  It returns the `EndCard`: `key`, `label`, `name`, `line`, `where`, `art` and `go`.
- **`src/revealCard.ts`** draws it (`showEndCard(card, go?)`), **`src/reveal.css`** its look (in `build.mjs`'s CSS list). The art is
  bundled or already cached: the portal strip (`art/calmap/portal.png`, imported), a fighter's portrait (`sheets.ts`), a hero's painted
  portrait and an Eidolon's card (both already in the service worker's list), a building's diorama (`CHAMBERS` in `castle.ts`). Nothing
  new is loaded by URL.
- **`src/main.ts`**: `playDue` plays the film, then `endCard(id)`; `playScene` (the Scenes list) does the same with Continue only;
  `revealGo` sends the button to the Calamity (`Home.enterCalamity`, new), the armies, the castle, the spells or a hero.

## 2. "The vault isn't clear enough in how it works in the game"

The vault is the castle's **Treasury** (its card says "High Treasury", "Crown of Minted Vaults"; its sheet's line is "Gold in the vault:
every run starts richer"). Its rules are **unchanged**: each level costs crowns and builder time (50, 100, 180, 300, 500) and adds
`GOLD_PER_LEVEL` 10 gold to the purse a run starts with (`bonusGold`), to level 5 (+50).

### What changed on screen

- **The Treasury's card** (Castle tab): the stat line says what it does for you now ("Every run starts with +20 gold in the purse.", or
  "Not built: build it and every run starts with +10 gold."), and an **ⓘ** button beside the name opens its sheet.
- **The Treasury's sheet** is titled "Treasury · the vault", and has three numbers (the gold a run gets now, the next level's gold and
  its price, the most it holds), the next step in words ("Level 3: +30 gold for 180 crowns."), and **ⓘ How the vault works**:
  - What goes in: crowns, once a level, and a little builder time. You never put gold in, and nothing is taken out.
  - What you get: +10 gold a level, added to the purse a run starts with (a first hire costs 30 gold, then 5 more each).
  - When: at the start of every army run, Calamity run and quest battle. Not the daily or the Last Stand.
  - The limit: level 5, +50 gold. The gold is spent in the run and does not carry over; the vault's level stays for good.
- **The first visit**: the first time the sheet opens on a device, the box is open with a NEW mark; after that it is folded under its
  heading (a tap opens it). Kept in `localStorage` `legends.vaultSeen` (a store that refuses only shows it open again).

Files: `src/vaultRules.ts` (pure: `vaultInfo`, `vaultLine`, `vaultNext`, `vaultBullets`), `src/vaultView.ts` (`vaultBox`), hooks in
`home.ts` (`drawBuildingCard`) and `castle.ts` (`renderBuildingCard`).

### What I would change in the rules (not done: the owner's call)

1. **One name.** It is the Treasury, the High Treasury, the Crown of Minted Vaults and "the vault" in different places; the stat is
   "Starting Run Gold" on one screen and "+10 starting gold" on another. Pick one ("The Vault") everywhere.
2. **It quietly does nothing in the daily and the Last Stand.** Either let it count there too, or keep the explainer's line saying so.
3. **Gold and crowns look alike.** Crowns build the vault; gold is the run's purse for hiring. A small gold-coin icon beside "+20 gold"
   (as the power banner's pill has) would help the two stay apart.

## Tests and checks

- `test/scene-reveal.test.ts` (7): the Calamity's card only once it is open; an army's card only when the next army is open (none after
  the last); Ascension after a first clear; a building once raised and the chapel's spellbook; an awakening's passive and no button; an
  Eidolon only when bound; films with no reveal give none, and every film that names one gives a full card on a save with all open.
- `test/vault-words.test.ts` (2): the numbers are the Treasury's own rules at every level, and match a real army run's purse; the line,
  the next step and the four bullets.
- `tools/reveal-vault/shots.mjs` (port 8910) walks the real page at 393x852, 360x780 and 412x915: the Calamity's button opening the film,
  Skip, the card, Continue going on into the mode; a building finished on the home screen (the card's To the castle); an army's last
  stand and an awakening replayed (Continue only; Escape skipping the film and closing the card; reduced motion at 393); a film with no
  reveal bringing no card; the vault's card, its sheet the first time (open) and again (folded). It checks for page errors, sideways
  overflow and anything off screen.
- Screenshots: `docs/samples/reveal-calamity.png`, `reveal-castle.png`, `reveal-army.png`, `reveal-awaken.png`, `vault-card.png`,
  `vault-first.png`, `vault-again.png` (393x852), with `-360` and `-412` at the other sizes.
