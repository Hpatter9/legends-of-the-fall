// The codex's page for each hold (phase 3, `docs/notes/assault-3.md`; the design's phase 3): one page an army, in the army's order. A hold
// that is built has its name, its lord, its defences counted from its blueprint, what the player has done there, and how it is won; one
// not built yet (phase 4) is a locked line that names its army only. The codex page draws these (`codexView.ts`, the Holds tab, open once
// the Assault is).
//
// Pure rules: no Pixi, no DOM. It reads the blueprints themselves, not the engine, so the codex page does not load the Assault's fighters.

import { ARMIES, bossOf } from '../armies';
import type { Meta } from '../meta';
import { warchiefOf } from '../muster';
import { fullName } from '../nemesis';
import { UNITS } from '../units';
import type { Blueprint } from './blueprint';
import { HOLDS } from './holds';
import { endLine, isLastHold } from './lastHold';

/** The holds built so far, by army. */
const BUILT: Readonly<Record<string, Blueprint>> = HOLDS;

/** What the scouts see of each built hold, for the war table's report (SWEEP-1110: the report gave every hold Bloodtusk Hold's palisade and
 *  mound): its outer ring, its inner wall and its heart, from the hold's blueprint. */
export const HOLD_LOOKS: Readonly<Record<string, string>> = {
  orcs: 'a palisade over a ditch, a stone wall six steps high, and the warchief\'s throne on the mound at its heart',
  undead: 'a ring of iron railings over a ditch, a crypt wall six steps high, and the Lich\'s throne on the barrow at its heart',
  beasts: 'a ring of log walls over a ditch, a crag wall six steps high, and the Seat of the Pack in the great den at its heart',
  wildwood: 'a thorn hedge over a ditch, a wall of roots six steps high, and the throne of roots under the Elder Root at its heart',
  labyrinth: 'a maze of sandstone walls before a bronze-capped ring, a limestone wall six steps high, and the champion\'s throne before the Bull Temple at its heart',
  ogres: 'a ring wall of boulders and tusks over a ditch, a basalt wall six steps high, and the giant\'s seat in the Hall of Tusks at its heart',
  infernal: 'a ring of spiked obsidian walls over a ditch, a basalt wall six steps high, and the burning throne under the Demon Spire at its heart',
  yokai: 'a ring of plastered walls over a ditch, a castle wall six steps high, and the Oni\'s seat before the Shrine of the Moon at its heart',
  golems: 'a ring of riveted iron walls over a ditch, an iron-banded wall six steps high, and the Titan\'s anvil in the Great Foundry at its heart',
};

