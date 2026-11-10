// HOLD-SOUND (docs/notes/hold-sound.md): the pure rules of the Assault's sound: each hold's bed and drums, the war table's and the field's
// music, the cue each of the field's events calls for, the drums' beat, the pan, and what the music does as an assault ends; and the
// engine playing them (the bed that stands in for the scene's, the drum line, every new cue built on the fake context).
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES } from '../src/sim/armies';
import { blueprintOf } from '../src/sim/assault/assault';
import type { HoldEvent } from '../src/sim/assault/holdTypes';
import { BEDS, PAN_MAX } from '../src/render/audioRules';
import { AmbientBeds } from '../src/render/audioBeds';
import { busOf } from '../src/render/audioMix';
import { CUES, cuesFor, isDoorwaySwap, type Cue } from '../src/render/soundRules';
import type { Battle } from '../src/sim/battle';
import { TRACK_OF_PLACE } from '../src/render/epicMusic';
import { atPlace, endAt, musicOf, BATTLE_TRACK, VICTORY_LOOP, type MusicState } from '../src/render/battleMusic';
import {
  DRUM_GAP_S, HOLD_HEAR_TILES, HOLD_PLAIN, HOLD_VOICE, assaultEnd, drumGap, fortHitCue, holdCues, holdPan, holdScene, holdVoice, isNearOnly,
  type HoldLike,
} from '../src/render/holdSound';
import { ultCues } from '../src/ultMomentRules';
import { FakeContext, installFakeAudio } from './audioFake';

const HOLD: HoldLike = {
  kinds: { south: 'southGate', iron: 'ironGate', port: 'sallyPort', wall: 'palisade', drum1: 'drum' },
  posts: [{ def: { id: 'gatehouse' } }, { def: { id: 'throne' } }],
};
const cuesOf = (e: HoldEvent): Cue[] => holdCues(HOLD, e).map((q) => q.cue);

test('every army with a hold has a voice of its own: a bed that exists, and its drums', () => {
  const built = ARMIES.filter((a) => blueprintOf(a.id));
  assert.equal(built.length, 9, 'the nine holds');
  for (const a of built) {
    const v = HOLD_VOICE[a.id];
    assert.ok(v, `${a.id} has a voice`);
    assert.ok(BEDS[v.bed], `${a.id}'s bed exists`);
    assert.notEqual(v.bed, 'armies', `${a.id} is not the plain rumble`);
  }
  // (the places the owner named: a forge, crypt drones, wind and wolves, forest, lava, shrine bells)
  assert.deepEqual(
    ['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'].map((a) => HOLD_VOICE[a].bed),
    ['warcamp', 'barrow', 'den', 'forest', 'maze', 'bonefire', 'volcano', 'shrine', 'foundry'],
  );
  assert.equal(HOLD_VOICE.undead.drum, 'bell', 'the bone-bell belfries toll');
  assert.equal(HOLD_VOICE.beasts.drum, 'howl', 'the howling stones howl');
  assert.equal(HOLD_VOICE.golems.drum, 'hammer', 'the steam hammers fall');
  assert.ok(BEDS.warcamp.shots.some((s) => s.kind === 'anvil'), 'the warcamp has its forge');
  assert.ok(BEDS.den.shots.some((s) => s.kind === 'howl'), 'the den has its wolves');
  assert.ok(BEDS.shrine.shots.some((s) => s.kind === 'chime'), 'the shrine has its bells');
  assert.deepEqual(holdVoice('nobody'), HOLD_PLAIN);
});

test('the war table plays the deployment\'s music over the host\'s camp, the Last Hold\'s the dark map music; the field is the hold itself', () => {
  assert.deepEqual(holdScene({ army: 'orcs', at: 'table' }), { bed: 'armies', place: 'muster' });
  assert.deepEqual(holdScene({ army: 'orcs', at: 'table', last: true }), { bed: 'armies', place: 'lastHold' });
  assert.equal(TRACK_OF_PLACE.muster, 'deploy');
  assert.equal(TRACK_OF_PLACE.lastHold, 'calmap');
  assert.deepEqual(holdScene({ army: 'yokai', at: 'field' }), { bed: 'shrine', place: 'deploy' });
  assert.deepEqual(holdScene({ army: 'yokai', at: 'field', last: true }), { bed: 'shrine', place: 'deploy' });
});

