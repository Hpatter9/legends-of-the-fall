// The Armies screen (opened by the Battle tab's big button) and the "A new army marches" moment. One card an army, in
// order: its boss's portrait, name, waves, the furthest wave reached, stars, and the rewards of a first clear and of a
// replay; a locked army says which boss opens it. The rules are in `src/sim/armies.ts`; this only draws them.

import { ARMIES, armyCleared, armyIsNew, armyStars, armyUnlocked, bossOf, bossesOf, firstClearTotal, recordOf, replayTotal, type Army } from './sim/armies';
import { UNITS } from './sim/units';
import type { Meta } from './sim/meta';
import { portrait } from './render/sheets';
import { ICONS, icon } from './menuArt';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

export interface ArmiesHooks {
  /** Pick the party and start this army from wave 1. */
  onFight(id: string): void;
  /** Carry on with the run in progress. */
  onContinue(): void;
  /** The run saved and not over, if any: the army it fights (none for a daily, tower or older run), and the stage it is on. */
  running: { army?: string; stage: number; label: string } | null;
}

/** The boss's name that opens the army after `a` (shown on the locked card): its last boss. */
export const unlockLine = (prev: Army): string => `Defeat the ${UNITS[bossOf(prev)].name} to unlock`;

/** The Armies screen's body. */
export function drawArmies(body: HTMLElement, m: Meta, hooks: ArmiesHooks): void {
  const run = hooks.running;
  const cleared = ARMIES.filter((a) => armyCleared(m, a.id)).length;
  body.append(el('p', 'hint', `${cleared} of ${ARMIES.length} armies beaten. A lost fight sends the army back to wave 1; your heroes keep their levels.`));
  if (run && !run.army) {
    const cont = el('button', 'primary armyCont', `Continue ${run.label}`);
    cont.addEventListener('click', () => hooks.onContinue());
    body.append(cont);
  }
  ARMIES.forEach((a, i) => body.append(card(a, i, m, hooks)));
}

function card(a: Army, i: number, m: Meta, hooks: ArmiesHooks): HTMLElement {
  const open = armyUnlocked(m, a.id);
  const rec = recordOf(m, a.id);
  const done = armyCleared(m, a.id);
  const fresh = armyIsNew(m, a.id);
  const boss = UNITS[bossOf(a)];
  const root = el('div', `army${open ? '' : ' locked'}${done ? ' done' : ''}${fresh ? ' fresh' : ''}`);
  root.dataset.army = a.id;
  const face = portrait(boss.sheet, 72);
  face.className = 'armyFace';
  const text = el('div', 'armyText');
  text.append(el('b', '', a.name));
  if (open) {
    const bosses = bossesOf(a);
    text.append(el('em', '', a.blurb));
    const stars = armyStars(m, a);
    text.append(
      el('span', 'armyStat', `${a.waves.length} waves · boss: ${boss.name}`),
      el('span', 'armyStat', `Best wave ${Math.min(rec.best, a.waves.length)}/${a.waves.length} · ★ ${stars.got}/${stars.max}${bosses.length > 2 ? ` · ${bosses.length} bosses` : ''}`),
    );
    const pay = el('span', 'armyPay');
    const crowns = (n: number) => {
      const s = el('span', 'armyCrowns');
      s.append(icon(ICONS.crowns, 'ico'), document.createTextNode(String(n)));
      return s;
    };
    pay.append(done ? 'Cleared ✓ · ' : 'First clear ', done ? '' : crowns(firstClearTotal(a)), done ? 'Replay ' : ' · Replay ', crowns(replayTotal(a)));
    text.append(pay);
    const running = hooks.running?.army === a.id ? hooks.running : null;
    const go = el('button', done && !running ? '' : 'primary', running ? `Continue · wave ${running.stage}` : rec.best > 0 || done ? 'Fight again' : 'Fight!');
    // (starting another army while a run is going would lose it: a second tap says yes)
    if (running) go.addEventListener('click', () => hooks.onContinue());
    else if (hooks.running) twoTap(go, `Leave ${hooks.running.label}?`, () => hooks.onFight(a.id));
    else go.addEventListener('click', () => hooks.onFight(a.id));
    text.append(go);
    if (running) {
      const again = el('button', 'small armyAgain', 'Restart from wave 1');
      twoTap(again, 'Lose this run and restart?', () => hooks.onFight(a.id));
      text.append(again);
    }
    if (fresh) root.append(el('i', 'armyNew', 'NEW'));
  } else {
    text.append(el('span', 'armyLock', unlockLine(ARMIES[i - 1])), el('span', 'armyStat', `${a.waves.length} waves · first clear ${firstClearTotal(a)} crowns`));
  }
  root.append(face, text);
  return root;
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
