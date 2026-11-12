// WAVE-DELAY (docs/notes/wave-delay.md): the page's own loop watched from outside it. The owner was locked in the installed app with
// the fight's rows up, the clock at 0:00 and the whole battlefield gone: the picture's loop had stopped (Pixi's ticker stops for good
// when its own drawing throws, and a drawing that throws leaves the canvas cleared), and nothing started it again. So, once a second,
// from a timer the loop cannot stop: a loop that should be running and has not turned for a while is started again; a frame or a
// drawing that faults again and again has the board built afresh with nothing kept from before; and if that does not cure it, or the
// loop keeps stopping, the page is loaded again into the same run and wave. Pure: the tests read it; `main.ts` carries it out.

export const LOOP = {
  /** A loop that should be running and has not turned for this long has stopped (real ms). */
  STALL_MS: 2500,
  /** This many frames or drawings in a row at fault is a fault that will not go away. */
  FAULTS: 60,
  /** The loop started again this many times since it last ran well, and stopped again: the page is loaded again. */
  RESTARTS: 3,
};

export type LoopCure = 'none' | 'restart' | 'rebuild' | 'reload';

/** What to do now. `running`: the loop is meant to be turning (not at rest on the home screen); `hidden`: the page is not shown;
 *  `sinceFrame`: ms since a frame last began; `faults`: frames or drawings at fault in a row; `restarts`: how many times the loop was
 *  started again since it last ran well; `rebuilt`: the board has been built afresh for this trouble already. */
export function loopCure(o: { running: boolean; hidden: boolean; sinceFrame: number; faults: number; restarts: number; rebuilt: boolean }): LoopCure {
  if (!o.running || o.hidden) return 'none';
  if (o.faults >= LOOP.FAULTS) return o.rebuilt ? 'reload' : 'rebuild';
  if (!(o.sinceFrame < LOOP.STALL_MS)) return o.restarts >= LOOP.RESTARTS ? 'reload' : 'restart';
  return 'none';
}

/** Whether the page may be loaded again in this phase without losing anything of a wave: a fight going or a deploy (the run was saved
 *  as the wave began); never a fight that has ended, whose result is being counted. */
export const reloadSafe = (phase: string): boolean => phase === 'fight' || phase === 'deploy';