test('on the hold\'s field the battle track is heard (it was not: the Armies screen behind it kept the camp\'s music), and a win holds the triumph bed', () => {
  const track = (p: keyof typeof TRACK_OF_PLACE) => TRACK_OF_PLACE[p];
  // (as it was: the place stayed the camp's, so the battle's track was set and never heard)
  const old: MusicState = { place: 'camp', battle: BATTLE_TRACK, fighting: true, victory: false };
  assert.equal(musicOf(old, track).track, 'camp');
  let s: MusicState = atPlace({ place: 'camp', battle: null, fighting: false, victory: false }, holdScene({ army: 'orcs', at: 'table' }).place);
  assert.equal(musicOf(s, track).track, 'deploy');
  s = { ...atPlace(s, holdScene({ army: 'orcs', at: 'field' }).place), battle: BATTLE_TRACK, fighting: true };
  assert.equal(musicOf(s, track).track, BATTLE_TRACK);
  const won = endAt(s, assaultEnd({ won: true }).music);
  assert.equal(won.sting, 'victory');
  assert.equal(musicOf(won.state, track).track, VICTORY_LOOP);
  // (the result left: the camp's music again, no victory held)
  assert.equal(musicOf(atPlace(won.state, 'camp'), track).track, 'camp');
});

test('the drums beat steadily while all stand, slower as each is silenced, and not at all once none is left', () => {
  assert.deepEqual(drumGap(3, 3), [DRUM_GAP_S, DRUM_GAP_S * 1.3]);
  const [two] = drumGap(2, 3)!;
  const [one] = drumGap(1, 3)!;
  assert.ok(two > DRUM_GAP_S && one > two);
  assert.equal(one, DRUM_GAP_S * 3);
  assert.equal(drumGap(0, 3), null);
  assert.equal(drumGap(0, 0), null);
  assert.deepEqual(drumGap(5, 3), drumGap(3, 3), 'never faster than all standing');
});

test('gates and walls being hit, battered and broken each have their sound', () => {
  assert.equal(fortHitCue('southGate'), 'gateHit');
  assert.equal(fortHitCue('ironGate'), 'gateHit');
  assert.equal(fortHitCue('palisade'), 'wallHit');
  assert.equal(fortHitCue('drum'), 'drumHit');
  assert.equal(fortHitCue(undefined), 'wallHit');
  assert.deepEqual(cuesOf({ kind: 'fortHit', fort: 'south', dmg: 5, by: 1 }), ['gateHit']);
  assert.deepEqual(cuesOf({ kind: 'fortHit', fort: 'wall', dmg: 5, by: 1 }), ['wallHit']);
  assert.deepEqual(cuesOf({ kind: 'fortHit', fort: 'drum1', dmg: 5, by: 1 }), ['drumHit']);
  assert.ok(holdCues(HOLD, { kind: 'fortHit', fort: 'south', dmg: 5, by: 1 })[0].gain! < 1, 'a blow on a gate is soft: there are many');
  assert.deepEqual(cuesOf({ kind: 'breach', fort: 'south', tiles: [] }), ['gateBreak']);
  assert.deepEqual(cuesOf({ kind: 'breach', fort: 'wall', tiles: [] }), ['wallBreak']);
  assert.deepEqual(cuesOf({ kind: 'open', fort: 'port', tiles: [] }), ['gateBreak']);
});

