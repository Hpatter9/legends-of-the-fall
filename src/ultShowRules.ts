// The ultimate's showcase (ULT-SHOW, docs/notes/ult-showcase-design.md): the long version of an ultimate's moment, where the hero is seen to do
// what its ultimate's words say (Ayame teleports behind each foe in a puff of smoke and cuts it down; the Wizard calls the meteors down out of a
// darkened sky; the Beastmaster's wolves bound in from the edge of the field). Pure: no DOM, no Pixi, so the tests read it; `ultShow.ts` plays it.
//
// It is presentation only. The ultimate has already been cast by the sim on the tick it fired, exactly as in the short version; the fight is
// held while the showcase plays, and the showcase reads that tick's events (the blinks, the blows, the meteors' aims, the fighters called up)
// to stage the real sprites: where the caster stood at each hop, which foe was cut and when. So the fight comes out exactly as it would have.
//
// When it plays: the full ultimate scenes on, Auto off, Shorter ultimates off, and the hero's ultimate has a showcase; then the hero's first
// use, and every Nth use after it (the setting, 10 by default; 0: the first only). The uses counted are the full moments the player saw,
// per hero kind, kept in the save (`Meta.ultSeen`).
//
// The x1 rule (the owner's): an ultimate's full moment, its showcase and an Eidolon's full call always play at x1 speed, whatever the fight's
// speed; the short versions keep the fight's speed (`momentSpeed`).

import type { BattleEvent, Unit } from './sim/battle';
import type { Element } from './render/fxRules';

/** How a showcase is staged (the staging is shared; each hero's beats and look are its own). */
export type ShowStyle = 'blinks' | 'sky' | 'pack' | 'line' | 'leap' | 'blows' | 'hooks' | 'shots' | 'burst' | 'burrow' | 'bless' | 'change';

export interface Showcase {
  style: ShowStyle;
  /** The colour of its effects (the pack's element). */
  el: Element;
  /** What the player sees, in the game's words (the design lists it). */
  line: string;
  /** line: the foes it passed split only once it has sheathed (the one cut), rather than as it passes. */
  after?: boolean;
  /** line: ms a run takes (a dash is a flash; a ride or a charge is seen), the wind-up before it and the sheathe after it. */
  run?: number;
  wind?: number;
  sheathe?: number;
  /** shots: the still moment before the first (a draw at noon), and a storm cloud gathering over the caster first. */
  draw?: number;
  cloud?: boolean;
  /** burst: what reaches each foe (vines, stone creeping up it, a smite of the element, a pull round to face the caster, a cut), and
   *  whether the ground it changed rises (rock spires). */
  hit?: 'snare' | 'stone' | 'smite' | 'taunt' | 'cut';
  rise?: boolean;
  /** pack: those called up rise out of the ground where they stand, rather than running in from the edge. */
  emerge?: boolean;
  /** Painted poses the caster takes for a beat (`showArt.ts`): its wind-up, its run, its strike, its flight, its call, its finish. */
  poses?: Partial<Record<'wind' | 'run' | 'strike' | 'fly' | 'call' | 'end', string>>;
}

