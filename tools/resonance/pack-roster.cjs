// Pack approved generated atlases. Crops, hard alpha, and nearest-neighbour
// sampling only; source paintings remain in source/roster for another pass.
// node tools/resonance/pack-roster.cjs [hero ids...]
const fs = require('node:fs');
const specs = [...require('./roster.json'), ...require('./variants.json')];
const selected = new Set(process.argv.slice(2));
const rows = ['idle', 'walk', 'attack', 'hurt', 'dead', 'attack2'];
const w = 256, h = 144;
const sheetOf = id => `hero_res_${id.replace(/[A-Z]/g, c => '_' + c.toLowerCase())}`;

const { pack } = require('./atlas.cjs');

module.exports = { pack, sheetOf, w, h };

if (require.main === module) (async () => {
  const path = 'src/art/units/sheets.json', layout = JSON.parse(fs.readFileSync(path, 'utf8'));
  for (const spec of specs.filter(s => !selected.size || selected.has(s.id))) {
    try {
      const result = await pack(spec);
      if (!result) { console.log(`${spec.id}: awaiting source`); continue; }
      layout[result.sheet] = result.layout;
      fs.writeFileSync(path, JSON.stringify(layout, null, 1) + '\n');
      console.log(spec.id, JSON.stringify({ sheet: result.sheet, warnings: result.warnings }));
    } catch (e) { console.error(`${spec.id}: ${e.message}`); process.exitCode = 1; }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
