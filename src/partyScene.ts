// A frozen battle tableau, made from the same credited attack frames and effects as a fight.
// No battle is created or stepped: changing the draft only recomposes this decorative canvas.
import { sheetInfo } from './render/sheets';
import { VFX, type VfxKey } from './render/vfxArt';
import { UNITS } from './sim/units';
import { roleOf } from './sim/suggest';

const W = 800, H = 640;
const poses = [[285, 306, 142], [515, 320, 144], [180, 440, 170], [620, 450, 172], [398, 544, 204]];

/** Render once, including the complete weapon sweep. The same party always gets the same poses. */
export function partyTableau(kinds: readonly string[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.setAttribute('aria-hidden', 'true');
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;

  const figure = (sheet: string, x: number, feet: number, height: number, right: boolean, frame: number, hero = false) => {
    const s = sheetInfo(sheet);
    if (!s) return;
    const row = s.rows.includes('attack') ? 'attack' : 'idle';
    const n = Math.min(s.counts[row] - 1, Math.floor(s.counts[row] * .4) + frame % 2);
    const scale = height / s.figure;
    g.save();
    g.translate(x, feet);
    if (s.facesRight !== right) g.scale(-1, 1);
    if (hero) { g.shadowColor = '#ffe1a0'; g.shadowBlur = 9; }
    g.drawImage(s.img, n * s.w, s.rows.indexOf(row) * s.h, s.w, s.h, -s.w * scale / 2, -s.h * scale, s.w * scale, s.h * scale);
    g.restore();
  };
  const effect = (key: VfxKey, x: number, y: number, size: number, angle = 0) => {
    const frames = VFX[key];
    if (!frames?.length) return;
    const t = frames[Math.floor(frames.length * .4)];
    const r = t.frame;
    g.save();
    g.translate(x, y);
    g.rotate(angle);
    g.globalCompositeOperation = 'screen';
    g.drawImage(t.source.resource as CanvasImageSource, r.x, r.y, r.width, r.height, -size / 2, -size / 2, size, size);
    g.restore();
  };

  // The horde advances from both edges, with distant ranks smaller and less saturated.
  const enemies = ['skeleton_warrior', 'hk_orc_grunt', 'skeleton_spearman', 'hk_imp', 'werewolf_black'];
  for (let i = 0; i < 22; i++) {
    const left = i % 2 === 0;
    const rank = Math.floor(i / 2);
    const y = 182 + rank * 41;
    const x = left ? 32 + (rank % 3) * 40 : 770 - (rank % 3) * 40;
    g.save();
    g.globalAlpha = rank < 4 ? .43 : .8;
    g.filter = rank < 4 ? 'brightness(.65) saturate(.5)' : 'brightness(.85)';
    figure(enemies[i % enemies.length], x, y, 66 + rank * 5, left, i);
    g.restore();
  }

  // Casters and support at the rear, the toughest silhouette at the point of the composition.
  const ordered = kinds.map((kind, slot) => ({ kind, slot })).sort((a, b) => {
    const depth = { support: 0, back: 1, striker: 2, front: 3 };
    return depth[roleOf(a.kind)] - depth[roleOf(b.kind)] || a.slot - b.slot;
  });
  ordered.forEach(({ kind, slot }, i) => {
    const [x, y, height] = poses[i + (5 - ordered.length)];
    const def = UNITS[kind];
    const role = roleOf(kind);
    const right = x >= 400;
    // A pool of class-coloured light separates each hero from the horde.
    const colour = role === 'support' ? '#f1cc79' : def.shot === 'fire' ? '#fa773e' : '#68cbd9';
    const halo = g.createRadialGradient(x, y - height / 2, 6, x, y - height / 2, height);
    halo.addColorStop(0, `${colour}55`); halo.addColorStop(1, `${colour}00`);
    g.fillStyle = halo; g.fillRect(x - height, y - height * 1.5, height * 2, height * 2);
    if (role === 'support') effect('levelupGold', x, y - 45, 230);
    figure(def.sheet, x, y, height, right, slot, true);
    if (def.shot === 'fire') {
      effect('flameFire', x + (right ? 80 : -80), y - height * .8, 195, right ? .65 : -.65);
      effect('sparkleFire', x + (right ? 125 : -125), y - height, 125);
    } else if (role === 'striker' || role === 'front') {
      effect('slashLight', x + (right ? 60 : -60), y - height * .45, 170, right ? -.6 : 2.5);
    } else if (role === 'back') effect('sparkleLight', x + (right ? 85 : -85), y - height * .6, 130);
    else effect('starGold', x, y - height * 1.05, 90);
    // The tiny number links the action silhouette to its party selector below.
    g.fillStyle = '#10221ee8';
    g.strokeStyle = '#dfbf72';
    g.lineWidth = 2;
    g.beginPath(); g.arc(x, y + 14, 13, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#ffe3a5'; g.font = 'bold 17px Georgia'; g.textAlign = 'center';
    g.fillText(String(slot + 1), x, y + 20);
  });
  // Foreground creatures frame the party without covering its silhouettes.
  for (let i = 0; i < 7; i++) {
    g.save(); g.filter = 'brightness(.38)';
    figure(enemies[i % enemies.length], 15 + i * 128, 694, 128, i < 3, i);
    g.restore();
  }
  effect('dustGold', 400, 580, 210);
  return canvas;
}