/** The heroes whose ultimate has a showcase: the pilot (Ayame, the Wizard, the Beastmaster) and batch 1 (the blades that move). */
export const SHOWCASES: Record<string, Showcase> = {
  // (the five Mythics: each its own words, hits and painted props, `ultShow.ts`, and its own cut-in before it, `mythicCutRules.ts`;
  // docs/notes/mythics-finish.md)
  vael: { style: 'burst', el: 'dark', hit: 'cut', poses: { call: 'mythic-pose-vael' }, line: 'The black sun rises and eclipses behind his crown; one golden sweep cuts down every foe it reaches, and the field kneels' },
  astrax: { style: 'sky', el: 'light', poses: { call: 'mythic-pose-astrax' }, line: 'The star chart opens over the dragon; a constellation burns over each crowd, and the stars fall out of it' },
  ilyra: { style: 'bless', el: 'light', poses: { call: 'mythic-pose-ilyra' }, line: 'Her broken halo rises over her and closes; a halo settles over each of the living in turn, and for a moment death cannot cross it' },
  orrun: { style: 'bless', el: 'forest', poses: { call: 'mythic-pose-orrun' }, line: 'The world tree climbs out of the ground behind him; its roots run to each of his friends in turn, and an emerald sanctuary rises round them' },
  nyxara: { style: 'bless', el: 'lightning', poses: { call: 'mythic-pose-nyxara' }, line: 'The clock of fate turns backwards under her; each ally is drawn back to the moment before the wound, one after another' },
  kunoichi: { style: 'blinks', el: 'dark', poses: { end: 'kunoichi-kneeling-finish' }, line: 'She vanishes in a puff of smoke, appears behind each foe in turn and cuts it down, then stands where the last fell' },
  wizard: { style: 'sky', el: 'fire', line: 'He raises his staff, the sky darkens, a burning circle marks each crowd and the meteors come down out of the clouds' },
  beastmaster: { style: 'pack', el: 'forest', poses: { call: 'beastmaster-horn' }, line: 'He sounds his horn and the wolves bound in from the edge of the field, one after another, to stand at his side' },
  mercenary: { style: 'blinks', el: 'blood', line: 'He steps out of nowhere beside each of the three hardest hitters in turn and cuts each hard' },
  arcBlade: { style: 'blinks', el: 'lightning', poses: { strike: 'arc-blade' }, line: 'He becomes lightning: a bolt that leaps from foe to foe, cutting each, then snaps back to where he started' },
  samurai: { style: 'line', el: 'light', after: true, run: 160, wind: 1200, sheathe: 900, poses: { wind: 'samurai-iaido-crouch', end: 'samurai-sheathe' }, line: 'He crouches, the field goes still, one flash along the line; he sheathes his sword, and every foe he passed splits' },
  lancer: { style: 'line', el: 'wind', run: 1100, wind: 1000, poses: { run: 'lancer-gallop' }, line: 'He rides the whole line at a gallop, each foe flung aside as he passes' },
  minotaur: { style: 'line', el: 'earth', run: 420, poses: { run: 'minotaur-charge' }, line: 'He paws the ground and charges, again and again, each foe in his way thrown into the air' },
  barbarian: { style: 'leap', el: 'blood', poses: { fly: 'barbarian-mid-air' }, line: 'He leaps high over the field and comes down on the thickest crowd; the ground cracks and they are thrown back' },
  ninjaMonk: { style: 'blows', el: 'wind', poses: { strike: 'ninja-monk-flurry' }, line: 'A blur of fists on each foe in turn, blow after blow, the last throwing it away' },
  buccaneer: { style: 'hooks', el: 'dark', line: 'He throws out his hooks and reels the foes in one by one, cutting each as it lands at his feet' },
  // (batch 2: from the sky and the guns)
  archer: { style: 'sky', el: 'wind', line: 'She looses high into the sky; a ring marks each crowd and the volleys come down on them' },
  dreadPirate: { style: 'sky', el: 'dark', line: 'The ghost fleet\'s guns mark each crowd in cold fire, and its broadsides come howling down' },
  siegeBot: { style: 'sky', el: 'fire', line: 'A targeting ring locks on to the thickest crowd; the great shell whistles down, and a second after it' },
  lightningMage: { style: 'shots', el: 'lightning', cloud: true, draw: 900, line: 'A storm cloud gathers over her, rolls out over the field, and its first bolt picks out the toughest foe' },
  gunslinger: { style: 'shots', el: 'fire', draw: 1000, line: 'The field goes still at high noon; she draws, and six shots fan out one by one' },
  rifleBot: { style: 'shots', el: 'lightning', draw: 500, line: 'It jets to the high ground, glows as it overclocks, and fires four shots at the weakest foe' },
  dragoon: { style: 'shots', el: 'fire', draw: 700, line: 'She rears back and breathes fire down the longest line of foes; the ground stays alight behind it' },
  ranger: { style: 'burst', el: 'forest', hit: 'snare', line: 'She flings the net of vines over the field; it snaps tight round every foe in sight, one after another' },
  // (batch 3: the bursts round the caster)
  knight: { style: 'burst', el: 'light', hit: 'taunt', line: 'He plants his shield and roars; every foe near him is dragged round to face him, and the shield\'s light closes over him' },
  paladin: { style: 'burst', el: 'light', hit: 'smite', line: 'He kneels and a holy nova rings out; each foe it reaches is struck by light and turns to him' },
  yamabushi: { style: 'burst', el: 'wind', hit: 'smite', line: 'A gale gathers in his hands and bursts out, throwing every foe near him up and away' },
  gorgon: { style: 'burst', el: 'poison', hit: 'stone', line: 'Her eyes open; stone creeps up each foe in her sight, one after another' },
  juggernaut: { style: 'burst', el: 'earth', hit: 'smite', rise: true, line: 'He stamps; the ground splits outward under every foe near him and rock spires rise from the rift' },
  kraken: { style: 'burst', el: 'ice', hit: 'smite', line: 'A whirlpool opens round him and drags the foes in, one after another' },
  mummy: { style: 'burst', el: 'earth', hit: 'smite', line: 'A sand-wind drags the foes in and curses each; the two strongest are pulled up on strings' },
  warlock: { style: 'burst', el: 'dark', hit: 'smite', line: 'A circle of death rings out from him; a curse falls on each foe, and he drinks from them' },
  tyrant: { style: 'burst', el: 'blood', hit: 'smite', line: 'He roars from his throne; each foe near him is struck and cowers, and his allies stand taller' },
  shambler: { style: 'burrow', el: 'poison', line: 'He sinks into the grave-earth; the ground heaves as he tunnels towards the thickest crowd' },
  reaper: { style: 'burst', el: 'dark', hit: 'cut', line: 'The scythe sweeps round, dragging the foes in, and cuts them all; the reaped rise as wraiths' },
  // (batch 4: the callers and the changers)
  druid: { style: 'pack', el: 'forest', emerge: true, rise: true, line: 'The thorn hedge grows up across the foes\' way, and two treants rise out of the earth at her side' },
  illusionist: { style: 'pack', el: 'dark', emerge: true, line: 'Mirror copies of her step out of the air round her, and the foes turn on them' },
  priestess: { style: 'bless', el: 'light', line: 'Light falls from her on each of her friends in turn; the fallen rise in it, and the Wall of Light goes up' },
  werewolf: { style: 'change', el: 'blood', line: 'The moon fills; he writhes as both his forms take him at once, and his howl frightens the foes near him' },
  demonSwordsman: { style: 'change', el: 'fire', line: 'Chains of hellfire drag the nearest foes to him; then the demon form takes him in a burst of flame' },
  kitsune: { style: 'burst', el: 'fire', hit: 'smite', line: 'Fox fire spins out to the strongest foes, and each shrinks to a little fox' },
  karasu: { style: 'sky', el: 'wind', line: 'He marks the thickest knot of foes, and the razor feathers whirl down into a cloud over it' },
  timeWitch: { style: 'burst', el: 'light', hit: 'stone', line: 'Her clock strikes; the foes stop where they stand one after another, their colour drained, and her friends quicken' },
  // (batch 5: the blessings)
  wanderer: { style: 'bless', el: 'light', line: 'A dawn light runs from him to each ally in turn, healing, shielding and quickening each' },
  satyr: { style: 'bless', el: 'forest', line: 'He plays his pipes; the notes dance out to each ally and they quicken to the tune' },
  samuraiCommander: { style: 'bless', el: 'fire', line: 'He raises the war banner; its fire runs to each ally, and the swords among them charge' },
  sage: { style: 'bless', el: 'lightning', line: 'Arcane threads run from him to every ally; each pool fills and a shield forms round each' },
  cleric: { style: 'bless', el: 'light', line: 'The spirits come one by one and circle her, and their light reaches her friends near by' },
  peasant: { style: 'bless', el: 'earth', line: 'The allies close ranks round him at his call, and he leads the charge at the nearest foe' },
  wolfBard: { style: 'bless', el: 'wind', line: 'The opening chord throws the foes near him back; then the hymn carries to every ally' },
  // (the nine heroes that joined from the twenty, docs/notes/heroes-join.md: the generic styles, with their own words)
  vampireLord: { style: 'burst', el: 'blood', hit: 'smite', line: 'A black eclipse opens over him; blood is drawn from every foe near him into his goblet, and he mends as he drinks' },
  hemomancer: { style: 'burst', el: 'blood', hit: 'smite', line: 'Drops of blood rise from every foe near her into a dark bowl, and the offering is poured out to her friends' },
  nightstalker: { style: 'blinks', el: 'dark', line: 'A cloud of bats lifts him into the dark; he drops beside each foe in turn and snatches it up past the bell tower' },
  bloodGargoyle: { style: 'burst', el: 'earth', hit: 'smite', line: 'He drops from the spire; the shock ring stuns every foe near him and a stone shell closes over his friends' },
  dhampir: { style: 'shots', el: 'light', draw: 800, line: 'At twilight she raises the crossbow; a fan of five silver stakes pins the foes one after another' },
  warDrummer: { style: 'burst', el: 'lightning', hit: 'smite', line: 'Ten thousand drums answer his beat; lightning runs out through the storm cloud and strikes each foe near him' },
  geomancer: { style: 'bless', el: 'earth', line: 'Crags rise from the ground like a closing hand and a wall of stone goes up across the foes\' way; a stone shell closes over each friend in turn' },
  bellWarden: { style: 'burst', el: 'dark', hit: 'stone', line: 'The great bell tolls midnight; the foes near him stop where they stand, one after another, their colour drained' },
  falconer: { style: 'sky', el: 'wind', line: 'She sends the flock up; the falcons mark each crowd and spiral down on it out of the sky' },
  banneret: { style: 'bless', el: 'fire', line: 'The Oriflamme unfurls over her friends in a sheet of flame-red silk, and a ring of light rises round her shield' },
  astralSphinx: { style: 'burst', el: 'dark', hit: 'smite', line: 'She asks the last riddle; glyphs of starlight seal the mouth of every foe near her and silence falls over them all' },
  mirageDancer: { style: 'blinks', el: 'wind', line: 'Seven shimmering dancers spin out of the sand; she cuts through each foe in turn and leaves her mirages standing behind' },
  plagueDoctor: { style: 'burst', el: 'poison', hit: 'smite', line: 'A black plague cloud towers up round him; each foe within it is struck and sickened as the censer smoke rolls out' },
  bombardier: { style: 'sky', el: 'fire', line: 'He rocket-jumps clear of the fray and calls down the salvos; shells rain across the field in a storm of fire' },
  astrologer: { style: 'sky', el: 'light', line: 'The planets align over the crowd, drag the foes together and fall as two supernovas that scatter golden light' },
  inquisitor: { style: 'shots', el: 'light', draw: 600, line: 'The Tribunal sits in a ring of sun discs; a bolt of judgement is loosed at each of the three strongest foes in turn' },
  seraph: { style: 'sky', el: 'light', line: 'A host of golden wings descends from the sky on the thickest crowd, throwing the foes back from her friends' },
  corsairSurgeon: { style: 'bless', el: 'forest', line: 'He raises a ship\'s rum cask and passes the tin cups round; every friend is cleansed and mended in a healing spray' },
  harpooner: { style: 'hooks', el: 'ice', line: 'He hurls his harpoons out into the water\'s shadow and hauls the three farthest foes in along the taut line, one by one' },
  seaReaver: { style: 'line', el: 'ice', run: 600, wind: 800, line: 'He rides a towering wave through the line of foes, and the surf bursts round his anchor as they are thrown aside' },
};

