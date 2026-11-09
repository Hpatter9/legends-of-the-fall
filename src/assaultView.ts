// The Assault's pages (phase 1, `docs/notes/assault-1.md`; the design's 8.1, 8.2 and the result in 8.3), all built with the standard ornate
// menu (`ornateMenu.ts`, the owner's rule): the muster (a full page: the host, the plan, the hold), the platoon card (the ranks, the numbers,
// the formation), the war table's scene the first time the mode opens, and the result. Plain DOM over the sim's rules: buying, the plan and
// the formations go through `sim/assault/economy.ts` and are saved by the caller's `save`.

import { menuChoice, menuFoot, menuNote, menuPick, menuSection, menuWell, ornateMenu, type OrnateMenu } from './ornateMenu';
import type { Meta } from './sim/meta';
import { armyById } from './sim/armies';
import { heroName } from './sim/heroNames';
import { UNITS } from './sim/units';
import { nemesisLines } from './sim/nemesis';
import { openNemesisCard } from './nemesisView';
import { blueprintOf, holdMapOf } from './sim/assault/assault';
import { assaultOf, ASSAULT_PRICES, buyRecruit, buySiege, fillCost, fillRanks, PLATOON_SIZE, recruitMarks, scouted, scoutHold, siegeCost, SIEGE_PRICES, troopsOf } from './sim/assault/economy';
import { assaultParty, defaultPlan, lordLine, type AssaultPlan, type AssaultResult } from './sim/assault/assaultMode';
import { rankOf, troopOf, troopStats, TROOPS, lookOf, troopUnitOf, type PlatoonFormation } from './sim/assault/troops';
import { FORMATIONS, FORMATION_NAMES } from './sim/assault/platoons';
import { levelOfKind } from './sim/levels';
import { councilPlaces, lordOf } from './sim/assault/garrison';
import { snapOf } from './sim/nemesis';
import { warchiefOf } from './sim/muster';
import type { ApproachId, PlatoonRole } from './sim/assault/holdTypes';
import { portrait, loadSomeSheets } from './render/sheets';

export interface MusterHooks {
  /** Save the meta (a recruit bought, the plan changed). */
  save(): void;
  /** March: the plan as the page left it. */
  onMarch(plan: AssaultPlan): void;
  /** ‹ Back to the army card. */
  onBack(): void;
  /** The Warband regrouped (phase 2): a conquered hold stormed again at Mythic. */
  restorm?: boolean;
}

const APPROACHES: readonly ApproachId[] = ['bridge', 'west', 'east'];
const APPROACH_NAME: Readonly<Record<ApproachId, string>> = { bridge: 'the Old Bridge', west: 'the West Ford', east: 'the East Ford' };
/** Each way's trade-off, for the War Plan. */
const APPROACH_COST: Readonly<Record<ApproachId, string>> = {
  bridge: 'The road: shortest, but the bridge is narrow and its barricade fort shoots down it',
  west: 'The shallows slow every step, and the reeds beyond hide the village’s ambush',
  east: 'The far flank: a long march round, past the wolf pens and the east watchtower',
};
const ROLES: readonly PlatoonRole[] = ['main', 'cover', 'flank'];
const ROLE_NAME: Readonly<Record<PlatoonRole, string>> = { main: 'Main push', cover: 'Ridge and cover', flank: 'Flank the Warpath' };
const ROLE_TEXT: Readonly<Record<PlatoonRole, string>> = {
  main: 'Straight for the nearest gate, then the throne',
  cover: 'Keeps a few tiles behind the main push: shooters on the high ground',
  flank: 'Holds the Warpath’s camp so no more bands come down it, then breaks the North Gate',
};
const pips = (marks: number) => '◆'.repeat(rankOf(marks).pips);
/** A platoon's veterans in words (" · 1 Elite, 2 Blooded"; nothing for recruits alone). */
const rankWords = (list: readonly number[]): string => {
  const n: Record<string, number> = {};
  for (const x of list) if (x > 0) n[rankOf(x).name] = (n[rankOf(x).name] ?? 0) + 1;
  const words = ['Elite', 'Veteran', 'Blooded'].filter((r) => n[r]).map((r) => `${n[r]} ${r}`);
  return words.length ? ` · ${words.join(', ')}` : '';
};
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** Put a fighter's portrait into a choice row's icon. */
function face(row: HTMLElement, sheet: string, size = 34): void {
  const ico = row.querySelector('.omIco') ?? row.insertBefore(el('span', 'omIco'), row.firstChild);
  ico.replaceChildren(portrait(sheet, size));
}

