import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AWARD_JOKES, BANTER, DUCHESS_LINES, FOE_GRUMBLES, HERO_QUIPS, KING_LINES, LOADING_TIPS, RECAP_LOSS, RECAP_WIN, RESULT_LOSS, RESULT_WIN, STAND_FOE_LINES } from '../src/quipData';
import { FOE_LORE, HERO_STORY } from '../src/sim/codexLore';
import { SCENES, SCENE_ORDER } from '../src/sim/sceneScripts';

// The writer's text lives in docs/lines (`new-lines.json`: the whole of it, fixed up); the game has it as code. This holds the two together,
// so a line edited in one place and not the other fails here. (The game never loads the JSON.)
const json = JSON.parse(readFileSync('docs/lines/new-lines.json', 'utf8'));

test('the code has the words of docs/lines/new-lines.json', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(HERO_QUIPS)), json.hero_quips);
  assert.deepEqual(JSON.parse(JSON.stringify(BANTER)), json.banter);
  assert.deepEqual(JSON.parse(JSON.stringify(DUCHESS_LINES)), json.duchess);
  assert.deepEqual([...LOADING_TIPS], json.loading_tips);
  assert.deepEqual([...FOE_GRUMBLES], json.foe_grumbles);
  assert.deepEqual([...RECAP_WIN], json.recap_win);
  assert.deepEqual([...RECAP_LOSS], json.recap_loss);
  assert.deepEqual([...RESULT_WIN], json.result_win);
  assert.deepEqual([...RESULT_LOSS], json.result_loss);
  assert.deepEqual(AWARD_JOKES, json.award_jokes);
  assert.deepEqual(HERO_STORY, json.hero_story);
  assert.deepEqual(FOE_LORE, json.foe_lore);
  assert.deepEqual(JSON.parse(JSON.stringify(KING_LINES)), json.king);
  assert.deepEqual(JSON.parse(JSON.stringify(STAND_FOE_LINES)), json.last_stand_foes);
});

test('every scene has the title, blurb, captions and lines of docs/lines/new-lines.json, in the same order', () => {
  assert.deepEqual([...SCENE_ORDER].sort(), Object.keys(json.scenes).sort());
  for (const id of SCENE_ORDER) {
    const sc = SCENES[id];
    const want = json.scenes[id];
    assert.equal(sc.title, want.title, `${id} title`);
    assert.equal(sc.blurb, want.blurb, `${id} blurb`);
    assert.equal(sc.shots.length, want.shots.length, `${id} shots`);
    sc.shots.forEach((sh, i) => {
      assert.equal(sh.caption ?? null, want.shots[i].caption, `${id} caption ${i}`);
      assert.deepEqual((sh.lines ?? []).map((l) => [l.who, l.text]), want.shots[i].lines.map((l: { who: string; text: string }) => [l.who, l.text]), `${id} lines ${i}`);
    });
  }
});