export const hasShowcase = (kind: string): boolean => kind in SHOWCASES;

/** The setting's choices for how often the long version comes back (0: the first use only). */
export const EVERY_CHOICES = [0, 5, 10, 20] as const;
export const DEFAULT_EVERY = 10;

/** Whether this use plays the long version: `seen` full moments of this hero's ultimate already played (0: this is the first), `every` the
 *  setting. The first use always does; then every `every`th after it (with 10: the 1st, 11th, 21st...). */
export const showDue = (seen: number, every: number): boolean => seen <= 0 || (every > 0 && seen % every === 0);

/** The save's count of full moments seen of a hero kind's ultimate, and one more (`Meta.ultSeen`). */
export const seenOf = (m: { ultSeen?: Record<string, number> }, kind: string): number => m.ultSeen?.[kind] ?? 0;
export function noteSeen(m: { ultSeen?: Record<string, number> }, kind: string): void {
  (m.ultSeen ??= {})[kind] = seenOf(m, kind) + 1;
}

/** Whether an ultimate that just fired gets its showcase. */
export function wantsShow(kind: string, o: { full: boolean; short: boolean; seen: number; every: number }): boolean {
  return o.full && !o.short && hasShowcase(kind) && showDue(o.seen, o.every);
}

/** The fight's speed while a moment plays (`moment`: an ultimate's full moment or showcase, or an Eidolon's full call, is on): x1 then. */
export const momentSpeed = (speed: number, moment: boolean): number => (moment ? 1 : speed);
/* ------------------------------------------------------------------ what the cast did */

export interface At {
  u: number;
  v: number;
}
/** One hop of a teleport slash: from, to, and the foe it cut (if any). */
export interface Hop {
  from: At;
  to: At;
  struck?: number;
}
/** What the cast's tick shows the caster did. */
export interface Cast {
  caster: number;
  /** Where it stood when it cast (its tile before any hop, run or leap). */
  start: At;
  hops: Hop[];
  /** Its runs in a line (a dash, a ride, a charge), in order. */
  dashes: { from: At; to: At }[];
  /** Its leap. */
  leap?: { from: At; land: At };
  /** The tiles its salvo is aimed at (each once, in order). */
  aims: At[];
  /** The fighters it called up, and where they stand. */
  born: { id: number; at: At }[];
  /** Every foe it struck on the tick, in the order first struck; the blows each took; the run each was struck on (0 before any). */
  struck: number[];
  /** The foes a heavy blow landed on (the Buccaneer's high rolls). */
  heavy: number[];
  blows: Map<number, number>;
  run: Map<number, number>;
  /** Where each foe it struck stands now (after the tick), and where it stood before, when it was moved (thrown, shoved, hooked in). */
  tiles: Map<number, At>;
  moved: Map<number, At>;
  /** The foes it hooked in (an arc to each). */
  hooks: number[];
  /** Its shots in order, at whom (a shot, or a bolt's arc when it shot none), and the ground it set alight. */
  shots: number[];
  ground: At[];
  /** The foes it touched with no blow (taunted round to face it: the page reads them), and its burrow's way underground. */
  touched: number[];
  burrow?: { from: At; path: At[] };
  /** The allies it helped (healed, quickened, raised; or every ally standing when the events name none: an aura, a banner), the fallen it
   *  raised, the tile its zone stands on, and whether it changed its own shape. */
  helped: number[];
  raised: number[];
  zone?: At;
  changed: boolean;
}

/** Read a cast from its tick's events (`events`), the caster (`me`, as it stands after the tick), the fighters that appeared on it, where a
 *  fighter stands (`tileOf`) and where one stood before the tick when the sim moved it without an event that says so (`originOf`: a hook's
 *  pull). */