/** How each built hold is won, in a few lines (its tips). */
export const HOLD_TIPS: Readonly<Record<string, readonly string[]>> = {
  orcs: [
    'Silence the three war drums: while one beats, the garrison near it strikes harder.',
    'The Iron Gate is the strongest structure on the map: the trebuchet\'s volley, the ram or a sapper\'s keg breaks it quicker than blades.',
    'Three volleys, or one keg, break a reinforced crag face into a rubble ramp. Ladders scale it while it stands.',
    'Hold the Warpath camp, or burn every tent of it, and no more bands march down to the hold.',
    'A Vain captain at the Iron Gate calls out a champion: send your strongest hero, or refuse and face him Mocking.',
  ],
  undead: [
    'The still lake runs from edge to edge: cross by the causeway (its coffin barricade holds the far end) or by the two fords.',
    'Silence the three bone bells: while one rings, the dead near it strike harder.',
    'The Bone Gate is the strongest structure on the map: the trebuchet\'s volley, the ram or a sapper\'s keg breaks it quicker than blades.',
    'The crypt pens loose grave wraiths when the alarm sounds: keep a platoon ready for them.',
    'Hold the Dead Road\'s charnel camp, or burn every tent of it, and no more of the dead march down to the hold.',
  ],
  beasts: [
    'A cold river winds through the gorge from edge to edge: cross by the rope bridge (its barricade of logs holds the far end) or by the two fords.',
    'Silence the three howling stones: while one howls, the pack near it strikes harder.',
    'The Den draws no bows: its lookouts and its bank are held by Red Werewolves, who leap down on whoever comes near.',
    'The pack hunts your shooters first, going round the line to reach them: keep a wall of blades between it and your archers and mages.',
    'The Antler Gate is the strongest structure on the map: the trebuchet\'s volley, the ram or a sapper\'s keg breaks it quicker than blades.',
    'Hold the hunters\' camp on the trail behind, or burn every tent of it, and no more of the pack runs down to the hold.',
  ],
  wildwood: [
    'A black mire runs from edge to edge: two deep channels with a slow marsh between. Cross by the root bridge (its log barricade holds the far end) or by the two fords.',
    'Break the three pipers\' rings: while the satyrs pipe in one, the grove near it strikes harder.',
    'The Wildwood draws no bows: its watch trees and its bank are held by snare-laying satyrs, who come down on whoever nears them.',
    'The satyrs hunt your shooters first, going round the line to reach them: keep a wall of blades between them and your archers and mages.',
    'The Heartwood Gate is the strongest structure on the map: the trebuchet\'s volley, the ram or a sapper\'s keg breaks it quicker than blades.',
    'Hold the satyrs\' camp on the Grove Trail, or burn every tent of it, and no more of the grove comes down to the hold.',
  ],
  labyrinth: [
    'A dark canal runs from edge to edge: cross by the stone bridge (its barricade holds the far end) or by the two fords.',
    'Between the canal and the ring lies a maze of sandstone walls: its gaps are the ways through, and a platoon that misses one walks round.',
    'Break the three horned altars: while a great horn sounds on one, the garrison near it strikes harder.',
    'The gorgons on the walls turn heroes to stone from afar: keep your shooters on them, or a wall of shields before your heroes.',
    'The Bronze Gate is the strongest structure on the map: the trebuchet\'s volley, the ram or a sapper\'s keg breaks it quicker than blades.',
    'Hold the herders\' camp on the Hill Road, or burn every tent of it, and no more of the Labyrinth comes down to the hold.',
  ],
  ogres: [
    'A torrent runs through a rocky ravine from edge to edge: cross by the bone bridge (its barricade holds the far end) or by the two fords.',
    'Put out the three great bonefires: while one burns high, the clans near it strike harder.',
    'The clans draw no bows: their lookouts and their bank are held by orc brutes, who charge down on whoever nears them.',
    'The Skull Gate is the strongest structure on the map: the trebuchet\'s volley, the ram or a sapper\'s keg breaks it quicker than blades.',
    'Hold the clans\' camp on the Mountain Track, or burn every tent of it, and no more of the clans come down to the hold.',
  ],
  infernal: [
    'A river of lava runs from edge to edge: cross by the chain bridge (its barricade holds the far end) or by the two crust fords.',
    'Break the three fire circles: while the imps chant in one, the host near it strikes harder.',
    'The demons fly: walls do not keep them in, and they come over the ring at whoever is weakest.',
    'The Infernal Gate is the strongest structure on the map: the trebuchet\'s volley, the ram or a sapper\'s keg breaks it quicker than blades.',
    'Hold the host\'s camp on the Ash Road, or burn every tent of it, and no more of the pit comes down to the hold.',
  ],
  yokai: [
    'A stream runs from edge to edge, widening to the moon pond in the middle: cross by the vermilion bridge (its barricade holds the far end) or by the two fords of stepping stones.',
    'Break the three great war drums: while the parade beats one, the yokai near it strike harder.',
    'The fox witches on the walls curse from afar, and the crow tengu fly over every wall when the alarm sounds: keep your shooters busy.',
    'The Moon Gate is the strongest structure on the map: the trebuchet\'s volley, the ram or a sapper\'s keg breaks it quicker than blades.',
    'Hold the parade\'s camp on the Mountain Path, or burn every tent of it, and no more of the night parade comes down to the hold.',
  ],
  golems: [
    'A stone sluice runs from edge to edge: cross by the girder bridge (its barricade holds the far end) or by the two fords.',
    'Break the three great steam hammers: while one pounds, the golems near it strike harder.',
    'The forge draws no bows: its crystal golems hold the watchtowers and the bank, and stride down on whoever nears them. Golems are slow: let your shooters work.',
    'The Furnace Gate is the strongest structure on the map: the trebuchet\'s volley, the ram or a sapper\'s keg breaks it quicker than blades.',
    'Hold the foundry\'s camp on the Ore Road, or burn every shed of it, and no more golems come down to the hold.',
  ],
};
/** What each hold's drums are, in the page's words. */
const DRUMS: Readonly<Record<string, string>> = { orcs: 'war drums', undead: 'bone-bell belfries', beasts: 'howling stones', wildwood: 'pipers’ rings', labyrinth: 'horned altars', ogres: 'great bonefires', infernal: 'fire circles', yokai: 'great war drums', golems: 'great steam hammers' };

