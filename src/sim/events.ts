// Events: a choice card after some won stages (every second one that is not a boss stage), Slay the Spire style. An
// event is one of five kinds, each with two or three options; everything it can give is drawn when the card is made,
// from a side stream of the run's seed (`mixSeed(seed, 0xe7e47, stage)`), so a saved card replays the same.
//
//   shrine    free: +30% hp or +15% attack for the next fight
//   merchant  gold for a relic or a piece of gear
//   chest     a mystery: a relic, gear or gold
//   cursed    the next fight's foes are 30% tougher, the reward better
//   training  gold for a lasting stat bump to one hero
//
// The endless tower's mystery floors draw from three more (`TOWER_EVENT_KINDS`), which are about the party's health:
//
//   spring    free: the party drinks and is healed
//   gambler   stake gold on a coin flip (the flip is drawn with the card)
//   altar     pay a share of every hero's hp for a relic
//
// and eleven more with real risks (`mystery.ts`; `MYSTERY_KINDS`): a black altar, a gambling imp, a prisoner, a fountain, a
// forge, a trainer, a blood-and-iron shrine, a mimic chest, a black book, a knight's cairn and bandits.
//
// In an army run or the daily the gaps also bring the road's cards and the passing cart's market (MID-EVENTS: `midEvents.ts`, `market.ts`).
//
// Pure rules: no Pixi, no DOM. It changes a Run only through `chooseOption` and `leaveEvent`; the values it takes from run.ts (which calls
// `drawEvent`) are used only inside its functions, never as the modules load.

import { mixSeed, Rng } from './rng';
import { dropGear, gearText, type Gear } from './gear';
import { RELIC_IDS, RELICS } from './relics';
import { healParty, hurtParty } from './health';
import { UNITS } from './units';
import { applyMystery, drawMystery, type MysteryAct } from './mystery';
import { applyRoad, drawRoad, faceOf, noteRoad, pickRoadKind, roadRun, type RoadAct, type RoadKind } from './midEvents';
import { isWare, MARKET_BUYS, marketOptions, stockMarket } from './market';
import { recruit, benchFull, type Run } from './run';
import { guestBlock, takeGuest } from './guest';
import { heroName } from './heroNames';

export type EventKind =
  | 'shrine'
  | 'merchant'
  | 'chest'
  | 'cursed'
  | 'training'
  | 'spring'
  | 'gambler'
  | 'altar'
  | 'blackAltar'
  | 'imp'
  | 'prisoner'
  | 'fountain'
  | 'forge'
  | 'trainer'
  | 'oath'
  | 'mimic'
  | 'tome'
  | 'cairn'
  | 'bandits'
  | 'bard'
  | 'goblinForge'
  | 'cursedMirror'
  | 'voidWell'
  // (the road's, in army and daily runs: `midEvents.ts`)
  | RoadKind;
export const EVENT_KINDS: readonly EventKind[] = ['shrine', 'merchant', 'chest', 'cursed', 'training'];
/** The tower and calamity mystery floors with narrative dilemmas and real choices (`mystery.ts`). */
export const MYSTERY_KINDS: readonly EventKind[] = [
  'blackAltar',
  'imp',
  'prisoner',
  'fountain',
  'forge',
  'trainer',
  'oath',
  'mimic',
  'tome',
  'cairn',
  'bandits',
  'bard',
  'goblinForge',
  'cursedMirror',
  'voidWell',
];
/** What a mystery floor of the tower can be: the usual five, the three about health, and the mysteries. */
export const TOWER_EVENT_KINDS: readonly EventKind[] = [...EVENT_KINDS, 'spring', 'gambler', 'altar', ...MYSTERY_KINDS];
/** The four creative encounters (the bard, the goblin forge, the cursed mirror, the void well). */
export const CREATIVE_KINDS: readonly EventKind[] = ['bard', 'goblinForge', 'cursedMirror', 'voidWell'];
/** The plainer floors a creative encounter may stand in for: the usual five and the three about health. */
const PLAIN_KINDS: readonly EventKind[] = [...EVENT_KINDS, 'spring', 'gambler', 'altar'];
/** The share of those plainer floors a creative encounter takes (about one mystery floor in six in all, as an even share of the pool would be). */
export const CREATIVE_SHARE = 0.4;