export function readCast(
  me: Pick<Unit, 'id' | 'u' | 'v'>,
  events: readonly BattleEvent[],
  born: readonly Pick<Unit, 'id' | 'owner' | 'u' | 'v'>[] = [],
  tileOf: (id: number) => At | undefined = () => undefined,
  originOf: (id: number) => At | undefined = () => undefined,
  touched: readonly number[] = [],
  allies: readonly number[] = [],
): Cast {
  const hops: Hop[] = [];
  const dashes: { from: At; to: At }[] = [];
  const aims: At[] = [];
  const struck: number[] = [];
  const heavy: number[] = [];
  const blows = new Map<number, number>();
  const run = new Map<number, number>();
  const moved = new Map<number, At>();
  const arcs: number[] = [];
  const shots: number[] = [];
  const ground: At[] = [];
  let leap: Cast['leap'];
  let burrow: Cast['burrow'];
  let zone: At | undefined;
  let changed = false;
  const helped: number[] = [];
  const raised: number[] = [];
  const looks: number[] = [];
  for (const e of events) {
    if (e.kind === 'blink' && e.by === me.id) hops.push({ from: { ...e.from }, to: { ...e.to } });
    else if (e.kind === 'dash' && e.by === me.id) dashes.push({ from: { ...e.from }, to: { ...e.to } });
    else if (e.kind === 'launch' && e.to === me.id) leap = { from: { ...e.from }, land: { ...e.land } };
    else if (e.kind === 'launch' && !moved.has(e.to)) moved.set(e.to, { ...e.from });
    else if (e.kind === 'arc' && e.from === me.id) arcs.push(e.to);
    else if (e.kind === 'shot' && e.by === me.id) shots.push(e.to);
    else if ((e.kind === 'heal' || e.kind === 'haste') && e.to !== me.id && allies.includes(e.to) && !helped.includes(e.to)) helped.push(e.to);
    else if (e.kind === 'revive' && e.by === me.id && !raised.includes(e.to)) raised.push(e.to);
    else if (e.kind === 'aura' && e.by === me.id && e.at) zone = { ...e.at };
    else if ((e.kind === 'look' || e.kind === 'frenzy') && e.by === me.id) changed = true;
    else if (e.kind === 'look' && e.by !== me.id && !allies.includes(e.by)) looks.push(e.by);
    else if (e.kind === 'burrow' && e.by === me.id && e.phase === 'down') burrow = { from: { u: e.u, v: e.v }, path: e.path.map((p) => ({ ...p })) };
    else if (e.kind === 'terrain' && !ground.some((g) => g.u === e.u && g.v === e.v)) ground.push({ u: e.u, v: e.v });
    else if (e.kind === 'hit' && e.by === me.id && e.to !== me.id && e.src === 'skill') {
      const h = hops[hops.length - 1];
      if (h && h.struck === undefined) h.struck = e.to;
      if (!struck.includes(e.to)) {
        struck.push(e.to);
        run.set(e.to, Math.max(0, dashes.length - 1));
      }
      blows.set(e.to, (blows.get(e.to) ?? 0) + 1);
      if (e.heavy && !heavy.includes(e.to)) heavy.push(e.to);
    } else if (e.kind === 'area' && e.by === me.id && !aims.some((a) => a.u === e.u && a.v === e.v)) aims.push({ u: e.u, v: e.v });
  }
  const tiles = new Map<number, At>();
  // (the foes it touched with no blow: taunted (the page reads them), changed in shape, or held by an arc)
  const quiet = [...new Set([...touched, ...looks, ...arcs])].filter((id) => !struck.includes(id) && !allies.includes(id) && id !== me.id);
  for (const id of [...struck, ...quiet]) {
    const at = tileOf(id);
    if (at) tiles.set(id, { u: at.u, v: at.v });
  }
  // (a foe moved with no launch to say from where (shoved aside, hooked in): where it stood before the tick, from the page)
  for (const id of struck) {
    const o = originOf(id);
    const now = tiles.get(id);
    if (!moved.has(id) && o && now && (o.u !== now.u || o.v !== now.v)) moved.set(id, { u: o.u, v: o.v });
  }
  const hooks = arcs.filter((id) => moved.has(id) && struck.includes(id));
  const start = hops[0]?.from ?? dashes[0]?.from ?? leap?.from ?? { u: me.u, v: me.v };
  return { caster: me.id, start, hops, dashes, leap, aims, born: born.filter((u) => u.owner === me.id).map((u) => ({ id: u.id, at: { u: u.u, v: u.v } })), struck, heavy, blows, run, tiles, moved, hooks, shots: shots.length ? shots : arcs.filter((id) => struck.includes(id)), ground, touched: quiet, burrow, helped: helped.length ? helped : allies.filter((id) => id !== me.id), raised, zone, changed };
}

/* ------------------------------------------------------------------ the plan: a track of keys for each fighter it stages */

/** A sprite row the stage may pose a fighter in. */
export type PoseRow = 'idle' | 'walk' | 'attack' | 'attack2' | 'hurt';

/** A key on a fighter's track: from `at` ms it stands on `tile` (and `off` world px from it), in `row` (from `p0` to `p1` of the way through it
 *  by the next key, or `cycle` times round it), seen as `alpha`, facing `look`. `glide`: it moves to the next key's place by then, `arc` px up
 *  at the middle; `fade`: its alpha eases to the next key's. */
export interface Key {
  at: number;
  tile: At;
  off?: { dx: number; dy: number };
  alpha?: number;
  row?: PoseRow;
  p0?: number;
  p1?: number;
  cycle?: number;
  look?: At;
  glide?: boolean;
  arc?: number;
  fade?: boolean;
  /** A painted pose (`showArt.ts`) drawn in place of its sprite's frame. */
  pose?: string;
}

/** A fighter's pose at a moment: on `at` (+ `off`), or `k` of the way from there to `to`, `lift` px up; seen as `alpha`, in a row `p` through it. */
export interface Pose {
  at: At;
  off?: { dx: number; dy: number };
  to?: { at: At; off?: { dx: number; dy: number } };
  k?: number;
  lift?: number;
  alpha: number;
  row: PoseRow;
  p: number;
  look?: At;
  pose?: string;
}

/** A one-off beat: an effect and its sound at a time (ms into the showcase). `where` a tile, `to` a second tile, `foe` a fighter. */
export interface Beat {
  at: number;
  kind: 'vanish' | 'appear' | 'cut' | 'gather' | 'mark' | 'sky' | 'call' | 'land' | 'finish' | 'dash' | 'crash' | 'blow' | 'hook' | 'shot' | 'cloud' | 'burn' | 'snare' | 'stone' | 'smite' | 'taunt' | 'rise' | 'tunnel' | 'bless' | 'transform';
  where: At;
  to?: At;
  foe?: number;
  /** Several tiles at once (the sky over each mark). */
  all?: At[];
}

export interface ShowPlan {
  /** The hero kind whose showcase it is. */
  kind: string;
  style: ShowStyle;
  el: Element;
  /** How long it plays (ms, real time: the x1 rule). */
  ms: number;
  beats: Beat[];
  tracks: Map<number, Key[]>;
  cast: Cast;
  /** How far the camera leans in on the caster, and until when (ms; after it, the held view). */
  zoom: number;
  followMs: number;
}

