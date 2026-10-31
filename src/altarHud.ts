// The altar in a fight (ALTAR-CLEAR): a small chip under the spell bar for a Calamity battle with a patron. It names the
// pulse and its size, fills towards the next one and glows as it fires; the formation a commandment asks for is ticked
// while it holds; a corrupted guardian's pulse has its own countdown, red in its warning second. Tap it for the words.
// It only reads the battle (its clock, the starter's place): the fight is changed by the sim alone.
import type { Battle } from './sim/battle';
import { apart } from './sim/battle';
import { riftRank } from './sim/rift';
import { COMMAND_MULT, CORRUPT, PULSE } from './sim/altarRules';
import { commandmentLine, patronLine, pct, pulseAmount, untilPulse } from './sim/altarWords';
import { altarPicture } from './altarArt';

let root: HTMLElement | null = null;
let shown = '';
let lastT = -1;

function build(b: Battle): HTMLElement {
  const r = b.rift!;
  const box = document.createElement('div');
  box.id = 'altarHud';
  box.setAttribute('role', 'button');
  box.setAttribute('aria-label', 'Your altar in this fight');
  box.innerHTML = '<div class="ahPatron"><span class="ahArt"></span><span class="ahWords"><b></b><small></small></span><i class="ahBar"><span></span></i></div><div class="ahBoss"><b></b><i class="ahBar"><span></span></i></div><p class="ahMore"></p>';
  box.querySelector('.ahArt')!.append(altarPicture(`${r.patron!}-crest`));
  const rank = riftRank(r);
  box.querySelector('.ahMore')!.textContent = `${patronLine(r.patron!, rank)}${r.commandment ? ` ${commandmentLine(r.commandment, r.patron, rank)}` : ''}`;
  box.addEventListener('click', () => box.classList.toggle('open'));
  document.body.append(box);
  return box;
}

/** Called every frame with the battle on the page (or nothing, when no battle is on screen). */
export function updateAltarHud(b: Battle | undefined): void {
  const r = b?.rift;
  const on = !!(b && r?.patron && (b.phase === 'deploy' || b.phase === 'fight'));
  if (!on) {
    if (root) root.hidden = true;
    return;
  }
  const key = `${b.seed}:${r.patron}:${r.commandment}:${r.corruption}:${b.riftBoss}`;
  if (!root || shown !== key) {
    root?.remove();
    root = build(b);
    shown = key;
    lastT = -1;
  }
  root.hidden = false;
  // (under the spell bar; under the guardian's health bar when it shows, so the guardian's name stays clear)
  const bar = document.getElementById('bossBar');
  const top = bar && !bar.hidden ? Math.max(142, Math.round(bar.getBoundingClientRect().bottom + 6)) : 142;
  if (root.style.top !== `${top}px`) root.style.top = `${top}px`;
  const rank = riftRank(r);
  const starter = b.units.find((x) => x.side === 'hero' && x.tag === r.starter && x.owner === undefined && x.alive);
  const near = starter ? b.units.some((x) => x.alive && x.side === 'hero' && x.id !== starter.id && x.owner === undefined && apart(x, starter) <= PULSE.reach) : false;
  const holds = r.commandment === 'together' ? near : r.commandment === 'solitude' ? !near : false;
  const amount = pulseAmount(r.patron!, rank) * (holds ? COMMAND_MULT[r.commandment!] : 1);
  const size = r.patron === 'echo' ? `+${Math.round(amount * 100) / 100} charge` : r.patron === 'ember' ? `${pct(amount)}% atk burn` : `${pct(amount)}% shield`;
  const name = r.patron === 'ember' ? 'Ember' : r.patron === 'bastion' ? 'Bastion' : 'Echo';
  const fighting = b.phase === 'fight';
  const left = untilPulse(b.t);
  root.querySelector('.ahWords b')!.textContent = `${name} altar · ${size}${holds ? ' ✓' : ''}`;
  root.querySelector('.ahWords small')!.textContent = !starter && fighting ? 'Starter down: no pulse' : fighting ? `next pulse in ${Math.ceil(left / 1000)} s` : `pulses every ${PULSE.everyMs / 1000} s once the fight starts`;
  root.querySelector<HTMLElement>('.ahPatron .ahBar span')!.style.width = `${fighting ? 100 * (1 - left / PULSE.everyMs) : 0}%`;
  root.classList.toggle('holds', holds);
  root.classList.toggle('down', !starter && fighting);
  // (the glow when a pulse goes off: the clock has just passed a beat)
  if (fighting && lastT >= 0 && b.t !== lastT && Math.floor(b.t / PULSE.everyMs) > Math.floor(lastT / PULSE.everyMs) && starter) {
    root.classList.remove('fired');
    void root.offsetWidth;
    root.classList.add('fired');
  }
  lastT = b.t;
  const boss = root.querySelector<HTMLElement>('.ahBoss')!;
  const guardian = r.corruption > 0 && b.riftBoss && b.units.find((x) => x.side === 'foe');
  boss.hidden = !guardian || !guardian.alive;
  if (!boss.hidden) {
    const until = untilPulse(b.t, CORRUPT.boss.everyMs);
    boss.querySelector('b')!.textContent = fighting ? `Guardian pulse in ${Math.ceil(until / 1000)} s · ${pct(r.corruption * CORRUPT.boss.hit)}% HP` : `Guardian pulses every ${CORRUPT.boss.everyMs / 1000} s · ${pct(r.corruption * CORRUPT.boss.hit)}% HP`;
    boss.querySelector<HTMLElement>('.ahBar span')!.style.width = `${fighting ? 100 * (1 - until / CORRUPT.boss.everyMs) : 0}%`;
    boss.classList.toggle('warn', fighting && until <= CORRUPT.boss.warnMs);
  }
}