/** The kind of a stage's card. The older kinds are drawn just as they were (the creative encounters left out of the pick), so the XP and heroes the
 *  older mysteries give come up as often as ever; then a creative encounter, on its own side stream, may take the place of a plainer floor. */
function kindOf(run: Run, stage: number, kinds: readonly EventKind[], rng: Rng): EventKind {
  const older = kinds.filter((k) => !CREATIVE_KINDS.includes(k));
  if (!older.length) return pick(rng, kinds);
  const kind = pick(rng, older);
  const creative = kinds.filter((k) => CREATIVE_KINDS.includes(k));
  if (!creative.length || !PLAIN_KINDS.includes(kind)) return kind;
  const side = new Rng(mixSeed(run.seed, 0xc4ea7, stage));
  return side.chance(CREATIVE_SHARE) ? pick(side, creative) : kind;
}

/** What taking an option does. */
export type Effect =
  | { t: 'leave' }
  | { t: 'buff'; hp?: number; atk?: number; speed?: number }
  | { t: 'relic'; id: string }
  | { t: 'gear'; gear: Gear }
  | { t: 'gold'; n: number }
  | { t: 'curse'; foes: number; gold: number; gear: Gear }
  | { t: 'train'; hero: number; hp?: number; atk?: number }
  | { t: 'heal'; frac: number }
  | { t: 'gamble'; win: boolean; n: number }
  | { t: 'altar'; frac: number; id: string }
  | { t: 'mystery'; act: MysteryAct }
  // (the passing cart's sellsword and rummage, and the road's events: MID-EVENTS)
  | { t: 'hire'; kind: string }
  | { t: 'reroll' }
  | { t: 'road'; act: RoadAct }
  // (the passing cart's guest hero, for this run only: GUEST-HERO, `guest.ts`)
  | { t: 'guest'; kind: string };

export interface EventOption {
  label: string;
  text: string;
  /** Gold it costs (0 = free). */
  cost: number;
  effect: Effect;
  /** Bought already (a merchant's stall stays open). */
  done?: boolean;
}

export interface EventCard {
  kind: EventKind;
  stage: number;
  title: string;
  text: string;
  options: EventOption[];
  /** A market's buys left this visit (`MARKET_BUYS`); a card from an older save has none, and no limit. */
  buys?: number;
}

export const SHRINE_HP = 0.3;
export const SHRINE_ATK = 0.15;
export const CURSE_FOES = 0.3;
export const TRAIN_HP = 0.2;
export const TRAIN_ATK = 0.12;
export const SPRING_HEAL = 0.4;
export const ALTAR_COST = 0.25;

/** Whether a won stage is followed by an event: every second stage, boss stages excepted. */
export const eventAfter = (stage: number, boss: boolean) => !boss && stage % 2 === 0;

const gearId = (run: Run) => (run.nextGear = (run.nextGear ?? 1) + 1) - 1;
const unownedRelics = (run: Run) => RELIC_IDS.filter((id) => !run.relics?.includes(id));
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[rng.int(0, xs.length - 1)];
const leave = (): EventOption => ({ label: 'Leave', text: 'Move on.', cost: 0, effect: { t: 'leave' } });
const relicOption = (id: string, cost: number): EventOption => ({ label: RELICS[id].name, text: RELICS[id].text, cost, effect: { t: 'relic', id } });
const gearOption = (g: Gear, cost: number): EventOption => ({ label: g.name, text: `${g.slot}: ${gearText(g)}`, cost, effect: { t: 'gear', gear: g } });

