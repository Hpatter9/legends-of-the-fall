// The hero detail sheet (opened from a tap on a hero in the tavern): portrait, rank stars, level, XP bar, role, stats and
// skills. Reads the meta only.

import { ALL_HEROES, UNITS } from './sim/units';
import { KITS } from './sim/abilities';
import { HERO_KITS, SKILL2_LEVEL } from './sim/heroKits';
import { TIER_SKILLS } from './sim/tierSkills';
import { traitsOf, TRAITS } from './sim/traits';
import { MAX_RANK, RANK_SHARDS, heroRank, rankMult, rankOf, takenRank, type Meta } from './sim/meta';
import { readyToRise } from './sim/rankUp';
import { openRankUp, type Taken } from './rankUpView';
import { AWAKEN_SHARDS, awakenedOf, awakenPlan } from './sim/awaken';
import { drawAwaken, gems, playAwakenShow } from './awakenView';
import { lookSheet, stepOfRank } from './render/awakenLook';
import { wearAura } from './render/auraCanvas';
import { CLASS_NAMES, CLASS_OF } from './sim/starter';
import { lastingBoost, progressOf, xpOf } from './sim/levels';
import { compactXp, levelBadge } from './levelBadge';
import { drawEquipment } from './equipView';
import { drawTalents } from './talentView';
import { TREES } from './sim/talents';
import { blowsPerSecond, jumpText, kindPower, powerText, rateText, tilesPerSecond } from './sim/power';
import { heroStats } from './sim/talents';
import { figureShare, sprite } from './render/sheets';
import { CONTENT_HEROES, lockInfo } from './sim/contentHeroes';
import { haveOf, toCollect } from './sim/unlock';
import { portrait } from './render/sheets';
import swordIcon from './art/talent/sword.png';
import shieldIcon from './art/talent/shield.png';
import flameIcon from './art/talent/blast.png';
import targetIcon from './art/talent/target.png';
import haloIcon from './art/talent/halo.png';
import heartIcon from './art/talent/heart.png';
import crystalIcon from './art/talent/crystal.png';
import { warmIcon } from './menuArt';
import { tomeControl } from './tomeView';
import { TOME_SIZES, tomesOf, tomeTotal } from './sim/tomes';
import { TOME_ICON } from './tomeArt';

const DETAIL_TABS = ['overview', 'progression', 'equipment', 'skills'];

function detailHeading(title: string, subtitle: string): HTMLElement {
  const head = el('header', 'dossierHeading');
  head.append(el('h4', '', title), el('small', '', subtitle));
  return head;
}

function detailIcon(src: string): HTMLImageElement {
  warmIcon(src);
  const img = el('img');
  img.decoding = 'sync';
  img.src = src;
  img.alt = '';
  return img;
}

// Presentation names only: the underlying starter classes and hero rules stay the same.
const CARD_CLASSES = {
  front: { name: 'Guardian', icon: shieldIcon },
  striker: { name: 'Fighter', icon: swordIcon },
  caster: { name: 'Mage', icon: flameIcon },
  shooter: { name: 'Shooter', icon: targetIcon },
  support: { name: 'Support', icon: haloIcon },
};
// (the class pictures are decoded as the page loads, so a redrawn roster shows no empty banner)
for (const c of Object.values(CARD_CLASSES)) warmIcon(c.icon);

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
export const stars = (rank: number) => '★'.repeat(rank) + '☆'.repeat(MAX_RANK - rank);
/** A hero's stars and, after them, its awakening gems. */
export const starsOf = (meta: Meta, kind: string): string => `${stars(takenRank(meta, kind))} ${gems(awakenedOf(meta, kind))}`;

/** The level line of the sheet: the badge, then the XP to the next level. */
function levelLine(level: number, text: string): HTMLElement {
  const line = el('span', 'lv');
  line.append(levelBadge(level), text);
  return line;
}

