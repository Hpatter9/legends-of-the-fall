// The Armies screen (opened by the Battle tab's big button) and the "A new army marches" moment. The screen is a swipeable
// carousel, one army a card, each card filling the page between the top bar and the tab bar: a cinematic scene of the army
// (its land's backdrop, its troops in ranks and its boss large at the back, with a lighting mood and a slow parallax),
// and below it the army's 11-star track with its chests, the difficulty picks, the conditions, the rewards and the Fight!
// button. A locked army shows its scene as a silhouette. The rules are in `src/sim/armies.ts`, `armyStars.ts` and
// `tiers.ts`; this only draws them.

import { ARMIES, armyCleared, armyIsNew, armyStars, armyUnlocked, bossOf, bossesOf, firstClearTotal, landsOf, recordOf, replayTotal, tierOpen, tierStars, type Army } from './sim/armies';
import { AUTO_COUNTS, AUTO_TICKETS, canAutoReplay, ticketsLeft } from './sim/autoReplay';
import { todayKey } from './modes';
import { armyRules, chestKind, chestsOf, type StarResult } from './sim/armyStars';
import { ARMY_STARS, MILESTONES, TIERS, tierRange } from './sim/tiers';
import { UNITS } from './sim/units';
import type { Meta } from './sim/meta';
import { backdropFiles } from './render/backdrop';
import { figureOf, portrait, sprite } from './render/sheets';
import { AREA_NAMES, ICONS, icon } from './menuArt';
import { CHEST_NAME, chestPicture } from './chestStash';

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
}

/** The boss's name that opens the army after `a` (shown on the locked card): its last boss. */
export const unlockLine = (prev: Army): string => `Defeat the ${UNITS[bossOf(prev)].name} to unlock`;

// ---- the scenes -------------------------------------------------------------------------------------------------------

type Mood = 'embers' | 'souls' | 'snow' | 'leaves' | 'fog' | 'sparks' | 'lanterns' | 'dust';
/** The light of each army's scene: drifting particles and a colour laid over the land. */
const MOODS: Record<string, { moods: Mood[]; tint: string }> = {
  orcs: { moods: ['embers', 'dust'], tint: 'rgb(var(--e6-rgb) / 0.16)' },
  undead: { moods: ['fog', 'souls'], tint: 'rgb(var(--b2-rgb) / 0.18)' },
  beasts: { moods: ['snow', 'fog'], tint: 'rgb(var(--b5-rgb) / 0.14)' },
  wildwood: { moods: ['leaves', 'fog'], tint: 'rgb(var(--g3-rgb) / 0.14)' },
  labyrinth: { moods: ['fog', 'dust'], tint: 'rgb(var(--p3-rgb) / 0.18)' },
  ogres: { moods: ['dust', 'embers'], tint: 'rgb(var(--e5-rgb) / 0.14)' },
  infernal: { moods: ['embers', 'embers'], tint: 'rgb(var(--r4-rgb) / 0.22)' },
  yokai: { moods: ['lanterns', 'souls'], tint: 'rgb(var(--p3-rgb) / 0.18)' },
  golems: { moods: ['sparks', 'dust'], tint: 'rgb(var(--e7-rgb) / 0.16)' },
};
const PARTICLE: Record<Mood, { colours: string[]; size: [number, number]; n: number; fall: boolean; time: [number, number] }> = {
  embers: { colours: ['var(--e6)', 'var(--e7)', 'var(--e5)'], size: [3, 6], n: 16, fall: false, time: [5, 9] },
  souls: { colours: ['var(--b4)', 'var(--g6)', 'var(--b3)'], size: [4, 8], n: 12, fall: false, time: [7, 12] },
  snow: { colours: ['var(--white)', 'var(--b6)'], size: [3, 6], n: 24, fall: true, time: [5, 9] },
  leaves: { colours: ['var(--g3)', 'var(--e4)', 'var(--g2)'], size: [4, 7], n: 14, fall: true, time: [7, 12] },
  fog: { colours: [], size: [0, 0], n: 3, fall: false, time: [26, 40] },
  sparks: { colours: ['var(--e8)', 'var(--e6)', 'var(--white)'], size: [3, 5], n: 16, fall: false, time: [3, 6] },
  lanterns: { colours: ['var(--p4)', 'var(--p5)', 'var(--p4)'], size: [5, 8], n: 10, fall: false, time: [9, 14] },
  dust: { colours: ['var(--s13)', 'var(--e5)'], size: [3, 5], n: 14, fall: false, time: [8, 13] },
};

