# The standard ornate menu (the owner's rule)

The owner, on the March orders: "This needs to be a standardized thing so all menus are built that way from now on." So every new card,
sheet and menu is built with one component, `src/ornateMenu.ts`, styled by section 24 of `src/ornateMenus.css`. A menu drawn by hand
with its own card, rim and buttons is not to be added again. `test/ui-standard.test.ts` holds the line (below).

## What it draws

- **The veil** (`.omVeil`): a light dim over the page under the menu, with no blur, so the page still reads through it (MENU-POLISH,
  `docs/notes/menu-polish.md`). `kind: 'card'` (the default) centres the card; `kind: 'sheet'` (`.omSheet`) rises from the foot of the
  screen, up to nine tenths of it; `kind: 'drawer'` (`.omDrawer`) slides up from the foot, stops at two thirds of the screen and dims only
  the lower part, for a sheet over a page that should stay in sight (a ware at Hester's Stall). Text in the body is `--om-text` (14.5 px)
  and `--om-small` (13 px).
- **The card** (`.om`): the double brass rim (`--ornate-border-double`), slate and parchment (`ui/page.png`), `--ornate-shadow`, and a brass
  stud in each top corner.
- **The header** (`.omHead`): the battle crest (`ui/battle-crest.png`), an eyebrow in small capitals ("The War Council"), the title in brass
  display type, a line under it, and the filigree rule (a brass line fading out each way with a diamond at its heart).
- **The body** (`.omBody`, scrolls): sections (`.omSection`) with a brass heading and its line (`.omSectionHead`); a grid of **gilded choice
  rows** (`.omChoice`, the chosen one `.on`: the `#f2dc9f` rim, the `#444c38` to `#293021` gradient, a soft brass glow), each with an
  icon, a title and lines (a reward green, `.omPay`; what opens a locked one in grey italics, `.omLock`); **slate wells** (`.omWell`) for a
  report or a list; small notes (`.omNote`).
- **The footer** (`.omFoot`): the way out on the left, the primary button on the right. A full page says "‹ Back", a card says "Close"
  (the UX rule), or a word of its own where the way out is itself a choice ("Keep the loadout", "Not now"). Buttons are 48 px tall.

Escape closes a menu; `onClose` runs once however it went. Reduced motion: the veil does not fade in and the drawer does not slide. Nothing glows in a loop.

## How to build one

```ts
import { menuFoot, menuNote, menuPick, menuSection, menuWell, ornateMenu } from './ornateMenu';

const menu = ornateMenu({ id: 'marchOrders', eyebrow: 'The War Council', title: 'March orders', sub: 'one order for the whole run', kind: 'sheet' });
const grid = menuSection(menu.body, 'The march', 'one for the whole run', 2);
menuPick(grid, MARCHES, current, (d) => ({ icon: d.icon, title: d.name, lines: [d.change, [d.reward, 'pay']] }), (d) => (picked = d.id));
menuFoot(menu, { back: { word: 'close' }, primary: { label: 'Set orders', onClick: () => { menu.close(); set(picked); } } });
```

`menuSection`'s `cols` is 2 or 3 (3 from 380 px), or 4 for short rows such as counts. `menuChoice` is a single row. `menuPick` makes a set with one chosen (it moves the gilt itself). `menuWell` and `menuNote` are for words.
`menuTitle` retitles a second step. The builder is plain DOM, with no Pixi and no rules, so a module the tests import can use it.

## On it now

- **The March orders.** They are no longer a pop-up on March. A gilded "March orders" button on the War Council (above March to battle)
  names the orders set ("Cursed · Shielded · by the War Camp · Meteor") and opens them as a standard sheet. The sheet has the march (Plain,
  Cursed with this run's curse named, Scouted with the scouts' report in a well, Night, Forced), the Vigil, Far Sight's road, the Spell
  Lectern's spare and the Master's Mark (from the heroes being picked). "Set orders" keeps the choices; Close leaves them as they were.
  March then starts the run directly with them. Their rules are unchanged (`sim/march.ts`, `ordersOf` in `marchCard.ts`, the same
  defaults as the old card); the run's seed is fixed as the War Council opens, so a Cursed march's named curse is the run's. The button is
  left out while no order is open (a new player never sees it), for an auto replay (it marches plain, as before) and for quest battles.
- **The Spell Lectern** and **the Field Anvil** at the mid-boss camp.
- **From PR #386 (INT-386, `docs/notes/int-386.md`):** the Auto card (`autoAsk.ts`; the counts are a row of four gilded choices),
  "How the altar works" (`altarHelp.ts`), a finished build's card (`builtCard.ts`), the tome sheet (`tomeView.ts`), the relic card
  (`relicCard.ts`), the talent box and its Auto-spend confirm (`talentView.ts`) and a ware's drawer at Hester's Stall (`stallView.ts`; the
  stall page itself is still its own).

## Not on it yet (the list in the test)

These dialogs were drawn before the standard, each with its own card. Most already wear the ornate look (`ornateMenus.css` sections 1
to 23), but they do not share the builder: `chestStash`, `dailyView`, `earnedArrival`, `eidolonBinding`, `eidolonChainView`,
`questCard`, `rankUpList`, `revealCard`, `settingsPicker`, `shopView`, `stallView` (the stall page; its ware sheet is standard),
`summonTarot` and `unitInfo`. When one is touched, move it onto `ornateMenu` and take it off the list in `test/ui-standard.test.ts`.

## The test

`test/ui-standard.test.ts`:
- every class the builder names is styled in `ornateMenus.css`, and it names no class it does not list (`OM_CLASSES`);
- any file in `src/` that sets `role="dialog"` is built with `ornateMenu`, unless it is on the list of menus from before the standard. The
  list may only shrink: a file on it that no longer draws its own dialog must come off;
- the March orders, the Lectern and the Anvil are built with it, and so are the dialogs moved from PR #386;
- the March orders' picks become the run's orders as before (a plain march with nothing open gives none, a Cursed march carries the
  seed's curse, a marked hero no longer in the party falls to the party's first).

Shots: `docs/samples/ui-consistency/std-before-<screen>-<w>.png` (the old pop-up on March: march, march-foot, party) and
`std-after-<screen>-<w>.png` (party-orders, march-orders, march-orders-foot, march-orders-scouted, march-orders-set) at 393, 360 and 412.

## The fight's Auto switch and tactic button (the owner's two HUD notes)

- **"Move the auto cast button up next to the spells. Right now it's behind the tactic button."** The Auto switch (ultimates and spells)
  now sits straight after the spell orbs on their row, not pushed to the far right where the tactic button hangs under it. The tactic button
  has its own spot at the right edge under the row, clear of the switch. Measured at 393, 360 and 412, at the fight's start, mid-fight and
  after a tap (with the mode's word showing): no two of mana, orbs, Auto, the tactic button and its word overlap.
- **"Make the tactic button more ornate."** It is now a gilded medallion, like the camp's Daily: the double brass rim, the tactic's icon in a
  brass ring (ember for Charge, steel for Hold, brass for Advance), and the mode's name under it ("Advance", "Hold", "Charge") in brass. It
  is 58 x 66 px. The light is steady, with no pulse.
- **Painted icons, once drawn.** `build.mjs` looks for `src/art/ui/tactics/<id>.png` (or the art branch's `art-source/ui/tactics/<id>.png`)
  for `advance`, `hold` and `charge`. Each one found is served as `ui/tactics/<id>.png`, listed in the service worker's files (so it plays
  offline), and named to the page (`__TACTIC_ART__`). The button then shows the painting in the ring in place of its drawn icon. A tactic
  not painted yet keeps the drawn icon, so the three can arrive one at a time.

Shots: `docs/samples/ui-consistency/hud-before-<scene>-<w>.png` and `hud-after-<scene>-<w>.png` for fight-start, fight-mid and fight-tap at
393, 360 and 412.

### The ChatGPT prompt for the three tactic icons

Ask for each icon on its own, 256 x 256, transparent PNG, and save it as `art-source/ui/tactics/<id>.png` on the branch
`art/tactic-icons` (`advance.png`, `hold.png`, `charge.png`). The shared part follows the gear icons' house style
(`tools/gear/gen-icons.mjs`), so the three sit beside the game's other painted icons:

> A single fantasy RPG icon, painted in a rich hand-painted style with soft rim light and gentle texture, like a premium mobile RPG item
> icon. The subject alone, centred, front view, filling most of the square, on a fully transparent background, with no frame, no circle
> behind it, no text, no shadow on the ground and nothing else in the picture. Warm brass and gold metal, dark steel, deep green and crimson
> cloth, as in a gothic medieval keep. 256 x 256 pixels, transparent PNG. It must read clearly when shown at 32 pixels.

Then add the subject:

- **advance** (Advance together): "The subject: a war banner on a short spear, its swallow-tailed green pennant with a gold edge streaming
  forward to the right, as if carried at a steady march."
- **hold** (Hold the line): "The subject: a tall heater shield, dark steel with a gold rim and a gold boss, standing upright and planted,
  a short sword laid flat across its foot."
- **charge** (Charge): "The subject: two crossed longswords, blades up, steel with gold hilts, with a burst of ember-orange sparks where
  the blades cross."
