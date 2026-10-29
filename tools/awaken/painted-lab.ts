// Review harness only; never imported by the shipped game.
import { AURA_CELL, AURA_PIXEL, auraImage, auraStrip, loadAuraImage } from '../../src/render/auraArt';
import { AURAS, AURA_KEYS, auraParts } from '../../src/render/auraStyles';
import { drawAura } from '../../src/render/auraCanvas';

Object.assign(window, { __auraReview: { AURA_CELL, AURA_PIXEL, AURAS, AURA_KEYS, auraImage, auraStrip, loadAuraImage, auraParts, drawAura } });
