// The Howling Den, the Beast Packs' hold (phase 4, `docs/notes/assault-4.md`; the design's phase 4, the owner's name and look for it: an
// autumn moor that climbs to a snowbound den): its blueprint. It is built on Bloodtusk Hold's rings (the engine's: the ditch, the outer ring,
// the bank, the outer bailey, the inner wall and the stepped mound at the heart, each at the same place), and differs outside and between
// them. Up the phone from the Landing at the south corner: a cold river winding through a rocky gorge from edge to edge, crossed by the rope
// bridge (its barricade of logs and sleds at the far end) and two fords; the autumn moor with the two lookouts, the old hall's ruins, the
// trap line on the road, the wolf runs, the hunters' drying racks and the three howling stones (the hold's war drums); the ditch, the bank
// and the ring of log walls with the Fang Gate, two sally ports and the North Gate; the longhouses and hide huts of the outer bailey, under
// snow; the crag wall six steps above it, its corner towers and the Antler Gate; the great den and the Seat of the Pack at the top; and the Hunters' Trail
// behind, with the hunters' camp that sends the bands.
//
// Its shapes keep Bloodtusk Hold's names in the code (`palisade`, `ironGate`, `drum`), so every rule of the Assault plays here unchanged;
// the names the player reads are its own. Until its painted sheets land (`docs/notes/assault-4-howling-den-art-prompts.md`) it is drawn
// with the Moonpack kit and the Orc sheets recoloured, autumn outside the ring and snow within (`tools/assault/cut-sheets.py beasts`).

import type { Blueprint } from '../blueprint';

