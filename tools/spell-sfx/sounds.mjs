// The king's spells' sounds, each built from the kit's layers. Two a spell: `cast-<id>` (the moment the spell goes off: a king's
// magic swell and whoomp, coloured by the spell's element) and `fx-<id>` (what the spell does). Chain Lightning has a hop for
// each leap (`fx-chain-hop`) and the Meteor Shower a fall for each meteor (`fx-star`). `impact` is when, in seconds into the
// file, a falling thing lands: the page starts the file that much before the sim's landing (`src/render/spellSfx.ts`).

import { Sfx, tone, noise, clicks, ping, sparkle, thump, voice, room, echo, choir, brass, bell, timpani, drum, swell, mtof } from './kit.mjs';

/* ------------------------------------------------------------------ the cast: one shape, eight colours */

/** When the cast's whoomp lands, in seconds into its file. The cast plays as the spell's event arrives, so this is kept short:
 *  the whoomp falls with the spell's first light, and the element's shimmer rises out of it. */
const WHOOMP = 0.07;

/** The shape every cast shares: a quick breath in, a soft low whoomp at `at`, and a bright bloom rising out of it. */
function castBody(s, at, o = {}) {
  noise(s, 0, at + 0.02, { type: 'bp', hz: o.from ?? 600, hz1: o.to ?? 2400, q: 1.2, amp: o.air ?? 0.2, a: at, ap: 2, tau: 0.02, curve: 'in' });
  thump(s, at, { f0: o.f0 ?? 150, f1: o.f1 ?? 52, tau: o.tau ?? 0.16, amp: o.boom ?? 0.5, drop: 0.05 });
  noise(s, at, 0.3, { type: 'lp', hz: 1800, hz1: 300, amp: o.puff ?? 0.22, a: 0.004, tau: 0.07 });
  noise(s, at, 0.5, { type: 'bp', hz: o.bloom ?? 1500, hz1: (o.bloom ?? 1500) * 4, q: 1.5, amp: 0.1, a: 0.25, ap: 1.5, tau: 0.1, curve: 'exp' });
}

/** The colours. `n` is the spell's own note (midi), so two spells of one element still sound apart. Each rises out of the
 *  whoomp at `at` over about a third of a second. */
