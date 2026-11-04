// Paint the new equipment bases and the named legends (SEVEN-SLOT GEAR batch 7, docs/notes/gear-runes-design.md section 12; the list is
// docs/notes/gear-art-todo.md). One prompt a piece, from its name, its slot and the house style of the 120 paintings already in the game,
// sent to the connected OpenAI image API (api.openai.com: the proxy adds the key; nothing here holds one). Each painting is saved at 256 x 256
// with a transparent ground in art-source/gear/<slot>/<id>.png (legends in legends/), then `python3 tools/gear/import-gear-icons.py`
// cleans, centres and packs them into the atlases. A piece already painted is skipped. Run a slot at a time, about 20 to a batch, head first,
// and look at the contact sheet the importer draws before the next.
//
//   node tools/gear/gen-icons.mjs --slot head [--limit 20] [--dry]     (--dry prints the prompts and sends nothing)
//   node tools/gear/gen-icons.mjs --legends [--limit 7]
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const dry = args.includes('--dry');
const limit = Number(opt('--limit') ?? 20);
const slot = opt('--slot');
const legends = args.includes('--legends');
if (!slot && !legends) {
  console.error('Say which: --slot head|torso|main|off|feet|belt|acc, or --legends');
  process.exit(1);
}

const NOUN = { head: 'helm or headpiece', torso: 'body armour or robe', main: 'weapon', off: 'off-hand item (a shield, tome, quiver, orb or charm)', feet: 'pair of boots', belt: 'belt or girdle', acc: 'ring, amulet or charm' };
// (the house style of the paintings already in the game: docs/notes/gear-icons.md)
const STYLE =
  'A single fantasy RPG equipment icon, painted in a rich hand-painted style with soft rim light and gentle texture, like a premium mobile ' +
  'RPG item icon. The item alone, centred, three-quarter view, filling most of the square, on a fully transparent background, with no frame, ' +
  'no text, no shadow on the ground and nothing else in the picture.';

/** The pieces to paint: id, name and slot, read from the catalogue files. */
function pieces() {
  if (legends) {
    const text = readFileSync('src/sim/legendBases.ts', 'utf8');
    return [...text.matchAll(/^ {2}L\('(\w+)', '([^']+)', '(\w+)'/gm)].map((m) => ({ id: m[1], name: m[2].replace(/’/g, "'"), slot: m[3], folder: 'legends', legend: true }));
  }
  const text = readFileSync('src/sim/equipBasesNew.ts', 'utf8');
  return [...text.matchAll(/^ {2}b\('(\w+)', (?:'([^']*)'|"([^"]*)"), (?:'[^']*'|"[^"]*"), '(\w+)'/gm)]
    .map((m) => ({ id: m[1], name: m[2] ?? m[3], slot: m[4], folder: m[4] }))
    .filter((p) => p.slot === slot);
}

const todo = pieces().filter((p) => !existsSync(`art-source/gear/${p.folder}/${p.id}.png`)).slice(0, limit);
console.log(`${todo.length} to paint`);
for (const p of todo) {
  const prompt = `${STYLE} The item: ${p.name}, a ${NOUN[p.slot]}${p.legend ? ', a legendary relic with a story, a little grander and more ornate than ordinary gear' : ''}.`;
  if (dry) {
    console.log(`${p.id}: ${prompt}`);
    continue;
  }
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer proxy-adds-the-key' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1024', background: 'transparent', n: 1 }),
  });
  if (!res.ok) {
    console.error(`${p.id}: ${res.status} ${await res.text()}`);
    break;
  }
  const b64 = (await res.json()).data[0].b64_json;
  mkdirSync(`art-source/gear/${p.folder}`, { recursive: true });
  const big = `art-source/gear/${p.folder}/${p.id}-1024.png`;
  writeFileSync(big, Buffer.from(b64, 'base64'));
  // (down to the 256 x 256 the importer expects)
  execFileSync('python3', ['-c', `from PIL import Image; Image.open('${big}').resize((256, 256), Image.LANCZOS).save('art-source/gear/${p.folder}/${p.id}.png')`]);
  rmSync(big);
  console.log(`${p.id}: painted`);
}
