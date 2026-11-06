// The Nemesis War, phase 4: what a nemesis says as it challenges (`docs/notes/nemesis-4.md`). A challenge's cut-in plays the taunt cut-in
// (`tauntCut.ts`) with one of these lines, in its army's voice (`nemesisLines.ts`): `named` when it calls a hero out by name, `open` when a
// Vain one calls out any champion. `{name}` is its own name, `{hero}` the hero it names. The hero answers with its personal reply
// (`REPLIES`). Two lines a voice for now, in the taunts' style; more can follow for the owner to read. Pure data.

import type { Voice } from './nemesisLines';

export const DUEL_LINES: Readonly<Record<'named' | 'open', Readonly<Record<Voice, readonly string[]>>>> = {
  named: {
    orcs: ['{hero}! You and me, no runts, no tricks. In the ring!', 'Oi, {hero}! Step out where the others can watch you lose.'],
    undead: ['{hero}. Come into the circle. Let us end this, you and I.', 'The others may watch, {hero}. This grave is dug for one.'],
    beasts: ['{hero}. The pack stays back. You are mine alone.', 'I smell you, {hero}. Into the ring, and run if you can.'],
    wildwood: ['Dance with me, {hero}, inside the ring of stones.', 'Only you, {hero}. The others would spoil the game.'],
    labyrinth: ['{hero}, I name you. Single combat, by the old law of these halls.', 'The arena awaits, {hero}. Let the crowd of your friends see it.'],
    ogres: ['{hero}! Me fight you. Only you. Others go away.', 'You, {hero}! In circle! Me squash you proper.'],
    infernal: ['{hero}. I grant you the honour of dying before an audience.', 'Into the circle, {hero}. Let it be a contract signed in blood.'],
    yokai: ['A riddle for {hero} alone: who leaves the ring alive?', '{hero}, step into my circle. The answer is waiting inside.'],
    golems: ['{hero}: selected for single combat. Compliance is expected.', 'Protocol of challenge invoked. {hero}, enter the ring.'],
  },
  open: {
    orcs: ['Who is the biggest of you? Send them out. I will make them small.', 'One of you! Any one! Come and bleed in the ring!'],
    undead: ['Send me your champion, living ones. I will add them to my count.', 'One of you will step into the circle. Choose well.'],
    beasts: ['Your strongest. Send your strongest. I hunger.', 'One of you. Into the ring. The rest may watch.'],
    wildwood: ['Which of you will dance with me? Do not all speak at once.', 'A champion, a champion! Who will play in my ring?'],
    labyrinth: ['Name your champion. The halls demand a duel.', 'Let your best come into the arena, and be seen to fall.'],
    ogres: ['Who strongest? Send strongest. Me smash strongest.', 'One of you come in circle! Me not wait long!'],
    infernal: ['Bring me your finest, mortals, so that all may see me.', 'A champion, if you please. My glory needs a witness.'],
    yokai: ['A riddle: which of you is brave? Send them, and we shall see.', 'Who will answer me in the ring? Only one may try.'],
    golems: ['Request: one champion. Processing time limited.', 'Challenge issued. Nominate your strongest unit.'],
  },
};
