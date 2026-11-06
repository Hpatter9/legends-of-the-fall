// The March orders (DEPTH-BUILD, docs/notes/depth-design.md section 5; UI-STANDARD, docs/notes/ui-standard.md): a button on the War
// Council opens them in the standard ornate menu (`ornateMenu.ts`): the modifiers as gilded rows ("Plain march" chosen), each with its
// icon, name and lines of cost and reward, a locked one saying what opens it; then the Vigil, Far Sight's road, the Spell Lectern's spare
// and the Master's Mark, as their rooms stand. A Scouted march shows the scouts' report on the final boss there. March on the War Council
// then starts the run with the orders set. The button is left out while no order is open, so a new player never sees it. Reads the rules
// only (`sim/march.ts`); the page starts the run. The Spell Lectern and the Field Anvil at the mid-boss camp are standard menus too.

import { armyById, bossOf, landsOf } from './sim/armies';
import { AREA_NAMES } from './menuArt';
import type { Area } from './sim/board';
import { MARCHES, CURSES, curseFor, marchOpen, ordersFor, routesOf, type MarchMod, type Orders } from './sim/march';
import { SIGNATURES } from './sim/bossAttacks';
import { bossName, cluesOf, WEAKNESS } from './sim/weakness';
import type { Meta } from './sim/meta';
import { roomOpen } from './sim/rooms';
import { spareChoices } from './sim/lectern';
import { castList } from './sim/schools';
import { SPELLS, type SpellId } from './sim/spells';
import { UNITS } from './sim/units';
import { menuFoot, menuNote, menuPick, menuSection, menuChoice, menuWell, ornateMenu } from './ornateMenu';
import { VIGILS, VIGIL_IDS, type VigilId } from './sim/chapelRooms';
import { OATH, oathOpen, whyNoOath } from './sim/oath';


/** Whether the card has anything to choose: some modifier other than the plain march is open. */
export function marchChoice(meta: Meta, army: string, tier: number): boolean {
  // (Dynasties, phase 7: the Legend Oath is on the card once it is open, so a Normal run shows it locked)
  return oathOpen(meta) || vigilOpen(meta) || spares(meta).length > 0 || roomOpen(meta.castle, 'mastersMark') || roadsOf(meta, army).length > 0 || MARCHES.some((d) => d.id !== 'plain' && marchOpen(meta, army, tier, d.id).open);
}
/** The Watchtower's Far Sight: the army's roads, one a land. */
const roadsOf = (meta: Meta, army: string): Area[] => {
  const a = armyById(army);
  return a ? routesOf(landsOf(a), meta.castle) : [];
};
/** The Mage Tower's Spell Lectern: the spells the run could carry spare. */
const spares = (meta: Meta): SpellId[] => (roomOpen(meta.castle, 'spellLectern') ? spareChoices(meta.spellbook) : []);
/** The Chapel's Vigil is chosen on the card too, once its room stands. */
const vigilOpen = (meta: Meta): boolean => roomOpen(meta.castle, 'vigil', meta.chapel);

/** The orders being chosen on the War Council: the march, the Vigil, the road, the spare spell and the marked hero. */
export interface MarchPicks {
  chosen: MarchMod | 'plain';
  vigil?: VigilId;
  road?: Area;
  spare?: SpellId;
  marked?: string;
  /** Dynasties, phase 7: the Legend Oath sworn for the run (Hard or harder, `oath.ts`). */
  oath?: boolean;
}

/** The orders a run starts with when none are changed: a plain march, the Shielded Vigil, the first road, spare and hero (as the old card's). */
export function defaultPicks(meta: Meta, army: string, party: readonly string[]): MarchPicks {
  return {
    chosen: 'plain',
    vigil: vigilOpen(meta) ? 'shielded' : undefined,
    road: roadsOf(meta, army)[0],
    spare: spares(meta)[0],
    marked: roomOpen(meta.castle, 'mastersMark') ? party[0] : undefined,
  };
}