test('rams, ladders and siege engines, the weak points, the horn, the drums and the keep\'s fall each have their sound', () => {
  assert.deepEqual(cuesOf({ kind: 'ram', fort: 'south' }), ['ramHit']);
  assert.deepEqual(cuesOf({ kind: 'ladder', platoon: 0, tiles: [1], up: true }), ['ladderUp']);
  assert.deepEqual(cuesOf({ kind: 'ladder', platoon: 0, tiles: [1], up: false }), ['ladderDown']);
  assert.deepEqual(cuesOf({ kind: 'volleyTold', tiles: [1] }), ['trebLoose']);
  assert.deepEqual(cuesOf({ kind: 'volley', tiles: [1] }), ['fireBoom', 'earthRumble']);
  assert.deepEqual(cuesOf({ kind: 'keg', platoon: 0, state: 'carried', tile: 1 }), []);
  assert.deepEqual(cuesOf({ kind: 'keg', platoon: 0, state: 'lit', tile: 1 }), ['fuse']);
  assert.deepEqual(cuesOf({ kind: 'keg', platoon: 0, state: 'boom', tile: 1 }), ['fireBoom', 'wallBreak']);
  assert.deepEqual(cuesOf({ kind: 'weakness', fort: 'south' }), ['weakPoint']);
  assert.deepEqual(cuesOf({ kind: 'horn' }), ['greatHorn']);
  assert.deepEqual(cuesOf({ kind: 'silenced', fort: 'drum1' }), ['drumSilenced']);
  assert.deepEqual(cuesOf({ kind: 'wolves', post: 0, platoon: 0 }), ['wolfHowl']);
  assert.deepEqual(cuesOf({ kind: 'lordFell' }), ['keepFall']);
  // (a captain's sally stings; the lord himself coming down from the throne is the boss's own warning)
  assert.deepEqual(cuesOf({ kind: 'captain', post: 0, platoon: 0 }), ['eliteSting']);
  assert.deepEqual(cuesOf({ kind: 'captain', post: 1, platoon: 0 }), ['standBoss']);
  // (the quiet ones: the battle's own sounds carry them)
  assert.deepEqual(cuesOf({ kind: 'feint', post: 0, fort: 'south' }), []);
  assert.deepEqual(cuesOf({ kind: 'rout', post: 0 }), []);
  assert.deepEqual(cuesOf({ kind: 'fell', platoon: 0, soldier: 1, index: 0 }), []);
});

test('every cue a hold event can call for exists, and the breaks and the keep\'s fall are never dropped from the mix', () => {
  const events: HoldEvent[] = [
    { kind: 'fortHit', fort: 'south', dmg: 1, by: 0 }, { kind: 'fortHit', fort: 'wall', dmg: 1, by: 0 }, { kind: 'fortHit', fort: 'drum1', dmg: 1, by: 0 },
    { kind: 'ram', fort: 'south' }, { kind: 'breach', fort: 'south', tiles: [] }, { kind: 'breach', fort: 'wall', tiles: [] }, { kind: 'open', fort: 'port', tiles: [] },
    { kind: 'weakness', fort: 'south' }, { kind: 'horn' }, { kind: 'silenced', fort: 'drum1' }, { kind: 'ladder', platoon: 0, tiles: [], up: true },
    { kind: 'ladder', platoon: 0, tiles: [], up: false }, { kind: 'volleyTold', tiles: [] }, { kind: 'volley', tiles: [] }, { kind: 'keg', platoon: 0, state: 'lit', tile: 0 },
    { kind: 'keg', platoon: 0, state: 'boom', tile: 0 }, { kind: 'burn', hut: 'a' }, { kind: 'campBurnt' }, { kind: 'reinforce', post: 0, n: 3 }, { kind: 'march', post: 0 },
    { kind: 'held' }, { kind: 'captain', post: 0, platoon: 0 }, { kind: 'wolves', post: 0, platoon: 0 }, { kind: 'rise', platoon: 0, id: 1 },
    { kind: 'duelCalled', post: 0, captain: 1 }, { kind: 'duelOver', out: 'won', captain: 1 }, { kind: 'duelOver', out: 'lost', captain: 1 },
    { kind: 'chiefFled', to: 'x', at: 0 }, { kind: 'lordFell' },
  ];
  for (const e of events) {
    const cues = holdCues(HOLD, e);
    assert.ok(cues.length, `${e.kind} is heard`);
    for (const q of cues) assert.ok(CUES[q.cue], `${q.cue} exists`);
  }
  for (const k of ['gateBreak', 'wallBreak', 'keepFall', 'greatHorn', 'weakPoint', 'drumSilenced', 'warEnd', 'lastHold'] as const) assert.equal(CUES[k].prio, 3, `${k} always plays`);
  // (the blows on the structures are spaced: a platoon's many strikes never machine-gun)
  for (const k of ['gateHit', 'wallHit', 'drumHit'] as const) assert.ok(CUES[k].gap >= 200 && CUES[k].prio < 3);
});

