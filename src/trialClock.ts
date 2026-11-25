// WEEKLY-TRIAL (docs/notes/weekly-trial.md): the page's clock for the Weekly Trial. Every player's week turns at the same moment, Monday
// 00:00 in Mountain time (America/Denver, the owner's), so the trial is the same for everyone and the same offline: the page reads the day
// there and hands the sim its day key (yyyymmdd); the sim never reads a clock. Plain functions of a Date (no DOM), so the tests can call them.

/** Mountain time's calendar day, weekday (0 Monday to 6 Sunday) and time of day at `now`. A phone whose Intl lacks the zone falls back to
 *  UTC-7 (Mountain standard time: an hour out in summer, nothing worse). */
export function mountainNow(now: Date): { y: number; m: number; d: number; wd: number; secs: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    const wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'));
    const y = Number(get('year'));
    if (wd < 0 || !(y > 0)) throw new Error('no zone');
    return { y, m: Number(get('month')), d: Number(get('day')), wd, secs: Number(get('hour')) * 3600 + Number(get('minute')) * 60 + Number(get('second')) };
  } catch {
    const t = new Date(now.getTime() - 7 * 3600_000);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), wd: (t.getUTCDay() + 6) % 7, secs: t.getUTCHours() * 3600 + t.getUTCMinutes() * 60 + t.getUTCSeconds() };
  }
}

/** The trial's day key (yyyymmdd) at `now`: the day in Mountain time. */
export function trialDayKey(now = new Date()): number {
  const t = mountainNow(now);
  return t.y * 10000 + t.m * 100 + t.d;
}

/** Milliseconds until the week turns (next Monday 00:00, Mountain time). */
export function trialMsLeft(now = new Date()): number {
  const t = mountainNow(now);
  return ((7 - t.wd) * 86400 - t.secs) * 1000;
}

/** The time left in words: "3 days 4 h left", "5 h 12 min left", "12 min left". */
export function timeLeftWords(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  if (days >= 1) return `${days} day${days > 1 ? 's' : ''} ${h} h left`;
  if (h >= 1) return `${h} h ${min % 60} min left`;
  return `${Math.max(1, min)} min left`;
}
