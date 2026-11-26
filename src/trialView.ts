// WEEKLY-TRIAL (docs/notes/weekly-trial.md): the Weekly Trial's card (the camp's Trial medallion opens it) and its reward card. Both are the
// standard ornate menu. The rules are `sim/trialRules.ts` and `sim/trial.ts`; the week's day and time left are `trialClock.ts`'s.

import { menuFoot, menuNote, menuSection, menuWell, ornateMenu } from './ornateMenu';
import { matchBlock } from './armyMatchView';
import { classSigil } from './classSigil';
import { bossOf } from './sim/armies';
import { classOf } from './sim/armyWeakness';
import { LIVES } from './sim/lives';
import type { Meta } from './sim/meta';
import { trialBlock, trialFive, trialLoans, trialRecord, trialTitle, trialTriesLeft, trialWeekOf, TRIAL_TIERS, type TrialTier } from './sim/trial';
import { mergedRule, trialHost, trialRulesOf, TRIAL_MID, TRIAL_WAVES } from './sim/trialRules';
import { TRAITS } from './sim/traits';
import { UNITS } from './sim/units';
import { timeLeftWords, trialMsLeft } from './trialClock';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** A class's name for the card ("Gunner"). */
const className = (c: string): string => TRAITS[c]?.name ?? c[0].toUpperCase() + c.slice(1);
/** A list in words: "Beasts and Wardens", "Vanguards, Blades and Beasts". */
const andList = (xs: readonly string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const plural = (c: string): string => `${className(c)}s`;

/** A reward tier in words: "+80 crowns · +1 stone · a Trial Laurel". */
export const tierWords = (t: TrialTier): string => [`+${t.crowns} crowns`, ...(t.stones ? [`+${t.stones} stone${t.stones > 1 ? 's' : ''}`] : []), ...(t.laurel ? ['a Trial Laurel'] : [])].join(' · ');

/** What the Trial's card does on its buttons. */
export interface TrialHooks {
  /** Start today's try. */
  fight: () => void;
  /** This week's run is going: carry on with it. */
  resume?: () => void;
  onClose?: () => void;
}

/** The Weekly Trial's card for the day key given: the week's rules, the army and its weaknesses, the five who start, the rewards and the time
 *  left. Fight! starts the day's try; a try already spent says so. */
export function openTrialCard(m: Meta, day: number, hooks: TrialHooks): void {
  const week = trialWeekOf(day);
  const rules = trialRulesOf(week);
  const rule = mergedRule(week);
  const host = trialHost(week);
  const rec = trialRecord(m, week);
  // (a tap on Fight! or Continue leaves by its own way: the card's onClose is only for leaving without one)
  let leaving = false;
  const menu = ornateMenu({ id: 'trialCard', eyebrow: 'The Weekly Trial', title: rule.name, sub: `${timeLeftWords(trialMsLeft())} · a new trial each Monday`, kind: 'sheet', asked: true, onClose: () => (leaving ? undefined : hooks.onClose?.()) });
  menu.card.classList.add('trCard');

  // (the rules, each its name and line, and the classes the week favours)
  const rs = menuSection(menu.body, rules.length > 1 ? 'This week’s rules' : 'This week’s rule', undefined, 2).parentElement!;
  const rw = menuWell(rs);
  for (const r of rules) {
    const p = el('p', 'trRule');
    p.append(el('b', '', r.name), el('span', '', r.text));
    rw.append(p);
  }
  if (rule.shine.length) {
    const sh = el('p', 'trShine');
    sh.append(el('span', '', 'Favours'));
    for (const c of rule.shine) {
      const chip = el('span', 'trClass');
      chip.append(classSigil(c, 18), document.createTextNode(className(c)));
      sh.append(chip);
    }
    rw.append(sh);
  }

  // (the army, its waves, and its weaknesses as the War Room shows them)
  const as = menuSection(menu.body, 'The army', `${TRIAL_WAVES} waves, a mid-boss at ${TRIAL_MID}`, 2).parentElement!;
  const aw = menuWell(as);
  aw.append(el('p', 'trArmy', `The ${host.name}, ending in the ${UNITS[bossOf(host)]?.name ?? 'warlord'}. ${LIVES} lives for the party.`));
  const block = matchBlock(host.id, false);
  if (block) aw.append(block);

  // (the five who start: the save's best for the week; none, and what to summon)
  const five = trialFive(m, week);
  // (the director's call: a week that shuts out the save's heroes lends some of the classes it admits, at the save's usual level)
  const lent = trialLoans(m, week, five);
  const fs = menuSection(menu.body, 'Your heroes', five.length + lent.length ? (lent.length ? 'the best you have for this week, and heroes lent to fill the five' : 'the best you have for this week; Hire brings more of them') : undefined, 2).parentElement!;
  const fw = menuWell(fs);
  if (five.length + lent.length) {
    const row = el('div', 'trFive');
    for (const k of [...five, ...lent]) {
      const chip = el('span', `trHero${lent.includes(k) ? ' trLent' : ''}`);
      const c = classOf(k);
      if (c) chip.append(classSigil(c, 18));
      chip.append(document.createTextNode(UNITS[k]?.name ?? k));
      if (lent.includes(k)) chip.append(el('small', 'trLoanTag', 'On loan'));
      row.append(chip);
    }
    fw.append(row);
    if (lent.length) fw.append(el('p', 'trLoanNote', `${five.length ? 'This week’s rules shut out some of your heroes' : 'None of your heroes may enter this week'}, so ${lent.length === 1 ? 'one is' : `${lent.length} are`} lent to you for the trial, at your heroes’ usual level. Summon one to keep it.`));
  } else fw.append(el('p', 'trNobody', `None of your heroes may enter this week. ${rule.only ? `Summon ${andList(rule.only.map(plural))} to take it on.` : ''}`.trim()));
  if (rule.oneClass) menuNote(fs, 'One hero of each class in the field.');

  // (the rewards, each tier once a week, ticked when paid)
  const ps = menuSection(menu.body, 'Rewards', 'paid once a week, by your best', 2).parentElement!;
  const pw = menuWell(ps);
  for (const t of TRIAL_TIERS) {
    const got = rec.paid.includes(t.waves);
    const p = el('p', `trTier${got ? ' got' : ''}`);
    p.append(el('b', '', `${got ? '✓ ' : ''}${t.waves === TRIAL_WAVES ? `All ${t.waves} waves` : `${t.waves} waves`}`), el('span', '', tierWords(t)));
    pw.append(p);
  }
  const laurels = m.trial?.laurels ?? 0;
  const title = trialTitle(laurels);
  menuNote(ps, `Best this week: ${rec.best}/${TRIAL_WAVES}${laurels ? ` · Trial Laurels: ${laurels}${title ? ` (${title})` : ''}` : ''}`);

  // (the way in: today's try, the run going, or tomorrow)
  const block2 = trialBlock(m, day);
  const going = !!hooks.resume;
  const left = trialTriesLeft(m, day);
  menuNote(menu.body, going ? 'Your try is under way.' : block2 === 'tried' ? 'You have had today’s try. Come back tomorrow for another.' : `One try a day: ${left} left today.`).classList.add('trTries');
  menuFoot(menu, {
    back: { word: 'close' },
    primary: going
      ? { label: 'Continue', onClick: () => ((leaving = true), menu.close(), hooks.resume!()) }
      : { label: block2 === 'tried' ? 'Tried today' : block2 === 'nobody' ? 'No hero may enter' : 'Fight!', disabled: !!block2, onClick: () => ((leaving = true), menu.close(), hooks.fight()) },
  });
}

/** The reward card at the end of a trial run: each tier it reached for the first time this week, and what it paid. */
export function showTrialRewards(m: Meta, tiers: readonly TrialTier[], cleared: boolean, onDone: () => void, lent: readonly string[] = [], onRecruit?: () => void): void {
  const menu = ornateMenu({ id: 'trialRewards', eyebrow: 'The Weekly Trial', title: cleared ? 'Trial cleared!' : tiers.length ? 'Trial rewards' : 'Trial over', sub: cleared ? 'every wave of this week’s trial' : 'your best this week counts', onClose: onDone });
  menu.card.classList.add('trCard');
  if (tiers.length) {
    const sec = menuSection(menu.body, 'Paid', undefined, 2).parentElement!;
    const w = menuWell(sec);
    for (const t of tiers) {
      const p = el('p', 'trTier got');
      p.append(el('b', '', `✓ ${t.waves === TRIAL_WAVES ? `All ${t.waves} waves` : `${t.waves} waves`}`), el('span', '', tierWords(t)));
      w.append(p);
    }
    if (tiers.some((t) => t.laurel)) {
      const laurels = m.trial?.laurels ?? 1;
      menuNote(sec, `Trial Laurels: ${laurels}${trialTitle(laurels) ? `. Your title: ${trialTitle(laurels)}.` : ''}`).classList.add('trLaurel');
    }
  }
  // (the heroes lent for the trial go home with it: summoning is how to keep one)
  if (lent.length) {
    const sec = menuSection(menu.body, 'On loan', 'they leave with the trial', 2).parentElement!;
    const w = menuWell(sec);
    const row = el('div', 'trFive');
    for (const k of lent) {
      const chip = el('span', 'trHero trLent');
      const c = classOf(k);
      if (c) chip.append(classSigil(c, 18));
      chip.append(document.createTextNode(UNITS[k]?.name ?? k));
      row.append(chip);
    }
    w.append(row, el('p', 'trLoanNote', `Liked fighting beside them? Summon in the Recruit tab to keep heroes like these.`));
  }
  menuFoot(menu, lent.length && onRecruit ? { back: { word: 'Close' }, primary: { label: 'Summon to keep', onClick: () => (menu.close(), onRecruit()) } } : { primary: { label: 'Collect', onClick: () => menu.close() } });
}

/** The banner over a trial fight's board (`#twistBanner`, as a floor's twist and a themed daily have it): the week's rules, named, with the
 *  first rule's line. */
export function showTrialBanner(week: number): void {
  const box = document.getElementById('twistBanner');
  if (!box) return;
  const rule = mergedRule(week);
  box.hidden = false;
  box.className = 'theme trial';
  box.replaceChildren();
  const words = el('span');
  words.append(el('b', '', `Weekly Trial · ${rule.name}`), el('small', '', rule.text));
  const ico = el('img', 'twIco');
  ico.src = 'ui/buttons/trial.webp';
  ico.alt = '';
  box.append(ico, words);
}
