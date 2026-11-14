// STORE-CREDITS (docs/notes/store-credits.md): the in-app Credits page (`src/data/credits.ts`, written for players) covers every
// third-party creator, pack and licence that CREDITS.md (the developers' record) names, so the two cannot drift apart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CREDIT_GROUPS, PLAYER_CREDITS, creditText, type PlayerCredit } from '../src/data/credits';
import { covers, creditNames, licencesOf, plainText } from '../src/creditsRules';

const md = readFileSync('CREDITS.md', 'utf8');
const all: PlayerCredit[] = CREDIT_GROUPS.flatMap((g) => PLAYER_CREDITS[g]);

/** Names the record gives that are not third-party work in the game, each with why. A new name needs a place on the page or a line
 *  here (with its reason); nothing else. */
const NOT_ON_PAGE: Record<string, string> = {
  'ART-ASCEND': 'a feature of the game, not a maker',
  'Chronos Settlement': 'the owner’s other game, its art made for it (original art)',
  URL: '"loaded by URL": not a name',
  Craftpix: 'the maker of the Craftpix entries (on the page as Craftpix.net)',
  'Pixel Champions v3': 'no longer in the game (CREDITS.md: superseded by the hero art remake; no pc_* sheet ships)',
  Alex: 'Pixel Champions v3’s author: no longer in the game',
  'Tiny RPG Town': 'its placeholder faces were replaced by the painted quest givers',
};

test('every third-party creator and pack CREDITS.md names is on the Credits page', () => {
  const names = creditNames(md);
  assert.ok(names.length > 60, `${names.length} names read`);
  const missing = names.filter((n) => !(n in NOT_ON_PAGE) && !all.some((c) => covers(creditText(c), n)));
  assert.deepEqual(missing, [], `not on the page: ${missing.join(' | ')}`);
});

test('the names read include the ones that matter (the reader is not reading nothing)', () => {
  const names = creditNames(md);
  for (const n of ['DragonDePlatino', 'Matthew Pablo', 'Alexandr Zhelanov', 'Universal LPC Spritesheet', 'Golems and elementals', 'Pixelify Sans', 'Stefie Justprince', 'Free Forest Bosses', 'Showkaizer']) {
    assert.ok(names.includes(n), n);
  }
});

test('every licence CREDITS.md names is on the page', () => {
  const page = all.map((c) => `${c.licence ?? ''} ${c.unconfirmed ? 'licence unconfirmed' : ''}`).join(' ');
  for (const l of licencesOf(plainText(md))) {
    const words = l === 'licence unconfirmed' ? 'licence unconfirmed' : l;
    assert.ok(page.toLowerCase().includes(words.toLowerCase().replace('cc0 1.0', 'cc0')), `licence missing from the page: ${l}`);
  }
});

test('a licence that asks for credit is tagged so, with a link to the source where the entry has one', () => {
  for (const c of all) {
    if (!c.licence) continue;
    const asks = /^CC-BY|GPL|Open Font|attribution/i.test(c.licence);
    assert.equal(!!c.credit, asks, `${c.work}: credit ${c.credit} for ${c.licence}`);
  }
  for (const who of ['Matthew Pablo', 'Alexandr Zhelanov', 'DragonDePlatino', 'The LPC artists']) {
    const c = all.find((x) => x.author?.startsWith(who));
    assert.ok(c?.credit && c.link?.startsWith('https://'), who);
  }
});

test('the assets whose licence is unconfirmed are tagged so on the page, as in CREDITS.md', () => {
  const marked = all.filter((c) => c.unconfirmed).map(creditText).join('\n');
  for (const what of ['batareya', 'whtdragon', 'recorded combat sounds']) assert.ok(marked.includes(what), what);
  // (and the record marks every use of those packs)
  const paras = md.split(/\n(?=- |\n|#)/);
  for (const p of paras.filter((x) => /batareya|whtdragon|combatAudioBank/.test(x) && !/Superseded|\breplace\b[^.]*\b(whtdragon|golem|batareya)/i.test(x))) {
    assert.match(p, /licen[cs]e unconfirmed/i, p.slice(0, 120));
  }
});

test('the page reads as a page for players: no file paths, branches, pull requests or build notes', () => {
  for (const c of all) {
    const t = creditText(c);
    assert.doesNotMatch(t, /\b(src|tools|art-source|docs)\/|\.png\b|\.opus\b|\.ts\b|\bPR #|#\d{3}|\bart\/|game\.js|bundled|owner/i, t);
  }
  for (const g of CREDIT_GROUPS) assert.ok(PLAYER_CREDITS[g].length > 0, g);
  const orig = all.filter((c) => /^Original (art|music|sound) made for Legends of the Last Keep/.test(c.work));
  assert.ok(orig.some((c) => c.work === 'Original art made for Legends of the Last Keep.'));
});