export interface HoldPage {
  army: string;
  /** The army's name (its card's). */
  armyName: string;
  built: boolean;
  /** The hold's name (built), else a locked line. */
  name: string;
  /** What the player has done there: not yet stormed, stormed so often, conquered. */
  record: string;
  /** The facts: the lord, the defenders, the gates, the drums. */
  facts: string[];
  tips: readonly string[];
}

const count = (roster: string): number => roster.replace(/\s/g, '').length;
/** A blueprint's defenders: those at its posts (every letter of every roster), and the bands down the Warpath. */
export const defendersOf = (bp: Blueprint): { posted: number; bands: number } => ({ posted: bp.posts.reduce((n, p) => n + count(p.roster), 0), bands: bp.reinforce.bands * count(bp.reinforce.roster) });

/** Every army's hold page, in the army's order. */
export function holdPages(m: Meta): HoldPage[] {
  const a = m.assault;
  const chief = warchiefOf(m.war);
  return ARMIES.map((army) => {
    const bp = BUILT[army.id];
    const armyName = army.name;
    if (!bp) return { army: army.id, armyName, built: false, name: 'A hold not yet found', record: `The ${armyName.replace(/^The /, '')} keep their stronghold hidden for now.`, facts: [], tips: [] };
    const tries = a?.tries[army.id] ?? 0;
    const won = a?.conquered[army.id];
    let record = won ? `Conquered${won.wins > 1 ? `, and taken ${won.wins} times` : ''} in ${tries} assault${tries === 1 ? '' : 's'}` : tries ? `Stormed ${tries} time${tries === 1 ? '' : 's'}; it still stands` : 'Not yet stormed';
    // (phase 5: the Last Hold, while it stands, and where the War ended, once it has fallen)
    const end = m.war?.end;
    if (end?.army === army.id) record += `. ${endLine(end)}`;
    else if (isLastHold(m, army.id) && m.war && !end) record += `. It is the Last Hold: the whole Dark Council stands here, and its fall ends the War`;
    const gates = bp.stamps.filter((s) => s.kind === 'gate').map((s) => (s as { name: string }).name);
    const drums = bp.stamps.filter((s) => s.kind === 'drum').length;
    const lord = end?.army === army.id ? `${end.chief.name}${end.chief.warchief ? ', the last Warchief of the Dark Council,' : ''} held its throne to the end` : chief ? `${fullName(chief)}, Warchief of the Dark Council, holds its throne` : `Its own lord, the ${UNITS[bossOf(army)]?.name ?? 'army\'s last boss'}, holds its throne while no warchief sits`;
    const d = defendersOf(bp);
    return {
      army: army.id,
      armyName,
      built: true,
      name: bp.name,
      record,
      facts: [lord, `${d.posted + d.bands} defenders: ${d.posted} at ${bp.posts.length} posts, and ${d.bands} more down the Warpath until it is held or burnt`, `Its gates: ${gates.join(', ')}`, `${drums} ${DRUMS[army.id] ?? 'war drums'}`],
      tips: HOLD_TIPS[army.id] ?? [],
    };
  });
}