/** The event card of a stage, made from the run's seed (it draws gear ids from the run); `kinds` is what it may be. */
export function drawEvent(run: Run, stage: number, kinds: readonly EventKind[] = EVENT_KINDS): EventCard {
  const rng = new Rng(mixSeed(run.seed, 0xe7e47, stage));
  // (an army's or the daily's gaps draw from the road's kinds too, on their own stream, and never the same kind twice: MID-EVENTS)
  if (roadRun(run) && kinds === EVENT_KINDS) {
    // (the old draw first, from the card's stream as ever, so a shrine or a chest falls where it always did)
    const card = drawRoadCard(run, stage, pickRoadKind(run, stage, pick(rng, EVENT_KINDS)), rng);
    noteRoad(run, card);
    return card;
  }
  const kind = kindOf(run, stage, kinds, rng);
  if (MYSTERY_KINDS.includes(kind)) return drawMystery(run, stage, kind, rng);
  return drawPlain(run, stage, kind, rng);
}

/** A road run's card: the passing cart is a market, a road kind is `midEvents.ts`'s, the other old kinds are drawn as ever. */
function drawRoadCard(run: Run, stage: number, kind: EventKind, rng: Rng): EventCard {
  if (kind === 'merchant')
    return {
      kind, stage, title: 'A passing cart', text: 'A cart creaks out of the mist, hung with lanterns, pots and somebody\'s armour. The pedlar swears everything is a bargain. He swears it to the goat, too.',
      options: marketOptions(run, stage), buys: MARKET_BUYS,
    };
  if (!(EVENT_KINDS as readonly string[]).includes(kind)) return drawRoad(run, stage, kind as RoadKind, rng);
  return faceOf(run, drawPlain(run, stage, kind, rng));
}

