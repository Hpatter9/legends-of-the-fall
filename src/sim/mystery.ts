// The tower's mystery floors, the new ones: eleven events (`MYSTERY_KINDS`, in events.ts), each with two or three options that trade a
// risk for a reward. Like events.ts, everything an event can do is drawn when its card is made, from the same side stream
// of the run's seed (`mixSeed(seed, 0xe7e47, floor)`), so a saved card replays the same and every outcome is settled
// before the player picks: the dice are already rolled, only the choice is open. `drawMystery` makes the card;
// `applyMystery` is what taking an option does (events.ts's `chooseOption` calls it).
//
//   blackAltar  lose a hero, gain a legendary relic
//   imp         stake gold on a flip, about double or nothing
//   prisoner    free him (a hero joins, the guards hurt the party) or rob him
//   fountain    drink for a party heal, or poison one hero (rolled)
//   forge       reforge a piece of gear a tier up, or melt it for gold
//   trainer     gold for XP on one hero kind
//   oath        trade a hero's (or everyone's) max hp for attack, for good
//   mimic       a chest that bites: a fight with a great chest to win
//   tome        read a black book for lasting attack, or be cursed by it
//   cairn       take a dead knight's gear and a tougher next fight, or pay respects
//   bandits     pay the toll, brawl for loot, or sneak past
//
// Pure rules: no Pixi, no DOM.

import type { Rng } from './rng';
import { dropGear, gearText, makeGear, MAX_TIER, SLOTS, type Gear } from './gear';
import { GREAT_RELIC_IDS, RELIC_IDS, RELICS } from './relics';
import { hpShare, healParty, hurtParty } from './health';
import { HEROES, UNITS } from './units';
import { recruit, SQUAD, type Run } from './run';
import type { EventCard, EventKind, EventOption } from './events';

/** What taking one of these options does. */
export type MysteryAct =
  | { k: 'sacrifice'; hero: number; relic: string }
  | { k: 'bet'; win: boolean; n: number }
  | { k: 'free'; kind: string; hurt: number }
  | { k: 'rob'; n: number }
  | { k: 'drink'; pure: boolean; frac: number; hero: number; wound: number }
  | { k: 'flask'; frac: number }
  | { k: 'forge'; gear: number; melt: boolean; n: number }
  | { k: 'newGear'; gear: Gear }
  | { k: 'lesson'; kind: string; xp: number }
  | { k: 'oath'; hero: number; hp: number; atk: number }
  | { k: 'mimic' }
  | { k: 'prod'; real: boolean; gold: number; gear: Gear; bite: number }
  | { k: 'tome'; good: boolean; atk: number; hurt: number }
  | { k: 'gold'; n: number }
  | { k: 'cairn'; gear: Gear; foes: number }
  | { k: 'respects'; frac: number }
  | { k: 'toll' }
  | { k: 'brawl'; hurt: number; n: number }
  | { k: 'sneak'; ok: boolean; lose: number };

export const FREE_HURT = 0.15;
export const FOUNTAIN_HEAL = 0.5;
export const FOUNTAIN_FLASK = 0.15;
export const FOUNTAIN_POISON = 0.35;
export const OATH_HP = 0.2;
export const OATH_ATK = 0.25;
export const OATH_PARTY_HP = 0.08;
export const OATH_PARTY_ATK = 0.1;
export const TOME_ATK = 0.06;
export const TOME_HURT = 0.2;
export const IMP_ODDS = 0.46;
export const IMP_PAYOUT = 2.2;
export const MIMIC_BITE = 0.2;
export const CAIRN_FOES = 1.25;
export const BRAWL_HURT = 0.2;
/** The most a hero's hp can be bumped down by oaths. */
const BUMP_FLOOR = -0.5;

const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[rng.int(0, xs.length - 1)];
const gearId = (run: Run) => (run.nextGear = (run.nextGear ?? 1) + 1) - 1;
const nameOf = (run: Run, id: number): string => UNITS[run.roster.find((h) => h.id === id)?.kind ?? '']?.name ?? 'hero';
const act = (label: string, text: string, cost: number, a: MysteryAct): EventOption => ({ label, text, cost, effect: { t: 'mystery', act: a } });
const leave = (): EventOption => ({ label: 'Leave', text: 'Move on.', cost: 0, effect: { t: 'leave' } });
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Every piece of gear the run holds, the pack's first and then what the heroes wear. */
const allGear = (run: Run): Gear[] => [...(run.items ?? []), ...run.roster.flatMap((h) => SLOTS.flatMap((s) => (h.gear?.[s] ? [h.gear[s]!] : [])))];

