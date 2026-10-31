// Altar effects use the ordinary combat events, shields and skill meters.
import { apart, hurt, type Battle, type BattleEvent } from './battle';
import { UNITS } from './units';
import { riftRank } from './rift';
import { COMMAND_MULT, CORRUPT, EVOLUTION, OFFERING_MULT, PATRON_PULSE, PULSE } from './altarRules';

export function startRift(b: Battle): void {
  const r = b.rift;
  if (!r) return;
  for (const u of b.units.filter((x) => x.side === 'foe')) {
    u.hp = Math.round(u.hp * (1 + r.corruption * CORRUPT.foeHp));
    u.maxHp = Math.round(u.maxHp * (1 + r.corruption * CORRUPT.foeHp));
    u.power = (u.power ?? 1) * (1 + r.corruption * CORRUPT.foeAtk);
  }
  const starter = b.units.find((x) => x.side === 'hero' && x.owner === undefined && x.tag === r.starter);
  if (!starter) return;
  const rank = riftRank(r);
  const hp = (1 + rank * EVOLUTION.hp) * (r.offering ? OFFERING_MULT[r.offering].hp : 1);
  starter.hp = Math.round(starter.hp * hp);
  starter.maxHp = Math.round(starter.maxHp * hp);
  starter.power = (starter.power ?? 1) * (1 + rank * EVOLUTION.atk) * (1 + r.corruption * CORRUPT.starterAtk) * (r.offering ? OFFERING_MULT[r.offering].dmg : 1);
}

export function tickRift(b: Battle, out: BattleEvent[]): void {
  const r = b.rift;
  if (!r) return;
  const starter = b.units.find((x) => x.side === 'hero' && x.tag === r.starter && x.owner === undefined && x.alive);
  if (r.corruption && b.riftBoss) {
    const boss = b.units.find((x) => x.side === 'foe');
    if (boss?.alive && b.t % CORRUPT.boss.everyMs === CORRUPT.boss.everyMs - CORRUPT.boss.warnMs) out.push({ kind: 'skill', by: boss.id, name: 'Calamity pulse', ms: CORRUPT.boss.warnMs });
    if (boss?.alive && b.t % CORRUPT.boss.everyMs === 0) {
      if (r.patron === 'bastion') boss.shield = { hp: Math.max(boss.shield && boss.shield.until > b.t ? boss.shield.hp : 0, Math.round(boss.maxHp * r.corruption * CORRUPT.bastionShield)), until: Math.max(boss.shield?.until ?? 0, b.t + CORRUPT.bastionShieldMs) };
      for (const u of b.units.filter((x) => x.side === 'hero' && x.alive && x.owner === undefined)) {
        if (r.patron === 'echo') u.charge = Math.max(0, u.charge - r.corruption * CORRUPT.echoDrain);
        hurt(b, boss, u, Math.max(1, Math.round(u.maxHp * r.corruption * CORRUPT.boss.hit)), true, true, out, 'skill');
      }
    }
  }
  if (!starter?.alive || !r.patron || b.t % PULSE.everyMs !== 0) return;
  const allies = b.units.filter((x) => x.alive && x.side === 'hero' && x.id !== starter.id && x.owner === undefined && apart(x, starter) <= PULSE.reach);
  const obey = r.commandment === 'together' && allies.length ? COMMAND_MULT.together : r.commandment === 'solitude' && !allies.length ? COMMAND_MULT.solitude : 1;
  const rank = riftRank(r);
  out.push({ kind: 'skill', by: starter.id, name: `${r.patron === 'ember' ? 'Ember' : r.patron === 'bastion' ? 'Bastion' : 'Echo'} altar`, ms: 500 });
  if (r.patron === 'ember') {
    const foe = b.units.filter((x) => x.alive && x.side === 'foe').sort((a, c) => apart(a, starter) - apart(c, starter) || a.id - c.id)[0];
    if (foe) hurt(b, starter, foe, Math.max(1, Math.round((starter.power ?? 1) * (PATRON_PULSE.ember.base + (rank - 1) * PATRON_PULSE.ember.per) * obey * UNITS[starter.def].atk)), false, false, out, 'dot');
  } else if (r.patron === 'bastion') {
    for (const u of [starter, ...allies]) {
      const hp = Math.round(u.maxHp * (PATRON_PULSE.bastion.base + (rank - 1) * PATRON_PULSE.bastion.per) * obey);
      u.shield = { hp: Math.max(u.shield && u.shield.until > b.t ? u.shield.hp : 0, hp), until: Math.max(u.shield?.until ?? 0, b.t + PULSE.shieldMs) };
      out.push({ kind: 'spellfx', id: 'shield', to: u.id });
    }
  } else {
    for (const u of [starter, ...allies]) {
      u.charge = Math.min(100, u.charge + (PATRON_PULSE.echo.base + (rank - 1) * PATRON_PULSE.echo.per) * obey);
      out.push({ kind: 'arc', from: starter.id, to: u.id });
    }
  }
}