/** The hold drawn small from its zones and heights (the design's minimap and the muster's plan): one pixel a tile, the walls dark, the water
 *  blue, the fields green, the camp's mud brown, the Landing pale. Looks only. */
export function drawHoldMap(canvas: HTMLCanvasElement, army: string, size: number): void {
  const map = holdMapOf(army);
  if (!map) return;
  const b = map.board;
  const img = new ImageData(b.w, b.d);
  const zoneCol: Record<string, [number, number, number]> = {
    L: [150, 160, 110], C: [170, 160, 120], K: [92, 128, 70], T: [110, 150, 70], V: [110, 100, 80], R: [40, 80, 150], F: [80, 130, 190], Y: [140, 100, 60],
    D: [70, 60, 50], E: [120, 100, 70], P: [60, 40, 30], B: [130, 110, 80], S: [90, 90, 100], I: [125, 110, 85], M: [150, 130, 95], N: [80, 105, 70],
  };
  // (the Barrow Necropolis's own colours: the grey downs, the still grey lake, the slate and bone of its rings)
  if (army === 'undead')
    Object.assign(zoneCol, {
      L: [120, 124, 110], C: [130, 128, 112], K: [86, 98, 84], T: [98, 110, 84], V: [92, 90, 86], R: [52, 70, 104], F: [80, 104, 140], Y: [120, 118, 120],
      D: [56, 54, 58], E: [96, 94, 100], P: [44, 44, 52], B: [104, 102, 110], S: [82, 86, 104], I: [100, 100, 108], M: [128, 126, 134], N: [72, 80, 72],
    });
  // (the Howling Den's: the russet moor and its bracken, the cold river in the gorge, the log ring, and the snow within it)
  if (army === 'beasts')
    Object.assign(zoneCol, {
      L: [150, 130, 90], C: [140, 118, 84], K: [138, 110, 62], T: [150, 92, 50], V: [112, 96, 80], R: [40, 74, 112], F: [80, 120, 160], Y: [130, 96, 60],
      D: [76, 62, 50], E: [120, 104, 86], P: [70, 50, 34], B: [196, 200, 206], S: [130, 134, 146], I: [206, 210, 218], M: [222, 226, 232], N: [104, 92, 64],
    });
  // (Elder Root's: the deep forest, the black mire and its marsh, the hedge ring and the mossy grove within)
  if (army === 'wildwood')
    Object.assign(zoneCol, {
      L: [120, 140, 96], C: [124, 120, 90], K: [56, 96, 52], T: [70, 116, 56], V: [96, 96, 80], R: [30, 44, 40], F: [62, 84, 70], Y: [110, 84, 52],
      D: [52, 46, 36], E: [92, 96, 64], P: [40, 64, 34], B: [96, 108, 70], S: [90, 98, 86], I: [104, 120, 80], M: [124, 138, 96], N: [64, 84, 56],
    });
  for (let i = 0; i < b.w * b.d; i++) {
    const t = b.tiles[i];
    const c = zoneCol[String.fromCharCode(map.zone[i])] ?? [100, 100, 100];
    const k = 0.75 + Math.min(10, t.h) * 0.04;
    const solid = t.wall || t.rock;
    img.data.set([solid ? 50 : c[0] * k, solid ? 42 : c[1] * k, solid ? 36 : c[2] * k, 255], i * 4);
  }
  // (drawn turned as the field is: the Landing at the bottom)
  const tmp = document.createElement('canvas');
  tmp.width = b.w;
  tmp.height = b.d;
  tmp.getContext('2d')!.putImageData(img, 0, 0);
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, size, size);
  g.save();
  g.translate(size / 2, 0);
  g.scale(size / (b.w * 2), size / (b.d * 2));
  g.transform(1, 1, -1, 1, 0, 0);
  g.drawImage(tmp, 0, 0);
  g.restore();
}