/** The run's orders from the picks (undefined for a plain march with nothing else). A marked hero no longer in the party falls to the first. */
export function ordersOf(picks: MarchPicks, seed: number, party: readonly string[]): Orders | undefined {
  const marked = picks.marked === undefined ? undefined : party.includes(picks.marked) ? picks.marked : party[0];
  const o = { ...(ordersFor(picks.chosen, seed) ?? {}), ...(picks.vigil ? { vigil: picks.vigil } : {}), ...(picks.road ? { route: picks.road } : {}), ...(picks.spare ? { spare: picks.spare } : {}), ...(marked ? { marked } : {}) };
  return Object.keys(o).length ? o : undefined;
}

/** The War Council button's line: the march and what else is set ("Cursed · Shielded · by the Highlands"). */
export function marchLine(picks: MarchPicks): string {
  const parts = [MARCHES.find((d) => d.id === picks.chosen)?.name ?? 'Plain march'];
  if (picks.vigil) parts.push(VIGILS[picks.vigil].name);
  if (picks.road) parts.push(`by the ${AREA_NAMES[picks.road]}`);
  if (picks.spare) parts.push(SPELLS[picks.spare].name);
  if (picks.oath) parts.push('the Legend Oath');
  return parts.join(' · ');
}

/** Open the March orders over the War Council. Choices are made in the menu; "Set orders" keeps them (`set`), Close leaves them as they were. */
export function openMarchOrders(meta: Meta, army: string, tier: number, seed: number, party: readonly string[], now: MarchPicks, set: (picks: MarchPicks) => void): void {
  const a = armyById(army);
  const tierName = ['Normal', 'Hard', 'Elite', 'Legendary', 'Mythic'][tier] ?? 'Normal';
  const p: MarchPicks = { ...now };
  const menu = ornateMenu({ id: 'marchOrders', eyebrow: 'The War Council', title: 'March orders', sub: `${a?.name ?? army} · ${tierName} · one order for the whole run`, kind: 'sheet' });
  const body = menu.body;
  // (the march: each order's cost and reward; a locked one says what opens it. Cursed names this run's curse; Scouted gives the report)
  const grid = menuSection(body, 'The march', 'one for the whole run', 2);
  const note = menuNote(body);
  const report = menuWell(body);
  const tell = () => {
    note.textContent = p.chosen === 'cursed' ? `This run's curse: ${CURSES[curseFor(seed)].name}. ${CURSES[curseFor(seed)].line}` : '';
    note.hidden = !note.textContent;
    report.hidden = p.chosen !== 'scouted';
    if (p.chosen !== 'scouted') return;
    const boss = a ? bossOf(a) : '';
    report.replaceChildren();
    const line = (t: string, cls = '') => {
      const e = document.createElement('p');
      e.textContent = t;
      if (cls) e.className = cls;
      report.append(e);
    };
    line("The scouts' report");
    line(`At the end of the road waits the ${bossName(boss)}.`);
    const sigs = SIGNATURES[boss] ?? [];
    if (sigs.length) line(`Its great attacks: ${sigs.map((x) => x.name).join(' and ')}.`);
    if (WEAKNESS[boss]) line(`Weakness: ${cluesOf(boss)[2]}`, 'omPay');
  };
  menuPick(grid, MARCHES, MARCHES.find((d) => d.id === p.chosen), (d) => {
    const open = marchOpen(meta, army, tier, d.id);
    return { icon: d.icon, title: d.name, disabled: !open.open, lines: open.open ? [d.change, [d.reward, 'pay']] : [[open.lock ?? '', 'lock']] };
  }, (d) => {
    p.chosen = d.id;
    tell();
  });
  tell();
  // (Dynasties, phase 7: the Legend Oath, per run, on Hard or harder: the bearers can truly die, the progress never)
  if (oathOpen(meta)) {
    const why = whyNoOath(meta, tier);
    if (why) p.oath = false;
    const g = menuSection(body, 'The Legend Oath', 'this run only', 2);
    const paid = `×${OATH.PAY} crowns and XP · +${OATH.TROPHY} War Trophy a wave · Legend renown`;
    menuPick(g, [false, true], !!p.oath, (on) => ({
      icon: on ? '✠' : '⚑',
      title: on ? 'Swear the Oath' : 'No Oath',
      disabled: on && !!why,
      lines: on ? (why ? [[why, 'lock']] : ['A hero who falls twice, or in a wave lost, is slain: the heir carries on with every level', [paid, 'pay']]) : ['The heroes fall and rise as ever'],
    }), (on) => (p.oath = on));
  }
  // (the Chapel's Vigil, once its room stands: how the party rises when a heart burns)
  if (p.vigil) menuPick(menuSection(body, 'The Vigil', 'when a heart burns, the party rises'), VIGIL_IDS, p.vigil, (id) => ({ icon: VIGILS[id].icon, title: VIGILS[id].name, lines: [VIGILS[id].line] }), (id) => (p.vigil = id));
  // (the Watchtower's Far Sight: the road the army is met on, one a land)
  const roads = roadsOf(meta, army);
  if (roads.length) menuPick(menuSection(body, 'The road', 'Far Sight', 2), roads, p.road, (land) => ({ title: `By the ${AREA_NAMES[land]}`, lines: ['Every wave is fought on this land.'] }), (land) => (p.road = land));
  // (the Mage Tower's Spell Lectern: a spare spell to swap in at the camp after the mid-boss)
  const spareList = spares(meta).slice(0, 6);
  if (spareList.length) menuPick(menuSection(body, 'The Spell Lectern', 'a spare spell for the camp after the mid-boss'), spareList, p.spare, (id) => ({ title: SPELLS[id].name }), (id) => (p.spare = id));
  // (the Smithy's Master's Mark: one hero whose gear does not wear this run, from the party being picked)
  if (roomOpen(meta.castle, 'mastersMark') && party.length) {
    if (!p.marked || !party.includes(p.marked)) p.marked = party[0];
    menuPick(menuSection(body, "The Master's Mark", "this hero's gear does not wear this run"), party, p.marked, (k) => ({ title: UNITS[k]?.name ?? k }), (k) => (p.marked = k));
  }
  menuFoot(menu, {
    back: { word: 'close' },
    primary: {
      label: 'Set orders',
      onClick: () => {
        menu.close();
        set(p);
      },
    },
  });
}