/** The relic the altar gives: a legendary one not yet held, else an ordinary one, else none. */
function greatRelic(run: Run, rng: Rng): string {
  const held = run.relics ?? [];
  const great = GREAT_RELIC_IDS.filter((id) => !held.includes(id));
  if (great.length) return pick(rng, great);
  const plain = RELIC_IDS.filter((id) => !held.includes(id));
  return plain.length ? pick(rng, plain) : '';
}

/** The event card of a mystery floor of `kind`, from the card's stream. */
export function drawMystery(run: Run, stage: number, kind: EventKind, rng: Rng): EventCard {
  const card = (title: string, text: string, options: EventOption[]): EventCard => ({ kind, stage, title, text, options });
  const ids = run.roster.map((h) => h.id);
  switch (kind) {
    case 'blackAltar': {
      const relic = greatRelic(run, rng);
      const hero = pick(rng, ids);
      const gift = relic ? `the ${RELICS[relic].name} (${RELICS[relic].text})` : '';
      return card('A black altar', 'A slab of black glass drinks the torchlight. Something under it is hungry, and generous.', [
        relic && ids.length > 1
          ? act(`Offer the ${nameOf(run, hero)}`, `the hero is lost for good; you gain ${gift}`, 0, { k: 'sacrifice', hero, relic })
          : act('Leave an offering', 'The altar has no use for gold, but takes it: +20 gold back from the dust.', 0, { k: 'gold', n: 20 }),
        leave(),
      ]);
    }
    case 'imp': {
      const small = 25 + 2 * stage;
      const big = 60 + 5 * stage;
      const flip = (stake: number): MysteryAct => ({ k: 'bet', win: rng.chance(IMP_ODDS), n: Math.round(stake * IMP_PAYOUT) });
      const a = flip(small);
      const b = flip(big);
      return card('A gambling imp', 'A little red imp sits on a barrel with a pair of loaded-looking dice. "Double or nothing, heroes? Mostly double."', [
        act('A small wager', `stake ${small} gold: win ${Math.round(small * IMP_PAYOUT)} back, or lose it`, small, a),
        act('A big wager', `stake ${big} gold: win ${Math.round(big * IMP_PAYOUT)} back, or lose it`, big, b),
        leave(),
      ]);
    }
    case 'prisoner': {
      const pool = run.pool?.length ? run.pool : HEROES;
      const who = pick(rng, pool);
      const gold = 45 + 7 * stage;
      return card('A prisoner in irons', `A ${UNITS[who].name} hangs in a rusty cage, guards dozing nearby. "Let me out and I'm yours. Or take my purse and go."`, [
        act('Free the prisoner', `a ${UNITS[who].name} joins you, free; the guards wake and every hero loses ${pct(FREE_HURT)} hp`, 0, { k: 'free', kind: who, hurt: FREE_HURT }),
        act('Rob the prisoner', `+${gold} gold, and the cage stays shut`, 0, { k: 'rob', n: gold }),
        leave(),
      ]);
    }
    case 'fountain': {
      const pure = rng.chance(0.6);
      const hero = pick(rng, ids);
      return card('A glittering fountain', 'The water is too clear, and glows a little. A frog watches you from the rim and says nothing.', [
        act('Drink deeply', `heals every hero ${pct(FOUNTAIN_HEAL)}... if the water is clean. If not, one hero is poisoned for ${pct(FOUNTAIN_POISON)} of its hp`, 0, { k: 'drink', pure, frac: FOUNTAIN_HEAL, hero, wound: FOUNTAIN_POISON }),
        act('Fill a flask', `safe, but only heals every hero ${pct(FOUNTAIN_FLASK)}`, 0, { k: 'flask', frac: FOUNTAIN_FLASK }),
        leave(),
      ]);
    }
    case 'forge': {
      const gear = allGear(run);
      const ups = gear.filter((g) => g.tier < MAX_TIER);
      const g = ups.length ? pick(rng, ups) : gear.length ? pick(rng, gear) : undefined;
      if (!g) {
        const fresh = dropGear(rng, gearId(run), stage);
        return card('An abandoned forge', 'The coals are still warm. You have nothing to work, but there is iron on the anvil.', [act(`Hammer out a ${fresh.name}`, `${fresh.slot}: ${gearText(fresh)}`, 20 + 2 * stage, { k: 'newGear', gear: fresh }), leave()]);
      }
      const melt = 15 * g.tier + stage;
      const options: EventOption[] = [];
      if (g.tier < MAX_TIER) {
        const up = makeGear(g.id, g.slot, g.tier + 1);
        options.push(act(`Reforge the ${g.name}`, `it becomes a ${up.name} (${gearText(up)})`, 22 * (g.tier + 1) + 2 * stage, { k: 'forge', gear: g.id, melt: false, n: 0 }));
      }
      options.push(act(`Melt the ${g.name}`, `+${melt} gold, and the ${g.slot} is gone for good`, 0, { k: 'forge', gear: g.id, melt: true, n: melt }), leave());
      return card('An abandoned forge', 'The coals are still warm and the anvil is waiting. Somebody left their tongs.', options);
    }
    case 'trainer': {
      const kinds = [...new Set(run.roster.map((h) => h.kind))];
      const a = pick(rng, kinds);
      const rest = kinds.filter((k) => k !== a);
      const b = rest.length ? pick(rng, rest) : a;
      const price = 30 + 3 * stage;
      const xp = 80 + 15 * stage;
      return card('A wandering trainer', 'A scarred old soldier leans on a practice dummy. "Coin for the lesson. The lesson stays."', [
        act(`Teach the ${UNITS[a].name}`, `+${xp} XP for every ${UNITS[a].name}, kept for good`, price, { k: 'lesson', kind: a, xp }),
        ...(b !== a ? [act(`Teach the ${UNITS[b].name}`, `+${xp} XP for every ${UNITS[b].name}, kept for good`, price, { k: 'lesson', kind: b, xp })] : []),
        leave(),
      ]);
    }
    case 'oath': {
      const hero = pick(rng, ids);
      return card('A shrine of blood and iron', 'A rusted blade stands in the stone. "Give up some of your flesh," a voice says, "and I will give you edge."', [
        act(`Swear it for the ${nameOf(run, hero)}`, `that hero: -${pct(OATH_HP)} hp, +${pct(OATH_ATK)} attack, for good`, 0, { k: 'oath', hero, hp: OATH_HP, atk: OATH_ATK }),
        act('Swear it for everyone', `every hero: -${pct(OATH_PARTY_HP)} hp, +${pct(OATH_PARTY_ATK)} attack, for good`, 0, { k: 'oath', hero: 0, hp: OATH_PARTY_HP, atk: OATH_PARTY_ATK }),
        leave(),
      ]);
    }
    case 'mimic': {
      const gear = dropGear(rng, gearId(run), stage, 1);
      const gold = 30 + 6 * stage;
      const real = rng.chance(0.4);
      return card('A suspicious chest', 'It sits in the middle of the road, much too neatly. It might be breathing.', [
        act('Open it', 'a mimic! A hard fight, but its chest holds gold, a relic and a good piece of gear', 0, { k: 'mimic' }),
        act('Prod it with a spear', `a gamble: it might be a plain chest (${gold} gold and a ${gear.name}), or it bites and every hero loses ${pct(MIMIC_BITE)} hp`, 0, { k: 'prod', real, gold, gear, bite: MIMIC_BITE }),
        leave(),
      ]);
    }
    case 'tome': {
      const good = rng.chance(0.55);
      return card('A ruined library', 'Most of the shelves have fallen. One black book lies open on a lectern, and the ink is still wet.', [
        act('Read the black book', `a gamble: all heroes gain +${pct(TOME_ATK)} attack for good... or the book bites back, and every hero loses ${pct(TOME_HURT)} hp`, 0, { k: 'tome', good, atk: TOME_ATK, hurt: TOME_HURT }),
        act('Search the shelves', `safe: +${30 + 5 * stage} gold in loose coin`, 0, { k: 'gold', n: 30 + 5 * stage }),
        leave(),
      ]);
    }
    case 'cairn': {
      const gear = dropGear(rng, gearId(run), stage, 1);
      return card("A fallen knight's cairn", 'A heap of stones, a rusted helm, and a good sword that somebody was buried with. The wind sounds like a warning.', [
        act(`Take the ${gear.name}`, `${gear.slot}: ${gearText(gear)}; the next fight's foes have +${pct(CAIRN_FOES - 1)} hp and attack`, 0, { k: 'cairn', gear, foes: CAIRN_FOES }),
        act('Pay your respects', `the dead knight's blessing heals every hero ${pct(0.25)}`, 0, { k: 'respects', frac: 0.25 }),
        leave(),
      ]);
    }
    default: {
      const toll = 35 + 3 * stage;
      const loot = 25 + 4 * stage;
      const lose = 45 + 4 * stage;
      const ok = rng.chance(0.5);
      return card('Bandits on the road', 'Three bandits and a rope across the path. "A toll for the road, heroes. Or a fight, if you like."', [
        act('Pay the toll', 'they let you by, a little poorer', toll, { k: 'toll' }),
        act('Fight them off', `every hero loses ${pct(BRAWL_HURT)} hp, and their strongbox is yours: +${loot} gold`, 0, { k: 'brawl', hurt: BRAWL_HURT, n: loot }),
        act('Slip past in the dark', `a gamble: you get through free, or they catch you and take ${lose} gold`, 0, { k: 'sneak', ok, lose }),
        leave(),
      ]);
    }
  }
}

