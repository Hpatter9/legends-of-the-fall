// The Battle tab's picture: the land's parallax backdrop drifting slowly, with the player's strongest heroes standing in
// front of it, idling. Only draws; it never touches the battle.

import { UNITS } from './sim/units';
import type { Area } from './sim/board';
import { backdropFiles } from './render/backdrop';
import { sprite } from './render/sheets';

export class MenuScene {
  private timer = 0;
  private frame = 0;
  private sprites: ReturnType<typeof sprite>[] = [];

  constructor(private root: HTMLElement) {}

  /** Lay the backdrop for `area` and stand `heroes` (kinds) on the ground. */
  set(area: Area, heroes: string[]): void {
    this.root.replaceChildren();
    backdropFiles(area).forEach((file, i, all) => {
      const layer = document.createElement('div');
      layer.className = 'hmLayer';
      layer.style.backgroundImage = `url(${file})`;
      if (i === 0) layer.style.backgroundSize = '100% 100%';
      // (nearer layers drift further and faster)
      layer.style.setProperty('--drift', `${i * 5}px`);
      layer.style.animationDuration = `${40 - (i * 25) / Math.max(1, all.length - 1)}s`;
      this.root.append(layer);
    });
    const ground = document.createElement('div');
    ground.className = 'hmGround';
    this.root.append(ground);
    const line = document.createElement('div');
    line.className = 'hmHeroes';
    this.sprites = [];
    const slots: string[] = new Array(heroes.length);
    // (the strongest in the middle, the next ones either side of it)
    const mid = Math.floor(heroes.length / 2);
    const place = [mid, mid - 1, mid + 1, mid - 2, mid + 2];
    heroes.forEach((k, i) => (slots[place[i]] = k));
    slots.forEach((kind, i) => {
      if (!kind) return;
      const s = sprite(UNITS[kind].sheet, kind === heroes[0] ? 92 : 70);
      s.canvas.className = 'hmHero';
      s.canvas.style.animationDelay = `${-i * 0.37}s`;
      if (!s.faceRight) s.canvas.style.transform = 'scaleX(-1)';
      // (the frames are wide and mostly empty: pull the neighbours in over the gap)
      s.canvas.style.marginInline = `${-Math.round(parseInt(s.canvas.style.width) * 0.28)}px`;
      this.sprites.push(s);
      line.append(s.canvas);
    });
    this.root.append(line);
  }

  start(): void {
    this.stop();
    this.timer = window.setInterval(() => {
      this.frame++;
      this.sprites.forEach((s, i) => s.tick(this.frame + (i % 2)));
    }, 150);
  }

  stop(): void {
    clearInterval(this.timer);
  }
}
