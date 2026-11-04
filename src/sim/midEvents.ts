// The road's events (MID-EVENTS): twelve more cards for the gaps between an army's or the daily's waves, and two that come back
// later. They join the five old kinds (`EVENT_KINDS`) in those runs only; an ordinary run, the tower and the Calamity draw as
// they did. Which card a gap brings is drawn from a side stream of the run's seed (`mixSeed(seed, PICK_SALT, stage)`), weighted
// by the army and the land, and a kind seen once in a run is not drawn again (`run.road.seen`). What a card's options do is
// drawn with the card (the card's own stream, `mixSeed(seed, 0xe7e47, stage)`), so a saved card replays the same and every
// gamble is settled before the player picks.
//
//   scout      a wounded scout names the next three waves, for her bandages (or her map, and an ambush)
//   pact       the Pale Lady's shrine: a relic now, and she comes back for her due (ladyDue)
//   deserters  pay their wages for a sellsword of your choosing, or sell them to the bounty men
//   cardsharp  stake coin, or a piece of gear, on one hand of cards
//   ambush     dig in (foes weaker), spring it (an ambush, and their purse), or slip away (a toll)
//   healer     salves for two fights, or a blessing for one hero for good
//   temper     a crossroads smith raises a piece of gear a tier, or quenches it in blood
//   crown      a cursed crown: a legendary relic for a heart, or its gold from a fence
//   refugees   share your coin, or walk with them, and they remember (refugeesReturn)
//   duel       a champion's challenge: send your best (the fight is rolled), refuse, or pay him off
//   storm      the land's own weather over the next field: march into it for the loot, or pay for shelter
//   stranger   a pilgrim who knows one of your heroes by name: an heirloom, or her blessing
//   witch      a hedge witch's hex on the foes, or her brew (rolled)
//
// Army runs keep no hp between waves, so a hurt here is a twist on the next fight (`Buff.twist`: a cursed start, an ambush, fog)
// or a curse on the foes (`Buff.foes`), never a wound. Pure rules: no Pixi, no DOM.

import { mixSeed, Rng } from './rng';
import { gearText, makeGear, MAX_TIER, SLOTS, type Gear } from './gear';
import { canTemper, findPrice, findsAsGear, findSlotGear, isReal, loseFound, SMALL_UPGRADE, SOURCE, stow, tempered, upgradeFound, UPGRADE_LEVELS } from './runGear';
import { GREAT_RELIC_IDS, pickRelic, RELIC_IDS, relicText, theRelic, TheRelic } from './relics';
import { TWISTS } from './twists';
import { HEROES, UNITS } from './units';
import { HERO_NAMES, heroName } from './heroNames';
import { landOf, waveFoes } from './armies';
import { benchFull, MAX_RETRIES, recruit, summonCost, tierOfRun, waveArmyOf, type Buff, type Run } from './run';
import { marketTier } from './market';
import { EVENT_KINDS, type EventCard, type EventKind, type EventOption } from './events';
import type { Area } from './board';

/** The road's new kinds, drawn in army and daily runs beside the old five. */
export const ROAD_KINDS = ['scout', 'pact', 'deserters', 'cardsharp', 'ambush', 'healer', 'temper', 'crown', 'refugees', 'duel', 'storm', 'stranger', 'witch'] as const;
/** The cards that come back for a choice made earlier (never drawn on their own). */
export const FOLLOW_KINDS = ['ladyDue', 'refugeesReturn'] as const;
export type RoadKind = (typeof ROAD_KINDS)[number] | (typeof FOLLOW_KINDS)[number];

/** A debt or a favour that comes back as a card of its own at the first gap from `due` on. */
export interface Owed {
  kind: (typeof FOLLOW_KINDS)[number];
  due: number;
  /** The relic the Pale Lady gave (she may take it back). */
  relic?: string;
  /** A refugees' favour: a big one (coin was shared) or a small one (they were walked with). */
  big?: boolean;
}

export interface RoadState {
  /** Kinds of card seen this run (none comes twice while others are left). */
  seen?: string[];
  owed?: Owed[];
}

/** A follow-up comes this many stages after the choice (two gaps on). */
export const OWED_AFTER = 4;
const PICK_SALT = 0x3ed1e;