/** Take a hero out of the run for good: its gear goes back to the pack, the squad is topped up from the bench if it would run empty. */
function loseHero(run: Run, id: number): void {
  const h = run.roster.find((x) => x.id === id);
  if (!h) return;
  for (const s of SLOTS) if (h.gear?.[s]) (run.items ??= []).push(h.gear[s]!);
  run.roster = run.roster.filter((x) => x.id !== id);
  run.squad = run.squad.filter((x) => x !== id);
  if (run.tower) delete run.tower.hp[String(id)];
  if (!run.squad.length && run.roster.length) run.squad.push(run.roster[0].id);
}

const takeRelic = (run: Run, id: string): void => {
  if (!id) return;
  if (!run.relics) run.relics = [];
  if (!run.relics.includes(id)) run.relics.push(id);
};

/** Change a bump of a hero (hp can't fall below a floor). */
function bump(run: Run, id: number, hp: number, atk: number): void {
  const h = run.roster.find((x) => x.id === id);
  if (h) h.bump = { hp: Math.max(BUMP_FLOOR, (h.bump?.hp ?? 0) + hp), atk: (h.bump?.atk ?? 0) + atk };
}

/** Find a piece of gear the run holds (in the pack or on a hero) and swap it for another, or take it out (null). */
function swapGear(run: Run, id: number, to: Gear | null): boolean {
  const i = run.items?.findIndex((g) => g.id === id) ?? -1;
  if (i >= 0) {
    if (to) run.items![i] = to;
    else run.items!.splice(i, 1);
    return true;
  }
  for (const h of run.roster)
    for (const s of SLOTS)
      if (h.gear?.[s]?.id === id) {
        if (to) h.gear[s] = to;
        else delete h.gear[s];
        return true;
      }
  return false;
}