function xpBar(meta: Meta, kind: string): { level: number; bar: HTMLElement; text: string } {
  const p = progressOf(xpOf(meta, kind));
  const bar = el('div', 'xpbar');
  const fill = el('span');
  fill.style.width = `${p.need ? (p.into / p.need) * 100 : 100}%`;
  bar.append(fill);
  return { level: p.level, bar, text: p.need ? `${compactXp(p.into)} / ${compactXp(p.need)} XP` : 'max level' };
}

/** The strongest unlocked heroes (level, then rank), best first. */
export function strongest(meta: Meta, n: number): string[] {
  const score = (k: string) => progressOf(xpOf(meta, k)).level * 100 + takenRank(meta, k) * 10;
  return ALL_HEROES.filter((k) => meta.unlocked.includes(k)).sort((a, b) => score(b) - score(a)).slice(0, n);
}

/** Fill the detail sheet for a hero; returns a function that stops its idle animation. */
export function drawHeroSheet(box: HTMLElement, meta: Meta, kind: string, close: () => void, onPick?: (kind: string, tab: string) => void, initialTab = 'overview'): () => void {
  const state = { tab: initialTab, onPick };
  let stop = paintSheet(box, meta, kind, close, again, state);
  // (an awakening draws the sheet again, with the show on the new look)
  function again(taken?: Taken): void {
    stop();
    stop = paintSheet(box, meta, kind, close, again, state, taken);
  }
  return () => stop();
}