/** What an option does: a bag of plain changes, all settled when the card was drawn. */
export interface RoadAct {
  /** The line the card shows after. */
  line: string;
  gold?: number;
  /** Gold taken, as much as there is (a toll that is not a price). */
  lose?: number;
  /** Laid over the next fight's buff: hp, attack and speed multiply, the foes' too; a twist; gold for the win. */
  buff?: Buff;
  relic?: string;
  /** A relic given back. */
  drop?: string;
  gear?: Gear;
  /** A hero kind that joins the bench (the price is paid back if the bench is full). */
  hire?: string;
  /** +1 gives back a burned heart (or `gold` instead, when none is burned), -1 burns one. */
  heart?: 1 | -1;
  /** Lasting bumps to one hero (by roster id). */
  bump?: { hero: number; hp: number; atk: number };
  /** A piece of gear (by id) raised a tier, or given more attack. */
  temper?: { gear: number; up?: boolean; atk?: number };
  /** A piece of gear (by id) lost (a lost wager). */
  lost?: number;
  owe?: Owed;
}

// ---- the pick ---------------------------------------------------------------------------------------------------------

/** Whether a run draws from the road's kinds: an army's or the daily's (a fixed run of waves). */
export const roadRun = (run: Run): boolean => !run.tower && (run.mode?.kind === 'army' || run.mode?.kind === 'daily');

/** The land a run's waves are fought in. */
function landOfRun(run: Run): Area | undefined {
  const a = waveArmyOf(run);
  return run.area ?? (a ? landOf(a, run.seed) : undefined);
}

/** How likely a kind is in a run: the market a little more (the owner wanted more of it), the rest by the army and the land. */
export function kindWeight(run: Run, kind: string): number {
  const army = run.mode?.kind === 'army' ? run.mode.army : '';
  const land = landOfRun(run) ?? '';
  const by = (xs: readonly string[], w: number) => (xs.includes(army) || xs.includes(land) ? w : 1);
  switch (kind) {
    case 'merchant':
      return 1.5;
    case 'deserters':
      // (orcs, ogres and the yokai's men desert; bones, beasts and golems do not)
      return ['undead', 'beasts', 'golems'].includes(army) ? 0.3 : by(['orcs', 'ogres', 'yokai', 'warcamp'], 1.8);
    case 'witch':
      return by(['forest', 'swamp', 'autumn', 'graveyard', 'wildwood'], 2);
    case 'crown':
      return by(['graveyard', 'ruins', 'dungeon', 'undead'], 1.7);
    case 'pact':
      return by(['temple', 'shrine', 'crystal', 'infernal'], 1.7);
    case 'storm':
      return by(['snow', 'desert', 'volcano', 'highlands', 'oasis'], 1.6);
    case 'refugees':
      return 1.2;
    default:
      return 1;
  }
}

/** The old kinds the greedy player takes something free from (a shrine's blessing, a chest): drawn exactly as they always were, a second
 *  time in a run too (with another face, `KEPT_FACES`), so the balance tools' pace stays where it was (as the tower's creative encounters
 *  stand in only for its plainer floors). */
export const KEPT_KINDS: readonly EventKind[] = ['shrine', 'chest'];

/** The kind of card a gap of a road run brings. A debt or favour that is due comes first. Then the old draw (`old`, the card stream's first
 *  pick of the five, as ever): a shrine or a chest stays; anything else (the merchant, a cursed path, a training ground) gives way to a
 *  weighted draw, on its own stream, of the kinds not yet seen this run: the market, those two and the road's own. */
export function pickRoadKind(run: Run, stage: number, old?: EventKind): EventKind {
  const due = run.road?.owed?.find((o) => o.due <= stage);
  if (due) return due.kind;
  const seen = run.road?.seen ?? [];
  if (old && KEPT_KINDS.includes(old)) return old;
  const all: string[] = [...EVENT_KINDS.filter((k) => !KEPT_KINDS.includes(k)), ...ROAD_KINDS];
  const fresh = all.filter((k) => !seen.includes(k));
  const pool = fresh.length ? fresh : all;
  return new Rng(mixSeed(run.seed, PICK_SALT, stage)).weighted(Object.fromEntries(pool.map((k) => [k, kindWeight(run, k)]))) as EventKind;
}

