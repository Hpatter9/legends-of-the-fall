// The tactics' switches for measuring from the tools (docs/notes/tactics.md): `TACTICS_OFF=1` plays every fight as before the tactics (no
// tactic set means Charge, and the foes have no answer), for this run and its child processes. Nothing is written.
import { TACTICS } from '../../src/sim/tactics';

if (process.env.TACTICS_OFF) {
  TACTICS.fallback = 'charge';
  TACTICS.answer = 1;
}