/** Do what an option says. Returns the line the card shows. */
export function applyMystery(run: Run, a: MysteryAct): string {
  switch (a.k) {
    case 'sacrifice': {
      const name = nameOf(run, a.hero);
      loseHero(run, a.hero);
      takeRelic(run, a.relic);
      return `The ${name} steps onto the altar and is gone. The ${RELICS[a.relic].name} is yours: ${RELICS[a.relic].text}.`;
    }
    case 'bet':
      if (a.win) {
        run.gold += a.n;
        return `The dice fall your way: +${a.n} gold. The imp spits, and vanishes in a huff.`;
      }
      return 'Snake eyes. The imp pockets your stake and grins from ear to ear.';
    case 'free': {
      const got = recruit(run, a.kind, 0);
      if (run.squad.length < SQUAD && !run.squad.includes(got.id)) run.squad.push(got.id);
      hurtParty(run, a.hurt);
      return `The ${UNITS[a.kind].name} is free and joins the party. The guards wake and give chase, and the party is hurt.`;
    }
    case 'rob':
      run.gold += a.n;
      return `You take the purse: +${a.n} gold. The prisoner curses you all the way down the road.`;
    case 'drink':
      if (a.pure) {
        healParty(run, a.frac);
        return `The water is sweet and clean. The party is healed ${pct(a.frac)}.`;
      }
      if (run.tower) run.tower.hp[String(a.hero)] = Math.max(0.05, hpShare(run, a.hero) - a.wound);
      return `The water is foul. The ${nameOf(run, a.hero)} doubles over, poisoned.`;
    case 'flask':
      healParty(run, a.frac);
      return `A few careful sips: the party is healed ${pct(a.frac)}.`;
    case 'forge': {
      const g = allGear(run).find((x) => x.id === a.gear);
      if (!g) return 'The anvil is cold. Nothing happens.';
      if (a.melt) {
        swapGear(run, a.gear, null);
        run.gold += a.n;
        return `The ${g.name} is melted down: +${a.n} gold.`;
      }
      const up = makeGear(g.id, g.slot, g.tier + 1);
      swapGear(run, a.gear, up);
      return `The ${g.name} is reforged as a ${up.name} (${gearText(up)}).`;
    }
    case 'newGear':
      (run.items ??= []).push(a.gear);
      return `You hammer out a ${a.gear.name} (${a.gear.slot}, ${gearText(a.gear)}).`;
    case 'lesson': {
      const t = run.tower;
      if (t) (t.xp ??= {})[a.kind] = (t.xp[a.kind] ?? 0) + a.xp;
      return `The ${UNITS[a.kind].name} learns well: +${a.xp} XP, kept for good.`;
    }
    case 'oath':
      for (const h of a.hero ? run.roster.filter((x) => x.id === a.hero) : run.roster) bump(run, h.id, -a.hp, a.atk);
      return a.hero ? `The ${nameOf(run, a.hero)} swears the oath: ${pct(a.hp)} frailer, ${pct(a.atk)} fiercer.` : `The party swears the oath: ${pct(a.hp)} frailer, ${pct(a.atk)} fiercer.`;
    case 'mimic':
      if (run.tower?.cur) run.tower.cur.mimic = true;
      else run.gold += 60;
      return 'The lid snaps open on a mouthful of teeth: the chest is alive!';
    case 'prod':
      if (a.real) {
        run.gold += a.gold;
        (run.items ??= []).push(a.gear);
        return `Nothing bites. It is only a chest: +${a.gold} gold and a ${a.gear.name}.`;
      }
      hurtParty(run, a.bite);
      return 'It bites the spear in half, then bites the party. Everyone is hurt.';
    case 'tome':
      if (a.good) {
        for (const h of run.roster) bump(run, h.id, 0, a.atk);
        return `The words sink in and stay: every hero gains +${pct(a.atk)} attack for good.`;
      }
      hurtParty(run, a.hurt);
      return 'The ink crawls up your fingers. Everyone feels it: the party is hurt.';
    case 'gold':
      run.gold += a.n;
      return `You find ${a.n} gold.`;
    case 'cairn':
      (run.items ??= []).push(a.gear);
      run.buff = { ...run.buff, foes: (run.buff?.foes ?? 1) * a.foes };
      return `You take the ${a.gear.name} (${a.gear.slot}, ${gearText(a.gear)}). The wind rises: the next foes will be stronger.`;
    case 'respects':
      healParty(run, a.frac);
      return `A quiet moment, and the party is healed ${pct(a.frac)}.`;
    case 'toll':
      return 'The bandits count the coin and lift the rope.';
    case 'brawl':
      hurtParty(run, a.hurt);
      run.gold += a.n;
      return `A scrappy fight: the bandits run, the party is hurt, and their strongbox is yours (+${a.n} gold).`;
    case 'sneak':
      if (a.ok) return 'Quiet as cats, you slip past. The bandits never wake.';
      run.gold = Math.max(0, run.gold - a.lose);
      return `A twig snaps. The bandits take up to ${a.lose} gold for the trouble.`;
  }
}