/** The other faces of a shrine or a chest that comes again in a run (the same card underneath: only its title and words change). */
export const KEPT_FACES: Record<string, readonly { title: string; text: string }[]> = {
  shrine: [
    { title: 'A wayside shrine', text: 'A saint with a worn-away face, a bowl of rainwater and a few stubs of candle. The heroes light one each. Duchess eats a candle.' },
    { title: 'A shrine in the rocks', text: 'Somebody has carved a little chapel into the cliff and left the door open. It smells of old prayers and new moss.' },
  ],
  chest: [
    { title: 'A sunken coffer', text: 'Half buried in the mud of a ditch, banded with iron, its lock long rusted through. Nobody seems to be looking for it.' },
    { title: "A dead man's strongbox", text: 'Its owner is not going to mind any more. The lid is stiff, but the hinges are honest.' },
  ],
};

/** A shrine or a chest seen before in this run wears another face. */
export function faceOf(run: Run, card: EventCard): EventCard {
  const faces = KEPT_FACES[card.kind];
  const before = run.road?.seen?.filter((k) => k === card.kind).length ?? 0;
  return faces && before > 0 ? { ...card, ...faces[(before - 1) % faces.length] } : card;
}

/** Note a card drawn: its kind is seen, and a due debt or favour is paid out by it. */
export function noteRoad(run: Run, card: EventCard): void {
  const road = (run.road ??= {});
  if ((FOLLOW_KINDS as readonly string[]).includes(card.kind)) {
    const i = road.owed?.findIndex((o) => o.kind === card.kind) ?? -1;
    if (i >= 0) road.owed!.splice(i, 1);
    return;
  }
  (road.seen ??= []).push(card.kind);
}

// ---- the cards --------------------------------------------------------------------------------------------------------

const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[rng.int(0, xs.length - 1)];
const gearId = (run: Run) => (run.nextGear = (run.nextGear ?? 1) + 1) - 1;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const nameOf = (run: Run, id: number): string => UNITS[run.roster.find((h) => h.id === id)?.kind ?? '']?.name ?? 'hero';
const road = (label: string, text: string, cost: number, act: RoadAct): EventOption => ({ label, text, cost, effect: { t: 'road', act } });
const leave = (label = 'Leave', text = 'Move on.'): EventOption => ({ label, text, cost: 0, effect: { t: 'leave' } });
const twistText = (id: string) => `${TWISTS[id].name}: ${TWISTS[id].text.charAt(0).toLowerCase()}${TWISTS[id].text.slice(1).replace(/\.$/, '')}`;
const unowned = (run: Run, ids: readonly string[]) => ids.filter((id) => !run.relics?.includes(id));
/** Every piece of gear the run holds: the pack's first, then what the heroes wear. */
// (RUN-GEAR: in a real-gear run, the pieces it has found: never the lasting kit)
const allGear = (run: Run): Gear[] => (isReal(run) ? findsAsGear(run) : [...(run.items ?? []), ...run.roster.flatMap((h) => SLOTS.flatMap((s) => (h.gear?.[s] ? [h.gear[s]!] : [])))]);
/** What a temper's words say it does: a tier (or item levels) up, or the lesser boon (attack, or a little level). */
const upWords = (g: Gear): string => (g.piece ? `${UPGRADE_LEVELS} item levels up` : 'a tier up');
const smallWords = (g: Gear, atk: number): string => (g.piece ? `+${SMALL_UPGRADE} item levels` : `+${Math.round(atk * 100)}% attack`);
/** The squad's heroes, or the roster's when none is chosen. */
const fielded = (run: Run) => {
  const s = run.roster.filter((h) => run.squad.includes(h.id));
  return s.length ? s : run.roster;
};

/** The next three waves after a stage, as one line ("Wave 5: Orc Grunt ×2, Orc Archer · ..."). */
export function scoutReport(run: Run, stage: number): string {
  const army = waveArmyOf(run);
  if (!army) return 'She has seen nothing of use.';
  const lines: string[] = [];
  for (let n = stage + 1; n <= Math.min(army.waves.length, stage + 3); n++) {
    const count = new Map<string, number>();
    for (const id of waveFoes(army, n, tierOfRun(run))) count.set(id, (count.get(id) ?? 0) + 1);
    const names = [...count].map(([id, c]) => `${UNITS[id]?.name ?? id}${c > 1 ? ` ×${c}` : ''}`).join(', ');
    lines.push(`Wave ${n}${army.waves[n - 1].boss ? ' (a boss)' : ''}: ${names}`);
  }
  return lines.length ? lines.join(' · ') : 'Nothing more marches this way.';
}

