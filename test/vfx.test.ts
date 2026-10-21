import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { particleBudget, slashOf } from '../src/render/vfxRules';

describe('slashes', () => {
  it('draws a heavy arc for clubs and brutes, a wind arc for spears and staves, dark for claws, bright for swords', () => {
    assert.equal(slashOf('Ogre'), 'slashEarth');
    assert.equal(slashOf('Orc Brute'), 'slashEarth');
    assert.equal(slashOf('Skeleton Spearman'), 'slashWind');
    assert.equal(slashOf('Yamabushi Tengu'), 'slashWind');
    assert.equal(slashOf('Kunoichi'), 'darkSlash');
    assert.equal(slashOf('Karasu Tengu'), 'darkSlash');
    assert.equal(slashOf('Knight'), 'slashLight');
    assert.equal(slashOf('Skeleton'), 'slashLight');
  });
});

describe('particle budget', () => {
  it('keeps the full count normally and halves it on battery saver', () => {
    assert.deepEqual(particleBudget(false), { density: 1, cap: 200 });
    assert.deepEqual(particleBudget(true), { density: 0.5, cap: 110 });
  });
});