const CAST = {
  fire(s, n, at) {
    castBody(s, at, { f0: 130, bloom: 700 });
    noise(s, at, 0.6, { type: 'lp', hz: 500, hz1: 3000, q: 0.8, amp: 0.3, a: 0.22, tau: 0.15, grain: 0.7, ap: 1.5 });
    tone(s, at, 0.45, { f: mtof(n - 12), f1: mtof(n), type: 'saw', detune: [-12, 0, 12], lp: 600, lpTo: 3000, amp: 0.12, a: 0.25, tau: 0.08, curve: 'exp' });
    clicks(s, at, 0.55, 26, { hz: 2600, amp: 0.18, spread: 0.7 });
  },
  ice(s, n, at) {
    castBody(s, at, { f0: 170, boom: 0.4, air: 0.14, bloom: 3000 });
    sparkle(s, at, 0.3, 7, [n, n + 3, n + 7, n + 10, n + 12, n + 15], { order: 'up', tau: 0.35, amp: 0.07, ratios: [1, 2.32, 4.25, 6.63], amps: [1, 0.5, 0.25, 0.12] });
    clicks(s, at, 0.35, 30, { type: 'hp', hz: 6500, amp: 0.12, shape: 'decay' });
    noise(s, at, 0.6, { type: 'hp', hz: 5000, hz1: 2500, amp: 0.1, a: 0.1, tau: 0.2 });
  },
  light(s, n, at) {
    castBody(s, at, { f0: 160, boom: 0.42, air: 0.14, bloom: 2000 });
    choir(s.bus, at, 0.4, n - 12, 0.6, { a: 0.15, r: 0.35, gain: 0.55 });
    choir(s.bus, at, 0.4, n - 5, 0.6, { a: 0.15, r: 0.35, gain: 0.45 });
    ping(s, at, mtof(n + 12), { tau: 0.55, amp: 0.1 });
    sparkle(s, at + 0.05, 0.35, 6, [n + 12, n + 16, n + 19, n + 24], { order: 'up', tau: 0.25, amp: 0.05 });
  },
  lightning(s, n, at) {
    castBody(s, at, { f0: 140, air: 0.16, bloom: 2500 });
    noise(s, at - 0.01, 0.05, { type: 'hp', hz: 3000, amp: 0.4, a: 0.001, tau: 0.012 });
    tone(s, at, 0.35, { f: 60, f1: 240, type: 'saw', detune: [-20, 20], lp: 800, lpTo: 5000, amp: 0.12, a: 0.25, ap: 2, tau: 0.03, curve: 'in' });
    clicks(s, at, 0.35, 22, { type: 'hp', hz: 4500, amp: 0.2, ms: 3 });
  },
  earth(s, n, at) {
    castBody(s, at, { f0: 110, f1: 38, boom: 0.65, tau: 0.22, air: 0.18, bloom: 400 });
    clicks(s, at, 0.45, 30, { hz: 700, q: 1.5, amp: 0.2, shape: 'decay', ms: 10 });
    noise(s, at, 0.6, { type: 'lp', hz: 220, amp: 0.3, tau: 0.25, grain: 0.6 });
  },
  dark(s, n, at) {
    // (after the whoomp a breath is drawn in and stops dead, like a sound played backwards)
    thump(s, at, { f0: 120, f1: 40, tau: 0.2, amp: 0.5 });
    noise(s, 0, at + 0.02, { type: 'bp', hz: 500, hz1: 1500, q: 1.5, amp: 0.15, a: at, ap: 2, tau: 0.02 });
    noise(s, at, 0.32, { type: 'bp', hz: 300, hz1: 2000, q: 2, amp: 0.28, a: 0.3, ap: 3, tau: 0.004 });
    tone(s, at, 0.6, { f: mtof(n - 24), type: 'saw', detune: [-25, 0, 31], lp: 500, lpTo: 900, amp: 0.16, a: 0.2, ap: 2, tau: 0.15 });
    voice(s, at, 0.4, { vowel: 'hh', vowel1: 'ss', breath: 1, pitch: () => 100, amp: 0.18, a: 0.25, ap: 2, tau: 0.06, q: 4, pan: -0.3 });
  },
  forest(s, n, at) {
    castBody(s, at, { f0: 140, boom: 0.4, air: 0.12, bloom: 1200 });
    // (wooden chimes: a marimba-like ping, the overtone at four times)
    sparkle(s, at, 0.3, 5, [n, n + 2, n + 4, n + 7, n + 9], { order: 'up', tau: 0.22, amp: 0.1, ratios: [1, 3.93, 9.2], amps: [1, 0.35, 0.08] });
    tone(s, at, 0.5, { f: mtof(n + 12), f1: mtof(n + 19), glide: 0.4, amp: 0.05, a: 0.15, tau: 0.2, vib: 18 });
    noise(s, at, 0.45, { type: 'hp', hz: 3500, amp: 0.08, a: 0.1, tau: 0.15, grain: 0.9 });
  },
  wind(s, n, at) {
    castBody(s, at, { f0: 150, boom: 0.35, air: 0.24, bloom: 2000 });
    noise(s, at, 0.45, { type: 'bp', hz: 900, hz1: 3500, q: 2.5, amp: 0.22, a: 0.15, tau: 0.12, pan: -0.6, panTo: 0.6 });
    tone(s, at, 0.4, { f: mtof(n), f1: mtof(n + 12), amp: 0.06, a: 0.1, tau: 0.12, vib: 25, curve: 'exp' });
  },
  poison(s, n, at) {
    castBody(s, at, { f0: 120, boom: 0.45, air: 0.14, bloom: 900 });
    for (let k = 0; k < 9; k++) {
      const f = 180 + s.rng.next() * 380;
      tone(s, at + k * 0.04, 0.07, { f, f1: f * 2.2, curve: 'in', amp: 0.12, a: 0.004, tau: 0.03, pan: s.rng.next() - 0.5 });
    }
    noise(s, at, 0.5, { type: 'hp', hz: 3000, amp: 0.12, a: 0.1, tau: 0.18 });
  },
};

/** A cast for one spell: its element's colour on its own note, with the whoomp at `WHOOMP`, in a small room. `extra` adds the
 *  spell's own touch at the whoomp. */
function cast(seed, el, n, extra) {
  return {
    seconds: 1.1,
    loud: -12,
    whoomp: WHOOMP,
    make(s) {
      CAST[el](s, n, WHOOMP);
      extra?.(s, WHOOMP);
      room(s, 0.25);
    },
    seed,
  };
}