/** The storm a land brings: a twist, and what the card calls it. */
function stormOf(land: Area | undefined): { twist: string; name: string; text: string } {
  switch (land) {
    case 'snow':
      return { twist: 'frost', name: 'A blizzard', text: 'Snow comes sideways off the peaks, and the next field is already white.' };
    case 'volcano':
    case 'forge':
      return { twist: 'lava', name: 'The ground splits', text: 'The earth groans. Ahead, cracks glow red across the field you must cross.' };
    case 'desert':
    case 'oasis':
      return { twist: 'rollingGales', name: 'A sandstorm', text: 'A brown wall of sand rolls over the dunes. Arrows will fly wherever the wind likes.' };
    case 'swamp':
    case 'forest':
    case 'graveyard':
    case 'autumn':
    case 'dungeon':
      return { twist: 'fog', name: 'A fog bank', text: 'A grey fog creeps in, thick enough to lose a hand in. The bowmen mutter.' };
    default:
      return { twist: 'rollingGales', name: 'A thunderstorm', text: 'Black clouds pile over the field ahead, and the wind turns wild.' };
  }
}

/** A road card of `kind` for a gap after `stage`, from the card's stream. */
export function drawRoad(run: Run, stage: number, kind: RoadKind, rng: Rng): EventCard {
  const card = (title: string, text: string, options: EventOption[]): EventCard => ({ kind: kind as EventKind, stage, title, text, options });
  const s = stage;
  const owed = (k: Owed['kind'], extra: Partial<Owed> = {}): Owed => ({ kind: k, due: s + OWED_AFTER, ...extra });
  switch (kind) {
    case 'scout': {
      const report = scoutReport(run, s);
      const purse = 15 + 3 * s;
      return card('A wounded scout', 'A scout of the Keep lies in the ditch with a black-fletched arrow in her leg. She has seen what marches ahead of you, and she is bleeding on it.', [
        road('Bind her wound', 'she names the next three waves, and marks their weak flank: +10% attack in the next fight', 12 + 2 * s, { line: `She talks while you bandage. ${report}.`, buff: { atk: 1.1 } }),
        road('Take her map and go', `the next three waves, free, and +${purse} gold from her pack; the ones who shot her are close (next fight: Ambush)`, 0, { line: `The map is crude but true. ${report}.`, gold: purse, buff: { twist: 'ambush' } }),
        leave(),
      ]);
    }
    case 'pact': {
      const ids = unowned(run, RELIC_IDS);
      const id = ids.length ? pickRelic(() => rng.next(), ids) : '';
      return card("The Pale Lady's shrine", "A shrine of white stone in the mist, and a lady of white stone upon it. Her hand is open. 'Take what you need,' she says. 'I will come for my due.'", [
        id
          ? road(`Take ${theRelic(id)}`, `${relicText(id)}, free; in two stops she comes to collect`, 0, { line: `${TheRelic(id)} is cold in your hand. Somewhere behind you, stone feet begin to walk.`, relic: id, owe: owed('ladyDue', { relic: id }) })
          : road('Take her coin', '+40 gold, free; in two stops she comes to collect', 0, { line: 'The coins are cold. Somewhere behind you, stone feet begin to walk.', gold: 40, owe: owed('ladyDue') }),
        road('Ask only a blessing', `next fight: ${twistText('holy')}, and +10% hp`, 0, { line: 'She touches each brow. The cold passes, and something holy stays.', buff: { twist: 'holy', hp: 1.1 } }),
        leave(),
      ]);
    }
    case 'ladyDue': {
      const due = run.road?.owed?.find((o) => o.kind === 'ladyDue');
      const relic = due?.relic && run.relics?.includes(due.relic) ? due.relic : '';
      const price = 40 + 5 * s;
      return card('The Pale Lady collects', "Frost creeps along the road, and a white hand falls on your shoulder. 'My due,' says the Pale Lady. She does not say please.", [
        road('Pay her in gold', 'she takes the coin and is gone', price, { line: 'She counts every coin twice, and the frost goes with her.' }),
        ...(relic ? [road(`Give back ${theRelic(relic)}`, 'it was only lent', 0, { line: `She takes back ${theRelic(relic)} without a word.`, drop: relic })] : []),
        road('Refuse her', `next fight: ${twistText('cursed')}, and the foes +20% hp and attack`, 0, { line: 'She smiles, which is worse. A chill sinks into the bones of everyone.', buff: { twist: 'cursed', foes: 1.2 } }),
      ]);
    }
    case 'deserters': {
      const pool = run.pool?.length ? run.pool : HEROES;
      const who = pick(rng, pool);
      const wage = Math.max(20, summonCost(run) - 5);
      const bounty = 20 + 3 * s;
      return card('Deserters at a fire', `Three of the enemy's own, colours torn off, warm their hands at a stolen fire. Their captain is a sellsword ${UNITS[who].name}, and says so.`, [
        road(`Pay the ${UNITS[who].name}'s wages`, 'the sellsword joins the bench, grade 1 (the others drift away)', wage, { line: `The ${UNITS[who].name} spits on the fire and falls in behind you.`, hire: who }),
        road('Sell them to the bounty men', `+${bounty} gold, and a bad night's sleep`, 0, { line: `The bounty men pay ${bounty} gold and do not ask questions. Neither do you.`, gold: bounty }),
        leave(),
      ]);
    }
    case 'cardsharp': {
      const stake = 20 + 2 * s;
      const pot = 45 + 4 * s;
      const coinWin = rng.chance(0.5);
      const gear = allGear(run).sort((a, b) => a.tier - b.tier || a.id - b.id)[0];
      const gearWin = rng.chance(0.45);
      const options: EventOption[] = [
        road('Stake coin', `a single hand for ${pot} gold (an even chance)`, stake, coinWin ? { line: `Three queens. The countess sighs and pushes ${pot} gold across the coffin lid.`, gold: pot } : { line: 'Two pair against her full house. The countess smiles with too many teeth.' }),
      ];
      if (gear) {
        const up = canTemper(gear);
        options.push(road(`Stake the ${gear.name}`, `win and she has it tempered (${up ? upWords(gear) : smallWords(gear, 0.06)}); lose and it is hers`, 0, gearWin
          ? { line: `You win. Her smith returns the ${gear.name} ${up ? 'a tier better' : 'keener than ever'}.`, temper: up ? { gear: gear.id, up: true } : { gear: gear.id, atk: 0.06 } }
          : { line: `You lose. The ${gear.name} vanishes into her skirts.`, lost: gear.id }));
      }
      options.push(leave());
      return card('The bone-dice countess', "A woman in a moth-eaten gown deals cards on a coffin lid by the road. 'One hand, travellers. The house hardly ever wins.'", options);
    }
    case 'ambush': {
      const purse = 25 + 4 * s;
      const toll = 10 + s;
      return card('Tracks in the mud', 'Too many boot-prints, all pointing the same way, and none coming back. Something waits on the next field.', [
        road('Dig in and lay stakes', 'next fight: the foes -10% hp and attack', 15 + 2 * s, { line: 'Stakes in the ground and pits in the grass. Let them come.', buff: { foes: 0.9 } }),
        road('Spring the trap on them', `next fight: ${twistText('ambush')}; the win pays +${purse} gold`, 0, { line: 'You walk into it on purpose. Their purse is the prize.', buff: { twist: 'ambush', gold: purse } }),
        road('Slip away by the long road', `a ferryman's toll: up to ${toll} gold`, 0, { line: 'The ferryman takes his toll, and the trap closes on nobody.', lose: toll }),
      ]);
    }
    case 'healer': {
      const one = pick(rng, fielded(run));
      return card('A wandering healer', 'A grey sister with a satchel of herbs and a bell that rings without a hand. She looks the heroes over and tuts.', [
        road('Buy her salves', '+20% hp in each of the next two fights', 18 + 2 * s, { line: 'The salves smell of pine and something worse. They work.', buff: { hp: 1.2, duration: 2 } }),
        ...(one ? [road(`Let her tend the ${nameOf(run, one.id)}`, 'that hero: +6% hp for good, free', 0, { line: `She sets an old break in the ${nameOf(run, one.id)}'s arm. It is stronger for it.`, bump: { hero: one.id, hp: 0.06, atk: 0 } })] : []),
        leave(),
      ]);
    }
    case 'temper': {
      const gear = allGear(run);
      const ups = gear.filter(canTemper);
      const g = ups.length ? pick(rng, ups) : gear.length ? pick(rng, gear) : undefined;
      if (!g) {
        const fresh = findSlotGear(run, gearId(run), pick(rng, SLOTS), marketTier(run, s), s, SOURCE.road);
        return card('A crossroads forge', "A smith with burn-scarred arms works a forge where four roads meet. 'No steel on you? Then buy some.'", [
          road(`Buy the ${fresh.name}`, `${fresh.slot}: ${gearText(fresh)}`, findPrice(fresh, s), { line: `The ${fresh.name} is still warm.`, gear: fresh }),
          leave(),
        ]);
      }
      const options: EventOption[] = [];
      if (canTemper(g)) {
        const up = tempered(g);
        options.push(road(`Temper the ${g.name}`, `it becomes a ${up.name} (${gearText(up)})`, 20 * (g.tier + 1) + 2 * s, { line: `Hammer, fire and water: the ${g.name} comes out a ${up.name}.`, temper: { gear: g.id, up: true } }));
      }
      options.push(road(`Quench the ${g.name} in blood`, `${smallWords(g, 0.05)} on it, free; next fight: ${twistText('cursed')}`, 0, { line: `The ${g.name} drinks, and hisses, and is keener. Everyone feels a little paler.`, temper: { gear: g.id, atk: 0.05 }, buff: { twist: 'cursed' } }), leave());
      return card('A crossroads forge', "A smith with burn-scarred arms works a forge where four roads meet. 'Bring me steel. I'll make it sing.'", options);
    }
    case 'crown': {
      const great = unowned(run, GREAT_RELIC_IDS);
      const id = great.length ? pick(rng, great) : unowned(run, RELIC_IDS)[0] ?? '';
      const left = MAX_RETRIES - (run.retries ?? 0);
      const fence = 30 + 5 * s;
      const wear: EventOption[] = !id
        ? []
        : left > 0
          ? [road('Wear the crown', `${theRelic(id)} (${relicText(id)}); the crown drinks one of your hearts`, 0, { line: `The crown bites. A heart goes out like a candle, and ${theRelic(id)} is yours.`, relic: id, heart: -1 })]
          : [road('Wear the crown', `${theRelic(id)} (${relicText(id)}); with no heart to drink, the next foes +30% hp and attack, and ${TWISTS.cursed.name}`, 0, { line: `The crown finds no heart to drink, and curses the road instead. ${TheRelic(id)} is yours.`, relic: id, buff: { foes: 1.3, twist: 'cursed' } })];
      return card('A crown in the reeds', 'It lies in black water, its gold gone green, and it is very cold. Something wants it worn. Something always does.', [
        ...wear,
        road('Sell it to a fence', `+${fence} gold, and somebody else's problem`, 0, { line: `The fence does not touch it with bare hands, but pays ${fence} gold.`, gold: fence }),
        leave('Let it sink', 'Move on.'),
      ]);
    }
    case 'refugees': {
      return card('A refugee caravan', 'Carts piled with bedding and grandmothers, fleeing the way you have come. They have heard of the Last Keep, and look at you as if you were it.', [
        road('Share your coin', 'they will not forget it (in two stops they send something back)', 25 + 3 * s, { line: 'A child gives you a wooden horse. The elders write your names down.', owe: owed('refugeesReturn', { big: true }) }),
        road('Walk with them a while', 'free, but the heroes are footsore: next fight they walk 15% slower; a small thanks later', 0, { line: 'You see them as far as the ford. Your boots are worse for it.', buff: { speed: 0.85 }, owe: owed('refugeesReturn', { big: false }) }),
        leave('Pass them by', 'Move on.'),
      ]);
    }
    case 'refugeesReturn': {
      const due = run.road?.owed?.find((o) => o.kind === 'refugeesReturn');
      const big = !!due?.big;
      const burned = (run.retries ?? 0) > 0;
      const ids = unowned(run, RELIC_IDS);
      const relic = ids.length ? pickRelic(() => rng.next(), ids) : '';
      const gold = 30 + 4 * s;
      const gift: RoadAct = big
        ? burned
          ? { line: 'Their healer has walked all night to find you. A burned heart kindles again.', heart: 1, gold }
          : relic
            ? { line: `They have found something in the ruins of their home: ${theRelic(relic)}.`, relic }
            : { line: `They have pooled what they could: ${gold * 2} gold.`, gold: gold * 2 }
        : { line: `A purse of ${gold} gold, and an old banner to march under.`, gold, buff: { twist: 'glory' } };
      const what = big ? (burned ? 'a burned heart restored' : relic ? `${theRelic(relic)} (${relicText(relic)})` : `${gold * 2} gold`) : `+${gold} gold, and next fight: ${twistText('glory')}`;
      return card('The refugees remember', "A rider in a patched cloak catches you up on the road. 'From the caravan,' she says. 'We said we would not forget.'", [
        road('Accept their thanks', what, 0, gift),
        leave('Tell them to keep it', 'Move on.'),
      ]);
    }
    case 'duel': {
      const best = [...fielded(run)].sort((a, b) => b.grade - a.grade || a.id - b.id)[0];
      const odds = best ? Math.min(0.8, 0.5 + 0.1 * (best.grade - 1)) : 0.5;
      const win = rng.chance(odds);
      const purse = 20 + 3 * s;
      const name = best ? nameOf(run, best.id) : 'hero';
      return card("A champion's challenge", "A champion of the foe rides out alone and plants a spear in the earth. 'Send me your best,' he roars, 'or crawl the rest of the way.'", [
        ...(best
          ? [road(`Send the ${name}`, `${pct(odds)} to win: +10% attack for good and +${purse} gold; a loss costs the hero 10% hp for good, and the foes are bolder (+10%)`, 0, win
              ? { line: `Steel rings, and the champion falls. The ${name} stands taller for it, and takes his purse (+${purse} gold).`, bump: { hero: best.id, hp: 0, atk: 0.1 }, gold: purse }
              : { line: `The ${name} is beaten down in the mud. The foe's ranks roar.`, bump: { hero: best.id, hp: -0.1, atk: 0 }, buff: { foes: 1.1 } })]
          : []),
        road('Refuse him', 'the foes jeer: next fight +10% hp and attack', 0, { line: 'The champion laughs and rides back. His men will be bolder for it.', buff: { foes: 1.1 } }),
        road('Pay him to go away', 'a purse for his pride', 20 + 3 * s, { line: 'He weighs the purse, shrugs, and goes.' }),
      ]);
    }
    case 'storm': {
      const st = stormOf(landOfRun(run));
      const loot = 30 + 4 * s;
      return card(st.name, st.text, [
        road('March into it', `next fight: ${twistText(st.twist)}; a wrecked wagon on the field pays +${loot} gold for the win`, 0, { line: 'Heads down, cloaks tight. The weather comes with you.', buff: { twist: st.twist, gold: loot } }),
        road('Shelter and wait it out', "a shepherd's barn, for a price: the next field is clear", 8 + s, { line: 'The storm passes over the barn. The shepherd counts his coin.' }),
      ]);
    }
    case 'stranger': {
      const named = fielded(run).filter((h) => HERO_NAMES[h.kind]);
      const who = named.length ? pick(rng, named) : fielded(run)[0];
      const kind = who?.kind ?? '';
      const nm = kind ? heroName(kind) : 'one of you';
      const heir = findSlotGear(run, gearId(run), 'charm', Math.min(MAX_TIER, marketTier(run, s) + 1), s, SOURCE.heir);
      heir.name = `${nm}'s Heirloom`;
      return card('A stranger who knows a name', `A hooded pilgrim steps from the trees and bows, not to the party, but to the ${UNITS[kind]?.name ?? 'hero'}. '${nm}. Your people still sing of you, far from here.'`, [
        road('Buy the heirloom she carries', `charm: ${gearText(heir)}`, 30 + 3 * s, { line: `She presses ${heir.name} into ${nm}'s hand and is gone.`, gear: heir }),
        ...(who ? [road('Ask for her blessing', `${nm}: +5% hp and +5% attack for good, free`, 0, { line: `She says a word in a tongue only ${nm} knows. ${nm} does not say what it was.`, bump: { hero: who.id, hp: 0.05, atk: 0.05 } })] : []),
        leave(),
      ]);
    }
    default: {
      // (the witch)
      const good = rng.chance(0.6);
      return card('A hedge witch', 'A crooked hut on a crooked stump. A woman with mud to the elbows stirs something in a pot, and it stirs back.', [
        road('Buy a hex on the foes', 'next fight: the foes -12% hp', 20 + 2 * s, { line: 'She spits into the pot and names the foe. Far ahead, someone shivers.', buff: { foes: 0.88 } }),
        road('Drink her brew', `a gamble: ${twistText('haste')}, and +10% attack... or ${TWISTS.cursed.name}`, 0, good
          ? { line: 'It tastes of lightning. Everyone is very awake.', buff: { twist: 'haste', atk: 1.1 } }
          : { line: 'It tastes of graves. Everyone feels it in the knees.', buff: { twist: 'cursed' } }),
        leave(),
      ]);
    }
  }
}