const STENCIL: readonly string[] = [
  'NNNNNNNNNNNNNNNNNNNNNKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
  'NNNNNNNNNNNNNNNNNNNNKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
  'NNNNNNNNNNNNNNNNNNNKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
  'NNNNNNNNNNNNNNNNNNKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
  'NNNNNNNNNNNNNNNNNKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
  'NNNNNNNNNNNNNNNNKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
  'NNNNNNNNNNNNNNNKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
  'NNNNNNNNNNNNNNKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
  'NNNNNNNNNNNNNKKKKKKKKKKKKKKKKKKKKKKKKKKKKTKKKKKKKK',
  'NNNNNNNNNNNNKKKKKKKKKKKKKKKKKKKKKKKKKKKKTTTKKKKKKK',
  'NNNNNNNNNNNKKKKKKKKKKKKKKKKKKKKKKKKKKKKTTTTTKKKKKK',
  'NNNNNNNNNNKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKTTTKKKKKKK',
  'NNNNNNNNNKKKDDDDDDDDDDDDDDDDDDDDDDDDDDKKKTKKKKKKKK',
  'NNNNNNNNKKKKDPPPPPPPPPPPPPPPPPPPPPPPPDKKKKKKKKKKKK',
  'NNNNNNNKKKKKDPEEEEEEEEEEEEEEEEEEEEEEPDKKKKKKKKKKKK',
  'NNNNNNKKKKKKDPEBBBBBBBBBBBBBBBBBBBBEPDKKKKKKKKKKKK',
  'NNNNNKKKKKKKDPEBBBBBBBBBBBBBBBBBBBBEPDKKKKKKKKKKKK',
  'NNNNKKKKKKKKDPEBBBBBBBBBBBBBBBBBBBBEPDKKKKKKKKKKKK',
  'NNNKKKKKKKKKDPEBBBBBBBBBBBBBBBBBBBBEPDKKKKKKKKKKKK',
  'NNKKKKKKKKKKDPEBBBBSSSSSSSSSSSSBBBBEPDKKKKKKKKKKKK',
  'NKKKKKKKKKKKDPEBBBBSIIIIIIIIIISBBBBEPDKKKKKKKKKKKK',
  'KKKKKKKKKKKKDPEBBBBSIIIIIIIIIISBBBBEPDKKKKKKKKKKKK',
  'KKKKKKKKKKKKDPEBBBBSIIMMMMMMIISBBBBEPDKKKKVVVKKKKK',
  'KKKKKKKKKKKKDPEBBBBSIIMMMMMMIISBBBBEPDKKKVVVVVKKKK',
  'KKKKKKKKKKKKDPEBBBBSIIMMMMMMIISBBBBEPDKKVVVVVVVKKK',
  'KKKKKKKKKKKKDPEBBBBSIIMMMMMMIISBBBBEPDKKVVVVVVVKKK',
  'KKKKKKKKKKKKDPEBBBBSIIMMMMMMIISBBBBEPDKKKVVVVVKKKK',
  'KKKKKKKKKKKKDPEBBBBSIIMMMMMMIISBBBBEPDKKKKVVVKKKKK',
  'KKKKKKKKKKKKDPEBBBBSIIIIIIIIIISBBBBEPDKKKKKKKKKKKK',
  'KKKKKKKKKKKKDPEBBBBSIIIIIIIIIISBBBBEPDKKKKKKKKKKKR',
  'KKKKKKKKKKKKDPEBBBBSSSSSSSSSSSSBBBBEPDKKKKKKKKKKRR',
  'KKKKKKKKKKKKDPEBBBBBBBBBBBBBBBBBBBBEPDKKKKKKKKKRRR',
  'KKKKKKKKKKKKDPEBBBBBBBBBBBBBBBBBBBBEPDKKKKKKKKKRRK',
  'KKKKKKKKKKKKDPEBBBBBBBBBBBBBBBBBBBBEPDKKKKKKKKKRRK',
  'KKKKKKKKKKKKDPEBBBBBBBBBBBBBBBBBBBBEPDKKKKKKKKFFKK',
  'KKKKKKKKKKKKDPEEEEEEEEEEEEEEEEEEEEEEPDKKKKKKKKFFKK',
  'KKKKKKKKKKKKDPPPPPPPPPPPPPPPPPPPPPPPPDKKKKKKKKRFKK',
  'KKKKKKKKKKKKDDDDDDDDDDDDDDDDDDDDDDDDDDKKKKKKKRRKKK',
  'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKRRRKKL',
  'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKRRRRKKKL',
  'KKKKKKKKKKKKKKKKKKKKKKKTKKKKKKKKKKKKKKKYRRRRRKKKLL',
  'KKKKKKKKKKKKKKKKKKKKKKTTTKKKKKKKKKKKKRYYRRRKKKKLLL',
  'KKKKKKKKKKKKKKKKKKKKKTTTTTKKKKKKKKKKRRYYKKKKKLLLLL',
  'KKKKKKKKKKKKKKKKKKKKTTTTTTTKKKKKKKKRRRKKKKLLLLLLLL',
  'KKKKKKKKKKKKKKKKKKKKKTTTTTKKKKKKKKKRRKKKLLLLLLLLCC',
  'KKKKKKKKKKKKKKKKKKKKKKTTTKKKKKKKKKFRKKKLLLLLLLLCCC',
  'KKKKKKKKKKKKKKKKKKKKKKKTKKKKKKKKKKFFKKLLLLLLLLCCCC',
  'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKFFKKLLLLLLLCCCCC',
  'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKRRKKKLLLLLLCCCCCC',
  'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKRRKKKLLLLLLCCCCCC',
];

