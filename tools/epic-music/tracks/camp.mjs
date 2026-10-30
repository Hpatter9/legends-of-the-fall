// The camp (home) theme: the main theme slowed to a lullaby in D minor at 84 bpm, gothic and unhurried. A music box plays
// the hook alone over the organ; a flute and a harp take the A section, the horn and the strings the B section, and the
// breakdown's answering phrases close it on the dominant, so it leads back to the music box.
import { Song } from '../song.mjs';
import { MELODY, PROG } from '../theme.mjs';

export default function () {
  const s = new Song({ id: 'camp', bpm: 84, key: 'D', mode: 'min', bars: 32, target: 0.105, seed: 11, mix: { levels: { harpsi: 0.6, keys: 0.7, bass: 1.5, organ: 1.2, koto: 0.8 } } });
  s.prog(0, PROG.A);
  s.prog(8, PROG.A);
  s.prog(16, PROG.B);
  s.prog(24, PROG.C);

  // the floor: an organ pedal and a slow bass, a bell on the sections
  s.pad('organ', 0, 32, { lo: 50, hi: 70, vel: 0.36, n: 3, o: { reg: 'flute', r: 0.6 } });
  s.bassline('organ', 0, 32, { pat: 'R...............', base: 26, vel: 0.5, len: 3.95, o: { reg: 'pedal', r: 0.4 } });
  s.bassline('bass', 8, 32, { pat: 'R...............', base: 33, vel: 0.7, len: 3.9, o: { dTau: 3, drive: 1.1, cut: 520 } });
  for (const bar of [0, 8, 16, 24]) s.add('bell', bar * 4, 4, 38, 0.6, { ring: 6 });
  // strings, the harp and a choir
  s.pad('strings', 8, 32, { lo: 52, hi: 74, vel: 0.48 });
  s.pad('choir', 16, 24, { lo: 57, hi: 76, vel: 0.46, o: { vowel: 'oh' } });
  s.pad('choir', 28, 32, { lo: 57, hi: 76, vel: 0.4, o: { vowel: 'oo' } });
  s.arp('harp', 8, 16, { pat: '0..1..2..3..2..1', base: 50, step: 0.5, len: 1.4, vel: 0.5 });
  s.arp('harp', 16, 24, { pat: '0.1.2.3.4.3.2.1.', base: 50, step: 0.5, len: 1.4, vel: 0.5 });
  s.arp('harpsi', 24, 32, { pat: '0..1..2..3..2..1', base: 57, step: 0.5, len: 1.2, vel: 0.44 });
  s.timp(16, 24, { pat: 'R...............', vel: 0.5 });
  s.timp(30, 32, { pat: 'R.......R.R.R.R.', vel: 0.5 });
  // the tune
  s.mel('mbox', 0, MELODY.A, { oct: 5, vel: 0.6 });
  s.mel('flute', 8, MELODY.A, { oct: 4, vel: 0.66, art: 1 });
  s.mel('mbox', 8, MELODY.A, { oct: 6, vel: 0.28 });
  s.mel('horn', 16, MELODY.B, { oct: 3, vel: 0.68 });
  s.mel('strings', 16, MELODY.B, { vel: 0.48, oct: 4, o: { cut: 3200 } });
  s.mel('flute', 24, MELODY.C, { oct: 4, vel: 0.6, art: 1 });
  s.mel('mbox', 24, MELODY.C, { oct: 5, vel: 0.35 });
  return s;
}