function paintSheet(box: HTMLElement, meta: Meta, kind: string, close: () => void, redraw: (taken?: Taken) => void, state: { tab: string; onPick?: (kind: string, tab: string) => void }, show?: Taken): () => void {
  const def = UNITS[kind];
  const rank = takenRank(meta, kind);
  const open = meta.unlocked.includes(kind);
  const kit = KITS[kind];
  const hk = HERO_KITS()[kind];
  box.className = 'hsheet heroDetail';
  box.dataset.class = CLASS_OF[kind];
  box.replaceChildren();
  const bar = el('div', 'heroToolbar');
  const back = el('button', 'heroBack', '‹ Back');
  back.type = 'button';
  back.addEventListener('click', close);
  bar.append(back, el('span', '', 'YOUR COMPANY'));
  box.append(bar);
  if (state.onPick) {
    const strip = el('nav', 'heroStrip');
    strip.setAttribute('aria-label', 'Choose a hero');
    for (const other of ALL_HEROES.filter((k) => meta.unlocked.includes(k))) {
      const button = el('button', other === kind ? 'selected' : '');
      button.type = 'button';
      button.setAttribute('aria-current', other === kind ? 'true' : 'false');
      button.append(portrait(UNITS[other].sheet, 48), el('small', '', UNITS[other].name));
      button.addEventListener('click', () => state.onPick?.(other, state.tab));
      strip.append(button);
    }
    box.append(strip);
    // Keep the selected hero in view without scrolling the whole detail sheet.
    requestAnimationFrame(() => {
      const selected = strip.querySelector<HTMLElement>('.selected');
      if (selected) strip.scrollLeft = selected.offsetLeft - strip.offsetLeft - (strip.clientWidth - selected.offsetWidth) / 2;
    });
  }
  const head = el('div', 'hhead');
  const pic = el('div', 'hpic');
  // (an awakened hero is drawn in its top form, its own colours, in its class's aura)
  const full = heroRank(meta, kind);
  const step = stepOfRank(full);
  const sheet = step ? lookSheet(kind, full, 3) : def.sheet;
  const spr = sprite(sheet, 132);
  spr.canvas.style.transform = spr.faceRight ? 'translateX(-50%)' : 'translateX(-50%) scaleX(-1)';
  if (!open) spr.canvas.style.filter = 'brightness(0.15) grayscale(1)';
  const halo = el('span', 'heroCardHalo');
  halo.setAttribute('aria-hidden', 'true');
  const motes = el('span', 'heroCardMotes');
  motes.setAttribute('aria-hidden', 'true');
  pic.append(halo, spr.canvas, motes);
  if (open && step) wearAura(pic, spr.canvas, kind, step, figureShare(sheet), spr.faceRight ? 1 : -1);
  const banner = el('span', 'dossierClass');
  banner.append(detailIcon(CARD_CLASSES[CLASS_OF[kind]].icon), CARD_CLASSES[CLASS_OF[kind]].name);
  pic.append(banner);
  const title = el('div', 'dossierIdentity');
  const lock = lockInfo(meta, kind);
  title.append(el('h3', '', open || lock?.named ? def.name : '???'), el('em', '', open ? `${CLASS_NAMES[CLASS_OF[kind]]} · ${def.role}` : lock?.named ? `${CLASS_NAMES[CLASS_OF[kind]]} · locked` : 'not yet recruited'));
  // (a hero not owned says how to get it: a milestone to reach, or shards to gather, with a bar where there is a count)
  if (lock) {
    title.append(el('span', 'lv', lock.line));
    if (lock.need) {
      const bar = el('div', 'xpbar');
      const fill = el('span');
      fill.style.width = `${Math.min(1, lock.now / lock.need) * 100}%`;
      bar.append(fill);
      title.append(bar, el('span', 'lv', `${lock.now} / ${lock.need}`));
    }
  }
  const x = xpBar(meta, kind);
  if (open) {
    const shards = meta.shards[kind] ?? 0;
    const plan = awakenPlan(meta, kind);
    const waiting = rankOf(meta, kind) > rank;
    const next = waiting ? `${shards} shards: rank ${rank + 1} is earned` : rank < MAX_RANK ? `${shards} / ${RANK_SHARDS[rank]} shards to rank ${rank + 1}` : plan.step ? (plan.can ? 'ready to awaken' : `${shards} / ${AWAKEN_SHARDS[plan.step - 1]} shards to awaken`) : 'fully awakened';
    title.append(el('span', 'stars', starsOf(meta, kind)), levelLine(x.level, x.text), x.bar, el('span', 'lv', next));
    // (the XP tomes held, and "Use tome" to read one to this hero: CHEST-001)
    const tomes = tomeControl(meta, kind, () => redraw());
    if (tomes) title.append(tomes);
    // (a rank earned, or an awakening paid for, waits for the player's tap)
    if (readyToRise(meta, kind)) {
      const badge = el('button', 'rankBadge', 'Rank up');
      badge.type = 'button';
      badge.addEventListener('click', () => openRankUp(meta, kind, redraw));
      title.append(badge);
    }
  }
  const atmosphere = el('span', 'dossierAtmosphere');
  atmosphere.setAttribute('aria-hidden', 'true');
  head.append(atmosphere, pic, title);
  box.append(head);
  if (open) {
    const tabs = el('div', 'heroTabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Hero details');
    const panels = DETAIL_TABS.map((id) => {
      const panel = el('section', 'heroTabPanel');
      panel.id = `hero-${id}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `hero-tab-${id}`);
      panel.tabIndex = 0;
      return panel;
    });
    const buttons = ['Overview', 'Progression', 'Equipment', 'Skills'].map((label, i) => {
      const id = DETAIL_TABS[i];
      const button = el('button', '', label);
      button.type = 'button';
      button.id = `hero-tab-${id}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', panels[i].id);
      button.addEventListener('click', () => select(i));
      button.addEventListener('keydown', (event) => {
        let next = i;
        if (event.key === 'ArrowRight') next = (i + 1) % panels.length;
        else if (event.key === 'ArrowLeft') next = (i + panels.length - 1) % panels.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = panels.length - 1;
        else return;
        event.preventDefault();
        select(next);
        buttons[next].focus();
      });
      tabs.append(button);
      return button;
    });
    function select(index: number): void {
      state.tab = DETAIL_TABS[index];
      buttons.forEach((button, i) => {
        button.setAttribute('aria-selected', String(i === index));
        button.tabIndex = i === index ? 0 : -1;
        panels[i].hidden = i !== index;
      });
    }
    select(Math.max(0, DETAIL_TABS.indexOf(state.tab)));
    const [overview, progression, equipment, skills] = panels;
    overview.append(detailHeading('Battle readiness', 'The strength behind the legend.'));
    progression.append(detailHeading('Path of ascension', 'From a new recruit to a legend of the Keep.'));
    equipment.append(detailHeading('The armoury', 'Steel, craft and a little good fortune.'));
    skills.append(detailHeading('Arts of war', 'Every hero has a way to turn the tide.'));
    box.append(tabs, ...panels);
    const b = lastingBoost(x.level);
    const m = rankMult(full);
    const stat = el('div', 'hstats');
    for (const [name, v] of [['HP', Math.round(def.hp * b.hp * m)], ['Attack', Math.round(def.atk * b.atk * m)], ['Defence', def.def], ['Range', def.range]] as const) {
      const cell = el('div');
      cell.append(detailIcon(({ HP: heartIcon, Attack: swordIcon, Defence: shieldIcon, Range: targetIcon })[name]), el('b', '', String(v)), el('small', '', name));
      stat.append(cell);
    }
    // (how often it swings and how fast it walks, with what its equipment and talents add; they follow an equip or a talent learned)
    const speeds: [HTMLElement, () => string][] = [];
    for (const [name, rate] of [['Attack speed', () => rateText(blowsPerSecond(kind, heroStats(meta, kind)))], ['Walk', () => rateText(tilesPerSecond(kind, heroStats(meta, kind)))], ['Jump', () => jumpText(kind)]] as const) {
      const cell = el('div', 'hspeed');
      const v = el('b', '', rate());
      cell.append(v, el('small', '', name));
      stat.append(cell);
      speeds.push([v, rate]);
    }
    // (one number for how strong the hero is with its level, rank, equipment and talents, to set heroes side by side)
    const power = el('div', 'hpower');
    const pv = el('b', '', powerText(kindPower(meta, kind)));
    power.append(detailIcon(CARD_CLASSES[CLASS_OF[kind]].icon), el('small', '', 'Hero power'), pv);
    const repower = () => {
      pv.textContent = powerText(kindPower(meta, kind));
      for (const [v, rate] of speeds) v.textContent = rate();
    };
    overview.append(power, stat);
    const profile = el('div', 'dossierProfile');
    profile.append(detailHeading('Combat profile', def.role));
    const traits = el('div', 'dossierTraits');
    for (const trait of traitsOf(kind)) traits.append(el('span', '', TRAITS[trait].name));
    profile.append(traits);
    const arts = el('button', 'dossierSkillsLink', 'Explore skills  ›');
    arts.type = 'button';
    arts.addEventListener('click', () => { select(3); buttons[3].focus(); });
    profile.append(arts);
    overview.append(profile);
    const path = el('ol', 'dossierRanks');
    path.setAttribute('aria-label', 'Hero rank progression');
    for (let n = 1; n <= MAX_RANK; n++) {
      const milestone = el('li', n <= rank ? 'reached' : '');
      milestone.append(el('b', '', n <= rank ? '★' : '☆'), el('small', '', `Rank ${n}`));
      if (n === rank) milestone.setAttribute('aria-current', 'step');
      path.append(milestone);
    }
    progression.append(path);
    if (kit)
      // (COMBAT-002: two skills paid from the hero's pool, skill 2 from level 10; the tier skills improve the hero's first skill as before)
      for (const [label, a, cost, opens] of [
        ['Skill 1', hk?.s1.skill ?? kit.skill, hk ? `${hk.s1.cost} ${hk.pool}` : '', 1],
        ...(hk ? ([['Skill 2', hk.s2.skill, `${hk.s2.cost} ${hk.pool}${hk.s2.hpCost ? ' and blood' : ''}`, SKILL2_LEVEL]] as const) : []),
        ...(TIER_SKILLS[kind] ? ([['Tier 2', TIER_SKILLS[kind][0], '', 1], ['Tier 3', TIER_SKILLS[kind][1], '', 1]] as const) : []),
        ...(kit.ultimate ? [['Ultimate', kit.ultimate, 'tap its portrait', kit.ultimate.unlock ?? 1] as const] : []),
        ['Passive', kit.passive, '', 1],
      ] as const) {
        const card = el('article', 'dossierAbility');
        const locked = x.level < opens;
        if (locked) card.classList.add('locked');
        card.dataset.type = label.toLowerCase().replace(' ', '-');
        const icon = label === 'Ultimate' ? crystalIcon : label === 'Passive' ? haloIcon : CARD_CLASSES[CLASS_OF[kind]].icon;
        const body = el('div');
        body.append(el('small', 'dossierAbilityLabel', cost ? `${label} · ${cost}` : label), el('h5', '', a.name), el('p', '', a.text));
        if (locked) body.append(el('span', 'ultLock', `Unlocks at level ${opens}`));
        card.append(detailIcon(icon), body);
        skills.append(card);
      }
    progression.append(drawAwaken(meta, kind, redraw));
    if (TREES[kind]) progression.append(drawTalents(meta, kind, repower));
    equipment.append(drawEquipment(meta, kind, repower));
    equipment.append(el('p', 'hint', 'Equipment is kept for good. Gear found in a run lasts that run only.'));
  }
  if (show && show.what !== 'cache') playAwakenShow(pic, show.what === 'awaken' ? show.n : 1, show.what === 'rank' ? `Rank ${show.n}` : undefined, show.what === 'awaken' ? kind : undefined);
  const done = el('button', 'primary', 'Back');
  done.addEventListener('click', close);
  box.append(done);
  let n = 0;
  const timer = setInterval(() => spr.tick(++n), 140);
  return () => clearInterval(timer);
}