/** A tile's place on a map drawn by `drawHoldMap`. */
export const mapAt = (u: number, v: number, size: number, n = 100): [number, number] => [size / 2 + ((u - v) * size) / (n * 2), ((u + v) * size) / (n * 2)];

/** The war table's scene, the first time the mode opens (1.2): the scouts' report. */
export function openWarTable(army: string, then: () => void): void {
  const a = armyById(army)!;
  const bp = blueprintOf(army)!;
  const menu = ornateMenu({ id: 'assaultTold', eyebrow: 'The war table', title: 'The scouts report', sub: `${a.name} has withdrawn to ${bp.name}`, onClose: then });
  const well = menuWell(menu.body);
  for (const line of [
    `Ten stars against the ${a.name.replace(/^The /, '')}, and their warbands have stopped coming. The scouts found where they went.`,
    `${bp.name}: a palisade over a ditch, a stone wall six steps high, and the warchief's throne on the mound at its heart. Two hundred of them, and the Council's own at the gates.`,
    'Each hero leads a platoon of ten soldiers who fight as it does. Soldiers who fall are gone for good; more are bought with crowns. Heroes are only downed.',
  ])
    well.append(el('p', '', line));
  menuFoot(menu, { back: { word: 'close' } });
}

/** The muster (8.1): a full page from the army card's Assault button. */
export function openMuster(m: Meta, army: string, hooks: MusterHooks): void {
  const a = armyById(army)!;
  const bp = blueprintOf(army)!;
  const party = assaultParty(m);
  const st = assaultOf(m);
  const base = defaultPlan(party);
  const plan: AssaultPlan = {
    approaches: { ...base.approaches, ...Object.fromEntries(party.filter((k) => st.plan?.[k]).map((k) => [k, st.plan![k]])) },
    roles: { ...base.roles, ...Object.fromEntries(party.filter((k) => st.roles?.[k]).map((k) => [k, st.roles![k]])) },
    formations: { ...st.formations },
  };
  let menu: OrnateMenu | null = null;
  const draw = () => {
    const short = party.filter((k) => troopsOf(m, k).length < PLATOON_SIZE).length;
    menu = ornateMenu({
      id: 'assaultMuster',
      kind: 'sheet',
      eyebrow: hooks.restorm ? `The Warband regroups · ${a.name}` : `Conquest · ${a.name}`,
      title: bp.name,
      sub: hooks.restorm ? `Mythic · 200 defenders · half a Conquest chest for the win` : `200 defenders · ${lordLine(m, army)} holds the throne`,
      label: `Muster for ${bp.name}`,
    });
    // the host
    // (the Drill Yard, phase 3: recruits join at its rank, and the line says so)
    const drilled = recruitMarks(m.castle);
    const host = menuSection(menu.body, 'Your host', `${m.crowns} crowns · ${ASSAULT_PRICES.recruit} a recruit${drilled ? ` · the Drill Yard sends them ${rankOf(drilled).name}` : ''}`, 2);
    for (const k of party) {
      const list = troopsOf(m, k);
      const kind = TROOPS[troopOf(k)];
      const cost = fillCost(m, k);
      const row = menuChoice(host, {
        title: `${heroName(k)} · ${kind.name}`,
        icon: ' ',
        lines: [`${list.length} / ${PLATOON_SIZE}${rankWords(list)}`, cost ? [`Fill · ${cost}`, 'pay'] : '✓ Full'],
        onPick: () => openPlatoonCard(m, k, { save: hooks.save, onChange: redraw }),
      });
      face(row, UNITS[k].sheet);
    }
    const all = party.reduce((n, k) => n + fillCost(m, k), 0);
    if (all) {
      const fill = menuSection(menu.body, undefined, undefined, 2);
      menuChoice(fill, {
        title: `Fill all the ranks · ${all}`,
        icon: '⚔',
        lines: [m.crowns >= ASSAULT_PRICES.recruit ? 'Recruits, while the crowns last' : ['Not enough crowns', 'lock']],
        disabled: m.crowns < ASSAULT_PRICES.recruit,
        onPick: () => {
          for (const k of party) fillRanks(m, k);
          hooks.save();
          redraw();
        },
      });
    }
    // the plan
    const planGrid = menuSection(menu.body, 'The War Plan', 'a tap gives a platoon its way and its part', 2);
    const well = menuWell(planGrid.parentElement!);
    well.style.display = 'flex';
    well.style.justifyContent = 'center';
    const size = Math.min(300, Math.max(200, window.innerWidth - 90));
    const map = el('canvas', 'assaultPlanMap');
    map.style.cssText = `width:${size}px;height:${size}px;image-rendering:pixelated;`;
    drawHoldMap(map, army, size);
    const g = map.getContext('2d')!;
    party.forEach((k, i) => {
      const way = bp.approaches.find((x) => x.id === plan.approaches[k])!.way;
      g.strokeStyle = 'rgba(255, 230, 160, 0.9)';
      g.setLineDash([3, 3]);
      g.lineWidth = 1.5;
      g.beginPath();
      way.forEach((p, n) => (n ? g.lineTo(...mapAt(p.u, p.v, size)) : g.moveTo(...mapAt(p.u, p.v, size))));
      g.stroke();
      const [x, y] = mapAt(way[way.length - 1].u, way[way.length - 1].v, size);
      g.setLineDash([]);
      g.fillStyle = '#2a5ea8';
      g.fillRect(x - 7 + i * 3, y - 16 - i * 2, 14, 12);
      g.fillStyle = '#fff';
      g.font = 'bold 10px sans-serif';
      g.fillText(heroName(k)[0], x - 3 + i * 3, y - 6 - i * 2);
    });
    well.append(map);
    planGrid.parentElement!.append(planGrid);
    for (const k of party)
      menuChoice(planGrid, {
        title: heroName(k),
        icon: ' ',
        lines: [`By ${APPROACH_NAME[plan.approaches[k]]}`, `${ROLE_NAME[plan.roles![k]]}${worksOf(k)}`],
        onPick: () => openOrders(k),
      }) && face(planGrid.lastElementChild as HTMLElement, UNITS[k].sheet, 28);
    menuNote(planGrid.parentElement!, planLine(party, plan));
    const works = siegeCost(party, st.siege);
    if (works) menuNote(planGrid.parentElement!, `The siege works: ${works} crowns at the march (${m.crowns >= works ? 'paid back for what is not used' : 'more than you have: what the crowns cover goes'}).`);
    // the hold
    const hold = menuSection(menu.body, 'The hold', 'what the scouts saw', 2);
    const intel = menuWell(hold.parentElement!);
    const zones: Record<string, string> = { fields: 'The Killing Fields', palisade: 'The palisade', bailey: 'The outer bailey', wall: 'The stone wall', keep: 'The Throne Mound' };
    for (const [z, name] of Object.entries(zones)) {
      const posts = bp.posts.filter((p) => p.zone === z);
      const n = posts.reduce((s, p) => s + p.roster.replace(/ /g, '').length, 0);
      intel.append(el('p', '', `${name}: ${n} at ${posts.length} posts`));
    }
    intel.append(el('p', '', 'The Warpath: 20 more, marching down to the North Gate until its camp is held'));
    intel.append(el('p', '', 'Three war drums hurry the bands while they beat'));
    hold.parentElement!.append(hold);
    const war = m.war;
    const chief = warchiefOf(war);
    const council = (war?.members ?? []).filter((n) => n.army === army && n.rank !== 'warchief');
    const places = councilPlaces(council.map(snapOf), chief ? snapOf(chief) : undefined);
    const lord = lordOf(army, council.map(snapOf), chief ? snapOf(chief) : undefined);
    const lordRow = menuChoice(hold, { title: lord.snap ? `${lord.snap.name} ${lord.snap.epithet}`.trim() : UNITS[lord.base].name, icon: ' ', lines: [chief ? 'Warchief of the Dark Council, on the throne' : 'The lord of the hold, on the throne'], onPick: chief ? () => openNemesisCard(m, chief) : undefined });
    face(lordRow, UNITS[lord.base].sheet);
    // (the Council's posts are known only once scouted, until the next assault)
    const known = scouted(m, army);
    if (!known && Object.keys(places).length)
      menuChoice(hold, {
        title: `Send scouts · ${ASSAULT_PRICES.scouts}`,
        icon: '👁',
        lines: [`${Object.keys(places).length} of the Council stand somewhere in the hold`, m.crowns >= ASSAULT_PRICES.scouts ? ['Learn their posts', 'pay'] : ['Not enough crowns', 'lock']],
        disabled: m.crowns < ASSAULT_PRICES.scouts,
        onPick: () => {
          if (scoutHold(m, army)) {
            hooks.save();
            redraw();
          }
        },
      });
    for (const [post, s] of known ? Object.entries(places) : []) {
      const n = council.find((x) => x.id === s.id)!;
      const where = bp.posts.find((p) => p.id === post.split(':')[0])?.name ?? post;
      const row = menuChoice(hold, { title: `${s.name} ${s.epithet}`.trim(), icon: ' ', lines: [`${s.rank === 'captain' ? 'Captain' : 'Lieutenant'} · ${where}`], onPick: () => openNemesisCard(m, n) });
      face(row, UNITS[s.base].sheet);
    }
    const others = (war?.members ?? []).filter((n) => n.army !== army && n.rank !== 'warchief').slice(0, 2);
    for (const n of others) menuNote(hold.parentElement!, `${n.name} keeps to the ${armyById(n.army)?.name.replace(/^The /, '') ?? n.army}: this is not their war.`);
    menuFoot(menu, {
      back: { word: 'back', onClick: () => { menu?.close(); hooks.onBack(); } },
      primary: {
        label: short ? `March · ${short} platoon${short === 1 ? '' : 's'} short` : 'March',
        onClick: () => {
          st.plan = { ...plan.approaches };
          st.roles = { ...plan.roles };
          // (the siege works paid now, as far as the crowns go)
          const siege = buySiege(m, party, st.siege);
          hooks.save();
          menu?.close();
          hooks.onMarch({ approaches: { ...plan.approaches }, roles: { ...plan.roles }, formations: { ...st.formations }, ...(siege.ram || siege.ladders.length ? { siege } : {}), ...(hooks.restorm ? { restorm: true } : {}) });
        },
      },
    });
  };
  // (a platoon's orders in the plan: its way over the river, with each way's cost, and its part)
  const openOrders = (k: string) => {
    const card = ornateMenu({ id: 'assaultOrders', eyebrow: 'The War Plan', title: `${heroName(k)}'s orders`, sub: `${TROOPS[troopOf(k)].name} · ${troopsOf(m, k).length} soldiers`, onClose: redraw });
    const ways = menuSection(card.body, 'The way', 'over the Redwater', 2);
    menuPick(ways, APPROACHES, plan.approaches[k], (w) => ({ title: APPROACH_NAME[w].replace(/^the /, 'The '), icon: w === 'bridge' ? '⌇' : '≈', lines: [APPROACH_COST[w]] }), (w) => {
      plan.approaches[k] = w;
      st.plan = { ...plan.approaches };
      hooks.save();
    });
    const parts = menuSection(card.body, 'The part', 'played on its own until you order it', 2);
    menuPick(parts, ROLES, plan.roles![k], (r) => ({ title: ROLE_NAME[r], icon: r === 'main' ? '⚔' : r === 'cover' ? '⛰' : '↪', lines: [ROLE_TEXT[r]] }), (r) => {
      plan.roles![k] = r;
      st.roles = { ...plan.roles };
      hooks.save();
    });
    // (the siege works it carries: a ladder kit, the ram; paid at the march)
    const works = menuSection(card.body, 'Siege works', 'paid at the march; what is not used is paid back', 2);
    const drawWorks = () => {
      works.replaceChildren();
      const ladder = !!st.siege?.ladders?.includes(k);
      const ram = st.siege?.ram === k;
      menuChoice(works, {
        title: `A ladder · ${SIEGE_PRICES.ladder}`,
        icon: '🪜',
        on: ladder,
        lines: ['Scale the stone wall: up in four seconds, pushed down by its defenders', ladder ? '✓ Carried' : 'Tap to carry one'],
        onPick: () => {
          const list = (st.siege?.ladders ?? []).filter((x) => x !== k);
          st.siege = { ...st.siege, ladders: ladder ? list : [...list, k] };
          hooks.save();
          drawWorks();
        },
      });
      menuChoice(works, {
        title: `The ram · ${SIEGE_PRICES.ram}`,
        icon: '⛏',
        on: ram,
        lines: ['Batters the gate the platoon assaults; slow, and the archers burn it', ram ? '✓ Pushed by this platoon' : st.siege?.ram ? `With ${heroName(st.siege.ram)} now: tap to take it` : 'Tap to push it'],
        onPick: () => {
          st.siege = { ...st.siege, ram: ram ? undefined : k };
          hooks.save();
          drawWorks();
        },
      });
    };
    drawWorks();
    menuFoot(card, { back: { word: 'close' } });
  };
  // (" · a ladder, the ram")
  const worksOf = (k: string): string => {
    const w = [st.siege?.ladders?.includes(k) ? 'a ladder' : '', st.siege?.ram === k ? 'the ram' : ''].filter(Boolean);
    return w.length ? ` · ${w.join(', ')}` : '';
  };
  const redraw = () => {
    const scroll = (menu?.body.scrollTop ?? 0);
    draw();
    if (menu) menu.body.scrollTop = scroll;
  };
  // (the portraits need the heroes' and troops' sheets)
  void loadSomeSheets([...party.map((k) => UNITS[k].sheet), ...party.map((k) => UNITS[troopUnitOf(k)]?.sheet).filter(Boolean)]).then(() => {
    if (!st.told) {
      st.told = true;
      hooks.save();
      openWarTable(army, draw);
    } else draw();
  });
}

