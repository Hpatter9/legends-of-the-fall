// Curate intact poses from the same generated hero when two attack takes touch.
// Selection/copying only; no painted or reconstructed weapon pixels.
const fs = require('node:fs');
const sharp = require('sharp');
const layout = require('../../src/art/units/sheets.json');
const recover = [['attack', 0], ['attack', 1], ['idle', 0], ['idle', 1]];
const cast = [0, 1, 2, 3].map(i => ['attack2', i]);
const selections = {
  hero_soldier_back: recover,
  hero_res_kitsune: cast,
  hero_res_karasu: recover,
  hero_res_lancer: recover,
  hero_res_dragoon: cast,
  hero_res_demon_swordsman: recover,
  hero_res_tyrant: cast,
};
(async () => {
  for (const [sheet, poses] of Object.entries(selections)) {
    const l = layout[sheet], path = `src/art/units/${sheet}.png`;
    const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true }), pieces = [];
    const targets = sheet === 'hero_soldier_back' ? ['attack', 'attack2'] : ['attack'];
    for (const row of targets) for (let i = 0; i < 4; i++) {
      const [source, frame] = poses[i];
      pieces.push({ input: await sharp(data, { raw: info }).extract({ left: frame * l.w, top: l.rows.indexOf(source) * l.h, width: l.w, height: l.h }).png().toBuffer(),
        left: i * l.w, top: l.rows.indexOf(row) * l.h });
    }
    for (const row of targets) data.fill(0, l.rows.indexOf(row) * l.h * info.width * 4, (l.rows.indexOf(row) + 1) * l.h * info.width * 4);
    await sharp(data, { raw: info }).composite(pieces).png().toFile(path);
  }
  fs.writeFileSync('docs/samples/resonance-roster/pose-selection.json', JSON.stringify({ reason: 'Replace touching generated attack takes with intact poses of the same hero.', selections }, null, 2) + '\n');
  console.log(`Selected intact attacks for ${Object.keys(selections).length} sheets.`);
})().catch(e => { console.error(e); process.exitCode = 1; });