test('a blow on a structure is heard only near the camera, panned by where it is; the battle\'s news is heard everywhere', () => {
  assert.ok(isNearOnly({ kind: 'fortHit', fort: 'south', dmg: 1, by: 0 }));
  assert.ok(isNearOnly({ kind: 'ram', fort: 'south' }));
  assert.ok(isNearOnly({ kind: 'ladder', platoon: 0, tiles: [], up: true }));
  for (const e of [{ kind: 'breach', fort: 'south', tiles: [] }, { kind: 'horn' }, { kind: 'lordFell' }, { kind: 'weakness', fort: 'south' }, { kind: 'silenced', fort: 'd' }] as HoldEvent[]) assert.ok(!isNearOnly(e), e.kind);
  assert.equal(holdPan(0, 0), 0);
  assert.ok(holdPan(10, 0) > 0, 'east is to the right');
  assert.ok(holdPan(0, 10) < 0, 'south is to the left');
  assert.equal(holdPan(7, 7), 0, 'straight down the screen is the middle');
  assert.ok(Math.abs(holdPan(HOLD_HEAR_TILES * 9, 0)) <= PAN_MAX);
});

test('an assault\'s end: the fanfare for a hold conquered, the War\'s end over it, the defeat sting for a fall, only the horn for a retreat', () => {
  assert.deepEqual(assaultEnd({ won: true, outcome: 'won' }), { music: 'victory', cues: [] });
  const war = assaultEnd({ won: true, outcome: 'won', warEnded: true });
  assert.equal(war.music, 'victory');
  assert.deepEqual(war.cues.map((q) => q.cue), ['warEnd']);
  assert.ok(war.cues[0].delay! > 0, 'after the fanfare\'s first notes');
  assert.deepEqual(assaultEnd({ won: false, outcome: 'night' }), { music: 'defeat', cues: [] });
  assert.deepEqual(assaultEnd({ won: false, outcome: 'lost' }), { music: 'defeat', cues: [] });
  const out = assaultEnd({ won: false, outcome: 'withdrawn' });
  assert.equal(out.music, 'none');
  assert.deepEqual(out.cues.map((q) => q.cue), ['greatHorn']);
});

test('a hand-fired ultimate: the build-up under the slash, the slow beat after the freeze; none of the drag when calm', () => {
  assert.deepEqual(ultCues('open', false).map((q) => q.cue), ['ultSlash', 'ultCharge']);
  const hit = ultCues('impact', false);
  assert.deepEqual(hit.map((q) => q.cue), ['ultImpact', 'ultSlow']);
  assert.ok(hit[1].delay! > 0, 'the slow beat comes as the freeze lets go');
  assert.deepEqual(ultCues('impact', true).map((q) => q.cue), ['ultImpact']);
  // (the build-up lasts the opening: about a second and a half)
  assert.ok(CUES.ultCharge.ms >= 1200 && CUES.ultCharge.ms <= 1500);
});