/** "Kwame and Asha take the Old Bridge. Rhys takes the West Ford." */
export function planLine(party: readonly string[], plan: AssaultPlan): string {
  return APPROACHES.map((w) => {
    const who = party.filter((k) => plan.approaches[k] === w).map(heroName);
    if (!who.length) return '';
    const names = who.length > 1 ? `${who.slice(0, -1).join(', ')} and ${who[who.length - 1]}` : who[0];
    return `${names} take${who.length > 1 ? '' : 's'} ${APPROACH_NAME[w]}.`;
  })
    .filter(Boolean)
    .join(' ');
}

/** The platoon card (8.2): the ranks (a tap on an empty place buys a recruit), the numbers at the hero's level, the formation. Read-only in
 *  battle (`readOnly`). */
export function openPlatoonCard(m: Meta, hero: string, o: { save(): void; onChange?: () => void; readOnly?: boolean; alive?: number }): void {
  const kind = TROOPS[troopOf(hero)];
  const st = assaultOf(m);
  const draw = () => {
    const list = troopsOf(m, hero);
    const menu = ornateMenu({ id: 'assaultPlatoon', eyebrow: `Platoon of ${heroName(hero)}`, title: kind.name, sub: kind.trick, onClose: o.onChange });
    const ranks = menuSection(menu.body, 'The ranks', o.readOnly ? `${o.alive ?? list.length} standing` : `${list.length} / ${PLATOON_SIZE}`, 4);
    ranks.style.gridTemplateColumns = 'repeat(5, minmax(0, 1fr))';
    const sheet = UNITS[troopUnitOf(hero)].sheet;
    for (let i = 0; i < PLATOON_SIZE; i++) {
      const marks = list[i];
      if (marks === undefined) {
        menuChoice(ranks, { title: '+', lines: [[`${ASSAULT_PRICES.recruit}`, 'pay']], disabled: o.readOnly || m.crowns < ASSAULT_PRICES.recruit, onPick: () => { if (buyRecruit(m, hero)) { o.save(); menu.close(); draw(); } } });
        continue;
      }
      const r = rankOf(marks);
      const row = menuChoice(ranks, { title: pips(marks) || '·', icon: ' ', lines: [r.name] });
      row.title = `${r.name}, ${marks} mark${marks === 1 ? '' : 's'}`;
      face(row, sheet, 26);
    }
    const battle = menuSection(menu.body, 'In battle', `at ${heroName(hero)}'s level ${levelOfKind(m, hero)}`, 2);
    const s = troopStats(troopOf(hero), levelOfKind(m, hero));
    const well = menuWell(battle.parentElement!);
    well.append(el('p', '', `Health ${s.hp} · attack ${s.atk} · reach ${s.reach} · ${s.speed} steps a second`), el('p', '', kind.text + (lookOf(hero) !== 'plain' ? ` (${lookOf(hero) === 'machine' ? 'Machine-built' : 'Risen dead'}, like their hero.)` : '')));
    battle.parentElement!.append(battle);
    const current: PlatoonFormation = st.formations?.[hero] ?? kind.formation;
    menuPick(battle, FORMATIONS, current, (f) => ({ title: FORMATION_NAMES[f], icon: f === 'wall' ? '▬' : f === 'wedge' ? '▲' : f === 'line' ? '━' : '⁘', lines: f === kind.formation ? ['their own'] : [], disabled: o.readOnly }), (f) => {
      st.formations = { ...st.formations, [hero]: f };
      o.save();
    });
    const cost = fillCost(m, hero);
    menuFoot(menu, { back: { word: 'close' }, ...(o.readOnly ? {} : { primary: { label: cost ? `Fill the ranks · ${cost}` : 'The ranks are full', disabled: !cost || m.crowns < ASSAULT_PRICES.recruit, onClick: () => { fillRanks(m, hero); o.save(); menu.close(); draw(); } } }) });
  };
  draw();
}