export const DEN: Blueprint = {
  army: 'beasts',
  name: 'Howling Den',
  stencil: STENCIL,
  stamps: [
    // the rope bridge's barricade of logs and sleds at its far end (an L with a gap a tile wide, open behind), and the barrels of lamp oil within
    { kind: 'barricade', tiles: [{ u: 75, v: 79 }, { u: 76, v: 79 }, { u: 78, v: 79 }, { u: 79, v: 79 }, { u: 80, v: 79 }, { u: 80, v: 78 }, { u: 80, v: 77 }, { u: 80, v: 76 }, { u: 80, v: 75 }, { u: 80, v: 74 }] },
    { kind: 'barrel', at: { u: 76, v: 77 } },
    { kind: 'barrel', at: { u: 79, v: 75 } },
    // (the bracken on the West Ford's far bank hides an ambush)
    { kind: 'ground', rect: { u0: 58, v0: 86, u1: 62, v1: 89 }, ground: 'tall' },
    // the tracks: from the Landing along the gorge to the rope bridge, and from its far end north beside the ditch to the Fang Gate
    { kind: 'paved', rect: { u0: 80, v0: 90, u1: 91, v1: 91 } },
    { kind: 'paved', rect: { u0: 77, v0: 70, u1: 78, v1: 78 } },
    { kind: 'paved', rect: { u0: 76, v0: 58, u1: 77, v1: 69 } },
    // the trap line across the road (slower going)
    { kind: 'stakes', rect: { u0: 76, v0: 63, u1: 81, v1: 65 }, period: 3000, offset: 0 },
    // the lookouts on their crags, each with a ramp down
    { kind: 'perch', name: 'The West Lookout', rect: { u0: 21, v0: 91, u1: 23, v1: 93 }, h: 8, ramp: { u: 22, v: 94 }, dir: [0, 1] },
    { kind: 'perch', name: 'The East Lookout', rect: { u0: 91, v0: 21, u1: 93, v1: 23 }, h: 8, ramp: { u: 94, v: 22 }, dir: [1, 0] },
    // the wolf runs under the east lookout, the hunters' drying racks
    { kind: 'fence', rect: { u0: 84, v0: 27, u1: 89, v1: 32 } },
    { kind: 'solid', name: 'Drying rack', rect: { u0: 14, v0: 70, u1: 15, v1: 70 }, burns: true },
    { kind: 'solid', name: 'Drying rack', rect: { u0: 18, v0: 75, u1: 19, v1: 75 }, burns: true },
    { kind: 'solid', name: 'Drying rack', rect: { u0: 13, v0: 74, u1: 13, v1: 75 }, burns: true },
    // the moor's camps: the hide tents by the stones and the east ring, their bonfires
    { kind: 'solid', name: 'Hide tent', rect: { u0: 87, v0: 43, u1: 88, v1: 43 }, burns: true },
    { kind: 'solid', name: 'Hide tent', rect: { u0: 90, v0: 46, u1: 90, v1: 47 }, burns: true },
    { kind: 'solid', name: 'Bonfire', rect: { u0: 89, v0: 45, u1: 89, v1: 45 } },
    { kind: 'solid', name: 'Hide tent', rect: { u0: 20, v0: 83, u1: 21, v1: 83 }, burns: true },
    { kind: 'solid', name: 'Bonfire', rect: { u0: 22, v0: 88, u1: 22, v1: 88 } },
    { kind: 'solid', name: 'Hide tent', rect: { u0: 83, v0: 20, u1: 83, v1: 21 }, burns: true },
    { kind: 'solid', name: 'Bonfire', rect: { u0: 88, v0: 22, u1: 88, v1: 22 } },
    { kind: 'solid', name: 'Bonfire', rect: { u0: 17, v0: 73, u1: 17, v1: 73 } },
    // (the Hunters' Trail's camp, whose tents burn: the reserve camp of the Warpath rules)
    { kind: 'solid', name: 'Reserve tent', rect: { u0: 8, v0: 10, u1: 9, v1: 10 }, burns: true },
    { kind: 'solid', name: 'Reserve tent', rect: { u0: 11, v0: 7, u1: 11, v1: 8 }, burns: true },
    { kind: 'solid', name: 'Reserve tent', rect: { u0: 16, v0: 9, u1: 16, v1: 10 }, burns: true },
    // the knoll of the old stones by the gorge, with its shrine
    { kind: 'height', rect: { u0: 65, v0: 83, u1: 67, v1: 85 }, h: 5 },
    { kind: 'ground', rect: { u0: 66, v0: 84, u1: 66, v1: 84 }, ground: 'shrine' },
    // the three howling stones (the war drums' part)
    { kind: 'drum', name: 'The West Howling Stone', at: { u: 24, v: 86 } },
    { kind: 'drum', name: 'The East Howling Stone', at: { u: 86, v: 24 } },
    { kind: 'drum', name: 'The Gate Howling Stone', at: { u: 80, v: 61 } },
    // the ring's gates, each with a causeway over the ditch
    { kind: 'gate', fort: 'southGate', name: 'The Fang Gate', rect: { u0: 72, v0: 58, u1: 73, v1: 59 }, floor: 4, causeway: { u0: 74, v0: 58, u1: 75, v1: 59 }, causewayH: 3 },
    { kind: 'gate', fort: 'sallyPort', name: 'The West Sally Port', rect: { u0: 41, v0: 72, u1: 41, v1: 73 }, floor: 4, causeway: { u0: 41, v0: 74, u1: 41, v1: 75 }, causewayH: 3 },
    { kind: 'gate', fort: 'sallyPort', name: 'The East Sally Port', rect: { u0: 72, v0: 41, u1: 73, v1: 41 }, floor: 4, causeway: { u0: 74, v0: 41, u1: 75, v1: 41 }, causewayH: 3 },
    { kind: 'gate', fort: 'northGate', name: 'The North Gate', rect: { u0: 26, v0: 40, u1: 27, v1: 41 }, floor: 4, causeway: { u0: 24, v0: 40, u1: 25, v1: 41 }, causewayH: 3 },
    // the Fang Gate's two towers on the bank
    { kind: 'perch', name: 'The Fang Gate’s north tower', rect: { u0: 70, v0: 55, u1: 71, v1: 56 }, h: 6 },
    { kind: 'perch', name: 'The Fang Gate’s south tower', rect: { u0: 70, v0: 61, u1: 71, v1: 62 }, h: 6 },
    // the outer bailey: the longhouses, the hide huts (they burn), the smoking pits and their oil, the kennels
    { kind: 'solid', name: 'Longhouse', rect: { u0: 63, v0: 31, u1: 65, v1: 32 } },
    { kind: 'solid', name: 'Longhouse', rect: { u0: 66, v0: 35, u1: 68, v1: 36 } },
    { kind: 'solid', name: 'Longhouse', rect: { u0: 31, v0: 63, u1: 32, v1: 65 } },
    { kind: 'solid', name: 'Hide hut', rect: { u0: 45, v0: 65, u1: 45, v1: 65 }, burns: true },
    { kind: 'solid', name: 'Hide hut', rect: { u0: 54, v0: 67, u1: 54, v1: 67 }, burns: true },
    { kind: 'solid', name: 'Hide hut', rect: { u0: 66, v0: 45, u1: 66, v1: 45 }, burns: true },
    { kind: 'solid', name: 'Hide hut', rect: { u0: 63, v0: 38, u1: 63, v1: 38 }, burns: true },
    { kind: 'ground', rect: { u0: 63, v0: 52, u1: 65, v1: 54 }, ground: 'coals' },
    { kind: 'barrel', at: { u: 66, v: 52 } },
    { kind: 'barrel', at: { u: 66, v: 55 } },
    { kind: 'height', rect: { u0: 32, v0: 56, u1: 35, v1: 59 }, h: 1 },
    { kind: 'fence', rect: { u0: 49, v0: 31, u1: 54, v1: 35 } },
    { kind: 'piece', at: { u: 34, v: 50 }, piece: 'campfire' },
    { kind: 'piece', at: { u: 35, v: 52 }, piece: 'skulls' },
    // the crag wall: the Antler Gate, the four corner towers, two stairs up its inner face to the wall-walk
    { kind: 'gate', fort: 'ironGate', name: 'The Antler Gate', rect: { u0: 60, v0: 49, u1: 61, v1: 50 }, floor: 2 },
    { kind: 'perch', name: 'The north corner tower', rect: { u0: 38, v0: 38, u1: 40, v1: 40 }, h: 10 },
    { kind: 'perch', name: 'The east corner tower', rect: { u0: 59, v0: 38, u1: 61, v1: 40 }, h: 10 },
    { kind: 'perch', name: 'The west corner tower', rect: { u0: 38, v0: 59, u1: 40, v1: 61 }, h: 10 },
    { kind: 'perch', name: 'The south corner tower', rect: { u0: 59, v0: 59, u1: 61, v1: 61 }, h: 10 },
    { kind: 'stair', from: { u: 50, v: 59 }, dir: [1, 0], h0: 3, dh: 1, n: 6 },
    { kind: 'stair', from: { u: 49, v: 40 }, dir: [-1, 0], h0: 3, dh: 1, n: 6 },
    // the crag top's staircases: the broad one on its south face, the narrow one on its north
    { kind: 'stair', from: { u: 58, v: 48 }, dir: [-1, 0], h0: 3, dh: 1, n: 7, wide: 3 },
    { kind: 'stair', from: { u: 41, v: 49 }, dir: [1, 0], h0: 3, dh: 1, n: 7 },
    // the seat's yard: the great den behind, the seat of furs, the braziers and the great banner
    { kind: 'solid', name: 'The great den', rect: { u0: 44, v0: 44, u1: 46, v1: 46 } },
    { kind: 'piece', at: { u: 48, v: 47 }, piece: 'skulls' },
    { kind: 'piece', at: { u: 47, v: 48 }, piece: 'brazier' },
    { kind: 'piece', at: { u: 51, v: 47 }, piece: 'brazier' },
    { kind: 'piece', at: { u: 49, v: 46 }, piece: 'flag' },
    // our camp at the Landing: tents, fires and the rally flag
    { kind: 'piece', at: { u: 93, v: 93 }, piece: 'flag' },
    { kind: 'piece', at: { u: 95, v: 97 }, piece: 'tent' },
    { kind: 'piece', at: { u: 97, v: 95 }, piece: 'tent' },
    { kind: 'piece', at: { u: 98, v: 91 }, piece: 'tent' },
    { kind: 'piece', at: { u: 91, v: 98 }, piece: 'tent' },
    { kind: 'piece', at: { u: 98, v: 98 }, piece: 'tent' },
    { kind: 'piece', at: { u: 88, v: 99 }, piece: 'tent' },
    { kind: 'piece', at: { u: 95, v: 94 }, piece: 'campfire' },
    { kind: 'piece', at: { u: 92, v: 96 }, piece: 'campfire' },
  ],
  posts: [
    // the autumn moor
    { id: 'bridge', name: 'The rope bridge barricade', zone: 'fields', at: { u: 78, v: 77 }, roster: 'L GGGGG AAA' },
    { id: 'westTower', name: 'The West Lookout', zone: 'fields', at: { u: 22, v: 92 }, roster: 'G AAAA' },
    { id: 'eastTower', name: 'The East Lookout', zone: 'fields', at: { u: 92, v: 22 }, roster: 'G AAAA' },
    { id: 'westPatrol', name: 'The west hunt', zone: 'fields', at: { u: 34, v: 84 }, roster: 'GGGG AA', loop: [{ u: 34, v: 84 }, { u: 46, v: 80 }, { u: 56, v: 78 }, { u: 46, v: 80 }] },
    { id: 'eastPatrol', name: 'The east hunt', zone: 'fields', at: { u: 84, v: 34 }, roster: 'GGGG AA', loop: [{ u: 84, v: 34 }, { u: 80, v: 46 }, { u: 78, v: 56 }, { u: 80, v: 46 }] },
    { id: 'wolves', name: 'The wolf runs', zone: 'fields', at: { u: 86, v: 30 }, roster: 'GG WWWWWWWW', horn: true },
    { id: 'lumber', name: 'The drying racks', zone: 'fields', at: { u: 16, v: 72 }, roster: 'GGGGGG' },
    { id: 'village', name: 'The old hall', zone: 'fields', at: { u: 86, v: 50 }, roster: 'GGGGGG' },
    { id: 'drumW', name: 'The West Howling Stone', zone: 'fields', at: { u: 25, v: 84 }, roster: 'L GGGG BB', guards: 'drumW' },
    { id: 'drumE', name: 'The East Howling Stone', zone: 'fields', at: { u: 84, v: 25 }, roster: 'L GGGG BB', guards: 'drumE' },
    { id: 'drumS', name: 'The Gate Howling Stone', zone: 'fields', at: { u: 80, v: 59 }, roster: 'L GGGG BB', guards: 'drumS' },
    // the ring
    { id: 'southGate', name: 'The Fang Gate', zone: 'palisade', at: { u: 70, v: 58 }, roster: 'C GGGG AAAA BB', guards: 'southGate' },
    { id: 'westPort', name: 'The West Sally Port', zone: 'palisade', at: { u: 41, v: 69 }, roster: 'GGG AA B', horn: true, guards: 'westPort' },
    { id: 'eastPort', name: 'The East Sally Port', zone: 'palisade', at: { u: 69, v: 41 }, roster: 'GGG AA B', horn: true, guards: 'eastPort' },
    { id: 'northGate', name: 'The North Gate', zone: 'palisade', at: { u: 31, v: 41 }, roster: 'GGG A' },
    { id: 'bankSE', name: 'The bank’s bowmen (east)', zone: 'palisade', at: { u: 70, v: 47 }, roster: 'AAA' },
    { id: 'bankSW', name: 'The bank’s bowmen (west)', zone: 'palisade', at: { u: 47, v: 70 }, roster: 'AAA' },
    { id: 'bankS1', name: 'The bank’s bowmen (south)', zone: 'palisade', at: { u: 70, v: 66 }, roster: 'AAA' },
    { id: 'bankS2', name: 'The bank’s bowmen (south-west)', zone: 'palisade', at: { u: 66, v: 70 }, roster: 'AAA' },
    // the outer bailey
    { id: 'barracks', name: 'The longhouses', zone: 'bailey', at: { u: 65, v: 34 }, roster: 'GGGGGGGGG BBBBB', horn: true },
    { id: 'forge', name: 'The smoking pits', zone: 'bailey', at: { u: 64, v: 56 }, roster: 'BBBBBB' },
    { id: 'bonefire', name: 'The bonfire and the bone yard', zone: 'bailey', at: { u: 34, v: 52 }, roster: 'GGGGGG BB' },
    { id: 'beasts', name: 'The kennels', zone: 'bailey', at: { u: 52, v: 33 }, roster: 'WWWWWW', horn: true },
    // the crag wall
    { id: 'towerN', name: 'The north corner tower', zone: 'wall', at: { u: 39, v: 39 }, roster: 'AAA' },
    { id: 'towerE', name: 'The east corner tower', zone: 'wall', at: { u: 60, v: 39 }, roster: 'AAA' },
    { id: 'towerW', name: 'The west corner tower', zone: 'wall', at: { u: 39, v: 60 }, roster: 'AAA' },
    { id: 'towerS', name: 'The south corner tower', zone: 'wall', at: { u: 60, v: 60 }, roster: 'AAA' },
    { id: 'ironGate', name: 'The Antler Gate', zone: 'wall', at: { u: 57, v: 46 }, roster: 'C BBB GG A', guards: 'ironGate' },
    { id: 'wallWalk', name: 'The wall-walk', zone: 'wall', at: { u: 60, v: 52 }, roster: 'AAAA', guards: 'ironGate' },
    // the den
    { id: 'throne', name: 'The Seat of the Pack', zone: 'keep', at: { u: 49, v: 49 }, roster: 'K CC BBBBBBB' },
  ],
  reinforce: { at: { u: 31, v: 40 }, roster: 'GGG A B', bands: 4 },
  warpath: { u: 13, v: 13 },
  park: { u: 98, v: 91 },
  approaches: [
    { id: 'west', name: 'the West Ford', way: [{ u: 84, v: 96 }, { u: 76, v: 97 }, { u: 70, v: 95 }, { u: 66, v: 90 }, { u: 58, v: 84 }, { u: 50, v: 80 }] },
    { id: 'bridge', name: 'the rope bridge', way: [{ u: 86, v: 92 }, { u: 80, v: 90 }, { u: 78, v: 87 }, { u: 78, v: 83 }, { u: 77, v: 80 }, { u: 77, v: 74 }, { u: 77, v: 64 }] },
    { id: 'east', name: 'the East Ford', way: [{ u: 96, v: 84 }, { u: 97, v: 76 }, { u: 95, v: 70 }, { u: 90, v: 66 }, { u: 84, v: 58 }, { u: 80, v: 50 }] },
  ],
  rally: { u: 93, v: 93 },
  muster: [
    { u: 89, v: 95 },
    { u: 92, v: 91 },
    { u: 95, v: 88 },
    { u: 86, v: 97 },
    { u: 97, v: 85 },
  ],
  throne: { u: 49, v: 49 },
  northGate: { u: 22, v: 40 },
  lands: { outer: 'autumn', inner: 'snow' },
};