/** The timings (ms). A showcase runs 4 to 6 s with the opening before it and the fade after (the owner's ask). */
export const SHOW = {
  /** blinks: a beat before the first vanish, each hop's length, and the vanish, gone, appear and cut within a hop; the pose held after. */
  LEAD: 250,
  HOP: 620,
  GONE_AT: 110,
  APPEAR_AT: 200,
  CUT_AT: 330,
  CUT_END: 470,
  OUTRO: 550,
  /** sky: the caster raising the staff, each crowd's mark, the sky after the last mark, and the tail. */
  RAISE: 700,
  MARK: 400,
  SKY: 250,
  SKY_TAIL: 650,
  /** pack: the call, each beast's arrival in turn and its run, and the tail; how far off its tile a beast starts its run (world px). */
  CALL: 800,
  BEAST: 420,
  RUN: 520,
  PACK_TAIL: 450,
  RUN_FROM: 230,
  /** line: the wind-up, the pause after each run, the sheathe before the one cut's foes split, between their splits, and the tail. */
  WIND: 700,
  PAUSE: 260,
  SHEATHE: 520,
  SPLIT: 140,
  LINE_TAIL: 500,
  /** leap: the crouch, the flight and its height (px), and the tail after the crash. */
  CROUCH: 700,
  FLY: 1000,
  HIGH: 95,
  LEAP_TAIL: 1000,
  /** blows: before the first foe, each foe's flurry, the gap to the next, the throw, and the tail. */
  FLURRY_LEAD: 300,
  FLURRY: 620,
  FLURRY_GAP: 160,
  THROW: 420,
  BLOWS_TAIL: 350,
  /** hooks: before the first, each hook's throw, pull and cut, between hooks, and the tail. */
  HOOK_LEAD: 300,
  HOOK_FLY: 260,
  HOOK_PULL: 280,
  HOOK_CUT: 120,
  HOOK_GAP: 700,
  HOOK_TAIL: 450,
  /** shots: a jet to the high ground first, each shot's gap, and the tail; the ground catching alight after the last. */
  JET: 700,
  SHOT: 260,
  SHOTS_TAIL: 600,
  BURN: 90,
  /** burst: the caster's raise, the ring going out, each foe after the last, and the tail. */
  BURST_RAISE: 650,
  BURST_EACH: 170,
  BURST_TAIL: 700,
  /** burrow: the sinking, each tile of the way underground, and the tail. */
  SINK: 700,
  TUNNEL: 420,
  TUNNEL_TAIL: 500,
  /** bless: from one ally to the next, and the tail; change: the writhing, and the tail. */
  BLESS: 260,
  BLESS_TAIL: 650,
  WRITHE: 1100,
  CHANGE_TAIL: 900,
  /** A foe's flinch. */
  FLINCH: 240,
  /** The shortest a showcase plays (its last pose held), so with the opening and the fade it is never under 4 s; and the most a chain of hops
   *  takes, its hops quickened to fit. */
  MIN: 2500,
  HOPS_MAX: 2500,
  HOP_MIN: 480,
};

/** The plan of a showcase for a cast, or null when the cast gives it nothing to show (the short version plays then). */
export function planShow(kind: string, cast: Cast): ShowPlan | null {
  const sc = SHOWCASES[kind];
  if (!sc) return null;
  const b = new Builder(sc, cast);
  b.plan.kind = kind;
  const ok =
    sc.style === 'blinks' ? b.blinks()
    : sc.style === 'sky' ? b.sky()
    : sc.style === 'pack' ? b.pack()
    : sc.style === 'line' ? b.line()
    : sc.style === 'leap' ? b.leapIn()
    : sc.style === 'blows' ? b.flurries()
    : sc.style === 'shots' ? b.shooting()
    : sc.style === 'burst' ? b.burst()
    : sc.style === 'burrow' ? b.tunnel()
    : sc.style === 'bless' ? b.bless()
    : sc.style === 'change' ? b.change()
    : b.hookIn();
  // (the cast had nothing of its style's shape (a charge with a foe already beside it): its blows on each foe it struck, in turn; every style
  // checks its shape before it adds a key, so the plan is still empty here)
  if (!ok && !b.flurries()) return null;
  b.plan.ms = Math.max(b.plan.ms, SHOW.MIN);
  return b.plan;
}

/** The poses of the fighters the showcase stages at `t` ms into it: the page draws them so, over what the sim says, until it ends. */
export function posesAt(plan: ShowPlan, t: number): Map<number, Pose> {
  const out = new Map<number, Pose>();
  for (const [id, keys] of plan.tracks) if (keys.length) out.set(id, poseOn(keys, t));
  return out;
}

function poseOn(keys: readonly Key[], t: number): Pose {
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1].at <= t) i++;
  const k = keys[i];
  const next = keys[i + 1];
  const f = next ? clamp01((t - k.at) / Math.max(1, next.at - k.at)) : 1;
  const row = k.row ?? 'idle';
  const p = k.cycle ? (f * k.cycle) % 1 : (k.p0 ?? 0) + ((k.p1 ?? k.p0 ?? 0) - (k.p0 ?? 0)) * f;
  const alpha = k.fade && next ? (k.alpha ?? 1) + ((next.alpha ?? 1) - (k.alpha ?? 1)) * f : k.alpha ?? 1;
  const pose: Pose = { at: k.tile, alpha, row, p, ...(k.off ? { off: k.off } : {}), ...(k.look ? { look: k.look } : {}), ...(k.pose ? { pose: k.pose } : {}) };
  if (k.glide && next) {
    pose.to = { at: next.tile, ...(next.off ? { off: next.off } : {}) };
    pose.k = easeInOut(f);
    if (k.arc) pose.lift = Math.sin(Math.PI * f) * k.arc;
  }
  return pose;
}

const same = (a: At, b: At): boolean => a.u === b.u && a.v === b.v;

class Builder {
  plan: ShowPlan;
  constructor(private sc: Showcase, private c: Cast) {
    this.plan = { kind: '', style: sc.style, el: sc.el, ms: 0, beats: [], tracks: new Map(), cast: c, zoom: 1.6, followMs: Infinity };
  }
  /** The caster's painted pose for a beat, if it has one. */
  private pz(slot: 'wind' | 'run' | 'strike' | 'fly' | 'call' | 'end'): { pose?: string } {
    const name = this.sc.poses?.[slot];
    return name ? { pose: name } : {};
  }
  private key(id: number, k: Key): void {
    const t = this.plan.tracks.get(id) ?? [];
    t.push(k);
    this.plan.tracks.set(id, t);
  }
  private beat(b: Beat): void {
    this.plan.beats.push(b);
  }
  /** A foe stands where it stood (facing `look`) until `at`, reels, and is thrown to where the sim put it when it was moved. */
  private foe(id: number, at: number, look: At, throwMs = 0): void {
    const now = this.c.tiles.get(id);
    if (!now || this.plan.tracks.has(id)) return;
    const was = this.c.moved.get(id) ?? now;
    this.key(id, { at: 0, tile: was, look });
    const moves = !same(was, now);
    this.key(id, { at, tile: was, row: 'hurt', p0: 0, p1: 1, look, ...(moves ? { glide: true, arc: throwMs > 300 ? 46 : 10 } : {}) });
    this.key(id, { at: at + Math.max(SHOW.FLINCH, moves ? throwMs || SHOW.FLINCH : 0), tile: now, row: 'hurt', p0: 1, look });
  }

