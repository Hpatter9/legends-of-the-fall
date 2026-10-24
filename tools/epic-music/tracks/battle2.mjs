// Battle, the heavy one: E minor with a Phrygian second, 168 bpm. Double kick under chugging guitar, a harpsichord
// interlude, and a guitar lead over the choir and brass.
import { Song } from '../song.mjs';
import { band, bed } from './_layers.mjs';

const A = '5:.5 ^1:.5 ^3:1 ^5:1 ^3:1 | ^6:1 ^4:1 ^2b:2 | ^3:1.5 ^1:.5 5:1 ^1:1 | ^2:1 ^4:1 ^2:1 7:1 | 5:.5 ^1:.5 ^3:1 ^5:2 | ^6:1.5 ^5:.5 ^3:1 ^1:1 | ^4:1 ^2b:1 ^6:2 | ^2:1 ^4:1 ^2:1 7#:1';
const B = '^1:2 ^3:2 | ^2:2 ^4:2 | ^5:2 ^3:1 ^1:1 | ^3:1 ^1:1 5:2 | ^1:1 ^3:1 ^6:2 | ^4:1 ^2:1 ^4:2 | ^6:2 ^4:1 ^2b:1 | ^2:1 ^4:1 ^2:1 7#:1';

export default function () {
  const s = new Song({ id: 'battle2', bpm: 168, key: 'E', mode: 'min', bars: 48, target: 0.18, seed: 41, mix: { levels: { chug: 1.1 } } });
  s.prog(0, 'i*4');
  s.prog(4, 'i N i VII  i VI N V7');
  s.prog(12, 'VI VII i i  VI VII N V7');
  s.prog(20, 'iv i+V7 iv N  viio7 i V7 V7');
  s.prog(28, 'i N i VII  i VI N V7');
  s.prog(36, 'VI VII i i  VI VII N V7');
  s.prog(44, 'i N VII V7');

  band(s, 0, 4, { groove: 'pulse', bass: 'R...............', chug: 'r.rr.r.r..rr.r.r', timp: 'R.R.R.R.R.R.R.R.', vel: 0.8, noBass: true });
  s.timp(0, 4, { pat: 'R...R.R.R...R.R.', vel: 0.8, base: 40 });
  band(s, 4, 12, { bass: 'r.rrr.rrr.rrr.rr', chug: 'r.rrr.rrr.rrr.rr', groove: 'gallop', fills: [11], crash: [4], timp: 'R.......R.......' });
  band(s, 12, 20, { bass: 'r.r.r.r.r.r.r.r.', chug: 'r.rrr.r.r.rrr.r.', groove: 'drive', fills: [19], crash: [12], timp: 'R.......R.R.....' });
  band(s, 20, 28, { bass: 'R...R...R...R.rr', groove: 'halftime', fills: [27], crash: [20], noChug: true, timp: 'R...............', vel: 0.85 });
  band(s, 28, 36, { bass: 'r.rrr.rrr.rrr.rr', chug: 'r.rrr.rrr.rrr.rr', groove: 'gallop', fills: [35], crash: [28], timp: 'R.......R.......', vel: 1.05 });
  band(s, 36, 44, { bass: 'rrrrrrrrrrrrrrrr', chug: 'r.rr.r.r.rr.r.r.', groove: 'gallop', fills: [43], crash: [36], timp: 'R.R.R.R.R.R.R.R.', vel: 1.05 });
  band(s, 44, 48, { bass: 'r.r.r.r.r.r.r.r.', chug: 'r.rrr.r.r.rrr.r.', groove: 'drive', fills: [47], crash: [44], timp: 'R.......R.R.....' });
  bed(s, 0, 4, { strings: 0.45, organ: 0.35 });
  bed(s, 12, 20, { strings: 0.62, organ: 0.4, choir: 0.6 });
  bed(s, 20, 28, { strings: 0.55, organ: 0.4, reg: 'diapason' });
  bed(s, 36, 44, { strings: 0.68, organ: 0.45, choir: 0.7 });
  s.arp('stac', 4, 12, { pat: '0123210012321001', base: 57, vel: 0.5 });
  s.arp('harpsi', 20, 28, { pat: '0120121201201212', base: 59, vel: 0.62, step: 0.25 });
  s.arp('stac', 28, 36, { pat: '0123432101234321', base: 59, vel: 0.58 });
  s.arp('stac', 44, 48, { pat: '0123432101234321', base: 59, vel: 0.6 });
  s.stab('brass', 12, 20, { pat: 'X.......x.......', step: 0.25, vel: 0.72, lo: 52, hi: 71, n: 3 });
  s.stab('brass', 36, 44, { pat: 'X..x..x.X..x..x.', step: 0.25, vel: 0.8, lo: 52, hi: 71, n: 3 });
  s.mel('guitar', 4, A, { vel: 0.8, o: { slide: 2 } });
  s.mel('horn', 4, A, { vel: 0.55 });
  s.mel('horn', 12, B, { vel: 0.74 });
  s.mel('guitar', 12, B, { vel: 0.7, o: { slide: 1.5 } });
  s.mel('organ', 20, '^4:2 ^6:2 | ^3:2 ^2:2 | ^6:2 ^4:2 | ^6:2 ^4:2 | ^4:2 ^2:2 | ^1:2 ^3:2 | ^2:2 ^4:2 | ^2:2 7#:2', { vel: 0.5, o: { reg: 'flute' } });
  s.mel('guitar', 28, A, { vel: 0.85, o: { slide: 2 } });
  s.mel('brass', 28, A, { vel: 0.6, oct: 3 });
  s.mel('guitar', 36, B, { vel: 0.85, o: { slide: 1.5 } });
  s.mel('brass', 36, B, { vel: 0.66, oct: 3 });
  s.mel('horn', 36, B, { vel: 0.66 });
  s.swellTo(20 * 4, 8, 0.8);
  s.swellTo(28 * 4, 8, 0.85);
  s.swellTo(36 * 4, 4, 0.8);
  s.swellTo(48 * 4 - 0.01, 4, 0.7);
  return s;
}