// ---- what an option does ----------------------------------------------------------------------------------------------

/** Find a piece of gear the run holds (in the pack or worn) and change it, or take it out (`to` null). */
function changeGear(run: Run, id: number, to: (g: Gear) => Gear | null): void {
  // (RUN-GEAR: a real-gear run's smiths work only on its finds, `applyRoad`)
  const i = run.items?.findIndex((g) => g.id === id) ?? -1;
  if (i >= 0) {
    const g = to(run.items![i]);
    if (g) run.items![i] = g;
    else run.items!.splice(i, 1);
    return;
  }
  for (const h of run.roster)
    for (const s of SLOTS)
      if (h.gear?.[s]?.id === id) {
        const g = to(h.gear[s]!);
        if (g) h.gear[s] = g;
        else delete h.gear[s];
        return;
      }
}

/** Lay a road act's boons over the next fight's buff: hp, attack, speed and the foes multiply; the twist and gold are its. */
function addBuff(run: Run, b: Buff): void {
  const was = run.buff ?? {};
  const mul = (x?: number, y?: number) => (x === undefined && y === undefined ? undefined : Number(((x ?? 1) * (y ?? 1)).toFixed(3)));
  run.buff = {
    ...was,
    ...(b.hp ? { hp: mul(was.hp, b.hp) } : {}),
    ...(b.atk ? { atk: mul(was.atk, b.atk) } : {}),
    ...(b.speed ? { speed: mul(was.speed, b.speed) } : {}),
    ...(b.foes ? { foes: mul(was.foes, b.foes) } : {}),
    ...(b.gold ? { gold: (was.gold ?? 0) + b.gold } : {}),
    ...(b.twist ? { twist: b.twist } : {}),
    ...(b.duration ? { duration: Math.max(was.duration ?? 1, b.duration) } : {}),
  };
}

