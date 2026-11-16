// CC0-SOUNDS: the listening page (`node tools/cc0-sounds/listen.mjs`): every cue's old synthesised voice and its new recorded takes side
// by side, each at the level the game plays it (its `CUES` gain, and the file's own), with each take's source, author, licence, length
// and size; and the cues kept synthesised, with why. Nothing here ships in the game.

import { CueSynth } from '../../src/render/audioProcessors';
import { CUES, type Cue } from '../../src/render/soundRules';
import { CUE_SAMPLES } from '../../src/render/cueSamples';
import { busOf } from '../../src/render/audioMix';
// @ts-expect-error (plain JS data)
import { KEPT, PACKS, TAKES } from './sources.mjs';

type Layer = { pack: string; path: string };
type Take = Layer | { mix: Layer[] };
const packs = PACKS as Record<string, { title: string; author: string; page: string }>;
const takes = TAKES as Record<string, Take[]>;
const kept = KEPT as Record<string, string>;

let ctx: AudioContext | null = null;
let out: GainNode;
const buffers = new Map<string, AudioBuffer>();
function audio(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    out = new GainNode(ctx, { gain: 0.5 });
    out.connect(ctx.destination);
  }
  return ctx;
}
async function buffer(file: string): Promise<AudioBuffer> {
  let b = buffers.get(file);
  if (!b) {
    b = await audio().decodeAudioData(await (await fetch(`sfx/cues/${file}.opus`)).arrayBuffer());
    buffers.set(file, b);
  }
  return b;
}
function playSynth(c: Cue): void {
  const a = audio();
  new CueSynth(a, () => out).play(c, a.currentTime + 0.02, { gain: CUES[c].gain, pitch: 1, bus: 'sfx' });
}
async function playFile(c: Cue, file: string, gain: number): Promise<void> {
  const a = audio();
  const src = new AudioBufferSourceNode(a, { buffer: await buffer(file) });
  src.connect(new GainNode(a, { gain: CUES[c].gain * gain })).connect(out);
  src.start(a.currentTime + 0.02);
}

const el = (tag: string, cls = '', text = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const credit = (tk: Take) => {
  const layers = 'mix' in tk ? tk.mix : [tk];
  const ps = [...new Set(layers.map((l) => l.pack))];
  return ps.map((p) => `${packs[p].title} by ${packs[p].author}`).join(' + ');
};
const fileName = (tk: Take) => ('mix' in tk ? `${tk.mix.length} cuts laid together` : tk.path.split('/').pop() || 'the single file');

const root = document.getElementById('root')!;
const head = el('header');
head.append(el('h1', '', 'The sound effects: synth and CC0 recordings'));
const total = Object.values(CUE_SAMPLES).flat().reduce((n, f) => n + (f?.bytes ?? 0), 0);
head.append(el('p', '', `${Object.keys(CUE_SAMPLES).length} cues recorded (${Object.values(CUE_SAMPLES).flat().length} files, ${(total / 1024).toFixed(0)} KB, all CC0 1.0), ${Object.keys(kept).length} kept synthesised. Each plays at its level in the game. Tap a button to hear it.`));
root.append(head);

const table = el('table');
const thead = el('thead');
thead.innerHTML = '<tr><th>Cue</th><th>Old synth</th><th>New recordings</th><th>Source, author (all CC0 1.0)</th><th>Length</th><th>Size</th></tr>';
table.append(thead);
const body = el('tbody');
for (const c of Object.keys(CUES) as Cue[]) {
  const tr = el('tr');
  const name = el('td', 'cue', c);
  name.append(el('small', '', ` ${busOf(c)}`));
  tr.append(name);
  const s = el('td');
  const sb = el('button', 'synth', '▶ synth');
  sb.onclick = () => playSynth(c);
  s.append(sb);
  tr.append(s);
  const files = CUE_SAMPLES[c];
  if (files) {
    const t = el('td');
    const src = el('td', 'src');
    files.forEach((f, i) => {
      const b = el('button', 'take', `▶ ${i + 1}`);
      b.onclick = () => void playFile(c, f.file, f.gain);
      t.append(b);
      const line = el('div');
      const tk = takes[c][i];
      const a = el('a', '', credit(tk));
      (a as HTMLAnchorElement).href = packs['mix' in tk ? tk.mix[0].pack : tk.pack].page;
      (a as HTMLAnchorElement).target = '_blank';
      line.append(`${i + 1}: ${fileName(tk)}, `, a);
      src.append(line);
    });
    tr.append(t, src);
    tr.append(el('td', 'num', files.map((f) => `${f.seconds.toFixed(2)} s`).join(' / ')));
    tr.append(el('td', 'num', files.map((f) => `${(f.bytes / 1024).toFixed(1)} KB`).join(' / ')));
  } else {
    tr.className = 'kept';
    const why = el('td', 'why', `kept synthesised: ${kept[c] ?? ''}`);
    (why as HTMLTableCellElement).colSpan = 4;
    tr.append(why);
  }
  body.append(tr);
}
table.append(body);
root.append(table);