/** The result (8.3): a full page. */
export function openAssaultResult(_m: Meta, r: AssaultResult, hooks: { onBack(): void; onFill?(): void }): void {
  const bp = blueprintOf(r.army)!;
  const title = r.won ? `${bp.name} is conquered` : r.outcome === 'night' ? 'Night falls on the assault' : r.outcome === 'withdrawn' ? 'The retreat is sounded' : 'The host falls back';
  const menu = ornateMenu({ id: 'assaultResult', kind: 'sheet', eyebrow: `Conquest · Assault ${r.attempt}`, title, sub: r.won ? `The ${armyById(r.army)!.name.replace(/^The /, '')} is broken` : 'The hold stands at full strength for the next attempt', label: title });
  const host = menuSection(menu.body, 'The host', undefined, 2);
  const well = menuWell(host.parentElement!);
  for (const p of r.platoons) {
    const ranks = Object.entries(p.fallenRanks).map(([name, n]) => `${n} ${name}${n === 1 ? '' : 's'}`).join(', ');
    well.append(el('p', '', `${heroName(p.hero)}'s ${TROOPS[troopOf(p.hero)].name}: ${p.survivors} home${p.fallen ? `, ${p.fallen} fallen (${ranks})` : ''}${p.promoted ? `, ${p.promoted} promoted` : ''}`));
  }
  well.append(el('p', '', `Each hero takes ${r.xp} XP${r.levelUps.length ? ` · ${r.levelUps.map((u) => `${heroName(u.kind)} reaches level ${u.to}`).join(', ')}` : ''}`));
  host.parentElement!.append(host);
  // (the Council's fates, then the War News this assault wrote: the warchief's flight, a duel won, the hold's fall)
  const lines = [...nemesisLines(r.war), ...(r.news ?? [])];
  if (lines.length) {
    const sec = menuSection(menu.body, 'The Council', undefined, 2);
    const w = menuWell(sec.parentElement!);
    for (const l of lines) w.append(el('p', '', l));
  }
  if (r.won) {
    const sec = menuSection(menu.body, 'Spoils', undefined, 2);
    const w = menuWell(sec.parentElement!);
    if (r.first) {
      w.append(el('p', '', `The Spoils of the Hold: ${r.spoils} crowns`));
      if (r.chest) w.append(el('p', '', 'The Conquest chest waits on the cart at camp'));
      w.append(el('p', '', 'A cart of tribute will come to camp each morning'));
    } else w.append(el('p', '', r.regroup ? 'The Warband is broken again: half a Conquest chest waits on the cart at camp' : 'The hold is taken again'));
  }
  if (r.refund) {
    const sec = menuSection(menu.body, 'Siege works', undefined, 2);
    menuWell(sec.parentElement!).append(el('p', '', `The works not used are paid back: ${r.refund} crowns`));
  }
  menuFoot(menu, {
    back: { word: 'back', onClick: () => { menu.close(); hooks.onBack(); } },
    ...(!r.won && hooks.onFill ? { primary: { label: 'Fill the ranks', onClick: () => { menu.close(); hooks.onFill!(); } } } : {}),
  });
}
