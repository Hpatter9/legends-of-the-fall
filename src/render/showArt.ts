// The ultimate showcases' painted frames (ULT-SHOW, docs/notes/ult-showcase-design.md): the hero poses a showcase stages for a beat (the
// Samurai's crouch and sheathe, the Barbarian in the air, Ayame's kneeling finish...), the Arc Blade's six frames as lightning, and the props
// it plays on the moment's layer (the Buccaneer's die and hook, the ghost ship, the clocks, the reticle, the meteor, the moon, the notes,
// the fox, the chains, the holy light). Generated with the OpenAI image API (art-source/ult-showcase/, CREDITS.md), cut to the game's size
// by tools/ult-show/cut_art.py and bundled into game.js, so they play offline. Every pose faces right.

import { Rectangle, Texture } from 'pixi.js';
import { loadImage } from './loadImage';
import arcBladeLightningStrip from '../art/ult-show/arc-blade-lightning-strip.webp';
import barbarianMidAir from '../art/ult-show/barbarian-mid-air.webp';
import beastmasterHorn from '../art/ult-show/beastmaster-horn.webp';
import buccaneerDieFace1 from '../art/ult-show/buccaneer-die-face-1.webp';
import buccaneerDieFace2 from '../art/ult-show/buccaneer-die-face-2.webp';
import buccaneerDieFace3 from '../art/ult-show/buccaneer-die-face-3.webp';
import buccaneerDieFace4 from '../art/ult-show/buccaneer-die-face-4.webp';
import buccaneerDieFace5 from '../art/ult-show/buccaneer-die-face-5.webp';
import buccaneerDieFace6 from '../art/ult-show/buccaneer-die-face-6.webp';
import buccaneerDieRolling from '../art/ult-show/buccaneer-die-rolling.webp';
import buccaneerGrapplingHook from '../art/ult-show/buccaneer-grappling-hook.webp';
import demonSwordsmanHellfireChains from '../art/ult-show/demon-swordsman-hellfire-chains.webp';
import dreadPirateGhostShip from '../art/ult-show/dread-pirate-ghost-ship.webp';
import gunslingerClockNoon from '../art/ult-show/gunslinger-clock-noon.webp';
import kitsuneSmallFox from '../art/ult-show/kitsune-small-fox.webp';
import kunoichiKneelingFinish from '../art/ult-show/kunoichi-kneeling-finish.webp';
import lancerGallop from '../art/ult-show/lancer-gallop.webp';
import minotaurCharge from '../art/ult-show/minotaur-charge.webp';
import ninjaMonkFlurry from '../art/ult-show/ninja-monk-flurry.webp';
import priestessHolyLight from '../art/ult-show/priestess-holy-light.webp';
import samuraiIaidoCrouch from '../art/ult-show/samurai-iaido-crouch.webp';
import samuraiSheathe from '../art/ult-show/samurai-sheathe.webp';
import satyrMusicNotes from '../art/ult-show/satyr-music-notes.webp';
import siegeBotTargetingReticle from '../art/ult-show/siege-bot-targeting-reticle.webp';
import timeWitchGroundClock from '../art/ult-show/time-witch-ground-clock.webp';
import werewolfRisingMoon from '../art/ult-show/werewolf-rising-moon.webp';
import wizardMeteor from '../art/ult-show/wizard-meteor.webp';

const URLS = {
  'arc-blade-lightning-strip': arcBladeLightningStrip,
  'barbarian-mid-air': barbarianMidAir,
  'beastmaster-horn': beastmasterHorn,
  'buccaneer-die-face-1': buccaneerDieFace1,
  'buccaneer-die-face-2': buccaneerDieFace2,
  'buccaneer-die-face-3': buccaneerDieFace3,
  'buccaneer-die-face-4': buccaneerDieFace4,
  'buccaneer-die-face-5': buccaneerDieFace5,
  'buccaneer-die-face-6': buccaneerDieFace6,
  'buccaneer-die-rolling': buccaneerDieRolling,
  'buccaneer-grappling-hook': buccaneerGrapplingHook,
  'demon-swordsman-hellfire-chains': demonSwordsmanHellfireChains,
  'dread-pirate-ghost-ship': dreadPirateGhostShip,
  'gunslinger-clock-noon': gunslingerClockNoon,
  'kitsune-small-fox': kitsuneSmallFox,
  'kunoichi-kneeling-finish': kunoichiKneelingFinish,
  'lancer-gallop': lancerGallop,
  'minotaur-charge': minotaurCharge,
  'ninja-monk-flurry': ninjaMonkFlurry,
  'priestess-holy-light': priestessHolyLight,
  'samurai-iaido-crouch': samuraiIaidoCrouch,
  'samurai-sheathe': samuraiSheathe,
  'satyr-music-notes': satyrMusicNotes,
  'siege-bot-targeting-reticle': siegeBotTargetingReticle,
  'time-witch-ground-clock': timeWitchGroundClock,
  'werewolf-rising-moon': werewolfRisingMoon,
  'wizard-meteor': wizardMeteor,
} as const;

export type ShowArt = keyof typeof URLS;
/** The Arc Blade's lightning strip: six frames side by side. */
const ARC: ShowArt = 'arc-blade-lightning-strip';
const ARC_FRAMES = 6;

const tex = new Map<ShowArt, Texture>();
let arc: Texture[] = [];
let loading: Promise<void> | null = null;

/** Load them all, once (behind the game: a showcase before they have arrived uses the pack's stand-ins). */
export function loadShowArt(): Promise<void> {
  loading ??= (async () => {
    await Promise.all(
      (Object.keys(URLS) as ShowArt[]).map(async (k) => {
        try {
          tex.set(k, Texture.from(await loadImage(URLS[k])));
        } catch {
          /* (a picture that will not load: its stand-in plays) */
        }
      }),
    );
    const strip = tex.get(ARC);
    if (strip) {
      const w = strip.width / ARC_FRAMES;
      arc = [...Array(ARC_FRAMES).keys()].map((i) => new Texture({ source: strip.source, frame: new Rectangle(i * w, 0, w, strip.height) }));
    }
  })();
  return loading;
}

/** A frame by name, or null until it has loaded. */
export const showArt = (k: ShowArt): Texture | null => tex.get(k) ?? null;

/** A pose for a staged fighter: a painted pose by name, or `arc-blade` (`p`, 0 to 1, picks the lightning strip's frame). */
export function poseArt(name: string, p: number): Texture | null {
  if (name === 'arc-blade') return arc.length ? arc[Math.min(arc.length - 1, Math.floor(p * arc.length))] : null;
  return name in URLS ? showArt(name as ShowArt) : null;
}
