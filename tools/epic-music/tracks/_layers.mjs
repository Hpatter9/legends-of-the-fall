// Layers the battle tracks share: a rock band (bass, guitar chugs, kit, timpani) and a symphonic bed.

/** The band over bars [from, to): bass line, palm-muted guitar, kit and timpani. Options pick the patterns. */
export function band(s, from, to, o = {}) {
  const { bass = 'r.r.r.r.r.r.r.r.', chug = bass, groove = 'drive', fills = [], crash = [], vel = 1, base = 33, gbase = 45, timp = 'R.......R.R.....', noChug = false, noBass = false, drumVel = vel, skip = [] } = o;
  if (!noBass) s.bassline('bass', from, to, { pat: bass, base, vel: 0.78 * vel });
  if (!noChug) s.bassline('chug', from, to, { pat: chug, base: gbase, vel: 0.75 * vel, len: 0.5, o: { mute: true, ...(o.chugOpts ?? {}) } });
  if (groove) s.kit(from, to, { groove, fills, crash, vel: drumVel, skip });
  if (timp) s.timp(from, to, { pat: timp, vel: 0.72 * vel });
}

/** Strings, organ and (optionally) choir sustained under bars [from, to). */
export function bed(s, from, to, o = {}) {
  const { strings = 0.6, organ = 0.4, choir = 0, vowel = 'ah', lo = 55, hi = 77 } = o;
  if (strings) s.pad('strings', from, to, { lo, hi, vel: strings });
  if (organ) s.pad('organ', from, to, { lo: lo - 8, hi: hi - 8, vel: organ, o: { reg: o.reg ?? 'full' } });
  if (choir) s.pad('choir', from, to, { lo: lo + 2, hi: hi + 4, vel: choir, o: { vowel } });
}
