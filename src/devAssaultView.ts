// ASSAULT-DEV (`docs/notes/assault-dev.md`): Settings, Developer, Try an Assault. The picker, built with the standard ornate menu: which
// storming (a conquest, the Last Hold or the Warband regrouped), how strong a force (as expected, strong, weak), whose heroes, and which hold;
// each hold's row says the force it would field. "Storm it" hands the pick to the page (`main.ts`), which fights it on a throwaway copy of
// the save. The rules are `sim/assault/devTrial.ts`.

import { menuFoot, menuNote, menuPick, menuSection, ornateMenu } from './ornateMenu';
import { forceLine, trialArmies, trialHeroes, trialTitle, TRIAL_HEROES, TRIAL_KINDS, TRIAL_STRENGTHS, type TrialPick } from './sim/assault/devTrial';
import type { Meta } from './sim/meta';
import { heroName } from './sim/heroNames';

/** The pick kept between openings of the picker (this page's life only). */
let last: TrialPick = { army: 'orcs', kind: 'hold', strength: 'expected', heroes: 'party' };

/** Open the picker over Settings; `start` is told the pick when "Storm it" is pressed. */
export function openTrialPicker(save: Meta, start: (pick: TrialPick) => void): void {
  const pick: TrialPick = { ...last };
  const menu = ornateMenu({ id: 'devAssault', kind: 'sheet', eyebrow: 'Developer', title: 'Try an Assault', sub: 'on a throwaway copy: nothing carries over to your save', asked: true });
  const kinds = menuSection(menu.body, 'The storming', undefined, 3);
  menuPick(kinds, TRIAL_KINDS, TRIAL_KINDS.find((k) => k.id === pick.kind), (k) => ({ title: k.name, lines: [k.line] }), (k) => {
    pick.kind = k.id;
    holdRows();
  });
  const strengths = menuSection(menu.body, 'Strength', undefined, 3);
  menuPick(strengths, TRIAL_STRENGTHS, TRIAL_STRENGTHS.find((k) => k.id === pick.strength), (k) => ({ title: k.name, lines: [k.line] }), (k) => {
    pick.strength = k.id;
    holdRows();
  });
  const heroes = menuSection(menu.body, 'Heroes', undefined, 3);
  const who = (id: TrialPick['heroes']) => trialHeroes(save, id).map(heroName).join(', ');
  menuPick(heroes, TRIAL_HEROES, TRIAL_HEROES.find((k) => k.id === pick.heroes), (k) => ({ title: k.name, lines: [who(k.id)] }), (k) => {
    pick.heroes = k.id;
  });
  const holds = menuSection(menu.body, 'The hold', 'the force each would field', 2);
  const holdRows = () => {
    holds.replaceChildren();
    menuPick(holds, trialArmies(), pick.army, (army) => ({ title: trialTitle(army), lines: [forceLine(army, pick.kind, pick.strength)] }), (army) => {
      pick.army = army;
    });
  };
  holdRows();
  menuNote(menu.body, 'The force is what a player has on reaching that storming: the level, rank, talents, skills, castle and host of the game’s own paces. Gear is not worn. The fight plays to its own end screen, then you come back here.');
  menuFoot(menu, {
    back: { word: 'close' },
    primary: {
      label: 'Storm it',
      onClick: () => {
        last = { ...pick };
        menu.close();
        start({ ...pick });
      },
    },
  });
}
