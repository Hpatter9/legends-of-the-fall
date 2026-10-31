# The War Horn, given at the first binding (HORN-GIFT)

The owner: "The Eidolon horn should be given to the player after earning an Eidolon, as part of the story." Branch `claude/horn-gift`
(from main 0.277.0, with `claude/cinematic-reveal-vault` merged in for its end card).

## What changed

- **Before the first Eidolon is bound, the horn does not exist for the player.** No horn in the fight's spell orbs row, none in the Last
  Stand's orbs, none beside the stones on the camp's top bar (`EidolonCall.refresh` / `refreshCamp` hide both `HornView`s while
  `hornHeld` is false; hidden from construction). It fills nothing: `addHorn` adds nothing until the horn is held, so the wave card has no
  "War Horn +100" line (`hornLine` of a zero gain is none) and the Last Stand's run adds nothing. There were no tips about the horn to hide.
- **Askel's binding gives it.** Two beats follow the seal in `ASKEL_BINDING` (`sim/eidolonChainData.ts`, new `BindingBeatKind`s `horn` and
  `hornFull`): the Summoner hands over the War Horn of the first kings ("He asks for a horn, and the keep has one ... it called this hound
  to the hunt for a hundred years, and it has hung silent above this altar since the pacts broke. It is yours now."), its painting rising
  over the altar (`horn-empty`); then Askel breathes his fire into it ("There. I have breathed my fire into it. Blow it in your next
  fight, little keep, and I will come running."), its full painting (`horn-ready`) glowing over it. The seal's line is now "Bound. The
  Cinderhound has come home." Continue shows only on the last beat (`.ebLayer.end`). Drawn in `eidolonBinding.ts` (`.ebHorn`,
  `eidolonChains.css`); reduced motion holds the horn still. Sounds: the game's `horn`, then `fireWhoosh`.
- **The end card**, the reveal card from REVEAL-VAULT: a new reveal kind `{ kind: 'horn' }` (`sceneKit.ts`), `revealCard` in
  `sim/sceneReveal.ts` gives **Received: The War Horn** (art kind `horn`, the full painting; `revealCard.ts`, `reveal.css`): "It fills as
  you fight: every boss wave won, every foe slain. Blow it when it is full and your Eidolon answers, once a fight. It is full now: blow it
  in your next fight." Where: "In battle, at the left of the spell orbs; at the camp, beside the stones." Continue only. `home.ts`
  `summonerTap` shows it after `bindChain` when the binding gave the horn, then the Pact Gallery opens as before. A replay of the binding
  from the Pact Gallery plays the horn beats but shows no card.
- **Given full.** `bindEidolon` (`sim/warHorn.ts`) sets the horn to `HORN_FULL` when it binds the first Eidolon (`hornHeld` was false),
  whatever an older save stored; a later binding leaves the fill alone. So the next fight can blow it at once.

## Saves

Nothing new is saved: `hornHeld(m)` is "an Eidolon is bound". A save with one bound keeps the horn as it was. A save with none keeps its
stored fill (`readEidolons` unchanged) but shows no horn and adds nothing to it; the binding then hands it over full. `?eidolons=all`
binds all six (the first binding fills it) and fills it, as before.

## Tests

`test/horn-gift.test.ts` (6): nothing held or filled before binding (no gain, no wave-card line, nothing written, no card); Askel's
binding through `bindChain` gives it full and ready, with its card; only the first binding fills it; the binding's horn beats (who speaks,
after the seal); older saves (a stored 640 kept hidden and untouched, then full at binding; a bound save keeps and fills its horn); the dev
flag. Updated for the new requirement: `eidolons.test.ts` (the wait/blow test and the save test filled the horn before any Eidolon was
bound; they now bind first) and `eidolon-chains.test.ts` (the binding's beats ended on `bound`; they now end `bound`, `horn`, `hornFull`).

## Checked

`tools/horn-gift/shots.mjs` (port 8960) at 393x852, 360x780 and 412x915 on an older save (Askel's pieces in, horn stored at 640): no
horn at the camp or in a fight, a boss wave won with no horn line and the 640 untouched; the binding's seal (no Continue yet), the horn
beat, the full horn beat with Continue; the card on screen; the horn full; then the horn at the camp and ready in the next fight. No page
errors, no 404s, no sideways overflow. Screenshots `docs/samples/horn-gift-{before-camp,before-fight,before-wavecard,bind-bound,bind-horn,
bind-horn-full,card,after-camp,after-fight}[-360|-412].png`.