/** The card of one of the older kinds. */
function drawPlain(run: Run, stage: number, kind: EventKind, rng: Rng): EventCard {
  const relics = unownedRelics(run);
  switch (kind) {
    case 'shrine':
      return {
        kind, stage, title: 'A quiet shrine', text: 'Incense curls over the stones. The heroes kneel for a moment. A goat eats some of the incense.',
        options: [
          { label: 'Pray for health', text: `+${SHRINE_HP * 100}% hp in the next fight`, cost: 0, effect: { t: 'buff', hp: 1 + SHRINE_HP } },
          { label: 'Pray for fury', text: `+${SHRINE_ATK * 100}% attack in the next fight`, cost: 0, effect: { t: 'buff', atk: 1 + SHRINE_ATK } },
          leave(),
        ],
      };
    case 'merchant': {
      const second = relics.length ? pick(rng, relics) : '';
      const g = dropGear(rng, gearId(run), stage);
      return {
        kind, stage, title: 'A travelling merchant', text: 'A cart creaks out of the mist, hung with trinkets. The merchant says everything is a bargain. He says it to the goat, too.',
        options: [
          second ? relicOption(second, 70 + 4 * stage) : { label: 'A sack of coin', text: 'Nothing else to sell.', cost: 0, effect: { t: 'gold', n: 20 } },
          gearOption(g, 28 * g.tier + 2 * stage),
          leave(),
        ],
      };
    }
    case 'chest': {
      const roll = rng.int(0, 2);
      const id = relics.length ? pick(rng, relics) : '';
      const effect: Effect = roll === 0 && id ? { t: 'relic', id } : roll === 1 ? { t: 'gear', gear: dropGear(rng, gearId(run), stage) } : { t: 'gold', n: 50 + 8 * stage };
      return {
        kind, stage, title: 'A mystery chest', text: 'It sits in the road, locked by nothing but luck. Someone has already licked it.',
        options: [{ label: 'Open it', text: 'A relic, gear or gold.', cost: 0, effect }, leave()],
      };
    }
    case 'cursed': {
      const gear = dropGear(rng, gearId(run), stage, 1);
      const gold = 40 + 8 * stage;
      return {
        kind, stage, title: 'A cursed path', text: 'The way ahead is dark. Whatever waits there guards something good, and is probably short of staff.',
        options: [
          { label: 'Take the path', text: `foes +${CURSE_FOES * 100}% hp and attack next fight; win for +${gold} gold and a ${gear.name}`, cost: 0, effect: { t: 'curse', foes: 1 + CURSE_FOES, gold, gear } },
          { label: 'Turn back', text: 'Take the safe road.', cost: 0, effect: { t: 'leave' } },
        ],
      };
    }
    case 'spring':
      return {
        kind, stage, title: 'A healing spring', text: 'Clear water wells up between mossy stones. The heroes rest beside it. Duchess drinks first, as is her right.',
        options: [{ label: 'Drink deep', text: `heals every hero ${SPRING_HEAL * 100}% of its hp`, cost: 0, effect: { t: 'heal', frac: SPRING_HEAL } }, leave()],
      };
    case 'gambler': {
      const stake = 30 + 2 * stage;
      const win = rng.chance(0.5);
      return {
        kind, stage, title: 'A dicing goblin', text: 'A goblin rattles a cup of bones. "Double or nothing, heroes?" He is not allowed to say "nothing" quite so cheerfully.',
        options: [{ label: 'Roll the bones', text: `stake ${stake} gold: a coin flip for ${stake * 2 + 10} gold`, cost: stake, effect: { t: 'gamble', win, n: stake * 2 + 10 } }, leave()],
      };
    }
    case 'altar': {
      const id = relics.length ? pick(rng, relics) : '';
      return {
        kind, stage, title: 'A blood altar', text: 'A cracked altar hums. It wants something of the heroes, and offers something back. Please read the small print on the side.',
        options: [id ? { label: `Give blood for the ${RELICS[id].name}`, text: `every hero loses ${ALTAR_COST * 100}% of its hp; ${RELICS[id].text}`, cost: 0, effect: { t: 'altar', frac: ALTAR_COST, id } } : { label: 'A sack of coin', text: 'The altar has nothing else to give.', cost: 0, effect: { t: 'gold', n: 25 } }, leave()],
      };
    }
    default: {
      const price = 40 + 5 * stage;
      const ids = run.roster.map((h) => h.id);
      const a = pick(rng, ids);
      const b = ids.length > 1 ? pick(rng, ids.filter((x) => x !== a)) : a;
      const name = (id: number) => UNITS[run.roster.find((h) => h.id === id)?.kind ?? '']?.name ?? '';
      return {
        kind, stage, title: 'A training ground', text: 'A weathered master offers lessons, for a fee. The fee is not in the lessons.',
        options: [
          { label: `Drill the ${name(a)}`, text: `+${TRAIN_ATK * 100}% attack for good`, cost: price, effect: { t: 'train', hero: a, atk: TRAIN_ATK } },
          { label: `Toughen the ${name(b)}`, text: `+${TRAIN_HP * 100}% hp for good`, cost: price, effect: { t: 'train', hero: b, hp: TRAIN_HP } },
          leave(),
        ],
      };
    }
  }
}

/** Take option `i` of the run's event. Returns a line saying what happened, or null when it can't be taken (no event, a spent or
 * too dear option). A merchant's card stays open after a purchase; every other choice, and leaving, closes it. */