test('the doorway swap is feet shuffling past, not a spell\'s blink; a kit\'s swap still blinks', () => {
  const door = { t: 5000, units: [{ id: 1, swapAt: 5000 }, { id: 2, swapAt: 5000 }] } as unknown as Battle;
  assert.ok(isDoorwaySwap(door, 1));
  assert.deepEqual(cuesFor(door, { kind: 'swap', a: 1, b: 2 }).map((q) => q.cue), ['steps']);
  // (a kit's or a spell's swap stamps nobody; one stamped long ago is not this swap)
  const kit = { t: 5000, units: [{ id: 1 }, { id: 2 }] } as unknown as Battle;
  assert.deepEqual(cuesFor(kit, { kind: 'swap', a: 1, b: 2 }).map((q) => q.cue), ['blink', 'blink']);
  const old = { t: 9000, units: [{ id: 1, swapAt: 5000 }, { id: 2 }] } as unknown as Battle;
  assert.deepEqual(cuesFor(old, { kind: 'swap', a: 1, b: 2 }).map((q) => q.cue), ['blink', 'blink']);
});

test('the menus\' new cues are the page\'s own (the ui bus)', () => {
  for (const k of ['runeSlide', 'runeMerge', 'runeSet', 'ledger'] as const) assert.equal(busOf(k), 'ui');
  for (const k of ['gateHit', 'keepFall', 'ultCharge', 'warEnd'] as const) assert.equal(busOf(k), 'sfx');
});

/* ------------------------------------------------------------------ the engine */

test('a hold\'s bed stands in for the scene\'s while it is set, and the scene\'s comes back after', () => {
  installFakeAudio();
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  try {
    const ctx = new FakeContext();
    const beds = new AmbientBeds(ctx as unknown as BaseAudioContext, () => 0.5);
    beds.setScene('armies');
    assert.equal(beds.bed, 'armies');
    beds.setOver('den');
    assert.equal(beds.bed, 'den');
    // (the page behind the Assault asking for its scene again changes nothing while the hold is set)
    beds.setScene('camp');
    assert.equal(beds.bed, 'den');
    assert.equal(beds.scene, 'camp');
    beds.setOver(null);
    assert.equal(beds.bed, 'camp');
    beds.destroy();
  } finally {
    mock.timers.reset();
  }
});

test('the drum line beats on its own clock in the hold\'s voice, and stops when told', () => {
  installFakeAudio();
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  try {
    const ctx = new FakeContext();
    const beds = new AmbientBeds(ctx as unknown as BaseAudioContext, () => 0);
    const shots: string[] = [];
    const real = beds.shot.bind(beds);
    beds.shot = (bed, kind, t) => {
      shots.push(kind);
      real(bed, kind, t);
    };
    beds.setOver('shrine');
    assert.equal(beds.drumming, null);
    beds.setDrums('taiko', drumGap(3, 3));
    assert.equal(beds.drumming, 'taiko');
    // (asked again the same: the clock is not started over)
    beds.setDrums('taiko', drumGap(3, 3));
    ctx.currentTime = DRUM_GAP_S + 0.1;
    mock.timers.tick(500);
    assert.ok(shots.includes('taiko'), 'the drums beat');
    const n = shots.filter((k) => k === 'taiko').length;
    beds.setDrums(null);
    assert.equal(beds.drumming, null);
    ctx.currentTime = 60;
    mock.timers.tick(500);
    assert.equal(shots.filter((k) => k === 'taiko').length, n, 'silenced: no more beats');
    beds.destroy();
  } finally {
    mock.timers.reset();
  }
});

test('every one-shot a hold\'s bed or drums can make is built without error', () => {
  installFakeAudio();
  const ctx = new FakeContext();
  const beds = new AmbientBeds(ctx as unknown as BaseAudioContext, () => 0.3);
  beds.setOver('warcamp');
  const live = (beds as unknown as { current: Parameters<AmbientBeds['shot']>[0] }).current;
  const kinds = new Set([...Object.values(HOLD_VOICE).map((v) => v.drum), ...Object.values(HOLD_VOICE).flatMap((v) => BEDS[v.bed].shots.map((s) => s.kind))]);
  for (const k of kinds) assert.doesNotThrow(() => beds.shot(live, k, 1), k);
  beds.destroy();
});