  blinks(): boolean {
    const c = this.c;
    if (!c.hops.length) return false;
    this.key(c.caster, { at: 0, tile: c.start, look: c.hops[0].to });
    const hop = Math.max(SHOW.HOP_MIN, Math.min(SHOW.HOP, SHOW.HOPS_MAX / c.hops.length));
    c.hops.forEach((h, i) => {
      const s = SHOW.LEAD + i * hop;
      const foeAt = h.struck !== undefined ? c.moved.get(h.struck) ?? c.tiles.get(h.struck) ?? h.to : h.to;
      this.key(c.caster, { at: s, tile: h.from, fade: true, look: h.to });
      this.key(c.caster, { at: s + SHOW.GONE_AT, tile: h.to, alpha: 0 });
      this.key(c.caster, { at: s + SHOW.APPEAR_AT, tile: h.to, row: 'attack', p0: 0, p1: 1, look: foeAt, ...this.pz('strike') });
      this.key(c.caster, { at: s + SHOW.CUT_END, tile: h.to, row: 'attack', p0: 1, look: foeAt });
      this.beat({ at: s, kind: 'vanish', where: h.from });
      this.beat({ at: s + SHOW.APPEAR_AT, kind: 'appear', where: h.to });
      if (h.struck !== undefined) {
        this.beat({ at: s + SHOW.CUT_AT, kind: 'cut', where: h.to, foe: h.struck });
        this.foe(h.struck, s + SHOW.CUT_AT, h.to);
      }
    });
    const end = SHOW.LEAD + c.hops.length * hop;
    const last = c.hops[c.hops.length - 1];
    this.key(c.caster, { at: end, tile: last.to, look: last.struck !== undefined ? c.tiles.get(last.struck) : undefined, ...this.pz('end') });
    this.beat({ at: end, kind: 'finish', where: last.to });
    this.plan.ms = end + SHOW.OUTRO;
    return true;
  }

  sky(): boolean {
    const c = this.c;
    // (a zone set on the field stands for an aim: the cloud of feathers)
    if (!c.aims.length && c.zone) c.aims.push(c.zone);
    if (!c.aims.length) return false;
    this.key(c.caster, { at: 0, tile: c.start, row: 'attack2', p0: 0, p1: 0.6, look: c.aims[0], ...this.pz('call') });
    this.key(c.caster, { at: SHOW.RAISE, tile: c.start, row: 'attack2', p0: 0.6, look: c.aims[0], ...this.pz('call') });
    this.beat({ at: 80, kind: 'gather', where: c.start });
    c.aims.forEach((a, i) => this.beat({ at: SHOW.RAISE + i * SHOW.MARK, kind: 'mark', where: a }));
    const sky = SHOW.RAISE + c.aims.length * SHOW.MARK + SHOW.SKY;
    this.beat({ at: sky, kind: 'sky', where: c.aims[0], all: c.aims });
    this.plan.ms = sky + SHOW.SKY_TAIL;
    this.plan.zoom = 1.5;
    this.plan.followMs = SHOW.RAISE;
    return true;
  }

  pack(): boolean {
    const c = this.c;
    if (!c.born.length) return false;
    this.key(c.caster, { at: 0, tile: c.start, row: 'attack2', p0: 0, p1: 1, look: c.born[0].at, ...this.pz('call') });
    this.key(c.caster, { at: SHOW.CALL, tile: c.start, row: 'attack2', p0: 1, look: c.born[0].at, ...this.pz('call') });
    this.beat({ at: 60, kind: 'call', where: c.start });
    c.born.forEach((w, i) => {
      const s = SHOW.CALL + i * SHOW.BEAST;
      const side = runSide(c.start, w.at);
      const off = this.sc.emerge ? { dx: 0, dy: 18 } : { dx: side * SHOW.RUN_FROM, dy: -SHOW.RUN_FROM * 0.35 };
      this.key(w.id, { at: 0, tile: w.at, alpha: 0 });
      this.key(w.id, { at: s, tile: w.at, off, alpha: 0, row: this.sc.emerge ? 'idle' : 'walk', cycle: this.sc.emerge ? 0 : 3, glide: true, fade: true });
      this.key(w.id, { at: s + SHOW.RUN, tile: w.at, look: c.start });
      if (this.sc.emerge) this.beat({ at: s, kind: 'appear', where: w.at });
      else this.beat({ at: s + SHOW.RUN, kind: 'land', where: w.at, foe: w.id });
    });
    if (this.sc.rise) c.ground.forEach((g, i) => this.beat({ at: 300 + i * SHOW.BURN, kind: 'rise', where: g }));
    const last = SHOW.CALL + (c.born.length - 1) * SHOW.BEAST + SHOW.RUN;
    this.beat({ at: last + 80, kind: 'finish', where: c.start });
    this.plan.ms = last + SHOW.PACK_TAIL;
    return true;
  }

  line(): boolean {
    const c = this.c;
    if (!c.dashes.length) return false;
    const run = this.sc.run ?? 300;
    this.key(c.caster, { at: 0, tile: c.start, row: 'attack', p0: 0, p1: 0.25, look: c.dashes[0].to, ...this.pz('wind') });
    this.beat({ at: 80, kind: 'gather', where: c.start });
    let s = this.sc.wind ?? SHOW.WIND;
    const ends: number[] = [];
    c.dashes.forEach((d) => {
      this.key(c.caster, { at: s, tile: d.from, row: 'walk', cycle: Math.max(1, Math.round(run / 140)), glide: true, look: d.to, ...this.pz('run') });
      this.key(c.caster, { at: s + run, tile: d.to, row: 'attack', p0: 0.5, p1: 1, look: d.to });
      this.beat({ at: s, kind: 'dash', where: d.from, to: d.to });
      ends.push(s);
      s += run + SHOW.PAUSE;
    });
    // (the one cut: they split in turn once he has sheathed; else each as he passes it, or as the charge reaches it)
    const last = c.dashes[c.dashes.length - 1];
    const sheathed = s - SHOW.PAUSE + (this.sc.sheathe ?? SHOW.SHEATHE);
    c.struck.forEach((id, i) => {
      const j = Math.min(c.dashes.length - 1, c.run.get(id) ?? 0);
      const d = c.dashes[j];
      const at = c.moved.get(id) ?? c.tiles.get(id);
      if (!at) return;
      const when = this.sc.after ? sheathed + i * SHOW.SPLIT : ends[j] + run * along(d.from, d.to, at);
      this.beat({ at: when, kind: 'cut', where: d.from, to: d.to, foe: id });
      this.foe(id, when, d.from, SHOW.THROW);
    });
    const done = this.sc.after ? sheathed + c.struck.length * SHOW.SPLIT : s;
    this.key(c.caster, { at: s - SHOW.PAUSE + 200, tile: last.to, look: last.to, ...this.pz('end') });
    this.beat({ at: done, kind: 'finish', where: last.to });
    this.plan.ms = done + SHOW.LINE_TAIL;
    this.plan.zoom = 1.4;
    return true;
  }

  leapIn(): boolean {
    const c = this.c;
    const l = c.leap;
    if (!l) return false;
    const land = SHOW.CROUCH + SHOW.FLY;
    this.key(c.caster, { at: 0, tile: l.from, row: 'attack', p0: 0, p1: 0.2, look: l.land });
    this.key(c.caster, { at: SHOW.CROUCH, tile: l.from, row: 'attack', p0: 0.2, p1: 0.5, glide: true, arc: SHOW.HIGH, look: l.land, ...this.pz('fly') });
    this.key(c.caster, { at: land, tile: l.land, row: 'attack', p0: 0.6, p1: 1, look: l.land });
    this.key(c.caster, { at: land + 300, tile: l.land });
    this.beat({ at: 60, kind: 'gather', where: l.from });
    this.beat({ at: SHOW.CROUCH, kind: 'dash', where: l.from, to: l.land });
    this.beat({ at: land, kind: 'crash', where: l.land });
    for (const id of c.struck) this.foe(id, land, l.land, SHOW.THROW);
    this.plan.ms = land + SHOW.LEAP_TAIL;
    this.plan.zoom = 1.3;
    return true;
  }