export function chooseOption(run: Run, i: number): string | null {
  const ev = run.event;
  const o = ev?.options[i];
  if (!ev || !o || o.done || run.gold < o.cost) return null;
  // (a market's buys run out; the rummage and the way on do not count)
  if (ev.buys !== undefined && isWare(o) && ev.buys <= 0) return null;
  const fx = o.effect;
  let line = 'You move on.';
  run.gold -= o.cost;
  switch (fx.t) {
    case 'buff':
      run.buff = { ...run.buff, hp: fx.hp ?? run.buff?.hp, atk: fx.atk ?? run.buff?.atk, ...(fx.speed ? { speed: fx.speed } : {}) };
      line = `${o.label}: ${o.text}.`;
      break;
    case 'relic':
      if (!run.relics) run.relics = [];
      if (!run.relics.includes(fx.id)) run.relics.push(fx.id);
      run.tower?.recap?.relics.push(fx.id);
      line = `Found the ${RELICS[fx.id].name}: ${RELICS[fx.id].text}.`;
      break;
    case 'gear':
      (run.items ??= []).push(fx.gear);
      run.tower?.recap?.gear.push(fx.gear.name);
      line = `Got the ${fx.gear.name} (${fx.gear.slot}, ${gearText(fx.gear)}).`;
      break;
    case 'gold':
      run.gold += fx.n;
      if (run.tower?.recap) run.tower.recap.gold += fx.n;
      line = `Found ${fx.n} gold.`;
      break;
    case 'curse':
      run.buff = { ...run.buff, foes: fx.foes, gold: fx.gold, gear: fx.gear };
      line = 'The foes ahead are stronger, and guard a prize.';
      break;
    case 'train': {
      const h = run.roster.find((x) => x.id === fx.hero);
      if (h) h.bump = { hp: (h.bump?.hp ?? 0) + (fx.hp ?? 0), atk: (h.bump?.atk ?? 0) + (fx.atk ?? 0) };
      line = `Trained: ${o.text}.`;
      break;
    }
    case 'heal':
      healParty(run, fx.frac);
      line = `The party is healed ${Math.round(fx.frac * 100)}%.`;
      break;
    case 'gamble':
      if (fx.win) {
        run.gold += fx.n;
        if (run.tower?.recap) run.tower.recap.gold += fx.n;
        line = `The bones fall your way: +${fx.n} gold.`;
      } else line = 'The bones fall against you. The goblin grins and the coin is gone.';
      break;
    case 'altar':
      hurtParty(run, fx.frac);
      if (!run.relics) run.relics = [];
      if (!run.relics.includes(fx.id)) run.relics.push(fx.id);
      run.tower?.recap?.relics.push(fx.id);
      line = `The altar drinks deep and gives the ${RELICS[fx.id].name}.`;
      break;
    case 'mystery':
      line = applyMystery(run, fx.act);
      break;
    case 'hire':
      if (benchFull(run)) {
        run.gold += o.cost;
        return 'The bench is full: merge or recycle a hero first, and the sellsword will wait.';
      }
      recruit(run, fx.kind, o.cost);
      line = `The ${UNITS[fx.kind]?.name ?? 'sellsword'} climbs down off the cart and joins the bench.`;
      break;
    case 'guest':
      if (guestBlock(run) || !takeGuest(run, fx.kind, o.cost)) {
        run.gold += o.cost;
        return 'The party has a guest already: one at a time.';
      }
      line = `${heroName(fx.kind)} climbs down off the cart and joins you as a guest: a sixth hero on the field, for this run only.`;
      break;
    case 'reroll': {
      // (the unsold wares go back under the cloth and others come out; what was bought stays sold)
      const fresh = stockMarket(run, ev.stage, 1);
      let k = 0;
      // (a guest on offer stays where it is: it is not the cart's stock, GUEST-HERO)
      ev.options = ev.options.map((x) => (isWare(x) && !x.done && x.effect.t !== 'guest' && k < fresh.length ? fresh[k++] : x));
      for (; k < fresh.length; k++) ev.options.splice(ev.options.length - 2, 0, fresh[k]);
      line = 'The pedlar grumbles, and drags out another crate.';
      break;
    }
    case 'road':
      line = applyRoad(run, fx.act, o.cost);
      break;
    case 'leave':
      break;
  }
  // (a merchant's stall stays open until the player leaves)
  if (ev.kind === 'merchant' && fx.t !== 'leave') {
    o.done = true;
    if (ev.buys !== undefined && isWare(o)) ev.buys--;
  }
  else run.event = undefined;
  return line;
}

/** Close the event without taking anything. */
export const leaveEvent = (run: Run) => void (run.event = undefined);

