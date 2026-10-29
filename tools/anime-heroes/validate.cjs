// Check shipping artwork, alpha masks and the actual offline asset manifest.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const catalogue = require('./catalogue.json');
(async () => {
  assert.equal(catalogue.length, 45);
  assert.equal(new Set(catalogue.map(h => h.id)).size, 45);
  const sw = fs.readFileSync('out/web/sw.js', 'utf8');
  const results = [];
  for (const hero of catalogue) {
    const files = [`${hero.id}.webp`, `${hero.id}-portrait.webp`];
    for (const file of files) {
      const path = `src/art/heroes/${file}`;
      const meta = await sharp(path).metadata();
      assert.ok(meta.width >= (file.includes('-portrait') ? 200 : 300) && meta.height >= 400, `${file} resolution`);
      assert.ok(sw.includes(`'heroes/${file}'`), `${file} cached offline`);
      assert.ok(fs.existsSync(`out/web/heroes/${file}`), `${file} copied`);
    }
    const { data, info } = await sharp(`src/art/heroes/${hero.id}-portrait.webp`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0, visible = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 10) transparent++;
      if (data[i] > 128) visible++;
    }
    const pixels = info.width * info.height;
    assert.ok(transparent / pixels > .10, `${hero.id}: transparent cutout background`);
    assert.ok(visible / pixels > .05, `${hero.id}: visible character`);
    results.push({ id: hero.id, transparent: +(transparent / pixels).toFixed(3), visible: +(visible / pixels).toFixed(3) });
  }
  fs.mkdirSync('docs/samples/anime-heroes', { recursive: true });
  fs.writeFileSync('docs/samples/anime-heroes/assets.json', JSON.stringify(results, null, 2) + '\n');
  console.log('45 scenes, 45 cutouts, alpha masks and offline entries verified');
})().catch(error => { console.error(error); process.exitCode = 1; });