/** A small deterministic stream for the scene's look (the same each visit). */
function lcg(seed: string): () => number {
  let s = 2166136261;
  for (const ch of seed) s = Math.imul(s ^ ch.charCodeAt(0), 16777619);
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/** The foes of an army's field waves, in order of first appearance, then back to the start to fill the ranks. */
export function crewOf(a: Army): string[] {
  const boss = new Set(bossesOf(a).map((b) => b.id));
  const seen: string[] = [];
  for (const w of a.waves) for (const f of w.foes) if (!boss.has(f) && !seen.includes(f)) seen.push(f);
  return seen;
}

/** The height a troop is drawn at, in px (each troop's scale is the whole number that comes nearest). */
const TROOP_PX = 84;
/** The whole-number scale that draws a boss at about `ratio` times a troop's height (1.5 to 2), the troop height being the crew's mean once scaled. */
function bossScale(kind: string, crew: string[], ratio = 1.75): number {
  const fig = (k: string) => figureOf(UNITS[k].sheet);
  const troop = crew.reduce((n, k) => n + fig(k) * Math.max(1, Math.round(TROOP_PX / fig(k))), 0) / Math.max(1, crew.length);
  let best = 1;
  for (let k = 1; k <= 5; k++) if (Math.abs((fig(kind) * k) / troop - ratio) < Math.abs((fig(kind) * best) / troop - ratio)) best = k;
  return best;
}

/** Where the troops stand: (x across, y up from the bottom, both in percent), front rank first. */
const SLOTS: [number, number][] = [
  [20, 8],
  [40, 5],
  [60, 5],
  [80, 8],
  [9, 21],
  [31, 22],
  [69, 22],
  [91, 21],
];

interface Figure {
  sheet: string;
  s: ReturnType<typeof sprite>;
  /** Where it stands, as a percentage of the scene (from the left, and up from the ground). */
  x: number;
  y: number;
}

/** Put a card's figures on whole pixels: a percentage of the scene is a fraction of a pixel, and scaled pixel art sitting between pixels shimmers. */
function snapFigures(c: { root: HTMLElement; figures: Figure[] }): void {
  const scene = c.root.querySelector<HTMLElement>('.asScene');
  if (!scene || !scene.clientWidth) return;
  for (const f of c.figures) {
    const cv = f.s.canvas;
    cv.style.left = `${Math.round((f.x / 100) * scene.clientWidth - cv.offsetWidth / 2)}px`;
    cv.style.bottom = `${Math.round((f.y / 100) * scene.clientHeight)}px`;
    cv.classList.add('snapped');
  }
}

/** An army's scene: the backdrop layers, the ground, the troops in ranks (front ones lower and in front), the mid-bosses and the boss large at the back. Returns the scene and the figures to animate. */
function buildScene(a: Army, locked: boolean): { root: HTMLElement; figures: Figure[] } {
  const root = el('div', 'asScene');
  const sky = el('div', 'asSky');
  backdropFiles(a.area).forEach((file, i, all) => {
    const layer = el('div', 'asLayer');
    layer.style.backgroundImage = `url(${file})`;
    if (i === 0) layer.style.backgroundSize = '100% 100%';
    layer.style.setProperty('--k', String(i * 7));
    layer.style.setProperty('--drift', `${i * 5}px`);
    layer.style.animationDuration = `${44 - (i * 28) / Math.max(1, all.length - 1)}s`;
    sky.append(layer);
  });
  root.append(sky, el('div', 'asGround'));
  const crowd = el('div', 'asCrowd');
  const figures: Figure[] = [];
  const stand = (kind: string, x: number, y: number, scale: number, n: number) => {
    const def = UNITS[kind];
    const s = sprite(def.sheet, 0, scale);
    s.canvas.className = 'asFig';
    s.canvas.style.left = `${x}%`;
    s.canvas.style.bottom = `${y}%`;
    // (nearer to the viewer, higher in the stack)
    s.canvas.style.zIndex = String(100 - Math.round(y));
    s.canvas.style.setProperty('--flip', s.faceRight ? '-1' : '1');
    s.tick(n % 4);
    crowd.append(s.canvas);
    figures.push({ sheet: def.sheet, s, x, y });
  };
  // troops stand at one figure height (whole-number scales, the nearest to `TROOP_PX`), the boss at 1.5 to 2 times a troop, a mid-boss between
  const scaleFor = (kind: string, px: number, max: number) => {
    const fig = figureOf(UNITS[kind].sheet);
    return Math.max(1, Math.min(max, Math.round(px / fig)));
  };
  const crew = crewOf(a);
  const boss = bossOf(a);
  const mids = bossesOf(a).filter((b) => b.id !== boss);
  stand(boss, 50, 22, bossScale(boss, crew), 0);
  mids.slice(0, 2).forEach((m, i) => stand(m.id, i ? 78 : 22, 25, bossScale(m.id, crew, 1.4), i + 1));
  const slots = mids.length ? SLOTS.filter((s) => !(s[1] > 20 && (s[0] === 31 || s[0] === 69))) : SLOTS;
  slots.forEach(([x, y], i) => stand(crew[i % crew.length], x, y, scaleFor(crew[i % crew.length], TROOP_PX, 4), i));
  root.append(crowd);
  // (the lighting: a colour over the land, drifting particles, and a vignette)
  const mood = MOODS[a.id] ?? { moods: [], tint: 'rgb(var(--black-rgb) / 0)' };
  const tint = el('div', 'asTint');
  tint.style.background = mood.tint;
  const air = el('div', 'asAir');
  const rnd = lcg(a.id);
  mood.moods.forEach((m, mi) => {
    const p = PARTICLE[m];
    if (m === 'fog') {
      for (let i = 0; i < p.n; i++) {
        const f = el('i', 'asFog');
        f.style.setProperty('--y', `${30 + i * 22}%`);
        f.style.setProperty('--t', `${p.time[0] + rnd() * (p.time[1] - p.time[0])}s`);
        f.style.setProperty('--d', `${-rnd() * 30}s`);
        air.append(f);
      }
      return;
    }
    for (let i = 0; i < p.n; i++) {
      const e = el('i', `asP ${p.fall ? 'fall' : 'rise'}`);
      e.style.setProperty('--x', `${Math.round(rnd() * 100)}%`);
      const dx = Math.round((rnd() - 0.5) * (p.fall ? 90 : 60));
      e.style.setProperty('--dx', `${dx}px`);
      e.style.setProperty('--n', String(Math.max(1, Math.abs(dx))));
      const sz = Math.round(p.size[0] + rnd() * (p.size[1] - p.size[0]));
      e.style.setProperty('--s', `${sz}px`);
      e.style.setProperty('--c', p.colours[(i + mi) % p.colours.length]);
      e.style.setProperty('--t', `${(p.time[0] + rnd() * (p.time[1] - p.time[0])).toFixed(1)}s`);
      e.style.setProperty('--d', `${(-rnd() * 12).toFixed(1)}s`);
      air.append(e);
    }
  });
  root.append(tint, air, el('div', 'asVig'));
  if (locked) root.classList.add('asDark');
  return { root, figures };
}

// ---- the screen -------------------------------------------------------------------------------------------------------

/** The tier last picked on each army's card, kept while the page lives. */
const picked: Record<string, number> = {};

/** The Armies screen's body: the carousel of full-screen cards, opening on the furthest army unlocked. */
export function drawArmies(body: HTMLElement, m: Meta, hooks: ArmiesHooks): void {
  body.classList.add('asBody');
  const root = el('div', 'asRoot');
  body.append(root);
  const focus = ARMIES.findIndex((a) => a.id === hooks.focus);
  let index = focus >= 0 ? focus : Math.max(0, ARMIES.map((a) => armyUnlocked(m, a.id)).lastIndexOf(true));
  const track = el('div', 'asTrack');
  const dots = el('div', 'asDots');
  const cards: { root: HTMLElement; figures: Figure[] }[] = [];

  const render = (): void => {
    track.replaceChildren();
    dots.replaceChildren();
    cards.length = 0;
    ARMIES.forEach((a, i) => {
      const c = card(a, i, m, hooks);
      cards.push(c);
      track.append(c.root);
      const d = el('button', 'asDot');
      d.setAttribute('aria-label', a.name);
      d.addEventListener('click', () => go(i));
      dots.append(d);
    });
    mark();
    requestAnimationFrame(() => cards.forEach(snapFigures));
  };
  const go = (i: number): void => {
    const to = Math.max(0, Math.min(ARMIES.length - 1, i));
    track.scrollTo({ left: to * track.clientWidth, behavior: 'smooth' });
  };
  const mark = (): void => {
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === index));
    cards.forEach((c, i) => c.root.classList.toggle('near', Math.abs(i - index) <= 1));
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
  back.addEventListener('click', () => hooks.onBack());

  let frame = 0;
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
    cards.forEach(snapFigures);
  };
  window.addEventListener('resize', fit);
  const place = () => {
    fit();
    track.scrollLeft = index * track.clientWidth;
    track.dispatchEvent(new Event('scroll'));
  };
  requestAnimationFrame(place);
  requestAnimationFrame(() => requestAnimationFrame(place));
  // (the troops idle while the page shows; the timer ends with the page)
  const timer = window.setInterval(() => {
    if (!root.isConnected || !root.offsetParent) {
      if (!root.isConnected) {
        clearInterval(timer);
        window.removeEventListener('resize', fit);
      }
      return;
    }
    frame++;
    cards.forEach((c, i) => {
      if (Math.abs(i - index) > 1) return;
      c.figures.forEach((f, k) => f.s.tick(frame + (k % 3)));
    });
  }, 160);
}

