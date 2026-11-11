// Painted War Room campaign selection. Battle rules, rewards and tier gates remain in sim/.
import { menuWell } from './ornateMenu';
import { trophyPicture } from './trophyArt';
import { armyChallenge, suggestedArmyTier } from './sim/armyChallenge';
import { powerText } from './sim/power';
import { glyphWord } from './paintedButton';
import { blueprintOf } from './sim/assault/assault';
import { ASSAULT_STARS, canAssault, conquered, regrouped, tributeDue, tributeOf } from './sim/assault/economy';
import { armyOreRow } from './oreView';
import { progressLine } from './sim/modeUnlock';
import { ARMIES, armyBefore, armyCleared, armyNeed, armyIsNew, armyStars, armyUnlocked, bossOf, bossesOf, firstClearTotal, landsOf, recordOf, replayTotal, tierOpen, tierStars, type Army } from './sim/armies';
import { AUTO_COUNTS, AUTO_TICKETS, canAutoReplay, ticketsLeft } from './sim/autoReplay';
import { todayKey } from './modes';
import { armyRules, chestKind, chestsOf, type StarResult } from './sim/armyStars';
import { ARMY_STARS, MILESTONES, TIERS, tierRange } from './sim/tiers';
import { UNITS } from './sim/units';
import type { Meta } from './sim/meta';
import { AREA_NAMES, ICONS, icon } from './menuArt';
import { CHEST_NAME, chestPicture } from './chestStash';
import { clearHeroWaits } from './sim/clearHero';
import { heroName } from './sim/heroNames';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

export interface ArmiesHooks {
  /** Pick the party and start this army from wave 1, on a difficulty tier. */
  onFight(id: string, tier: number, auto?: number): void;
  /** Carry on with the run in progress. */
  onContinue(): void;
  /** Close the screen. */
  onBack(): void;
  /** An army to open on (the one just cleared, with a chest waiting); the furthest unlocked when unset. */
  focus?: string;
  /** The run saved and not over, if any: the army it fights (none for a daily, tower or older run), and the stage it is on. */
  running: { army?: string; stage: number; label: string } | null;
  /** The Assault (docs/notes/assault-1.md): open the muster for an army's hold (its ten stars won). */
  onAssault?(id: string, restorm?: boolean): void;
  /** Resume the assault under way on this army (phase 2), or abandon it (a withdrawal). */
  onResume?(id: string): void;
  onAbandon?(id: string): void;
  /** Claim today's tribute from the holds conquered; returns the crowns paid. */
  onTribute?(): number;
}

/** The locked card's line: the army to beat first (named once it is open, else "the army before") and the stars it opens at. */
export const unlockLine = (a: Army, m: Meta): string => {
  const before = armyBefore(a.id);
  if (!before) return `Opens at ${armyNeed(a.id)} stars`;
  const who = armyUnlocked(m, before.id) ? `the ${before.name.replace(/^The /, '')}` : 'the army before';
  return armyCleared(m, before.id) ? `Opens at ${armyNeed(a.id)} stars` : `Beat ${who} · ${armyNeed(a.id)} stars`;
};

/** The field troops, kept available to previews and army inspection tools. */
export function crewOf(a: Army): string[] {
  const bosses = new Set(bossesOf(a).map((b) => b.id));
  return [...new Set(a.waves.flatMap((w) => w.foes).filter((k) => !bosses.has(k)))];
}

// Painted boss keepsakes sit on selectable campaign banners over the room painting.
function buildScene(a: Army, locked: boolean) {
  const root = el('div', 'asScene');
  root.append(el('small', 'wrEyebrow', 'THE WAR ROOM'), el('h1', 'wrTitle', 'Armies'));
  const banners = el('div', 'wrBanners');
  const centre = ARMIES.indexOf(a);
  for (let offset = -1; offset <= 1; offset++) {
    const army = ARMIES[(centre + offset + ARMIES.length) % ARMIES.length];
    const banner = el('button', `wrBanner${offset === 0 ? ' selected' : ''}`);
    banner.dataset.armyIndex = String(ARMIES.indexOf(army));
    banner.append(trophyPicture(bossOf(army), !locked && offset === 0), el('b', '', offset === 0 && !locked ? army.name : offset === 0 ? 'Sealed army' : 'View army'));
    banner.setAttribute('aria-label', offset === 0 ? 'Selected army' : offset < 0 ? 'Previous army' : 'Next army');
    banners.append(banner);
  }
  root.append(banners);
  return root;
}

