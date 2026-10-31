// The Last Stand's balance (`tools/stand-balance.ts`) with the bosses' signature attacks on or `--off`:
//   node tools/boss-big/run.mjs stand [--off] [--levels 1,20,60] [--attempts 12]
import './switch';
import { standTable } from '../stand-balance';

standTable();
