// Comic: F major, 124 bpm. A bouncing plucked bass, a skipping tune on a music box and harpsichord, woodblock and hats, and a horn to answer.
import { Song } from '../song.mjs';

const C = '1:.5 3:.5 5:1 ^1:.5 5:.5 3:1 | ^1:1.5 5:.5 3:1 5:1 | 4:.5 6:.5 ^1:1 6:.5 ^1:.5 6:1 | 5:1 7:1 ^2:1 7:1 | ^1:1.5 ^3:.5 ^1:1 5:1 | 6:1 ^1:1 ^3:1 ^1:1 | 2:1 4:1 6:1 4:1 | 5:1 7:1 ^2:1 ^4:1';

export default function () {
  const s = new Song({ id: 'comic', bpm: 124, key: 'F', mode: 'maj', bars: 24, target: 0.12, seed: 211, kbps: 30, mix: { levels: { keys: 0.8, harpsi: 0.7, bass: 1.2 } } });
  s.prog(0, 'I I IV V  I vi ii V7');
  s.prog(8, 'I I IV V  I vi ii V7');
  s.prog(16, 'I I IV V  I vi ii V7');
  s.bassline('bass', 0, 24, { pat: 'R.r.R.r.R.r.R.r.', base: 29, vel: 0.62, len: 0.45, o: { pluck: 0.05, cut: 700 } });
  s.stab('pizz', 0, 24, { pat: '..x...x.', step: 0.5, vel: 0.55, lo: 55, hi: 74, n: 3, len: 0.5 });
  s.pad('organ', 8, 24, { lo: 50, hi: 70, vel: 0.28, o: { reg: 'flute', r: 0.2 }, n: 3 });
  s.pad('strings', 16, 24, { lo: 53, hi: 74, vel: 0.4, n: 3 });
  s.kit(0, 24, { groove: { kick: 'X...x...', snare: '', hat: 'x.x.x.x.x.x.x.x.', rim: '..x...x...x...x.' }, vel: 0.5, fills: [7, 15, 23], tomFill: 'snare' });
  s.mel('mbox', 0, C, { vel: 0.6, oct: 4 });
  s.mel('harpsi', 8, C, { vel: 0.66, oct: 4 });
  s.mel('mbox', 8, C, { vel: 0.4, oct: 5 });
  s.mel('horn', 16, C, { vel: 0.6, oct: 3 });
  s.mel('harpsi', 16, C, { vel: 0.5, oct: 4 });
  s.mel('mbox', 16, C, { vel: 0.4, oct: 5 });
  return s;
}