// ---- the screen -------------------------------------------------------------------------------------------------------

/** The tier last picked on each army's card, kept while the page lives. */
const picked: Record<string, number> = {};

/** The Armies screen's body: the carousel of full-screen cards, opening on the furthest army unlocked. */
export function drawArmies(body: HTMLElement, m: Meta, hooks: ArmiesHooks): void {
  body.classList.add('asBody', 'wrBody');
  const root = el('div', 'asRoot');
  body.append(root);
  const focus = ARMIES.findIndex((a) => a.id === hooks.focus);
  let index = focus >= 0 ? focus : Math.max(0, ARMIES.map((a) => armyUnlocked(m, a.id)).lastIndexOf(true));
  const track = el('div', 'asTrack');
  const dots = el('div', 'asDots');
  const cards: { root: HTMLElement }[] = [];

  const render = (): void => {
    track.replaceChildren();
    dots.replaceChildren();
    cards.length = 0;
    ARMIES.forEach((a, i) => {
      const c = card(a, i, m, hooks);
      c.root.querySelectorAll<HTMLButtonElement>('.wrBanner').forEach((b) => {
        const target = Number(b.dataset.armyIndex);
        const other = ARMIES[target];
        const open = armyUnlocked(m, other.id);
        b.replaceChildren(trophyPicture(bossOf(other), open), el('b', '', open ? other.name : 'Sealed army'));
        b.setAttribute('aria-label', open ? other.name : 'Sealed army');
        b.setAttribute('aria-pressed', String(target === i));
        b.addEventListener('click', () => go(target));
      });
      cards.push(c);
      track.append(c.root);
      const d = el('button', 'asDot');
      d.setAttribute('aria-label', a.name);
      d.addEventListener('click', () => go(i));
      dots.append(d);
    });
    mark();
  };
  const go = (i: number): void => {
    const to = Math.max(0, Math.min(ARMIES.length - 1, i));
    track.scrollTo({ left: to * track.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  const mark = (): void => {
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === index));
    cards.forEach((c, i) => {
      c.root.classList.toggle('near', Math.abs(i - index) <= 1);
      c.root.inert = i !== index;
    });
    prev.hidden = index === 0;
    next.hidden = index === ARMIES.length - 1;
    // (a dot is dark when its army is locked)
    [...dots.children].forEach((d, i) => d.classList.toggle('shut', !armyUnlocked(m, ARMIES[i].id)));
  };
  const prev = el('button', 'asArrow left', '‹');
  const next = el('button', 'asArrow right', '›');
  prev.setAttribute('aria-label', 'Previous army');
  next.setAttribute('aria-label', 'Next army');
  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  const back = el('button', 'asBack', '‹ Back');
  glyphWord(back);
  back.addEventListener('click', () => hooks.onBack());

  track.addEventListener('scroll', () => {
    const w = track.clientWidth || 1;
    const now = Math.round(track.scrollLeft / w);
    cards.forEach((c, i) => {
      if (Math.abs(i - track.scrollLeft / w) < 1.2) c.root.style.setProperty('--par', String(((i * w - track.scrollLeft) / w).toFixed(3)));
    });
    if (now !== index) {
      index = now;
      mark();
    }
  });
  root.append(track, dots, prev, next, back);
  render();
  // (the first look: on the furthest army, without a slide)
  // (the dots and arrows sit over the scenes: they follow the scene's height, which takes the page's slack)
  const fit = () => {
    const h = track.querySelector<HTMLElement>('.asScene')?.offsetHeight;
    if (h) root.style.setProperty('--sceneH', `${h}px`);
  };
  const place = () => {
    fit();
    track.scrollLeft = index * track.clientWidth;
    mark();
  };
  const observer = new ResizeObserver(() => place());
  observer.observe(track);
  requestAnimationFrame(place);

}

const crowns = (n: number): HTMLElement => {
  const s = el('span', 'armyCrowns');
  s.append(icon(ICONS.crowns, 'ico'), document.createTextNode(String(n)));
  return s;
};

/** What the Auto toggle was last set to (it is kept while the cards are redrawn). */
const autoPick = { on: false, count: 3 as number };

function card(a: Army, _i: number, m: Meta, hooks: ArmiesHooks): { root: HTMLElement } {
  const open = armyUnlocked(m, a.id);
  const rec = recordOf(m, a.id);
  const done = armyCleared(m, a.id);
  const fresh = armyIsNew(m, a.id);
  const boss = UNITS[bossOf(a)];
  const root = el('section', `asCard${open ? '' : ' locked'}${done ? ' done' : ''}${fresh ? ' fresh' : ''}`);
  root.dataset.army = a.id;
  const scene = buildScene(a, !open);
  const rib = el('div', 'asRib');
  // (the Assault: a conquered army's card turns to our colours, its waves the "Remnants" still to farm)
  const fallen = conquered(m, a.id);
  rib.append(el('b', '', open ? (fallen ? `${a.name} · Conquered` : a.name) : '???'));
  if (fallen) root.classList.add('conquered');
  scene.append(rib);
  if (fresh) scene.append(el('i', 'armyNew', 'NEW'));
  if (!open) {
    const lock = el('div', 'asLock');
    lock.append(el('b', '', unlockLine(a, m)), el('small', '', `${progressLine(m, armyNeed(a.id))} · ${a.waves.length} waves · ${landsOf(a).map((l) => AREA_NAMES[l]).join(' and ')}`));
    scene.append(lock);
  }
  const info = menuWell(root);
  info.classList.add('asInfo');
  if (!open) info.classList.add('shut');
  root.append(scene, info);
  const running = hooks.running?.army === a.id ? hooks.running : null;
  const stars = armyStars(m, a);
  const tiers = TIERS.map((_, t) => ({ open: open && tierOpen(m, a, t), got: tierStars(rec, t) }));
  let tier = picked[a.id] ?? tiers.findIndex((t) => t.open && t.got < TIERS[tiers.indexOf(t)].stars);
  if (tier < 0 || !tiers[tier]?.open) tier = Math.max(0, tiers.map((t) => t.open).lastIndexOf(true));
  const draw = (): void => {
    info.replaceChildren();
    const advice = armyChallenge(m, a, tier);
    const summary = el('div', 'wrStrength');
    summary.append(el('span', '', 'Party Strength'), el('b', '', powerText(advice.strength)), el('strong', 'wrAssessment', open ? advice.label : 'Sealed'));
    summary.title = `Estimated target strength ${powerText(advice.target)}. Formation, bonds, spells and castle bonuses can change the outcome.`;
    info.append(el('h3', 'wrArmyName', open ? a.name : 'Sealed campaign'), summary, el('p', 'asHint', 'Challenge estimate · review your party before marching'));
    const bosses = bossesOf(a);
    info.append(el('p', 'asBlurb', fallen ? `Remnants of the ${a.name.replace(/^The /, '')}: its waves still march, and its hold pays tribute.` : a.blurb), el('p', 'asMeta', `${a.waves.length} waves · led by ${open ? `the ${boss.name}` : 'a hidden boss'}${bosses.length > 2 ? ` · ${bosses.length} bosses` : ''}${open ? ` · best wave ${Math.min(rec.best, a.waves.length)}` : ''}`));
    // the tier picks
    const picks = el('div', 'asTiers');
    TIERS.forEach((t, ti) => {
      const b = el('button', `asTier${ti === tier ? ' on' : ''}${tiers[ti].open ? '' : ' shut'}`);
      b.setAttribute('aria-pressed', String(ti === tier));
      b.setAttribute('aria-disabled', String(!tiers[ti].open));
      b.title = tiers[ti].open ? `${t.name}: ${armyChallenge(m, a, ti).label}` : `Requires ${t.need} stars`;
      b.append(el('b', '', t.name), el('small', '', tiers[ti].open ? `${tiers[ti].got}/${t.stars} ★` : `needs ${t.need} ★`));
      b.addEventListener('click', () => {
        if (!tiers[ti].open) return;
        picked[a.id] = tier = ti;
        draw();
      });
      picks.append(b);
    });
    info.append(picks);
    if (open && m.party.length) {
      const suggested = suggestedArmyTier(m, a);
      const suggest = el('button', 'wrSuggest', `Suggested challenge · ${TIERS[suggested].name} · ${armyChallenge(m, a, suggested).label}`);
      suggest.addEventListener('click', () => { picked[a.id] = tier = suggested; draw(); });
      info.append(suggest);
    }
    // the 11-star track, with a chest under the 3rd, 5th, 10th and 11th star
    const track = el('div', 'asStars');
    const chests = chestsOf(m, a);
    for (let s = 1; s <= ARMY_STARS; s++) {
      const ti = TIERS.findIndex((_, k) => s >= tierRange(k)[0] && s <= tierRange(k)[1]);
      const lit = s - tierRange(ti)[0] < tiers[ti].got;
      const col = el('div', `asStarCol${ti === tier ? ' pick' : ''}${s === tierRange(ti)[0] && ti > 0 ? ' gap' : ''}`);
      col.append(el('span', `asStar${lit ? ' on' : ''}`, lit ? '★' : '☆'));
      const ch = chests.find((c) => c.at === s);
      if (ch) {
        // (earned chests wait in the stash on the Battle tab: the card only marks the milestone as earned)
        const pic = el('div', `asChest ${ch.kind} ${ch.state}${s === MILESTONES[MILESTONES.length - 1] ? ' end' : ''}`);
        pic.setAttribute('aria-label', `${CHEST_NAME[ch.kind]}, ${ch.state === 'earned' ? (ch.waiting ? 'earned, in your stash' : 'earned') : `at ${ch.at} stars`}`);
        pic.append(chestPicture(ch.kind, 1).root, el('small', '', ch.state === 'earned' ? '✓' : `${ch.at}★`));
        col.append(pic);
      }
      track.append(col);
    }
    info.append(track, el('p', 'asHint', `${stars.got}/${ARMY_STARS} stars · chests at ${MILESTONES.join(', ')} stars`));
    // the conditions of the picked tier (three stars a tier, the first and last tier's the same words)
    const rules = el('div', 'asRules');
    const earned = rec.met?.[String(tier)] ?? 0;
    armyRules(a, tier).forEach((r, k) => {
      const got = !!(earned & (1 << k));
      rules.append(el('span', `asRule${got ? ' on' : ''}`, `${got ? '★' : '☆'} ${r.text}`));
    });
    info.append(rules);
    // the rewards of the picked tier
    const t = TIERS[tier];
    const tierDone = tier === 0 ? done : (rec.hard?.[String(tier)]?.clears ?? 0) > 0;
    const pay = el('div', 'asPay');
    // (FIRST-HOUR 3: the first two armies' first clear gives a new save a whole hero, `clearHero.ts`: said on the first clear's own line,
    // since a row of its own pushed the card's last line under the tab bar at 360 wide)
    const hero = open && !tierDone && clearHeroWaits(m, a);
    pay.append(tierDone ? 'Cleared ✓ · ' : 'First clear ', tierDone ? '' : crowns(firstClearTotal(a, tier)), ...(hero ? [' · ', el('b', 'asHero', 'a new hero joins')] : []), tierDone ? 'Replay ' : ' · Replay ', crowns(replayTotal(a, tier)));
    info.append(pay);
    // (the rift ores it drops, so a player knows where to look for a class's: `awakenMats.ts`)
    const ores = open ? armyOreRow(a.id) : null;
    if (ores) info.append(ores);
    if (tier > 0) info.append(el('p', 'asHint', `Foes ×${t.hp} hp, ×${t.atk} attack, ×${t.speed} speed${t.extra ? `, ${t.extra} more in every wave` : ''}${t.phaseAt ? ', a boss that turns sooner and hits harder' : ''} · crowns ×${t.pay} · XP ×${t.xp}`));
    if (hooks.running && !hooks.running.army) {
      const cont = el('button', 'small asCont', `Continue ${hooks.running.label}`);
      cont.addEventListener('click', () => hooks.onContinue());
      info.append(cont);
    }
    // (a tier already cleared can be farmed: the Auto toggle beside Fight! repeats it for a count of runs)
    // (also with a run of this army going, on any tier: Auto then starts afresh, after a second tap to say the run in progress is lost)
    const farm = open && canAutoReplay(m, a.id, tier);
    const auto = farm && autoPick.on;
    const go = el('button', open ? 'primary asFight' : 'asFight', !open ? 'Locked' : running ? `Continue · wave ${running.stage}` : rec.best > 0 || done ? `Prepare Battle · ${t.name}` : 'Prepare Battle');
    // (starting another army while a run is going would lose it: a second tap says yes)
    // (auto runs are limited to AUTO_TICKETS a day: the count asked for is cut to what is left)
    const left = farm ? ticketsLeft(m, todayKey()) : 0;
    const count = Math.min(autoPick.count, Math.max(...AUTO_COUNTS.filter((n) => n <= left), 0));
    if (auto) go.textContent = count ? `Auto-fight ×${count}` : 'No auto runs left';
    const runs = auto ? count : undefined;
    if (!open || (auto && !count)) go.disabled = true;
    else if (running && auto) twoTap(go, 'Lose the run in progress?', () => hooks.onFight(a.id, tier, runs));
    else if (running) go.addEventListener('click', () => hooks.onContinue());
    else if (hooks.running) twoTap(go, `Leave ${hooks.running.label}?`, () => hooks.onFight(a.id, tier, runs));
    else go.addEventListener('click', () => hooks.onFight(a.id, tier, runs));
    if (farm) {
      const toggle = el('button', `asAuto${auto ? ' on' : ''}`, auto ? 'Auto ✓' : 'Auto');
      toggle.title = 'Repeat this army on its own';
      toggle.setAttribute('aria-pressed', String(auto));
      toggle.addEventListener('click', () => {
        autoPick.on = !autoPick.on;
        draw();
      });
      const row = el('div', 'asGo');
      row.append(go, toggle);
      if (auto) {
        const counts = el('div', 'asCounts', 'Runs');
        for (const n of AUTO_COUNTS) {
          const c = el('button', n === count ? 'on' : '', String(n));
          c.disabled = n > left;
          c.addEventListener('click', () => {
            autoPick.count = n;
            draw();
          });
          counts.append(c);
        }
        info.append(counts, el('p', 'asHint', `Auto runs left today: ${left}/${AUTO_TICKETS} · more at midnight`));
      }
      info.append(row);
    } else info.append(go);
    // (the Assault: at the tenth star the army's hold can be stormed; once the mode is open, a sealed plate until then)
    const bp = blueprintOf(a.id);
    const live = m.assault?.live;
    if (open && bp && live?.army === a.id && hooks.onResume) {
      // (an assault under way, phase 2: resume it from its last snapshot, or abandon it)
      const t = Math.floor(live.t / 1000);
      const go = el('button', 'primary asAssault', `Resume the assault · ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`);
      go.addEventListener('click', () => hooks.onResume!(a.id));
      const drop = el('button', 'small asTribute', 'Abandon it (a withdrawal)');
      twoTap(drop, 'Abandon the assault? Tap again', () => {
        hooks.onAbandon?.(a.id);
        draw();
      });
      info.append(go, drop);
    // (FIRST-HOUR 2: the sealed plate shows from the start, not only once the mode is open: nothing said what the tenth star is for)
    } else if (open && bp && hooks.onAssault) {
      if (fallen) {
        const due = tributeDue(m, todayKey());
        info.append(el('p', 'asHint asSeal', `${bp.name} is conquered · ${tributeOf(a.id)} crowns of tribute a day`));
        if (due && hooks.onTribute) {
          const claim = el('button', 'small asTribute', `Claim tribute · ${due}`);
          claim.addEventListener('click', () => {
            hooks.onTribute!();
            draw();
          });
          info.append(claim);
        }
        // (once a week the Warband regroups: the hold can be stormed again at Mythic, for half a Conquest chest)
        if (regrouped(m, a.id, todayKey())) {
          const again = el('button', 'primary asAssault', 'The Warband regroups · storm at Mythic');
          again.addEventListener('click', () => hooks.onAssault!(a.id, true));
          info.append(again);
        }
      } else if (canAssault(m, a.id)) {
        const storm = el('button', 'primary asAssault', `Assault ${bp.name}`);
        storm.addEventListener('click', () => hooks.onAssault!(a.id));
        info.append(storm);
      } else info.append(el('p', 'asHint asSeal', `${ASSAULT_STARS} stars on this army open its Assault · storm ${bp.name}`));
    }
    info.insertBefore(pay, track);
    const action = info.querySelector('.asGo') ?? go;
    info.insertBefore(action, track);
    info.querySelectorAll('.asBlurb, .asMeta').forEach((line) => info.insertBefore(line, track));
    if (running) {
      const again = el('button', 'small armyAgain', 'Restart from wave 1');
      twoTap(again, 'Lose this run and restart?', () => hooks.onFight(a.id, tier));
      info.append(again);
    }
  };
  draw();
  return { root };
}

/** A button that asks first: the first tap changes its words, the second does it (and a pause puts it back). */
function twoTap(btn: HTMLButtonElement, ask: string, then: () => void): void {
  const words = btn.textContent;
  let armed: ReturnType<typeof setTimeout> | undefined;
  btn.addEventListener('click', () => {
    if (armed === undefined) {
      btn.textContent = ask;
      armed = setTimeout(() => {
        btn.textContent = words;
        armed = undefined;
      }, 3000);
      return;
    }
    clearTimeout(armed);
    then();
  });
}

/** The army stars of a cleared run, on the result screen: the three conditions, which are new, the total, and any chests it reached. `tierName` is the difficulty. */
export function drawRunStars(root: HTMLElement, res: StarResult | null, tierName: string): void {
  root.replaceChildren();
  root.hidden = !res;
  if (!res) return;
  root.append(el('h4', '', `${tierName} stars · ${res.total}/${ARMY_STARS}${res.gained ? ` (+${res.gained})` : ''}`));
  res.rules.forEach((r, i) => {
    const fresh = res.fresh.includes(i);
    const row = el('div', `armyStarRow${r.earned ? ' on' : ''}${fresh ? ' fresh' : ''}`);
    row.append(el('span', '', r.earned ? '★' : '☆'), el('b', '', r.text), ...(fresh ? [el('em', '', 'NEW')] : []));
    root.append(row);
  });
  if (res.hero) root.append(el('div', 'armyChestNote armyHeroNote', `A new hero joins: ${heroName(res.hero)}!`));
  if (res.firstClear) root.append(el('div', 'armyChestNote', `First ${tierName} clear! A ${CHEST_NAME[chestKind(res.firstClear)].toLowerCase()} was added to your stash on the Battle tab!`));
  for (const at of res.chests) root.append(el('div', 'armyChestNote', `A ${CHEST_NAME[chestKind(at)].toLowerCase()} was added to your stash on the Battle tab!`));
}
