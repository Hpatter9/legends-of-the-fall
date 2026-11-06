// MENU-POLISH: a few more menus opened over the built page (tools/menu-polish/shots.mjs), to see the lighter veil leaves them well:
// the March orders over the War Council (a standard sheet), the Spell Lectern (a standard card), a chest's reveal and Settings.
import { openMarchOrders, defaultPicks, showLectern } from '../../src/marchCard';
import { showChest } from '../../src/chestStash';
import { ARMIES } from '../../src/sim/armies';

const game = () => (window as any).__game;

(window as any).__menuPolish = {
  orders: () => {
    const g = game();
    const army = ARMIES[0].id;
    g.party.open('start', () => {});
    setTimeout(() => openMarchOrders(g.meta, army, 0, 7, g.meta.party, defaultPicks(g.meta, army, g.meta.party), () => {}), 300);
  },
  lectern: () => showLectern(game().meta, 'meteor' as any, () => {}),
  chest: () => showChest({ at: 0, kind: 'gold', army: ARMIES[0].id, items: [{ type: 'crowns', text: '320 crowns', n: 320 }, { type: 'stones', text: '3 summoning stones', n: 3, prize: true }] }, () => {}),
  // (Settings through the page's own gear: its bundle has the build's version, this one does not)
  settings: () => (document.getElementById('hmGear') as HTMLElement)?.click(),
};