  flurries(): boolean {
    const c = this.c;
    if (!c.struck.length) return false;
    let s = SHOW.FLURRY_LEAD;
    this.key(c.caster, { at: 0, tile: c.start, look: c.tiles.get(c.struck[0]) });
    this.beat({ at: 60, kind: 'gather', where: c.start });
    for (const id of c.struck) {
      const n = Math.max(1, c.blows.get(id) ?? 1);
      const at = c.moved.get(id) ?? c.tiles.get(id) ?? c.start;
      this.key(c.caster, { at: s, tile: c.start, row: 'attack', cycle: n, look: at, ...this.pz('strike') });
      for (let b = 0; b < n; b++) this.beat({ at: s + (b + 0.6) * (SHOW.FLURRY / n), kind: b === n - 1 ? 'cut' : 'blow', where: c.start, foe: id });
      // (the foe reels from the first blow, and the last throws it)
      const now = c.tiles.get(id);
      if (now && !this.plan.tracks.has(id)) {
        this.key(id, { at: 0, tile: at, look: c.start });
        this.key(id, { at: s + 0.6 * (SHOW.FLURRY / n), tile: at, row: 'hurt', cycle: n, look: c.start });
        this.key(id, { at: s + SHOW.FLURRY, tile: at, row: 'hurt', p0: 1, look: c.start, ...(same(at, now) ? {} : { glide: true, arc: 40 }) });
        this.key(id, { at: s + SHOW.FLURRY + SHOW.THROW, tile: now, row: 'hurt', p0: 1, look: c.start });
      }
      this.key(c.caster, { at: s + SHOW.FLURRY, tile: c.start, row: 'attack', p0: 1, look: at });
      s += SHOW.FLURRY + SHOW.FLURRY_GAP;
    }
    this.key(c.caster, { at: s, tile: c.start });
    this.plan.ms = s + SHOW.BLOWS_TAIL;
    this.plan.zoom = 1.5;
    return true;
  }

  hookIn(): boolean {
    const c = this.c;
    if (!c.hooks.length) return false;
    let s = SHOW.HOOK_LEAD;
    this.key(c.caster, { at: 0, tile: c.start, look: c.moved.get(c.hooks[0]) });
    for (const id of c.hooks) {
      const was = c.moved.get(id)!;
      const now = c.tiles.get(id)!;
      this.key(c.caster, { at: s, tile: c.start, row: 'attack2', p0: 0, p1: 0.6, look: was });
      this.beat({ at: s, kind: 'hook', where: c.start, to: was, foe: id });
      const pulled = s + SHOW.HOOK_FLY;
      const landed = pulled + SHOW.HOOK_PULL;
      this.key(id, { at: 0, tile: was, look: c.start });
      this.key(id, { at: pulled, tile: was, row: 'hurt', p0: 0, p1: 0.5, glide: true, arc: 18, look: c.start });
      this.key(id, { at: landed, tile: now, row: 'hurt', p0: 0.5, look: c.start });
      this.key(c.caster, { at: landed, tile: c.start, row: 'attack', p0: 0, p1: 1, look: now });
      this.key(c.caster, { at: landed + SHOW.HOOK_CUT + 160, tile: c.start, row: 'attack', p0: 1, look: now });
      this.beat({ at: landed + SHOW.HOOK_CUT, kind: 'cut', where: c.start, foe: id });
      this.key(id, { at: landed + SHOW.HOOK_CUT, tile: now, row: 'hurt', p0: 0, p1: 1, look: c.start });
      this.key(id, { at: landed + SHOW.HOOK_CUT + SHOW.FLINCH, tile: now, row: 'hurt', p0: 1, look: c.start });
      s += SHOW.HOOK_GAP;
    }
    this.key(c.caster, { at: s, tile: c.start });
    this.plan.ms = s + SHOW.HOOK_TAIL;
    this.plan.zoom = 1.5;
    return true;
  }

  shooting(): boolean {
    const c = this.c;
    if (!c.shots.length) return false;
    let s = 0;
    const first = c.tiles.get(c.shots[0]);
    this.key(c.caster, { at: 0, tile: c.start, row: 'attack2', p0: 0, p1: 0.4, look: first });
    if (c.leap) {
      // (it jets to the high ground first)
      this.key(c.caster, { at: 200, tile: c.leap.from, glide: true, arc: 40, row: 'walk', cycle: 2, look: c.leap.land });
      this.key(c.caster, { at: 200 + SHOW.JET, tile: c.leap.land, look: first });
      this.beat({ at: 200, kind: 'dash', where: c.leap.from, to: c.leap.land });
      s = 200 + SHOW.JET;
    }
    if (this.sc.cloud) this.beat({ at: 120, kind: 'cloud', where: c.start });
    else this.beat({ at: 80, kind: 'gather', where: c.leap?.land ?? c.start });
    s += this.sc.draw ?? 500;
    const from = c.leap?.land ?? c.start;
    const hit = new Set<number>();
    c.shots.forEach((id, i) => {
      const at = c.moved.get(id) ?? c.tiles.get(id);
      if (!at) return;
      const t = s + i * SHOW.SHOT;
      this.key(c.caster, { at: t, tile: from, row: 'attack', p0: 0, p1: 1, look: at });
      this.beat({ at: t, kind: 'shot', where: from, foe: id });
      if (!hit.has(id)) {
        hit.add(id);
        this.foe(id, t + 120, from);
      }
    });
    const end = s + c.shots.length * SHOW.SHOT;
    // (the ground it set alight catches, tile by tile from the caster out)
    const far = (a: At) => Math.abs(a.u - from.u) + Math.abs(a.v - from.v);
    [...c.ground].sort((a, b) => far(a) - far(b)).forEach((g, i) => this.beat({ at: s + i * SHOW.BURN, kind: 'burn', where: g }));
    this.key(c.caster, { at: end + 160, tile: from });
    this.plan.ms = end + SHOW.SHOTS_TAIL;
    this.plan.zoom = 1.35;
    return true;
  }