/** The roster page of the Heroes tab: the heroes owned in a grid, then the ones earned in play with the line "Joins when you …" and their progress, then the ones being collected by shards with their bars. A tap on a hero opens its sheet. */
export function drawRoster(box: HTMLElement, meta: Meta, pick: (kind: string) => void, close: () => void, lastViewed?: string): void {
  box.className = 'hsheet heroRoster';
  box.replaceChildren();
  const have = ALL_HEROES.filter((k) => meta.unlocked.includes(k));
  const earned = CONTENT_HEROES.filter((c) => meta.unlocked.includes(c.kind)).length;
  const head = el('div');
  head.className = 'rosterHeading';
  head.append(el('small', 'rosterEyebrow', 'THE LAST KEEP'), el('h3', '', 'Your company'), el('em', '', `${have.length} of ${ALL_HEROES.length} heroes · ${earned} of ${CONTENT_HEROES.length} earned in play`));
  // (the XP tomes held, the nearest thing the game has to a bag: they are read to a hero from its page)
  if (tomeTotal(meta) > 0) {
    const bag = el('p', 'rosterTomes');
    bag.append('XP tomes: ');
    for (const size of TOME_SIZES) {
      const n = tomesOf(meta, size);
      if (!n) continue;
      const img = el('img');
      img.src = TOME_ICON[size];
      img.alt = '';
      const chip = el('span', 'tomeChip');
      chip.append(img, `${n} ${size}`);
      bag.append(chip);
    }
    bag.append(el('small', '', 'Open a hero to use one.'));
    head.append(bag);
  }
  box.append(head);
  const label = el('label', 'rosterSearch');
  label.append(el('span', '', 'Find a hero'));
  const search = el('input');
  search.type = 'search';
  search.placeholder = 'Name or class…';
  search.autocomplete = 'off';
  label.append(search);
  box.append(label);
  const searchable: { element: HTMLElement; text: string }[] = [];
  const remember = (element: HTMLElement, kind: string, named = true) => {
    searchable.push({ element, text: named ? `${UNITS[kind].name} ${CLASS_NAMES[CLASS_OF[kind]]} ${CARD_CLASSES[CLASS_OF[kind]].name}`.toLowerCase() : '' });
  };
  const result = el('p', 'rosterResult');
  result.setAttribute('role', 'status');
  box.append(result);
  const grid = el('div', 'rosGrid');
  for (const kind of have) {
    const card = el('button', 'hcard');
    card.type = 'button';
    card.dataset.kind = kind;
    card.dataset.class = CLASS_OF[kind];
    const cls = CARD_CLASSES[CLASS_OF[kind]];
    const banner = el('span', 'heroClassBanner');
    const icon = el('img');
    icon.decoding = 'sync';
    icon.src = cls.icon;
    icon.alt = '';
    banner.append(icon, el('span', '', cls.name));
    const scene = el('span', 'heroCardScene');
    scene.setAttribute('aria-hidden', 'true');
    // Reuse the awakened look when one is owned, just as the detail sheet does.
    const full = heroRank(meta, kind);
    const step = stepOfRank(full);
    const figure = portrait(step ? lookSheet(kind, full, 3) : UNITS[kind].sheet, 160);
    scene.append(el('span', 'heroCardHalo'), figure, el('span', 'heroCardMotes'));
    if (step) wearAura(scene, figure, kind, step, 0.88);
    const level = progressOf(xpOf(meta, kind)).level;
    const ribbon = el('span', 'heroLevelRibbon');
    ribbon.append(levelBadge(level));
    card.append(banner, scene, el('b', 'heroCardName', UNITS[kind].name), el('span', 'stars', starsOf(meta, kind)), ribbon);
    if (kind === lastViewed) {
      card.classList.add('lastViewed');
      const seal = el('span', 'heroCardSeal', '✓');
      seal.setAttribute('aria-hidden', 'true');
      card.append(seal);
      card.setAttribute('aria-description', 'Last viewed hero');
    }
    if (readyToRise(meta, kind)) card.append(el('small', 'rankTag', 'Rank up'));
    card.addEventListener('click', () => pick(kind));
    remember(card, kind);
    grid.append(card);
  }
  box.append(grid);
  const row = (kind: string): HTMLElement => {
    const lock = lockInfo(meta, kind)!;
    const r = el('button', 'rosRow');
    const text = el('span', 'rosText');
    text.append(el('b', '', lock.named ? UNITS[kind].name : '???'), el('span', 'lv', lock.line));
    if (lock.need) {
      const bar = el('div', 'xpbar');
      const fill = el('span');
      fill.style.width = `${Math.min(1, lock.now / lock.need) * 100}%`;
      bar.append(fill);
      text.append(bar, el('span', 'lv', `${lock.now} / ${lock.need}`));
    }
    const pic = portrait(UNITS[kind].sheet, 48);
    pic.classList.add('dim');
    r.append(pic, text);
    r.addEventListener('click', () => pick(kind));
    remember(r, kind, lock.named);
    return r;
  };
  const section = (title: string, kinds: string[], note = ''): void => {
    if (!kinds.length && !note) return;
    box.append(el('h3', 'rosHead', title));
    for (const k of kinds) box.append(row(k));
    if (note) box.append(el('p', 'hint', note));
  };
  section('Earned in play', CONTENT_HEROES.filter((c) => !meta.unlocked.includes(c.kind)).map((c) => c.kind));
  const begun = toCollect(meta).filter((k) => haveOf(meta, k) > 0).sort((a, b) => haveOf(meta, b) - haveOf(meta, a));
  const rest = toCollect(meta).length - begun.length;
  section('Gathering shards', begun, rest ? `${rest} more to find: summoning stones give their shards.` : '');
  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    let shown = 0;
    for (const row of searchable) {
      row.element.hidden = !!query && !row.text.includes(query);
      if (!row.element.hidden) shown++;
    }
    result.textContent = query ? `${shown} ${shown === 1 ? 'hero' : 'heroes'} found` : '';
  });
  const done = el('button', 'primary', 'Visit tavern');
  done.addEventListener('click', close);
  box.append(done);
}