/** The Spell Lectern at the camp after the mid-boss: swap the spare in for one equipped spell, or keep the loadout. */
export function showLectern(meta: Meta, spare: SpellId, done: (out: SpellId | null) => void): void {
  let picked = false;
  const menu = ornateMenu({ id: 'marchOrders', eyebrow: 'The Mage Tower', title: 'The Spell Lectern', sub: `Swap ${SPELLS[spare].name} in for one of your spells, for the rest of the run and after.`, onClose: () => !picked && done(null) });
  const grid = menuSection(menu.body, 'Out goes', 'tap the spell to give up', 2);
  for (const id of castList(meta.spellbook))
    menuChoice(grid, {
      title: SPELLS[id].name,
      lines: [`In: ${SPELLS[spare].name}`],
      onPick: () => {
        picked = true;
        menu.close();
        done(id);
      },
    });
  menuFoot(menu, { back: { word: 'Keep the loadout' } });
}

/** The Smithy's Field Anvil at the camp after the mid-boss: mend the party's worn gear now, at the stall's price. */
export function showAnvil(n: number, cost: number, afford: boolean, mend: () => void): void {
  const menu = ornateMenu({ id: 'marchOrders', eyebrow: 'The Smithy', title: 'The Field Anvil', sub: `${n} worn piece${n === 1 ? '' : 's'} in the party: mend ${n === 1 ? 'it' : 'them all'} for ${cost} crowns, the stall's price.` });
  menuFoot(menu, {
    back: { word: 'Not now' },
    primary: {
      label: afford ? `Mend · ${cost}` : `Mend · ${cost} (too few crowns)`,
      disabled: !afford,
      onClick: () => {
        menu.close();
        mend();
      },
    },
  });
}