const crowns = (n: number): HTMLElement => {
  const s = el('span', 'armyCrowns');
  s.append(icon(ICONS.crowns, 'ico'), document.createTextNode(String(n)));
  return s;
};

/** What the Auto toggle was last set to (it is kept while the cards are redrawn). */
const autoPick = { on: false, count: 3 as number };

function card(a: Army, i: number, m: Meta, hooks: ArmiesHooks): { root: HTMLElement; figures: Figure[] } {
  const open = armyUnlocked(m, a.id);
  const rec = recordOf(m, a.id);
  const done = armyCleared(m, a.id);
  const fresh = armyIsNew(m, a.id);
  const boss = UNITS[bossOf(a)];
  const root = el('section', `asCard${open ? '' : ' locked'}${done ? ' done' : ''}${fresh ? ' fresh' : ''}`);
  root.dataset.army = a.id;
  const { root: scene, figures } = buildScene(a, !open);
  const rib = el('div', 'asRib');
  rib.append(el('b', '', open ? a.name : '???'));
  scene.append(rib);
  if (fresh) scene.append(el('i', 'armyNew', 'NEW'));
  if (!open) {
    const lock = el('div', 'asLock');
    lock.append(el('b', '', unlockLine(ARMIES[i - 1])), el('small', '', `${a.waves.length} waves · ${landsOf(a).map((l) => AREA_NAMES[l]).join(' and ')}`));
    scene.append(lock);
  }
  const info = el('div', `asInfo${open ? '' : ' shut'}`);
  root.append(scene, info);
  const running = hooks.running?.army === a.id ? hooks.running : null;
  const stars = armyStars(m, a);
  const tiers = TIERS.map((_, t) => ({ open: open && tierOpen(m, a, t), got: tierStars(rec, t) }));
  let tier = picked[a.id] ?? tiers.findIndex((t) => t.open && t.got < TIERS[tiers.indexOf(t)].stars);
  if (tier < 0 || !tiers[tier]?.open) tier = Math.max(0, tiers.map((t) => t.open).lastIndexOf(true));
  const draw = (): void => {
    info.replaceChildren();
    const bosses = bossesOf(a);
    info.append(el('p', 'asBlurb', a.blurb), el('p', 'asMeta', `${a.waves.length} waves · led by ${open ? `the ${boss.name}` : 'a hidden boss'}${bosses.length > 2 ? ` · ${bosses.length} bosses` : ''}${open ? ` · best wave ${Math.min(rec.best, a.waves.length)}` : ''}`));
    // the tier picks
    const picks = el('div', 'asTiers');
    TIERS.forEach((t, ti) => {
      const b = el('button', `asTier${ti === tier ? ' on' : ''}${tiers[ti].open ? '' : ' shut'}`);
      b.append(el('b', '', t.name), el('small', '', tiers[ti].open ? `${tiers[ti].got}/${t.stars} ★` : `needs ${t.need} ★`));
      b.addEventListener('click', () => {
        if (!tiers[ti].open) return;
        picked[a.id] = tier = ti;
        draw();
      });
      picks.append(b);
    });
    info.append(picks);
    // the 11-star track, with a chest under the 3rd, 5th and 10th star
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
    pay.append(tierDone ? 'Cleared ✓ · ' : 'First clear ', tierDone ? '' : crowns(firstClearTotal(a, tier)), tierDone ? 'Replay ' : ' · Replay ', crowns(replayTotal(a, tier)));
    info.append(pay);
    if (tier > 0) info.append(el('p', 'asHint', `Foes ×${t.hp} hp, ×${t.atk} attack, ×${t.speed} speed${t.extra ? `, ${t.extra} more in every wave` : ''}${t.phaseAt ? ', a boss that turns sooner and hits harder' : ''} · crowns ×${t.pay} · XP ×${t.xp}`));
    if (hooks.running && !hooks.running.army) {
      const cont = el('button', 'small asCont', `Continue ${hooks.running.label}`);
      cont.addEventListener('click', () => hooks.onContinue());
      info.append(cont);
    }
    // (a tier already cleared can be farmed: the Auto toggle beside Fight! repeats it for a count of runs)
    const farm = open && !running && canAutoReplay(m, a.id, tier);
    const auto = farm && autoPick.on;
    const go = el('button', open ? 'primary asFight' : 'asFight', !open ? 'Locked' : running ? `Continue · wave ${running.stage}` : rec.best > 0 || done ? `Fight again · ${t.name}` : 'Fight!');
    // (starting another army while a run is going would lose it: a second tap says yes)
    // (auto runs are limited to AUTO_TICKETS a day: the count asked for is cut to what is left)
    const left = farm ? ticketsLeft(m, todayKey()) : 0;
    const count = Math.min(autoPick.count, Math.max(...AUTO_COUNTS.filter((n) => n <= left), 0));
    if (auto) go.textContent = count ? `Auto-fight ×${count}` : 'No auto runs left';
    const runs = auto ? count : undefined;
    if (!open || (auto && !count)) go.disabled = true;
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
    if (running) {
      const again = el('button', 'small armyAgain', 'Restart from wave 1');
      twoTap(again, 'Lose this run and restart?', () => hooks.onFight(a.id, tier));
      info.append(again);
    }
  };
  draw();
  return { root, figures };
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
  if (res.firstClear) root.append(el('div', 'armyChestNote', `First ${tierName} clear! A ${CHEST_NAME[chestKind(res.firstClear)].toLowerCase()} was added to your stash on the Battle tab!`));
  for (const at of res.chests) root.append(el('div', 'armyChestNote', `A ${CHEST_NAME[chestKind(at)].toLowerCase()} was added to your stash on the Battle tab!`));
}

/** The unlock moment after an army's last boss falls: its next army's banner rises over the board. `then` runs when it is dismissed. */
export function showUnlock(next: Army, beaten: Army, then: () => void): void {
  const boss = UNITS[bossOf(next)];
  const root = el('div', 'unlock');
  root.setAttribute('role', 'dialog');
  const down = el('div', 'unlockDown', `${UNITS[bossOf(beaten)].name} has fallen`);
  const rib = el('div', 'unlockRib');
  rib.append(el('b', '', 'A new army marches'));
  const face = portrait(boss.sheet, 144);
  face.className = 'unlockFace';
  const name = el('div', 'unlockName', next.name);
  const line = el('div', 'unlockLine', `${next.blurb} Led by the ${boss.name}.`);
  const go = el('button', 'primary', 'To the armies');
  go.addEventListener('click', () => {
    root.remove();
    then();
  });
  root.append(down, rib, face, name, line, go);
  document.body.append(root);
}