  burst(): boolean {
    const c = this.c;
    const all = [...c.struck, ...c.touched];
    if (!all.length) return false;
    this.key(c.caster, { at: 0, tile: c.start, row: 'attack2', p0: 0, p1: 1, look: c.tiles.get(all[0]), ...this.pz('call') });
    this.key(c.caster, { at: SHOW.BURST_RAISE, tile: c.start, row: 'attack2', p0: 1, ...this.pz('call') });
    this.beat({ at: 80, kind: 'gather', where: c.start });
    this.beat({ at: SHOW.BURST_RAISE - 120, kind: 'call', where: c.start });
    // (each foe in turn, the nearest first, as the ring reaches it)
    const near = (id: number) => {
      const t = c.tiles.get(id);
      return t ? Math.abs(t.u - c.start.u) + Math.abs(t.v - c.start.v) : 99;
    };
    const order = all.sort((a, b) => near(a) - near(b) || a - b);
    const hit = this.sc.hit ?? 'smite';
    order.forEach((id, i) => {
      const t = SHOW.BURST_RAISE + i * SHOW.BURST_EACH;
      this.beat({ at: t, kind: hit, where: c.start, foe: id });
      this.foe(id, t, c.start, SHOW.THROW);
    });
    // (the ground it changed rises, from the caster out)
    if (this.sc.rise) {
      const far = (a: At) => Math.abs(a.u - c.start.u) + Math.abs(a.v - c.start.v);
      [...c.ground].sort((a, b) => far(a) - far(b)).forEach((g, i) => this.beat({ at: SHOW.BURST_RAISE + 120 + i * SHOW.BURN, kind: 'rise', where: g }));
    }
    const end = SHOW.BURST_RAISE + order.length * SHOW.BURST_EACH;
    this.key(c.caster, { at: end, tile: c.start });
    this.beat({ at: end, kind: 'finish', where: c.start });
    this.plan.ms = end + SHOW.BURST_TAIL;
    this.plan.zoom = 1.25;
    return true;
  }

  tunnel(): boolean {
    const c = this.c;
    const w = c.burrow;
    if (!w) return false;
    // (he sinks into the ground where he stands; the earth heaves along his way under it; the sim's burst out plays once the fight runs)
    this.key(c.caster, { at: 0, tile: w.from, row: 'hurt', p0: 0, p1: 1 });
    this.key(c.caster, { at: 300, tile: w.from, row: 'hurt', p0: 1, glide: true, fade: true });
    this.key(c.caster, { at: 300 + SHOW.SINK, tile: w.from, off: { dx: 0, dy: 14 }, alpha: 0 });
    this.beat({ at: 80, kind: 'gather', where: w.from });
    this.beat({ at: 300, kind: 'tunnel', where: w.from });
    w.path.forEach((p, i) => this.beat({ at: 300 + SHOW.SINK + i * SHOW.TUNNEL, kind: 'tunnel', where: p }));
    this.plan.ms = 300 + SHOW.SINK + w.path.length * SHOW.TUNNEL + SHOW.TUNNEL_TAIL;
    this.plan.zoom = 1.3;
    this.plan.followMs = 300 + SHOW.SINK;
    return true;
  }

  bless(): boolean {
    const c = this.c;
    if (!c.helped.length && !c.raised.length && !c.struck.length) return false;
    this.key(c.caster, { at: 0, tile: c.start, row: 'attack2', p0: 0, p1: 1, ...this.pz('call') });
    this.key(c.caster, { at: SHOW.BURST_RAISE, tile: c.start, row: 'attack2', p0: 1, ...this.pz('call') });
    this.beat({ at: 80, kind: 'gather', where: c.start });
    this.beat({ at: SHOW.BURST_RAISE - 120, kind: 'call', where: c.start });
    // (the opening chord throws the foes near him back first)
    for (const [id] of c.moved) if (!c.dashes.length) this.foe(id, SHOW.BURST_RAISE - 80, c.start, SHOW.THROW);
    let t = SHOW.BURST_RAISE;
    for (const id of [...c.raised, ...c.helped.filter((x) => !c.raised.includes(x))]) {
      this.beat({ at: t, kind: 'bless', where: c.start, foe: id });
      t += SHOW.BLESS;
    }
    // (and he leads the charge)
    const d = c.dashes[0];
    if (d) {
      t += 150;
      this.key(c.caster, { at: t, tile: d.from, row: 'walk', cycle: 3, glide: true, look: d.to });
      this.key(c.caster, { at: t + 420, tile: d.to, row: 'attack', p0: 0.4, p1: 1, look: d.to });
      this.beat({ at: t, kind: 'dash', where: d.from, to: d.to });
      for (const id of c.struck) {
        this.beat({ at: t + 420, kind: 'cut', where: d.to, foe: id });
        this.foe(id, t + 420, d.to, SHOW.THROW);
      }
      t += 420;
    }
    const at = d?.to ?? c.start;
    this.key(c.caster, { at: t + 200, tile: at });
    this.beat({ at: t, kind: 'finish', where: at });
    this.plan.ms = t + SHOW.BLESS_TAIL;
    this.plan.zoom = 1.25;
    return true;
  }

  change(): boolean {
    const c = this.c;
    if (!c.changed && !c.moved.size) return false;
    let t = 300;
    this.key(c.caster, { at: 0, tile: c.start });
    // (chains of hellfire drag the nearest foes in first)
    for (const [id, was] of c.moved) {
      const now = c.tiles.get(id);
      if (!now) continue;
      this.beat({ at: t, kind: 'hook', where: c.start, to: was, foe: id });
      this.key(id, { at: 0, tile: was, look: c.start });
      this.key(id, { at: t + SHOW.HOOK_FLY, tile: was, row: 'hurt', p0: 0, p1: 1, glide: true, arc: 12, look: c.start });
      this.key(id, { at: t + SHOW.HOOK_FLY + SHOW.HOOK_PULL, tile: now, row: 'hurt', p0: 1, look: c.start });
      t += 380;
    }
    // (the change takes him: he writhes as power gathers, then bursts into his new shape and howls)
    this.key(c.caster, { at: t, tile: c.start, row: 'hurt', cycle: 4 });
    this.beat({ at: t, kind: 'gather', where: c.start });
    t += SHOW.WRITHE;
    this.key(c.caster, { at: t, tile: c.start, row: 'attack2', p0: 0, p1: 1 });
    this.beat({ at: t, kind: 'transform', where: c.start });
    this.beat({ at: t + 150, kind: 'call', where: c.start });
    for (const id of [...c.struck, ...c.touched]) if (!c.moved.has(id)) this.foe(id, t + 250, c.start);
    this.key(c.caster, { at: t + 600, tile: c.start });
    this.plan.ms = t + SHOW.CHANGE_TAIL;
    this.plan.zoom = 1.6;
    return true;
  }
}

/** How far along a run (0 to 1) a tile lies. */
function along(a: At, b: At, p: At): number {
  const du = b.u - a.u;
  const dv = b.v - a.v;
  const l = du * du + dv * dv;
  return l ? clamp01(((p.u - a.u) * du + (p.v - a.v) * dv) / l) : 1;
}
/** A beast runs in from the caster's side of it, along the board's u (screen left or right), -1 or 1. */
const runSide = (from: At, to: At): number => (to.u - from.u + (to.v - from.v) * 0.5 >= 0 ? 1 : -1);
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const easeInOut = (k: number): number => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k));