export const SOUNDS = {
  'cast-heal': cast(1, 'light', 72, (s, at) => tone(s, at, 0.4, { f: mtof(84), amp: 0.04, tau: 0.2, vib: 12 })),
  'cast-shield': cast(2, 'light', 67, (s, at) => tone(s, at, 0.5, { f: 330, type: 'tri', detune: [-6, 6], amp: 0.08, tau: 0.25 })),
  'cast-smite': cast(3, 'light', 76, (s, at) => noise(s, at, 0.04, { type: 'hp', hz: 4000, amp: 0.35, a: 0.001, tau: 0.01 })),
  'cast-resurrect': cast(4, 'light', 69, (s, at) => bell(s.bus, at, 0.8, 57, 0.6, { ring: 1.2, gain: 0.7 })),
  'cast-cleanse': cast(5, 'light', 79, (s, at) => noise(s, at, 0.4, { type: 'bp', hz: 6000, hz1: 2000, q: 1.5, amp: 0.12, tau: 0.15 })),
  'cast-lance': cast(6, 'light', 74, (s, at) => tone(s, at, 0.35, { f: mtof(62), f1: mtof(86), type: 'saw', lp: 2000, lpTo: 7000, amp: 0.05, a: 0.3, ap: 2, tau: 0.02, curve: 'in' })),
  'cast-meteor': cast(7, 'fire', 52),
  'cast-rally': cast(8, 'fire', 55, (s, at) => drum(s.bus, at, 'taiko', 0.8, { gain: 0.9 })),
  'cast-warcry': cast(9, 'fire', 50, (s, at) => drum(s.bus, at, 'tom3', 0.9, { gain: 0.9 })),
  'cast-starfall': cast(10, 'fire', 64, (s, at) => sparkle(s, at, 0.5, 8, [76, 79, 83, 86, 88, 91], { tau: 0.3, amp: 0.06, fade: true })),
  'cast-frost': cast(11, 'ice', 81),
  'cast-deepfreeze': cast(12, 'ice', 69, (s, at) => tone(s, at, 0.5, { f: 70, f1: 55, type: 'saw', lp: 400, amp: 0.1, tau: 0.2 })),
  'cast-chain': cast(13, 'lightning', 70),
  'cast-quake': cast(14, 'earth', 40),
  'cast-bulwark': cast(15, 'earth', 45, (s, at) => ping(s, at, 196, { tau: 0.5, ratios: [1, 1.48, 2.14, 2.86], amps: [1, 0.6, 0.4, 0.25], amp: 0.1 })),
  'cast-blink': cast(16, 'dark', 62),
  'cast-hex': cast(17, 'dark', 58, (s, at) => tone(s, at, 0.6, { f: mtof(70), f1: mtof(69), amp: 0.05, tau: 0.25, vib: 30, vibRate: 7 })),
  'cast-renewal': cast(18, 'forest', 67),
  'cast-wolves': cast(19, 'forest', 57, (s, at) => voice(s, at, 0.4, { vowel: 'oh', breath: 0.6, pitch: (k) => 90 - 20 * k, growl: 0.6, amp: 0.25, a: 0.05, tau: 0.15 })),
  'cast-haste': cast(20, 'wind', 79),
  'cast-poison': cast(21, 'poison', 60),

  /* ------------------------------------------------------------------ the effects */

  // Heal: a warm rising arpeggio over a soft "ooh", and a breath of sparkle.
  'fx-heal': {
    seed: 31, seconds: 2.2, loud: -10,
    make(s) {
      choir(s.bus, 0, 0.7, 60, 0.5, { vowel: 'oo', a: 0.12, r: 0.6, gain: 0.5 });
      choir(s.bus, 0, 0.7, 64, 0.5, { vowel: 'oo', a: 0.12, r: 0.6, gain: 0.4 });
      choir(s.bus, 0, 0.7, 67, 0.5, { vowel: 'oo', a: 0.12, r: 0.6, gain: 0.35 });
      sparkle(s, 0.02, 0.4, 6, [72, 76, 79, 84, 88, 91], { order: 'up', tau: 0.45, amp: 0.1, ratios: [1, 2, 3], amps: [1, 0.2, 0.06] });
      sparkle(s, 0.3, 0.8, 10, [84, 88, 91, 96], { tau: 0.25, amp: 0.04, fade: true });
      noise(s, 0, 0.9, { type: 'hp', hz: 6000, amp: 0.05, a: 0.2, tau: 0.3 });
      room(s, 0.35);
    },
  },
  // Meteor: the rush of air as it falls, then the blast, the crack and the debris, and a rumble under it all.
  'fx-meteor': {
    seed: 32, seconds: 3.2, loud: -9, impact: 0.62,
    make(s) {
      const hit = 0.62;
      tone(s, 0, hit, { f: 1600, f1: 260, curve: 'in', type: 'tri', amp: 0.09, a: 0.1, ap: 2, tau: 1, hold: 1 });
      noise(s, 0, hit, { type: 'bp', hz: 2500, hz1: 500, q: 1.2, amp: 0.55, a: hit, ap: 2.5, tau: 1, grain: 0.5, pan: -0.5, panTo: 0 });
      thump(s, hit, { f0: 110, f1: 30, tau: 0.45, amp: 0.9, drive: 2.5, drop: 0.06 });
      noise(s, hit, 0.9, { type: 'lp', hz: 4000, hz1: 250, amp: 0.7, a: 0.002, tau: 0.22, grain: 0.4 });
      noise(s, hit, 0.06, { type: 'hp', hz: 2500, amp: 0.6, a: 0.001, tau: 0.015 });
      clicks(s, hit + 0.02, 1.2, 60, { hz: 1500, amp: 0.25, shape: 'decay', ms: 9, spread: 0.9 });
      noise(s, hit, 2.2, { type: 'lp', hz: 110, amp: 0.55, a: 0.05, tau: 0.6, grain: 0.5 });
      room(s, 0.3, { seconds: 2.2, rt: [2.4, 2, 1.3, 0.6] });
    },
  },
  // One small meteor of the shower: a shorter fall and a lighter blast, with a sparkle.
  'fx-star': {
    seed: 33, seconds: 2, loud: -10.5, impact: 0.38,
    make(s) {
      const hit = 0.38;
      tone(s, 0, hit, { f: 2400, f1: 500, curve: 'in', type: 'tri', amp: 0.08, a: 0.08, ap: 2, tau: 1, hold: 1 });
      noise(s, 0, hit, { type: 'bp', hz: 3500, hz1: 800, q: 1.4, amp: 0.25, a: hit, ap: 2.5, tau: 1 });
      thump(s, hit, { f0: 140, f1: 40, tau: 0.25, amp: 0.7, drive: 2 });
      noise(s, hit, 0.5, { type: 'lp', hz: 5000, hz1: 400, amp: 0.5, a: 0.002, tau: 0.12, grain: 0.4 });
      clicks(s, hit, 0.6, 24, { hz: 2200, amp: 0.2, shape: 'decay', ms: 6, spread: 0.9 });
      sparkle(s, hit, 0.3, 4, [88, 91, 95], { tau: 0.2, amp: 0.05 });
      room(s, 0.25);
    },
  },
  // The shower's sky: a high glittering fall that tells five are coming.
  'fx-starfall': {
    seed: 34, seconds: 1.8, loud: -14,
    make(s) {
      sparkle(s, 0, 0.7, 14, [79, 83, 86, 88, 91, 95, 98], { order: 'down', tau: 0.35, amp: 0.08 });
      noise(s, 0, 1, { type: 'hp', hz: 7000, hz1: 3000, amp: 0.06, a: 0.2, tau: 0.3 });
      echo(s, 0.16, 0.35, 0.3);
      room(s, 0.4);
    },
  },
  // Haste: two quick gusts crossing, a rising whistle and a ticking that speeds up.
  'fx-haste': {
    seed: 35, seconds: 1.4, loud: -10.5,
    make(s) {
      noise(s, 0, 0.35, { type: 'bp', hz: 600, hz1: 4000, q: 2, amp: 0.4, a: 0.12, tau: 0.08, pan: -0.8, panTo: 0.8 });
      noise(s, 0.18, 0.35, { type: 'bp', hz: 900, hz1: 5000, q: 2, amp: 0.35, a: 0.1, tau: 0.08, pan: 0.8, panTo: -0.8 });
      tone(s, 0.02, 0.5, { f: 900, f1: 2700, curve: 'exp', amp: 0.08, a: 0.05, tau: 0.15, vib: 30, vibRate: 9 });
      for (let k = 0; k < 7; k++) {
        const at = 0.05 + 0.5 * (1 - (1 - k / 7) ** 1.6);
        ping(s, at, 2600 + k * 120, { tau: 0.03, amp: 0.08, ratios: [1, 2.4], amps: [1, 0.4], pan: k % 2 ? 0.4 : -0.4 });
      }
      room(s, 0.2);
    },
  },
  // Shield: a ringing glassy shell closing round, and a hum that holds.
  'fx-shield': {
    seed: 36, seconds: 2, loud: -10.5,
    make(s) {
      ping(s, 0, 440, { tau: 0.8, ratios: [1, 1.48, 2.14, 2.86, 3.7], amps: [1, 0.6, 0.4, 0.25, 0.12], amp: 0.14 });
      ping(s, 0.04, 660, { tau: 0.6, ratios: [1, 2.76], amps: [1, 0.3], amp: 0.08, pan: 0.4 });
      noise(s, 0, 0.25, { type: 'bp', hz: 5000, hz1: 1500, q: 1.5, amp: 0.25, a: 0.01, tau: 0.08 });
      tone(s, 0.03, 1.2, { f: 220, type: 'tri', detune: [-5, 5], amp: 0.12, a: 0.15, tau: 0.45, wobble: 0.004 });
      tone(s, 0.03, 1.2, { f: 330, amp: 0.06, a: 0.2, tau: 0.45 });
      room(s, 0.35);
    },
  },
  // Smite: a bolt from above: the zip, the crack, the bell and a choir's shout, and thunder rolling off.
  'fx-smite': {
    seed: 37, seconds: 2.6, loud: -9,
    make(s) {
      tone(s, 0, 0.07, { f: 3000, f1: 800, type: 'saw', lp: 6000, amp: 0.08, a: 0.04, tau: 0.02 });
      noise(s, 0.06, 0.06, { type: 'hp', hz: 2500, amp: 0.8, a: 0.001, tau: 0.015 });
      clicks(s, 0.06, 0.25, 30, { type: 'hp', hz: 5000, amp: 0.25, shape: 'decay', ms: 3 });
      thump(s, 0.06, { f0: 140, f1: 40, tau: 0.3, amp: 0.75, drive: 2 });
      bell(s.bus, 0.06, 1.5, 76, 0.9, { ring: 1.4, gain: 1.1 });
      choir(s.bus, 0.05, 0.3, 64, 0.9, { a: 0.02, r: 0.4, gain: 0.6 });
      choir(s.bus, 0.05, 0.3, 71, 0.9, { a: 0.02, r: 0.4, gain: 0.5 });
      noise(s, 0.12, 2, { type: 'lp', hz: 160, amp: 0.4, a: 0.08, tau: 0.5, grain: 0.7, am: [3, 0.4] });
      room(s, 0.35, { seconds: 2, rt: [2.2, 1.8, 1.2, 0.6] });
    },
  },
  // Chain Lightning: the first strike's crack and buzz; each leap after it plays a hop.
  'fx-chain': {
    seed: 38, seconds: 1.4, loud: -10,
    make(s) {
      noise(s, 0, 0.05, { type: 'hp', hz: 2000, amp: 0.45, a: 0.001, tau: 0.012 });
      tone(s, 0, 0.3, { f: 95, f1: 85, type: 'saw', detune: [-30, 0, 35], lp: 3500, lpTo: 1200, amp: 0.4, a: 0.003, tau: 0.12, drive: 3 });
      noise(s, 0, 0.3, { type: 'bp', hz: 2500, q: 0.8, amp: 0.3, a: 0.002, tau: 0.08, am: [60, 0.9] });
      clicks(s, 0, 0.4, 40, { type: 'hp', hz: 5000, amp: 0.25, shape: 'decay', ms: 3, spread: 0.8 });
      thump(s, 0, { f0: 120, f1: 45, tau: 0.15, amp: 0.4 });
      noise(s, 0.05, 1, { type: 'lp', hz: 200, amp: 0.25, a: 0.05, tau: 0.3, grain: 0.7 });
      room(s, 0.25);
    },
  },
  'fx-chain-hop': {
    seed: 39, seconds: 0.8, loud: -12,
    make(s) {
      noise(s, 0, 0.04, { type: 'hp', hz: 3000, amp: 0.4, a: 0.001, tau: 0.01 });
      tone(s, 0, 0.16, { f: 140, f1: 120, type: 'saw', detune: [-25, 25], lp: 4500, lpTo: 1500, amp: 0.35, a: 0.002, tau: 0.06, drive: 3 });
      clicks(s, 0, 0.2, 14, { type: 'hp', hz: 6000, amp: 0.2, shape: 'decay', ms: 2 });
      room(s, 0.15);
    },
  },
  // Poison Cloud: a heavy puff, then bubbling and hissing as the cloud settles.
  'fx-poison': {
    seed: 40, seconds: 3, loud: -10.5,
    make(s) {
      noise(s, 0, 0.6, { type: 'lp', hz: 1400, hz1: 400, amp: 0.5, a: 0.04, tau: 0.18 });
      thump(s, 0, { f0: 90, f1: 40, tau: 0.2, amp: 0.4 });
      for (let k = 0; k < 26; k++) {
        const u = s.rng.next();
        const at = 0.1 + u * u * 2.2;
        const f = 160 + s.rng.next() * 520;
        tone(s, at, 0.06, { f, f1: f * (1.8 + s.rng.next()), curve: 'in', amp: 0.13 * (1 - u * 0.5), a: 0.003, tau: 0.025, pan: s.rng.next() * 1.4 - 0.7 });
      }
      noise(s, 0.05, 2.6, { type: 'hp', hz: 3500, amp: 0.1, a: 0.3, tau: 0.8, am: [5, 0.5] });
      voice(s, 0.1, 1.2, { vowel: 'oh', vowel1: 'oo', breath: 0.3, pitch: (k) => 70 - 15 * k, amp: 0.2, a: 0.2, tau: 0.4, growl: 0.5 });
      room(s, 0.3);
    },
  },
  // Frost Nova: ice racing over the ground and snapping shut, a crystal shimmer, and a cold wind.
  'fx-frost': {
    seed: 41, seconds: 2.4, loud: -10,
    make(s) {
      clicks(s, 0, 0.35, 60, { type: 'hp', hz: 6000, amp: 0.2, shape: 'rise', ms: 4, spread: 0.9 });
      for (const [at, pan] of [[0, 0], [0.06, -0.5], [0.12, 0.5]]) {
        noise(s, at, 0.12, { type: 'bp', hz: 3500, q: 1.2, amp: 0.4, a: 0.002, tau: 0.03, pan });
        clicks(s, at, 0.1, 10, { hz: 2500, amp: 0.25, shape: 'decay', ms: 5, pan, spread: 0.3 });
      }
      noise(s, 0.32, 0.05, { type: 'hp', hz: 2500, amp: 0.3, a: 0.001, tau: 0.012 });
      sparkle(s, 0.32, 0.5, 12, [88, 91, 93, 96, 98, 100], { tau: 0.4, amp: 0.1, ratios: [1, 2.32, 4.25, 6.63], amps: [1, 0.5, 0.25, 0.12] });
      noise(s, 0.2, 1.5, { type: 'bp', hz: 3000, hz1: 700, q: 1.5, amp: 0.15, a: 0.2, tau: 0.5, am: [1.7, 0.4] });
      room(s, 0.35);
    },
  },
  // Rally: two war drums, a brass call of two notes, and a roar of fire behind them.
  'fx-rally': {
    seed: 42, seconds: 2.6, loud: -10,
    make(s) {
      drum(s.bus, 0, 'taiko', 1, { gain: 1.2 });
      drum(s.bus, 0.2, 'taiko', 0.9, { gain: 1.1, pan: 0.2 });
      brass(s.bus, 0.18, 0.22, 55, 0.9, { gain: 0.9 });
      brass(s.bus, 0.18, 0.22, 62, 0.9, { gain: 0.6 });
      brass(s.bus, 0.42, 0.7, 60, 1, { gain: 1, vib: 8 });
      brass(s.bus, 0.42, 0.7, 67, 1, { gain: 0.7, vib: 8 });
      noise(s, 0.1, 1, { type: 'lp', hz: 600, hz1: 2000, amp: 0.25, a: 0.3, tau: 0.3, grain: 0.7 });
      room(s, 0.35);
    },
  },
  // Earthquake: the ground breaks with a crack and rumbles long, rocks tumbling as it shakes.
  'fx-quake': {
    seed: 43, seconds: 3.6, loud: -9,
    make(s) {
      thump(s, 0, { f0: 80, f1: 28, tau: 0.6, amp: 0.9, drive: 2.5, drop: 0.08 });
      noise(s, 0, 0.08, { type: 'bp', hz: 1200, q: 0.8, amp: 0.7, a: 0.001, tau: 0.03 });
      noise(s, 0, 3.2, { type: 'lp', hz: 120, hz1: 70, amp: 0.9, a: 0.08, hold: 1.2, tau: 0.6, grain: 0.8, steep: true });
      tone(s, 0, 3, { f: 38, f1: 30, amp: 0.3, a: 0.1, hold: 1, tau: 0.6, wobble: 0.05 });
      for (let k = 0; k < 14; k++) thump(s, 0.15 + s.rng.next() * 2.2, { f0: 200 + s.rng.next() * 200, f1: 70, tau: 0.08, amp: 0.25 * s.rng.next() + 0.1, pan: s.rng.next() * 1.6 - 0.8 });
      clicks(s, 0.05, 2.6, 70, { hz: 600, q: 1.5, amp: 0.25, shape: 'decay', ms: 12, spread: 0.9 });
      noise(s, 0.4, 0.2, { type: 'bp', hz: 900, q: 1, amp: 0.3, a: 0.002, tau: 0.05, pan: 0.5 });
      room(s, 0.2, { seconds: 2, rt: [2.5, 1.6, 1, 0.5], dark: 0.6 });
    },
  },
  // Resurrect: a heartbeat, a choir rising to a major chord, a harp climbing and a bell.
  'fx-resurrect': {
    seed: 44, seconds: 3.4, loud: -10,
    make(s) {
      thump(s, 0, { f0: 70, f1: 45, tau: 0.1, amp: 0.6 });
      thump(s, 0.2, { f0: 60, f1: 40, tau: 0.12, amp: 0.5 });
      for (const [m, g] of [[57, 0.5], [61, 0.42], [64, 0.38], [69, 0.3]]) choir(s.bus, 0.15, 1.1, m, 0.7, { a: 0.6, r: 0.9, gain: g });
      sparkle(s, 0.2, 0.9, 10, [69, 73, 76, 81, 85, 88, 93, 97], { order: 'up', tau: 0.6, amp: 0.08, ratios: [1, 2, 3, 4], amps: [1, 0.3, 0.12, 0.05] });
      bell(s.bus, 1.0, 2, 69, 0.8, { ring: 1.6, gain: 0.9 });
      swell(s.bus, 0.15, 0.85, 0.5, { gain: 0.7 });
      room(s, 0.45, { seconds: 2.4, rt: [2.8, 2.4, 1.6, 0.8] });
    },
  },
  // Cleanse: a washing splash of light falling, and a clear chime.
  'fx-cleanse': {
    seed: 45, seconds: 2, loud: -10.5,
    make(s) {
      noise(s, 0, 0.6, { type: 'bp', hz: 7000, hz1: 1200, q: 1.2, amp: 0.35, a: 0.02, tau: 0.2, curve: 'exp' });
      noise(s, 0.03, 0.6, { type: 'hp', hz: 5000, amp: 0.12, a: 0.01, tau: 0.15, grain: 0.9 });
      sparkle(s, 0.02, 0.5, 9, [96, 93, 91, 88, 84, 81, 79, 76, 72].reverse(), { order: 'down', tau: 0.3, amp: 0.07, ratios: [1, 2, 3], amps: [1, 0.2, 0.06] });
      ping(s, 0.45, mtof(84), { tau: 0.6, amp: 0.1, ratios: [1, 2, 3, 4.2], amps: [1, 0.3, 0.1, 0.05] });
      room(s, 0.35);
    },
  },
  // Blink: a sucked-in swell, a snap as the hero vanishes, and a pop where it lands.
  'fx-blink': {
    seed: 46, seconds: 1.2, loud: -10.5,
    make(s) {
      tone(s, 0, 0.12, { f: 2200, f1: 220, type: 'saw', lp: 5000, lpTo: 900, amp: 0.15, a: 0.002, tau: 0.05, curve: 'exp', pan: -0.4 });
      noise(s, 0, 0.1, { type: 'bp', hz: 4000, hz1: 1000, q: 2, amp: 0.4, a: 0.002, tau: 0.03, pan: -0.4 });
      tone(s, 0.16, 0.12, { f: 300, f1: 1500, type: 'sine', amp: 0.22, a: 0.002, tau: 0.05, curve: 'exp', pan: 0.4 });
      thump(s, 0.17, { f0: 200, f1: 80, tau: 0.06, amp: 0.4, pan: 0.4 });
      noise(s, 0.16, 0.4, { type: 'hp', hz: 3000, amp: 0.1, a: 0.01, tau: 0.12, pan: 0.4 });
      room(s, 0.25);
    },
  },
  // Hex: a dark cluster swelling, whispers turning round the foes, and a sour bell.
  'fx-hex': {
    seed: 47, seconds: 2.4, loud: -10.5,
    make(s) {
      tone(s, 0, 1.6, { f: mtof(38), type: 'saw', detune: [-20, 0, 25], lp: 300, lpTo: 900, amp: 0.25, a: 0.35, ap: 2, tau: 0.4 });
      tone(s, 0, 1.6, { f: mtof(44), type: 'saw', detune: [-15, 15], lp: 300, lpTo: 900, amp: 0.15, a: 0.4, ap: 2, tau: 0.4 });
      for (let k = 0; k < 5; k++) voice(s, 0.05 + k * 0.17, 0.5, { vowel: k % 2 ? 'ss' : 'hh', vowel1: 'hh', breath: 1, pitch: () => 100, amp: 0.2, a: 0.12, tau: 0.15, q: 5, pan: k % 2 ? 0.7 : -0.7 });
      ping(s, 0.1, mtof(70), { tau: 0.7, amp: 0.07, ratios: [1, 2.76, 5.4] });
      ping(s, 0.1, mtof(71), { tau: 0.7, amp: 0.06, ratios: [1, 2.76], pan: 0.3 });
      room(s, 0.4, { dark: 0.7 });
    },
  },
  // Light Lance: a beam running down the column, bright and buzzing, crackling as the pillars rise.
  'fx-lance': {
    seed: 48, seconds: 2, loud: -10,
    make(s) {
      noise(s, 0, 0.05, { type: 'hp', hz: 3000, amp: 0.6, a: 0.001, tau: 0.015 });
      tone(s, 0, 0.6, { f: mtof(81), f1: mtof(76), type: 'saw', detune: [-14, 0, 14], lp: 7000, lpTo: 2000, amp: 0.14, a: 0.005, hold: 0.25, tau: 0.15, pan: 0.6, panTo: -0.6 });
      tone(s, 0, 0.6, { f: mtof(57), type: 'saw', detune: [-10, 10], lp: 1500, amp: 0.12, a: 0.005, hold: 0.25, tau: 0.15 });
      noise(s, 0, 0.6, { type: 'bp', hz: 3000, q: 0.8, amp: 0.25, a: 0.005, hold: 0.25, tau: 0.12, am: [55, 0.6], pan: 0.6, panTo: -0.6 });
      for (let k = 0; k < 6; k++) thump(s, k * 0.08, { f0: 160, f1: 70, tau: 0.07, amp: 0.25, pan: 0.6 - k * 0.24 });
      clicks(s, 0, 0.5, 30, { type: 'hp', hz: 5000, amp: 0.18, ms: 3, spread: 0.8 });
      bell(s.bus, 0, 1, 81, 0.7, { ring: 0.8, gain: 0.5 });
      room(s, 0.3);
    },
  },
  // Renewal: wooden chimes climbing, a breathy flute swelling and leaves rustling: life coming back.
  'fx-renewal': {
    seed: 49, seconds: 2.8, loud: -11,
    make(s) {
      sparkle(s, 0.02, 0.7, 7, [67, 69, 71, 74, 76, 79, 81], { order: 'up', tau: 0.35, amp: 0.12, ratios: [1, 3.93, 9.2], amps: [1, 0.35, 0.08] });
      tone(s, 0.1, 1.5, { f: mtof(79), f1: mtof(83), glide: 0.3, amp: 0.07, a: 0.4, tau: 0.4, vib: 15, vibRate: 5 });
      noise(s, 0.1, 1.5, { type: 'bp', hz: mtof(79), q: 12, amp: 0.25, a: 0.4, tau: 0.4 });
      clicks(s, 0.1, 1.4, 50, { type: 'hp', hz: 4000, amp: 0.08, ms: 15, spread: 0.9 });
      choir(s.bus, 0.2, 1, 55, 0.4, { vowel: 'oo', a: 0.5, r: 0.8, gain: 0.35 });
      room(s, 0.35);
    },
  },
  // Deep Freeze: ice creaking shut on one foe, a hard crack and a low clunk as it locks.
  'fx-deepfreeze': {
    seed: 50, seconds: 2.4, loud: -10,
    make(s) {
      tone(s, 0, 0.5, { f: 55, f1: 75, type: 'saw', lp: 900, q: 4, amp: 0.25, a: 0.25, tau: 0.1, wobble: 0.03 });
      clicks(s, 0, 0.45, 50, { hz: 1800, amp: 0.2, shape: 'rise', ms: 5 });
      noise(s, 0.45, 0.06, { type: 'hp', hz: 1500, amp: 0.9, a: 0.001, tau: 0.02 });
      thump(s, 0.45, { f0: 120, f1: 40, tau: 0.25, amp: 0.7, drive: 2 });
      ping(s, 0.45, 180, { tau: 0.6, ratios: [1, 1.48, 2.14, 2.86, 3.9], amps: [1, 0.6, 0.4, 0.25, 0.15], amp: 0.12 });
      sparkle(s, 0.47, 0.4, 8, [84, 86, 91, 93, 98], { tau: 0.4, amp: 0.05, ratios: [1, 2.32, 4.25], amps: [1, 0.5, 0.2] });
      noise(s, 0.5, 1.4, { type: 'hp', hz: 4500, hz1: 2500, amp: 0.1, a: 0.05, tau: 0.5 });
      room(s, 0.35);
    },
  },
  // Battle Cry: the war horn, then the whole host shouting with it, and a drum.
  'fx-warcry': {
    seed: 51, seconds: 2.6, loud: -10,
    make(s) {
      brass(s.bus, 0, 0.75, 50, 1, { gain: 1.2, vib: 6, bloom: 0.12 });
      brass(s.bus, 0, 0.75, 57, 1, { gain: 0.8, vib: 6, bloom: 0.12 });
      brass(s.bus, 0.05, 0.7, 38, 0.8, { gain: 0.7 });
      drum(s.bus, 0.42, 'taiko', 1, { gain: 1.2 });
      for (let k = 0; k < 10; k++) {
        const f0 = 110 + s.rng.next() * 110;
        voice(s, 0.42 + s.rng.next() * 0.06, 0.45 + s.rng.next() * 0.15, { vowel: 'ah', vowel1: 'oh', breath: 0.25, pitch: (k2) => f0 * (1.15 - 0.3 * k2), rough: 1, amp: 0.22, a: 0.03, hold: 0.1, tau: 0.15, pan: s.rng.next() * 1.6 - 0.8, shift: 0.9 + s.rng.next() * 0.25 });
      }
      noise(s, 0.42, 0.5, { type: 'bp', hz: 1200, q: 0.7, amp: 0.15, a: 0.02, tau: 0.15 });
      room(s, 0.35, { seconds: 1.8 });
    },
  },
  // Bulwark: stone grinding up out of the ground round every hero, a heavy slam, and a ward's hum.
  'fx-bulwark': {
    seed: 52, seconds: 2.4, loud: -10,
    make(s) {
      noise(s, 0, 0.5, { type: 'bp', hz: 250, hz1: 600, q: 1, amp: 0.6, a: 0.3, ap: 1.5, tau: 0.05, grain: 0.9, steep: true });
      clicks(s, 0, 0.5, 40, { hz: 900, amp: 0.15, shape: 'rise', ms: 10, spread: 0.9 });
      thump(s, 0.45, { f0: 110, f1: 35, tau: 0.35, amp: 0.85, drive: 2.5 });
      noise(s, 0.45, 0.3, { type: 'lp', hz: 2500, hz1: 300, amp: 0.4, a: 0.002, tau: 0.08 });
      ping(s, 0.45, 196, { tau: 0.7, ratios: [1, 1.48, 2.14, 2.86], amps: [1, 0.6, 0.4, 0.25], amp: 0.12 });
      tone(s, 0.5, 1.5, { f: 147, type: 'tri', detune: [-6, 6], amp: 0.1, a: 0.2, tau: 0.45 });
      room(s, 0.3);
    },
  },
  // Call the Wolves: two howls, then a growl and the rush of paws.
  'fx-wolves': {
    seed: 53, seconds: 3, loud: -10,
    make(s) {
      const howl = (k) => (k < 0.25 ? 330 + 270 * (k / 0.25) : k < 0.7 ? 600 : 600 - 220 * ((k - 0.7) / 0.3));
      voice(s, 0, 1.3, { vowel: 'oo', vowel1: 'oh', breath: 0.15, pitch: howl, vib: 18, amp: 1.1, a: 0.12, hold: 0.7, tau: 0.25, q: 9, pan: -0.4 });
      voice(s, 0.25, 1.1, { vowel: 'oo', vowel1: 'oh', breath: 0.15, pitch: (k) => howl(k) * 1.26, vib: 22, amp: 0.8, a: 0.12, hold: 0.55, tau: 0.25, q: 9, pan: 0.5 });
      voice(s, 1.15, 0.6, { vowel: 'oh', breath: 0.5, pitch: (k) => 85 - 10 * k, growl: 0.7, amp: 0.3, a: 0.05, tau: 0.25 });
      for (let k = 0; k < 10; k++) thump(s, 1.25 + k * 0.09 + s.rng.next() * 0.03, { f0: 160, f1: 70, tau: 0.04, amp: 0.12, pan: -0.6 + k * 0.13 });
      noise(s, 1.2, 1, { type: 'bp', hz: 600, hz1: 2500, q: 1, amp: 0.15, a: 0.5, tau: 0.15, pan: -0.6, panTo: 0.6 });
      room(s, 0.35, { seconds: 2, rt: [2, 1.8, 1.2, 0.6] });
    },
  },
};