/** Do what a road option says (its price is paid already, by `chooseOption`; `cost` is it, for a refund). Returns the card's line. */
export function applyRoad(run: Run, a: RoadAct, cost = 0): string {
  if (a.hire) {
    if (benchFull(run)) {
      run.gold += cost;
      return 'There is no room on the bench. The sellsword shrugs, keeps nothing, and walks on.';
    }
    recruit(run, a.hire, cost);
  }
  if (a.lose) run.gold = Math.max(0, run.gold - a.lose);
  if (a.relic) {
    if (!run.relics) run.relics = [];
    if (!run.relics.includes(a.relic)) run.relics.push(a.relic);
  }
  if (a.drop) run.relics = run.relics?.filter((id) => id !== a.drop);
  if (a.gear) stow(run, a.gear);
  let line = a.line;
  if (a.heart === -1) run.retries = Math.min(MAX_RETRIES, (run.retries ?? 0) + 1);
  if (a.heart === 1) {
    if ((run.retries ?? 0) > 0) run.retries = run.retries! - 1;
    else line = `${line} (No heart is burned, so they leave coin instead.)`;
  }
  // (a heart given back pays its coin only when there was no heart to give)
  if (a.gold && !(a.heart === 1 && line === a.line)) run.gold += a.gold;
  if (a.bump) {
    const h = run.roster.find((x) => x.id === a.bump!.hero);
    if (h) h.bump = { hp: Math.max(-0.5, (h.bump?.hp ?? 0) + a.bump.hp), atk: (h.bump?.atk ?? 0) + a.bump.atk };
  }
  if (a.temper && isReal(run)) upgradeFound(run, a.temper.gear, a.temper.up ? UPGRADE_LEVELS : SMALL_UPGRADE);
  else if (a.temper) {
    const t = a.temper;
    changeGear(run, t.gear, (g) => (t.up && g.tier < MAX_TIER ? makeGear(g.id, g.slot, g.tier + 1) : { ...g, atk: Number((g.atk + (t.atk ?? 0)).toFixed(2)) }));
  }
  if (a.lost !== undefined) {
    if (isReal(run)) loseFound(run, a.lost);
    else changeGear(run, a.lost, () => null);
  }
  if (a.buff) addBuff(run, a.buff);
  if (a.owe) (run.road ??= {}).owed = [...(run.road?.owed ?? []), a.owe];
  return line;
}
